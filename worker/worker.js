/* ============================================================
   Patlytics Feature Comparison — Cloudflare Worker backend
   ------------------------------------------------------------
   This is the ONLY part of the project that holds real secrets
   (ANTHROPIC_API_KEY, GITHUB_TOKEN) — set them as encrypted
   Worker secrets (`wrangler secret put ...` or the dashboard's
   "Settings > Variables" UI), never in this file or the repo.

   Endpoints:
     GET  /api/health              - liveness check, no auth
     POST /api/chat                - { question } -> { answer }
     POST /api/research-feature    - { featureName, companyIds } -> { featureId, results }

   Both POST endpoints require header: X-Access-Key: <SHARED_ACCESS_KEY>
   This is a casual-abuse deterrent ONLY — it's visible in the
   frontend's app.js, so it does not stop a determined caller who
   reads the source. The real cost control is a spend cap on the
   Anthropic API key (set that in the Anthropic Console) plus
   Cloudflare's own rate-limiting rules if you want to add them later.
   ============================================================ */

const ALLOWED_ORIGIN = "https://ronakvus.github.io";
const FEATURE_DATA_URL = "https://ronakvus.github.io/patlytics-intel/js/feature-data.json?_=" + Date.now();
const GITHUB_OWNER = "ronakvus";
const GITHUB_REPO = "patlytics-intel";
const FEATURE_DATA_PATH = "js/feature-data.json";
const CLAUDE_MODEL = "claude-sonnet-5";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Access-Key",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function checkAccessKey(request, env) {
  const key = request.headers.get("X-Access-Key");
  return !!key && !!env.SHARED_ACCESS_KEY && key === env.SHARED_ACCESS_KEY;
}

function b64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUnicode(str) {
  return decodeURIComponent(escape(atob(str)));
}

async function fetchFeatureData() {
  const res = await fetch(FEATURE_DATA_URL, { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error("Could not load feature-data.json: " + res.status);
  return await res.json();
}

async function callClaude(env, body) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }
  return await res.json();
}

/* ---------------- /api/chat ---------------- */
async function handleChat(request, env) {
  const { question } = await request.json();
  if (!question || typeof question !== "string" || !question.trim()) {
    return json({ error: "Missing question" }, 400);
  }

  const featureData = await fetchFeatureData();
  const contextPayload = {
    features: (featureData.FEATURE_ROWS || []).map((f) => ({ id: f.id, name: f.name, support: f.support })),
    companyIds: featureData.DEFAULT_COMPARISON_COMPANY_IDS || [],
  };

  const systemPrompt = `You are the Feature Clarification assistant embedded in Patlytics' internal Competitive Intelligence Dashboard. Patlytics employees use you to understand precisely how a specific product feature compares between Patlytics and a named competitor, using ONLY the verified feature-matrix data provided below.

Rules:
- Be precise, professional, and specific. Reference the exact feature names and detail text from the provided data, not generic industry commentary.
- If the question doesn't clearly name a specific tracked feature, or doesn't name which company (or companies) to compare against, do NOT guess. Ask one short, specific clarifying question, and list the available feature names and/or company ids as options.
- If the question names a feature or company that is not in the provided data, say so plainly and name the closest real options you do have data on. Never invent data for something not covered.
- Never state a capability, statistic, or claim beyond what's in the provided context. If a cell's status is "unknown", say it is unknown / not yet independently verified rather than speculating either way — this feeds a high-stakes internal matrix where a wrong claim can mislead the company.
- Keep answers tight: a few sentences, not a report. This is a working tool people use to get an answer fast, not a blog post.
- When comparing two companies, lead with the key difference in one sentence, then give 1-2 sentences of support for each side, citing the specific detail text provided.

VERIFIED FEATURE MATRIX (JSON):
${JSON.stringify(contextPayload)}`;

  const claudeResponse = await callClaude(env, {
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
  });

  const answer = (claudeResponse.content || []).filter((c) => c.type === "text").map((c) => c.text).join("") ||
    "Sorry, I couldn't generate an answer for that.";
  return json({ answer });
}

/* ---------------- GitHub Contents API helpers ---------------- */
async function githubGetFile(env, path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "patlytics-feature-worker",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub get file failed: ${res.status}`);
  return await res.json(); // { sha, content (base64), ... }
}

async function githubPutFile(env, path, contentObj, sha, message) {
  const body = {
    message,
    content: b64EncodeUnicode(JSON.stringify(contentObj, null, 2)),
    sha,
  };
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "patlytics-feature-worker",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub put file failed: ${res.status}: ${text}`);
  }
  return await res.json();
}

/* ---------------- /api/research-feature ---------------- */
async function handleResearchFeature(request, env) {
  const { featureName, companyIds } = await request.json();
  if (!featureName || typeof featureName !== "string" || !featureName.trim()) {
    return json({ error: "Missing featureName" }, 400);
  }
  const ids = Array.isArray(companyIds) ? companyIds.filter(Boolean) : [];
  if (!ids.length) return json({ error: "Missing companyIds" }, 400);

  const file = await githubGetFile(env, FEATURE_DATA_PATH);
  const currentJson = JSON.parse(b64DecodeUnicode(file.content.replace(/\n/g, "")));

  const cleanName = featureName.trim();
  const existing = currentJson.FEATURE_ROWS.find((f) => f.name.toLowerCase() === cleanName.toLowerCase());
  const featureId = existing
    ? existing.id
    : "custom-" + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const researchPrompt = `Research whether each of the following companies (by id) supports this specific product feature: "${cleanName}".

Company ids to check: ${ids.join(", ")}

For EACH company id, search the web (their own product/docs pages first, then independent press coverage) and determine a status:
- "yes": you found clear, direct evidence of this exact capability — cite what you found.
- "no": you found evidence they do NOT have this, or a genuine search effort turned up nothing.
- "partial": a related-but-not-exact capability exists — explain the gap.
- "unknown": you could not verify either way after a real attempt. This is an ACCEPTABLE, HONEST answer — never guess a yes/no you are not confident in. This feeds a high-stakes internal comparison matrix; a wrong checkmark can mislead the whole company, which is worse than an honest "unknown."

Respond with ONLY a JSON object, no other text before or after, in exactly this shape (one entry per company id given above):
{"<companyId>": {"status": "yes|no|partial|unknown", "detail": "1-2 plain-text sentences explaining what you found or what you searched, no markdown"}}`;

  const claudeResponse = await callClaude(env, {
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 15 }],
    messages: [{ role: "user", content: researchPrompt }],
  });

  const rawText = (claudeResponse.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  let researched;
  try {
    researched = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    researched = null;
  }
  if (!researched) return json({ error: "Could not parse research result", raw: rawText }, 502);

  let row = currentJson.FEATURE_ROWS.find((f) => f.id === featureId);
  if (!row) {
    row = { id: featureId, name: cleanName, support: {} };
    currentJson.FEATURE_ROWS.push(row);
  }
  for (const [companyId, result] of Object.entries(researched)) {
    if (result && result.status) {
      row.support[companyId] = { status: result.status, detail: result.detail || "" };
    }
  }

  await githubPutFile(env, FEATURE_DATA_PATH, currentJson, file.sha, `Research feature "${cleanName}" via Feature Comparison backend`);

  return json({ featureId, results: row.support });
}

/* ---------------- router ---------------- */
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (!checkAccessKey(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    try {
      if (url.pathname === "/api/chat" && request.method === "POST") {
        return await handleChat(request, env);
      }
      if (url.pathname === "/api/research-feature" && request.method === "POST") {
        return await handleResearchFeature(request, env);
      }
    } catch (err) {
      return json({ error: err.message || String(err) }, 500);
    }

    return json({ error: "Not found" }, 404);
  },
};

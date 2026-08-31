/* ============================================================
   Patlytics Competitive Intelligence — App Logic
   Renders the mock dataset (js/data.js) into the dashboard shell.
   No frameworks/build step — plain DOM rendering by design, so the
   whole app can run from a single static file server.
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.PATLYTICS_DATA;
  const { HIGHLIGHTS, COMPETITORS, NEW_ENTRANTS, WEBINARS, ANCHOR_DATE, EARLIEST_DATE } = DATA;

  // Feature Comparison data is fetched as plain JSON (not a <script> global)
  // so the backend (a Cloudflare Worker, once deployed) can safely rewrite
  // it with JSON.parse/stringify instead of regex-editing JS source — that
  // matters because a wrong cell in this matrix can mislead the whole
  // company, so the write path needs to be as low-risk as the data itself.
  // Populated by init() before first render; see FEATURE_DATA_URL below.
  const FEATURE_DATA_URL = "js/feature-data.json";
  let FEATURE_ROWS = [];
  let FEATURE_REVIEWS = {};
  let DEFAULT_COMPARISON_COMPANY_IDS = [];
  let PATLYTICS_PSEUDO_COMPANY = { id: "patlytics", name: "Patlytics", initials: "PA", isSelf: true };

  // Optional Cloudflare Worker backend for Feature Clarification chat and
  // live feature research. Fill these in after deploying worker/worker.js
  // (see worker/worker.js's header comment). Left blank, the Feature
  // Comparison tab keeps working exactly as before: a local, rule-based
  // chat answer and "unknown" for newly-added features until a human sets
  // them manually. FC_ACCESS_KEY is an abuse deterrent only, not a real
  // secret — it's visible here in plain page source either way. The real
  // cost control is a spend cap on the Anthropic API key, set in the
  // Anthropic Console, not this value.
  const FC_WORKER_BASE_URL = ""; // e.g. "https://patlytics-feature-worker.<you>.workers.dev"
  const FC_ACCESS_KEY = "";
  function fcBackendConfigured() { return !!FC_WORKER_BASE_URL; }

  const COMPETITORS_SORTED = [...COMPETITORS].sort((a, b) => a.rank - b.rank);

  const state = {
    activeTab: "home",
    range: "day", // day | week | month
    asOf: ANCHOR_DATE,
    webinarFilter: "upcoming", // upcoming | past | all
    fc: {
      companyIds: [],
      customFeatures: [], // { id, name }
      overrides: {}, // `${companyId}::${featureId}` -> "yes"|"no"|"partial"|"unknown"
      review: { companyId: "solve-intelligence", featureId: "claim-charting", sentimentFilter: "all" },
      chat: [], // { role: "user"|"assistant", text }
      chatBusy: false, // true while a backend chat request is in flight
      pendingFeatureRequests: {}, // featureId -> true while a backend research job is in flight
      pendingFeatureErrors: {}, // featureId -> error message, if a research job failed
      researchedSupport: {}, // featureId -> { companyId: { status, detail } }, filled in by the backend
    },
  };

  /* ---------------- date helpers ---------------- */
  function parseDate(s) { return new Date(s + "T12:00:00Z"); }
  function toISO(dt) { return dt.toISOString().slice(0, 10); }
  function addDays(s, n) { const dt = parseDate(s); dt.setUTCDate(dt.getUTCDate() + n); return toISO(dt); }
  function clamp(dateStr) {
    if (dateStr > ANCHOR_DATE) return ANCHOR_DATE;
    if (dateStr < EARLIEST_DATE) return EARLIEST_DATE;
    return dateStr;
  }
  function fmt(dateStr, opts) {
    return parseDate(dateStr).toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" });
  }
  function rangeSpanDays() { return state.range === "day" ? 1 : state.range === "week" ? 7 : 30; }
  // The filtering window is intentionally wider than the day-by-day nav step for
  // "day" view: real news is dated the day it actually happened, not the day it's
  // viewed, so an exact-date-only window would go empty on any day nothing broke on
  // that literal calendar date. Widening "day" to a trailing 3-calendar-day window
  // (today plus the 2 days before) keeps the Daily Brief non-empty on a normal day
  // while nav arrows still step one day at a time (see rangeSpanDays(), used for
  // state.asOf stepping).
  function windowSpanDays() { return state.range === "day" ? 3 : rangeSpanDays(); }
  function windowStart() { return addDays(state.asOf, -(windowSpanDays() - 1)); }
  function inWindow(dateStr) { return dateStr >= windowStart() && dateStr <= state.asOf; }

  /* ---------------- icon helpers ---------------- */
  const CATEGORY_ICON = {
    Partnership: "ph:handshake",
    Funding: "ph:coins",
    Product: "ph:rocket-launch",
    Hiring: "ph:briefcase",
    Market: "ph:gavel",
    Marketing: "ph:megaphone",
    Webinar: "ph:calendar-blank",
    Sales: "ph:chart-line-up",
    Event: "ph:confetti",
    Content: "ph:article",
    Corporate: "ph:buildings",
  };
  function categoryIcon(cat) { return CATEGORY_ICON[cat] || "ph:newspaper"; }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Real company logo, cached locally at assets/logos/{id}.png (fetched
  // once from each company's own site, not a rate-limited third-party API
  // at render time). Falls back to the initials avatar automatically
  // (onerror) if a given id has no cached logo file yet.
  function companyAvatarHtml(id, initials, name) {
    const logoUrl = `assets/logos/${id}.png`;
    return `<div class="company-avatar">
      <img src="${logoUrl}" alt="${escapeHtml(name)} logo" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <span class="avatar-fallback" style="display:none;">${escapeHtml(initials)}</span>
    </div>`;
  }

  /* ================= SIDEBAR ================= */
  function renderSidebar() {
    const nav = document.getElementById("sidebar-nav");
    let html = "";

    html += `<div class="nav-section-label">Overview</div>`;
    html += navItemHtml("general", "ph:squares-four", "Daily Brief");
    html += navItemHtml("feature-comparison", "lucide:git-compare", "Feature Comparison");

    html += `<div class="nav-section-label">Competitors <span style="opacity:.6">(by correlation)</span></div>`;
    COMPETITORS_SORTED.forEach((c) => {
      const dot = c.tier.startsWith("Tier 1") ? "t1" : c.tier.startsWith("Tier 2") ? "t2" : "t3";
      html += navItemHtml(c.id, null, c.name, dot);
    });

    html += `<div class="nav-section-label">Market Watch</div>`;
    html += navItemHtml("entrants", "ph:compass", "New Market Entrants", null, NEW_ENTRANTS.length);
    html += navItemHtml("webinars", "ph:calendar-blank", "Webinars", null, upcomingWebinarCount());

    nav.innerHTML = html;

    nav.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    document.getElementById("sidebar-last-updated").textContent = `Last updated · ${fmt(ANCHOR_DATE)}`;
  }

  function navItemHtml(tabId, icon, label, tierDot, badgeCount) {
    const iconHtml = icon
      ? `<iconify-icon icon="${icon}" aria-hidden="true"></iconify-icon>`
      : `<span class="tier-dot ${tierDot}" aria-hidden="true"></span>`;
    const badge = badgeCount != null ? `<span class="nav-item-badge">${badgeCount}</span>` : "";
    return `<button type="button" class="nav-item" data-tab="${tabId}" role="tab" aria-selected="false">
      ${iconHtml}<span class="nav-item-label">${escapeHtml(label)}</span>${badge}
    </button>`;
  }

  function upcomingWebinarCount() {
    return WEBINARS.filter((w) => w.date >= ANCHOR_DATE).length;
  }

  /* ================= TAB SWITCHING ================= */
  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".nav-item").forEach((btn) => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    renderTopbar();
    renderActiveTab();
  }

  function renderTopbar() {
    const eyebrow = document.getElementById("topbar-eyebrow");
    const title = document.getElementById("topbar-title");
    const rangeToggle = document.getElementById("range-toggle");
    const dateNav = document.getElementById("date-nav");

    if (state.activeTab === "home") {
      eyebrow.innerHTML = `<iconify-icon icon="ph:house"></iconify-icon> Overview`;
      title.textContent = "Welcome to Patlytics Intel";
      rangeToggle.style.display = "none";
      dateNav.style.display = "none";
    } else if (state.activeTab === "general") {
      eyebrow.innerHTML = `<iconify-icon icon="ph:squares-four"></iconify-icon> Daily Brief`;
      title.textContent = "General Highlights";
      rangeToggle.style.display = "";
      dateNav.style.display = "";
    } else if (state.activeTab === "entrants") {
      eyebrow.innerHTML = `<iconify-icon icon="ph:compass"></iconify-icon> Market Watch`;
      title.textContent = "New Market Entrants";
      rangeToggle.style.display = "none";
      dateNav.style.display = "";
    } else if (state.activeTab === "webinars") {
      eyebrow.innerHTML = `<iconify-icon icon="ph:calendar-blank"></iconify-icon> Events`;
      title.textContent = "Webinars";
      rangeToggle.style.display = "none";
      dateNav.style.display = "none";
    } else if (state.activeTab === "feature-comparison") {
      eyebrow.innerHTML = `<iconify-icon icon="lucide:git-compare"></iconify-icon> Overview`;
      title.textContent = "Feature Comparison";
      rangeToggle.style.display = "none";
      dateNav.style.display = "none";
    } else {
      const c = COMPETITORS.find((x) => x.id === state.activeTab);
      eyebrow.innerHTML = `<iconify-icon icon="ph:buildings"></iconify-icon> ${escapeHtml(c.tier)}`;
      title.textContent = c.name;
      rangeToggle.style.display = "";
      dateNav.style.display = "";
    }
    updateDateNavLabel();
  }

  function updateDateNavLabel() {
    const label = document.getElementById("date-nav-label");
    if (state.range === "day") {
      label.textContent = state.asOf === ANCHOR_DATE ? `Today · ${fmt(state.asOf)}` : fmt(state.asOf, { month: "short", day: "numeric", year: "numeric", weekday: "short" });
    } else if (state.range === "week") {
      label.textContent = `Week of ${fmt(windowStart(), { month: "short", day: "numeric" })} – ${fmt(state.asOf, { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      label.textContent = `${fmt(windowStart(), { month: "short", day: "numeric" })} – ${fmt(state.asOf, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    document.getElementById("date-prev").disabled = windowStart() <= EARLIEST_DATE && state.asOf <= EARLIEST_DATE;
    document.getElementById("date-next").disabled = state.asOf >= ANCHOR_DATE;
  }

  function renderActiveTab() {
    const root = document.getElementById("tab-panels");
    if (state.activeTab === "home") root.innerHTML = renderHome();
    else if (state.activeTab === "general") root.innerHTML = renderGeneral();
    else if (state.activeTab === "entrants") root.innerHTML = renderEntrants();
    else if (state.activeTab === "webinars") root.innerHTML = renderWebinars();
    else if (state.activeTab === "feature-comparison") root.innerHTML = renderFeatureComparison();
    else root.innerHTML = renderCompetitor(state.activeTab);

    wireWebinarToolbar();
    wireFeatureComparison();
    root.querySelectorAll(".feature-card[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    watchAvatarLoad(root.querySelector(".company-avatar img"));
  }

  // Defensive fallback: if a logo request hangs (slow/unreliable network)
  // rather than firing a normal error event, don't leave a blank box —
  // swap to the initials after a short grace period.
  function watchAvatarLoad(img) {
    if (!img) return;
    setTimeout(() => {
      if (!img.isConnected) return;
      if (!img.complete || img.naturalWidth === 0) {
        img.style.display = "none";
        const fallback = img.nextElementSibling;
        if (fallback) fallback.style.display = "flex";
      }
    }, 3500);
  }

  /* ================= HOME / OVERVIEW ================= */
  function renderHome() {
    let html = "";

    html += `<div class="card home-hero">
      <div class="home-hero-eyebrow"><iconify-icon icon="ph:sparkle"></iconify-icon>Competitive Intelligence, in one place</div>
      <h1>Everything worth knowing about the AI-patent &amp; AI-legal competitive landscape.</h1>
      <p>This dashboard pulls together daily competitor activity, hiring signals, marketing moves, new market entrants, and industry webinars — ranked by how much each item actually matters to Patlytics, not just how recent it is. Use the sidebar to jump into a company, or the search bar to find anything across every section and past date.</p>
    </div>`;

    html += `<div class="home-section-title"><iconify-icon icon="ph:squares-four"></iconify-icon>What's on this dashboard</div>`;
    html += `<div class="feature-grid">
      ${featureCardHtml("general", "ph:newspaper", "Daily Brief", "The day's biggest industry and competitor news, ranked by priority and correlation to Patlytics.", "See what's happening today")}
      ${featureCardHtml(COMPETITORS_SORTED[0].id, "ph:buildings", "Competitors", `${COMPETITORS.length} companies, ordered by how directly they compete with Patlytics. Each profile covers company info, daily/weekly activity, hiring, and marketing.`, "Browse competitor profiles")}
      ${featureCardHtml("entrants", "ph:compass", "New Market Entrants", "Newly-funded startups entering the AI-patent space — who's backing them, who they're hiring, and how much of a threat they are.", "See who's entering the market")}
      ${featureCardHtml("webinars", "ph:calendar-blank", "Webinars", "Upcoming and past industry &amp; competitor webinars, filterable by date.", "View upcoming webinars")}
    </div>`;

    html += `<div class="home-section-title"><iconify-icon icon="ph:lightbulb"></iconify-icon>How to use this dashboard</div>`;
    html += `<div class="card howto-list">
      <div class="howto-item"><iconify-icon icon="ph:magnifying-glass"></iconify-icon><div><div class="howto-title">Search everything</div><div class="howto-desc">The sidebar search bar (press <strong>/</strong> to focus it) searches highlights, every competitor's activity, new entrants, and webinars at once.</div></div></div>
      <div class="howto-item"><iconify-icon icon="ph:calendar-dots"></iconify-icon><div><div class="howto-title">Look back in time</div><div class="howto-desc">Use the Day / Week / Month toggle and the date arrows at the top of most tabs to pull up briefs from previous days, weeks, or months.</div></div></div>
      <div class="howto-item"><iconify-icon icon="ph:arrow-up-right"></iconify-icon><div><div class="howto-title">Jump to the source</div><div class="howto-desc">Any card with an arrow icon links out to its real source, careers page, or registration page in a new tab.</div></div></div>
      <div class="howto-item"><iconify-icon icon="ph:sort-ascending"></iconify-icon><div><div class="howto-title">Ranked by correlation</div><div class="howto-desc">Competitors and new entrants are both ordered by how directly they threaten Patlytics.</div></div></div>
    </div>`;

    return html;
  }

  function featureCardHtml(tabId, icon, title, desc, cta) {
    return `<button type="button" class="card feature-card" data-tab="${tabId}">
      <div class="feature-card-icon"><iconify-icon icon="${icon}"></iconify-icon></div>
      <div>
        <div class="feature-card-title">${escapeHtml(title)}</div>
        <div class="feature-card-desc">${desc}</div>
        <div class="feature-card-meta">${escapeHtml(cta)} →</div>
      </div>
    </button>`;
  }

  /* ================= GENERAL TAB ================= */
  function renderGeneral() {
    const items = HIGHLIGHTS.filter((h) => inWindow(h.date)).sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return b.date.localeCompare(a.date);
    });

    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    items.forEach((i) => counts[i.priority]++);

    let html = "";
    html += `<div class="section-heading">
      <iconify-icon icon="ph:newspaper"></iconify-icon>
      <h2>Top Industry &amp; Competitor News</h2>
      <span class="count-chip">${items.length}</span>
    </div>
    <p class="section-sub">Ranked by priority — how significant the news is and its correlation to Patlytics — then recency. Showing the ${state.range === "day" ? "selected day" : state.range === "week" ? "selected week" : "selected month"}.</p>`;

    if (!items.length) {
      html += emptyState("No highlights in this window. Try widening the range or moving to a different date.");
    } else {
      items.forEach((h) => { html += highlightCardHtml(h); });
    }
    return html;
  }

  function highlightCardHtml(h) {
    return `<div class="card highlight-card${h.url ? " has-arrow-link" : ""}" data-search-anchor="${h.id}">
      <div class="priority-rail ${h.priority}"></div>
      <div class="highlight-body">
        <div class="highlight-meta-row">
          <span class="badge ${h.priority}">${h.priority}</span>
          <span class="tag-chip"><iconify-icon icon="${categoryIcon(h.category)}" style="vertical-align:-2px; margin-right:3px;"></iconify-icon>${escapeHtml(h.category)}</span>
          <span class="tag-chip">${fmt(h.date, { month: "short", day: "numeric" })}</span>
        </div>
        <div class="highlight-title">${escapeHtml(h.title)}</div>
        <div class="highlight-summary">${escapeHtml(h.summary)}</div>
        <div class="highlight-why"><iconify-icon icon="ph:target" style="vertical-align:-3px; margin-right:4px;"></iconify-icon>Why it matters to Patlytics: ${escapeHtml(h.whyItMatters)}</div>
        <div class="highlight-footer">
          <span class="companies">${h.companies.map((c) => `<span class="tag-chip">${escapeHtml(c)}</span>`).join("")}</span>
          <span>·</span>
          <span>${escapeHtml(h.source)}</span>
        </div>
      </div>
      ${arrowLink(h.url, "Open source for: " + h.title)}
    </div>`;
  }

  /* ================= COMPETITOR TAB ================= */
  function renderCompetitor(id) {
    const c = COMPETITORS.find((x) => x.id === id);
    const tierClass = c.tier.startsWith("Tier 1") ? "tier1" : c.tier.startsWith("Tier 2") ? "tier2" : "tier3";

    let html = "";

    html += `<div class="card company-header-card">
      <div class="company-header-top">
        ${companyAvatarHtml(c.id, c.initials, c.name)}
        <div class="company-header-titles">
          <h2>${escapeHtml(c.name)}${c.linkedin ? `<a class="company-linkedin-link" href="${escapeHtml(c.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : ""}</h2>
          <div class="company-tagline">${escapeHtml(c.tagline)}</div>
        </div>
        <span class="tier-badge ${tierClass}">${escapeHtml(c.tier)}</span>
      </div>
      <p class="company-description">${escapeHtml(c.description)}</p>
      <div class="company-meta-grid">
        <div class="meta-cell"><div class="meta-label">Employees</div><div class="meta-value">${escapeHtml(c.employeeCount)}</div></div>
        <div class="meta-cell"><div class="meta-label">Founded</div><div class="meta-value">${escapeHtml(c.founded)}</div></div>
        <div class="meta-cell"><div class="meta-label">Headquarters</div><div class="meta-value">${escapeHtml(c.hq)}</div></div>
        <div class="meta-cell"><div class="meta-label">Website</div><div class="meta-value"><a href="${escapeHtml(c.websiteUrl || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.website)}</a></div></div>
      </div>
      <div class="founder-strip">
        ${c.founders.map((f) => `<div class="founder-row">
          <iconify-icon icon="ph:graduation-cap"></iconify-icon>
          <div>
            <div><span class="founder-name">${escapeHtml(f.name)}</span> <span class="founder-title">— ${escapeHtml(f.title)}</span></div>
            <div class="founder-note">${escapeHtml(f.note)}</div>
          </div>
        </div>`).join("")}
      </div>
    </div>`;

    // Today
    const todayItems = state.asOf === ANCHOR_DATE ? c.todayActivity : [];
    html += `<div class="section-heading"><iconify-icon icon="ph:sun"></iconify-icon><h2>Important Activity Today</h2><span class="count-chip">${todayItems.length}</span></div>`;
    html += todayItems.length
      ? todayItems.map((a) => activityItemHtml(a, a.time)).join("")
      : emptyState(`No significant ${escapeHtml(c.name)} activity recorded for today.`);

    // Week / range
    const rangeLabel = state.range === "month" ? "This Month" : state.range === "week" ? "This Week" : "The Last 7 Days";
    const weekItems = c.weekActivity.filter((a) => inWindow(a.date) || (state.range === "day" && a.date >= addDays(state.asOf, -6) && a.date <= state.asOf))
      .sort((a, b) => b.date.localeCompare(a.date));
    html += `<div class="section-heading"><iconify-icon icon="ph:calendar-dots"></iconify-icon><h2>Important Activity — ${rangeLabel}</h2><span class="count-chip">${weekItems.length}</span></div>`;
    html += weekItems.length
      ? weekItems.map((a) => activityItemHtml(a, fmt(a.date, { month: "short", day: "numeric" }))).join("")
      : emptyState(`No additional ${escapeHtml(c.name)} activity in this window.`);

    // Hiring
    html += `<div class="section-heading"><iconify-icon icon="ph:briefcase"></iconify-icon><h2>Hiring &amp; Headcount Signals</h2></div>`;
    html += `<div class="hiring-stats-row">
      <div class="card stat-card"><div class="stat-value">${c.hiring.openRoles != null ? c.hiring.openRoles : "—"}</div><div class="stat-label">Open Roles</div></div>
      <div class="card stat-card"><div class="stat-value">${c.hiring.newRolesToday.length}</div><div class="stat-label">Opened Today</div></div>
      <div class="card stat-card"><div class="stat-value">${c.hiring.recentHires.length}</div><div class="stat-label">Recent New Hires</div></div>
    </div>`;

    html += `<div class="two-col">
      <div>
        <h3 style="font-size:13px; margin-bottom:8px; color:var(--text-secondary);">Roles Opened Today</h3>
        ${c.hiring.newRolesToday.length ? `<div class="role-pill-list">${c.hiring.newRolesToday.map((r) => `<a class="role-pill role-pill-link" href="${escapeHtml(r.url || c.careersUrl || "#")}" target="_blank" rel="noopener noreferrer" title="${r.url ? `View this role at ${escapeHtml(c.name)}` : `View open roles at ${escapeHtml(c.name)}`}"><span>${escapeHtml(r.title)} <span style="color:var(--text-muted); font-size:11.5px;">— ${escapeHtml(r.dept)}, ${escapeHtml(r.location)}</span></span><iconify-icon icon="ph:arrow-square-out" class="role-pill-arrow"></iconify-icon></a>`).join("")}</div>` : emptyState("No roles opened today.")}

        <h3 style="font-size:13px; margin:18px 0 8px; color:var(--text-secondary);">Most Prominent Roles Hiring For</h3>
        <div class="role-pill-list">${c.hiring.topRoles.map((r) => `<a class="role-pill role-pill-link" href="${escapeHtml(r.url || c.careersUrl || "#")}" target="_blank" rel="noopener noreferrer" title="${r.url ? `View this role at ${escapeHtml(c.name)}` : `View open roles at ${escapeHtml(c.name)}`}"><span>${escapeHtml(r.title)}</span><span style="display:flex; align-items:center; gap:8px;"><span class="count">${r.count} open</span><iconify-icon icon="ph:arrow-square-out" class="role-pill-arrow"></iconify-icon></span></a>`).join("") || emptyState("No open roles.")}</div>
      </div>
      <div>
        <h3 style="font-size:13px; margin-bottom:8px; color:var(--text-secondary);">New Hires</h3>
        <div class="card">
          ${c.hiring.recentHires.length ? c.hiring.recentHires.map((h) => `<div class="hire-row">
            <div class="hire-avatar">${escapeHtml(h.name.split(" ").map((n) => n[0]).join("").slice(0,2))}</div>
            <div class="hire-info">
              <div class="hire-name">${escapeHtml(h.name)}</div>
              <div class="hire-role">${escapeHtml(h.role)}</div>
              <div class="hire-from">${escapeHtml(h.from)}</div>
            </div>
            <div class="hire-date">${fmt(h.date, { month: "short", day: "numeric" })}</div>
          </div>`).join("") : `<div style="padding:16px;">${emptyState("Work in progress.")}</div>`}
        </div>
      </div>
    </div>`;

    // Marketing
    html += `<div class="section-heading"><iconify-icon icon="ph:megaphone"></iconify-icon><h2>Notable Marketing Activity</h2></div>`;
    html += c.marketing.length
      ? c.marketing.map((m) => `<div class="card activity-item${m.url ? " has-arrow-link" : ""}">
          <div class="activity-icon"><iconify-icon icon="ph:megaphone"></iconify-icon></div>
          <div class="activity-body">
            <div class="activity-top-row"><span class="activity-title">${escapeHtml(m.title)}</span><span class="tag-chip">${escapeHtml(m.channel)}</span><span class="activity-time">${fmt(m.date, { month: "short", day: "numeric" })}</span></div>
            <div class="activity-text">${escapeHtml(m.body)}</div>
          </div>
          ${arrowLink(m.url, "Open source for: " + m.title)}
        </div>`).join("")
      : emptyState("No notable marketing activity recorded for this company yet.");

    return html;
  }

  function activityItemHtml(a, timeLabel) {
    return `<div class="card activity-item${a.url ? " has-arrow-link" : ""}">
      <div class="activity-icon"><iconify-icon icon="${categoryIcon(a.tag)}"></iconify-icon></div>
      <div class="activity-body">
        <div class="activity-top-row">
          <span class="activity-title">${escapeHtml(a.title)}</span>
          <span class="tag-chip">${escapeHtml(a.tag)}</span>
          <span class="activity-time">${escapeHtml(timeLabel)}</span>
        </div>
        <div class="activity-text">${escapeHtml(a.body)}</div>
      </div>
      ${arrowLink(a.url, "Open source for: " + a.title)}
    </div>`;
  }

  /* ================= NEW MARKET ENTRANTS ================= */
  function renderEntrants() {
    const threatOrder = { high: 0, medium: 1, low: 2 };
    const items = [...NEW_ENTRANTS].filter((e) => e.date <= state.asOf).sort((a, b) => b.date.localeCompare(a.date) || threatOrder[a.threat] - threatOrder[b.threat]);

    let html = "";
    html += `<div class="section-heading"><iconify-icon icon="ph:compass"></iconify-icon><h2>New Market Entrants</h2><span class="count-chip">${items.length}</span></div>
    <p class="section-sub">Sourced from VC portfolio pages (Y Combinator, a16z, and similar), founder LinkedIn activity, and launch posts. Ordered by when each was identified, most recent first.</p>`;

    if (!items.length) return html + emptyState("No new entrants identified as of this date.");

    items.forEach((e) => {
      const linkUrl = e.website || e.linkedin;
      const linkLabel = e.website ? "Visit website" : "Visit LinkedIn";
      const openRolesLabel = e.hiring.openRoles != null ? `${e.hiring.openRoles} open roles` : "Open roles not yet verified";
      html += `<div class="card entrant-card${e.sourceUrl ? " has-arrow-link" : ""}">
        <div class="entrant-top">
          <div class="entrant-name-row">
            <span class="entrant-name">${escapeHtml(e.name)}</span>
            ${linkUrl ? `<a class="inline-link-icon" href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(e.name)} — ${linkLabel}" title="${escapeHtml(linkLabel)}"><iconify-icon icon="ph:arrow-square-out" aria-hidden="true"></iconify-icon></a>` : ""}
          </div>
          <span class="threat-badge ${e.threat}">${e.threat} threat</span>
        </div>
        <div class="entrant-tagline">${escapeHtml(e.tagline)}</div>
        <div class="entrant-meta-row">
          <div class="mini-meta"><span class="mini-label">Backing</span>${escapeHtml(e.backing)}</div>
          <div class="mini-meta"><span class="mini-label">Stage</span>${escapeHtml(e.stage)}</div>
          <div class="mini-meta"><span class="mini-label">Identified</span>${fmt(e.date, { month: "short", day: "numeric" })}</div>
        </div>
        <div class="entrant-desc">${escapeHtml(e.description)}</div>
        <div class="entrant-founders">
          ${e.foundingTeam.map((f) => `<div class="ef-row"><strong>${escapeHtml(f.name)}</strong> — <span>${escapeHtml(f.background)}</span></div>`).join("")}
        </div>
        <div class="entrant-hiring">
          <strong>${openRolesLabel}</strong> · Focus: ${escapeHtml(e.hiring.focus)}<br/>
          Hiring profile: ${escapeHtml(e.hiring.hiringProfile)}
        </div>
        ${arrowLink(e.sourceUrl, "Open source: " + (e.source || e.name))}
      </div>`;
    });
    return html;
  }

  /* ================= WEBINARS ================= */
  function renderWebinars() {
    let html = "";
    html += `<div class="section-heading"><iconify-icon icon="ph:calendar-blank"></iconify-icon><h2>Industry &amp; Competitor Webinars</h2></div>
    <div class="webinar-toolbar">
      <div class="filter-pill-group" id="webinar-filter-group">
        <button type="button" data-filter="upcoming" class="${state.webinarFilter === "upcoming" ? "active" : ""}">Upcoming</button>
        <button type="button" data-filter="past" class="${state.webinarFilter === "past" ? "active" : ""}">Past</button>
        <button type="button" data-filter="all" class="${state.webinarFilter === "all" ? "active" : ""}">All</button>
      </div>
      <div class="date-range-inputs">
        <iconify-icon icon="ph:funnel"></iconify-icon> Filter by date:
        <input type="date" id="webinar-from" min="${EARLIEST_DATE}" />
        <span>to</span>
        <input type="date" id="webinar-to" />
      </div>
    </div>
    <div id="webinar-list"></div>`;
    return html;
  }

  function computeWebinarList() {
    const fromEl = document.getElementById("webinar-from");
    const toEl = document.getElementById("webinar-to");
    const from = fromEl && fromEl.value;
    const to = toEl && toEl.value;

    let items = [...WEBINARS];
    if (state.webinarFilter === "upcoming") items = items.filter((w) => w.date >= ANCHOR_DATE);
    else if (state.webinarFilter === "past") items = items.filter((w) => w.date < ANCHOR_DATE);
    if (from) items = items.filter((w) => w.date >= from);
    if (to) items = items.filter((w) => w.date <= to);

    items.sort((a, b) => (state.webinarFilter === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    return items;
  }

  function renderWebinarList() {
    const list = document.getElementById("webinar-list");
    if (!list) return;
    const items = computeWebinarList();
    if (!items.length) { list.innerHTML = emptyState("No webinars match this filter."); return; }

    const relevanceBadge = { high: "critical", medium: "high", low: "low" };
    list.innerHTML = items.map((w) => `<div class="card webinar-card${w.url ? " has-arrow-link" : ""}">
      <div class="webinar-date-block">
        <div class="wd-month">${fmt(w.date, { month: "short" })}</div>
        <div class="wd-day">${parseDate(w.date).getUTCDate()}</div>
      </div>
      <div class="webinar-info">
        <div class="webinar-title-row">
          <span class="webinar-title">${escapeHtml(w.title)}</span>
          <span class="badge ${relevanceBadge[w.relevance]}">${w.relevance} relevance</span>
        </div>
        <div class="webinar-host">Hosted by ${escapeHtml(w.host)} · ${escapeHtml(w.format)}</div>
        <div class="webinar-desc">${escapeHtml(w.description)}</div>
        <div class="webinar-tags">${w.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
      <div class="webinar-time-format">${escapeHtml(w.time)}</div>
      ${arrowLink(w.url, "Open registration / host page for: " + w.title)}
    </div>`).join("");
  }

  function wireWebinarToolbar() {
    if (state.activeTab !== "webinars") return;
    renderWebinarList();
    document.querySelectorAll("#webinar-filter-group button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.webinarFilter = btn.dataset.filter;
        document.querySelectorAll("#webinar-filter-group button").forEach((b) => b.classList.toggle("active", b === btn));
        renderWebinarList();
      });
    });
    ["webinar-from", "webinar-to"].forEach((id) => {
      document.getElementById(id).addEventListener("change", renderWebinarList);
    });
  }

  /* ================= FEATURE COMPARISON ================= */
  const FC_STATUS_CYCLE = ["yes", "no", "partial", "unknown"];

  function fcGetCompany(id) {
    if (id === "patlytics") return PATLYTICS_PSEUDO_COMPANY;
    return COMPETITORS.find((c) => c.id === id);
  }

  function fcAllFeatures() {
    return [
      ...FEATURE_ROWS,
      ...state.fc.customFeatures.map((f) => ({ id: f.id, name: f.name, support: state.fc.researchedSupport[f.id] || {} })),
    ];
  }

  function fcStatus(companyId, feature) {
    const key = `${companyId}::${feature.id}`;
    if (state.fc.overrides[key]) return state.fc.overrides[key];
    const s = feature.support && feature.support[companyId];
    return s ? s.status : "unknown";
  }

  function fcDetail(companyId, feature) {
    const s = feature.support && feature.support[companyId];
    if (s) return s.detail;
    const company = fcGetCompany(companyId);
    return `No detail recorded yet for ${company ? company.name : "this company"} on "${feature.name}". Click the cell to set a status.`;
  }

  function fcStatusIcon(status) {
    if (status === "yes") return '<iconify-icon icon="ph:check-bold" class="fc-icon"></iconify-icon>';
    if (status === "no") return '<iconify-icon icon="ph:x-bold" class="fc-icon"></iconify-icon>';
    if (status === "partial") return '<iconify-icon icon="ph:minus" class="fc-icon"></iconify-icon>';
    return '<iconify-icon icon="ph:question" class="fc-icon"></iconify-icon>';
  }

  function fcCycleStatus(companyId, featureId) {
    const feature = fcAllFeatures().find((f) => f.id === featureId);
    if (!feature) return;
    const key = `${companyId}::${featureId}`;
    const current = fcStatus(companyId, feature);
    const next = FC_STATUS_CYCLE[(FC_STATUS_CYCLE.indexOf(current) + 1) % FC_STATUS_CYCLE.length];
    state.fc.overrides[key] = next;
    renderActiveTab();
  }

  // No wordmark-logo scraper exists yet (by design — not built in this
  // pass). This tries a local wordmark asset first so real logos can be
  // dropped in later with no code change, and falls back to the
  // company's full name rendered as text — never the small square
  // favicon used elsewhere in the app.
  function fcCompanyHeaderHtml(company) {
    return `<div class="fc-company-header">
      <img src="assets/logos-full/${company.id}.png" alt="${escapeHtml(company.name)}" class="fc-wordmark-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <div class="fc-wordmark-text" style="display:none;">${escapeHtml(company.name)}</div>
    </div>`;
  }

  function fcChatBubbleHtml(msg) {
    const escaped = escapeHtml(msg.text).replace(/\n/g, "<br>");
    return `<div class="fc-chat-row fc-chat-row-${msg.role}">
      <div class="fc-chat-bubble fc-chat-bubble-${msg.role}">${escaped}</div>
    </div>`;
  }

  const FC_SENTIMENT_ICON = { positive: "ph:thumbs-up", negative: "ph:thumbs-down", mixed: "ph:minus-circle" };
  function fcSentimentBadgeHtml(sentiment) {
    if (!sentiment) return "";
    const icon = FC_SENTIMENT_ICON[sentiment] || "ph:circle";
    return `<span class="fc-sentiment-badge fc-sentiment-${escapeHtml(sentiment)}"><iconify-icon icon="${icon}"></iconify-icon> ${escapeHtml(sentiment)}</span>`;
  }

  function fcReviewBubbleHtml(review) {
    return `<a class="fc-review-bubble" href="${escapeHtml(review.sourceUrl)}" target="_blank" rel="noopener noreferrer">
      <div class="fc-review-avatar"><iconify-icon icon="ph:chat-circle-dots"></iconify-icon></div>
      <div class="fc-review-body">
        <div class="fc-review-meta">
          <span class="tag-chip">${escapeHtml(review.platform)}</span>
          <span class="fc-review-author">${escapeHtml(review.author)}</span>
          ${review.date ? `<span class="fc-review-date">${escapeHtml(review.date)}</span>` : ""}
          ${fcSentimentBadgeHtml(review.sentiment)}
        </div>
        <div class="fc-review-text">${escapeHtml(review.text)}</div>
        <div class="fc-review-source-hint"><iconify-icon icon="ph:arrow-square-out"></iconify-icon> Open source on ${escapeHtml(review.platform)}</div>
      </div>
    </a>`;
  }

  const FC_FEATURE_KEYWORDS = {
    "claim-charting": ["claim chart", "claim-chart"],
    "prior-art-search": ["prior art", "novelty search"],
    "office-action-response": ["office action", "oa response"],
    "portfolio-analytics": ["portfolio analytic", "portfolio dashboard"],
    "fto-analysis": ["freedom to operate", "fto analysis", " fto "],
    "ptab-litigation-support": ["ptab", "ipr petition", "inter partes review", "litigation support"],
  };

  function fcFindMentionedCompanies(text) {
    const lower = text.toLowerCase();
    const all = [PATLYTICS_PSEUDO_COMPANY, ...COMPETITORS];
    return all.filter((c) => lower.includes(c.name.toLowerCase()) || lower.includes(c.id.replace(/-/g, " ")));
  }

  function fcFindMentionedFeature(text) {
    const lower = ` ${text.toLowerCase()} `;
    const features = fcAllFeatures();
    for (const f of features) {
      if (lower.includes(f.name.toLowerCase())) return f;
      const kws = FC_FEATURE_KEYWORDS[f.id];
      if (kws && kws.some((k) => lower.includes(k))) return f;
    }
    return null;
  }

  function fcAnswerQuestion(question) {
    const feature = fcFindMentionedFeature(question);
    let companies = fcFindMentionedCompanies(question);

    if (!feature) {
      const names = FEATURE_ROWS.map((f) => `"${f.name}"`).join(", ");
      return `I can only compare features that are on the board above. Try asking about one of: ${names}.`;
    }
    if (companies.length === 0) {
      const rows = state.fc.companyIds
        .map((id) => {
          const c = fcGetCompany(id);
          return c ? `${c.name}: ${fcStatus(id, feature)}` : null;
        })
        .filter(Boolean);
      return `Here's where "${feature.name}" stands across the companies currently in your comparison —\n${rows.join("\n")}\n\nAsk about two specific companies (e.g. "Patlytics vs PatSnap") for the fuller explanation behind each status.`;
    }
    if (companies.length === 1) {
      companies = companies[0].id === "patlytics" ? [PATLYTICS_PSEUDO_COMPANY] : [PATLYTICS_PSEUDO_COMPANY, companies[0]];
    }
    if (companies.length === 1) {
      const c = companies[0];
      return `${c.name} on "${feature.name}": ${fcDetail(c.id, feature)}`;
    }
    const [a, b] = companies;
    return `On "${feature.name}":\n\n${a.name}: ${fcDetail(a.id, feature)}\n\n${b.name}: ${fcDetail(b.id, feature)}`;
  }

  // Calls the Cloudflare Worker's /api/chat (see worker/worker.js). Falls
  // back to the local rule-based answer if no backend is configured, or
  // if the call fails for any reason — the tab should never go silent.
  async function fcAskBackendOrLocal(question) {
    if (!fcBackendConfigured()) return fcAnswerQuestion(question);
    try {
      const res = await fetch(`${FC_WORKER_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Key": FC_ACCESS_KEY },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      const data = await res.json();
      if (!data.answer) throw new Error("Worker returned no answer");
      return data.answer;
    } catch (e) {
      console.error("Feature Clarification backend call failed, falling back to local answer:", e);
      return fcAnswerQuestion(question) + "\n\n(Note: the AI clarification backend didn't respond, so this is the local, matrix-only answer.)";
    }
  }

  // Calls the Cloudflare Worker's /api/research-feature, which uses Claude
  // with live web search to check whether each company supports a newly
  // added feature, then commits the result back to feature-data.json.
  // Only ever invoked for genuinely new custom features — never touches
  // the 6 pre-researched rows shipped with the dashboard.
  async function fcResearchFeatureViaBackend(featureId, featureName, companyIds) {
    state.fc.pendingFeatureRequests[featureId] = true;
    delete state.fc.pendingFeatureErrors[featureId];
    renderActiveTab();
    try {
      const res = await fetch(`${FC_WORKER_BASE_URL}/api/research-feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Key": FC_ACCESS_KEY },
        body: JSON.stringify({ featureName, companyIds }),
      });
      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      const data = await res.json();
      if (!data.results) throw new Error("Worker returned no results");
      state.fc.researchedSupport[featureId] = data.results;
    } catch (e) {
      console.error("Feature research backend call failed:", e);
      state.fc.pendingFeatureErrors[featureId] = "Live research didn't complete — set statuses manually below, or try re-adding the feature.";
    } finally {
      delete state.fc.pendingFeatureRequests[featureId];
      renderActiveTab();
    }
  }

  function renderFeatureComparison() {
    const fc = state.fc;
    const features = fcAllFeatures();
    const companies = fc.companyIds.map(fcGetCompany).filter(Boolean);
    const availableToAdd = [PATLYTICS_PSEUDO_COMPANY, ...COMPETITORS_SORTED].filter((c) => !fc.companyIds.includes(c.id));

    let html = "";

    html += `<div class="section-heading"><iconify-icon icon="lucide:git-compare"></iconify-icon><h2>Feature Comparison Builder</h2></div>
    <p class="section-sub">Build a side-by-side feature matrix across Patlytics and any tracked competitor. Add a feature, add a company, click a cell to set its status, and hover a cell for the detail behind it.</p>`;

    html += `<div class="card fc-toolbar">
      <div class="fc-toolbar-group">
        <input type="text" id="fc-new-feature-input" placeholder="Add a feature to compare…" maxlength="80" />
        <button type="button" id="fc-add-feature-btn" class="fc-toolbar-btn"><iconify-icon icon="ph:plus"></iconify-icon> Add Feature</button>
        <span class="fc-toolbar-note"><iconify-icon icon="ph:info"></iconify-icon> ${
          fcBackendConfigured()
            ? "Adding a feature kicks off a live research pass across the companies in your comparison — this can take up to a few minutes, during which the row shows a researching spinner."
            : "New features start as \"unknown\" for every company. Live research isn't connected yet (no backend deployed) — set statuses manually by clicking each cell."
        }</span>
      </div>
      <div class="fc-toolbar-group">
        <select id="fc-add-company-select">
          <option value="">+ Add a company to compare…</option>
          ${availableToAdd.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </div>
    </div>`;

    html += `<div class="fc-table-wrap"><table class="fc-table">
      <thead><tr>
        <th class="fc-feature-col">Feature</th>
        ${companies
          .map(
            (c) => `<th class="fc-company-col">
          <div class="fc-company-header-inner">
            ${fcCompanyHeaderHtml(c)}
            ${c.isSelf ? "" : `<button type="button" class="fc-remove-col" data-company="${c.id}" aria-label="Remove ${escapeHtml(c.name)} from comparison"><iconify-icon icon="ph:x"></iconify-icon></button>`}
          </div>
        </th>`
          )
          .join("")}
      </tr></thead>
      <tbody>
        ${features
          .map((f) => {
            const isCustom = fc.customFeatures.some((cf) => cf.id === f.id);
            const isPending = !!fc.pendingFeatureRequests[f.id];
            const researchError = fc.pendingFeatureErrors[f.id];
            return `<tr${isPending ? ' class="fc-row-pending"' : ""}>
          <td class="fc-feature-cell">
            <div class="fc-feature-name">
              <span>${escapeHtml(f.name)}</span>
              ${isPending ? `<span class="fc-researching-badge"><iconify-icon icon="ph:spinner-gap" class="fc-spin"></iconify-icon> Researching…</span>` : ""}
              ${researchError ? `<span class="fc-research-error" title="${escapeHtml(researchError)}"><iconify-icon icon="ph:warning"></iconify-icon></span>` : ""}
              ${isCustom ? `<button type="button" class="fc-remove-row" data-feature="${f.id}" aria-label="Remove feature"><iconify-icon icon="ph:x"></iconify-icon></button>` : ""}
            </div>
          </td>
          ${companies
            .map((c) => {
              if (isPending) {
                return `<td class="fc-cell fc-status-pending" tabindex="-1" aria-label="${escapeHtml(c.name)} — ${escapeHtml(f.name)}: research in progress">
                <iconify-icon icon="ph:spinner-gap" class="fc-icon fc-spin"></iconify-icon>
              </td>`;
              }
              const status = fcStatus(c.id, f);
              const detail = fcDetail(c.id, f);
              return `<td class="fc-cell fc-status-${status}" data-company="${c.id}" data-feature="${f.id}" data-detail="${escapeHtml(detail)}" data-company-name="${escapeHtml(c.name)}" data-feature-name="${escapeHtml(f.name)}" tabindex="0" role="button" aria-label="${escapeHtml(c.name)} — ${escapeHtml(f.name)}: ${escapeHtml(status)}. Click to change.">
              ${fcStatusIcon(status)}
            </td>`;
            })
            .join("")}
        </tr>`;
          })
          .join("")}
      </tbody>
    </table></div>
    <div id="fc-tooltip" class="fc-tooltip hidden"></div>
    <div class="fc-legend">
      <span><iconify-icon icon="ph:check-bold"></iconify-icon> Supported</span>
      <span><iconify-icon icon="ph:minus"></iconify-icon> Partial</span>
      <span><iconify-icon icon="ph:x-bold"></iconify-icon> Not supported</span>
      <span><iconify-icon icon="ph:question"></iconify-icon> Unknown — click to set</span>
    </div>`;

    html += `<div class="section-heading"><iconify-icon icon="ph:chat-circle-text"></iconify-icon><h2>Feature Clarification</h2></div>
    <p class="section-sub">Ask how a specific feature compares across companies — e.g. “How does Patlytics' claim charting differ from PatSnap's?”${
      fcBackendConfigured()
        ? " Answers come from an AI assistant grounded in the verified matrix data — it'll ask a follow-up if your question is too broad."
        : ""
    }</p>
    <div class="card fc-chat">
      <div class="fc-chat-messages" id="fc-chat-messages">
        ${fc.chat.length ? fc.chat.map(fcChatBubbleHtml).join("") : `<div class="fc-chat-empty">Ask about one of the tracked features above to get started.</div>`}
        ${fc.chatBusy ? `<div class="fc-chat-row fc-chat-row-assistant"><div class="fc-chat-bubble fc-chat-bubble-assistant fc-chat-bubble-thinking"><iconify-icon icon="ph:spinner-gap" class="fc-spin"></iconify-icon> Thinking…</div></div>` : ""}
      </div>
      <form id="fc-chat-form" class="fc-chat-form">
        <input type="text" id="fc-chat-input" placeholder="Ask about a feature…" autocomplete="off" ${fc.chatBusy ? "disabled" : ""} />
        <button type="submit" aria-label="Send" ${fc.chatBusy ? "disabled" : ""}><iconify-icon icon="ph:paper-plane-right"></iconify-icon></button>
      </form>
    </div>`;

    const reviewCompanyOptions = COMPETITORS_SORTED;
    const allReviewsForSelection = (FEATURE_REVIEWS[fc.review.companyId] && FEATURE_REVIEWS[fc.review.companyId][fc.review.featureId]) || [];
    const sentimentFilter = fc.review.sentimentFilter || "all";
    const reviews = sentimentFilter === "all" ? allReviewsForSelection : allReviewsForSelection.filter((r) => r.sentiment === sentimentFilter);
    const reviewCompany = fcGetCompany(fc.review.companyId);
    const reviewFeature = features.find((f) => f.id === fc.review.featureId);
    const sentimentCounts = { positive: 0, negative: 0, mixed: 0 };
    allReviewsForSelection.forEach((r) => { if (sentimentCounts[r.sentiment] !== undefined) sentimentCounts[r.sentiment]++; });

    html += `<div class="section-heading"><iconify-icon icon="ph:chats-circle"></iconify-icon><h2>Feature Reviews</h2><span class="count-chip">${reviews.length}</span></div>
    <p class="section-sub">What people are saying about a specific company's feature, in a message-style feed. Click a review to open its original source. The daily research routine scrapes for new reviews once a day; this list only ever contains reviews with a real, working source link.</p>
    <div class="fc-review-controls">
      <select id="fc-review-company-select">
        ${reviewCompanyOptions.map((c) => `<option value="${c.id}" ${c.id === fc.review.companyId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
      </select>
      <select id="fc-review-feature-select">
        ${features.map((f) => `<option value="${f.id}" ${f.id === fc.review.featureId ? "selected" : ""}>${escapeHtml(f.name)}</option>`).join("")}
      </select>
      <div class="fc-sentiment-filter" role="group" aria-label="Filter reviews by sentiment">
        <button type="button" data-sentiment="all" class="${sentimentFilter === "all" ? "active" : ""}">All (${allReviewsForSelection.length})</button>
        <button type="button" data-sentiment="positive" class="${sentimentFilter === "positive" ? "active" : ""}"><iconify-icon icon="ph:thumbs-up"></iconify-icon> Positive (${sentimentCounts.positive})</button>
        <button type="button" data-sentiment="negative" class="${sentimentFilter === "negative" ? "active" : ""}"><iconify-icon icon="ph:thumbs-down"></iconify-icon> Negative (${sentimentCounts.negative})</button>
        <button type="button" data-sentiment="mixed" class="${sentimentFilter === "mixed" ? "active" : ""}"><iconify-icon icon="ph:minus-circle"></iconify-icon> Mixed (${sentimentCounts.mixed})</button>
      </div>
    </div>
    <div class="fc-review-list">
      ${
        reviews.length
          ? reviews.map(fcReviewBubbleHtml).join("")
          : emptyState(
              allReviewsForSelection.length
                ? `No ${sentimentFilter} reviews for "${reviewFeature ? reviewFeature.name : ""}" at ${reviewCompany ? reviewCompany.name : "this company"} -- try a different filter.`
                : `No reviews found yet for "${reviewFeature ? reviewFeature.name : ""}" at ${reviewCompany ? reviewCompany.name : "this company"}. The daily routine keeps searching -- most niche features genuinely have thin public review coverage.`
            )
      }
    </div>`;

    return html;
  }

  function wireFeatureComparison() {
    if (state.activeTab !== "feature-comparison") return;

    const addFeatureBtn = document.getElementById("fc-add-feature-btn");
    const addFeatureInput = document.getElementById("fc-new-feature-input");
    function addFeature() {
      const name = addFeatureInput.value.trim();
      if (!name) return;
      const id = "custom-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      state.fc.customFeatures.push({ id, name });
      if (fcBackendConfigured()) {
        fcResearchFeatureViaBackend(id, name, [...state.fc.companyIds]);
      }
      renderActiveTab();
    }
    addFeatureBtn.addEventListener("click", addFeature);
    addFeatureInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addFeature(); }
    });

    document.querySelectorAll(".fc-remove-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const fid = btn.dataset.feature;
        state.fc.customFeatures = state.fc.customFeatures.filter((f) => f.id !== fid);
        delete state.fc.researchedSupport[fid];
        delete state.fc.pendingFeatureRequests[fid];
        delete state.fc.pendingFeatureErrors[fid];
        renderActiveTab();
      });
    });

    const addCompanySelect = document.getElementById("fc-add-company-select");
    addCompanySelect.addEventListener("change", () => {
      const id = addCompanySelect.value;
      if (id && !state.fc.companyIds.includes(id)) {
        state.fc.companyIds.push(id);
        renderActiveTab();
      }
    });

    document.querySelectorAll(".fc-remove-col").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.fc.companyIds = state.fc.companyIds.filter((id) => id !== btn.dataset.company);
        renderActiveTab();
      });
    });

    document.querySelectorAll(".fc-cell").forEach((cell) => {
      cell.addEventListener("click", () => fcCycleStatus(cell.dataset.company, cell.dataset.feature));
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fcCycleStatus(cell.dataset.company, cell.dataset.feature); }
      });
    });

    const tooltip = document.getElementById("fc-tooltip");
    const tableWrap = document.querySelector(".fc-table-wrap");
    document.querySelectorAll(".fc-cell").forEach((cell) => {
      cell.addEventListener("mouseenter", () => {
        tooltip.innerHTML = `<strong>${escapeHtml(cell.dataset.companyName)}</strong> — ${escapeHtml(cell.dataset.featureName)}<br>${escapeHtml(cell.dataset.detail)}`;
        const rect = cell.getBoundingClientRect();
        const wrapRect = tableWrap.getBoundingClientRect();
        tooltip.style.left = Math.max(8, rect.left - wrapRect.left + rect.width / 2 - 130) + "px";
        tooltip.style.top = rect.top - wrapRect.top + rect.height + 8 + tableWrap.scrollTop + "px";
        tooltip.classList.remove("hidden");
      });
      cell.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));
      cell.addEventListener("focus", () => cell.dispatchEvent(new Event("mouseenter")));
      cell.addEventListener("blur", () => tooltip.classList.add("hidden"));
    });

    const chatForm = document.getElementById("fc-chat-form");
    const chatInput = document.getElementById("fc-chat-input");
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = chatInput.value.trim();
      if (!q || state.fc.chatBusy) return;
      state.fc.chat.push({ role: "user", text: q });
      state.fc.chatBusy = true;
      renderActiveTab();
      const scrollToBottom = () => {
        const msgs = document.getElementById("fc-chat-messages");
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
      };
      scrollToBottom();
      const answer = await fcAskBackendOrLocal(q);
      state.fc.chat.push({ role: "assistant", text: answer });
      state.fc.chatBusy = false;
      renderActiveTab();
      scrollToBottom();
      const freshInput = document.getElementById("fc-chat-input");
      if (freshInput) freshInput.focus();
    });

    const reviewCompanySelect = document.getElementById("fc-review-company-select");
    const reviewFeatureSelect = document.getElementById("fc-review-feature-select");
    reviewCompanySelect.addEventListener("change", () => {
      state.fc.review.companyId = reviewCompanySelect.value;
      renderActiveTab();
    });
    reviewFeatureSelect.addEventListener("change", () => {
      state.fc.review.featureId = reviewFeatureSelect.value;
      renderActiveTab();
    });
    document.querySelectorAll(".fc-sentiment-filter button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.fc.review.sentimentFilter = btn.dataset.sentiment;
        renderActiveTab();
      });
    });
  }

  /* ================= SHARED PARTIALS ================= */
  function arrowLink(url, label) {
    if (!url) return "";
    return `<a class="card-arrow-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label || "Open source in a new tab")}" title="${escapeHtml(label || "Open source")}">
      <iconify-icon icon="ph:arrow-up-right" aria-hidden="true"></iconify-icon>
    </a>`;
  }
  function externalLinkIcon(url, label) {
    if (!url) return "";
    return `<a class="inline-link-icon" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label || "Open in a new tab")}" title="${escapeHtml(label || "Open in a new tab")}">
      <iconify-icon icon="ph:arrow-square-out" aria-hidden="true"></iconify-icon>
    </a>`;
  }
  function emptyState(text) {
    return `<div class="empty-state"><iconify-icon icon="ph:tray" style="font-size:20px; display:block; margin:0 auto 6px;"></iconify-icon>${escapeHtml(text)}</div>`;
  }

  /* ================= DATE NAV / RANGE TOGGLE ================= */
  function wireTopbarControls() {
    document.getElementById("date-prev").addEventListener("click", () => {
      state.asOf = clamp(addDays(state.asOf, -rangeSpanDays()));
      updateDateNavLabel();
      renderActiveTab();
    });
    document.getElementById("date-next").addEventListener("click", () => {
      state.asOf = clamp(addDays(state.asOf, rangeSpanDays()));
      updateDateNavLabel();
      renderActiveTab();
    });
    document.querySelectorAll("#range-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.range = btn.dataset.range;
        document.querySelectorAll("#range-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
        updateDateNavLabel();
        renderActiveTab();
      });
    });
  }

  /* ================= GLOBAL SEARCH ================= */
  function buildSearchIndex() {
    const idx = [];
    HIGHLIGHTS.forEach((h) => idx.push({ group: "Daily Brief", tab: "general", title: h.title, meta: `${h.category} · ${fmt(h.date, { month: "short", day: "numeric" })}`, text: `${h.title} ${h.summary} ${h.whyItMatters}`, asOf: h.date }));
    COMPETITORS.forEach((c) => {
      idx.push({ group: "Competitors", tab: c.id, title: c.name, meta: c.tier, text: `${c.name} ${c.description} ${c.tagline}`, asOf: ANCHOR_DATE });
      [...c.todayActivity, ...c.weekActivity].forEach((a) => idx.push({ group: "Competitors", tab: c.id, title: `${c.name}: ${a.title}`, meta: a.tag, text: `${a.title} ${a.body}`, asOf: a.date || ANCHOR_DATE }));
      c.marketing.forEach((m) => idx.push({ group: "Competitors", tab: c.id, title: `${c.name}: ${m.title}`, meta: "Marketing", text: `${m.title} ${m.body}`, asOf: m.date }));
    });
    NEW_ENTRANTS.forEach((e) => idx.push({ group: "New Market Entrants", tab: "entrants", title: e.name, meta: e.backing, text: `${e.name} ${e.tagline} ${e.description}`, asOf: e.date }));
    WEBINARS.forEach((w) => idx.push({ group: "Webinars", tab: "webinars", title: w.title, meta: `${w.host} · ${fmt(w.date, { month: "short", day: "numeric" })}`, text: `${w.title} ${w.description} ${w.host}`, asOf: w.date }));
    return idx;
  }

  function wireSearch() {
    const index = buildSearchIndex();
    const input = document.getElementById("global-search");
    const resultsBox = document.getElementById("search-results");
    const clearBtn = document.getElementById("search-clear-btn");

    function runSearch() {
      clearBtn.classList.toggle("hidden", input.value.length === 0);
      const q = input.value.trim().toLowerCase();
      if (!q) { resultsBox.classList.add("hidden"); resultsBox.innerHTML = ""; return; }
      const matches = index.filter((item) => item.text.toLowerCase().includes(q)).slice(0, 40);

      if (!matches.length) {
        resultsBox.innerHTML = `<div class="search-empty">No results for "${escapeHtml(input.value)}"</div>`;
        resultsBox.classList.remove("hidden");
        return;
      }
      const groups = {};
      matches.forEach((m) => { (groups[m.group] = groups[m.group] || []).push(m); });

      let html = "";
      Object.keys(groups).forEach((g) => {
        html += `<div class="search-result-group-label">${escapeHtml(g)}</div>`;
        groups[g].slice(0, 6).forEach((m) => {
          html += `<button type="button" class="search-result-item" data-tab="${m.tab}" data-asof="${m.asOf}">
            <span class="sr-title">${escapeHtml(m.title)}</span>
            <span class="sr-meta">${escapeHtml(m.meta)}</span>
          </button>`;
        });
      });
      resultsBox.innerHTML = html;
      resultsBox.classList.remove("hidden");

      resultsBox.querySelectorAll(".search-result-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.asof) state.asOf = clamp(btn.dataset.asof);
          switchTab(btn.dataset.tab);
          resultsBox.classList.add("hidden");
          input.value = "";
        });
      });
    }

    input.addEventListener("input", runSearch);
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { resultsBox.classList.add("hidden"); input.blur(); } });
    clearBtn.addEventListener("click", () => {
      input.value = "";
      runSearch();
      input.focus();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".sidebar-search")) resultsBox.classList.add("hidden"); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* ================= INIT ================= */
  async function loadFeatureData() {
    try {
      const res = await fetch(FEATURE_DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      FEATURE_ROWS = json.FEATURE_ROWS || [];
      FEATURE_REVIEWS = json.FEATURE_REVIEWS || {};
      DEFAULT_COMPARISON_COMPANY_IDS = json.DEFAULT_COMPARISON_COMPANY_IDS || ["patlytics"];
      PATLYTICS_PSEUDO_COMPANY = json.PATLYTICS_PSEUDO_COMPANY || PATLYTICS_PSEUDO_COMPANY;
    } catch (e) {
      // Non-fatal: the rest of the dashboard still works, the Feature
      // Comparison tab just renders empty until this file is reachable.
      console.error("Could not load feature-data.json:", e);
      DEFAULT_COMPARISON_COMPANY_IDS = ["patlytics"];
    }
    state.fc.companyIds = [...DEFAULT_COMPARISON_COMPANY_IDS];
  }

  async function init() {
    await loadFeatureData();
    renderSidebar();
    wireTopbarControls();
    wireSearch();
    document.getElementById("logo-home-btn").addEventListener("click", () => switchTab("home"));
    switchTab("home");
  }

  document.addEventListener("DOMContentLoaded", init);
})();

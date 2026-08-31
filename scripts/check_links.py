#!/usr/bin/env python3
"""
Sweep every http(s) URL referenced in js/data.js and report which ones are
dead, so the daily research routine can fix or replace them before committing.

Usage: python3 scripts/check_links.py

Classifies each URL as:
  OK        - resolved with a 2xx/3xx status (redirects followed).
  AMBIGUOUS - 401/403/429 -- often a site blocking automated requests rather
              than proof the page is actually gone. Needs a judgment call
              (e.g. a WebSearch cross-check for an exact URL/title match)
              before deciding whether to replace it -- do not auto-remove
              on this status alone.
  BROKEN    - 404, another clear 4xx/5xx, DNS failure, connection error, or
              timeout. Must be fixed before committing: find the real URL,
              or fall back to that company's confirmed-live general page.

Uses `curl` (via subprocess) rather than Python's own HTTP stack: some sites'
bot-protection/WAF rejects Python's urllib TLS fingerprint outright (a false
"broken" verdict for a page that loads fine in curl or a real browser) --
confirmed against anaqua.com while building this script. curl's TLS/HTTP
behavior is what Patty's own research agents already rely on elsewhere, so
this keeps the check consistent with what actually works in that environment.

Known limitations:
- linkedin.com returns a blanket 404 to any non-browser client regardless of
  whether the page is real (confirmed against a known-valid company page),
  so LinkedIn URLs are skipped rather than risk a false "broken" verdict.
- This only checks HTTP status codes, not page content, so it cannot catch
  a "soft" dead link that returns 200 but silently redirects to an unrelated
  generic page (some ATS/job boards do this once a posting closes). It
  reliably catches hard failures (404s, DNS errors, timeouts), which covers
  the vast majority of link rot -- but isn't a total content guarantee.
"""
import re
import subprocess
import sys

DATA_JS = "js/data.js"
TIMEOUT = 12
USER_AGENT = "Mozilla/5.0 (compatible; PatlyticsLinkCheck/1.0)"


def extract_urls(text):
    candidates = re.findall(r'https?://[^\s"\'\\`]+', text)
    # skip JS template-literal placeholders like `https://${domain}` -- not real URLs
    return sorted({u for u in candidates if "${" not in u})


def check(url):
    """Return (status_code_or_None, error_message_or_None) using curl."""
    try:
        result = subprocess.run(
            [
                "curl", "-sS", "-o", "/dev/null", "-L",
                "-w", "%{http_code}",
                "--max-time", str(TIMEOUT),
                "-A", USER_AGENT,
                url,
            ],
            capture_output=True, text=True, timeout=TIMEOUT + 5,
        )
    except subprocess.TimeoutExpired:
        return None, "curl timed out"

    code = result.stdout.strip()
    if not code or not code.isdigit():
        err = result.stderr.strip() or "curl returned no status code"
        return None, err
    return int(code), None


def classify(status, err):
    if err:
        return "BROKEN", err
    if status in (401, 403, 429):
        return "AMBIGUOUS", f"HTTP {status}"
    if 200 <= status < 400:
        return "OK", f"HTTP {status}"
    return "BROKEN", f"HTTP {status}"


def is_unreliable_to_check(url):
    return "linkedin.com/" in url


def main():
    text = open(DATA_JS, encoding="utf-8").read()
    urls = extract_urls(text)
    ok, ambiguous, broken, skipped = [], [], [], []
    for u in urls:
        if is_unreliable_to_check(u):
            skipped.append((u, "linkedin.com blocks automated requests; not checked"))
            continue
        status, err = check(u)
        verdict, detail = classify(status, err)
        (ok if verdict == "OK" else ambiguous if verdict == "AMBIGUOUS" else broken).append((u, detail))

    print(f"Checked {len(urls) - len(skipped)} URLs ({len(skipped)} LinkedIn URLs skipped, unreliable to check): "
          f"{len(ok)} OK, {len(ambiguous)} ambiguous, {len(broken)} broken\n")

    if ambiguous:
        print("AMBIGUOUS -- likely bot-blocked, not necessarily dead. Cross-check via WebSearch")
        print("for an exact URL/title match before deciding; do not auto-remove on this alone:")
        for u, d in ambiguous:
            print(f"  [{d}] {u}")
        print()

    if broken:
        print("BROKEN -- must fix before committing (find the real URL, or fall back to that")
        print("company's confirmed-live general careers/source page):")
        for u, d in broken:
            print(f"  [{d}] {u}")
        print()
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()

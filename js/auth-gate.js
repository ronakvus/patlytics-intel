/* ============================================================
   Employee access gate — CLIENT-SIDE ONLY.
   This is a deterrent for casual visitors, not real access control:
   every file in this project (including js/data.js) is still a plain
   static file served to anyone who requests it directly — this gate
   cannot stop that. Real access control would require server-side
   auth (e.g. Cloudflare Access) in front of the host.
   ============================================================ */
(function () {
  "use strict";

  const PASSWORD = "Patlytics2026!";
  const STORAGE_KEY = "patlytics_intel_unlocked";

  const gate = document.getElementById("auth-gate");
  const appShell = document.getElementById("app-shell");
  const form = document.getElementById("auth-gate-form");
  const input = document.getElementById("auth-gate-input");
  const error = document.getElementById("auth-gate-error");

  function unlock() {
    sessionStorage.setItem(STORAGE_KEY, "true");
    gate.classList.add("hidden");
    appShell.removeAttribute("aria-hidden");
  }

  if (sessionStorage.getItem(STORAGE_KEY) === "true") {
    unlock();
  } else {
    appShell.setAttribute("aria-hidden", "true");
    input.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === PASSWORD) {
      error.textContent = "";
      unlock();
    } else {
      error.textContent = "Incorrect password. Try again.";
      input.value = "";
      input.focus();
    }
  });
})();

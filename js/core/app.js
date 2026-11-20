/* ==========================================================
   app.js  (owner: Person 1)

   Runs once the page has loaded. Two jobs:
     1. Navigation: show one "view" (dashboard or a module) at a time.
     2. Startup: call init() on every module that registered itself.
   ========================================================== */
(function () {

  // The five modules, in sidebar order.
  const MODULE_IDS = ["generator", "operations", "evenodd", "periodicity", "convolution"];

  /* ---------------------------------------------------------
     showView(viewId)
     Makes ONE section visible and highlights its nav button.
     viewId is "home" or one of MODULE_IDS.
     --------------------------------------------------------- */
  function showView(viewId) {
    const validIds = ["home"].concat(MODULE_IDS);
    if (validIds.indexOf(viewId) === -1) { viewId = "home"; }   // unknown name -> dashboard

    // Show only the chosen section
    document.querySelectorAll(".view").forEach(function (section) {
      section.classList.toggle("is-active", section.id === "view-" + viewId);
    });

    // Highlight the matching sidebar button
    document.querySelectorAll(".nav-btn").forEach(function (button) {
      const isActive = button.dataset.view === viewId;
      button.classList.toggle("is-active", isActive);
      if (isActive) { button.setAttribute("aria-current", "page"); }
      else          { button.removeAttribute("aria-current"); }
    });

    window.scrollTo(0, 0);

    // Plots drawn while hidden need a resize once they become visible
    SignalLab.plot.resizePlotsIn("view-" + viewId);
  }

  /* Reads the page address (#generator) and shows that view. */
  function showViewFromAddress() {
    showView(window.location.hash.replace("#", ""));
  }

  /* ---------------------------------------------------------
     setUpNavigation()
     Every element with data-view="..." (sidebar buttons AND the
     dashboard cards) changes the address to #name. The change
     triggers showViewFromAddress, so the back button and page
     refresh also work.
     --------------------------------------------------------- */
  function setUpNavigation() {
    document.querySelectorAll("[data-view]").forEach(function (element) {
      element.addEventListener("click", function () {
        window.location.hash = element.dataset.view;
      });
    });
    window.addEventListener("hashchange", showViewFromAddress);
  }

  /* ---------------------------------------------------------
     startModules()
     Calls SignalLab.modules.<name>.init() for each module.
     Each call is wrapped in try/catch so one broken module
     cannot stop the others. Returns a list of results that the
     system check on the dashboard displays.
     --------------------------------------------------------- */
  function startModules() {
    const results = [];
    MODULE_IDS.forEach(function (id) {
      const module = SignalLab.modules[id];
      if (!module || typeof module.init !== "function") {
        results.push({ id: id, ok: false, message: "not registered" });
        return;
      }
      try {
        module.init();
        results.push({ id: id, ok: true, message: "started" });
      } catch (error) {
        console.error("Module '" + id + "' failed to start:", error);
        results.push({ id: id, ok: false, message: error.message });
      }
    });
    return results;
  }

  /* Fills the "System check" list on the dashboard. */
  function showSystemCheck(moduleResults) {
    const list = document.getElementById("status-list");
    const rows = [];

    rows.push({ ok: typeof Plotly !== "undefined",
                text: typeof Plotly !== "undefined"
                      ? "Plotly loaded (version " + Plotly.version + ")"
                      : "Plotly NOT loaded. Check your internet connection." });

    rows.push({ ok: typeof SignalLab.signals.sine === "function",
                text: "Core signal functions available" });

    moduleResults.forEach(function (r) {
      rows.push({ ok: r.ok, text: "Module '" + r.id + "': " + r.message });
    });

    list.innerHTML = "";
    rows.forEach(function (row) {
      const item = document.createElement("li");
      item.innerHTML = '<span class="' + (row.ok ? "status-ok" : "status-fail") + '">' +
                       (row.ok ? "✔" : "✘") + "</span><span></span>";
      item.lastChild.textContent = row.text;      // textContent keeps text safe
      list.appendChild(item);
    });
  }

  /* ---------- Startup ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    setUpNavigation();
    const results = startModules();
    showSystemCheck(results);
    showViewFromAddress();
  });

})();

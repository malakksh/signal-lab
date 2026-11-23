(function () {
  const MODULE_IDS = ["generator", "operations", "evenodd", "periodicity", "convolution"];
  function showView(viewId) {
    const validIds = ["home"].concat(MODULE_IDS);
    if (validIds.indexOf(viewId) === -1) { viewId = "home"; }   // unknown name -> dashboard
    document.querySelectorAll(".view").forEach(function (section) {
      section.classList.toggle("is-active", section.id === "view-" + viewId);
    });
    document.querySelectorAll(".nav-btn").forEach(function (button) {
      const isActive = button.dataset.view === viewId;
      button.classList.toggle("is-active", isActive);
      if (isActive) { button.setAttribute("aria-current", "page"); }
      else          { button.removeAttribute("aria-current"); }
    });

    window.scrollTo(0, 0);
    SignalLab.plot.resizePlotsIn("view-" + viewId);
  }
  function showViewFromAddress() {
    showView(window.location.hash.replace("#", ""));
  }
  function setUpNavigation() {
    document.querySelectorAll("[data-view]").forEach(function (element) {
      element.addEventListener("click", function () {
        window.location.hash = element.dataset.view;
      });
    });
    window.addEventListener("hashchange", showViewFromAddress);
  }
  function startModules() {
    MODULE_IDS.forEach(function (id) {
      const module = SignalLab.modules[id];
      if (!module || typeof module.init !== "function") {
        console.error("Module '" + id + "' is not registered.");
        return;
      }
      try {
        module.init();
      } catch (error) {
        console.error("Module '" + id + "' failed to start:", error);
      }
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    setUpNavigation();
    startModules();
    showViewFromAddress();
  });

})();

// function bettnafez 3alatol 
(function () {
  // h-access elmodules b loop 
  const MODULE_IDS = ["generator", "operations", "evenodd", "periodicity", "convolution"];
  
  // betthakem eh elview elyezhar w eh yekhtefy
  // elparameter viewId dah esm elview el3ayzen ne3redha
  function showView(viewId) {

    // validIds array feha elviewa elmasmoh ne3redha 
    // concat deh betdmeg arrays ma3 ba3d fa hena dakhalt home 3ala elarray beta3et MODULE_IDS
    const validIds = ["home"].concat(MODULE_IDS);
    // .indexOf() deh betraga3 elindex beta3 elelement elbadawar 3aleh law msh mawgod htraga3 -1
    // law had garab yedkhol b url 3ala page msh mawgoda yeraga3o llhome
    if (validIds.indexOf(viewId) === -1) { viewId = "home"; }  

    // querySelectorAll() --> hatgeb kol el3anaser elleha class view
    // forEach() --> ha3ady 3ala kol el3anaser w anafez 3aleha elfunction
    // section parameter bymasel elview elbent3amel ma3ah
    document.querySelectorAll(".view").forEach(function (section) {
      // .classList --> bazawed aw ashel classes mn elelements 
      // toggle("class name" , condition) , law elcondition true haydef elclass law false hayshel elclass
      section.classList.toggle("is-active", section.id === "view-" + viewId);
    });

    document.querySelectorAll(".nav-btn").forEach(function (button) {

      const isActive = button.dataset.view === viewId;
      button.classList.toggle("is-active", isActive);
      // setAttribute() --> add attr aria-current attr and its value is page
      if (isActive) { button.setAttribute("aria-current", "page"); }
      // removeAttribute() --> delete aria-current attr
      else          { button.removeAttribute("aria-current"); }
    });

    // scrollTo(x,y) --> x=0 --> no horizontal scroll , y=0 --> at the beginning of the page
    // lma aghayar mn view l view elpage terga3 mn elawel tany fo2 
    window.scrollTo(0, 0);
    SignalLab.plot.resizePlotsIn("view-" + viewId);
  }
  // function bethaded elview elmatloba 3ala hasab elurl
  function showViewFromAddress() {
    // window.location --> mas2ola 3an el url elzaher dlwa2ty
    // https://.....com/#generator --> url
    // window.location.hash --> #generator
    showView(window.location.hash.replace("#", ""));
  }

  // betkhaly elbuttons el3andaha data view ttna2el ben elviews
  function setUpNavigation() {
    // [data-view]-->hatgeb ay element 3ando attr data-view
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
      // law module = null aw undefined yeb2a !module --> true law elmodule mawgod yeb2a false
      // typeof module.init hatdkhol gowa elmodule teshof el init deh function wala la law msh function kda elshart hayraga3 true
      // law elmodule msh mawgod aw elmodule mawgod bas mafesh function init haynafez el if
      if (!module || typeof module.init !== "function") {
        console.error("Module '" + id + "' is not registered.");
        return;
      }
      // el try benhot feha elcode elmomkn yehsal feh error
      try {
        module.init();
      } 
      // law gowa eltry hasal error elcatch hatt3amel ma3ah
      catch (error) {
        console.error("Module '" + id + "' failed to start:", error);
      }
    });
  }
  // DOMContentLoaded-->event byhsal lma kol elhtml elements tethamel w tekon mawgoda fa js te2dar tet3amel ma3aha
  document.addEventListener("DOMContentLoaded", function () {
    setUpNavigation();
    startModules();
    showViewFromAddress();
  });

})();

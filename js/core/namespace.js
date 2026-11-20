/* ==========================================================
   namespace.js  (owner: Person 1)

   WHY THIS FILE EXISTS
   Our scripts are plain <script> tags (no import/export), so they
   can't see each other's variables by default. To share code we
   put everything inside ONE global object called SignalLab.

   Think of SignalLab as a toolbox that every file adds tools to:
     SignalLab.signals   -> signal formulas (signals.js)
     SignalLab.plot      -> plotting helpers (plotHelpers.js)
     SignalLab.modules   -> one entry per module (each *.ui.js)
   ========================================================== */

window.SignalLab = {
  signals: {},   // filled by signals.js
  plot: {},      // filled by plotHelpers.js
  modules: {},   // each module registers itself here
  math: {}       // each module's *.math.js adds its pure math functions here
};

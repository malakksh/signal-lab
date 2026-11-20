/* ==========================================================
   convolution.ui.js  (Person 6)
   Convolution Simulator: USER INTERFACE.
   Reads the controls, calls convolution.math.js for EVERY number, and draws.

   Containers (from index.html):
     #convolution-controls       the inputs (built here)
     #convolution-readout        mode banner, key numbers, notes
     #convolution-plot-x         x(t) or x[n]
     #convolution-plot-h         h(t) or h[n]
     #convolution-plot-y         the result y, with the current position marked
     #convolution-step-controls  slider that moves the flipped signal along
     #convolution-plot-slide     x and the flipped, shifted h
     #convolution-plot-product   their product (the area or sum is y)
     #convolution-steps          the four steps with the current numbers
     #convolution-table          calculation tables
     #convolution-explain        the plain-language explanation (built here)

   TWO MODES
     Continuous-time: lines, y(t) = integral of x(tau) h(t - tau) d tau  (approximate)
     Discrete-time:   stems START, y[n] = sum of x[k] h[n - k]           (exact)
   ========================================================== */
(function () {

  function math() { return SignalLab.math.convolution; }
  const COLORS = SignalLab.plot.COLORS;
  const DIM_MAGENTA = "rgba(232, 121, 249, 0.35)";       // the original h, before flipping
  const PLOT_HEIGHT = 250;
  const PLOT_IDS = ["convolution-plot-x", "convolution-plot-h", "convolution-plot-y",
                    "convolution-plot-slide", "convolution-plot-product"];

  // Every input has the id "cv-c-" + name (continuous) or "cv-d-" + name (discrete)
  const C_FIELDS = ["xType", "xAmplitude", "xFrequency", "xStart", "xEnd",
                    "hType", "hAmplitude", "hFrequency", "hStart", "hEnd", "step"];
  const D_FIELDS = ["xValues", "xStart", "hValues", "hStart"];

  // What is on screen right now: the calculated model and the slider position
  const state = { model: null, index: 0 };

  function $(id) { return document.getElementById(id); }

  function currentMode() {
    return document.querySelector('input[name="cv-mode"]:checked').value;
  }

  function fieldId(mode, key) {
    return "cv-" + (mode === "continuous" ? "c" : "d") + "-" + key;
  }

  /* Shows at most 6 significant digits: 0.30000000000000004 -> 0.3.
     Rounding noise such as 8.5e-18 (a true 0) is shown as 0. */
  function formatNumber(value) {
    if (Math.abs(value) < 1e-12) { return "0"; }
    return String(Number(value.toPrecision(6)) + 0);
  }

  /* Negative numbers get brackets inside products: 2·(−1) */
  function bracketed(value) {
    const text = formatNumber(value).replace("-", "−");
    return value < 0 ? "(" + text + ")" : text;
  }

  function minus(text) { return text.replace(/-/g, "−"); }

  /* A vertical range that is symmetric around 0 and a bit bigger than the data
     (headroom 1.15 = 15% extra; the result plots use more, to leave room for labels). */
  function symmetricRange(arrays, headroom) {
    let largest = 0;
    arrays.forEach(function (values) {
      values.forEach(function (v) { largest = Math.max(largest, Math.abs(v)); });
    });
    const limit = largest < 1e-9 ? 1 : largest * (headroom || 1.15);
    return [-limit, limit];
  }

  /* =========================================================
     1. BUILDING THE CONTROLS
     ========================================================= */

  /* One input with a label, an optional hint, and a spot for its error message. */
  function fieldHtml(id, label, value, options) {
    options = options || {};
    const attributes = options.text ? ' autocomplete="off" spellcheck="false"' : ' step="' + (options.step || "any") + '"';
    return '<div class="field" id="' + id + '-field">' +
             '<label id="' + id + '-label" for="' + id + '">' + label + '</label>' +
             '<input type="' + (options.text ? "text" : "number") + '" id="' + id + '"' + attributes + ' value="' + value + '">' +
             (options.hint ? '<p class="field-hint">' + options.hint + '</p>' : '') +
             '<p class="field-error" id="' + id + '-error" role="alert"></p>' +
           '</div>';
  }

  function typeSelectHtml(id, selected) {
    const names = { sine: "Sine wave", cosine: "Cosine wave", square: "Square wave", pulse: "Rectangular pulse" };
    let options = "";
    Object.keys(names).forEach(function (type) {
      options += '<option value="' + type + '"' + (type === selected ? " selected" : "") + '>' + names[type] + '</option>';
    });
    return '<div class="field">' +
             '<label for="' + id + '">Signal type</label>' +
             '<select id="' + id + '">' + options + '</select>' +
             '<p class="field-error" id="' + id + '-error" role="alert"></p>' +
           '</div>';
  }

  /* The five controls of one continuous signal. prefix is "x" or "h". */
  function continuousSignalHtml(prefix, title, defaults) {
    const id = function (key) { return "cv-c-" + prefix + key; };
    return '<div class="control-group">' +
             '<h4>' + title + '</h4>' +
             typeSelectHtml(id("Type"), defaults.type) +
             '<div class="field-pair">' +
               fieldHtml(id("Amplitude"), "Amplitude (A)", defaults.amplitude) +
               fieldHtml(id("Frequency"), "Frequency (Hz)", defaults.frequency) +
             '</div>' +
             '<div class="field-pair">' +
               fieldHtml(id("Start"), "Start time (s)", defaults.start) +
               fieldHtml(id("End"), "End time (s)", defaults.end) +
             '</div>' +
           '</div>';
  }

  function discreteSignalHtml(prefix, title, values, start) {
    return '<div class="control-group">' +
             '<h4>' + title + '</h4>' +
             fieldHtml("cv-d-" + prefix + "Values", "Values (separated by commas)", values,
                       { text: true, hint: prefix === "x" ? "Up to 20 values. Fractions such as 1/3 are allowed." : "" }) +
             fieldHtml("cv-d-" + prefix + "Start", "Starts at n =", start, { step: "1" }) +
           '</div>';
  }

  function presetsHtml(mode) {
    const list = mode === "continuous" ? math().CONTINUOUS_PRESETS : math().DISCRETE_PRESETS;
    return '<div class="field">' +
             '<span class="field-label">Examples (click to load)</span>' +
             '<div class="btn-row">' +
               list.map(function (p) { return '<button type="button" class="btn btn-small" data-preset="' + p.id + '">' + p.label + '</button>'; }).join("") +
             '</div>' +
           '</div>';
  }

  function buildControls() {
    $("convolution-controls").innerHTML =
      '<div class="field">' +
        '<span class="field-label" id="cv-mode-label">Convolution mode</span>' +
        '<div class="segmented" role="radiogroup" aria-labelledby="cv-mode-label">' +
          '<input type="radio" name="cv-mode" id="cv-mode-continuous" value="continuous" checked>' +
          '<label for="cv-mode-continuous">Continuous-Time Convolution</label>' +
          '<input type="radio" name="cv-mode" id="cv-mode-discrete" value="discrete">' +
          '<label for="cv-mode-discrete">Discrete-Time Convolution</label>' +
        '</div>' +
      '</div>' +

      '<div id="cv-panel-continuous" data-mode="continuous">' +
        presetsHtml("continuous") +
        continuousSignalHtml("x", "Signal x(t)", { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 1 }) +
        continuousSignalHtml("h", "Signal h(t)", { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 1 }) +
        '<div class="control-group">' +
          '<h4>Numerical integration</h4>' +
          fieldHtml("cv-c-step", "Step size Δτ (s)", 0.02,
                    { hint: "Smaller steps are more accurate but slower. Each y(t) is a sum of trapezoids this wide." }) +
        '</div>' +
      '</div>' +

      '<div id="cv-panel-discrete" data-mode="discrete" hidden>' +
        presetsHtml("discrete") +
        discreteSignalHtml("x", "Signal x[n]", "1, 2, 3, 4", 0) +
        discreteSignalHtml("h", "Signal h[n]", "1, 1, 1", 0) +
      '</div>';
  }

  function buildStepControls() {
    $("convolution-step-controls").innerHTML =
      '<div class="step-position" id="cv-step-position" aria-live="polite"></div>' +
      '<div class="step-slider-row">' +
        '<button type="button" class="btn btn-small" id="cv-step-prev" aria-label="Previous position">◀</button>' +
        '<input type="range" id="cv-step-slider" min="0" max="1" step="1" value="0" aria-label="Position of the flipped signal">' +
        '<button type="button" class="btn btn-small" id="cv-step-next" aria-label="Next position">▶</button>' +
      '</div>' +
      '<p class="field-hint" id="cv-step-hint"></p>';
  }

  /* =========================================================
     2. READING AND SHOWING THE CONTROLS
     ========================================================= */

  function readInputs(mode) {
    const raw = {};
    (mode === "continuous" ? C_FIELDS : D_FIELDS).forEach(function (key) {
      raw[key] = $(fieldId(mode, key)).value;
    });
    return raw;
  }

  function showFieldErrors(mode, errors) {
    (mode === "continuous" ? C_FIELDS : D_FIELDS).forEach(function (key) {
      const id = fieldId(mode, key);
      const message = errors[key] || "";
      $(id + "-error").textContent = message;
      $(id).classList.toggle("is-invalid", message !== "");
      $(id).setAttribute("aria-invalid", message !== "" ? "true" : "false");
    });
  }

  /* A pulse has no frequency, so hide that box (and call A "height"). */
  function updateFrequencyVisibility() {
    ["x", "h"].forEach(function (prefix) {
      const isPulse = $("cv-c-" + prefix + "Type").value === "pulse";
      $("cv-c-" + prefix + "Frequency-field").hidden = isPulse;
      $("cv-c-" + prefix + "Amplitude-label").textContent = isPulse ? "Height (A)" : "Amplitude (A)";
    });
  }

  /* Fills the boxes from an example, then redraws. */
  function applyPreset(mode, id) {
    const list = mode === "continuous" ? math().CONTINUOUS_PRESETS : math().DISCRETE_PRESETS;
    const preset = list.filter(function (p) { return p.id === id; })[0];
    if (!preset) { return; }
    if (mode === "continuous") {
      ["x", "h"].forEach(function (prefix) {
        const s = preset[prefix];
        $("cv-c-" + prefix + "Type").value = s.type;
        $("cv-c-" + prefix + "Amplitude").value = s.amplitude;
        $("cv-c-" + prefix + "Frequency").value = s.frequency;
        $("cv-c-" + prefix + "Start").value = s.start;
        $("cv-c-" + prefix + "End").value = s.end;
      });
      $("cv-c-step").value = preset.step;
      updateFrequencyVisibility();
    } else {
      ["x", "h"].forEach(function (prefix) {
        $("cv-d-" + prefix + "Values").value = preset[prefix].values;
        $("cv-d-" + prefix + "Start").value = preset[prefix].start;
      });
    }
  }

  /* =========================================================
     3. MODE BANNER, READOUT AND EXPLANATION
     ========================================================= */

  function showModeUI(mode) {
    $("cv-panel-continuous").hidden = mode !== "continuous";
    $("cv-panel-discrete").hidden = mode !== "discrete";

    const isContinuous = mode === "continuous";
    const banner = $("cv-banner");
    banner.className = "mode-banner " + (isContinuous ? "is-continuous" : "is-discrete");
    banner.innerHTML =
      '<div class="mode-banner-title">' + (isContinuous ? "Continuous-time convolution" : "Discrete-time convolution") + '</div>' +
      '<span class="formula formula-block">' + (isContinuous ? "y(t) = ∫ x(τ) h(t − τ) dτ" : "y[n] = Σ x[k] h[n − k]") + '</span>' +
      '<div class="mode-banner-note">' + (isContinuous
        ? "A numerical approximation (trapezoidal rule). Signals are drawn as lines."
        : "Exact finite sums. Signals are drawn as stems, one per sample.") + '</div>';

    // Continuous convolution INTEGRATES; discrete convolution SUMS
    $("convolution-step-title").textContent = isContinuous
      ? "Step by step: flip, shift, multiply, integrate"
      : "Step by step: flip, shift, multiply, sum";

    $("cv-step-hint").textContent = isContinuous
      ? "Drag the slider (or use ◀ ▶) to slide the flipped h(t − τ) across x(τ). The area under the product is y(t), marked in the result plot."
      : "Drag the slider (or use ◀ ▶) to choose the output sample n. The sum of the products is y[n], marked in the result plot.";
    $("convolution-explain").innerHTML = explanationFor(mode);
  }

  /* An area this close to 0 is 0 (for example a whole sine cycle). */
  function cleanArea(value) {
    return Math.abs(value) < 1e-9 ? 0 : value;
  }

  function noteHtml(text) {
    return '<div class="message message-warning">' + text + '</div>';
  }

  function statHtml(label, value) {
    return '<div class="stat"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div>';
  }

  function formulaLine(text) {
    return '<span class="formula formula-block">' + text + '</span>';
  }

  /* "x(t) = 1·sin(2π·1·t) for 0 ≤ t ≤ 1, else 0" */
  function describeContinuous(name, spec) {
    const A = minus(formatNumber(spec.amplitude));
    let body;
    if (spec.type === "pulse") { body = A; }
    else {
      const angle = "2π·" + formatNumber(spec.frequency) + "·t";
      body = spec.type === "sine" ? A + "·sin(" + angle + ")"
           : spec.type === "cosine" ? A + "·cos(" + angle + ")"
           : A + "·sign(sin(" + angle + "))";
    }
    return name + "(t) = " + body + "  for " + minus(formatNumber(spec.start)) + " ≤ t ≤ " + minus(formatNumber(spec.end)) + ", else 0";
  }

  /* "x[n]: 1, 2, 3 at n = 0 … 2" */
  function describeDiscrete(name, sequence) {
    const end = math().getSequenceEnd(sequence);
    return name + "[n]: " + sequence.values.map(function (v) { return minus(formatNumber(v)); }).join(", ") +
           "   at n = " + (sequence.values.length === 1 ? sequence.start : sequence.start + " … " + end);
  }

  function showReadout(model) {
    let html = "";
    if (model.mode === "continuous") {
      html += formulaLine(describeContinuous("x", model.x));
      html += formulaLine(describeContinuous("h", model.h));
      html += '<div class="stat-grid">' +
        statHtml("y(t) is nonzero for", minus(formatNumber(model.windows.outputStart)) + " ≤ t ≤ " + minus(formatNumber(model.windows.outputEnd))) +
        statHtml("Step size Δτ", formatNumber(model.step) + " s") +
        statHtml("Output points", model.result.t.length) +
        statHtml("Most trapezoids per y(t)", model.result.maxIntervals) +
        statHtml("Area check", "∫y = " + minus(formatNumber(cleanArea(model.areaCheck.areaY))) + ", ∫x·∫h = " + minus(formatNumber(cleanArea(model.areaCheck.areaXTimesH)))) +
        '</div>';
      html += noteHtml("<strong>Numerical approximation.</strong> y(t) is calculated with the trapezoidal rule (step " + formatNumber(model.step) +
                       "), not solved exactly. A smaller step gives a more accurate result.");
      model.warnings.forEach(function (w) { html += noteHtml(w); });
      if (model.areaCheck.relativeDifference > 0.01) {
        html += noteHtml("The area check differs by " + (model.areaCheck.relativeDifference * 100).toFixed(1) + "%. Try a smaller step size.");
      }
    } else {
      html += formulaLine(describeDiscrete("x", model.x));
      html += formulaLine(describeDiscrete("h", model.h));
      const shape = model.shape;
      html += '<div class="stat-grid">' +
        statHtml("N (length of x)", model.x.values.length) +
        statHtml("M (length of h)", model.h.values.length) +
        statHtml("Output length N + M − 1", shape.expectedLength + (shape.ok ? " ✔" : " ✘ (got " + shape.length + ")")) +
        statHtml("Output indices", "n = " + shape.start + " … " + shape.end) +
        statHtml("Sum check Σy = Σx·Σh", minus(formatNumber(model.sums.y)) + " = " + minus(formatNumber(model.sums.x)) + " × " + minus(formatNumber(model.sums.h))) +
        '</div>';
      html += noteHtml("<strong>Exact.</strong> Discrete convolution is a finite sum, so these values are exact (apart from the tiny rounding every computer does with decimals).");
    }
    $("cv-readout-body").innerHTML = html;
  }

  function showErrorSummary() {
    $("cv-readout-body").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plots below still show your last valid result.</div>';
  }

  /* =========================================================
     4. BUILDING THE MODEL (calls the math, keeps the results)
     ========================================================= */

  function buildContinuousModel(values) {
    const result = math().convolveContinuous(values.x, values.h, values.step);
    const windows = math().getContinuousWindows(values.x, values.h);
    const model = {
      mode: "continuous", x: values.x, h: values.h, step: values.step,
      result: result, windows: windows,
      warnings: math().getContinuousWarnings(values.x, values.h, values.step),
      areaCheck: math().getAreaCheck(values.x, values.h, result),
      count: result.t.length,
      peakIndex: math().findPeakIndex(result.y)
    };
    const ampX = Math.abs(values.x.amplitude);
    const ampH = Math.abs(values.h.amplitude);
    model.slideRange = symmetricRange([[ampX, ampH]]);               // x and h share a vertical range
    model.productRange = symmetricRange([[ampX * ampH]]);
    model.yRange = symmetricRange([result.y], 1.35);
    return model;
  }

  function buildDiscreteModel(values) {
    const y = math().convolveDiscrete(values.x, values.h);
    const sum = function (s) { return s.values.reduce(function (a, b) { return a + b; }, 0); };
    const maxAbs = function (s) { return Math.max.apply(null, s.values.map(Math.abs)); };
    const model = {
      mode: "discrete", x: values.x, h: values.h, y: y,
      windows: math().getDiscreteWindows(values.x, values.h),
      shape: math().checkOutputShape(values.x, values.h, y),
      sums: { x: sum(values.x), h: sum(values.h), y: sum(y) },
      count: y.values.length,
      peakIndex: math().findPeakIndex(y.values)
    };
    model.slideRange = symmetricRange([[maxAbs(values.x), maxAbs(values.h)]]);
    model.productRange = symmetricRange([[maxAbs(values.x) * maxAbs(values.h)]]);
    model.yRange = symmetricRange([y.values], 1.35);
    return model;
  }

  /* The whole recalculation: read -> check -> calculate -> draw */
  function recompute() {
    const mode = currentMode();
    showModeUI(mode);

    const raw = readInputs(mode);
    const validation = mode === "continuous" ? math().validateContinuousInputs(raw) : math().validateDiscreteInputs(raw);
    showFieldErrors(mode, validation.errors);

    if (!validation.ok) {
      if (state.model && state.model.mode !== mode) { clearEverything(); }   // never show the OTHER mode's plots
      showErrorSummary();
      return;
    }

    let model;
    try {
      model = mode === "continuous" ? buildContinuousModel(validation.values) : buildDiscreteModel(validation.values);
    } catch (error) {
      clearEverything();
      $("cv-readout-body").innerHTML = '<div class="message message-error">' + error.message + '</div>';
      return;
    }

    state.model = model;
    state.index = model.peakIndex;                       // start where the overlap is most interesting
    const slider = $("cv-step-slider");
    slider.min = 0;
    slider.max = model.count - 1;
    showReadout(model);
    drawInputs(model);
    drawStep();
  }

  /* Empties the plots and the step panels. */
  function clearEverything() {
    state.model = null;
    PLOT_IDS.forEach(function (id) {
      if (typeof Plotly !== "undefined" && $(id).data) { Plotly.purge($(id)); }
    });
    $("convolution-steps").innerHTML = "";
    $("convolution-table").innerHTML = "";
    $("cv-step-position").textContent = "";
  }

  /* =========================================================
     5. DRAWING x AND h
     ========================================================= */

  function sequenceIndices(sequence) {
    const indices = [];
    for (let i = 0; i < sequence.values.length; i++) { indices.push(sequence.start + i); }
    return indices;
  }

  function drawInputs(model) {
    const range = model.windows.signals;
    if (model.mode === "continuous") {
      const xCurve = math().makeWindowedCurve(model.x, range[0], range[1]);
      const hCurve = math().makeWindowedCurve(model.h, range[0], range[1]);
      SignalLab.plot.plotContinuous("convolution-plot-x", [{ x: xCurve.t, y: xCurve.y, name: "x(t)", color: COLORS.cyan }],
        { title: "x(t)", xLabel: "t (s)", yLabel: "x(t)", height: PLOT_HEIGHT, xRange: range, yRange: symmetricRange([xCurve.y]) });
      SignalLab.plot.plotContinuous("convolution-plot-h", [{ x: hCurve.t, y: hCurve.y, name: "h(t)", color: COLORS.magenta }],
        { title: "h(t)", xLabel: "t (s)", yLabel: "h(t)", height: PLOT_HEIGHT, xRange: range, yRange: symmetricRange([hCurve.y]) });
    } else {
      const wide = range[1] - range[0] > 30;
      SignalLab.plot.plotStem("convolution-plot-x", [{ x: sequenceIndices(model.x), y: model.x.values, name: "x[n]", color: COLORS.cyan }],
        { title: "x[n]", xLabel: "n", yLabel: "x[n]", height: PLOT_HEIGHT, xRange: range, yRange: symmetricRange([model.x.values]), autoXTicks: wide });
      SignalLab.plot.plotStem("convolution-plot-h", [{ x: sequenceIndices(model.h), y: model.h.values, name: "h[n]", color: COLORS.magenta }],
        { title: "h[n]", xLabel: "n", yLabel: "h[n]", height: PLOT_HEIGHT, xRange: range, yRange: symmetricRange([model.h.values]), autoXTicks: wide });
    }
  }

  /* =========================================================
     6. THE STEP-BY-STEP VIEW (redrawn whenever the slider moves)
     ========================================================= */

  function drawStep() {
    const model = state.model;
    if (!model) { return; }
    $("cv-step-slider").value = state.index;
    $("cv-step-prev").disabled = state.index <= 0;
    $("cv-step-next").disabled = state.index >= model.count - 1;
    if (model.mode === "continuous") { drawContinuousStep(model); }
    else { drawDiscreteStep(model); }
  }

  /* A short arrow pointing at the current output value (no text, so it can
     never collide with the plot title; the words go in cornerAnnotation). */
  function markerAnnotation(x, y) {
    return { x: x, y: y, xref: "x", yref: "y", text: "", showarrow: true, arrowhead: 2, arrowcolor: "#ffffff",
             arrowwidth: 1.5, ax: 0, ay: y >= 0 ? -18 : 18 };
  }

  /* A box of text in the top right corner of a plot */
  function cornerAnnotation(text) {
    return { xref: "paper", yref: "paper", x: 0.99, y: 0.97, xanchor: "right", yanchor: "top", showarrow: false, text: text,
             font: { color: "#ffffff", size: 12 }, bgcolor: "rgba(10, 15, 31, 0.85)", borderpad: 4 };
  }

  /* The outline of the trapezoids (the shaded area under the product). */
  function trapezoidPath(integrand) {
    const n = integrand.tau.length;
    if (n < 2) { return null; }
    const f = function (v) { return v.toFixed(6); };
    const stride = Math.max(1, Math.ceil(n / 500));            // keep the drawing light
    let path = "M " + f(integrand.tau[0]) + ",0";
    for (let j = 0; j < n; j += stride) { path += " L " + f(integrand.tau[j]) + "," + f(integrand.product[j]); }
    if ((n - 1) % stride !== 0) { path += " L " + f(integrand.tau[n - 1]) + "," + f(integrand.product[n - 1]); }
    return path + " L " + f(integrand.tau[n - 1]) + ",0 Z";
  }

  function drawContinuousStep(model) {
    const t = model.result.t[state.index];
    const yValue = model.result.y[state.index];
    const integrand = math().getIntegrand(model.x, model.h, t, model.step);
    const slide = model.windows.slide;

    $("cv-step-position").textContent = "t = " + minus(formatNumber(t)) + " s    y(t) ≈ " + minus(formatNumber(yValue));

    // Result y(t), with the current position marked
    SignalLab.plot.plotContinuous("convolution-plot-y",
      [{ x: model.result.t, y: model.result.y, name: "y(t)", color: COLORS.amber }],
      { title: "Result y(t) (approximate)",
        xLabel: "t (s)", yLabel: "y(t)", height: PLOT_HEIGHT, xRange: model.windows.signals, yRange: model.yRange,
        shapes: [{ type: "line", xref: "x", yref: "y", x0: t, x1: t, y0: 0, y1: yValue, line: { color: "#ffffff", width: 1.5, dash: "dot" } }],
        annotations: [markerAnnotation(t, yValue), cornerAnnotation("t = " + minus(t.toFixed(2)) + ", y ≈ " + minus(formatNumber(yValue)))] });

    // Steps 1-2: x(tau), the original h(tau), and the flipped, shifted h(t - tau)
    const xCurve = math().makeWindowedCurve(model.x, slide[0], slide[1]);
    const hOriginal = math().makeWindowedCurve(model.h, slide[0], slide[1]);
    const hSliding = math().makeFlippedShiftedCurve(model.h, t, slide[0], slide[1]);
    SignalLab.plot.plotContinuous("convolution-plot-slide", [
      { x: xCurve.t, y: xCurve.y, name: "x(τ)", color: COLORS.cyan },
      { x: hOriginal.t, y: hOriginal.y, name: "h(τ) original", color: DIM_MAGENTA },
      { x: hSliding.t, y: hSliding.y, name: "h(t − τ) flipped and shifted", color: COLORS.magenta }
    ], {
      title: "Steps 1–2: flip h, then shift it to t = " + minus(t.toFixed(2)),
      xLabel: "τ (s)", yLabel: "value", height: PLOT_HEIGHT + 30, xRange: slide, yRange: model.slideRange,
      shapes: [{ type: "line", xref: "x", yref: "paper", x0: t, x1: t, y0: 0, y1: 1, line: { color: COLORS.magenta, width: 1, dash: "dot" } }],
      annotations: [{ x: t, y: 1, xref: "x", yref: "paper", text: "τ = t", showarrow: false, xanchor: "left", yanchor: "top", font: { color: COLORS.magenta, size: 11 } }]
    });

    // Steps 3-4: the product, with the trapezoids shaded
    const productCurve = math().makeProductCurve(model.x, model.h, t, slide[0], slide[1]);
    const path = trapezoidPath(integrand);
    SignalLab.plot.plotContinuous("convolution-plot-product",
      [{ x: productCurve.t, y: productCurve.y, name: "x(τ)·h(t − τ)", color: COLORS.green }],
      { title: "Steps 3–4: multiply, then integrate (shaded area ≈ y(t))",
        xLabel: "τ (s)", yLabel: "product", height: PLOT_HEIGHT, xRange: slide, yRange: model.productRange,
        shapes: path ? [{ type: "path", path: path, xref: "x", yref: "y", fillcolor: "rgba(52, 211, 153, 0.30)", line: { width: 0 } }] : [],
        annotations: [cornerAnnotation(integrand.intervals === 0 ? "no overlap: y(t) = 0"
                                                              : "area ≈ " + minus(formatNumber(integrand.value)) + " = y(t)")] });

    showContinuousSteps(model, t, integrand);
  }

  function showContinuousSteps(model, t, integrand) {
    const x = model.x;
    const h = model.h;
    const n = function (v) { return minus(formatNumber(v)); };

    const lines = [];
    lines.push(["Flip h(τ) to get h(−τ)", [
      "h(τ) is nonzero for " + n(h.start) + " ≤ τ ≤ " + n(h.end) + ".",
      "Mirroring it around τ = 0 gives h(−τ), nonzero for " + n(-h.end) + " ≤ τ ≤ " + n(-h.start) + "."]]);
    lines.push(["Shift it to get h(t − τ), here t = " + n(Number(t.toFixed(6))), [
      "h(t − τ) is nonzero for " + n(Number((t - h.end).toFixed(6))) + " ≤ τ ≤ " + n(Number((t - h.start).toFixed(6))) + ".",
      "Its starting point (the original time zero) now sits at τ = t."]]);
    lines.push(["Multiply x(τ) and h(t − τ)", integrand.intervals === 0
      ? ["The signals do not overlap here, so the product is 0 everywhere."]
      : ["x(τ) is nonzero for " + n(x.start) + " ≤ τ ≤ " + n(x.end) + ", so the product is nonzero only where both overlap:",
         n(Number(integrand.lo.toFixed(6))) + " ≤ τ ≤ " + n(Number(integrand.hi.toFixed(6))) + " (width " + n(Number((integrand.hi - integrand.lo).toFixed(6))) + ")."]]);
    lines.push(["Integrate the product (trapezoidal rule)", integrand.intervals === 0
      ? ["y(t) = 0."]
      : ["The overlap is cut into " + integrand.intervals + " slices of width " + formatNumber(integrand.step) + " (requested step: " + formatNumber(model.step) + ").",
         "Adding the trapezoid areas gives y(t) ≈ " + n(integrand.value) + ".",
         "This is an approximation. See the accuracy table below."]]);

    $("convolution-steps").innerHTML = '<ol class="steps-list">' + lines.map(function (item) {
      return '<li><span class="step-title">' + item[0] + '</span><ul>' + item[1].map(function (l) { return '<li>' + l + '</li>'; }).join("") + '</ul></li>';
    }).join("") + '</ol>';

    // Accuracy table: the same y(t) with smaller and smaller steps
    const table = math().getAccuracyTable(x, h, t, model.step);
    const finest = table[table.length - 1].value;
    $("convolution-table").innerHTML =
      '<div class="table-scroll"><h4>Accuracy at this t: the same y(t) with smaller steps</h4>' +
      '<table class="calc-table"><thead><tr><th>Step Δτ</th><th>Trapezoids</th><th>y(t) ≈</th><th>Difference from the finest</th></tr></thead><tbody>' +
      table.map(function (row) {
        return '<tr><td class="num">' + formatNumber(row.step) + '</td><td class="num">' + row.intervals + '</td>' +
               '<td class="num">' + n(Number(row.value.toPrecision(8))) + '</td><td class="num">' + n(Number((row.value - finest).toExponential(2))) + '</td></tr>';
      }).join("") + '</tbody></table>' +
      '<p class="field-hint">If the values agree to several digits, the step is small enough. If they keep changing, make the step smaller.</p></div>';
  }

  /* ---------- discrete ---------- */

  function drawDiscreteStep(model) {
    const n = model.y.start + state.index;
    const yValue = model.y.values[state.index];
    const info = math().getConvolutionTerms(model.x, model.h, n);
    const sliding = math().getFlippedShifted(model.h, n);
    const slide = model.windows.slide;

    $("cv-step-position").textContent = "n = " + minus(String(n)) + "    y[" + minus(String(n)) + "] = " + minus(formatNumber(yValue));

    // Result y[n], with the current sample highlighted
    SignalLab.plot.plotStem("convolution-plot-y", [
      { x: sequenceIndices(model.y), y: model.y.values, name: "y[n]", color: COLORS.amber },
      { x: [n], y: [yValue], name: "selected n", color: "#ffffff" }
    ], {
      title: "Result y[n]", xLabel: "n", yLabel: "y[n]", height: PLOT_HEIGHT + 30,
      xRange: model.windows.signals, yRange: model.yRange, autoXTicks: model.windows.signals[1] - model.windows.signals[0] > 30,
      annotations: [cornerAnnotation("y[" + minus(String(n)) + "] = " + minus(formatNumber(yValue)))]
    });

    // Steps 1-2: x[k] and the flipped, shifted h[n - k]
    const overlapShape = info.terms.length === 0 ? [] : [{
      type: "rect", xref: "x", yref: "paper", x0: info.kFirst - 0.5, x1: info.kLast + 0.5, y0: 0, y1: 1,
      fillcolor: "rgba(251, 191, 36, 0.10)", line: { width: 0 }
    }];
    SignalLab.plot.plotStem("convolution-plot-slide", [
      { x: sequenceIndices(model.x), y: model.x.values, name: "x[k]", color: COLORS.cyan },
      { x: sequenceIndices(sliding), y: sliding.values, name: "h[n − k] flipped and shifted", color: COLORS.magenta }
    ], {
      title: "Steps 1–2: flip h, then shift it to n = " + minus(String(n)) + " (shaded: where they overlap)",
      xLabel: "k", yLabel: "value", height: PLOT_HEIGHT + 30, xRange: slide, yRange: model.slideRange,
      autoXTicks: slide[1] - slide[0] > 30, shapes: overlapShape
    });

    // Steps 3-4: products
    SignalLab.plot.plotStem("convolution-plot-product", [
      { x: info.terms.map(function (term) { return term.k; }), y: info.terms.map(function (term) { return term.product; }), name: "x[k]·h[n − k]", color: COLORS.green }
    ], {
      title: "Steps 3–4: multiply matching samples, then sum them",
      xLabel: "k", yLabel: "product", height: PLOT_HEIGHT, xRange: slide, yRange: model.productRange,
      autoXTicks: slide[1] - slide[0] > 30,
      annotations: [cornerAnnotation("sum = " + minus(formatNumber(info.sum)) + " = y[" + minus(String(n)) + "]")]
    });

    showDiscreteSteps(model, n, info, sliding);
    showDiscreteTable(model, n);
  }

  /* "2·(−1)" style text for one term */
  function termText(term) {
    return bracketed(term.xk) + "·" + bracketed(term.hnk);
  }

  function showDiscreteSteps(model, n, info, sliding) {
    const h = model.h;
    const list = function (sequence) { return "[" + sequence.values.map(function (v) { return minus(formatNumber(v)); }).join(", ") + "]"; };
    const flipped = math().flipSequence(h);
    const hEnd = math().getSequenceEnd(h);
    const nText = minus(String(n));

    const lines = [];
    lines.push(["Flip h[k] to get h[−k]", [
      "h[k] = " + list(h) + " at k = " + minus(String(h.start)) + " … " + minus(String(hEnd)) + ".",
      "Reversed, h[−k] = " + list(flipped) + " at k = " + minus(String(flipped.start)) + " … " + minus(String(math().getSequenceEnd(flipped))) + "."]]);
    lines.push(["Shift it by n = " + nText + " to get h[n − k]", [
      "h[" + nText + " − k] = " + list(sliding) + " at k = " + minus(String(sliding.start)) + " … " + minus(String(math().getSequenceEnd(sliding))) + "."]]);
    lines.push(["Multiply the samples that line up", info.terms.length === 0
      ? ["No samples line up, so every product is 0."]
      : ["x[k] and h[" + nText + " − k] overlap for k = " + minus(String(info.kFirst)) + " … " + minus(String(info.kLast)) + " (" + info.terms.length + " product" + (info.terms.length === 1 ? "" : "s") + "):"]
          .concat(info.terms.map(function (term) {
            return "k = " + minus(String(term.k)) + ":  x[" + minus(String(term.k)) + "]·h[" + minus(String(term.hIndex)) + "] = " + termText(term) + " = " + minus(formatNumber(term.product));
          }))]);
    lines.push(["Add the products", [
      "y[" + nText + "] = " + (info.terms.length === 0 ? "0" : info.terms.map(function (term) { return minus(formatNumber(term.product)); }).join(" + ").replace(/\+ −/g, "− ")) +
      " = " + minus(formatNumber(info.sum)) + "."]]);

    $("convolution-steps").innerHTML = '<ol class="steps-list">' + lines.map(function (item) {
      return '<li><span class="step-title">' + item[0] + '</span><ul>' + item[1].map(function (l) { return '<li>' + l + '</li>'; }).join("") + '</ul></li>';
    }).join("") + '</ol>';
  }

  /* The calculation for EVERY output sample (the current one is highlighted). */
  function showDiscreteTable(model, currentN) {
    let rows = "";
    for (let i = 0; i < model.y.values.length; i++) {
      const n = model.y.start + i;
      const info = math().getConvolutionTerms(model.x, model.h, n);
      rows += '<tr' + (n === currentN ? ' class="is-current"' : '') + '><td class="num">' + minus(String(n)) + '</td><td>' +
              info.terms.map(termText).join(" + ") + '</td><td class="num">' + minus(formatNumber(info.sum)) + '</td></tr>';
    }
    $("convolution-table").innerHTML =
      '<div class="table-scroll"><h4>All output samples: y[n] = Σ x[k]·h[n − k]</h4>' +
      '<table class="calc-table"><thead><tr><th>n</th><th>Products x[k]·h[n − k] that are added</th><th>y[n]</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* =========================================================
     7. THE EXPLANATION PANEL
     ========================================================= */

  function explanationFor(mode) {
    if (mode === "continuous") {
      return '<h4>Continuous-time convolution: <span class="formula">y(t) = ∫ x(τ) h(t − τ) dτ</span></h4>' +
        '<p>Convolution tells you how much of x overlaps with a reversed copy of h, for every time t. To find y at ONE time t, follow four steps (move the slider to try other times):</p>' +
        '<ol>' +
          '<li><strong>Flip</strong> h(τ) to get h(−τ): mirror it around τ = 0.</li>' +
          '<li><strong>Shift</strong> it to get h(t − τ): slide the mirrored copy so that its starting point sits at τ = t.</li>' +
          '<li><strong>Multiply</strong> x(τ) and h(t − τ) at every τ.</li>' +
          '<li><strong>Integrate</strong> the product over τ: the area under it is y(t).</li>' +
        '</ol>' +
        '<h4>The result is a numerical approximation</h4>' +
        '<p>A computer cannot solve the integral exactly, so it uses the <strong>trapezoidal rule</strong>: the area is cut into slices of width Δτ (the step size), each slice is treated as a trapezoid, and the areas are added. The total is <span class="formula">Δτ × (½·first value + all the middle values + ½·last value)</span>.</p>' +
        '<ul>' +
          '<li>A smaller step gives a more accurate answer but needs more calculations. For smooth curves the error shrinks about 4 times each time the step is halved. The accuracy table under the plots shows this.</li>' +
          '<li>Jumps (a square wave, or a pulse edge inside the overlap) cannot be followed exactly, so near them the error is about the size of the step.</li>' +
          '<li>The area check compares the area of y with (area of x)·(area of h). These are always equal for a true convolution.</li>' +
        '</ul>' +
        '<h4>Why do the signals have a time range?</h4>' +
        '<p>The integral of two never-ending waves never settles (the area keeps growing). So each signal here is a piece of a wave between its start and end time, and is 0 everywhere else. A rectangular pulse is just a constant height over its time range. If x lasts from a to b and h from c to d, then y lasts from a + c to b + d.</p>' +
        '<p><strong>Try:</strong> two equal pulses give a triangle. A very narrow, tall pulse of area 1 behaves like an impulse and leaves the other signal almost unchanged (the "Near-impulse" example).</p>';
    }
    return '<h4>Discrete-time convolution: <span class="formula">y[n] = Σ x[k] h[n − k]</span></h4>' +
      '<p>Each output sample y[n] is a sum. To find ONE sample, follow four steps (move the slider to choose n):</p>' +
      '<ol>' +
        '<li><strong>Flip</strong> h[k] to get h[−k]: reverse the order of its values.</li>' +
        '<li><strong>Shift</strong> it by n to get h[n − k]: slide the reversed copy n places to the right.</li>' +
        '<li><strong>Multiply</strong> the samples that line up: x[k]·h[n − k].</li>' +
        '<li><strong>Sum</strong> those products. The total is y[n].</li>' +
      '</ol>' +
      '<h4>Indices and length</h4>' +
      '<p>A finite sequence lists its values starting at an index (for example x[−2], x[−1]). It is 0 everywhere else. If x has N values starting at index a, and h has M values starting at index b, then y has <strong>N + M − 1</strong> values and starts at index <strong>a + b</strong>. The module checks this every time.</p>' +
      '<h4>This one is exact</h4>' +
      '<p>The sum has only a few terms, so there is no approximation: the answers are exact (up to the tiny rounding of decimal numbers in any computer).</p>' +
      '<ul>' +
        '<li>Convolving with the impulse δ[n] (the single value 1 at n = 0) gives x unchanged. A delayed impulse δ[n − 2] delays x by 2 and moves the start index by 2.</li>' +
        '<li>The values of y always add up to (sum of x)·(sum of h). The readout shows this check.</li>' +
        '<li>Order does not matter: x * h = h * x.</li>' +
      '</ul>' +
      '<p><strong>Continuous vs discrete:</strong> discrete convolution is a sum over whole-number positions and is exact. Continuous convolution is an integral over all times and is approximated here with the trapezoidal rule.</p>';
  }

  /* =========================================================
     8. EVENTS AND START
     ========================================================= */

  function setUpEvents() {
    const controls = $("convolution-controls");

    // One listener catches typing, the dropdowns and the mode buttons
    controls.addEventListener("input", function (event) {
      const id = event.target.id || "";
      if (id === "cv-c-xType" || id === "cv-c-hType") { updateFrequencyVisibility(); }
      recompute();
    });

    // Example buttons
    controls.addEventListener("click", function (event) {
      const button = event.target.closest("[data-preset]");
      if (!button) { return; }
      applyPreset(button.closest("[data-mode]").dataset.mode, button.dataset.preset);
      recompute();
    });

    // The slider that moves the flipped signal
    function moveTo(index) {
      if (!state.model) { return; }
      state.index = Math.max(0, Math.min(state.model.count - 1, index));
      drawStep();
    }
    $("cv-step-slider").addEventListener("input", function (event) { moveTo(parseInt(event.target.value, 10)); });
    $("cv-step-prev").addEventListener("click", function () { moveTo(state.index - 1); });
    $("cv-step-next").addEventListener("click", function () { moveTo(state.index + 1); });
  }

  function init() {
    buildControls();
    buildStepControls();
    $("convolution-readout").innerHTML = '<div id="cv-banner"></div><div id="cv-readout-body"></div>';
    updateFrequencyVisibility();
    setUpEvents();
    recompute();
  }

  SignalLab.modules.convolution = { init: init };

})();

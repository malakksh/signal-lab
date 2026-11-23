(function () {

  function math() { return SignalLab.math.convolution; }
  const COLORS = SignalLab.plot.COLORS;
  const DIM_MAGENTA = "rgba(232, 121, 249, 0.35)";       // the original h, before flipping
  const PLOT_HEIGHT = 250;
  const PLOT_IDS = ["convolution-plot-x", "convolution-plot-h", "convolution-plot-y"];
  const C_FIELDS = ["xType", "xAmplitude", "xFrequency", "xStart", "xEnd",
                    "hType", "hAmplitude", "hFrequency", "hStart", "hEnd", "step"];
  const D_FIELDS = ["xValues", "xStart", "hValues", "hStart"];
  const state = { model: null, index: 0 };

  function $(id) { return document.getElementById(id); }

  function currentMode() {
    return document.querySelector('input[name="cv-mode"]:checked').value;
  }

  function fieldId(mode, key) {
    return "cv-" + (mode === "continuous" ? "c" : "d") + "-" + key;
  }
  function formatNumber(value) {
    if (Math.abs(value) < 1e-12) { return "0"; }
    return String(Number(value.toPrecision(6)) + 0);
  }
  function bracketed(value) {
    const text = formatNumber(value).replace("-", "−");
    return value < 0 ? "(" + text + ")" : text;
  }

  function minus(text) { return text.replace(/-/g, "−"); }
  function symmetricRange(arrays, headroom) {
    let largest = 0;
    arrays.forEach(function (values) {
      values.forEach(function (v) { largest = Math.max(largest, Math.abs(v)); });
    });
    const limit = largest < 1e-9 ? 1 : largest * (headroom || 1.15);
    return [-limit, limit];
  }
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
  function updateFrequencyVisibility() {
    ["x", "h"].forEach(function (prefix) {
      const isPulse = $("cv-c-" + prefix + "Type").value === "pulse";
      $("cv-c-" + prefix + "Frequency-field").hidden = isPulse;
      $("cv-c-" + prefix + "Amplitude-label").textContent = isPulse ? "Height (A)" : "Amplitude (A)";
    });
  }
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
  }
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
    showReadout(model);
    drawInputs(model);
    drawFinalResult(model);
  }
  function drawFinalResult(model) {
    if (model.mode === "continuous") {
      SignalLab.plot.plotContinuous("convolution-plot-y",
        [{ x: model.result.t, y: model.result.y, name: "y(t)", color: COLORS.amber }],
        { title: "Convolution result y(t)", xLabel: "t (s)", yLabel: "y(t)", height: PLOT_HEIGHT,
          xRange: model.windows.signals, yRange: model.yRange });
    } else {
      SignalLab.plot.plotStem("convolution-plot-y",
        [{ x: sequenceIndices(model.y), y: model.y.values, name: "y[n]", color: COLORS.amber }],
        { title: "Convolution result y[n]", xLabel: "n", yLabel: "y[n]", height: PLOT_HEIGHT,
          xRange: model.windows.signals, yRange: model.yRange, autoXTicks: model.windows.signals[1] - model.windows.signals[0] > 30 });
    }
  }
  function clearEverything() {
    state.model = null;
    PLOT_IDS.forEach(function (id) {
      if (typeof Plotly !== "undefined" && $(id).data) { Plotly.purge($(id)); }
    });
  }
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
  function setUpEvents() {
    const controls = $("convolution-controls");
    controls.addEventListener("input", function (event) {
      const id = event.target.id || "";
      if (id === "cv-c-xType" || id === "cv-c-hType") { updateFrequencyVisibility(); }
      recompute();
    });
    controls.addEventListener("click", function (event) {
      const button = event.target.closest("[data-preset]");
      if (!button) { return; }
      applyPreset(button.closest("[data-mode]").dataset.mode, button.dataset.preset);
      recompute();
    });

  }

  function init() {
    buildControls();
    $("convolution-readout").innerHTML = '<div id="cv-banner"></div><div id="cv-readout-body"></div>';
    updateFrequencyVisibility();
    setUpEvents();
    recompute();
  }

  SignalLab.modules.convolution = { init: init };

})();
(function () {

  function math() { return SignalLab.math.operations; }
  const COLORS = SignalLab.plot.COLORS;
  const FIELD_KEYS = ["s1Type", "s1Amplitude", "s1Frequency", "s1Phase",
                      "s2Type", "s2Amplitude", "s2Frequency", "s2Phase",
                      "shift", "scale", "start", "end"];
  const MODE_DEFAULTS = {
    continuous: { s1Frequency: 1,    s2Frequency: 3,    start: -2,  end: 2,  shift: 0.25, scale: 2,
                  shiftSlider: { min: -3,  max: 3,  step: 0.05 }, shiftStep: "0.05" },
    discrete:   { s1Frequency: 0.05, s2Frequency: 0.15, start: -20, end: 20, shift: 5, scale: 2,
                  shiftSlider: { min: -10, max: 10, step: 1 },    shiftStep: "1" }
  };
  const MODE_TEXT = {
    continuous: {
      frequencyLabel: "Frequency (Hz)",
      startLabel: "Start time (s)", endLabel: "End time (s)",
      shiftLabel: "Time shift t₀ (s)",
      shiftHint: "t₀ > 0 delays the signal (moves it right). t₀ < 0 advances it (moves it left).",
      scaleHint: "|a| > 1 compresses, 0 < |a| < 1 expands, a < 0 also reverses time. You can type a fraction such as 1/3."
    },
    discrete: {
      frequencyLabel: "Frequency (cycles/sample)",
      startLabel: "First sample (n)", endLabel: "Last sample (n)",
      shiftLabel: "Sample shift n₀ (whole number)",
      shiftHint: "n₀ > 0 delays the signal (moves it right). It must be a whole number: there are no values between samples.",
      scaleHint: "A whole number M keeps every M-th sample. 1/L (such as 0.5 or 1/3) inserts zeros between samples. Other values are not defined."
    }
  };

  function $(id) { return document.getElementById(id); }
  function formatNumber(value) {
    return String(Number(value.toPrecision(6)));
  }
  function fieldHtml(key, label, value, extra) {
    extra = extra || {};
    const inputPart = extra.text
      ? '<input type="text" id="ops-' + key + '" autocomplete="off" value="' + value + '">'
      : '<input type="number" id="ops-' + key + '" step="' + (extra.step || "any") + '"' +
        (extra.min !== undefined ? ' min="' + extra.min + '" max="' + extra.max + '"' : '') + ' value="' + value + '">';
    const sliderPart = extra.slider
      ? '<input type="range" id="ops-' + key + '-slider" aria-label="' + label + ' slider" min="' + extra.slider.min +
        '" max="' + extra.slider.max + '" step="' + extra.slider.step + '" value="' + value + '">'
      : '';
    const hintPart = extra.hint ? '<p class="field-hint" id="ops-' + key + '-hint">' + extra.hint + '</p>' : '';
    return '<div class="field" id="ops-' + key + '-field">' +
             '<label id="ops-' + key + '-label" for="ops-' + key + '">' + label + '</label>' +
             inputPart + sliderPart + hintPart +
             '<p class="field-error" id="ops-' + key + '-error" role="alert"></p>' +
           '</div>';
  }

  function typeSelectHtml(key, selected) {
    const names = { sine: "Sine wave", cosine: "Cosine wave", square: "Square wave" };
    let options = "";
    Object.keys(names).forEach(function (type) {
      options += '<option value="' + type + '"' + (type === selected ? " selected" : "") + '>' + names[type] + '</option>';
    });
    return '<div class="field">' +
             '<label for="ops-' + key + '">Signal type</label>' +
             '<select id="ops-' + key + '">' + options + '</select>' +
             '<p class="field-error" id="ops-' + key + '-error" role="alert"></p>' +
           '</div>';
  }
  function signalBlockHtml(prefix, defaults) {
    return '<div class="control-group" id="ops-' + prefix + '-group">' +
             '<h4 id="ops-' + prefix + '-heading"></h4>' +
             typeSelectHtml(prefix + "Type", defaults.type) +
             '<div class="field-pair">' +
               fieldHtml(prefix + "Amplitude", "Amplitude (A)", defaults.amplitude) +
               fieldHtml(prefix + "Frequency", "Frequency (Hz)", defaults.frequency) +
             '</div>' +
             fieldHtml(prefix + "Phase", "Phase (φ), radians", defaults.phase) +
           '</div>';
  }

  function buildControls() {
    const c = MODE_DEFAULTS.continuous;
    $("operations-controls").innerHTML =
      '<div class="field">' +
        '<label for="ops-operation">Operation</label>' +
        '<select id="ops-operation">' +
          '<optgroup label="Combine two signals">' +
            '<option value="add">Addition: x₁ + x₂</option>' +
            '<option value="subtract">Subtraction: x₁ − x₂</option>' +
            '<option value="multiply">Multiplication: x₁ · x₂</option>' +
          '</optgroup>' +
          '<optgroup label="Change the time of one signal">' +
            '<option value="shift">Time shifting: x(t − t₀)</option>' +
            '<option value="scale">Time scaling: x(a·t)</option>' +
            '<option value="reverse">Time reversal: x(−t)</option>' +
          '</optgroup>' +
        '</select>' +
      '</div>' +

      '<div class="field">' +
        '<span class="field-label" id="ops-mode-label">Representation</span>' +
        '<div class="segmented" role="radiogroup" aria-labelledby="ops-mode-label">' +
          '<input type="radio" name="ops-mode" id="ops-mode-continuous" value="continuous" checked>' +
          '<label for="ops-mode-continuous">Continuous</label>' +
          '<input type="radio" name="ops-mode" id="ops-mode-discrete" value="discrete">' +
          '<label for="ops-mode-discrete">Discrete</label>' +
        '</div>' +
      '</div>' +

      signalBlockHtml("s1", { type: "sine", amplitude: 1,   frequency: c.s1Frequency, phase: 0 }) +
      signalBlockHtml("s2", { type: "sine", amplitude: 0.5, frequency: c.s2Frequency, phase: 0 }) +

      '<div class="control-group" id="ops-shift-group" hidden>' +
        fieldHtml("shift", MODE_TEXT.continuous.shiftLabel, c.shift,
                  { slider: c.shiftSlider, step: c.shiftStep, hint: MODE_TEXT.continuous.shiftHint,
                    min: -math().LIMITS.shiftMax, max: math().LIMITS.shiftMax }) +
      '</div>' +
      '<div class="control-group" id="ops-scale-group" hidden>' +
        fieldHtml("scale", "Scale factor a", c.scale,
                  { text: true, slider: { min: 0.2, max: 5, step: 0.05 }, hint: MODE_TEXT.continuous.scaleHint }) +
      '</div>' +
      '<div class="control-group" id="ops-reverse-group" hidden>' +
        '<p class="field-hint">Time reversal has no settings. The signal is mirrored around t = 0.</p>' +
      '</div>' +

      '<div class="control-group">' +
        '<div class="field-pair">' +
          fieldHtml("start", "Start time (s)", c.start) +
          fieldHtml("end", "End time (s)", c.end) +
        '</div>' +
      '</div>';
  }
  function readInputs() {
    const raw = {
      operation: $("ops-operation").value,
      mode: document.querySelector('input[name="ops-mode"]:checked').value
    };
    FIELD_KEYS.forEach(function (key) { raw[key] = $("ops-" + key).value; });
    return raw;
  }

  function currentMode() {
    return document.querySelector('input[name="ops-mode"]:checked').value;
  }

  function isCombine(operation) {
    return math().OPERATIONS[operation].kind === "combine";
  }
  function updateVisibility() {
    const operation = $("ops-operation").value;
    const mode = currentMode();
    const isDiscrete = mode === "discrete";
    const text = MODE_TEXT[mode];
    const v = isDiscrete ? "n" : "t";
    const open = isDiscrete ? "[" : "(";
    const close = isDiscrete ? "]" : ")";

    $("ops-s2-group").hidden = !isCombine(operation);
    $("ops-shift-group").hidden = operation !== "shift";
    $("ops-scale-group").hidden = operation !== "scale";
    $("ops-reverse-group").hidden = operation !== "reverse";

    $("ops-s1-heading").textContent = isCombine(operation) ? "Signal x₁" + open + v + close : "Signal x" + open + v + close;
    $("ops-s2-heading").textContent = "Signal x₂" + open + v + close;

    $("ops-s1Frequency-label").textContent = text.frequencyLabel;
    $("ops-s2Frequency-label").textContent = text.frequencyLabel;
    $("ops-start-label").textContent = text.startLabel;
    $("ops-end-label").textContent = text.endLabel;
    $("ops-shift-label").textContent = text.shiftLabel;
    $("ops-shift-hint").textContent = text.shiftHint;
    $("ops-scale-hint").textContent = text.scaleHint;
    $("ops-scale-slider").hidden = isDiscrete;       // a slider can't pick "1/3" or whole numbers only
  }
  function applyModeDefaults(mode) {
    const d = MODE_DEFAULTS[mode];
    ["s1Frequency", "s2Frequency", "start", "end", "shift", "scale"].forEach(function (key) {
      $("ops-" + key).value = d[key];
    });
    $("ops-shift").step = d.shiftStep;
    showShiftOnSlider(d.shift, mode);
    $("ops-scale-slider").value = d.scale;
  }
  function isOnGrid(value, min, step) {
    const stepsFromMin = (value - min) / step;
    return Math.abs(stepsFromMin - Math.round(stepsFromMin)) < 1e-9;
  }
  function showShiftOnSlider(value, mode) {
    const normal = MODE_DEFAULTS[mode || currentMode()].shiftSlider;
    const slider = $("ops-shift-slider");
    const limit = Math.max(normal.max, Math.ceil(Math.abs(value) * 1.2));
    slider.min = -limit;
    slider.max = limit;
    slider.step = isOnGrid(value, -limit, normal.step) ? normal.step : "any";
    slider.value = value;
  }
  function snapToShiftGrid(value) {
    const step = MODE_DEFAULTS[currentMode()].shiftSlider.step;
    return SignalLab.signals.roundClean(Math.round(value / step) * step);
  }
  function syncShift(fromSlider) {
    const box = $("ops-shift");
    const slider = $("ops-shift-slider");

    if (fromSlider) {
      let value = Number(slider.value);
      if (slider.step === "any") {            // slider was showing an off-grid typed value:
        value = snapToShiftGrid(value);       // snap to the grid and restore the normal step
        showShiftOnSlider(value);
      }
      box.value = String(value);
    } else {
      const text = box.value.trim();
      if (text !== "" && isFinite(Number(text))) { showShiftOnSlider(Number(text)); }
    }
  }

  function showFieldErrors(errors) {
    FIELD_KEYS.forEach(function (key) {
      const message = errors[key] || "";
      $("ops-" + key + "-error").textContent = message;
      const input = $("ops-" + key);
      input.classList.toggle("is-invalid", message !== "");
      input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
    });
  }
  function call(name, argument, isDiscrete) {
    return isDiscrete ? name + "[" + argument + "]" : name + "(" + argument + ")";
  }
  function phaseText(phase) {
    if (phase === 0) { return ""; }
    return phase > 0 ? " + " + formatNumber(phase) : " − " + formatNumber(-phase);
  }
  function signalFormula(spec, argument, variable) {
    const inner = argument === variable ? argument : "(" + argument + ")";
    const angle = "2π·" + formatNumber(spec.frequency) + "·" + inner + phaseText(spec.phase);
    const A = formatNumber(spec.amplitude);
    if (spec.type === "sine")   { return A + "·sin(" + angle + ")"; }
    if (spec.type === "cosine") { return A + "·cos(" + angle + ")"; }
    return A + "·sign(sin(" + angle + "))";
  }
  function timeArgument(operation, parameter, variable) {
    if (operation === "shift") {
      if (parameter === 0) { return variable; }
      return parameter > 0 ? variable + " − " + formatNumber(parameter) : variable + " + " + formatNumber(-parameter);
    }
    if (operation === "scale") {
      const size = Math.abs(parameter);
      if (size === 1) { return parameter < 0 ? "−" + variable : variable; }
      return (parameter < 0 ? "−" : "") + formatNumber(size) + "·" + variable;
    }
    return "−" + variable;                                    // reverse
  }

  function generalFormula(operation, isDiscrete) {
    const v = isDiscrete ? "n" : "t";
    const y = call("y", v, isDiscrete);
    if (operation === "add")      { return y + " = " + call("x₁", v, isDiscrete) + " + " + call("x₂", v, isDiscrete); }
    if (operation === "subtract") { return y + " = " + call("x₁", v, isDiscrete) + " − " + call("x₂", v, isDiscrete); }
    if (operation === "multiply") { return y + " = " + call("x₁", v, isDiscrete) + " · " + call("x₂", v, isDiscrete); }
    if (operation === "shift")    { return y + " = " + call("x", v + " − " + (isDiscrete ? "n₀" : "t₀"), isDiscrete); }
    if (operation === "scale")    { return y + " = " + call("x", "a·" + v, isDiscrete); }
    return y + " = " + call("x", "−" + v, isDiscrete);
  }
  function formulaLine(text) {
    return '<span class="formula formula-block">' + text + '</span>';
  }

  function statHtml(label, value) {
    return '<div class="stat"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div>';
  }

  function noteHtml(text) {
    return '<div class="message message-warning">' + text + '</div>';
  }

  function largestAbsolute(values) {
    let largest = 0;
    for (let i = 0; i < values.length; i++) { largest = Math.max(largest, Math.abs(values[i])); }
    return largest;
  }
  function showReadout(values, output) {
    const isDiscrete = output.isDiscrete;
    const v = isDiscrete ? "n" : "t";
    const op = values.operation;
    let html = formulaLine(generalFormula(op, isDiscrete));
    let stats = "";
    let notes = "";

    if (output.kind === "combine") {
      html += formulaLine(call("x₁", v, isDiscrete) + " = " + signalFormula(values.signal1, v, v));
      html += formulaLine(call("x₂", v, isDiscrete) + " = " + signalFormula(values.signal2, v, v));
      stats += statHtml("Peak of x₁", formatNumber(values.signal1.amplitude));
      stats += statHtml("Peak of x₂", formatNumber(values.signal2.amplitude));
      stats += statHtml("Largest |y|", formatNumber(largestAbsolute(output.result.y)));
    } else {
      const argument = timeArgument(op, values.parameter, v);
      html += formulaLine(call("x", v, isDiscrete) + " = " + signalFormula(values.signal1, v, v));
      html += formulaLine(call("y", v, isDiscrete) + " = " + call("x", argument, isDiscrete) + " = " + signalFormula(values.signal1, argument, v));

      const unit = isDiscrete ? " samples" : " s";
      if (op === "shift") {
        const size = formatNumber(Math.abs(values.parameter)) + unit;
        stats += statHtml("Effect", values.parameter === 0 ? "no shift" : values.parameter > 0 ? "delayed: moves right by " + size : "advanced: moves left by " + size);
        stats += statHtml("y at " + v + " reads x at", argument);
        if (math().isWholePeriodShift(values.parameter, values.signal1.frequency)) {
          const periods = values.parameter * values.signal1.frequency;
          const period = formatNumber(1 / values.signal1.frequency) + unit;
          notes += noteHtml("This shift is exactly " + formatNumber(Math.abs(periods)) + " full period" + (Math.abs(periods) === 1 ? "" : "s") +
                            " (T = " + period + "), so the shifted wave lands on top of the original and the graph looks unchanged. " +
                            "The calculation is still correct: try a shift that is not a whole number of periods, such as a quarter of T.");
        }
      } else if (op === "scale") {
        const info = math().describeScale(values.parameter);
        let effect = info.effect === "compression" ? "compression (×" + formatNumber(info.factor) + " faster)"
                   : info.effect === "expansion"   ? "expansion (×" + formatNumber(info.factor) + " slower)"
                   : "same speed";
        if (info.reversed) { effect += ", reversed"; }
        stats += statHtml("Effect", effect);
        stats += statHtml("y at " + v + " reads x at", argument);
        if (!isDiscrete) {
          const newFrequency = values.signal1.frequency * Math.abs(values.parameter);
          stats += statHtml("New frequency |a|·f", formatNumber(newFrequency) + " Hz");
          stats += statHtml("New period T/|a|", formatNumber(1 / newFrequency) + " s");
        } else {
          const rule = math().getDiscreteScaleRule(values.parameter);
          if (rule.type === "decimate" && rule.factor > 1) {
            notes += noteHtml("Compression by " + rule.factor + " keeps every " + rule.factor + "-th sample of x. The samples in between are discarded, so information is lost.");
          }
          if (rule.type === "expand") {
            notes += noteHtml("Expansion by " + rule.factor + " puts " + (rule.factor - 1) + " zero" + (rule.factor > 2 ? "s" : "") +
                              " between the samples of x. The zeros are NOT interpolated: x[n/" + rule.factor + "] only exists when n/" + rule.factor + " is a whole number.");
          }
        }
      } else {
        stats += statHtml("Effect", "mirrored around " + v + " = 0");
        stats += statHtml("y at " + v + " reads x at", argument);
      }
    }

    html += '<div class="stat-grid">' + stats + '</div>' + notes;
    $("operations-readout").innerHTML = html;
  }

  function showErrorSummary() {
    $("operations-readout").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plots below still show your last valid result.</div>';
  }
  function symmetricRange(arrays) {
    let largest = 0;
    arrays.forEach(function (values) { largest = Math.max(largest, largestAbsolute(values)); });
    const limit = largest < 1e-9 ? 1 : largest * 1.15;
    return [-limit, limit];
  }
  function drawOne(plotId, traces, options, isDiscrete, windowSize) {
    options.xLabel = isDiscrete ? "n" : "t (s)";
    options.yLabel = "value";
    if (isDiscrete) {
      options.autoXTicks = windowSize > 30;          // one tick per n is only readable for short windows
      SignalLab.plot.plotStem(plotId, traces, options);
    } else {
      SignalLab.plot.plotContinuous(plotId, traces, options);
    }
  }

  function drawPlots(values, output) {
    const isDiscrete = output.isDiscrete;
    const v = isDiscrete ? "n" : "t";
    const windowSize = values.end - values.start;
    const combine = output.kind === "combine";
    const topTraces = [{ x: output.input1.t, y: output.input1.y, color: COLORS.cyan,
                         name: call(combine ? "x₁" : "x", v, isDiscrete) }];
    const topArrays = [output.input1.y];
    if (combine) {
      topTraces.push({ x: output.input2.t, y: output.input2.y, color: COLORS.magenta, name: call("x₂", v, isDiscrete) });
      topArrays.push(output.input2.y);
    }
    drawOne("operations-plot", topTraces,
            { title: combine ? "Input signals" : "Original signal " + call("x", v, isDiscrete), yRange: symmetricRange(topArrays) },
            isDiscrete, windowSize);
    const resultArrays = combine ? [output.result.y] : topArrays;
    drawOne("operations-plot-result",
            [{ x: output.result.t, y: output.result.y, color: COLORS.amber, name: call("y", v, isDiscrete) }],
            { title: "Result: " + math().OPERATIONS[values.operation].label.toLowerCase(), yRange: symmetricRange(resultArrays) },
            isDiscrete, output.result.t.length > 0 ? output.result.t[output.result.t.length - 1] - output.result.t[0] : windowSize);
  }
  function update() {
    const raw = readInputs();
    const result = math().validateInputs(raw);
    showFieldErrors(result.errors);
    if (!result.ok) {
      showErrorSummary();
      return;
    }

    let output;
    try {
      output = math().computeResult(result.values);
    } catch (error) {
      $("operations-readout").innerHTML = '<div class="message message-error">' + error.message + '</div>';
      return;
    }
    showReadout(result.values, output);
    drawPlots(result.values, output);
  }
  function setUpEvents() {
    $("operations-controls").addEventListener("input", function (event) {
      const target = event.target;
      const id = target.id;

      if (id === "ops-shift" || id === "ops-shift-slider") {
        syncShift(id === "ops-shift-slider");                       // shift: box <-> slider
      } else if (id.endsWith("-slider")) {
        $(id.replace("-slider", "")).value = target.value;          // other slider -> number box
      } else {
        const slider = $(id + "-slider");                           // other number box -> slider
        if (slider && target.value.trim() !== "" && isFinite(Number(target.value))) { slider.value = target.value; }
      }

      if (target.name === "ops-mode") { applyModeDefaults(target.value); }
      if (id === "ops-operation" || target.name === "ops-mode") { updateVisibility(); }
      update();
    });
    $("operations-controls").addEventListener("change", function (event) {
      if (event.target.id === "ops-shift") {
        syncShift(false);
        update();
      }
    });
  }

  function init() {
    buildControls();
    updateVisibility();
    setUpEvents();
    update();
  }

  SignalLab.modules.operations = { init: init };

})();
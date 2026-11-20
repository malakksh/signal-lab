/* ==========================================================
   operations.ui.js  (Person 3)
   Signal Operations: USER INTERFACE.
   Builds the controls, reads them, calls operations.math.js, and draws.

   Containers (from index.html):
     #operations-controls     the inputs (built here)
     #operations-readout      formulas, numbers and notes above the plots
     #operations-plot         top plot: the original signal(s)
     #operations-plot-result  bottom plot: the result y
     #operations-explain      the plain-language explanation (built here)
   ========================================================== */
(function () {

  function math() { return SignalLab.math.operations; }
  const COLORS = SignalLab.plot.COLORS;

  // Every input has the id "ops-" + one of these names
  const FIELD_KEYS = ["s1Type", "s1Amplitude", "s1Frequency", "s1Phase",
                      "s2Type", "s2Amplitude", "s2Frequency", "s2Phase",
                      "shift", "scale", "start", "end"];

  // Sensible starting values for each representation. Frequencies mean
  // different things (Hz vs cycles per sample), so we reset them on a switch.
  const MODE_DEFAULTS = {
    continuous: { s1Frequency: 1,    s2Frequency: 3,    start: -2,  end: 2,  shift: 0.25, scale: 2,
                  shiftSlider: { min: -3,  max: 3,  step: 0.05 }, shiftStep: "0.05" },
    discrete:   { s1Frequency: 0.05, s2Frequency: 0.15, start: -20, end: 20, shift: 5, scale: 2,
                  shiftSlider: { min: -10, max: 10, step: 1 },    shiftStep: "1" }
  };

  // Texts that change with the representation
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

  /* Shows at most 6 significant digits: 0.30000000000000004 -> 0.3 */
  function formatNumber(value) {
    return String(Number(value.toPrecision(6)));
  }

  /* =========================================================
     1. BUILDING THE CONTROLS
     ========================================================= */

  /* One input with a label, an optional slider, an optional hint,
     and an empty spot for its error message. */
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

  /* The four controls of one signal. prefix is "s1" or "s2". */
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

  /* =========================================================
     2. READING AND SHOWING THE CONTROLS
     ========================================================= */

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

  /* Shows only the controls the chosen operation needs, and fixes the
     headings and labels for continuous or discrete. */
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

  /* Puts mode-appropriate starting values into the boxes. */
  function applyModeDefaults(mode) {
    const d = MODE_DEFAULTS[mode];
    ["s1Frequency", "s2Frequency", "start", "end", "shift", "scale"].forEach(function (key) {
      $("ops-" + key).value = d[key];
    });
    $("ops-shift").step = d.shiftStep;
    showShiftOnSlider(d.shift, mode);
    $("ops-scale-slider").value = d.scale;
  }

  /* =========================================================
     SHIFT: keeping the number box, the slider and the graph in step
     ---------------------------------------------------------
     The number box is the "truth". Whatever it says is what gets drawn.
     The slider is a second way to edit the same number, so it must always
     SHOW that number. Two things could stop it from doing so:
       - a typed value outside the slider's range (e.g. 5 on a -3..3 slider)
       - a typed value between the slider's steps (e.g. 0.123 on 0.05 steps)
     showShiftOnSlider() handles both.
     ========================================================= */

  /* NOTE on the arrow keys: a number box steps from a starting point (its "min"
     if it has one, otherwise its original "value"). The shift box has
     min = -1000 (the validator's limit), a multiple of both 0.05 and 1, so the
     arrows always land on tidy values: 0.5 -> 0.55 (continuous), 7 -> 8 (discrete). */

  /* True when value sits exactly on the slider's grid: min, min+step, ... */
  function isOnGrid(value, min, step) {
    const stepsFromMin = (value - min) / step;
    return Math.abs(stepsFromMin - Math.round(stepsFromMin)) < 1e-9;
  }

  /* Makes the shift slider display exactly "value".
       1. Range: the normal range, widened (with 20% room) if value does not fit.
       2. Step:  the normal step if value is on the grid; otherwise "any", so
                 the slider can show the exact typed number.
     Min, max and step are set BEFORE the value, because the browser snaps a
     slider's value to its current range and step. */
  function showShiftOnSlider(value, mode) {
    const normal = MODE_DEFAULTS[mode || currentMode()].shiftSlider;
    const slider = $("ops-shift-slider");
    const limit = Math.max(normal.max, Math.ceil(Math.abs(value) * 1.2));
    slider.min = -limit;
    slider.max = limit;
    slider.step = isOnGrid(value, -limit, normal.step) ? normal.step : "any";
    slider.value = value;
  }

  /* Rounds a number to the nearest slider step (0.05 or 1). */
  function snapToShiftGrid(value) {
    const step = MODE_DEFAULTS[currentMode()].shiftSlider.step;
    return SignalLab.signals.roundClean(Math.round(value / step) * step);
  }

  /* Copies the shift between the number box and the slider.
       fromSlider = true : the slider was moved       -> update the number box
       fromSlider = false: the number box was edited  -> update the slider
     This covers typing AND the box's up/down arrows (both fire "input"). */
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

  /* =========================================================
     3. FORMULA TEXT
     ========================================================= */

  /* x(t) or x[n] */
  function call(name, argument, isDiscrete) {
    return isDiscrete ? name + "[" + argument + "]" : name + "(" + argument + ")";
  }

  /* " + 0.5", " − 0.5" or "" for phase 0 */
  function phaseText(phase) {
    if (phase === 0) { return ""; }
    return phase > 0 ? " + " + formatNumber(phase) : " − " + formatNumber(-phase);
  }

  /* The formula of a signal with its time argument filled in,
     e.g. 1·sin(2π·1·(t − 2)). argument is "t", "t − 2", "2·t" or "−t". */
  function signalFormula(spec, argument, variable) {
    const inner = argument === variable ? argument : "(" + argument + ")";
    const angle = "2π·" + formatNumber(spec.frequency) + "·" + inner + phaseText(spec.phase);
    const A = formatNumber(spec.amplitude);
    if (spec.type === "sine")   { return A + "·sin(" + angle + ")"; }
    if (spec.type === "cosine") { return A + "·cos(" + angle + ")"; }
    return A + "·sign(sin(" + angle + "))";
  }

  /* What goes inside x( ... ) for the time operations. */
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

  /* =========================================================
     4. THE READOUT ABOVE THE PLOTS
     ========================================================= */

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

  /* Everything inserted here is built from numbers we formatted ourselves
     (or fixed text), so it is safe to use innerHTML. */
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

  /* =========================================================
     5. THE TWO PLOTS
     ========================================================= */

  /* A vertical range that is symmetric around 0 and a bit bigger than the data. */
  function symmetricRange(arrays) {
    let largest = 0;
    arrays.forEach(function (values) { largest = Math.max(largest, largestAbsolute(values)); });
    const limit = largest < 1e-9 ? 1 : largest * 1.15;
    return [-limit, limit];
  }

  /* Draws with plotStem for discrete signals and plotContinuous otherwise. */
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

    // Top plot: the original signal(s)
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

    // Bottom plot: the result. A time operation keeps the same peak height,
    // so it uses the same vertical range as the original (easy to compare).
    const resultArrays = combine ? [output.result.y] : topArrays;
    drawOne("operations-plot-result",
            [{ x: output.result.t, y: output.result.y, color: COLORS.amber, name: call("y", v, isDiscrete) }],
            { title: "Result: " + math().OPERATIONS[values.operation].label.toLowerCase(), yRange: symmetricRange(resultArrays) },
            isDiscrete, output.result.t.length > 0 ? output.result.t[output.result.t.length - 1] - output.result.t[0] : windowSize);
  }

  /* =========================================================
     6. THE EXPLANATION PANEL
     ========================================================= */

  function explanationFor(operation, isDiscrete) {
    if (operation === "add") {
      return '<h4>Addition: <span class="formula">y(t) = x₁(t) + x₂(t)</span></h4>' +
        '<p>At every instant, read both signals and add their values. Where both are positive the sum is larger (they reinforce each other). Where one is positive and the other negative they partly cancel. Example: a sine plus the same sine with phase π is 0 everywhere.</p>' +
        '<p>Both signals are calculated on the <strong>same time axis</strong>, so each value is added to the value of the other signal at exactly the same time.</p>';
    }
    if (operation === "subtract") {
      return '<h4>Subtraction: <span class="formula">y(t) = x₁(t) − x₂(t)</span></h4>' +
        '<p>At every instant, subtract the value of x₂ from the value of x₁. This is the same as adding the upside-down copy of x₂: <span class="formula">x₁(t) + (−x₂(t))</span>.</p>' +
        '<p>Order matters: x₂ − x₁ is the upside-down version of x₁ − x₂. A signal minus itself is 0 everywhere.</p>';
    }
    if (operation === "multiply") {
      return '<h4>Multiplication: <span class="formula">y(t) = x₁(t) · x₂(t)</span></h4>' +
        '<p>At every instant, multiply the two values. The product is 0 wherever either signal is 0, positive where the signs agree, and negative where they differ. Its peak is A₁·A₂.</p>' +
        '<p>Example: <span class="formula">sin(2πt)·cos(2πt) = ½·sin(4πt)</span>, a wave twice as fast and half as tall. Multiplying signals is how radio signals are modulated.</p>';
    }
    if (operation === "shift") {
      return isDiscrete
        ? '<h4>Time shifting: <span class="formula">y[n] = x[n − n₀]</span></h4>' +
          '<p>To find y at sample n, look up x at the earlier sample n − n₀. If n₀ &gt; 0 the signal is <strong>delayed</strong> (moves right). If n₀ &lt; 0 it is <strong>advanced</strong> (moves left).</p>' +
          '<p>n₀ must be a whole number. A discrete signal has no values between its samples, so a shift such as 2.5 would require guessing values. The program rejects it instead of interpolating.</p>'
        : '<h4>Time shifting: <span class="formula">y(t) = x(t − t₀)</span></h4>' +
          '<p>To find y at time t, look up x at the earlier time <span class="formula">t − t₀</span>. If t₀ &gt; 0 the signal is <strong>delayed</strong>: the graph moves right by t₀. If t₀ &lt; 0 it is <strong>advanced</strong>: the graph moves left.</p>' +
          '<p>Example: x peaks at t = 0.25. With t₀ = 1, y(1.25) = x(0.25), so y peaks at t = 1.25. A common mistake is to think x(t − 1) moves the graph left: it moves right.</p>' +
          '<p>For a sinusoid, shifting by t₀ is the same as changing the phase by <span class="formula">−2πf·t₀</span>.</p>';
    }
    if (operation === "scale") {
      return isDiscrete
        ? '<h4>Time scaling: <span class="formula">y[n] = x[a·n]</span></h4>' +
          '<p>Discrete scaling only makes sense for two kinds of a:</p>' +
          '<ul>' +
            '<li><strong>a = M (a whole number): compression.</strong> y[n] = x[M·n] keeps every M-th sample. The others are lost.</li>' +
            '<li><strong>a = 1/L: expansion.</strong> x[n/L] exists only when n/L is a whole number, so the L − 1 positions between the original samples are set to 0 (zero insertion). They are <em>not</em> interpolated.</li>' +
          '</ul>' +
          '<p>Other values, like 1.5, would need values between samples, so they are rejected. A negative a also reverses time.</p>'
        : '<h4>Time scaling: <span class="formula">y(t) = x(a·t)</span></h4>' +
          '<p>To find y at time t, look up x at time <span class="formula">a·t</span>.</p>' +
          '<ul>' +
            '<li><strong>Compression, |a| &gt; 1.</strong> The signal is squeezed in time and runs |a| times faster. A sinusoid gets frequency |a|·f and period T/|a|.</li>' +
            '<li><strong>Expansion, 0 &lt; |a| &lt; 1.</strong> The signal is stretched in time and runs more slowly. The period becomes T/|a|, which is longer than T.</li>' +
            '<li><strong>Negative a</strong> also reverses time: x(−2t) is a compression by 2 and a reversal.</li>' +
          '</ul>' +
          '<p>Example: a = 2 gives y(0.125) = x(0.25). Only the time is scaled: the phase φ stays as it is, so x(2t) = A·sin(2πf·2t + φ).</p>';
    }
    return '<h4>Time reversal: <span class="formula">y' + (isDiscrete ? '[n] = x[−n]' : '(t) = x(−t)') + '</span></h4>' +
      '<p>The value of y at ' + (isDiscrete ? 'n' : 't') + ' is the value of x at ' + (isDiscrete ? '−n' : '−t') + '. The graph is mirrored around the vertical axis.</p>' +
      '<p>An <strong>even</strong> signal such as a cosine looks the same afterwards, because cos(−θ) = cos(θ). An <strong>odd</strong> signal such as a sine flips upside down, because sin(−θ) = −sin(θ). A sine with a phase is neither: its mirror image is a different wave.</p>';
  }

  /* The fixed part of the explanation, written once. */
  function buildExplanation() {
    $("operations-explain").innerHTML =
      '<div id="ops-explain-current"></div>' +
      '<h4>How the values are calculated</h4>' +
      '<p>For the time operations the program does <strong>not</strong> move or stretch the picture. For every time t it works out which time of the original signal to read (<span class="formula">t − t₀</span>, <span class="formula">a·t</span> or <span class="formula">−t</span>) and evaluates the signal\'s formula there. Because the formula exists for all times, nothing is cut off or padded with zeros at the edges of the plot.</p>' +
      '<h4>All six operations</h4>' +
      '<ul>' +
        '<li>Addition: <span class="formula">y(t) = x₁(t) + x₂(t)</span></li>' +
        '<li>Subtraction: <span class="formula">y(t) = x₁(t) − x₂(t)</span></li>' +
        '<li>Multiplication: <span class="formula">y(t) = x₁(t) · x₂(t)</span></li>' +
        '<li>Time shifting: <span class="formula">y(t) = x(t − t₀)</span>, delay if t₀ &gt; 0</li>' +
        '<li>Time scaling: <span class="formula">y(t) = x(a·t)</span>, compression if |a| &gt; 1, expansion if |a| &lt; 1</li>' +
        '<li>Time reversal: <span class="formula">y(t) = x(−t)</span></li>' +
      '</ul>' +
      '<p><strong>Discrete signals</strong> use x[n] = A·sin(2π·f·n + φ), where f is in cycles per sample (0.05 means one cycle every 20 samples). Samples exist only at whole numbers n.</p>';
  }

  /* =========================================================
     7. THE UPDATE LOOP: read -> check -> calculate -> draw
     ========================================================= */
  function update() {
    const raw = readInputs();
    $("ops-explain-current").innerHTML = explanationFor(raw.operation, raw.mode === "discrete");

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

  /* =========================================================
     8. EVENTS AND START
     ========================================================= */
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

    // A value that is committed (Enter, or leaving the box) is synced and drawn
    // too. This repeats what "input" already did, so it is harmless, but it
    // means no browser can leave the three controls out of step.
    $("operations-controls").addEventListener("change", function (event) {
      if (event.target.id === "ops-shift") {
        syncShift(false);
        update();
      }
    });
  }

  function init() {
    buildControls();
    buildExplanation();
    updateVisibility();
    setUpEvents();
    update();
  }

  SignalLab.modules.operations = { init: init };

})();

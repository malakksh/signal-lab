/* ==========================================================
   evenodd.ui.js  (Person 4)
   Even & Odd Decomposition: USER INTERFACE.
   Builds the controls, reads them, calls evenodd.math.js, and draws.

   Containers (from index.html):
     #evenodd-controls      the inputs (built here)
     #evenodd-readout       reconstruction, verification and notes
     #evenodd-plot          original signal x
     #evenodd-plot-even     even component x_e
     #evenodd-plot-odd      odd component x_o
     #evenodd-explain       the plain-language explanation (built here)
   ========================================================== */
(function () {

  const MATH = function () { return SignalLab.math.evenodd; };
  const COLORS = SignalLab.plot.COLORS;

  // Every input has the id "eo-" + one of these names
  const FIELD_NAMES = ["type", "amplitude", "frequency", "phase", "halfWidth"];

  const TYPE_LABELS = { sine: "Sine wave", cosine: "Cosine wave", square: "Square wave" };

  // Starting values for each representation. The phase is not 0, so that
  // BOTH components are visible (a plain sine is purely odd).
  const DEFAULTS = {
    continuous: { frequency: 1,    halfWidth: 2,  slider: { min: 0.1,  max: 10,  step: 0.1 } },
    discrete:   { frequency: 0.05, halfWidth: 20, slider: { min: 0.01, max: 0.5, step: 0.01 } }
  };
  const DEFAULT_PHASE = 0.785;

  function $(id) { return document.getElementById(id); }

  /* At most 6 significant digits; also hides -0 and tiny noise. */
  function formatNumber(value) {
    if (Math.abs(value) < 1e-9) { return "0"; }
    return String(Number(value.toPrecision(6)));
  }

  /* Error sizes: 0 or scientific notation such as 3.3e-16. */
  function formatError(value) {
    return value === 0 ? "0" : value.toExponential(1);
  }

  /* =========================================================
     1. BUILDING THE CONTROLS
     ========================================================= */

  function sliderFieldHtml(name, label, value, min, max, step, hint, extraHtml) {
    return '<div class="field" id="eo-' + name + '-field">' +
             '<label for="eo-' + name + '">' + label + '</label>' +
             '<input type="number" id="eo-' + name + '" step="any" value="' + value + '">' +
             '<input type="range" id="eo-' + name + '-slider" aria-label="' + label + ' slider"' +
                 ' min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
             '<p class="field-hint" id="eo-' + name + '-hint">' + hint + '</p>' +
             (extraHtml || '') +
             '<p class="field-error" id="eo-' + name + '-error" role="alert"></p>' +
           '</div>';
  }

  function buildControls() {
    const d = DEFAULTS.continuous;
    const phasePresets =
      '<div class="btn-row" aria-label="Phase presets">' +
        '<button type="button" class="btn btn-small" data-phase="0">0</button>' +
        '<button type="button" class="btn btn-small" data-phase="' + Math.PI / 2 + '">π/2</button>' +
        '<button type="button" class="btn btn-small" data-phase="' + Math.PI + '">π</button>' +
        '<button type="button" class="btn btn-small" data-phase="' + (-Math.PI / 2) + '">−π/2</button>' +
      '</div>';

    $("evenodd-controls").innerHTML =
      '<div class="field">' +
        '<label for="eo-type">Original signal</label>' +
        '<select id="eo-type">' +
          '<option value="sine">Sine wave</option>' +
          '<option value="cosine">Cosine wave</option>' +
          '<option value="square">Square wave</option>' +
        '</select>' +
        '<p class="field-error" id="eo-type-error" role="alert"></p>' +
      '</div>' +

      '<div class="field">' +
        '<span class="field-label" id="eo-mode-label">Representation</span>' +
        '<div class="segmented" role="radiogroup" aria-labelledby="eo-mode-label">' +
          '<input type="radio" name="eo-mode" id="eo-mode-continuous" value="continuous" checked>' +
          '<label for="eo-mode-continuous">Continuous</label>' +
          '<input type="radio" name="eo-mode" id="eo-mode-discrete" value="discrete">' +
          '<label for="eo-mode-discrete">Discrete</label>' +
        '</div>' +
      '</div>' +

      sliderFieldHtml("amplitude", "Amplitude (A)", 1, 0.1, 3, 0.1, "How tall the wave is.") +
      sliderFieldHtml("frequency", "Frequency (f), in Hz", d.frequency,
                      d.slider.min, d.slider.max, d.slider.step, "Cycles per second.") +
      sliderFieldHtml("phase", "Phase (φ), in radians", DEFAULT_PHASE, -6.28, 6.28, 0.01,
                      "Shifts the wave in time. π ≈ 3.14159. Try 0 and π/2.", phasePresets) +

      '<div class="control-group">' +
        '<div class="field" id="eo-halfWidth-field">' +
          '<label for="eo-halfWidth" id="eo-halfWidth-label">Range T (s)</label>' +
          '<input type="number" id="eo-halfWidth" step="any" value="' + d.halfWidth + '">' +
          '<p class="field-hint" id="eo-halfWidth-hint">The plots run from −T to T, always symmetric around 0.</p>' +
          '<p class="field-error" id="eo-halfWidth-error" role="alert"></p>' +
        '</div>' +
      '</div>';
  }

  function buildExplanation() {
    $("evenodd-explain").innerHTML =
      '<p>Mirror a signal around t = 0 and you get x(−t). Comparing the two gives a clean split into <strong>two</strong> parts:</p>' +
      '<span class="formula formula-block">Even part:  xₑ(t) = [ x(t) + x(−t) ] / 2</span>' +
      '<span class="formula formula-block">Odd part:   xₒ(t) = [ x(t) − x(−t) ] / 2</span>' +
      '<ul>' +
        '<li><strong>Even</strong> means mirror-symmetric: <span class="formula">xₑ(−t) = xₑ(t)</span>. The right half is a copy of the left half (like cos).</li>' +
        '<li><strong>Odd</strong> means antisymmetric: <span class="formula">xₒ(−t) = −xₒ(t)</span>. The right half is the left half flipped upside down (like sin), so xₒ(0) = 0 always.</li>' +
        '<li><strong>Averaging</strong> x(t) with x(−t) keeps only what the two have in common (the even part). Taking half their <em>difference</em> keeps only what is opposite (the odd part).</li>' +
      '</ul>' +
      '<p><strong>They always add back to the original</strong> because the x(−t) terms cancel:</p>' +
      '<span class="formula formula-block">xₑ(t) + xₒ(t) = [x(t) + x(−t)]/2 + [x(t) − x(−t)]/2 = x(t)</span>' +
      '<p>The checks under the plots confirm this numerically, point by point, and also test that xₑ really is even and xₒ really is odd.</p>' +
      '<p><strong>Worked example.</strong> For <span class="formula">x(t) = A·sin(2πft + φ)</span> the angle-addition rule gives ' +
        '<span class="formula">A·sin(θ + φ) = A·sin φ·cos θ + A·cos φ·sin θ</span> with θ = 2πft. The cosine term is even and the sine term is odd, so ' +
        '<span class="formula">xₑ = A·sin φ·cos(2πft)</span> and <span class="formula">xₒ = A·cos φ·sin(2πft)</span>. ' +
        'With φ = 0 a sine is purely odd; with φ = π/2 it becomes a cosine and is purely even. Try both with the phase buttons.</p>' +
      '<p><strong>Discrete signals.</strong> For x[n] the same formulas use whole numbers: ' +
        '<span class="formula">xₑ[n] = (x[n] + x[−n]) / 2</span> and <span class="formula">xₒ[n] = (x[n] − x[−n]) / 2</span>. ' +
        'x[−n] is just another sample, read from the formula at the index −n. Nothing is interpolated, and the range is n = −N, …, N so every n has its mirror −n.</p>' +
      '<p><strong>Square wave.</strong> A square wave jumps, so at a jump (and at t = 0) the program uses the value +A or −A by its convention. ' +
        'That can leave isolated single points, for example xₑ(0) = A, in the even part. They are exact consequences of the formulas, not errors.</p>';
  }

  /* =========================================================
     2. READING THE CONTROLS
     ========================================================= */

  function currentMode() {
    return document.querySelector('input[name="eo-mode"]:checked').value;
  }

  function readInputs() {
    return {
      type:      $("eo-type").value,
      mode:      currentMode(),
      amplitude: $("eo-amplitude").value,
      frequency: $("eo-frequency").value,
      phase:     $("eo-phase").value,
      halfWidth: $("eo-halfWidth").value
    };
  }

  /* Switching representation: new labels, slider range and starting values. */
  function applyMode(mode) {
    const d = DEFAULTS[mode];
    const isDiscrete = mode === "discrete";

    document.querySelector('label[for="eo-frequency"]').textContent = isDiscrete ? "Frequency (f), in cycles per sample" : "Frequency (f), in Hz";
    $("eo-frequency-hint").textContent = isDiscrete
      ? "Cycles per sample, up to 0.5. f = 0.05 means one cycle every 20 samples."
      : "Cycles per second.";
    $("eo-halfWidth-label").textContent = isDiscrete ? "Range N (samples)" : "Range T (s)";
    $("eo-halfWidth-hint").textContent = isDiscrete
      ? "A whole number. n runs from −N to N, so there are 2N + 1 samples."
      : "The plots run from −T to T, always symmetric around 0.";

    const slider = $("eo-frequency-slider");
    slider.min = d.slider.min; slider.max = d.slider.max; slider.step = d.slider.step;
    $("eo-frequency").value = d.frequency;
    slider.value = d.frequency;
    $("eo-halfWidth").value = d.halfWidth;
  }

  /* =========================================================
     3. SHOWING RESULTS
     ========================================================= */

  function showFieldErrors(errors) {
    FIELD_NAMES.forEach(function (name) {
      const message = errors[name] || "";
      $("eo-" + name + "-error").textContent = message;
      const input = $("eo-" + name);
      input.classList.toggle("is-invalid", message !== "");
      input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
    });
  }

  function statHtml(label, value) {
    return '<div class="stat"><div class="stat-label">' + label + '</div>' +
           '<div class="stat-value">' + value + '</div></div>';
  }

  function checkRowHtml(ok, text) {
    return '<li><span class="' + (ok ? "status-ok" : "status-fail") + '">' + (ok ? "✔" : "✘") + '</span><span>' + text + '</span></li>';
  }

  /* Wording for the classification of the signal. */
  function classificationText(kind) {
    if (kind === "even") { return "Even (the odd part is 0)"; }
    if (kind === "odd")  { return "Odd (the even part is 0)"; }
    return "Neither (both parts are non-zero)";
  }

  /* A sample with t > 0 for the worked example under the plots: where BOTH
     parts are as large as possible (so the example shows something). If one
     part is 0 everywhere, the point where x is largest. */
  function pickExampleIndex(result) {
    let bestIndex = -1;
    let bestScore = -1;
    for (let i = 0; i < result.t.length; i++) {
      if (result.t[i] <= 0) { continue; }
      const score = Math.min(Math.abs(result.even[i]), Math.abs(result.odd[i]));
      if (score > bestScore + 1e-12) { bestScore = score; bestIndex = i; }
    }
    if (bestScore > 1e-9) { return bestIndex; }
    bestIndex = result.t.length - 1;
    let bestValue = -1;
    for (let i = 0; i < result.t.length; i++) {
      if (result.t[i] > 0 && Math.abs(result.x[i]) > bestValue + 1e-12) { bestValue = Math.abs(result.x[i]); bestIndex = i; }
    }
    return bestIndex;
  }

  /* " + 0.5" or " − 0.5": avoids writing "+ -0.5". */
  function signedTerm(value) {
    const text = formatNumber(value);
    return text.charAt(0) === "-" ? " − " + text.slice(1) : " + " + text;
  }

  function showReadout(values, result) {
    const isDiscrete = result.isDiscrete;
    const arg = isDiscrete ? "n" : "t";
    const open = isDiscrete ? "[" : "(";
    const close = isDiscrete ? "]" : ")";
    const fn = function (name, a) { return name + open + a + close; };
    const v = result.verification;

    const i = pickExampleIndex(result);
    const where = arg + " = " + formatNumber(result.t[i]);

    let html = "";
    html += '<span class="formula formula-block">Reconstruction:  ' + fn("x", arg) + ' = ' + fn("xₑ", arg) + ' + ' + fn("xₒ", arg) + '</span>';
    html += '<span class="formula formula-block">At ' + where + ':  ' + formatNumber(result.x[i]) + ' = ' +
            formatNumber(result.even[i]) + signedTerm(result.odd[i]) + '</span>';

    html += '<div class="stat-grid">';
    html += statHtml("Signal is", classificationText(result.classification));
    html += statHtml("Samples shown", result.t.length);
    html += statHtml("Largest |x − (xₑ + xₒ)|", formatError(v.reconstructionError));
    html += '</div>';

    html += '<h4>Mathematical verification (tolerance ' + formatError(v.tolerance) + ')</h4>';
    html += '<ul class="status-list">';
    html += checkRowHtml(v.reconstructionOk, 'Reconstruction: ' + fn("x", arg) + ' = ' + fn("xₑ", arg) + ' + ' + fn("xₒ", arg) +
            ' at every point. Largest difference ' + formatError(v.reconstructionError) + '.');
    html += checkRowHtml(v.evenOk, 'Even: ' + fn("xₑ", "−" + arg) + ' = ' + fn("xₑ", arg) +
            ' at every mirrored pair. Largest difference ' + formatError(v.evenSymmetryError) + '.');
    html += checkRowHtml(v.oddOk, 'Odd: ' + fn("xₒ", "−" + arg) + ' = −' + fn("xₒ", arg) +
            ' at every mirrored pair, and xₒ at 0 is 0. Largest difference ' + formatError(Math.max(v.oddSymmetryError, v.oddAtZeroError)) + '.');
    html += '</ul>';
    html += '<div class="message ' + (v.passed ? 'message-ok' : 'message-error') + '">' +
            (v.passed ? 'Verified: the original signal equals the sum of its even and odd parts.'
                      : 'Verification FAILED: the parts do not add up to the original.') + '</div>';

    $("evenodd-readout").innerHTML = html;
  }

  function showErrorSummary() {
    $("evenodd-readout").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plots below still show your last valid signal.</div>';
  }

  /* Draws one of the three plots with the right core plot function. */
  function drawOne(divId, title, yLabel, result, y, color, name, yLimit) {
    const trace = { x: result.t, y: y, name: name, color: color };
    const options = { title: title, yRange: [-yLimit, yLimit], height: 300 };
    if (result.isDiscrete) {
      options.xLabel = "n";
      options.yLabel = yLabel;
      options.autoXTicks = result.t.length > 21;   // one tick per integer while it fits
      SignalLab.plot.plotStem(divId, [trace], options);
    } else {
      options.xLabel = "t (s)";
      options.yLabel = yLabel;
      SignalLab.plot.plotContinuous(divId, [trace], options);
    }
  }

  function drawPlots(values, result) {
    const d = result.isDiscrete;
    const limit = values.spec.amplitude * 1.15;      // same vertical scale on all three
    drawOne("evenodd-plot",      "Original signal " + (d ? "x[n]" : "x(t)") + " (" + TYPE_LABELS[values.spec.type].toLowerCase() + ")",
            d ? "x[n]" : "x(t)", result, result.x, COLORS.cyan, "x", limit);
    drawOne("evenodd-plot-even", "Even component " + (d ? "xₑ[n]" : "xₑ(t)"),
            d ? "xₑ[n]" : "xₑ(t)", result, result.even, COLORS.green, "xₑ", limit);
    drawOne("evenodd-plot-odd",  "Odd component " + (d ? "xₒ[n]" : "xₒ(t)"),
            d ? "xₒ[n]" : "xₒ(t)", result, result.odd, COLORS.magenta, "xₒ", limit);
  }

  /* =========================================================
     4. THE UPDATE LOOP: read -> check -> calculate -> draw
     ========================================================= */
  function update() {
    const m = MATH();
    const checked = m.validateInputs(readInputs());
    showFieldErrors(checked.errors);
    if (!checked.ok) {
      showErrorSummary();
      return;
    }
    const result = m.computeResult(checked.values);
    showReadout(checked.values, result);
    drawPlots(checked.values, result);
  }

  /* =========================================================
     5. EVENTS
     ========================================================= */
  function setUpEvents() {
    const controls = $("evenodd-controls");

    controls.addEventListener("input", function (event) {
      const id = event.target.id;

      if (event.target.name === "eo-mode") {
        applyMode(event.target.value);
      } else if (id.endsWith("-slider")) {
        $(id.replace("-slider", "")).value = event.target.value;
      } else {
        const slider = $(id + "-slider");
        if (slider && event.target.value.trim() !== "" && isFinite(Number(event.target.value))) {
          slider.value = event.target.value;
        }
      }
      update();
    });

    controls.addEventListener("click", function (event) {
      const button = event.target.closest("[data-phase]");
      if (!button) { return; }
      $("eo-phase").value = button.dataset.phase;
      $("eo-phase-slider").value = button.dataset.phase;
      update();
    });
  }

  /* =========================================================
     6. START
     ========================================================= */
  function init() {
    buildControls();
    buildExplanation();
    setUpEvents();
    update();
  }

  SignalLab.modules.evenodd = { init: init };

})();

/* ==========================================================
   generator.ui.js  (Person 2)
   Signal Generator: USER INTERFACE.
   Builds the controls, reads them, calls generator.math.js, and draws.

   Containers (from index.html):
     #generator-controls   the inputs (built here)
     #generator-readout    formula, numbers and warnings above the plot
     #generator-plot       the Plotly graph
     #generator-explain    the plain-language explanation (built here)
   ========================================================== */
(function () {

  const MATH = function () { return SignalLab.math.generator; };

  // Every input has the id "gen-" + one of these names
  const FIELD_NAMES = ["type", "amplitude", "frequency", "phase", "startTime", "endTime", "numSamples"];

  const TYPE_INFO = {
    sine:   { label: "Sine wave",   color: SignalLab.plot.COLORS.cyan },
    cosine: { label: "Cosine wave", color: SignalLab.plot.COLORS.magenta },
    square: { label: "Square wave", color: SignalLab.plot.COLORS.amber }
  };

  /* Shortcut: find an element by id */
  function $(id) { return document.getElementById(id); }

  /* ---------------------------------------------------------
     formatNumber(value)
     Shows at most 6 significant digits: 0.30000000000000004 -> 0.3
     --------------------------------------------------------- */
  function formatNumber(value) {
    return String(Number(value.toPrecision(6)));
  }

  /* =========================================================
     1. BUILDING THE CONTROLS
     ========================================================= */

  /* A number box. Every field also gets an empty spot for its error message. */
  function numberFieldHtml(name, label, value, hint) {
    return '<div class="field" id="gen-' + name + '-field">' +
             '<label for="gen-' + name + '">' + label + '</label>' +
             '<input type="number" id="gen-' + name + '" step="any" value="' + value + '">' +
             (hint ? '<p class="field-hint">' + hint + '</p>' : '') +
             '<p class="field-error" id="gen-' + name + '-error" role="alert"></p>' +
           '</div>';
  }

  /* A number box PLUS a slider that stay in sync. */
  function sliderFieldHtml(name, label, value, min, max, step, hint, extraHtml) {
    return '<div class="field" id="gen-' + name + '-field">' +
             '<label for="gen-' + name + '">' + label + '</label>' +
             '<input type="number" id="gen-' + name + '" step="any" value="' + value + '">' +
             '<input type="range" id="gen-' + name + '-slider" aria-label="' + label + ' slider"' +
                 ' min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
             (hint ? '<p class="field-hint">' + hint + '</p>' : '') +
             (extraHtml || '') +
             '<p class="field-error" id="gen-' + name + '-error" role="alert"></p>' +
           '</div>';
  }

  function buildControls() {
    const phasePresets =
      '<div class="btn-row" aria-label="Phase presets">' +
        '<button type="button" class="btn btn-small" data-phase="0">0</button>' +
        '<button type="button" class="btn btn-small" data-phase="' + Math.PI / 2 + '">π/2</button>' +
        '<button type="button" class="btn btn-small" data-phase="' + Math.PI + '">π</button>' +
        '<button type="button" class="btn btn-small" data-phase="' + (-Math.PI / 2) + '">−π/2</button>' +
      '</div>';

    $("generator-controls").innerHTML =
      '<div class="field">' +
        '<label for="gen-type">Signal type</label>' +
        '<select id="gen-type">' +
          '<option value="sine">Sine wave</option>' +
          '<option value="cosine">Cosine wave</option>' +
          '<option value="square">Square wave</option>' +
        '</select>' +
        '<p class="field-error" id="gen-type-error" role="alert"></p>' +
      '</div>' +

      '<div class="field">' +
        '<span class="field-label" id="gen-mode-label">Representation</span>' +
        '<div class="segmented" role="radiogroup" aria-labelledby="gen-mode-label">' +
          '<input type="radio" name="gen-mode" id="gen-mode-continuous" value="continuous" checked>' +
          '<label for="gen-mode-continuous">Continuous</label>' +
          '<input type="radio" name="gen-mode" id="gen-mode-discrete" value="discrete">' +
          '<label for="gen-mode-discrete">Discrete</label>' +
        '</div>' +
      '</div>' +

      sliderFieldHtml("amplitude", "Amplitude (A)", 1, 0.1, 3, 0.1, "How tall the wave is.") +
      sliderFieldHtml("frequency", "Frequency (f), in Hz", 1, 0.1, 10, 0.1, "Cycles per second.") +
      sliderFieldHtml("phase", "Phase (φ), in radians", 0, -6.28, 6.28, 0.01,
                      "Shifts the wave in time. π ≈ 3.14159.", phasePresets) +

      '<div class="field-pair">' +
        numberFieldHtml("startTime", "Start time (s)", -1) +
        numberFieldHtml("endTime", "End time (s)", 1) +
      '</div>' +

      '<div id="gen-numSamples-group" hidden>' +
        numberFieldHtml("numSamples", "Number of samples (N)", 41,
                        "Used for discrete signals (2 to 500). N samples are spread evenly from start to end.") +
      '</div>';
  }

  /* The explanation text is fixed, so we write it once. */
  function buildExplanation() {
    $("generator-explain").innerHTML =
      '<p>A signal is a value that changes with time. Three numbers shape these waves:</p>' +
      '<ul>' +
        '<li><strong>Amplitude (A)</strong> is how tall the wave is: the biggest value it reaches. Doubling A doubles every value of the signal.</li>' +
        '<li><strong>Frequency (f)</strong> is how many full cycles happen each second, in hertz (Hz). One cycle lasts the period <span class="formula">T = 1/f</span>. At f = 2 Hz, T = 0.5 s.</li>' +
        '<li><strong>Phase (φ)</strong> slides the wave along the time axis. It is measured in radians, and one full cycle is 2π ≈ 6.28 radians. A positive φ moves the wave to the left (earlier) by φ/(2πf) seconds.</li>' +
      '</ul>' +
      '<p><strong>Sine and cosine</strong> are the same wave, a quarter cycle apart: <span class="formula">cos(θ) = sin(θ + π/2)</span>. Try a sine wave with φ = π/2 and compare it with a cosine wave.</p>' +
      '<p><strong>Square wave.</strong> <span class="formula">sign(x)</span> is +1 when x is positive and −1 when x is negative. So the square wave is +A while the sine is positive and −A while it is negative. Exactly where the sine crosses zero, sign(0) would be 0, so the program uses +A when the sine is about to turn positive and −A when it is about to turn negative.</p>' +
      '<p><strong>Continuous vs discrete.</strong> A continuous signal has a value at every instant, so we draw many close points as a smooth line. A discrete signal keeps only N samples, at the times <span class="formula">t[n] = start + n·Ts</span>, and shows each as a stem. The spacing is <span class="formula">Ts = (end − start) / (N − 1)</span>. To show a wave correctly you need more than 2 samples per cycle (f &lt; fs/2, where fs = 1/Ts). With fewer, the stems look like a slower wave that is not really there. This is called aliasing.</p>';
  }

  /* =========================================================
     2. READING THE CONTROLS
     ========================================================= */

  /* Collects what the user typed in every control. All values are text. */
  function readInputs() {
    return {
      type:       $("gen-type").value,
      mode:       document.querySelector('input[name="gen-mode"]:checked').value,
      amplitude:  $("gen-amplitude").value,
      frequency:  $("gen-frequency").value,
      phase:      $("gen-phase").value,
      startTime:  $("gen-startTime").value,
      endTime:    $("gen-endTime").value,
      numSamples: $("gen-numSamples").value
    };
  }

  /* Shows or hides the "Number of samples" box depending on the mode. */
  function updateSamplesVisibility(mode) {
    $("gen-numSamples-group").hidden = (mode !== "discrete");
  }

  /* =========================================================
     3. SHOWING RESULTS
     ========================================================= */

  /* Puts each error message under its field and marks the field red. */
  function showFieldErrors(errors) {
    FIELD_NAMES.forEach(function (name) {
      const message = errors[name] || "";
      $("gen-" + name + "-error").textContent = message;
      const input = $("gen-" + name);
      input.classList.toggle("is-invalid", message !== "");
      input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
    });
  }

  /* The phase part of the formula: "" for 0, " + 0.5" or " − 0.5" otherwise. */
  function phaseText(phase) {
    if (phase === 0) { return ""; }
    return phase > 0 ? " + " + formatNumber(phase) : " − " + formatNumber(-phase);
  }

  /* The formula with the user's numbers plugged in. */
  function formulaWithValues(v) {
    const angle = "2π·" + formatNumber(v.frequency) + "·t" + phaseText(v.phase);
    const A = formatNumber(v.amplitude);
    if (v.type === "sine")   { return "x(t) = " + A + "·sin(" + angle + ")"; }
    if (v.type === "cosine") { return "x(t) = " + A + "·cos(" + angle + ")"; }
    return "x(t) = " + A + "·sign(sin(" + angle + "))";
  }

  /* The general formula (letters, no numbers). */
  function generalFormula(type) {
    if (type === "sine")   { return "x(t) = A·sin(2πft + φ)"; }
    if (type === "cosine") { return "x(t) = A·cos(2πft + φ)"; }
    return "x(t) = A·sign(sin(2πft + φ))";
  }

  /* One small box with a label and a value. */
  function statHtml(label, value) {
    return '<div class="stat"><div class="stat-label">' + label + '</div>' +
           '<div class="stat-value">' + value + '</div></div>';
  }

  /* Shows the formula, the key numbers and any warnings above the plot.
     Everything inserted here is built from numbers we formatted ourselves,
     so it is safe to use innerHTML. */
  function showReadout(v, signal) {
    const m = MATH();
    let html = "";

    html += '<span class="formula formula-block">' + generalFormula(v.type) + '</span>';
    html += '<span class="formula formula-block">' + formulaWithValues(v) + '</span>';

    if (signal.isDiscrete) {
      html += '<span class="formula formula-block">x[n] = x(t[n]),  t[n] = ' + formatNumber(v.startTime) +
              ' + n·' + formatNumber(signal.samplePeriod) + ',  n = 0, 1, …, ' + (v.numSamples - 1) + '</span>';
    }

    html += '<div class="stat-grid">';
    html += statHtml("Period T = 1/f", formatNumber(m.getPeriod(v.frequency)) + " s");
    html += statHtml("Cycles shown", formatNumber(m.countCycles(v.frequency, v.startTime, v.endTime)));
    if (signal.isDiscrete) {
      html += statHtml("Samples N", v.numSamples);
      html += statHtml("Spacing Ts", formatNumber(signal.samplePeriod) + " s");
      html += statHtml("Sampling rate fs", formatNumber(1 / signal.samplePeriod) + " Hz");
    }
    html += '</div>';

    if (signal.isDiscrete && m.hasAliasing(v.frequency, signal.samplePeriod)) {
      html += '<div class="message message-warning">Aliasing: the frequency (' + formatNumber(v.frequency) +
              ' Hz) is at or above half the sampling rate (' + formatNumber(0.5 / signal.samplePeriod) +
              ' Hz), so these stems do not show the real wave. Increase N or lower the frequency.</div>';
    }

    $("generator-readout").innerHTML = html;
  }

  /* Shown instead of the readout while the inputs are invalid. */
  function showErrorSummary() {
    $("generator-readout").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plot below still shows your last valid signal.</div>';
  }

  /* Draws the signal with the right core plot function. */
  function drawPlot(v, signal) {
    const info = TYPE_INFO[v.type];
    const trace = { x: signal.t, y: signal.y, name: info.label, color: info.color };

    // Fixed vertical range so a bigger amplitude LOOKS bigger
    const limit = Math.max(3, v.amplitude) * 1.15;
    const options = {
      title: info.label + " (" + v.mode + ")",
      xLabel: "t (s)",
      yRange: [-limit, limit]
    };

    if (signal.isDiscrete) {
      options.yLabel = "x[n]";
      options.autoXTicks = true;      // x axis is time, not integer n
      SignalLab.plot.plotStem("generator-plot", [trace], options);
    } else {
      options.yLabel = "x(t)";
      SignalLab.plot.plotContinuous("generator-plot", [trace], options);
    }
  }

  /* =========================================================
     4. THE UPDATE LOOP: read -> check -> calculate -> draw
     ========================================================= */
  function update() {
    const m = MATH();
    const result = m.validateInputs(readInputs());
    showFieldErrors(result.errors);

    if (!result.ok) {
      showErrorSummary();
      return;
    }
    const signal = m.generateSignal(result.values);
    showReadout(result.values, signal);
    drawPlot(result.values, signal);
  }

  /* =========================================================
     5. EVENTS
     ========================================================= */
  function setUpEvents() {
    const controls = $("generator-controls");

    // One listener catches typing, sliders, the dropdown and the radio buttons.
    controls.addEventListener("input", function (event) {
      const id = event.target.id;

      if (id.endsWith("-slider")) {
        // Slider moved -> copy its value into the number box
        $(id.replace("-slider", "")).value = event.target.value;
      } else {
        // Number box changed -> move the slider (if this field has one)
        const slider = $(id + "-slider");
        if (slider && event.target.value.trim() !== "" && isFinite(Number(event.target.value))) {
          slider.value = event.target.value;
        }
      }

      if (event.target.name === "gen-mode") { updateSamplesVisibility(event.target.value); }
      update();
    });

    // Phase preset buttons (0, π/2, π, −π/2)
    controls.addEventListener("click", function (event) {
      const button = event.target.closest("[data-phase]");
      if (!button) { return; }
      $("gen-phase").value = button.dataset.phase;
      $("gen-phase-slider").value = button.dataset.phase;
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
    update();               // draw the first plot
  }

  SignalLab.modules.generator = { init: init };

})();

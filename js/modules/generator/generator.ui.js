(function () {

  const MATH = function () { return SignalLab.math.generator; };
  const FIELD_NAMES = ["type", "amplitude", "frequency", "phase", "startTime", "endTime", "numSamples"];

  const TYPE_INFO = {
    sine:   { label: "Sine wave",   color: SignalLab.plot.COLORS.cyan },
    cosine: { label: "Cosine wave", color: SignalLab.plot.COLORS.magenta },
    square: { label: "Square wave", color: SignalLab.plot.COLORS.amber }
  };
  function $(id) { return document.getElementById(id); }
  function formatNumber(value) {
    return String(Number(value.toPrecision(6)));
  }
  function numberFieldHtml(name, label, value, hint) {
    return '<div class="field" id="gen-' + name + '-field">' +
             '<label for="gen-' + name + '">' + label + '</label>' +
             '<input type="number" id="gen-' + name + '" step="any" value="' + value + '">' +
             (hint ? '<p class="field-hint">' + hint + '</p>' : '') +
             '<p class="field-error" id="gen-' + name + '-error" role="alert"></p>' +
           '</div>';
  }
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
  function updateSamplesVisibility(mode) {
    $("gen-numSamples-group").hidden = (mode !== "discrete");
  }
  function showFieldErrors(errors) {
    FIELD_NAMES.forEach(function (name) {
      const message = errors[name] || "";
      $("gen-" + name + "-error").textContent = message;
      const input = $("gen-" + name);
      input.classList.toggle("is-invalid", message !== "");
      input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
    });
  }
  function phaseText(phase) {
    if (phase === 0) { return ""; }
    return phase > 0 ? " + " + formatNumber(phase) : " − " + formatNumber(-phase);
  }
  function formulaWithValues(v) {
    const angle = "2π·" + formatNumber(v.frequency) + "·t" + phaseText(v.phase);
    const A = formatNumber(v.amplitude);
    if (v.type === "sine")   { return "x(t) = " + A + "·sin(" + angle + ")"; }
    if (v.type === "cosine") { return "x(t) = " + A + "·cos(" + angle + ")"; }
    return "x(t) = " + A + "·sign(sin(" + angle + "))";
  }
  function generalFormula(type) {
    if (type === "sine")   { return "x(t) = A·sin(2πft + φ)"; }
    if (type === "cosine") { return "x(t) = A·cos(2πft + φ)"; }
    return "x(t) = A·sign(sin(2πft + φ))";
  }
  function statHtml(label, value) {
    return '<div class="stat"><div class="stat-label">' + label + '</div>' +
           '<div class="stat-value">' + value + '</div></div>';
  }
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
  function showErrorSummary() {
    $("generator-readout").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plot below still shows your last valid signal.</div>';
  }
  function drawPlot(v, signal) {
    const info = TYPE_INFO[v.type];
    const trace = { x: signal.t, y: signal.y, name: info.label, color: info.color };
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
  function setUpEvents() {
    const controls = $("generator-controls");
    controls.addEventListener("input", function (event) {
      const id = event.target.id;

      if (id.endsWith("-slider")) {
        $(id.replace("-slider", "")).value = event.target.value;
      } else {
        const slider = $(id + "-slider");
        if (slider && event.target.value.trim() !== "" && isFinite(Number(event.target.value))) {
          slider.value = event.target.value;
        }
      }

      if (event.target.name === "gen-mode") { updateSamplesVisibility(event.target.value); }
      update();
    });
    controls.addEventListener("click", function (event) {
      const button = event.target.closest("[data-phase]");
      if (!button) { return; }
      $("gen-phase").value = button.dataset.phase;
      $("gen-phase-slider").value = button.dataset.phase;
      update();
    });
  }
  function init() {
    buildControls();
    setUpEvents();
    update();               // draw the first plot
  }

  SignalLab.modules.generator = { init: init };

})();
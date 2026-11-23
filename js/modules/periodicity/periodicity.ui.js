(function () {

  const MATH = function () { return SignalLab.math.periodicity; };
  const COLORS = SignalLab.plot.COLORS;

  const FIELDS = ["type", "amplitude", "frequency", "phase"];
  const SIGNAL_COLORS = [COLORS.cyan, COLORS.amber, COLORS.green, "#60a5fa"];
  const DEFAULTS = {
    continuous: [{ type: "sine", amplitude: "1", frequency: "1", phase: "0" }, { type: "sine", amplitude: "1", frequency: "2", phase: "0" }],
    discrete:   [{ type: "sine", amplitude: "1", frequency: "1/4", phase: "0" }, { type: "sine", amplitude: "1", frequency: "1/6", phase: "0" }]
  };
  function newComponent(mode) {
    return { type: "sine", amplitude: "1", phase: "0",
             frequency: mode === "discrete" ? "1/" + (components.length + 6) : String(components.length + 1) };
  }
  const EXAMPLES = {
    continuous: [
      { label: "sin(2πt) + sin(4πt)", parts: [["sine", "1", "1", "0"], ["sine", "1", "2", "0"]] },
      { label: "Single sine, f = 2 Hz", parts: [["sine", "1", "2", "0"]] },
      { label: "Single cosine, f = 3/4 Hz", parts: [["cosine", "1", "3/4", "0"]] },
      { label: "Negative frequency, f = -2 Hz", parts: [["sine", "1", "-2", "0"]] },
      { label: "Constant signal, f = 0", parts: [["sine", "1", "0", "pi/2"]] },
      { label: "1/2 Hz + 3/4 Hz", parts: [["sine", "1", "1/2", "0"], ["sine", "1", "3/4", "0"]] },
      { label: "1 Hz + √2 Hz", parts: [["sine", "1", "1", "0"], ["sine", "1", "sqrt(2)", "0"]] },
      { label: "1 Hz + π Hz", parts: [["sine", "1", "1", "0"], ["sine", "1", "pi", "0"]] },
      { label: "π Hz + 2π Hz", parts: [["sine", "1", "pi", "0"], ["sine", "1", "2*pi", "0"]] },
      { label: "cos(2πt) + sin(4πt)", parts: [["cosine", "1", "1", "0"], ["sine", "1", "2", "0"]] },
      { label: "cos(2πt) + sin(2πt)", parts: [["cosine", "1", "1", "0"], ["sine", "1", "1", "0"]] },
      { label: "sin(2πt) + sin(2πt + π)", parts: [["sine", "1", "1", "0"], ["sine", "1", "1", "pi"]] }
    ],
    discrete: [
      { label: "Single sine, f = 3/8", parts: [["sine", "1", "3/8", "0"]] },
      { label: "Sum: f = 1/4 and f = 1/6", parts: [["sine", "1", "1/4", "0"], ["sine", "1", "1/6", "0"]] },
      { label: "Single sine, f = √2/10", parts: [["sine", "1", "sqrt(2)/10", "0"]] },
      { label: "Sum: f = 1/4 and f = √2/10", parts: [["sine", "1", "1/4", "0"], ["sine", "1", "sqrt(2)/10", "0"]] },
      { label: "Single cosine, f = 1/2, φ = 0", parts: [["cosine", "1", "1/2", "0"]] },
      { label: "Single sine, f = 1/2, φ = 0", parts: [["sine", "1", "1/2", "0"]] },
      { label: "Single sine, f = 5/4", parts: [["sine", "1", "5/4", "0"]] },
      { label: "Single sine, f = 0.3333", parts: [["sine", "1", "0.3333", "0"]] }
    ]
  };

  let components = [];          // the text typed in each signal row
  let drawnPlots = 0;           // how many plot boxes exist right now

  function $(id) { return document.getElementById(id); }

  function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function currentMode() { return document.querySelector('input[name="pe-mode"]:checked').value; }
  function currentKind() { return document.querySelector('input[name="pe-kind"]:checked').value; }
  function activeComponents() {
    return currentKind() === "single" ? components.slice(0, 1) : components;
  }
  function segmentedHtml(name, label, options, checked) {
    return '<div class="field">' +
      '<span class="field-label" id="pe-' + name + '-label">' + label + '</span>' +
      '<div class="segmented" role="radiogroup" aria-labelledby="pe-' + name + '-label">' +
        options.map(function (o) {
          return '<input type="radio" name="pe-' + name + '" id="pe-' + name + '-' + o[0] + '" value="' + o[0] + '"' + (o[0] === checked ? ' checked' : '') + '>' +
                 '<label for="pe-' + name + '-' + o[0] + '">' + o[1] + '</label>';
        }).join("") +
      '</div></div>';
  }

  function buildControls() {
    $("periodicity-controls").innerHTML =
      segmentedHtml("mode", "Representation", [["continuous", "Continuous"], ["discrete", "Discrete"]], "continuous") +
      segmentedHtml("kind", "Signal", [["single", "Single Signal"], ["sum", "Sum of Signals"]], "sum") +
      '<div class="field">' +
        '<label for="pe-example">Try a Preset</label>' +
        '<select id="pe-example" aria-describedby="pe-example-hint"></select>' +
        '<p class="field-hint" id="pe-example-hint">Load predefined signal settings to explore different periodicity cases.</p>' +
      '</div>' +
      '<div id="pe-components"></div>' +
      '<p class="field-hint" id="pe-count-hint"></p>' +
      '<div class="control-group">' +
        '<div class="field" id="pe-window-field">' +
          '<label for="pe-window" id="pe-window-label">Plot window (optional)</label>' +
          '<input type="text" id="pe-window" autocomplete="off" placeholder="automatic">' +
          '<p class="field-hint" id="pe-window-hint"></p>' +
          '<p class="field-error" id="pe-window-error" role="alert"></p>' +
        '</div>' +
      '</div>';
  }

  function fillExamples(mode) {
    $("pe-example").innerHTML = '<option value="">Select a preset...</option>' + EXAMPLES[mode].map(function (e, i) {
      return '<option value="' + i + '">' + escapeHtml(e.label) + '</option>';
    }).join("");
  }

  function componentHtml(item, index, mode, kind) {
    const isDiscrete = mode === "discrete";
    const freqLabel = isDiscrete ? "Frequency f (cycles per sample)" : "Frequency f (Hz)";
    const hint = isDiscrete
      ? "Fractions are exact: 1/8, 3/8, 0.125. Irrational: sqrt(2)/10."
      : "Fractions are exact: 3/4, 0.75. Irrational: sqrt(2), pi, 2*pi.";
    const id = function (name) { return 'pe-' + name + '-' + index; };
    function field(name, label, value, extra) {
      return '<div class="field">' +
        '<label for="' + id(name) + '">' + label + '</label>' +
        '<input type="text" id="' + id(name) + '" data-field="' + name + '" data-index="' + index + '" value="' + escapeHtml(value) + '" autocomplete="off" spellcheck="false">' +
        (extra || '') +
        '<p class="field-error" id="' + id(name) + '-error" role="alert"></p>' +
      '</div>';
    }
    const title = kind === "single" ? "Signal" : "Signal " + (index + 1);
    return '<div class="control-group" data-component="' + index + '">' +
      '<div class="component-head"><span class="field-label">' + title + '</span>' +
      '</div>' +
      '<div class="field">' +
        '<label for="' + id("type") + '">Waveform</label>' +
        '<select id="' + id("type") + '" data-field="type" data-index="' + index + '">' +
          '<option value="sine"' + (item.type === "sine" ? ' selected' : '') + '>Sine: A·sin(2πf' + (isDiscrete ? 'n' : 't') + ' + φ)</option>' +
          '<option value="cosine"' + (item.type === "cosine" ? ' selected' : '') + '>Cosine: A·cos(2πf' + (isDiscrete ? 'n' : 't') + ' + φ)</option>' +
        '</select>' +
        '<p class="field-error" id="' + id("type") + '-error" role="alert"></p>' +
      '</div>' +
      field("amplitude", "Amplitude (A)", item.amplitude) +
      field("frequency", freqLabel, item.frequency, '<p class="field-hint">' + hint + '</p>') +
      field("phase", "Phase (φ), in radians", item.phase, '<p class="field-hint">A number or an exact form such as pi/2.</p>') +
    '</div>';
  }

  function renderComponents() {
    const mode = currentMode();
    const kind = currentKind();
    const max = 2;
    const shown = activeComponents();
    $("pe-components").innerHTML = shown.map(function (item, i) {
      return componentHtml(item, i, mode, kind);
    }).join("");

    $("pe-count-hint").textContent = kind === "single"
      ? "One sinusoid: its own period. Choose “Sum of Signals” to add more."
      : "A sum of " + shown.length + " signals (2 to " + max + ").";
    $("pe-count-hint").hidden = false;
  }

  function applyMode(mode) {
    const isDiscrete = mode === "discrete";
    components = DEFAULTS[mode].map(function (c) { return Object.assign({}, c); });
    fillExamples(mode);
    $("pe-window").value = "";
    $("pe-window-hint").textContent = isDiscrete
      ? "Leave empty for an automatic window. Otherwise: the last sample number n (a whole number, at most 200)."
      : "Leave empty for an automatic window. Otherwise: the last time in seconds (at most 100).";
    renderComponents();
  }
  function readInputs() {
    return {
      mode: currentMode(),
      window: $("pe-window").value,
      components: activeComponents().map(function (c) {
        return { type: c.type, amplitude: c.amplitude, frequency: c.frequency, phase: c.phase };
      })
    };
  }
  function showFieldErrors(errors) {
    activeComponents().forEach(function (c, i) {
      const e = errors.components[i] || {};
      FIELDS.forEach(function (name) {
        const input = $("pe-" + name + "-" + i);
        const message = e[name] || "";
        $("pe-" + name + "-" + i + "-error").textContent = message;
        input.classList.toggle("is-invalid", message !== "");
        input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
      });
    });
    const w = errors.window || "";
    $("pe-window-error").textContent = w;
    $("pe-window").classList.toggle("is-invalid", w !== "");
    $("pe-window").setAttribute("aria-invalid", w !== "" ? "true" : "false");
  }
  function showResult(values, analysis) {
    const m = MATH();
    const isDiscrete = analysis.isDiscrete;
    let periodBlock = "";
    if (analysis.fundamental) {
      let value = (isDiscrete ? "N₀ = " : "T₀ = ") + escapeHtml(analysis.fundamental.text);
      if (!isDiscrete && analysis.fundamental.exact && !m.exactIsRational(analysis.fundamental.exact)) {
        value += " ≈ " + m.formatNumber(analysis.fundamental.value) + " s";
      }
      if (analysis.constant) { value += " (constant)"; }
      periodBlock = '<div class="result-period"><span class="result-period-label">Fundamental period</span>' +
                    '<span class="result-period-value">' + value + '</span></div>';
    } else if (analysis.constant) {
      periodBlock = '<div class="result-period"><span class="result-period-label">Fundamental period</span>' +
                    '<span class="result-period-value">none: no smallest positive period</span></div>';
    }

    let facts = '<div><dt>Frequencies used</dt><dd>' + analysis.frequencies.map(escapeHtml).join('<br>') + '</dd></div>';
    if (analysis.ratio) {
      facts += '<div><dt>Frequency ratio</dt><dd>' + escapeHtml(analysis.ratio.text) + '</dd></div>';
    }
    facts += '<div><dt>Why</dt><dd>' + escapeHtml(analysis.why) + '</dd></div>';

    let check = "";
    if (analysis.fundamental) {
      const error = m.verifyPeriod(values, analysis.fundamental.value);
      const difference = isDiscrete ? "x[n + N₀] − x[n]" : "x(t + T₀) − x(t)";
      check = '<p class="field-hint">Numerical sanity check (not the proof): ' +
        (error === null ? "skipped (period too long)" : "max |" + difference + "| = " + (error === 0 ? "0" : error.toExponential(1))) + '.</p>';
    }

    $("periodicity-result").innerHTML =
      '<div class="result-card ' + (analysis.periodic ? "is-periodic" : "is-aperiodic") + '" role="status">' +
        '<div class="result-head"><div class="result-verdict">' + escapeHtml(analysis.verdict.toUpperCase()) + '</div>' + periodBlock + '</div>' +
        '<dl class="result-facts">' + facts + '</dl>' + check +
      '</div>';
  }

  function showPlotNote(analysis, plotSet) {
    const plots = plotSet.plots;
    const main = plots[plots.length - 1];
    const isSum = plots.length > 1;
    const isDiscrete = analysis.isDiscrete;
    let note = "Plot window: " + plotSet.windowText + ".";
    if (main.period) {
      note += isSum
        ? " The magenta band on the Result plot marks one complete fundamental period of the sum" + (isDiscrete ? " (the samples n = 0 … N₀ − 1)." : " (from t = 0 to t = T₀).")
        : " The magenta band marks one complete fundamental period, between the dashed start and end lines" + (isDiscrete ? " (the samples n = 0 … N₀ − 1)." : " (from t = 0 to t = T₀).");
    } else if (!analysis.periodic) {
      note += " Aperiodic: the result has no fundamental period, so nothing is marked on it, and no part of the signal ever repeats exactly, however far you plot.";
    }
    if (isSum && plots.some(function (p) { return p.key === "component" && p.period; })) {
      note += " The grey-blue bands on the Signal plots are component periods: the period of each signal on its own. They are not the period of the sum.";
    }
    plots.forEach(function (p) { if (p.periodNote) { note += " " + p.periodNote; } });
    if (plotSet.partial && !main.periodNote) { note += " The window is shorter than three periods, so only part of the signal is drawn."; }
    note += " The plot only illustrates the result; the proof is in “How did we get this result?”.";
    $("periodicity-plot-note").innerHTML = '<p class="field-hint">' + escapeHtml(note) + '</p>';
  }

  function showErrorSummary() {
    $("periodicity-result").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plots below still show your last valid signal.</div>';
  }
  function ensurePlotBoxes(count) {
    if (drawnPlots === count) { return; }
    let html = "";
    for (let i = 0; i < count; i++) { html += '<div id="pe-plot-' + i + '" class="plot-area plot-compact"></div>'; }
    $("periodicity-plots").innerHTML = html;
    drawnPlots = count;
  }

  function drawPlots(values, analysis, plotSet) {
    const isDiscrete = analysis.isDiscrete;
    ensurePlotBoxes(plotSet.plots.length);
    plotSet.plots.forEach(function (p, i) {
      const isMain = p.key !== "component";
      const index = p.key === "component" ? i : 0;
      const traces = [{
        x: p.t, y: p.y, name: isDiscrete ? "x[n]" : "x(t)",
        color: p.key === "component" ? SIGNAL_COLORS[index % SIGNAL_COLORS.length] : (p.key === "sum" ? COLORS.text : COLORS.cyan)
      }];
      const options = {
        title: p.title,
        xLabel: isDiscrete ? "n" : "t (s)",
        yLabel: isDiscrete ? "x[n]" : "x(t)",
        height: isMain ? 400 : 270,
        yRange: p.yRange
      };
      if (p.period) {
        const isComponent = p.period.role === "component";
        if (!isComponent) {
          traces.push({ x: p.highlight.t, y: p.highlight.y, name: "one fundamental period", color: COLORS.magenta });
        }
        const markers = SignalLab.plot.makePeriodMarkers({
          kind: p.period.kind, start: p.period.start, end: p.period.end,
          label: p.period.label, yArrow: p.yArrow,
          startLabel: p.period.startLabel, endLabel: p.period.endLabel,
          windowStart: p.t[0], windowEnd: p.t[p.t.length - 1],
          color: isComponent ? COLORS.dim : undefined,
          fill: isComponent ? "rgba(155, 168, 212, 0.12)" : undefined
        });
        options.shapes = markers.shapes;
        options.annotations = markers.annotations;
      }
      if (isDiscrete) {
        options.autoXTicks = p.t.length > 21;
        SignalLab.plot.plotStem("pe-plot-" + i, traces, options);
      } else {
        SignalLab.plot.plotContinuous("pe-plot-" + i, traces, options);
      }
    });
  }
  function update() {
    const m = MATH();
    const checked = m.validateInputs(readInputs());
    showFieldErrors(checked.errors);
    if (!checked.ok) {
      showErrorSummary();
      if (checked.errors.general) {
        $("periodicity-result").innerHTML = '<div class="message message-error">' + escapeHtml(checked.errors.general) + '</div>';
      }
      return;
    }
    const analysis = m.analyze(checked.values);
    const plotSet = m.buildPlots(checked.values, analysis);
    showResult(checked.values, analysis);
    showPlotNote(analysis, plotSet);
    drawPlots(checked.values, analysis, plotSet);
  }
  function resetPreset() {
    $("pe-example").value = "";
  }

  function setUpEvents() {
    const controls = $("periodicity-controls");

    controls.addEventListener("input", function (event) {
      const target = event.target;
      if (target.id === "pe-example") { return; }          // the "change" handler below loads the preset
      if (target.name === "pe-mode") {
        applyMode(target.value);                           // rebuilds the preset list: back to "Select a preset..."
      } else if (target.name === "pe-kind") {
        while (target.value === "sum" && components.length < 2) { components.push(newComponent(currentMode())); }
        renderComponents();
        resetPreset();
      } else if (target.dataset && target.dataset.field) {
        components[Number(target.dataset.index)][target.dataset.field] = target.value;
        resetPreset();
      }
      update();
    });

    controls.addEventListener("change", function (event) {
      if (event.target.id !== "pe-example" || event.target.value === "") { return; }
      const example = EXAMPLES[currentMode()][Number(event.target.value)];
      components = example.parts.slice(0, 2).map(function (p) { return { type: p[0], amplitude: p[1], frequency: p[2], phase: p[3] }; });
      const kind = components.length > 1 ? "sum" : "single";
      $("pe-kind-" + kind).checked = true;
      $("pe-window").value = "";
      renderComponents();
      update();                                            // the box keeps showing the preset's name
    });

  }
  function init() {
    buildControls();
    setUpEvents();
    applyMode("continuous");
    update();
  }

  SignalLab.modules.periodicity = { init: init };

})();
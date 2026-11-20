/* ==========================================================
   periodicity.ui.js  (Person 5)
   Periodicity Analyzer: USER INTERFACE.
   Builds the controls, reads them, calls periodicity.math.js, and draws.

   Containers (from index.html):
     #periodicity-controls    the inputs (built here)
     #periodicity-result      the result card: PERIODIC / APERIODIC, T0 or N0, frequencies, ratio, why
     #periodicity-plots       one plot per signal, plus the sum (built here)
     #periodicity-plot-note   what the plots show
     #periodicity-steps       "How did we get this result?"
     #periodicity-explain     the plain-language explanation (built here)

   The inputs are TEXT boxes, not number boxes, because a frequency can be
   a fraction (3/4) or an exact form (2*pi, sqrt(2)).
   ========================================================== */
(function () {

  const MATH = function () { return SignalLab.math.periodicity; };
  const COLORS = SignalLab.plot.COLORS;

  const FIELDS = ["type", "amplitude", "frequency", "phase"];
  const SIGNAL_COLORS = [COLORS.cyan, COLORS.amber, COLORS.green, "#60a5fa"];

  // What each representation starts with: the two signals of a sum
  const DEFAULTS = {
    continuous: [{ type: "sine", amplitude: "1", frequency: "1", phase: "0" }, { type: "sine", amplitude: "1", frequency: "2", phase: "0" }],
    discrete:   [{ type: "sine", amplitude: "1", frequency: "1/4", phase: "0" }, { type: "sine", amplitude: "1", frequency: "1/6", phase: "0" }]
  };
  // A newly added signal gets a frequency that differs from the ones already there
  function newComponent(mode) {
    return { type: "sine", amplitude: "1", phase: "0",
             frequency: mode === "discrete" ? "1/" + (components.length + 6) : String(components.length + 1) };
  }

  // Presets. The names only DESCRIBE the signal: they never say whether it is periodic.
  // A part is [waveform, amplitude, frequency, phase].
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

  /* The signals that are really used: one in "single" mode, all in "sum" mode. */
  function activeComponents() {
    return currentKind() === "single" ? components.slice(0, 1) : components;
  }

  /* =========================================================
     1. BUILDING THE CONTROLS
     ========================================================= */

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
      '<div class="btn-row" id="pe-add-row">' +
        '<button type="button" class="btn btn-small" id="pe-add">+ Add a signal</button>' +
      '</div>' +
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

  function componentHtml(item, index, mode, kind, canRemove) {
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
        (canRemove ? '<button type="button" class="btn btn-small" data-remove="' + index + '" aria-label="Remove signal ' + (index + 1) + '">Remove</button>' : '') +
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
    const max = MATH().LIMITS.maxComponents;
    const shown = activeComponents();
    $("pe-components").innerHTML = shown.map(function (item, i) {
      return componentHtml(item, i, mode, kind, kind === "sum" && shown.length > 2);
    }).join("");
    $("pe-add-row").hidden = kind === "single";
    $("pe-add").disabled = components.length >= max;
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

  function buildExplanation() {
    $("periodicity-explain").innerHTML =
      '<p>A signal is <strong>periodic</strong> if some <span class="formula">T &gt; 0</span> exists with ' +
        '<span class="formula">x(t + T) = x(t)</span> for <em>every</em> t. The smallest such T is the <strong>fundamental period T₀</strong>. ' +
        'A signal that never repeats exactly is <strong>aperiodic</strong>. A plot can only show a finite piece, so it can suggest repetition but never prove it: the verdict comes from the rules below, and the highlighted region is the period those rules found.</p>' +

      '<h4>One continuous sinusoid</h4>' +
      '<span class="formula formula-block">x(t) = A·sin(2πft + φ)   or   A·cos(2πft + φ)   →   T₀ = 1 / |f|</span>' +
      '<p>A cosine is just a shifted sine, so it has the same period. Example: f = 2 Hz gives T₀ = 1/2 s, and f = −2 Hz gives the same T₀ because only |f| counts. If f = 0 the signal is a constant: it repeats for <em>every</em> positive time shift, so it is periodic, but there is no smallest positive period, so it has <em>no fundamental period T₀</em>.</p>' +

      '<h4>One discrete sinusoid</h4>' +
      '<span class="formula formula-block">x[n] = A·sin(2πfn + φ),  f = p/q in lowest terms   →   N₀ = q</span>' +
      '<p>It repeats after N samples only if fN is a whole number, which needs f to be a <strong>fraction</strong>. Examples: f = 1/8 gives N₀ = 8; f = 3/8 also gives N₀ = 8 (the 3 is not the period); f = √2/10 is irrational, so x[n] is <strong>aperiodic</strong>. ' +
        'Since n is a whole number, f and f + 1 give the same samples, so f = 5/4 behaves like 1/4 (N₀ = 4).</p>' +

      '<h4>Sums of continuous sinusoids</h4>' +
      '<span class="formula formula-block">f₁/f₂ rational for every pair   →   periodic,  T₀ = 1 / gcd(f₁, f₂, …)</span>' +
      '<p>A common period T must make T·f a whole number for <em>every</em> frequency. Example: sin(2πt) + sin(4πt) has f₁ = 1 Hz and f₂ = 2 Hz. The ratio f₁/f₂ = 1/2 is rational, the gcd of the frequencies is 1 Hz, so T₀ = 1 s. ' +
        '(Equivalent view: T₀ is the least common multiple of the individual periods.) ' +
        'Example: 1 Hz + √2 Hz. The ratio is irrational, so no T works and the sum is <strong>aperiodic</strong>, however long you plot it.</p>' +

      '<h4>Sums of discrete sinusoids</h4>' +
      '<span class="formula formula-block">f₁ = p₁/q₁, f₂ = p₂/q₂, …   →   N₀ = lcm(q₁, q₂, …)</span>' +
      '<p>Example: f = 1/4 and f = 1/6 give N₀ = lcm(4, 6) = 12. In discrete time <em>every</em> frequency must be rational, not just their ratio: if even one is irrational, the sum is aperiodic. Constants (whole-number f) never change the period.</p>' +

      '<h4>The highlighted period</h4>' +
      '<p>On a periodic result, the magenta band marks one complete <strong>fundamental period</strong> of the whole signal. For a continuous signal it runs from t = 0 to t = T₀. For a discrete signal it covers the N₀ samples n = 0, 1, …, N₀ − 1; the next period starts at n = N₀. ' +
        'For a sum, the magenta band appears only on the Result plot. Each Signal plot also shows that signal\'s own period as a grey-blue <strong>component period</strong>. It is not the period of the sum, and an aperiodic sum has no fundamental period at all, so nothing is marked on its Result.</p>' +

      '<h4>Typing numbers</h4>' +
      '<p>Whole numbers (2), decimals (0.75), fractions (3/4) and exact forms such as <span class="formula">pi</span>, <span class="formula">2*pi</span>, <span class="formula">pi/4</span>, <span class="formula">sqrt(2)</span>, <span class="formula">sqrt(2)/10</span> and <span class="formula">1/(2*pi)</span> are understood. ' +
        'Write brackets when a quotient is followed by pi or sqrt: <span class="formula">(1/2)*pi</span>, not 1/2pi.</p>' +

      '<h4>Limitations</h4>' +
      '<ul>' +
        '<li><strong>A decimal is a fraction.</strong> 0.3333 is exactly 3333/10000, not 1/3, and 3.14159 is not π. A decimal can never be proved irrational, so it is always read as the fraction it spells. ' +
            'For example, a discrete f = 0.3333 has N₀ = 10000. Use 1/3, pi or sqrt(2) to say what you mean exactly.</li>' +
        '<li>Irrational frequencies are accepted in the forms r·π<sup>k</sup>·√m (for example pi, 3*pi/2, sqrt(2), 1/pi). Sums inside a frequency, such as 1 + sqrt(2), are not supported.</li>' +
        '<li>Terms with the same frequency are merged first, because they can cancel (sin θ + sin(θ + π) = 0). A merged amplitude below 1e-9 counts as zero. This is the only floating-point decision, and it affects only phases that are typed as decimals.</li>' +
        '<li>Plots are ordinary floating-point drawings. The numerical check in the result card is only a sanity check, never the proof. A very long period may be longer than the plot window; then it is not marked, but it is still reported.</li>' +
      '</ul>';
  }

  /* =========================================================
     2. READING THE CONTROLS
     ========================================================= */

  function readInputs() {
    return {
      mode: currentMode(),
      window: $("pe-window").value,
      components: activeComponents().map(function (c) {
        return { type: c.type, amplitude: c.amplitude, frequency: c.frequency, phase: c.phase };
      })
    };
  }

  /* =========================================================
     3. SHOWING RESULTS
     ========================================================= */

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

  /* The prominent result card. The fundamental period is shown ONLY when one exists. */
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

  function showSteps(analysis) {
    let html = '<ol class="steps-list">' + analysis.steps.map(function (step) {
      return '<li><span class="step-title">' + escapeHtml(step.title) + '</span><ul>' +
        step.lines.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join("") + '</ul></li>';
    }).join("") + '</ol>';
    if (analysis.notes.length) {
      html += '<h4>Please note</h4><ul class="reason-list">' +
        analysis.notes.map(function (n) { return '<li>' + escapeHtml(n) + '</li>'; }).join("") + '</ul>';
    }
    $("periodicity-steps").innerHTML = html;
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

  /* Makes sure there are exactly "count" plot boxes. */
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
        // The fundamental period of the whole signal is magenta. The period of one signal of a sum
        // is a COMPONENT period: grey-blue, with no highlighted curve, so it cannot be mistaken for it.
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

  /* =========================================================
     4. THE UPDATE LOOP: read -> check -> analyze -> draw
     ========================================================= */
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
    showSteps(analysis);
    showPlotNote(analysis, plotSet);
    drawPlots(checked.values, analysis, plotSet);
  }

  /* =========================================================
     5. EVENTS
     ========================================================= */
  /* The preset box shows the name of the loaded preset. Once the user changes the signals
     by hand the controls no longer match it, so the box goes back to "Select a preset...".
     (Picking the same preset again then works, because the selection really changes.) */
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
        // Going back to "sum" needs at least two signals
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
      components = example.parts.map(function (p) { return { type: p[0], amplitude: p[1], frequency: p[2], phase: p[3] }; });
      const kind = components.length > 1 ? "sum" : "single";
      $("pe-kind-" + kind).checked = true;
      $("pe-window").value = "";
      renderComponents();
      update();                                            // the box keeps showing the preset's name
    });

    controls.addEventListener("click", function (event) {
      const add = event.target.closest("#pe-add");
      const remove = event.target.closest("[data-remove]");
      if (add && components.length < MATH().LIMITS.maxComponents) {
        components.push(newComponent(currentMode()));
        renderComponents();
        resetPreset();
        update();
      } else if (remove && components.length > 2) {
        components.splice(Number(remove.dataset.remove), 1);
        renderComponents();
        resetPreset();
        update();
      }
    });
  }

  /* =========================================================
     6. START
     ========================================================= */
  function init() {
    buildControls();
    buildExplanation();
    setUpEvents();
    applyMode("continuous");
    update();
  }

  SignalLab.modules.periodicity = { init: init };

})();

(function () {

  function generatorMath() { return SignalLab.math.generator; }
  function operationsMath() { return SignalLab.math.operations; }

  const LIMITS = {
    maxSamples: 20,        // values in one sequence
    startMax: 50,          // |start index|
    valueMax: 1000,        // |value|
    amplitudeMax: 100,
    frequencyMax: 50,      // Hz
    timeMax: 100,          // |start| and |end|
    widthMax: 20,          // width of one signal's time range
    cyclesMax: 100,        // cycles of a wave inside its own time range
    stepMin: 0.002,
    stepMax: 0.5,
    workMax: 3e6,          // most integrand evaluations (keeps the page responsive)
    outputPoints: 300      // y(t) is drawn with at least this many points
  };

  const SIGNAL_TYPES = ["sine", "cosine", "square", "pulse"];
  const EDGE_TOLERANCE = 1e-9;
  function makeSequence(start, values) {
    return { start: start, values: values.slice() };
  }
  function getSequenceEnd(sequence) {
    return sequence.start + sequence.values.length - 1;
  }
  function getSequenceValue(sequence, n) {
    const index = n - sequence.start;
    if (!Number.isInteger(index)) {
      throw new Error("A discrete signal is only defined at whole-number positions.");
    }
    if (index < 0 || index >= sequence.values.length) { return 0; }
    return sequence.values[index];
  }
  function convolveDiscrete(x, h) {
    const N = x.values.length;
    const M = h.values.length;
    if (N === 0 || M === 0) { throw new Error("A sequence needs at least one value."); }

    const y = [];
    for (let m = 0; m < N + M - 1; m++) {
      const first = Math.max(0, m - (M - 1));
      const last = Math.min(N - 1, m);
      let sum = 0;
      for (let i = first; i <= last; i++) {
        sum += x.values[i] * h.values[m - i];
      }
      y.push(sum);
    }
    return { start: x.start + h.start, values: y };
  }
  function getConvolutionTerms(x, h, n) {
    const kFirst = Math.max(x.start, n - getSequenceEnd(h));
    const kLast = Math.min(getSequenceEnd(x), n - h.start);
    const terms = [];
    let sum = 0;
    for (let k = kFirst; k <= kLast; k++) {
      const xk = getSequenceValue(x, k);
      const hnk = getSequenceValue(h, n - k);
      const product = xk * hnk;
      terms.push({ k: k, xk: xk, hIndex: n - k, hnk: hnk, product: product });
      sum += product;
    }
    return { n: n, terms: terms, sum: sum, kFirst: kFirst, kLast: kLast };
  }
  function flipSequence(sequence) {
    return { start: -getSequenceEnd(sequence), values: sequence.values.slice().reverse() };
  }
  function shiftSequence(sequence, n0) {
    return { start: sequence.start + n0, values: sequence.values.slice() };
  }
  function getFlippedShifted(h, n) {
    return shiftSequence(flipSequence(h), n);
  }
  function checkOutputShape(x, h, y) {
    const expectedLength = x.values.length + h.values.length - 1;
    const expectedStart = x.start + h.start;
    const expectedEnd = getSequenceEnd(x) + getSequenceEnd(h);
    return {
      expectedLength: expectedLength, expectedStart: expectedStart, expectedEnd: expectedEnd,
      length: y.values.length, start: y.start, end: getSequenceEnd(y),
      ok: y.values.length === expectedLength && y.start === expectedStart && getSequenceEnd(y) === expectedEnd
    };
  }
  function parseSequence(text) {
    let cleaned = String(text === undefined || text === null ? "" : text).trim();
    cleaned = cleaned.replace(/^[[{(]+/, "").replace(/[\]})]+$/, "").trim();   // [1, 2] or {1, 2}
    if (cleaned === "") {
      return { ok: false, error: "Type at least one number, for example 1, 2, 3." };
    }
    if (/[,;]\s*[,;]/.test(cleaned) || /^[,;]/.test(cleaned)) {
      return { ok: false, error: "There is an empty spot between two commas. Write a number there (use 0 for zero)." };
    }
    cleaned = cleaned.replace(/[,;\s]+$/, "");               // a trailing comma is harmless
    const tokens = cleaned.split(/[,;\s]+/);

    const values = [];
    for (let i = 0; i < tokens.length; i++) {
      const parsed = operationsMath().parseScaleFactor(tokens[i]);   // reads 2, -0.5 and 1/3
      if (!parsed.ok) {
        return { ok: false, error: "Item " + (i + 1) + ' ("' + tokens[i] + '") is not a number. Use values like 2, -1.5 or 1/3, separated by commas.' };
      }
      if (Math.abs(parsed.value) > LIMITS.valueMax) {
        return { ok: false, error: "Item " + (i + 1) + ": values must be between -" + LIMITS.valueMax + " and " + LIMITS.valueMax + "." };
      }
      values.push(parsed.value);
    }
    if (values.length > LIMITS.maxSamples) {
      return { ok: false, error: "Use at most " + LIMITS.maxSamples + " values (you typed " + values.length + ")." };
    }
    return { ok: true, values: values };
  }
  function validateDiscreteInputs(raw) {
    const errors = {};
    const sequences = {};

    ["x", "h"].forEach(function (name) {
      const parsedValues = parseSequence(raw[name + "Values"]);
      if (!parsedValues.ok) { errors[name + "Values"] = parsedValues.error; }

      const parsedStart = generatorMath().parseNumber(raw[name + "Start"]);
      let start = null;
      if (!parsedStart.ok) {
        errors[name + "Start"] = "Start index needs a whole number, for example 0 or -2.";
      } else if (!operationsMath().isWholeNumber(parsedStart.value)) {
        errors[name + "Start"] = "Start index must be a whole number (positions are n = ..., -1, 0, 1, ...).";
      } else if (Math.abs(parsedStart.value) > LIMITS.startMax) {
        errors[name + "Start"] = "Start index must be between -" + LIMITS.startMax + " and " + LIMITS.startMax + ".";
      } else {
        start = Math.round(parsedStart.value);
      }

      if (parsedValues.ok && start !== null) { sequences[name] = makeSequence(start, parsedValues.values); }
    });

    return { ok: Object.keys(errors).length === 0, errors: errors, values: sequences };
  }
  function isInsideRange(spec, t) {
    return t >= spec.start - EDGE_TOLERANCE && t <= spec.end + EDGE_TOLERANCE;
  }
  function evaluateSignal(spec, times) {
    const insideTimes = [];
    for (let i = 0; i < times.length; i++) {
      if (isInsideRange(spec, times[i])) { insideTimes.push(times[i]); }
    }

    let insideValues;
    if (spec.type === "pulse") {
      insideValues = insideTimes.map(function () { return spec.amplitude; });
    } else {
      insideValues = SignalLab.signals.generate(spec.type, insideTimes, {
        amplitude: spec.amplitude, frequency: spec.frequency, phase: 0
      });
    }

    const values = [];
    let next = 0;
    for (let i = 0; i < times.length; i++) {
      if (isInsideRange(spec, times[i])) { values.push(insideValues[next]); next++; }
      else { values.push(0); }
    }
    return values;
  }
  function trapezoidUniform(values, step) {
    if (values.length < 2) { return 0; }
    let sum = (values[0] + values[values.length - 1]) / 2;
    for (let i = 1; i < values.length - 1; i++) { sum += values[i]; }
    return sum * step;
  }
  function trapezoidXY(xs, ys) {
    let area = 0;
    for (let i = 0; i + 1 < xs.length; i++) {
      area += (xs[i + 1] - xs[i]) * (ys[i] + ys[i + 1]) / 2;
    }
    return area;
  }
  function getIntegrationLimits(x, h, t) {
    return { lo: Math.max(x.start, t - h.end), hi: Math.min(x.end, t - h.start) };
  }
  function getIntegrand(x, h, t, step) {
    const limits = getIntegrationLimits(x, h, t);
    const lo = limits.lo;
    const hi = limits.hi;
    if (hi - lo <= EDGE_TOLERANCE) {
      return { t: t, lo: lo, hi: hi, intervals: 0, step: 0, tau: [], xTau: [], hFlipped: [], product: [], value: 0 };
    }

    const intervals = Math.max(1, Math.ceil((hi - lo) / step - 1e-9));
    const actualStep = (hi - lo) / intervals;

    const tau = [];
    for (let j = 0; j <= intervals; j++) { tau.push(lo + j * actualStep); }
    tau[intervals] = hi;                                    // no drift at the far end

    const hArguments = tau.map(function (s) { return t - s; });   // h is read at t - tau
    const xTau = evaluateSignal(x, tau);
    const hFlipped = evaluateSignal(h, hArguments);
    const product = [];
    for (let j = 0; j < tau.length; j++) { product.push(xTau[j] * hFlipped[j]); }

    return {
      t: t, lo: lo, hi: hi, intervals: intervals, step: actualStep,
      tau: tau, xTau: xTau, hFlipped: hFlipped, product: product,
      value: trapezoidUniform(product, actualStep)
    };
  }
  function convolveAt(x, h, t, step) {
    return getIntegrand(x, h, t, step).value;
  }
  function getOutputCount(x, h, step) {
    const width = (x.end + h.end) - (x.start + h.start);
    const spacing = Math.min(step, width / LIMITS.outputPoints);
    return Math.ceil(width / spacing - 1e-9) + 1;
  }

  function getOutputAxis(x, h, step) {
    const start = x.start + h.start;
    const end = x.end + h.end;
    const gaps = getOutputCount(x, h, step) - 1;            // number of gaps between points
    return SignalLab.signals.makeTimeAxis(start, end, (end - start) / gaps);
  }
  function estimateWork(x, h, step) {
    const widest = Math.min(x.end - x.start, h.end - h.start);
    return getOutputCount(x, h, step) * (Math.ceil(widest / step) + 1);
  }
  function convolveContinuous(x, h, step) {
    const t = getOutputAxis(x, h, step);
    const y = [];
    let maxIntervals = 0;
    for (let i = 0; i < t.length; i++) {
      const integrand = getIntegrand(x, h, t[i], step);
      y.push(integrand.value);
      maxIntervals = Math.max(maxIntervals, integrand.intervals);
    }
    return { t: t, y: y, step: step, maxIntervals: maxIntervals };
  }
  function getAccuracyTable(x, h, t, step) {
    return [step, step / 2, step / 4].map(function (s) {
      const integrand = getIntegrand(x, h, t, s);
      return { step: s, intervals: integrand.intervals, value: integrand.value };
    });
  }
  function makeWindowedCurve(spec, plotStart, plotEnd) {
    let inner;
    if (spec.type === "pulse") {
      inner = [spec.start, spec.end];
    } else {
      inner = generatorMath().getContinuousTimeAxis(spec.start, spec.end, spec.frequency);   // dense: smooth curve
    }
    const innerValues = evaluateSignal(spec, inner);

    const t = [];
    const y = [];
    if (plotStart < spec.start) { t.push(plotStart, spec.start); y.push(0, 0); }
    for (let i = 0; i < inner.length; i++) {
      t.push(inner[i]);
      y.push(SignalLab.signals.roundClean(innerValues[i]) + 0);
    }
    if (plotEnd > spec.end) { t.push(spec.end, plotEnd); y.push(0, 0); }
    return { t: t, y: y };
  }
  function makeFlippedShiftedCurve(h, t, plotStart, plotEnd) {
    const curve = makeWindowedCurve(h, t - plotEnd, t - plotStart);
    const tau = [];
    const y = [];
    for (let i = curve.t.length - 1; i >= 0; i--) {
      tau.push(SignalLab.signals.roundClean(t - curve.t[i]));
      y.push(curve.y[i]);
    }
    return { t: tau, y: y };
  }
  function makeProductCurve(x, h, t, plotStart, plotEnd) {
    const limits = getIntegrationLimits(x, h, t);
    if (limits.hi - limits.lo <= EDGE_TOLERANCE) { return { t: [plotStart, plotEnd], y: [0, 0] }; }

    const count = 300;
    const tau = [];
    for (let j = 0; j <= count; j++) { tau.push(limits.lo + (limits.hi - limits.lo) * j / count); }
    tau[count] = limits.hi;
    const xTau = evaluateSignal(x, tau);
    const hFlipped = evaluateSignal(h, tau.map(function (s) { return t - s; }));

    const curveT = [];
    const curveY = [];
    if (plotStart < limits.lo) { curveT.push(plotStart, limits.lo); curveY.push(0, 0); }
    for (let j = 0; j < tau.length; j++) {
      curveT.push(tau[j]);
      curveY.push(SignalLab.signals.roundClean(xTau[j] * hFlipped[j]) + 0);
    }
    if (plotEnd > limits.hi) { curveT.push(limits.hi, plotEnd); curveY.push(0, 0); }
    return { t: curveT, y: curveY };
  }
  function getContinuousWindows(x, h) {
    const outStart = x.start + h.start;
    const outEnd = x.end + h.end;
    const signalsLow = Math.min(x.start, h.start, outStart);
    const signalsHigh = Math.max(x.end, h.end, outEnd);
    const slideLow = Math.min(x.start, h.start, x.start + h.start - h.end);
    const slideHigh = Math.max(x.end, h.end, x.end + h.end - h.start);
    const padSignals = Math.max((signalsHigh - signalsLow) * 0.06, 0.05);
    const padSlide = Math.max((slideHigh - slideLow) * 0.06, 0.05);
    return {
      outputStart: outStart, outputEnd: outEnd,
      signals: [signalsLow - padSignals, signalsHigh + padSignals],
      slide: [slideLow - padSlide, slideHigh + padSlide]
    };
  }
  function getDiscreteWindows(x, h) {
    const xEnd = getSequenceEnd(x);
    const hEnd = getSequenceEnd(h);
    const outStart = x.start + h.start;
    const outEnd = xEnd + hEnd;
    return {
      outputStart: outStart, outputEnd: outEnd,
      signals: [Math.min(x.start, h.start, outStart) - 1, Math.max(xEnd, hEnd, outEnd) + 1],
      slide: [Math.min(x.start, h.start, x.start + h.start - hEnd) - 1, Math.max(xEnd, hEnd, xEnd + hEnd - h.start) + 1]
    };
  }
  function findPeakIndex(values) {
    let best = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i]) > Math.abs(values[best]) + 1e-12) { best = i; }
    }
    return best;
  }
  function getSignalArea(spec, absolute) {
    if (spec.type === "pulse") { return (absolute ? Math.abs(spec.amplitude) : spec.amplitude) * (spec.end - spec.start); }
    const axis = generatorMath().getContinuousTimeAxis(spec.start, spec.end, spec.frequency);
    let values = evaluateSignal(spec, axis);
    if (absolute) { values = values.map(Math.abs); }
    return trapezoidXY(axis, values);
  }
  function getAreaCheck(x, h, result) {
    const areaY = trapezoidXY(result.t, result.y);
    const product = getSignalArea(x, false) * getSignalArea(h, false);
    const scale = getSignalArea(x, true) * getSignalArea(h, true);
    return { areaY: areaY, areaXTimesH: product, relativeDifference: scale > 0 ? Math.abs(areaY - product) / scale : 0 };
  }
  function getContinuousWarnings(x, h, step) {
    const warnings = [];
    [["x", x], ["h", h]].forEach(function (pair) {
      const spec = pair[1];
      if (spec.type !== "pulse" && 1 / (spec.frequency * step) < 10) {
        warnings.push(pair[0] + "(t) has only about " + Math.floor(1 / (spec.frequency * step)) +
                      " integration points per cycle. For an accurate integral use at least 10, which needs a step of " +
                      Number((1 / (10 * spec.frequency)).toPrecision(2)) + " or smaller.");
      }
    });
    const shorter = Math.min(x.end - x.start, h.end - h.start);
    if (step > shorter / 4) {
      warnings.push("The step (" + step + ") is large compared with the shorter signal (width " + Number(shorter.toPrecision(3)) +
                    "), so the integral uses only a few trapezoids and can be inaccurate.");
    }
    if (x.type === "square" || h.type === "square") {
      warnings.push("A square wave jumps inside the integral, and the trapezoidal rule cannot follow a jump exactly. Expect an error about the size of the step near those jumps.");
    }
    return warnings;
  }
  function readNumber(raw, key, label, example, errors) {
    const result = generatorMath().parseNumber(raw[key]);
    if (!result.ok) {
      errors[key] = label + " needs a number, for example " + example + ".";
      return null;
    }
    return result.value;
  }

  function countCyclesOf(spec) {
    return generatorMath().countCycles(spec.frequency, spec.start, spec.end);
  }
  function readContinuousSignal(raw, prefix, errors) {
    const spec = {};
    let valid = true;

    const type = raw[prefix + "Type"];
    if (SIGNAL_TYPES.indexOf(type) === -1) {
      errors[prefix + "Type"] = "Choose sine, cosine, square or rectangular pulse.";
      valid = false;
    } else { spec.type = type; }

    const amplitude = readNumber(raw, prefix + "Amplitude", "Amplitude", "1", errors);
    if (amplitude === null) { valid = false; }
    else if (amplitude === 0) { errors[prefix + "Amplitude"] = "Amplitude cannot be 0 (the signal would be zero everywhere)."; valid = false; }
    else if (Math.abs(amplitude) > LIMITS.amplitudeMax) { errors[prefix + "Amplitude"] = "Amplitude must be between -" + LIMITS.amplitudeMax + " and " + LIMITS.amplitudeMax + "."; valid = false; }
    else { spec.amplitude = amplitude; }

    if (type !== "pulse") {
      const frequency = readNumber(raw, prefix + "Frequency", "Frequency", "1", errors);
      if (frequency === null) { valid = false; }
      else if (frequency <= 0) { errors[prefix + "Frequency"] = "Frequency must be greater than 0 Hz."; valid = false; }
      else if (frequency > LIMITS.frequencyMax) { errors[prefix + "Frequency"] = "Frequency must be " + LIMITS.frequencyMax + " Hz or less."; valid = false; }
      else { spec.frequency = frequency; }
    } else {
      spec.frequency = null;
    }

    const start = readNumber(raw, prefix + "Start", "Start time", "0", errors);
    const end = readNumber(raw, prefix + "End", "End time", "1", errors);
    if (start === null || end === null) { valid = false; }
    else if (Math.abs(start) > LIMITS.timeMax) { errors[prefix + "Start"] = "Start time must be between -" + LIMITS.timeMax + " and " + LIMITS.timeMax + "."; valid = false; }
    else if (Math.abs(end) > LIMITS.timeMax) { errors[prefix + "End"] = "End time must be between -" + LIMITS.timeMax + " and " + LIMITS.timeMax + "."; valid = false; }
    else if (end <= start) { errors[prefix + "End"] = "End time must be greater than the start time."; valid = false; }
    else if (end - start > LIMITS.widthMax) { errors[prefix + "End"] = "The time range (end − start) must be " + LIMITS.widthMax + " s or less."; valid = false; }
    else { spec.start = start; spec.end = end; }

    if (valid && spec.type !== "pulse" && countCyclesOf(spec) > LIMITS.cyclesMax) {
      errors[prefix + "Frequency"] = "That is " + Math.round(countCyclesOf(spec)) + " cycles in the time range, too many (limit " +
                                     LIMITS.cyclesMax + "). Lower the frequency or shorten the range.";
      valid = false;
    }
    return valid ? spec : null;
  }
  function validateContinuousInputs(raw) {
    const errors = {};
    const x = readContinuousSignal(raw, "x", errors);
    const h = readContinuousSignal(raw, "h", errors);

    let step = null;
    const parsedStep = readNumber(raw, "step", "Step size", "0.02", errors);
    if (parsedStep !== null) {
      if (parsedStep < LIMITS.stepMin || parsedStep > LIMITS.stepMax) {
        errors.step = "Step size must be between " + LIMITS.stepMin + " and " + LIMITS.stepMax + ".";
      } else { step = parsedStep; }
    }

    if (x && h && step !== null) {
      const work = estimateWork(x, h, step);
      if (work > LIMITS.workMax) {
        errors.step = "That would need about " + (Math.round(work / 1e5) / 10) + " million calculations (limit " + (LIMITS.workMax / 1e6) +
                      " million). Use a larger step size or shorter time ranges.";
        step = null;
      }
    }
    const ok = Object.keys(errors).length === 0;
    return { ok: ok, errors: errors, values: ok ? { x: x, h: h, step: step } : {} };
  }
  const DISCRETE_PRESETS = [
    { id: "moving-sum", label: "Moving sum",
      x: { values: "1, 2, 3, 4", start: 0 }, h: { values: "1, 1, 1", start: 0 } },
    { id: "impulse", label: "Impulse δ[n]",
      x: { values: "1, 2, 3", start: 0 }, h: { values: "1", start: 0 } },
    { id: "delayed-impulse", label: "Delayed impulse δ[n−2]",
      x: { values: "1, 2, 3", start: 0 }, h: { values: "1", start: 2 } },
    { id: "rect-rect", label: "Rectangle * rectangle",
      x: { values: "1, 1, 1, 1", start: 0 }, h: { values: "1, 1, 1, 1", start: 0 } },
    { id: "negative", label: "Negative values",
      x: { values: "1, -2, 3", start: 0 }, h: { values: "2, -1", start: 0 } },
    { id: "nonzero-start", label: "Nonzero start indices",
      x: { values: "1, 2", start: -2 }, h: { values: "1, 1, 1", start: 3 } }
  ];

  const CONTINUOUS_PRESETS = [
    { id: "pulse-pulse", label: "Pulse * pulse (triangle)",
      x: { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 1 },
      h: { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 1 }, step: 0.02 },
    { id: "short-long", label: "Short * long pulse (trapezoid)",
      x: { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 1 },
      h: { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 2 }, step: 0.02 },
    { id: "sine-pulse", label: "Sine * pulse (smoothing)",
      x: { type: "sine", amplitude: 1, frequency: 1, start: 0, end: 3 },
      h: { type: "pulse", amplitude: 1, frequency: 1, start: 0, end: 0.5 }, step: 0.02 },
    { id: "cosine-cosine", label: "Cosine * cosine",
      x: { type: "cosine", amplitude: 1, frequency: 1, start: 0, end: 1 },
      h: { type: "cosine", amplitude: 1, frequency: 1, start: 0, end: 1 }, step: 0.02 },
    { id: "near-impulse", label: "Near-impulse (area 1)",
      x: { type: "sine", amplitude: 1, frequency: 1, start: 0, end: 2 },
      h: { type: "pulse", amplitude: 50, frequency: 1, start: 0, end: 0.02 }, step: 0.01 }
  ];

  SignalLab.math.convolution = {
    LIMITS: LIMITS,
    DISCRETE_PRESETS: DISCRETE_PRESETS,
    CONTINUOUS_PRESETS: CONTINUOUS_PRESETS,
    makeSequence: makeSequence,
    getSequenceEnd: getSequenceEnd,
    getSequenceValue: getSequenceValue,
    convolveDiscrete: convolveDiscrete,
    getConvolutionTerms: getConvolutionTerms,
    flipSequence: flipSequence,
    shiftSequence: shiftSequence,
    getFlippedShifted: getFlippedShifted,
    checkOutputShape: checkOutputShape,
    parseSequence: parseSequence,
    validateDiscreteInputs: validateDiscreteInputs,
    getDiscreteWindows: getDiscreteWindows,
    isInsideRange: isInsideRange,
    evaluateSignal: evaluateSignal,
    trapezoidUniform: trapezoidUniform,
    trapezoidXY: trapezoidXY,
    getIntegrationLimits: getIntegrationLimits,
    getIntegrand: getIntegrand,
    convolveAt: convolveAt,
    getOutputCount: getOutputCount,
    getOutputAxis: getOutputAxis,
    estimateWork: estimateWork,
    convolveContinuous: convolveContinuous,
    getAccuracyTable: getAccuracyTable,
    getAreaCheck: getAreaCheck,
    getContinuousWarnings: getContinuousWarnings,
    validateContinuousInputs: validateContinuousInputs,
    makeWindowedCurve: makeWindowedCurve,
    makeFlippedShiftedCurve: makeFlippedShiftedCurve,
    makeProductCurve: makeProductCurve,
    getContinuousWindows: getContinuousWindows,
    findPeakIndex: findPeakIndex
  };

})();
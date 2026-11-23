(function () {
  function generatorMath() { return SignalLab.math.generator; }

  const LIMITS = {
    amplitudeMax: 100,
    frequencyMax: 100,         // Hz, continuous mode
    discreteFrequencyMax: 0.5, // cycles per sample, discrete mode
    phaseMax: 1000,            // radians
    timeMax: 1000,             // seconds (or sample number) for the window ends
    windowMax: 100,            // seconds, continuous mode
    sampleWindowMax: 200,      // samples, discrete mode
    shiftMax: 1000,
    scaleMin: 0.1,             // smallest allowed |a|
    scaleMax: 10,              // largest allowed |a|
    cyclesMax: 200             // most cycles we can draw clearly
  };

  const OPERATIONS = {
    add:      { label: "Addition",       kind: "combine" },
    subtract: { label: "Subtraction",    kind: "combine" },
    multiply: { label: "Multiplication", kind: "combine" },
    shift:    { label: "Time shifting",  kind: "transform" },
    scale:    { label: "Time scaling",   kind: "transform" },
    reverse:  { label: "Time reversal",  kind: "transform" }
  };

  const SIGNAL_TYPES = ["sine", "cosine", "square"];
  function isWholeNumber(value) {
    return Math.abs(value - Math.round(value)) < 1e-9;
  }
  function parseScaleFactor(text) {
    const trimmed = String(text === undefined || text === null ? "" : text).trim();
    if (trimmed.indexOf("/") !== -1) {
      const parts = trimmed.split("/");
      if (parts.length !== 2) { return { ok: false }; }
      const top = generatorMath().parseNumber(parts[0]);
      const bottom = generatorMath().parseNumber(parts[1]);
      if (!top.ok || !bottom.ok || bottom.value === 0) { return { ok: false }; }
      return { ok: true, value: top.value / bottom.value };
    }
    return generatorMath().parseNumber(trimmed);
  }
  function getDiscreteScaleRule(a) {
    if (a === 0 || !isFinite(a)) { return null; }
    const sign = a < 0 ? -1 : 1;
    const size = Math.abs(a);
    if (isWholeNumber(size)) {
      return { type: "decimate", factor: Math.round(size), sign: sign };
    }
    const inverse = 1 / size;
    if (isWholeNumber(inverse)) {
      return { type: "expand", factor: Math.round(inverse), sign: sign };
    }
    return null;
  }
  function describeScale(a) {
    const size = Math.abs(a);
    if (size > 1) { return { effect: "compression", factor: size, reversed: a < 0 }; }
    if (size < 1) { return { effect: "expansion", factor: 1 / size, reversed: a < 0 }; }
    return { effect: "none", factor: 1, reversed: a < 0 };
  }
  function getDiscreteScaleAxis(rule, start, end) {
    let low;
    let high;
    if (rule.type === "decimate") {
      const m = rule.factor;
      if (rule.sign > 0) { low = Math.ceil(start / m - 1e-9);  high = Math.floor(end / m + 1e-9); }
      else               { low = Math.ceil(-end / m - 1e-9);   high = Math.floor(-start / m + 1e-9); }
    } else {
      const l = rule.factor;
      if (rule.sign > 0) { low = l * start;  high = l * end; }
      else               { low = -l * end;   high = -l * start; }
    }
    const axis = [];
    for (let n = low; n <= high; n++) { axis.push(n + 0); }   // + 0 turns -0 into 0
    return axis;
  }
  function isWholePeriodShift(shift, frequency) {
    if (shift === 0) { return false; }
    return isWholeNumber(shift * frequency);
  }
  function cleanValues(values) {
    const cleaned = [];
    for (let i = 0; i < values.length; i++) {
      cleaned.push(SignalLab.signals.roundClean(values[i]) + 0);
    }
    return cleaned;
  }
  function evaluateSignal(spec, times) {
    const raw = SignalLab.signals.generate(spec.type, times, {
      amplitude: spec.amplitude,
      frequency: spec.frequency,
      phase: spec.phase
    });
    return cleanValues(raw);
  }
  function alignSignals(signal1, signal2) {
    const tolerance = 1e-9;
    [signal1, signal2].forEach(function (signal) {
      if (signal.t.length !== signal.y.length) {
        throw new Error("A signal must have one value for every time point.");
      }
      for (let k = 1; k < signal.t.length; k++) {
        if (!(signal.t[k] > signal.t[k - 1])) {
          throw new Error("Time points must be in increasing order.");
        }
      }
    });

    const t = [];
    const y1 = [];
    const y2 = [];
    let i = 0;
    let j = 0;
    while (i < signal1.t.length && j < signal2.t.length) {
      const difference = signal1.t[i] - signal2.t[j];
      if (Math.abs(difference) <= tolerance) {   // same instant in both
        t.push(signal1.t[i]);
        y1.push(signal1.y[i]);
        y2.push(signal2.y[j]);
        i++;
        j++;
      } else if (difference < 0) {               // signal 1 is earlier: skip it
        i++;
      } else {                                   // signal 2 is earlier: skip it
        j++;
      }
    }
    return { t: t, y1: y1, y2: y2 };
  }
  function combineSignals(operation, signal1, signal2) {
    if (operation !== "add" && operation !== "subtract" && operation !== "multiply") {
      throw new Error("Unknown combine operation: " + operation);
    }
    const aligned = alignSignals(signal1, signal2);
    if (aligned.t.length === 0) {
      throw new Error("The two signals share no time points, so they cannot be combined without guessing (interpolating) values in between.");
    }

    const y = [];
    for (let i = 0; i < aligned.t.length; i++) {
      let value;
      if (operation === "add")           { value = aligned.y1[i] + aligned.y2[i]; }
      else if (operation === "subtract") { value = aligned.y1[i] - aligned.y2[i]; }
      else                               { value = aligned.y1[i] * aligned.y2[i]; }
      y.push(value);
    }
    return { t: aligned.t, y: cleanValues(y), y1: aligned.y1, y2: aligned.y2 };
  }
  function applyTimeOperation(operation, spec, axis, parameter, isDiscrete) {
    let rule = null;

    if (isDiscrete && operation === "shift" && !isWholeNumber(parameter)) {
      throw new Error("In discrete mode the shift must be a whole number.");
    }
    if (isDiscrete && operation === "scale") {
      rule = getDiscreteScaleRule(parameter);
      if (rule === null) {
        throw new Error("In discrete mode the scale factor must be a whole number or 1 divided by a whole number.");
      }
    }
    if (operation !== "shift" && operation !== "scale" && operation !== "reverse") {
      throw new Error("Unknown time operation: " + operation);
    }
    const sourceTimes = [];
    for (let i = 0; i < axis.length; i++) {
      const t = axis[i];
      let source;

      if (operation === "shift") {
        source = isDiscrete ? t - Math.round(parameter) : t - parameter;
      } else if (operation === "reverse") {
        source = -t;
      } else if (!isDiscrete) {
        source = parameter * t;                                   // x(a t)
      } else if (rule.type === "decimate") {
        source = rule.sign * rule.factor * t;                     // x[M n]
      } else {
        source = (t % rule.factor === 0) ? t / (rule.sign * rule.factor) : null;   // x[n/L]
      }

      sourceTimes.push(source === null ? null : SignalLab.signals.roundClean(source) + 0);
    }
    const definedTimes = [];
    for (let i = 0; i < sourceTimes.length; i++) {
      if (sourceTimes[i] !== null) { definedTimes.push(sourceTimes[i]); }
    }
    const definedValues = evaluateSignal(spec, definedTimes);

    const y = [];
    let next = 0;
    for (let i = 0; i < sourceTimes.length; i++) {
      if (sourceTimes[i] === null) {
        y.push(0);                          // inserted zero (discrete expansion)
      } else {
        y.push(definedValues[next]);
        next++;
      }
    }
    return { y: y, sourceTimes: sourceTimes };
  }
  function readNumber(raw, key, label, example, errors) {
    const result = generatorMath().parseNumber(raw[key]);
    if (!result.ok) {
      errors[key] = label + " needs a number, for example " + example + ".";
      return null;
    }
    return result.value;
  }
  function readSignal(raw, prefix, isDiscrete, errors) {
    const spec = {};
    let valid = true;

    const type = raw[prefix + "Type"];
    if (SIGNAL_TYPES.indexOf(type) === -1) {
      errors[prefix + "Type"] = "Choose sine, cosine or square.";
      valid = false;
    } else {
      spec.type = type;
    }

    const amplitude = readNumber(raw, prefix + "Amplitude", "Amplitude", "1.5", errors);
    if (amplitude === null) { valid = false; }
    else if (amplitude <= 0) {
      errors[prefix + "Amplitude"] = "Amplitude must be greater than 0. To flip a wave, use a phase of π (3.14159).";
      valid = false;
    } else if (amplitude > LIMITS.amplitudeMax) {
      errors[prefix + "Amplitude"] = "Amplitude must be " + LIMITS.amplitudeMax + " or less.";
      valid = false;
    } else { spec.amplitude = amplitude; }

    const frequency = readNumber(raw, prefix + "Frequency", "Frequency", isDiscrete ? "0.05" : "2", errors);
    if (frequency === null) { valid = false; }
    else if (isDiscrete) {
      if (frequency <= 0 || frequency > LIMITS.discreteFrequencyMax) {
        errors[prefix + "Frequency"] = "In discrete mode the frequency is in cycles per sample. Use a value above 0 and at most " +
                                       LIMITS.discreteFrequencyMax + ", for example 0.05 (one cycle every 20 samples).";
        valid = false;
      } else { spec.frequency = frequency; }
    } else if (frequency <= 0) {
      errors[prefix + "Frequency"] = "Frequency must be greater than 0 Hz.";
      valid = false;
    } else if (frequency > LIMITS.frequencyMax) {
      errors[prefix + "Frequency"] = "Frequency must be " + LIMITS.frequencyMax + " Hz or less.";
      valid = false;
    } else { spec.frequency = frequency; }

    const phase = readNumber(raw, prefix + "Phase", "Phase", "1.57", errors);
    if (phase === null) { valid = false; }
    else if (Math.abs(phase) > LIMITS.phaseMax) {
      errors[prefix + "Phase"] = "Phase must be between -" + LIMITS.phaseMax + " and " + LIMITS.phaseMax + " radians. One full turn is 2π ≈ 6.28.";
      valid = false;
    } else { spec.phase = phase; }

    return valid ? spec : null;
  }
  function getHighestFrequency(operation, spec1, spec2, parameter) {
    if (operation === "add" || operation === "subtract") { return Math.max(spec1.frequency, spec2.frequency); }
    if (operation === "multiply") { return spec1.frequency + spec2.frequency; }
    if (operation === "scale")    { return spec1.frequency * Math.max(1, Math.abs(parameter)); }
    return spec1.frequency;
  }
  function validateInputs(raw) {
    const errors = {};
    const values = { operation: raw.operation, mode: raw.mode, signal2: null, parameter: null };

    if (!OPERATIONS[raw.operation]) { errors.operation = "Choose one of the six operations."; }
    if (raw.mode !== "continuous" && raw.mode !== "discrete") { errors.mode = "Choose continuous or discrete."; }
    const isDiscrete = raw.mode === "discrete";
    const kind = OPERATIONS[raw.operation] ? OPERATIONS[raw.operation].kind : null;
    const signal1 = readSignal(raw, "s1", isDiscrete, errors);
    const signal2 = kind === "combine" ? readSignal(raw, "s2", isDiscrete, errors) : null;
    values.signal1 = signal1;
    values.signal2 = signal2;
    if (raw.operation === "shift") {
      const shift = readNumber(raw, "shift", isDiscrete ? "Sample shift" : "Time shift", isDiscrete ? "3" : "1.5", errors);
      if (shift !== null) {
        if (Math.abs(shift) > LIMITS.shiftMax) {
          errors.shift = "The shift must be between -" + LIMITS.shiftMax + " and " + LIMITS.shiftMax + ".";
        } else if (isDiscrete && !isWholeNumber(shift)) {
          errors.shift = "In discrete mode the shift must be a whole number (for example 3). A discrete signal has no values between samples, so a shift like 2.5 would need guessed values.";
        } else {
          values.parameter = isDiscrete ? Math.round(shift) : shift;
        }
      }
    }
    if (raw.operation === "scale") {
      const parsed = parseScaleFactor(raw.scale);
      if (!parsed.ok) {
        errors.scale = "Scale factor needs a number or a fraction, for example 2, 0.5 or 1/3.";
      } else if (parsed.value === 0) {
        errors.scale = "The scale factor cannot be 0 (x(0·t) would just be a flat line).";
      } else if (isDiscrete) {
        const rule = getDiscreteScaleRule(parsed.value);
        if (rule === null) {
          errors.scale = "In discrete mode a must be a whole number (2 keeps every 2nd sample) or 1 divided by a whole number (0.5 or 1/2 inserts a zero between samples). A value like " +
                         Number(parsed.value.toPrecision(4)) + " would need values between samples, which a discrete signal does not have.";
        } else if (rule.factor > LIMITS.scaleMax) {
          errors.scale = "Use a whole number from 1 to " + LIMITS.scaleMax + " (or 1/" + LIMITS.scaleMax + " to 1/1).";
        } else {
          values.parameter = parsed.value;
        }
      } else if (Math.abs(parsed.value) < LIMITS.scaleMin || Math.abs(parsed.value) > LIMITS.scaleMax) {
        errors.scale = "Use a scale factor whose size is between " + LIMITS.scaleMin + " and " + LIMITS.scaleMax + ". A negative value also reverses time.";
      } else {
        values.parameter = parsed.value;
      }
    }
    const startLabel = isDiscrete ? "First sample" : "Start time";
    const endLabel   = isDiscrete ? "Last sample"  : "End time";
    const start = readNumber(raw, "start", startLabel, isDiscrete ? "-20" : "-2", errors);
    const end   = readNumber(raw, "end",   endLabel,   isDiscrete ? "20"  : "2",  errors);
    if (start !== null && Math.abs(start) > LIMITS.timeMax) { errors.start = startLabel + " must be between -" + LIMITS.timeMax + " and " + LIMITS.timeMax + "."; }
    if (end !== null && Math.abs(end) > LIMITS.timeMax)     { errors.end = endLabel + " must be between -" + LIMITS.timeMax + " and " + LIMITS.timeMax + "."; }
    if (isDiscrete) {
      if (start !== null && !errors.start && !isWholeNumber(start)) { errors.start = "First sample must be a whole number, for example -20."; }
      if (end !== null && !errors.end && !isWholeNumber(end))       { errors.end = "Last sample must be a whole number, for example 20."; }
    }
    if (start !== null && end !== null && !errors.start && !errors.end) {
      const windowSize = end - start;
      if (windowSize <= 0) {
        errors.end = (isDiscrete ? "Last sample" : "End time") + " must be greater than the " + (isDiscrete ? "first sample." : "start time.");
      } else if (!isDiscrete && windowSize > LIMITS.windowMax) {
        errors.end = "The time window (end − start) must be " + LIMITS.windowMax + " s or less.";
      } else if (isDiscrete && windowSize > LIMITS.sampleWindowMax) {
        errors.end = "Show at most " + LIMITS.sampleWindowMax + " samples (last − first ≤ " + LIMITS.sampleWindowMax + ").";
      } else {
        values.start = isDiscrete ? Math.round(start) : start;
        values.end = isDiscrete ? Math.round(end) : end;
      }
    }
    const needsParameter = raw.operation === "shift" || raw.operation === "scale";
    const parameterOk = !needsParameter || values.parameter !== null;
    if (!isDiscrete && signal1 && (kind !== "combine" || signal2) && parameterOk && values.start !== undefined) {
      const fastest = getHighestFrequency(raw.operation, signal1, signal2, values.parameter);
      const cycles = generatorMath().countCycles(fastest, values.start, values.end);
      if (cycles > LIMITS.cyclesMax) {
        errors.end = "The fastest wave here (" + Number(fastest.toPrecision(4)) + " Hz) would show " + Math.round(cycles) +
                     " cycles, too many to draw clearly (limit " + LIMITS.cyclesMax + "). Shorten the time window or lower a frequency.";
      }
    }

    return { ok: Object.keys(errors).length === 0, errors: errors, values: values };
  }
  function makeAxis(values) {
    if (values.mode === "discrete") {
      return SignalLab.signals.makeIndexAxis(values.start, values.end);     // n = start..end
    }
    const fastest = getHighestFrequency(values.operation, values.signal1, values.signal2, values.parameter);
    return generatorMath().getContinuousTimeAxis(values.start, values.end, fastest);
  }
  function computeResult(values) {
    const isDiscrete = values.mode === "discrete";
    const kind = OPERATIONS[values.operation].kind;
    const axis = makeAxis(values);
    const input1 = { t: axis, y: evaluateSignal(values.signal1, axis) };

    if (kind === "combine") {
      const input2 = { t: axis, y: evaluateSignal(values.signal2, axis) };
      const combined = combineSignals(values.operation, input1, input2);
      return { kind: kind, isDiscrete: isDiscrete, input1: input1, input2: input2,
               result: { t: combined.t, y: combined.y }, sourceTimes: null };
    }
    let outputAxis = axis;
    if (isDiscrete && values.operation === "scale") {
      outputAxis = getDiscreteScaleAxis(getDiscreteScaleRule(values.parameter), values.start, values.end);
    }
    const changed = applyTimeOperation(values.operation, values.signal1, outputAxis, values.parameter, isDiscrete);
    return { kind: kind, isDiscrete: isDiscrete, input1: input1, input2: null,
             result: { t: outputAxis, y: changed.y }, sourceTimes: changed.sourceTimes };
  }

  SignalLab.math.operations = {
    LIMITS: LIMITS,
    OPERATIONS: OPERATIONS,
    isWholeNumber: isWholeNumber,
    parseScaleFactor: parseScaleFactor,
    getDiscreteScaleRule: getDiscreteScaleRule,
    describeScale: describeScale,
    getDiscreteScaleAxis: getDiscreteScaleAxis,
    isWholePeriodShift: isWholePeriodShift,
    evaluateSignal: evaluateSignal,
    alignSignals: alignSignals,
    combineSignals: combineSignals,
    applyTimeOperation: applyTimeOperation,
    getHighestFrequency: getHighestFrequency,
    validateInputs: validateInputs,
    makeAxis: makeAxis,
    computeResult: computeResult
  };

})();
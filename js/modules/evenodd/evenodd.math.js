(function () {
  function generatorMath() { return SignalLab.math.generator; }

  const SIGNAL_TYPES = ["sine", "cosine", "square"];

  const LIMITS = {
    discreteFrequencyMax: 0.5,   // cycles per sample
    halfWidthMaxDiscrete: 100,   // n runs -N..N, so at most 201 samples
    tolerance: 1e-9              // "equal" for the checks (floating-point noise)
  };
  function isWholeNumber(value) {
    return Math.abs(value - Math.round(value)) < 1e-9;
  }
  function evaluateSignal(spec, times) {
    const raw = SignalLab.signals.generate(spec.type, times, {
      amplitude: spec.amplitude,
      frequency: spec.frequency,
      phase: spec.phase
    });
    return raw.map(function (value) { return value + 0; });
  }
  function evenPart(x, xReversed) {
    return x.map(function (value, i) { return (value + xReversed[i]) / 2 + 0; });
  }
  function oddPart(x, xReversed) {
    return x.map(function (value, i) { return (value - xReversed[i]) / 2 + 0; });
  }
  function decomposeSignal(spec, times) {
    const x = evaluateSignal(spec, times);
    const xReversed = evaluateSignal(spec, times.map(function (t) { return -t + 0; }));
    return {
      t: times,
      x: x,
      xReversed: xReversed,
      even: evenPart(x, xReversed),
      odd: oddPart(x, xReversed)
    };
  }
  function largestAbsolute(values) {
    let largest = 0;
    for (let i = 0; i < values.length; i++) { largest = Math.max(largest, Math.abs(values[i])); }
    return largest;
  }
  function verifyDecomposition(parts) {
    const t = parts.t;
    const last = t.length - 1;
    let reconstruction = 0;
    let evenSymmetry = 0;
    let oddSymmetry = 0;
    let oddAtZero = 0;

    for (let i = 0; i <= last; i++) {
      if (Math.abs(t[i] + t[last - i]) > LIMITS.tolerance) {
        throw new Error("The time axis must be symmetric around 0.");
      }
      reconstruction = Math.max(reconstruction, Math.abs(parts.x[i] - (parts.even[i] + parts.odd[i])));
      evenSymmetry = Math.max(evenSymmetry, Math.abs(parts.even[i] - parts.even[last - i]));
      oddSymmetry = Math.max(oddSymmetry, Math.abs(parts.odd[i] + parts.odd[last - i]));
      if (Math.abs(t[i]) < LIMITS.tolerance) { oddAtZero = Math.abs(parts.odd[i]); }
    }

    const tol = LIMITS.tolerance;
    return {
      reconstructionError: reconstruction,
      evenSymmetryError: evenSymmetry,
      oddSymmetryError: oddSymmetry,
      oddAtZeroError: oddAtZero,
      tolerance: tol,
      reconstructionOk: reconstruction <= tol,
      evenOk: evenSymmetry <= tol,
      oddOk: oddSymmetry <= tol && oddAtZero <= tol,
      passed: reconstruction <= tol && evenSymmetry <= tol && oddSymmetry <= tol && oddAtZero <= tol
    };
  }
  function classifySignal(parts) {
    const oddSize = largestAbsolute(parts.odd);
    const evenSize = largestAbsolute(parts.even);
    if (oddSize <= LIMITS.tolerance) { return "even"; }
    if (evenSize <= LIMITS.tolerance) { return "odd"; }
    return "neither";
  }
  function readNumber(raw, key, label, example, errors) {
    const result = generatorMath().parseNumber(raw[key]);
    if (!result.ok) {
      errors[key] = label + " needs a number, for example " + example + ".";
      return null;
    }
    return result.value;
  }
  function validateInputs(raw) {
    const errors = {};
    const G = generatorMath().LIMITS;
    const values = { mode: raw.mode, spec: null, halfWidth: null };

    if (raw.mode !== "continuous" && raw.mode !== "discrete") { errors.mode = "Choose continuous or discrete."; }
    const isDiscrete = raw.mode === "discrete";
    const spec = {};
    let specOk = true;

    if (SIGNAL_TYPES.indexOf(raw.type) === -1) {
      errors.type = "Choose sine, cosine or square.";
      specOk = false;
    } else { spec.type = raw.type; }

    const amplitude = readNumber(raw, "amplitude", "Amplitude", "1.5", errors);
    if (amplitude === null) { specOk = false; }
    else if (amplitude <= 0) {
      errors.amplitude = "Amplitude must be greater than 0. To flip a wave, use a phase of π (3.14159).";
      specOk = false;
    } else if (amplitude > G.amplitudeMax) {
      errors.amplitude = "Amplitude must be " + G.amplitudeMax + " or less.";
      specOk = false;
    } else { spec.amplitude = amplitude; }

    const frequency = readNumber(raw, "frequency", "Frequency", isDiscrete ? "0.05" : "2", errors);
    if (frequency === null) { specOk = false; }
    else if (isDiscrete) {
      if (frequency <= 0 || frequency > LIMITS.discreteFrequencyMax) {
        errors.frequency = "In discrete mode the frequency is in cycles per sample. Use a value above 0 and at most " +
                           LIMITS.discreteFrequencyMax + ", for example 0.05 (one cycle every 20 samples).";
        specOk = false;
      } else { spec.frequency = frequency; }
    } else if (frequency <= 0) {
      errors.frequency = "Frequency must be greater than 0 Hz.";
      specOk = false;
    } else if (frequency > G.frequencyMax) {
      errors.frequency = "Frequency must be " + G.frequencyMax + " Hz or less.";
      specOk = false;
    } else { spec.frequency = frequency; }

    const phase = readNumber(raw, "phase", "Phase", "0.785", errors);
    if (phase === null) { specOk = false; }
    else if (Math.abs(phase) > G.phaseMax) {
      errors.phase = "Phase must be between -" + G.phaseMax + " and " + G.phaseMax + " radians. One full turn is 2π ≈ 6.28.";
      specOk = false;
    } else { spec.phase = phase; }
    const label = isDiscrete ? "Range N" : "Range T";
    const halfWidth = readNumber(raw, "halfWidth", label, isDiscrete ? "20" : "2", errors);
    if (halfWidth !== null) {
      if (halfWidth <= 0) {
        errors.halfWidth = label + " must be greater than 0. The window is symmetric: from -" + (isDiscrete ? "N to N." : "T to T.");
      } else if (isDiscrete && !isWholeNumber(halfWidth)) {
        errors.halfWidth = "N must be a whole number (for example 20). Samples exist only at whole numbers n.";
      } else if (isDiscrete && halfWidth > LIMITS.halfWidthMaxDiscrete) {
        errors.halfWidth = "N must be " + LIMITS.halfWidthMaxDiscrete + " or less (at most " + (2 * LIMITS.halfWidthMaxDiscrete + 1) + " samples).";
      } else if (!isDiscrete && 2 * halfWidth > G.windowMax) {
        errors.halfWidth = "The window (2T) must be " + G.windowMax + " s or less, so T ≤ " + (G.windowMax / 2) + ".";
      } else {
        values.halfWidth = isDiscrete ? Math.round(halfWidth) : halfWidth;
      }
    }
    if (!isDiscrete && specOk && values.halfWidth !== null) {
      const cycles = generatorMath().countCycles(spec.frequency, -values.halfWidth, values.halfWidth);
      if (cycles > G.cyclesMax) {
        errors.halfWidth = "This would show " + Math.round(cycles) + " cycles, too many to draw clearly (limit " +
                           G.cyclesMax + "). Shorten the range or lower the frequency.";
        values.halfWidth = null;
      }
    }

    if (specOk) { values.spec = spec; }
    return { ok: Object.keys(errors).length === 0, errors: errors, values: values };
  }
  function makeAxis(values) {
    const T = values.halfWidth;
    if (values.mode === "discrete") {
      return SignalLab.signals.makeIndexAxis(-T, T);
    }
    const base = generatorMath().getContinuousTimeAxis(-T, T, values.spec.frequency);
    let steps = base.length - 1;
    if (steps % 2 !== 0) { steps += 1; }
    return SignalLab.signals.makeTimeAxis(-T, T, (2 * T) / steps);
  }
  function computeResult(values) {
    const t = makeAxis(values);
    const parts = decomposeSignal(values.spec, t);
    return {
      isDiscrete: values.mode === "discrete",
      t: parts.t,
      x: parts.x,
      xReversed: parts.xReversed,
      even: parts.even,
      odd: parts.odd,
      verification: verifyDecomposition(parts),
      classification: classifySignal(parts)
    };
  }

  SignalLab.math.evenodd = {
    LIMITS: LIMITS,
    isWholeNumber: isWholeNumber,
    evaluateSignal: evaluateSignal,
    evenPart: evenPart,
    oddPart: oddPart,
    decomposeSignal: decomposeSignal,
    verifyDecomposition: verifyDecomposition,
    classifySignal: classifySignal,
    largestAbsolute: largestAbsolute,
    validateInputs: validateInputs,
    makeAxis: makeAxis,
    computeResult: computeResult
  };

})();
/* ==========================================================
   evenodd.math.js  (Person 4)
   Even & Odd Decomposition: MATH ONLY (numbers in, numbers out, no HTML).

   THE IDEA
   Every signal x can be split into two parts:
     even part   x_e(t) = [ x(t) + x(-t) ] / 2     mirror-symmetric: x_e(-t) =  x_e(t)
     odd part    x_o(t) = [ x(t) - x(-t) ] / 2     antisymmetric:    x_o(-t) = -x_o(t)
   and the two parts always add back to the original:
     x_e(t) + x_o(t) = [x(t)+x(-t)]/2 + [x(t)-x(-t)]/2 = x(t)

   HOW WE CALCULATE (same idea as the Operations module)
   We do NOT flip a picture. For every time t we evaluate the signal's
   FORMULA at t and at -t, then combine the two numbers. The wave
   formulas come from core/signals.js (SignalLab.signals.generate).

   DISCRETE SIGNALS
   x[n] with n = -N, ..., -1, 0, 1, ..., N (whole numbers only, f in
   cycles per sample). x[-n] is a real sample, so nothing is interpolated.

   THE RANGE IS SYMMETRIC AROUND 0: [-T, T] (or n = -N..N). That is what
   makes x(-t) available for every t in the window.

   DEPENDENCY: reuses parseNumber, countCycles, getContinuousTimeAxis
   and LIMITS from generator.math.js (loaded before this file).
   ========================================================== */
(function () {

  // Called when needed (not at load time), so load order can't break it
  function generatorMath() { return SignalLab.math.generator; }

  const SIGNAL_TYPES = ["sine", "cosine", "square"];

  const LIMITS = {
    discreteFrequencyMax: 0.5,   // cycles per sample
    halfWidthMaxDiscrete: 100,   // n runs -N..N, so at most 201 samples
    tolerance: 1e-9              // "equal" for the checks (floating-point noise)
  };

  /* True for 3, 3.0000000001 and -2; false for 2.5. */
  function isWholeNumber(value) {
    return Math.abs(value - Math.round(value)) < 1e-9;
  }

  /* =========================================================
     THE FORMULAS
     ========================================================= */

  /* Value of A * wave(2*pi*f*time + phase) at each time in "times".
     spec = { type, amplitude, frequency, phase }.
     "+ 0" turns a negative zero into 0. */
  function evaluateSignal(spec, times) {
    const raw = SignalLab.signals.generate(spec.type, times, {
      amplitude: spec.amplitude,
      frequency: spec.frequency,
      phase: spec.phase
    });
    return raw.map(function (value) { return value + 0; });
  }

  /* ---------------------------------------------------------
     evenPart(x, xReversed)   x_e = (x(t) + x(-t)) / 2
     oddPart(x, xReversed)    x_o = (x(t) - x(-t)) / 2
     x[i] is x(t_i) and xReversed[i] is x(-t_i), at the same position.
     --------------------------------------------------------- */
  function evenPart(x, xReversed) {
    return x.map(function (value, i) { return (value + xReversed[i]) / 2 + 0; });
  }
  function oddPart(x, xReversed) {
    return x.map(function (value, i) { return (value - xReversed[i]) / 2 + 0; });
  }

  /* ---------------------------------------------------------
     decomposeSignal(spec, times)
     Evaluates x at every t AND at -t, then builds both parts.
     Returns { t, x, xReversed, even, odd }. Values are NOT rounded, so
     the verification below sees the true floating-point error.
     --------------------------------------------------------- */
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

  /* =========================================================
     VERIFICATION
     ========================================================= */

  function largestAbsolute(values) {
    let largest = 0;
    for (let i = 0; i < values.length; i++) { largest = Math.max(largest, Math.abs(values[i])); }
    return largest;
  }

  /* ---------------------------------------------------------
     verifyDecomposition(parts)
     Four independent checks (tolerance 1e-9):
       1. reconstruction  x(t) = x_e(t) + x_o(t)   at every point
       2. x_e is even     x_e(t) = x_e(-t)         (mirror positions)
       3. x_o is odd      x_o(t) = -x_o(-t)        (mirror positions)
       4. x_o(0) = 0      (an odd signal must pass through 0 at 0)
     Checks 2 and 3 compare each point with its mirror position on the
     symmetric axis (index i against index N-1-i).
     Returns the largest error of each check and passed = all four ok.
     --------------------------------------------------------- */
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

  /* "even" when the odd part is 0 everywhere, "odd" when the even part is
     0 everywhere, otherwise "neither". */
  function classifySignal(parts) {
    const oddSize = largestAbsolute(parts.odd);
    const evenSize = largestAbsolute(parts.even);
    if (oddSize <= LIMITS.tolerance) { return "even"; }
    if (evenSize <= LIMITS.tolerance) { return "odd"; }
    return "neither";
  }

  /* =========================================================
     INPUT CHECKING
     ========================================================= */

  function readNumber(raw, key, label, example, errors) {
    const result = generatorMath().parseNumber(raw[key]);
    if (!result.ok) {
      errors[key] = label + " needs a number, for example " + example + ".";
      return null;
    }
    return result.value;
  }

  /* ---------------------------------------------------------
     validateInputs(raw)
     raw = text from every control: { mode, type, amplitude, frequency,
     phase, halfWidth }. Returns { ok, errors, values }.
     values = { mode, spec: {type, amplitude, frequency, phase}, halfWidth }
     --------------------------------------------------------- */
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

    // Half-width: the window is [-T, T] (continuous) or n = -N..N (discrete)
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

    // Continuous only: not so many cycles that the plot turns into a blur
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

  /* =========================================================
     PUTTING IT ALL TOGETHER
     ========================================================= */

  /* ---------------------------------------------------------
     makeAxis(values)
     Discrete:   n = -N, ..., N.
     Continuous: evenly spaced t from -T to T. The number of steps is made
                 EVEN so that t = 0 is a grid point and the axis is exactly
                 symmetric (t_i = -t_(last-i)).
     --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     computeResult(values)   values = the numbers from validateInputs().
     Returns { isDiscrete, t, x, xReversed, even, odd, verification,
               classification }.
     --------------------------------------------------------- */
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

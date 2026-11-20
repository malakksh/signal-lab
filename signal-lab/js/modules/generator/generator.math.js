/* ==========================================================
   generator.math.js  (Person 2)
   Signal Generator: MATH ONLY (numbers in, numbers out, no HTML).

   The wave formulas themselves (sine, cosine, square) already live in
   core/signals.js. We REUSE them through SignalLab.signals.generate().
   This file adds what is specific to the generator:
     - checking the user's inputs
     - building the time axis (continuous or discrete)
     - detecting "aliasing" (sampling too slowly)

   Formulas:
     Sine:    x(t) = A · sin(2πft + φ)
     Cosine:  x(t) = A · cos(2πft + φ)
     Square:  x(t) = A · sign(sin(2πft + φ))
   ========================================================== */
(function () {

  // The limits we accept. Keeping them in one place makes them easy to change.
  const LIMITS = {
    amplitudeMax: 100,
    frequencyMax: 100,       // Hz
    phaseMax: 1000,          // radians (big phases lose accuracy in sin/cos)
    timeMax: 1000,           // seconds, for start and end time
    windowMax: 100,          // seconds, largest (end - start)
    cyclesMax: 200,          // most cycles we can draw clearly
    samplesMin: 2,
    samplesMax: 500,
    pointsPerCycle: 40,      // continuous plots use at least this many points per cycle
    minPoints: 500,          // ...and at least this many points in total
    maxPoints: 8000
  };

  const SIGNAL_TYPES = ["sine", "cosine", "square"];

  /* ---------------------------------------------------------
     parseNumber(text)
     Turns what the user typed into a number.
     Returns { ok: true, value } or { ok: false }.
     Careful: Number("") is 0 in JavaScript, so we check for
     an empty box ourselves.
     --------------------------------------------------------- */
  function parseNumber(text) {
    const trimmed = String(text === undefined || text === null ? "" : text).trim();
    if (trimmed === "") { return { ok: false }; }
    const value = Number(trimmed);
    if (!isFinite(value)) { return { ok: false }; }   // NaN or Infinity
    return { ok: true, value: value };
  }

  /* Reads one field. If it is not a number, records an error message. */
  function readNumber(raw, key, label, example, errors) {
    const result = parseNumber(raw[key]);
    if (!result.ok) {
      errors[key] = label + " needs a number, for example " + example + ".";
      return null;
    }
    return result.value;
  }

  /* ---------------------------------------------------------
     getPeriod(frequency)
     Formula:  T = 1 / f      (seconds per cycle)
     --------------------------------------------------------- */
  function getPeriod(frequency) {
    return 1 / frequency;
  }

  /* ---------------------------------------------------------
     countCycles(frequency, startTime, endTime)
     Formula:  cycles = f · (end − start)
     --------------------------------------------------------- */
  function countCycles(frequency, startTime, endTime) {
    return frequency * (endTime - startTime);
  }

  /* ---------------------------------------------------------
     getSamplePeriod(startTime, endTime, numSamples)
     N samples spread evenly from start to end (both included)
     leave N − 1 gaps, so:
         Ts = (end − start) / (N − 1)
     --------------------------------------------------------- */
  function getSamplePeriod(startTime, endTime, numSamples) {
    return (endTime - startTime) / (numSamples - 1);
  }

  /* ---------------------------------------------------------
     validateInputs(raw)
     raw = what the user typed (text) for every control.
     Returns:
       ok      true when everything is fine
       errors  { fieldName: "helpful message" } for each bad field
       values  the same inputs converted to numbers (only filled
               for fields that passed)
     --------------------------------------------------------- */
  function validateInputs(raw) {
    const errors = {};
    const values = { type: raw.type, mode: raw.mode };

    if (SIGNAL_TYPES.indexOf(raw.type) === -1) {
      errors.type = "Choose sine, cosine or square.";
    }
    if (raw.mode !== "continuous" && raw.mode !== "discrete") {
      errors.mode = "Choose continuous or discrete.";
    }

    // --- Amplitude: must be positive (use phase π to flip a wave) ---
    const amplitude = readNumber(raw, "amplitude", "Amplitude", "1.5", errors);
    if (amplitude !== null) {
      if (amplitude <= 0) {
        errors.amplitude = "Amplitude must be greater than 0. To flip the wave upside down, use a phase of π (3.14159) instead.";
      } else if (amplitude > LIMITS.amplitudeMax) {
        errors.amplitude = "Amplitude must be " + LIMITS.amplitudeMax + " or less.";
      } else {
        values.amplitude = amplitude;
      }
    }

    // --- Frequency in Hz: must be positive ---
    const frequency = readNumber(raw, "frequency", "Frequency", "2", errors);
    if (frequency !== null) {
      if (frequency <= 0) {
        errors.frequency = "Frequency must be greater than 0 Hz.";
      } else if (frequency > LIMITS.frequencyMax) {
        errors.frequency = "Frequency must be " + LIMITS.frequencyMax + " Hz or less.";
      } else {
        values.frequency = frequency;
      }
    }

    // --- Phase in radians: any number, within a sensible size ---
    const phase = readNumber(raw, "phase", "Phase", "1.57", errors);
    if (phase !== null) {
      if (Math.abs(phase) > LIMITS.phaseMax) {
        errors.phase = "Phase must be between -" + LIMITS.phaseMax + " and " + LIMITS.phaseMax + " radians. One full turn is 2π ≈ 6.28.";
      } else {
        values.phase = phase;
      }
    }

    // --- Start and end time ---
    const start = readNumber(raw, "startTime", "Start time", "-1", errors);
    const end   = readNumber(raw, "endTime",   "End time",   "1",  errors);
    if (start !== null && Math.abs(start) > LIMITS.timeMax) {
      errors.startTime = "Start time must be between -" + LIMITS.timeMax + " and " + LIMITS.timeMax + " s.";
    }
    if (end !== null && Math.abs(end) > LIMITS.timeMax) {
      errors.endTime = "End time must be between -" + LIMITS.timeMax + " and " + LIMITS.timeMax + " s.";
    }
    if (start !== null && end !== null && !errors.startTime && !errors.endTime) {
      if (end <= start) {
        errors.endTime = "End time must be greater than the start time.";
      } else if (end - start > LIMITS.windowMax) {
        errors.endTime = "The time window (end − start) must be " + LIMITS.windowMax + " s or less.";
      } else {
        values.startTime = start;
        values.endTime = end;
      }
    }

    // --- Continuous only: not so many cycles that the wave turns into a blur ---
    if (raw.mode === "continuous" && values.frequency !== undefined && values.startTime !== undefined) {
      const cycles = countCycles(values.frequency, values.startTime, values.endTime);
      if (cycles > LIMITS.cyclesMax) {
        errors.frequency = "That shows " + Math.round(cycles) + " cycles, too many to draw clearly (limit " +
                           LIMITS.cyclesMax + "). Lower the frequency or shorten the time window.";
        delete values.frequency;
      }
    }

    // --- Discrete only: number of samples must be a whole number from 2 to 500 ---
    if (raw.mode === "discrete") {
      const samples = readNumber(raw, "numSamples", "Number of samples", "41", errors);
      if (samples !== null) {
        if (!Number.isInteger(samples)) {
          errors.numSamples = "Number of samples must be a whole number, for example 41.";
        } else if (samples < LIMITS.samplesMin) {
          errors.numSamples = "Use at least " + LIMITS.samplesMin + " samples.";
        } else if (samples > LIMITS.samplesMax) {
          errors.numSamples = "Use at most " + LIMITS.samplesMax + " samples.";
        } else {
          values.numSamples = samples;
        }
      }
    }

    return { ok: Object.keys(errors).length === 0, errors: errors, values: values };
  }

  /* ---------------------------------------------------------
     getContinuousTimeAxis(startTime, endTime, frequency)
     A "continuous" plot is really many closely spaced points joined
     by lines. We use 40 points per cycle (at least 500 in total) so
     the curve looks smooth. Reuses core makeTimeAxis().
     --------------------------------------------------------- */
  function getContinuousTimeAxis(startTime, endTime, frequency) {
    const cycles = countCycles(frequency, startTime, endTime);
    let points = Math.ceil(cycles * LIMITS.pointsPerCycle);
    points = Math.max(LIMITS.minPoints, Math.min(LIMITS.maxPoints, points));
    const step = (endTime - startTime) / points;
    return SignalLab.signals.makeTimeAxis(startTime, endTime, step);
  }

  /* ---------------------------------------------------------
     getDiscreteTimeAxis(startTime, endTime, numSamples)
     The sample times:  t[n] = start + n · Ts,   n = 0, 1, ..., N−1
     Reuses core makeTimeAxis() with step Ts.
     --------------------------------------------------------- */
  function getDiscreteTimeAxis(startTime, endTime, numSamples) {
    const samplePeriod = getSamplePeriod(startTime, endTime, numSamples);
    return SignalLab.signals.makeTimeAxis(startTime, endTime, samplePeriod);
  }

  /* ---------------------------------------------------------
     generateSignal(values)
     Main function. values = the numbers from validateInputs().
     A discrete signal is the continuous one measured at the sample
     times:  x[n] = x(t[n]).
     Returns { t, y, isDiscrete, samplePeriod }.
     --------------------------------------------------------- */
  function generateSignal(values) {
    const isDiscrete = values.mode === "discrete";
    let t;
    let samplePeriod = null;

    if (isDiscrete) {
      t = getDiscreteTimeAxis(values.startTime, values.endTime, values.numSamples);
      samplePeriod = getSamplePeriod(values.startTime, values.endTime, values.numSamples);
    } else {
      t = getContinuousTimeAxis(values.startTime, values.endTime, values.frequency);
    }

    // The wave formulas come from core/signals.js (no copy here)
    const rawY = SignalLab.signals.generate(values.type, t, {
      amplitude: values.amplitude,
      frequency: values.frequency,
      phase: values.phase
    });

    // Remove rounding noise such as 1.2e-16 (which should be 0) and -0
    const y = [];
    for (let i = 0; i < rawY.length; i++) {
      y.push(SignalLab.signals.roundClean(rawY[i]) + 0);
    }

    return { t: t, y: y, isDiscrete: isDiscrete, samplePeriod: samplePeriod };
  }

  /* ---------------------------------------------------------
     hasAliasing(frequency, samplePeriod)
     Sampling rate:  fs = 1 / Ts.
     To capture a wave you need MORE than 2 samples per cycle, i.e.
     f < fs / 2 (the Nyquist limit). At or above it, the stems show a
     slower, wrong wave. That effect is called aliasing.
     --------------------------------------------------------- */
  function hasAliasing(frequency, samplePeriod) {
    return 2 * frequency * samplePeriod >= 1 - 1e-9;   // f >= fs / 2
  }

  SignalLab.math.generator = {
    LIMITS: LIMITS,
    parseNumber: parseNumber,
    getPeriod: getPeriod,
    countCycles: countCycles,
    getSamplePeriod: getSamplePeriod,
    validateInputs: validateInputs,
    getContinuousTimeAxis: getContinuousTimeAxis,
    getDiscreteTimeAxis: getDiscreteTimeAxis,
    generateSignal: generateSignal,
    hasAliasing: hasAliasing
  };

})();

(function () {
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
  function parseNumber(text) {
    const trimmed = String(text === undefined || text === null ? "" : text).trim();
    if (trimmed === "") { return { ok: false }; }
    const value = Number(trimmed);
    if (!isFinite(value)) { return { ok: false }; }   // NaN or Infinity
    return { ok: true, value: value };
  }
  function readNumber(raw, key, label, example, errors) {
    const result = parseNumber(raw[key]);
    if (!result.ok) {
      errors[key] = label + " needs a number, for example " + example + ".";
      return null;
    }
    return result.value;
  }
  function getPeriod(frequency) {
    return 1 / frequency;
  }
  function countCycles(frequency, startTime, endTime) {
    return frequency * (endTime - startTime);
  }
  function getSamplePeriod(startTime, endTime, numSamples) {
    return (endTime - startTime) / (numSamples - 1);
  }
  function validateInputs(raw) {
    const errors = {};
    const values = { type: raw.type, mode: raw.mode };

    if (SIGNAL_TYPES.indexOf(raw.type) === -1) {
      errors.type = "Choose sine, cosine or square.";
    }
    if (raw.mode !== "continuous" && raw.mode !== "discrete") {
      errors.mode = "Choose continuous or discrete.";
    }
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
    const phase = readNumber(raw, "phase", "Phase", "1.57", errors);
    if (phase !== null) {
      if (Math.abs(phase) > LIMITS.phaseMax) {
        errors.phase = "Phase must be between -" + LIMITS.phaseMax + " and " + LIMITS.phaseMax + " radians. One full turn is 2π ≈ 6.28.";
      } else {
        values.phase = phase;
      }
    }
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
    if (raw.mode === "continuous" && values.frequency !== undefined && values.startTime !== undefined) {
      const cycles = countCycles(values.frequency, values.startTime, values.endTime);
      if (cycles > LIMITS.cyclesMax) {
        errors.frequency = "That shows " + Math.round(cycles) + " cycles, too many to draw clearly (limit " +
                           LIMITS.cyclesMax + "). Lower the frequency or shorten the time window.";
        delete values.frequency;
      }
    }
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
  function getContinuousTimeAxis(startTime, endTime, frequency) {
    const cycles = countCycles(frequency, startTime, endTime);
    let points = Math.ceil(cycles * LIMITS.pointsPerCycle);
    points = Math.max(LIMITS.minPoints, Math.min(LIMITS.maxPoints, points));
    const step = (endTime - startTime) / points;
    return SignalLab.signals.makeTimeAxis(startTime, endTime, step);
  }
  function getDiscreteTimeAxis(startTime, endTime, numSamples) {
    const samplePeriod = getSamplePeriod(startTime, endTime, numSamples);
    return SignalLab.signals.makeTimeAxis(startTime, endTime, samplePeriod);
  }
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
    const rawY = SignalLab.signals.generate(values.type, t, {
      amplitude: values.amplitude,
      frequency: values.frequency,
      phase: values.phase
    });
    const y = [];
    for (let i = 0; i < rawY.length; i++) {
      y.push(SignalLab.signals.roundClean(rawY[i]) + 0);
    }

    return { t: t, y: y, isDiscrete: isDiscrete, samplePeriod: samplePeriod };
  }
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
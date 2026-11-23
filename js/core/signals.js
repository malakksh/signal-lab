(function () {
  function makeTimeAxis(start, end, step) {
    const t = [];
    const count = Math.round((end - start) / step);   // how many steps fit
    for (let i = 0; i <= count; i++) {
      const value = start + i * step;
      t.push(roundClean(value));
    }
    return t;
  }
  function makeIndexAxis(nStart, nEnd) {
    const n = [];
    for (let k = nStart; k <= nEnd; k++) {
      n.push(k);
    }
    return n;
  }
  function roundClean(value) {
    return Number(value.toFixed(10));
  }
  function sine(t, amplitude, frequency, phase) {
    const y = [];
    for (let i = 0; i < t.length; i++) {
      y.push(amplitude * Math.sin(2 * Math.PI * frequency * t[i] + phase));
    }
    return y;
  }
  function cosine(t, amplitude, frequency, phase) {
    const y = [];
    for (let i = 0; i < t.length; i++) {
      y.push(amplitude * Math.cos(2 * Math.PI * frequency * t[i] + phase));
    }
    return y;
  }
  function square(t, amplitude, frequency, phase) {
    const y = [];
    for (let i = 0; i < t.length; i++) {
      const cycles = frequency * t[i] + phase / (2 * Math.PI);
      let fraction = cycles - Math.floor(cycles);          // 0 <= fraction < 1
      fraction = Math.round(fraction * 1e9) / 1e9;         // remove tiny errors
      if (fraction >= 1) { fraction = 0; }
      y.push(fraction < 0.5 ? amplitude : -amplitude);
    }
    return y;
  }
  function generate(type, t, params) {
    if (type === "sine")   { return sine(t,   params.amplitude, params.frequency, params.phase); }
    if (type === "cosine") { return cosine(t, params.amplitude, params.frequency, params.phase); }
    if (type === "square") { return square(t, params.amplitude, params.frequency, params.phase); }
    throw new Error("Unknown signal type: " + type);
  }
  SignalLab.signals.makeTimeAxis  = makeTimeAxis;
  SignalLab.signals.makeIndexAxis = makeIndexAxis;
  SignalLab.signals.roundClean    = roundClean;
  SignalLab.signals.sine          = sine;
  SignalLab.signals.cosine        = cosine;
  SignalLab.signals.square        = square;
  SignalLab.signals.generate      = generate;

})();
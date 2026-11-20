/* ==========================================================
   signals.js  (owner: Person 1)

   Shared building blocks that EVERY module can use.

   A signal in this project is just two arrays of equal length:
       t = [ -1, -0.9, -0.8, ... ]   (the time values)
       y = [  0,  0.3,  0.6, ... ]   (the signal value at each time)
   ========================================================== */
(function () {

  /* ---------------------------------------------------------
     makeTimeAxis(start, end, step)
     Builds the list of time values: start, start+step, ... end.

     Example: makeTimeAxis(0, 1, 0.25) -> [0, 0.25, 0.5, 0.75, 1]

     We compute start + i*step instead of repeatedly adding step,
     because repeated addition builds up tiny rounding errors
     (0.1 + 0.2 = 0.30000000000000004 in JavaScript).
     --------------------------------------------------------- */
  function makeTimeAxis(start, end, step) {
    const t = [];
    const count = Math.round((end - start) / step);   // how many steps fit
    for (let i = 0; i <= count; i++) {
      const value = start + i * step;
      t.push(roundClean(value));
    }
    return t;
  }

  /* ---------------------------------------------------------
     makeIndexAxis(nStart, nEnd)
     Builds integer sample numbers for DISCRETE signals.
     Example: makeIndexAxis(-2, 2) -> [-2, -1, 0, 1, 2]
     --------------------------------------------------------- */
  function makeIndexAxis(nStart, nEnd) {
    const n = [];
    for (let k = nStart; k <= nEnd; k++) {
      n.push(k);
    }
    return n;
  }

  /* Removes floating-point noise: 0.30000000000000004 -> 0.3 */
  function roundClean(value) {
    return Number(value.toFixed(10));
  }

  /* ---------------------------------------------------------
     sine(t, amplitude, frequency, phase)
     Formula:  x(t) = A · sin(2π·f·t + φ)
       A = amplitude (how tall)
       f = frequency in Hz (cycles per second)
       φ = phase in RADIANS (how far the wave is shifted)
     Returns an array with one value for every time in t.
     --------------------------------------------------------- */
  function sine(t, amplitude, frequency, phase) {
    const y = [];
    for (let i = 0; i < t.length; i++) {
      y.push(amplitude * Math.sin(2 * Math.PI * frequency * t[i] + phase));
    }
    return y;
  }

  /* ---------------------------------------------------------
     cosine(t, amplitude, frequency, phase)
     Formula:  x(t) = A · cos(2π·f·t + φ)
     --------------------------------------------------------- */
  function cosine(t, amplitude, frequency, phase) {
    const y = [];
    for (let i = 0; i < t.length; i++) {
      y.push(amplitude * Math.cos(2 * Math.PI * frequency * t[i] + phase));
    }
    return y;
  }

  /* ---------------------------------------------------------
     square(t, amplitude, frequency, phase)
     A square wave is +A for the first half of every cycle and
     -A for the second half. It has the same sign as sin(2πft + φ).

     How it works:
       1. cycles = f·t + φ/(2π)      -> "how many cycles have passed"
       2. fraction = the part after the decimal point (0 up to 1)
       3. fraction < 0.5  -> +A,   otherwise -A

     Convention: exactly at a jump (fraction = 0.5) we use -A.
     We round the fraction a little so rounding errors don't
     flip the value at the jump by accident.
     --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     generate(type, t, params)
     One entry point so other modules don't repeat an if/else.
       type   : "sine" | "cosine" | "square"
       params : { amplitude, frequency, phase }
     --------------------------------------------------------- */
  function generate(type, t, params) {
    if (type === "sine")   { return sine(t,   params.amplitude, params.frequency, params.phase); }
    if (type === "cosine") { return cosine(t, params.amplitude, params.frequency, params.phase); }
    if (type === "square") { return square(t, params.amplitude, params.frequency, params.phase); }
    throw new Error("Unknown signal type: " + type);
  }

  // Put the tools into the shared toolbox
  SignalLab.signals.makeTimeAxis  = makeTimeAxis;
  SignalLab.signals.makeIndexAxis = makeIndexAxis;
  SignalLab.signals.roundClean    = roundClean;
  SignalLab.signals.sine          = sine;
  SignalLab.signals.cosine        = cosine;
  SignalLab.signals.square        = square;
  SignalLab.signals.generate      = generate;

})();

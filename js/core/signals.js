(function () {

  // function bet3mel array feha values eltime
  // ben3mel time axis 3shan nehaded elsignal hatt7seb 3and anhy aw2at w ba3daha nehseb amplitude elsignal 3and kol wa2t
  // start --> elbedaya , end --> elnehaya , step --> elmasafa ben kol no2ta w eltanya
  function makeTimeAxis(start, end, step) {
    const t = [];
    // count --> 3adad elmarat elhanzawed feha elwa2t b mekdar step 3shan newsal mn start l end
    const count = Math.round((end - start) / step);  
    for (let i = 0; i <= count; i++) {
      // benhseb kol no2ta zamanya w nedefha felarray
      const value = start + i * step;
      t.push(roundClean(value));
    }
    return t;
  }

  // function bet3mel array mn el indices beta3et el discrete signal
  function makeIndexAxis(nStart, nEnd) {
    const n = [];
    // law nStart = -3 w nEnd = 3 
    // yeb2a n = [-3, -2, -1, 0, 1, 2, 3]
    // el n --> amaken elsamples fel discrete signal
    for (let k = nStart; k <= nEnd; k++) {
      n.push(k);
    }
    return n;
  }

  // function betzabat elarkam w te2arabhom l 10 decimal places
  // 0.3 instead of 0.30000000000000004
  function roundClean(value) {
    return Number(value.toFixed(10));
  }

  // function bet7seb values el sine signal
  function sine(t, amplitude, frequency, phase) {
    const y = [];
    // loop bet7seb value elsignal 3and kol no2ta zmanya mawgoda fel t w tohot elresult fel y 
    for (let i = 0; i < t.length; i++) {
      // x(t) = A*sin(2 * ft + φ)
      y.push(amplitude * Math.sin(2 * Math.PI * frequency * t[i] + phase));
    }
    return y;
  }

  // function bet7seb values el cosine signal
  function cosine(t, amplitude, frequency, phase) {
    const y = [];
    // loop bet7seb value elsignal 3and kol no2ta zmanya mawgoda fel t w tohot elresult fel y 
    for (let i = 0; i < t.length; i++) {
      // x(t) = A*cos(2 * ft + φ)
      y.push(amplitude * Math.cos(2 * Math.PI * frequency * t[i] + phase));
    }
    return y;
  }

  // function bet7seb elsquare signal
  function square(t, amplitude, frequency, phase) {
    const y = [];
    for (let i = 0; i < t.length; i++) {
      // bet7seb ehna fen gowa elcycle ma3 mora3at el freq welphase
      const cycles = frequency * t[i] + phase / (2 * Math.PI);
      // betala3 elgoz2 eldecimal mn cycles w dah bysa3dna ne3raf ehna fe anhy goz2 mn elcycle
      let fraction = cycles - Math.floor(cycles);          // 0 <= fraction < 1
      // bet2alel akhta2 elhesabat
      fraction = Math.round(fraction * 1e9) / 1e9;         // remove tiny errors
      // law elfraction tele3 b 1 byraga3o l 0 3shan yefdal gowa hodod elcycle
      if (fraction >= 1) { fraction = 0; }
      // law ehna fe awel nos mn elcycle elvalue betkon A law felnos eltany betkon -A
      y.push(fraction < 0.5 ? amplitude : -amplitude);
    }
    return y;
  }

  // function betkhtar no3 elsignal el3ayzen nehsebha 
  // law sine betstad3y function elsine
  // law cosine betstad3y function elcosine
  // law square betstad3y function elsquare
  // law had talab no3 function msh mawgod betala3 error
  function generate(type, t, params) {
    if (type === "sine")   { return sine(t,   params.amplitude, params.frequency, params.phase); }
    if (type === "cosine") { return cosine(t, params.amplitude, params.frequency, params.phase); }
    if (type === "square") { return square(t, params.amplitude, params.frequency, params.phase); }
    throw new Error("Unknown signal type: " + type);
  }

  // benkhaly elfunctions mota7a lba2y elproject
  // signalLab.signals kan obj fady kda ehna bendeflo functions
  SignalLab.signals.makeTimeAxis  = makeTimeAxis;
  SignalLab.signals.makeIndexAxis = makeIndexAxis;
  SignalLab.signals.roundClean    = roundClean;
  SignalLab.signals.sine          = sine;
  SignalLab.signals.cosine        = cosine;
  SignalLab.signals.square        = square;
  SignalLab.signals.generate      = generate;

})();

/* ==========================================================
   periodicity.math.js  (Person 5)
   Periodicity Analyzer: MATH ONLY (numbers in, numbers out, no HTML).

   THE RULES (all proved, none based on "it looks repeated")

   CONTINUOUS  x(t) = A sin(2*pi*f*t + phi), f != 0
     T0 = 1 / |f|.   A negative f gives the same period (|f|).
     f = 0 gives a constant: periodic, but there is NO smallest period.

   DISCRETE    x[n] = A sin(2*pi*f*n + phi), f in cycles per sample
     Periodic exactly when f is RATIONAL. Write f = p/q in lowest terms
     (q > 0); then N0 = q.
     (One degenerate case: f = 1/2 with sin(phi) = 0 gives x[n] = 0 for
     every n, a constant, so N0 = 1.)

   SUM of continuous sinusoids (every frequency nonzero)
     A common period T needs T*f_k to be a whole number for EVERY k
     (the sinusoids are independent, so each one must repeat by itself).
     That is possible exactly when every ratio f_j / f_k is rational.
       - all ratios rational  -> periodic, T0 = 1 / gcd(f_1, f_2, ...)
       - some ratio irrational -> NOT periodic
     Terms with f = 0 are constants and do not matter. Terms with the
     same |f| are merged first: they can cancel (sin(2*pi*t) +
     sin(2*pi*t + pi) = 0), and a cancelled term must not count.

   SUM of discrete sinusoids
     Every f must be rational. N0 = lcm of the denominators q_k, after
     merging terms with the same frequency (f and f + 1 and -f give the
     same samples up to sign, so they are merged, and can cancel).

   HOW WE STAY EXACT
   A frequency typed as text is read into an EXACT number
        value = (n / d) * pi^e * sqrt(m)
   with whole numbers n, d, e, m (BigInt for n, d, m). So "3/4" is exactly
   3/4, "0.1" is exactly 1/10, "sqrt(2)" is exactly sqrt(2) and "pi" is
   exactly pi. Rationality is then decided with whole-number logic:
       r1*pi^e1*sqrt(m1) / r2*pi^e2*sqrt(m2) is rational
       <=> e1 = e2 and m1 = m2 (m squarefree).
   (sqrt(m) is irrational unless m = 1, pi is irrational, in fact
   transcendental, and sqrt(m1)/sqrt(m2) is irrational for different
   squarefree m1, m2.)

   LIMITS (also told to the user)
   * A DECIMAL is a fraction: 0.3333 is exactly 3333/10000, NOT 1/3, and
     3.14159 is NOT pi. A decimal can never be proved irrational, so it
     is always treated as the exact fraction it spells.
   * Irrational frequencies are accepted only in the forms r*pi^k*sqrt(m)
     (for example pi, 2*pi, sqrt(2), sqrt(2)/2, 1/pi). Sums such as
     1 + sqrt(2) are not supported.
   * "Cancelled" means the merged amplitude is below 1e-9 (relative to
     the largest amplitude). Phases are ordinary numbers, so this is the
     only floating-point decision in the whole analysis.

   WAVEFORMS: each signal is a sine or a cosine, A*sin(2*pi*f*x + phi) or
   A*cos(2*pi*f*x + phi). A cosine is a shifted sine, so the period rules
   are the same; merging uses the exact identity
   A*cos(th + phi) = A*cos(phi)*cos(th) - A*sin(phi)*sin(th).

   WHAT IS DRAWN: one plot per signal plus the sum. Each periodic plot
   comes with the EXACT span of one fundamental period (0 to T0, or the
   samples n = 0 .. N0-1), taken from the analysis, never from looking at
   the picture.

   DEPENDENCY: reuses LIMITS and getContinuousTimeAxis from
   generator.math.js, and signals.generate / makeIndexAxis from core.
   ========================================================== */
(function () {

  function generatorMath() { return SignalLab.math.generator; }

  const LIMITS = {
    maxComponents: 4,         // signals in a sum (one plot is drawn for each)
    maxInputLength: 60,         // characters in one typed number
    maxDigits: 15,              // digits in one typed number
    maxExponent: 12,            // in 1.5e-3 style numbers
    maxRadicand: 1e12,          // largest m allowed under sqrt
    maxPiPower: 6,
    frequencyMax: 100,          // Hz, or cycles/sample (value of |f|)
    amplitudeMax: 100,
    phaseMax: 1000,
    cancelTolerance: 1e-9,      // relative to the largest amplitude
    continuousWindowMax: 100,   // seconds
    discreteWindowMax: 200,     // largest n shown
    autoCyclesMax: 60,          // automatic window: cycles of the fastest wave
    userCyclesMax: 200,         // typed window: same limit as the Generator
    verifyPeriodMax: 1e6        // largest discrete period we also check numerically
  };

  /* =========================================================
     1. WHOLE-NUMBER HELPERS (BigInt)
     ========================================================= */

  function absBig(a) { return a < 0n ? -a : a; }

  function gcdBig(a, b) {
    a = absBig(a); b = absBig(b);
    while (b !== 0n) { const t = a % b; a = b; b = t; }
    return a;
  }

  function lcmBig(a, b) {
    if (a === 0n || b === 0n) { return 0n; }
    return absBig(a) / gcdBig(a, b) * absBig(b);
  }

  /* =========================================================
     2. EXACT NUMBERS   value = (n/d) * pi^e * sqrt(m)
        n, d, m are BigInt, e is an ordinary integer,
        d > 0, n/d is in lowest terms, m is squarefree (m >= 1).
        Zero is always { n: 0, d: 1, e: 0, m: 1 }.
     ========================================================= */

  /* Splits m into a*a*free, with free squarefree. m <= 1e12, so trial
     division up to 1e6 is quick. */
  function splitSquare(m) {
    if (m > BigInt(LIMITS.maxRadicand)) { throw { parseError: "That square root is too large (the number under the root must be at most 1,000,000,000,000)." }; }
    let rest = Number(m);
    let square = 1;
    for (let p = 2; p * p <= rest; p++) {
      while (rest % (p * p) === 0) { rest /= p * p; square *= p; }
    }
    return { square: BigInt(square), free: BigInt(rest) };
  }

  function makeExact(n, d, e, m) {
    if (n === 0n) { return { n: 0n, d: 1n, e: 0, m: 1n }; }
    if (d < 0n) { n = -n; d = -d; }
    const parts = splitSquare(m);
    n = n * parts.square;
    const g = gcdBig(n, d);
    return { n: n / g, d: d / g, e: e, m: parts.free };
  }

  function exactFromInteger(k) { return makeExact(BigInt(k), 1n, 0, 1n); }
  function exactIsZero(x) { return x.n === 0n; }
  function exactIsRational(x) { return x.e === 0 && x.m === 1n; }
  function exactSign(x) { return x.n < 0n ? -1 : (x.n > 0n ? 1 : 0); }
  function exactNegate(x) { return { n: -x.n, d: x.d, e: x.e, m: x.m }; }
  function exactAbs(x) { return exactSign(x) < 0 ? exactNegate(x) : x; }
  function exactMultiply(x, y) { return makeExact(x.n * y.n, x.d * y.d, x.e + y.e, x.m * y.m); }

  /* 1/x. Since 1/sqrt(m) = sqrt(m)/m, the coefficient picks up an extra 1/m. */
  function exactInvert(x) {
    if (exactIsZero(x)) { throw { parseError: "Division by zero." }; }
    return makeExact(x.d, x.n * x.m, -x.e, x.m);
  }

  /* sqrt of a positive fraction a/b:  sqrt(a/b) = sqrt(a*b) / b */
  function exactSqrt(x) {
    if (!exactIsRational(x) || x.n <= 0n) {
      throw { parseError: "A square root needs a positive whole number or fraction inside, such as sqrt(2) or sqrt(1/2)." };
    }
    return makeExact(1n, x.d, 0, x.n * x.d);
  }

  function exactToNumber(x) {
    if (exactIsZero(x)) { return 0; }
    return (Number(x.n) / Number(x.d)) * Math.pow(Math.PI, x.e) * Math.sqrt(Number(x.m));
  }

  /* Same irrational part (same power of pi AND same square root)?
     For nonzero numbers this is exactly "ratio is rational". */
  function exactSameBasis(x, y) { return x.e === y.e && x.m === y.m; }

  /* x / y as a reduced fraction { n, d } (d > 0). Only for the same basis. */
  function exactRatio(x, y) {
    let n = x.n * y.d;
    let d = x.d * y.n;
    if (d < 0n) { n = -n; d = -d; }
    const g = gcdBig(n, d);
    return { n: n / g, d: d / g };
  }

  /* Text such as 3/4, 2π, √2/2, π/4, 1/(2π), -3√5/2 */
  function formatExact(x) {
    if (exactIsZero(x)) { return "0"; }
    const sign = x.n < 0n ? "-" : "";
    const n = absBig(x.n);
    const top = [];
    const bottom = [];
    const sqrtText = x.m !== 1n ? "√" + x.m.toString() : "";
    const piText = function (k) { return k === 1 ? "π" : "π" + (k === 2 ? "²" : "^" + k); };
    if (x.e > 0) { top.push(piText(x.e)); }
    if (x.e < 0) { bottom.push(piText(-x.e)); }
    if (sqrtText) { top.push(sqrtText); }
    let topText = top.join("");
    if (n !== 1n || topText === "") { topText = n.toString() + topText; }
    let bottomText = bottom.join("");
    if (x.d !== 1n || bottomText === "") {
      if (x.d !== 1n) { bottomText = x.d.toString() + bottomText; }
    }
    if (bottomText === "") { return sign + topText; }
    const needsBrackets = bottom.length > 0 && x.d !== 1n;
    return sign + topText + "/" + (needsBrackets ? "(" + bottomText + ")" : bottomText);
  }

  function formatFraction(n, d) { return d === 1n ? n.toString() : n.toString() + "/" + d.toString(); }

  /* =========================================================
     3. READING TYPED NUMBERS  (whole numbers, decimals, fractions,
        and the exact forms with pi and sqrt)
     ========================================================= */

  function fail(message) { throw { parseError: message }; }

  const HELP = "Use a whole number, a decimal, a fraction such as 3/4, or an exact form such as 2*pi or sqrt(2).";

  function tokenize(source) {
    const tokens = [];
    let i = 0;
    const numberPattern = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
    const wordPattern = /[A-Za-z]+/y;
    while (i < source.length) {
      const ch = source[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[\d.]/.test(ch)) {
        numberPattern.lastIndex = i;
        const found = numberPattern.exec(source);
        if (!found) { fail("“" + source + "” is not a valid number. " + HELP); }
        tokens.push({ kind: "num", text: found[0] });
        i += found[0].length;
        continue;
      }
      if (/[A-Za-z]/.test(ch)) {
        wordPattern.lastIndex = i;
        const word = wordPattern.exec(source)[0];
        const lower = word.toLowerCase();
        if (lower === "pi") { tokens.push({ kind: "pi" }); }
        else if (lower === "sqrt") { tokens.push({ kind: "sqrt" }); }
        else { fail("“" + word + "” is not understood. " + HELP); }
        i += word.length;
        continue;
      }
      if (ch === "π") { tokens.push({ kind: "pi" }); i++; continue; }
      if (ch === "√") { tokens.push({ kind: "sqrt" }); i++; continue; }
      if (ch === "*" || ch === "×" || ch === "·") { tokens.push({ kind: "*" }); i++; continue; }
      if (ch === "/" || ch === "÷") { tokens.push({ kind: "/" }); i++; continue; }
      if (ch === "+") { tokens.push({ kind: "+" }); i++; continue; }
      if (ch === "-" || ch === "−" || ch === "–") { tokens.push({ kind: "-" }); i++; continue; }
      if (ch === "(" || ch === ")") { tokens.push({ kind: ch }); i++; continue; }
      fail("The character “" + ch + "” is not allowed. " + HELP);
    }
    return tokens;
  }

  /* "12.5e-1" -> exact 5/4. The digits are read as written, never through floating point. */
  function exactFromNumberText(text) {
    const match = /^(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(text);
    const intDigits = match[1];
    const fracDigits = match[2];
    if (intDigits.length + fracDigits.length > LIMITS.maxDigits) { fail("That number has too many digits (at most " + LIMITS.maxDigits + ")."); }
    const exponent = match[3] ? parseInt(match[3], 10) : 0;
    if (Math.abs(exponent) > LIMITS.maxExponent) { fail("The exponent is too large (at most " + LIMITS.maxExponent + ")."); }
    let n = BigInt((intDigits + fracDigits) || "0");
    let d = 10n ** BigInt(fracDigits.length);
    if (exponent > 0) { n *= 10n ** BigInt(exponent); } else if (exponent < 0) { d *= 10n ** BigInt(-exponent); }
    return makeExact(n, d, 0, 1n);
  }

  /* ---------------------------------------------------------
     parseExact(text)  ->  { ok: true, value: Exact }  or  { ok: false, error }
     Grammar:  expr    = unary { ("*" | "/" | implicit) unary }
               unary   = ["+" | "-"] unary | primary
               primary = number | pi | sqrt primary | "(" expr ")"
     "2pi" and "2sqrt(2)" are allowed (implicit multiplication), but
     "1/2pi" is refused because it can be read two ways.
     --------------------------------------------------------- */
  function parseExact(text) {
    const source = String(text === undefined || text === null ? "" : text).trim();
    if (source === "") { return { ok: false, error: "Nothing was entered." }; }
    if (source.length > LIMITS.maxInputLength) { return { ok: false, error: "That entry is too long." }; }
    try {
      const tokens = tokenize(source);
      let pos = 0;
      const peek = function () { return pos < tokens.length ? tokens[pos].kind : null; };

      function parsePrimary() {
        const token = tokens[pos];
        if (!token) { fail("The entry ends too early. " + HELP); }
        if (token.kind === "num") { pos++; return exactFromNumberText(token.text); }
        if (token.kind === "pi") { pos++; return makeExact(1n, 1n, 1, 1n); }
        if (token.kind === "sqrt") {
          pos++;
          return exactSqrt(parsePrimary());
        }
        if (token.kind === "(") {
          pos++;
          const inner = parseExpression();
          if (peek() !== ")") { fail("A closing bracket “)” is missing."); }
          pos++;
          return inner;
        }
        if (token.kind === ")") { fail("There is a closing bracket “)” without an opening one."); }
        fail("An operator is in the wrong place. " + HELP);
      }

      function parseUnary() {
        if (peek() === "-") { pos++; return exactNegate(parseUnary()); }
        if (peek() === "+") { pos++; return parseUnary(); }
        return parsePrimary();
      }

      function parseExpression() {
        let value = parseUnary();
        let lastOperator = null;
        for (;;) {
          const next = peek();
          if (next === "*") { pos++; value = exactMultiply(value, parseUnary()); lastOperator = "*"; }
          else if (next === "/") { pos++; value = exactMultiply(value, exactInvert(parseUnary())); lastOperator = "/"; }
          else if (next === "pi" || next === "sqrt" || next === "(") {
            if (lastOperator === "/") {
              fail("This can be read two ways. Add brackets: write (1/2)*pi or 1/(2*pi) instead of 1/2pi.");
            }
            value = exactMultiply(value, parsePrimary());
            lastOperator = "implicit";
          } else { break; }
        }
        return value;
      }

      const value = parseExpression();
      if (pos < tokens.length) {
        const rest = tokens[pos].kind;
        if (rest === "+" || rest === "-") { fail("Sums and differences are not supported inside one number. Enter each sinusoid as its own component."); }
        if (rest === "num") { fail("Two numbers in a row need an operator between them (for example 2*3). " + HELP); }
        if (rest === ")") { fail("There is a closing bracket “)” without an opening one."); }
        fail("The entry could not be read. " + HELP);
      }
      if (Math.abs(value.e) > LIMITS.maxPiPower) { fail("The power of π is too large."); }
      if (value.n.toString().length > 30 || value.d.toString().length > 30) { fail("That number is too large."); }
      return { ok: true, value: value };
    } catch (problem) {
      if (problem && problem.parseError) { return { ok: false, error: problem.parseError }; }
      throw problem;
    }
  }

  /* =========================================================
     4. THE SIGNAL  (components, evaluation, description)
        A component is { type: "sine" | "cosine", amplitude,
        frequency: Exact, phase }.
     ========================================================= */

  const SIGNAL_TYPES = ["sine", "cosine"];

  function subscriptNumber(k) {
    const digits = "₀₁₂₃₄₅₆₇₈₉";
    return String(k).split("").map(function (c) { return digits[Number(c)]; }).join("");
  }

  function formatNumber(value) {
    if (!isFinite(value)) { return String(value); }
    if (value === 0) { return "0"; }
    const a = Math.abs(value);
    if (a >= 1e6 || a < 1e-4) { return value.toExponential(3); }
    return String(Number(value.toPrecision(6)));
  }

  function waveName(component) { return component.type === "cosine" ? "cos" : "sin"; }

  /* One signal's values at every position of "axis" (seconds or whole n). */
  function evaluateComponent(component, axis) {
    return SignalLab.signals.generate(component.type === "cosine" ? "cosine" : "sine", axis, {
      amplitude: component.amplitude, frequency: exactToNumber(component.frequency), phase: component.phase
    });
  }

  /* The sum of all signals. */
  function evaluateSignal(components, axis) {
    const total = axis.map(function () { return 0; });
    components.forEach(function (c) {
      const y = evaluateComponent(c, axis);
      for (let i = 0; i < total.length; i++) { total[i] += y[i]; }
    });
    return total;
  }

  /* "sin(2π·(3/4)·t + 0.5)", leaving out an amplitude of 1 and a phase of 0 */
  function termText(component, isDiscrete) {
    const variable = isDiscrete ? "n" : "t";
    const f = formatExact(component.frequency);
    let inner;
    if (f === "1") { inner = "2π" + variable; }
    else if (/^\d+$/.test(f)) { inner = "2π·" + f + "·" + variable; }
    else { inner = "2π·(" + f + ")·" + variable; }
    if (Math.abs(component.phase) > 1e-12) {
      inner += (component.phase < 0 ? " − " : " + ") + formatNumber(Math.abs(component.phase));
    }
    return (component.amplitude === 1 ? "" : formatNumber(component.amplitude) + "·") + waveName(component) + "(" + inner + ")";
  }

  function signalFormula(components, isDiscrete) {
    return "x" + (isDiscrete ? "[n]" : "(t)") + " = " +
      components.map(function (c) { return termText(c, isDiscrete); }).join(" + ");
  }

  /* Names for the steps: f, x, T, N, or f₁, x₁, T₁, N₁ ... for a sum */
  function makeNames(count) {
    const multi = count > 1;
    return {
      multi: multi,
      f: function (i) { return multi ? "f" + subscriptNumber(i + 1) : "f"; },
      x: function (i) { return multi ? "x" + subscriptNumber(i + 1) : "x"; },
      T: function (i) { return multi ? "T" + subscriptNumber(i + 1) : "T"; },
      N: function (i) { return multi ? "N" + subscriptNumber(i + 1) : "N"; }
    };
  }

  function frequencyValueText(f, unit) {
    return formatExact(f) + " " + unit + (exactIsRational(f) ? "" : " ≈ " + formatNumber(exactToNumber(f)) + " " + unit);
  }

  function plural(count, word) { return count === 1n ? word : word + "s"; }

  /* =========================================================
     5. THE ANALYSIS
     ========================================================= */

  /* Why is the ratio of two exact numbers with DIFFERENT irrational
     parts not a fraction? Returns one sentence. */
  function whyRatioIrrational(a, b) {
    const ratio = formatExact(exactMultiply(a, exactInvert(b)));
    if (a.e !== b.e) {
      return "The ratio f/f′ = " + ratio + " contains a power of π, and π is irrational (in fact transcendental), so this ratio cannot be a fraction of whole numbers.";
    }
    return "The ratio f/f′ = " + ratio + " contains a square root of a number that is not a perfect square, and such roots are irrational.";
  }

  /* ---------------------------------------------------------
     mergeTerms: groups terms that give the same sinusoid and adds them.
       sine:    A sin(2 pi f x + phi) = A sin(phi) cos(2 pi g x) + sign A cos(phi) sin(2 pi g x)
       cosine:  A cos(2 pi f x + phi) = A cos(phi) cos(2 pi g x) - sign A sin(phi) sin(2 pi g x)
     where g > 0 is the frequency used for the group:
       continuous: g = |f|,  sign = sign of f
       discrete:   g = f reduced into [0, 1/2] (f and f + 1 are the same
                   samples, and -f flips the sign of the sine part)
     Merged terms share one (c, s). The group is "alive" when its
     amplitude is above the cancel tolerance.
     --------------------------------------------------------- */
  function mergeTerms(components, isDiscrete) {
    const groups = [];
    const byKey = {};
    components.forEach(function (comp, index) {
      const f = comp.frequency;
      let key;
      let sign;
      let freqText;
      let rationalPart = null;
      let kind;
      if (exactIsZero(f)) {
        key = "dc"; sign = 1; kind = "dc"; freqText = "0"; rationalPart = { n: 0n, d: 1n };
      } else if (isDiscrete && exactIsRational(f)) {
        const d = f.d;
        const rem = ((f.n % d) + d) % d;                 // f mod 1, as rem/d
        if (rem === 0n) {
          key = "dc"; sign = 1; kind = "dc"; freqText = "0"; rationalPart = { n: 0n, d: 1n };
        } else if (2n * rem > d) {
          sign = -1; const g = gcdBig(d - rem, d);
          rationalPart = { n: (d - rem) / g, d: d / g };
        } else {
          sign = 1; const g = gcdBig(rem, d);
          rationalPart = { n: rem / g, d: d / g };
        }
        if (kind !== "dc") {
          kind = "rational";
          key = "r:" + rationalPart.n + "/" + rationalPart.d;
          freqText = formatFraction(rationalPart.n, rationalPart.d);
        }
      } else {
        sign = exactSign(f);
        const magnitude = exactAbs(f);
        key = "x:" + magnitude.e + ":" + magnitude.m + ":" + magnitude.n + "/" + magnitude.d;
        kind = exactIsRational(f) ? "rational" : "irrational";
        freqText = formatExact(magnitude);
        if (exactIsRational(f)) { rationalPart = { n: magnitude.n, d: magnitude.d }; }
      }
      let group = byKey[key];
      if (!group) {
        group = { key: key, kind: kind, freqText: freqText, rational: rationalPart,
                  magnitude: kind === "irrational" || (!isDiscrete && kind === "rational") ? exactAbs(f) : null,
                  c: 0, s: 0, members: [] };
        byKey[key] = group;
        groups.push(group);
      }
      const A = comp.amplitude;
      if (comp.type === "cosine") {
        group.c += A * Math.cos(comp.phase);
        group.s += -sign * A * Math.sin(comp.phase);
      } else {
        group.c += A * Math.sin(comp.phase);
        group.s += sign * A * Math.cos(comp.phase);
      }
      group.members.push(index);
    });
    return groups;
  }

  /* Amplitude of the merged group. A constant (dc) has no sine part;
     in discrete mode the frequency 1/2 has no sine part either
     (sin(pi n) = 0 at every integer n). */
  function groupSize(group, isDiscrete) {
    const halfDiscrete = isDiscrete && group.kind === "rational" && group.rational.n === 1n && group.rational.d === 2n;
    if (group.kind === "dc" || halfDiscrete) { return Math.abs(group.c); }
    return Math.hypot(group.c, group.s);
  }

  function labelList(names, indices) {
    return indices.map(function (i) { return names.x(i); }).join(", ");
  }

  function baseAnalysis(values) {
    return {
      mode: values.mode,
      isDiscrete: values.mode === "discrete",
      periodic: false,
      constant: false,
      fundamental: null,          // { text, value, ... } for T0 or N0; null when there is none
      verdict: "",                // "Periodic" / "Aperiodic"
      headline: "",               // one-sentence answer
      why: "",                    // one short sentence for the result card
      formula: signalFormula(values.components, values.mode === "discrete"),
      frequencies: [],            // "f₁ = 1 Hz", ...
      ratio: null,                // { text, lines, rational, proportion } for two or more frequencies
      steps: [],                  // [{ title, lines }]  "How did we get this result?"
      reasons: [],                // all step lines in one list
      notes: []                   // limitations that apply to THIS input
    };
  }

  function finish(analysis) {
    analysis.reasons = [];
    analysis.steps.forEach(function (step) {
      step.lines.forEach(function (line) { analysis.reasons.push(line); });
    });
    return analysis;
  }

  /* ---------------------------------------------------------
     buildRatio: the frequency ratios of the signals that really oscillate
     (merged groups, so a term that cancelled is not shown).
     Two signals: f1/f2.  More: every f_k/f1, plus f1 : f2 : f3 in whole numbers.
     --------------------------------------------------------- */
  function buildRatio(values, groups, names) {
    const list = groups.map(function (g) {
      return { index: g.members[0], mag: exactAbs(values.components[g.members[0]].frequency) };
    });
    if (list.length < 2) { return null; }
    const first = list[0];
    const rational = list.every(function (item) { return exactSameBasis(item.mag, first.mag); });
    const piece = function (a, b) {
      if (exactSameBasis(a.mag, b.mag)) {
        const r = exactRatio(a.mag, b.mag);
        return formatFraction(r.n, r.d) + " (rational)";
      }
      return formatExact(exactMultiply(a.mag, exactInvert(b.mag))) + " (irrational)";
    };
    const lines = [];
    let proportion = null;
    if (rational) {
      let L = 1n;
      list.forEach(function (item) { L = lcmBig(L, item.mag.d); });
      const whole = list.map(function (item) { return item.mag.n * (L / item.mag.d); });
      let g = 0n;
      whole.forEach(function (w) { g = gcdBig(g, w); });
      proportion = list.map(function (item) { return names.f(item.index); }).join(" : ") + " = " +
                   whole.map(function (w) { return (w / g).toString(); }).join(" : ");
    }
    let text;
    if (list.length === 2) {
      const line = names.f(list[0].index) + "/" + names.f(list[1].index) + " = " + piece(list[0], list[1]);
      lines.push(line);
      text = line;
      if (rational) { lines.push(proportion); text = line + ", that is " + proportion; }
    } else {
      for (let k = 1; k < list.length; k++) {
        lines.push(names.f(list[k].index) + "/" + names.f(first.index) + " = " + piece(list[k], first));
      }
      text = rational ? proportion + " (every ratio is rational)" : lines.join("; ");
      if (rational) { lines.push(proportion); }
    }
    return { text: text, lines: lines, rational: rational, proportion: proportion };
  }

  /* One line about one signal's frequency (continuous). */
  function continuousFrequencyLine(comp, index, names) {
    const f = comp.frequency;
    const label = names.f(index);
    if (exactIsZero(f)) {
      return label + " = 0 Hz: this signal is a constant (it does not oscillate), so it never changes the period.";
    }
    if (exactSign(f) < 0) {
      return label + " = " + frequencyValueText(f, "Hz") + ". Only |" + label + "| = " + frequencyValueText(exactAbs(f), "Hz") +
             " matters, because sin(−θ) = −sin θ and cos(−θ) = cos θ: a negative frequency has the same period.";
    }
    return label + " = " + frequencyValueText(f, "Hz") + ".";
  }

  /* One line about one signal's frequency (discrete). */
  function discreteFrequencyLine(comp, index, names) {
    const f = comp.frequency;
    const label = names.f(index);
    if (exactIsRational(f) && (exactIsZero(f) || f.d === 1n)) {
      return label + " = " + formatExact(f) + " cycles/sample: a whole number, so the oscillation is invisible at whole n (sin(2πfn) = 0). This term is a constant.";
    }
    if (exactIsRational(f)) {
      return label + " = " + formatFraction(f.n, f.d) + " cycles/sample = p/q with p = " + f.n.toString() + " and q = " + f.d.toString() + " (lowest terms).";
    }
    return label + " = " + frequencyValueText(f, "cycles/sample") + " is irrational: it cannot be written as p/q.";
  }

  /* ---------- continuous ---------- */
  function analyzeContinuous(values) {
    const analysis = baseAnalysis(values);
    const comps = values.components;
    const names = makeNames(comps.length);
    const maxAmplitude = Math.max.apply(null, comps.map(function (c) { return c.amplitude; }));
    const tolerance = LIMITS.cancelTolerance * maxAmplitude;
    const groups = mergeTerms(comps, false);
    const dc = groups.filter(function (g) { return g.kind === "dc"; });
    const alive = groups.filter(function (g) { return g.kind !== "dc" && groupSize(g, false) > tolerance; });
    const cancelled = groups.filter(function (g) { return g.kind !== "dc" && groupSize(g, false) <= tolerance; });
    const merged = groups.filter(function (g) { return g.kind !== "dc" && g.members.length > 1; });

    analysis.frequencies = comps.map(function (c, i) { return names.f(i) + " = " + frequencyValueText(c.frequency, "Hz"); });
    analysis.steps.push({ title: "Write the signal", lines: [analysis.formula] });
    analysis.steps.push({ title: "Read the frequencies", lines: comps.map(function (c, i) { return continuousFrequencyLine(c, i, names); }) });

    if (merged.length) {
      analysis.steps.push({ title: "Combine terms that give the same sinusoid", lines: merged.map(function (g) {
        return labelList(names, g.members) + " all have |f| = " + g.freqText + " Hz, so they add up to ONE sinusoid at that frequency" +
          (groupSize(g, false) <= tolerance ? ", and the sum is zero (they cancel exactly), so nothing oscillates at this frequency any more."
                                            : " with amplitude " + formatNumber(groupSize(g, false)) + ".");
      }) });
    }

    // Only constants left
    if (alive.length === 0) {
      const c = dc.length ? dc[0].c : 0;
      analysis.periodic = true;
      analysis.constant = true;
      analysis.verdict = "Periodic";
      analysis.headline = "The signal is constant: it repeats for every positive time shift, so it is periodic, but it has no smallest positive period.";
      analysis.why = "A constant repeats for every positive time shift T, so it is periodic. There is no smallest positive T, so no fundamental period T₀ exists.";
      analysis.steps.push({ title: "Decide", lines: [
        "No oscillating term is left, so x(t) is the constant " + formatNumber(c) + ".",
        "A constant repeats for every positive time shift: x(t + T) = x(t) for every T > 0. So the signal is periodic.",
        "A fundamental period is the SMALLEST positive period. Here 1 s, 0.1 s, 0.001 s, … all work, so no smallest one exists: there is NO fundamental period T₀."
      ] });
      return finish(analysis);
    }

    const first = alive[0];

    // Exactly one oscillating frequency
    if (alive.length === 1) {
      const T = exactInvert(first.magnitude);
      const fText = /^\d+$/.test(first.freqText) ? first.freqText : "(" + first.freqText + ")";
      analysis.periodic = true;
      analysis.verdict = "Periodic";
      analysis.fundamental = { exact: T, text: formatExact(T) + " s", value: exactToNumber(T), unit: "s" };
      analysis.headline = "Periodic with fundamental period T₀ = " + formatExact(T) + " s.";
      analysis.why = "A sinusoid with a nonzero frequency always repeats. T₀ = 1/|f| = " + formatExact(T) + " s.";
      analysis.steps.push({ title: "Use the period formula", lines: [
        "For a sinusoid with f ≠ 0 the fundamental period is T₀ = 1/|f| (the sign of f does not matter).",
        "Here |f| = " + first.freqText + " Hz, so T₀ = 1/" + fText + " = " + formatExact(T) + " s ≈ " + formatNumber(exactToNumber(T)) + " s."
      ] });
      analysis.steps.push({ title: "Check", lines: [
        "In T₀ = " + formatExact(T) + " s the signal completes |f|·T₀ = 1 full cycle, and no shorter time gives a whole number of cycles."
      ] });
      return finish(analysis);
    }

    // Several oscillating frequencies
    const ratio = buildRatio(values, alive, names);
    analysis.ratio = ratio;
    const componentStep = { title: "Find the period of each signal on its own", lines: alive.map(function (g) {
      const idx = g.members[0];
      const inv = exactInvert(g.magnitude);
      return names.T(idx) + " = 1/|" + names.f(idx) + "| = " + formatExact(inv) + " s" + (exactIsRational(inv) ? "" : " ≈ " + formatNumber(exactToNumber(inv)) + " s");
    }) };
    analysis.steps.push(componentStep);

    // Is every ratio rational?
    let offenderIndex = -1;
    for (let j = 1; j < alive.length; j++) {
      if (!exactSameBasis(first.magnitude, alive[j].magnitude)) { offenderIndex = j; break; }
    }

    if (offenderIndex >= 0) {
      componentStep.lines.push("These are component periods: the periods of the separate signals, NOT a period of the sum. The sum has none (see below).");
      const other = alive[offenderIndex];
      analysis.periodic = false;
      analysis.verdict = "Aperiodic";
      analysis.headline = "Not periodic: the ratio of two of the frequencies is irrational.";
      analysis.why = "The frequency ratio is irrational, so no time T fits a whole number of cycles of every signal. The signals never line up exactly again.";
      analysis.steps.push({ title: "Compare the frequencies", lines: ratio.lines.concat([
        "At least one ratio is irrational, so the frequencies are not multiples of a common frequency."
      ]) });
      analysis.steps.push({ title: "Why no common period exists", lines: [
        "A period T of a sum of sinusoids must make T·f a whole number for EVERY frequency f in the sum (each sinusoid has to complete whole cycles). For two frequencies f and f′ that is only possible when f/f′ is a ratio of whole numbers.",
        "Take f = " + other.freqText + " Hz and f′ = " + first.freqText + " Hz. " + whyRatioIrrational(other.magnitude, first.magnitude),
        "No T can make both T·f and T·f′ whole numbers, so x(t + T) = x(t) has no solution T > 0. The signal is APERIODIC and has no fundamental period, however long you plot it."
      ] });
      analysis.notes.push("Aperiodicity cannot be seen from a finite plot: the proof is the irrational ratio above, not the picture.");
      return finish(analysis);
    }

    // All ratios rational: T0 = 1 / gcd(frequencies)
    componentStep.lines.push("These are component periods: the periods of the separate signals. The sum repeats only when all of them repeat together, at the common period T₀ found below.");
    const fracs = alive.map(function (g) { return { n: g.magnitude.n, d: g.magnitude.d }; });
    let L = 1n;
    fracs.forEach(function (q) { L = lcmBig(L, q.d); });
    let G = 0n;
    fracs.forEach(function (q) { G = gcdBig(G, q.n * (L / q.d)); });
    const f0 = makeExact(G, L, first.magnitude.e, first.magnitude.m);
    const T0 = exactInvert(f0);
    const T0Text = formatExact(T0);

    analysis.periodic = true;
    analysis.verdict = "Periodic";
    analysis.fundamental = { exact: T0, text: T0Text + " s", value: exactToNumber(T0), unit: "s", frequency: f0 };
    analysis.headline = "Periodic with fundamental period T₀ = " + T0Text + " s.";
    analysis.why = "Every frequency ratio is rational, so all the signals fit a whole number of cycles into T₀ = " + T0Text + " s.";
    analysis.steps.push({ title: "Compare the frequencies", lines: ratio.lines.concat([
      "Every ratio is a ratio of whole numbers (rational), so the sum IS periodic."
    ]) });
    analysis.steps.push({ title: "Find the common period", lines: [
      "A common period T must make T·f a whole number for every frequency f in the sum.",
      "The greatest common divisor of the frequencies is f₀ = " + formatExact(f0) + " Hz.",
      "T₀ = 1/f₀ = " + T0Text + " s" + (exactIsRational(T0) ? "" : " ≈ " + formatNumber(exactToNumber(T0)) + " s") + "."
    ] });
    analysis.steps.push({ title: "Check", lines: [
      "In T₀ = " + T0Text + " s: " + alive.map(function (g) {
        const k = exactRatio(g.magnitude, f0);
        return names.x(g.members[0]) + " completes " + k.n.toString() + " " + plural(k.n, "cycle");
      }).join(", ") + ". These are whole numbers, so the pattern repeats exactly.",
      "No shorter period works: the cycle counts have no common factor, so only multiples of T₀ are periods."
    ] });
    if (cancelled.length) {
      analysis.notes.push("A term that cancelled exactly was ignored, because it adds nothing to x(t).");
    }
    return finish(analysis);
  }

  /* ---------- discrete ---------- */
  function analyzeDiscrete(values) {
    const analysis = baseAnalysis(values);
    const comps = values.components;
    const names = makeNames(comps.length);
    const maxAmplitude = Math.max.apply(null, comps.map(function (c) { return c.amplitude; }));
    const tolerance = LIMITS.cancelTolerance * maxAmplitude;
    const groups = mergeTerms(comps, true);
    const dc = groups.filter(function (g) { return g.kind === "dc"; });
    const alive = groups.filter(function (g) { return g.kind !== "dc" && groupSize(g, true) > tolerance; });
    const cancelled = groups.filter(function (g) { return g.kind !== "dc" && groupSize(g, true) <= tolerance; });

    analysis.frequencies = comps.map(function (c, i) { return names.f(i) + " = " + frequencyValueText(c.frequency, "cycles/sample"); });
    analysis.steps.push({ title: "Write the signal", lines: [analysis.formula] });

    const frequencyLines = comps.map(function (c, i) { return discreteFrequencyLine(c, i, names); });
    // f and f + 1 give the same samples
    comps.forEach(function (comp, i) {
      if (exactIsRational(comp.frequency) && !exactIsZero(comp.frequency) &&
          2n * absBig(comp.frequency.n) > comp.frequency.d && comp.frequency.d !== 1n) {
        frequencyLines.push(names.f(i) + " = " + formatFraction(comp.frequency.n, comp.frequency.d) +
          " is above 1/2 in size. Samples exist only at whole n, so f, f + 1 and −f give the same samples (up to sign). The period is still the denominator q.");
      }
    });
    analysis.steps.push({ title: "Read the normalized frequencies", lines: frequencyLines });

    const mergeLines = [];
    groups.filter(function (g) { return g.kind !== "dc" && g.members.length > 1; }).forEach(function (g) {
      mergeLines.push(labelList(names, g.members) + " give the same samples up to sign (same frequency modulo 1), so they add up to one sinusoid" +
        (groupSize(g, true) <= tolerance ? ", and the sum is zero (they cancel exactly)." : " with amplitude " + formatNumber(groupSize(g, true)) + "."));
    });
    cancelled.forEach(function (g) {
      if (g.members.length === 1) {
        const comp = comps[g.members[0]];
        const isHalf = g.rational && g.rational.n === 1n && g.rational.d === 2n;
        mergeLines.push(names.x(g.members[0]) + " has f = " + formatExact(comp.frequency) +
          (isHalf ? ": at whole n it equals A·sin φ·(−1)ⁿ (or A·cos φ·(−1)ⁿ), and that coefficient is 0 here, so every sample is 0."
                  : ": its amplitude is zero, so it contributes nothing."));
      }
    });
    if (mergeLines.length) { analysis.steps.push({ title: "Combine terms that give the same samples", lines: mergeLines }); }

    // Any surviving irrational frequency: aperiodic
    const irrational = alive.filter(function (g) { return g.kind === "irrational"; });
    if (irrational.length) {
      const g = irrational[0];
      analysis.periodic = false;
      analysis.verdict = "Aperiodic";
      analysis.headline = "Not periodic: the frequency " + g.freqText + " is irrational.";
      analysis.ratio = buildRatio(values, alive, names);
      analysis.why = "The frequency " + g.freqText + " is irrational. No whole number of samples N makes fN a whole number, so the sequence never repeats.";
      if (analysis.ratio) {
        analysis.steps.push({ title: "Compare the frequencies", lines: analysis.ratio.lines.concat([
          "In discrete time it is not enough to look at the ratio: EVERY frequency must itself be rational."
        ]) });
      }
      analysis.steps.push({ title: "Why the sequence is aperiodic", lines: [
        "x[n] = A·sin(2πfn + φ) repeats with period N only if fN is a whole number (N full cycles fit in N samples). That needs f = (whole number)/N, so f must be rational.",
        "f = " + g.freqText + " cannot be written as a fraction of whole numbers" +
          (g.magnitude.e !== 0 ? " (π is irrational, in fact transcendental)" : " (the square root of a number that is not a perfect square is irrational)") +
          ", so no whole N works. The sequence is APERIODIC and has no fundamental period N₀."
      ] });
      analysis.notes.push("Aperiodicity cannot be seen from a finite plot: the proof is that f is irrational.");
      return finish(analysis);
    }

    if (alive.length === 0) {
      const c = dc.length ? dc[0].c : 0;
      analysis.periodic = true;
      analysis.constant = true;
      analysis.verdict = "Periodic";
      analysis.fundamental = { exact: null, text: "1 sample", value: 1, unit: "samples", integer: 1n };
      analysis.headline = "The sequence is constant (x[n] = " + formatNumber(c) + "): it repeats for every positive whole-number shift, so it is periodic. The smallest shift is N₀ = 1.";
      analysis.why = "x[n] is the same constant at every n, so every positive whole shift is a period. The smallest one is N₀ = 1.";
      analysis.steps.push({ title: "Decide", lines: [
        "No oscillating term is left, so x[n] takes the same value " + formatNumber(c) + " at every n.",
        "Every positive whole-number shift N satisfies x[n + N] = x[n], so the sequence is periodic.",
        "Shifts are whole numbers here, so there IS a smallest positive one, N = 1: N₀ = 1. (In continuous time a constant has no smallest positive shift.)"
      ] });
      return finish(analysis);
    }

    const denominators = alive.map(function (g) { return g.rational.d; });
    let N0 = 1n;
    denominators.forEach(function (q) { N0 = lcmBig(N0, q); });
    analysis.periodic = true;
    analysis.verdict = "Periodic";
    analysis.fundamental = { exact: null, text: N0.toString() + " samples", value: Number(N0), unit: "samples", integer: N0 };
    analysis.headline = "Periodic with fundamental period N₀ = " + N0.toString() + " samples.";

    analysis.steps.push({ title: "Apply the discrete rule", lines: [
      "x[n] = A·sin(2πfn + φ) is periodic exactly when f is rational. Write f = p/q in lowest terms (q > 0); then N₀ = q, because q is the smallest whole N for which fN is a whole number."
    ].concat(alive.length === 1
      ? ["Here f = " + formatFraction(comps[alive[0].members[0]].frequency.n, comps[alive[0].members[0]].frequency.d) + " in lowest terms, so q = " + alive[0].rational.d.toString() + " and N₀ = " + N0.toString() + " samples."]
      : alive.map(function (g) { return names.N(g.members[0]) + " = q = " + g.rational.d.toString() + " samples."; })) });

    if (alive.length > 1) {
      analysis.ratio = buildRatio(values, alive, names);
      analysis.steps.push({ title: "Compare the frequencies", lines: analysis.ratio.lines.concat([
        "Every frequency is rational, so each signal repeats by itself. The sum repeats when all of them repeat together."
      ]) });
      analysis.steps.push({ title: "Find the common period", lines: [
        "N₀ = lcm(" + alive.map(function (g) { return names.N(g.members[0]); }).join(", ") + ") = lcm(" +
          denominators.map(function (q) { return q.toString(); }).join(", ") + ") = " + N0.toString() + " samples."
      ] });
    }
    analysis.steps.push({ title: "Check", lines: [
      "In N₀ = " + N0.toString() + " samples: " + alive.map(function (g) {
        const f = comps[g.members[0]].frequency;
        const cycles = absBig(f.n) * (N0 / f.d);
        return names.x(g.members[0]) + " completes " + cycles.toString() + " " + plural(cycles, "cycle");
      }).join(", ") + ". These are whole numbers, so the sequence repeats exactly after N₀ samples."
    ] });
    analysis.why = alive.length === 1
      ? "f is rational (p/q with q = " + N0.toString() + "), so x[n] repeats every N₀ = q = " + N0.toString() + " samples."
      : "Every frequency is rational, so the sum repeats every N₀ = lcm of the denominators = " + N0.toString() + " samples.";
    if (cancelled.length) { analysis.notes.push("A term that cancelled exactly was ignored, because it adds nothing to x[n]."); }
    return finish(analysis);
  }

  function analyze(values) {
    const analysis = values.mode === "discrete" ? analyzeDiscrete(values) : analyzeContinuous(values);
    // Limitations that depend on how the numbers were typed
    const decimals = values.components.filter(function (c) { return /\./.test(c.frequencyText || "") && exactIsRational(c.frequency) && !exactIsZero(c.frequency); });
    if (decimals.length) {
      analysis.notes.push("A decimal such as " + decimals[0].frequencyText + " is read as the exact fraction " + formatExact(decimals[0].frequency) +
        ". A decimal is never treated as an irrational number, even if it looks like one (3.14159 is not π). Type pi or sqrt(2) for exact irrational values, and 1/3 for one third.");
    }
    return analysis;
  }

  /* =========================================================
     6. NUMERICAL SANITY CHECK  (never used to decide periodicity)
     ========================================================= */

  /* Largest |x(t + T) - x(t)| over 401 sample positions in [0, 2T] (continuous),
     or over n = 0 .. 2N (discrete). A found period should give about 1e-12. */
  function verifyPeriod(values, period) {
    const isDiscrete = values.mode === "discrete";
    let axis;
    let shifted;
    if (isDiscrete) {
      if (period > LIMITS.verifyPeriodMax) { return null; }
      const count = Math.min(2 * period, 2000);
      axis = SignalLab.signals.makeIndexAxis(0, count);
      shifted = axis.map(function (n) { return n + period; });
    } else {
      if (!isFinite(period) || period <= 0) { return null; }
      axis = [];
      for (let i = 0; i <= 400; i++) { axis.push(2 * period * i / 400); }
      shifted = axis.map(function (t) { return t + period; });
    }
    const a = evaluateSignal(values.components, axis);
    const b = evaluateSignal(values.components, shifted);
    let worst = 0;
    for (let i = 0; i < a.length; i++) { worst = Math.max(worst, Math.abs(a[i] - b[i])); }
    return worst;
  }

  /* =========================================================
     7. INPUT CHECKING
     ========================================================= */

  /* Reads a number written as text. Whole numbers, decimals, fractions and
     the exact forms are all accepted; the result is a plain number. */
  function readPlainNumber(text, label, example) {
    const parsed = parseExact(text);
    if (!parsed.ok) {
      return { ok: false, error: label + ": " + (parsed.error === "Nothing was entered." ? "enter a number, for example " + example + "." : parsed.error) };
    }
    return { ok: true, value: exactToNumber(parsed.value) };
  }

  /* ---------------------------------------------------------
     validateInputs(raw)
     raw = { mode, window, components: [ { type, amplitude, frequency, phase } ] }  (all text)
     Returns { ok, errors, values }
       errors = { general, window, components: [ { type, amplitude, frequency, phase } ] }
       values = { mode, window (number or null), components: [ { type, amplitude, frequency (Exact),
                  frequencyText, phase } ] }
     --------------------------------------------------------- */
  function validateInputs(raw) {
    const errors = { general: null, window: null, components: [] };
    const values = { mode: raw.mode, window: null, components: [] };
    let ok = true;

    if (raw.mode !== "continuous" && raw.mode !== "discrete") { errors.general = "Choose continuous or discrete."; ok = false; }
    const isDiscrete = raw.mode === "discrete";
    const list = raw.components || [];
    if (list.length < 1) { errors.general = "Add at least one signal."; ok = false; }
    if (list.length > LIMITS.maxComponents) { errors.general = "At most " + LIMITS.maxComponents + " signals are allowed."; ok = false; }

    list.forEach(function (item) {
      const e = {};
      const out = { type: "sine", amplitude: null, frequency: null, frequencyText: String(item.frequency === undefined ? "" : item.frequency).trim(), phase: null };

      const type = item.type === undefined ? "sine" : item.type;
      if (SIGNAL_TYPES.indexOf(type) === -1) { e.type = "Choose sine or cosine."; } else { out.type = type; }

      const amp = readPlainNumber(item.amplitude, "Amplitude", "1.5");
      if (!amp.ok) { e.amplitude = amp.error; }
      else if (amp.value <= 0) { e.amplitude = "Amplitude must be greater than 0. To flip a wave, use a phase of pi."; }
      else if (amp.value > LIMITS.amplitudeMax) { e.amplitude = "Amplitude must be " + LIMITS.amplitudeMax + " or less."; }
      else { out.amplitude = amp.value; }

      const freq = parseExact(item.frequency);
      if (!freq.ok) {
        e.frequency = "Frequency: " + (freq.error === "Nothing was entered."
          ? "enter a number, for example " + (isDiscrete ? "1/8 or 0.125" : "2 or 3/4") + "." : freq.error);
      } else if (Math.abs(exactToNumber(freq.value)) > LIMITS.frequencyMax) {
        e.frequency = "The size of the frequency must be " + LIMITS.frequencyMax + (isDiscrete ? " cycles/sample" : " Hz") + " or less.";
      } else { out.frequency = freq.value; }

      const phase = readPlainNumber(item.phase, "Phase", "0.785 or pi/4");
      if (!phase.ok) { e.phase = phase.error; }
      else if (Math.abs(phase.value) > LIMITS.phaseMax) { e.phase = "Phase must be between -" + LIMITS.phaseMax + " and " + LIMITS.phaseMax + " radians."; }
      else { out.phase = phase.value; }

      errors.components.push(e);
      if (Object.keys(e).length) { ok = false; }
      values.components.push(out);
    });

    // Optional plot window (blank = automatic)
    const windowText = String(raw.window === undefined || raw.window === null ? "" : raw.window).trim();
    if (windowText !== "") {
      const w = readPlainNumber(windowText, "Plot window", isDiscrete ? "60" : "10");
      if (!w.ok) { errors.window = w.error; ok = false; }
      else if (w.value <= 0) { errors.window = "The plot window must be greater than 0."; ok = false; }
      else if (isDiscrete && Math.abs(w.value - Math.round(w.value)) > 1e-9) { errors.window = "In discrete mode the window is a whole number of samples (the last n shown), for example 60."; ok = false; }
      else if (isDiscrete && w.value > LIMITS.discreteWindowMax) { errors.window = "The window must be " + LIMITS.discreteWindowMax + " samples or less."; ok = false; }
      else if (!isDiscrete && w.value > LIMITS.continuousWindowMax) { errors.window = "The window must be " + LIMITS.continuousWindowMax + " s or less."; ok = false; }
      else {
        values.window = isDiscrete ? Math.round(w.value) : w.value;
        if (!isDiscrete && ok) {
          const fastest = Math.max.apply(null, values.components.map(function (c) { return c.frequency ? Math.abs(exactToNumber(c.frequency)) : 0; }));
          if (fastest * w.value > LIMITS.userCyclesMax) {
            errors.window = "This would show " + Math.round(fastest * w.value) + " cycles of the fastest wave, too many to draw clearly (limit " + LIMITS.userCyclesMax + "). Use a shorter window.";
            ok = false;
          }
        }
      }
    }

    return { ok: ok, errors: errors, values: values };
  }

  /* =========================================================
     8. WHAT TO DRAW
     ========================================================= */

  /* The exact span of ONE fundamental period inside the plotted window,
     taken from the analysis (never from the picture).
       continuous: from t = 0 to t = T0
       discrete:   the N0 samples n = 0 .. N0-1
     role: "fundamental" for the period of the whole signal (the Result), or
     "component" for the period of one signal of a sum on its own; a component
     period is labelled "Component period ..." so it is never mistaken for the
     fundamental period of the sum.
     Returns { spec, tooLong, text }. spec is null when there is nothing to
     mark: aperiodic, constant, or a period longer than the window. */
  function periodSpan(isDiscrete, analysis, lastShown, name, role) {
    if (!analysis.periodic || analysis.constant || !analysis.fundamental) { return { spec: null, tooLong: false, text: "" }; }
    const prefix = role === "component" ? "Component period " : "";
    if (isDiscrete) {
      const N = Number(analysis.fundamental.integer);
      const text = name + " = " + N + " samples";
      if (N - 1 > lastShown) { return { spec: null, tooLong: true, text: prefix + text }; }
      return { spec: {
        kind: "discrete", start: 0, end: N - 1, count: N, value: N, role: role,
        text: text, label: prefix + text + " (n = 0 … " + (N - 1) + ")",
        startLabel: "n = 0", endLabel: "n = " + (N - 1)
      }, tooLong: false, text: text };
    }
    const T = analysis.fundamental.value;
    const text = name + " = " + analysis.fundamental.text.replace(/ s$/, "") +
      (analysis.fundamental.exact && !exactIsRational(analysis.fundamental.exact) ? " ≈ " + formatNumber(T) : "") + " s";
    if (T > lastShown * (1 + 1e-9)) { return { spec: null, tooLong: true, text: prefix + text }; }
    return { spec: {
      kind: "continuous", start: 0, end: T, count: null, value: T, role: role,
      text: text, label: prefix + text,
      startLabel: "t = 0", endLabel: "t = " + Number(T.toPrecision(3)) + " s"
    }, tooLong: false, text: text };
  }

  /* One plot: its values, its y range, and its highlighted period. */
  function makePlotItem(key, title, t, y, span) {
    let maxAbs = 0;
    y.forEach(function (v) { maxAbs = Math.max(maxAbs, Math.abs(v)); });
    if (maxAbs < 1e-9) { maxAbs = 1; }
    const spec = span.spec;
    let highlight = null;
    if (spec) {
      const keep = [];
      const stop = spec.kind === "discrete" ? spec.end : spec.end * (1 + 1e-9);
      for (let i = 0; i < t.length; i++) { if (t[i] >= spec.start && t[i] <= stop) { keep.push(i); } }
      highlight = { t: keep.map(function (i) { return t[i]; }), y: keep.map(function (i) { return y[i]; }) };
    }
    return {
      key: key, title: title, t: t, y: y,
      yRange: [-1.15 * maxAbs, (spec ? 1.7 : 1.15) * maxAbs],
      yArrow: 1.38 * maxAbs,
      period: spec, highlight: highlight,
      periodNote: span.tooLong ? span.text + " is longer than the plotted window, so it cannot be marked here." : ""
    };
  }

  /* ---------------------------------------------------------
     buildPlots(values, analysis)
     Returns { windowText, partial, plots: [...] }
       one signal:  [ the signal ]
       a sum:       [ Signal 1, Signal 2, ..., the sum ]
     All plots share the same time (or n) axis. Every periodic plot carries
     the exact span of one of ITS fundamental periods.
     Automatic window:
       periodic: three periods (if that fits)
       aperiodic: about five cycles of the slowest wave
     --------------------------------------------------------- */
  function buildPlots(values, analysis) {
    const isDiscrete = values.mode === "discrete";
    const comps = values.components;
    const speeds = comps.map(function (c) { return Math.abs(exactToNumber(c.frequency)); }).filter(function (v) { return v > 0; });
    const fastest = speeds.length ? Math.max.apply(null, speeds) : 1;
    const slowest = speeds.length ? Math.min.apply(null, speeds) : 1;
    const period = analysis.fundamental ? analysis.fundamental.value : null;

    let t;
    let partial = false;
    let windowText;
    let lastShown;
    if (isDiscrete) {
      let last = values.window;
      if (last === null) {
        if (analysis.periodic && period !== null && period <= 66) { last = Math.max(3 * period, 12); }
        else if (analysis.periodic) { last = LIMITS.discreteWindowMax - 1; }
        else { last = 99; }
      }
      t = SignalLab.signals.makeIndexAxis(0, last);
      windowText = "n = 0 to " + last;
      partial = analysis.periodic && !analysis.constant && period !== null && period > last;
      lastShown = last;
    } else {
      let W = values.window;
      if (W === null) {
        if (analysis.periodic && period !== null) { W = 3 * period; }
        else if (analysis.constant) { W = 2; }
        else { W = 5 / slowest; }
        W = Math.min(W, LIMITS.continuousWindowMax);
        const cap = LIMITS.autoCyclesMax / fastest;
        if (W > cap) { W = cap; partial = analysis.periodic && period !== null && W < 3 * period; }
      } else {
        partial = analysis.periodic && period !== null && W < 3 * period;
      }
      t = generatorMath().getContinuousTimeAxis(0, W, fastest);
      windowText = "t = 0 to " + formatNumber(W) + " s";
      lastShown = t[t.length - 1];
    }

    const multi = comps.length > 1;
    const plots = [];
    if (multi) {
      comps.forEach(function (c, i) {
        const own = analyze({ mode: values.mode, window: null, components: [c] });
        const span = periodSpan(isDiscrete, own, lastShown, (isDiscrete ? "N" : "T") + subscriptNumber(i + 1), "component");
        plots.push(makePlotItem("component", "Signal " + (i + 1) + ":  " + (isDiscrete ? "x" : "x") + subscriptNumber(i + 1) + (isDiscrete ? "[n]" : "(t)") + " = " + termText(c, isDiscrete),
                                t, evaluateComponent(c, t), span));
      });
    }
    const sumSpan = periodSpan(isDiscrete, analysis, lastShown, isDiscrete ? "N₀" : "T₀", "fundamental");
    const sumTitle = multi
      ? "Result (sum):  x" + (isDiscrete ? "[n]" : "(t)") + " = " + comps.map(function (c, i) { return "x" + subscriptNumber(i + 1); }).join(" + ")
      : analysis.formula;
    plots.push(makePlotItem(multi ? "sum" : "signal", sumTitle, t, evaluateSignal(comps, t), sumSpan));

    return { windowText: windowText, partial: partial, plots: plots };
  }

  SignalLab.math.periodicity = {
    LIMITS: LIMITS,
    // exact numbers
    parseExact: parseExact,
    exactToNumber: exactToNumber,
    exactIsRational: exactIsRational,
    exactIsZero: exactIsZero,
    exactSameBasis: exactSameBasis,
    exactRatio: exactRatio,
    formatExact: formatExact,
    formatFraction: formatFraction,
    gcdBig: gcdBig,
    lcmBig: lcmBig,
    // the analysis
    analyze: analyze,
    verifyPeriod: verifyPeriod,
    evaluateSignal: evaluateSignal,
    evaluateComponent: evaluateComponent,
    termText: termText,
    signalFormula: signalFormula,
    validateInputs: validateInputs,
    buildPlots: buildPlots,
    formatNumber: formatNumber
  };

})();

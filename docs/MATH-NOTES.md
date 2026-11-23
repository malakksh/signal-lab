# Math notes

Each module owner explains their formulas here in plain language
(what it means, a small worked example, and common mistakes).

## Core signals (Person 1)
- Sine: `x(t) = A·sin(2πft + φ)`. A = height, f = cycles per second, φ = shift in radians.
- Cosine: `x(t) = A·cos(2πft + φ)`. The same wave as a sine, shifted by a quarter cycle.
- Square: +A for the first half of each cycle, -A for the second half.

## Module sections (to be written in Stage 2)
- Signal Generator (Person 2): see below
- Signal Operations (Person 3): see below
- Even & Odd Decomposition (Person 4)
- Periodicity Analyzer (Person 5)
- Convolution Simulator (Person 6): see below

## Signal Generator (Person 2)

**Formulas**
- Sine: `x(t) = A·sin(2πft + φ)`
- Cosine: `x(t) = A·cos(2πft + φ)`
- Square: `x(t) = A·sign(sin(2πft + φ))`

**Meaning**
- A (amplitude): the peak value. Doubling A doubles every value.
- f (frequency, Hz): cycles per second. Period `T = 1/f`.
- φ (phase, radians): shifts the wave in time. Positive φ moves it LEFT by `φ/(2πf)` seconds, because `sin(2πft + φ) = sin(2πf(t + φ/(2πf)))`.
- `cos(θ) = sin(θ + π/2)`, so a sine with φ = π/2 is a cosine.

**Square wave at the jumps.** `sign(0)` is 0, but a square wave should be ±A. At the exact moment the sine crosses zero we use +A when it is heading positive and −A when it is heading negative. Everywhere else it matches `A·sign(sin(...))` exactly.

**Continuous vs discrete**
- Continuous: many close points (40 per cycle, at least 500) joined by a line.
- Discrete: N samples at `t[n] = start + n·Ts`, with `Ts = (end − start)/(N − 1)`, so `x[n] = x(t[n])`. Drawn as stems.

**Aliasing.** The sampling rate is `fs = 1/Ts`. You need `f < fs/2` (more than 2 samples per cycle). Otherwise the stems look like a slower wave. Example: f = 2 Hz with N = 9 over 2 s gives fs = 4 Hz, so f = fs/2 and the module shows a warning.

**Input limits:** A in (0, 100], f in (0, 100] Hz, |φ| ≤ 1000, |time| ≤ 1000 s, window ≤ 100 s, at most 200 cycles (continuous), N a whole number from 2 to 500.

## Signal Operations (Person 3)

**The key idea.** Our signals are defined by formulas, so we never move or stretch a picture. For `y(t) = x(g(t))` we compute, for every output time `t`, the source time `g(t)` and evaluate the formula of `x` there. Because the formula exists for all times, nothing is cut off or zero-padded at the edge of the plot.

**Combining two signals** (both are calculated on one shared time axis)
- Addition `y(t) = x1(t) + x2(t)`: same-phase waves reinforce, opposite waves cancel.
- Subtraction `y(t) = x1(t) − x2(t)` = `x1(t) + (−x2(t))`. Order matters.
- Multiplication `y(t) = x1(t)·x2(t)`: peak is `A1·A2`. Example: `sin(2πt)·cos(2πt) = ½ sin(4πt)`.

**Time alignment.** Two signals can only be combined at times where both have a value. `alignSignals` matches samples by their TIME (within 1e-9), keeps only the shared ones, and throws an error if there are none. It never interpolates. In the app both signals use the same axis, so all points are shared.

**Time shifting** `y(t) = x(t − t0)`: y at time t reads x at the earlier time `t − t0`. `t0 > 0` delays (graph moves right), `t0 < 0` advances (moves left). Example: x peaks at 0.25; with `t0 = 1`, `y(1.25) = x(0.25)`. For a sinusoid it equals a phase change of `−2πf·t0`. **Whole periods look like no shift:** if `t0·f` is a whole number (for example `t0 = 1 s` for a 1 Hz wave, whose period is `T = 1 s`), the shifted wave lies exactly on top of the original, so the graph looks unchanged even though the calculation is correct. Try a quarter period (`t0 = 0.25`) to see the movement. The app shows a note when this happens.

**Time scaling** `y(t) = x(a·t)`: y at time t reads x at time `a·t`.
- `|a| > 1` compression: squeezed, faster. Frequency `|a|·f`, period `T/|a|`.
- `0 < |a| < 1` expansion: stretched, slower. Period `T/|a|` (longer).
- `a < 0` also reverses time. The phase φ is NOT scaled: `x(2t) = A·sin(2πf·2t + φ)`.

**Time reversal** `y(t) = x(−t)`: mirror around `t = 0`. Even signals (cosine) are unchanged because `cos(−θ) = cos θ`. Odd signals (sine) flip because `sin(−θ) = −sin θ`.

**Discrete signals** `x[n] = A·sin(2π·f·n + φ)`, with `f` in cycles per sample (0 < f ≤ 0.5). There are no values between integers, so we never interpolate:
- Shift `x[n − n0]`: `n0` must be a whole number.
- Scale `a = M` (whole number): `y[n] = x[M·n]` keeps every M-th sample (compression). Information is lost.
- Scale `a = 1/L`: `y[n] = x[n/L]` exists only when `L` divides `n`. The other samples are set to 0 (zero insertion, the standard convention for expansion). They are not interpolated.
- **The output axis is not the input axis.** `y[n]` exists only where its source index `a·n` lies inside the input window. For `x[n]` on n = -20..20: `a = 4` gives n = -5..5 (11 samples, reading x at -20, -16, ..., 20); `a = 2` gives n = -10..10; `a = 1/2` gives n = -40..40 (81 samples, zeros at odd n); `a = 1/3` gives n = -60..60. The original signal plot is unchanged.
- Any other `a` (for example 1.5) would need values between samples and is rejected with an explanation.
- Reversal `x[−n]` works for every signal.

**Input limits:** A in (0, 100]; f in (0, 100] Hz (discrete: (0, 0.5] cycles/sample); |φ| ≤ 1000; window ≤ 100 s (discrete: ≤ 200 samples); |shift| ≤ 1000; `0.1 ≤ |a| ≤ 10`; at most 200 cycles of the fastest wave (multiplication creates `f1 + f2`; scaling multiplies f by |a|).

## Even & odd decomposition (Stage 4)

Every signal splits into an even part and an odd part:

- `x_e(t) = [x(t) + x(−t)] / 2` is even: `x_e(−t) = x_e(t)`.
- `x_o(t) = [x(t) − x(−t)] / 2` is odd: `x_o(−t) = −x_o(t)`, so `x_o(0) = 0`.
- They add back to the original: `x_e + x_o = x`, because the `x(−t)` terms cancel.

Method: for every `t` the program evaluates the signal's formula at `t` and at `−t`, then combines the two numbers (no picture is flipped). The range is symmetric: `t` from `−T` to `T`, or `n = −N, …, N` (whole numbers, `2N + 1` samples, no interpolation). The continuous axis uses an even number of steps so that `t = 0` is a grid point and the axis is exactly symmetric.

Closed form for a sine with phase: `A·sin(θ + φ) = A·sin φ·cos θ + A·cos φ·sin θ` with `θ = 2πft`, so `x_e = A·sin φ·cos(2πft)` and `x_o = A·cos φ·sin(2πft)`. A sine with `φ = 0` is purely odd; with `φ = π/2` it is a cosine and purely even. A square wave uses the +A / −A convention at jumps and at 0, which can leave isolated single points (for example `x_e(0) = A`) in the even part.

Verification (tolerance 1e-9): reconstruction `x = x_e + x_o` at every point; `x_e` equals itself at every mirrored pair; `x_o` equals minus itself at every mirrored pair; and `x_o(0) = 0`.

**Input limits:** A in (0, 100]; f in (0, 100] Hz (discrete: (0, 0.5] cycles/sample); |φ| ≤ 1000; continuous `2T ≤ 100 s`; discrete `N` a whole number, 1 to 100; at most 200 cycles shown.

## Periodicity analyzer (Stage 5)

A signal is **periodic** if some `T > 0` satisfies `x(t + T) = x(t)` for every `t`. The smallest such `T` is the **fundamental period** `T₀`. A plot can only show a finite piece, so a repeating-looking picture proves nothing. The verdict always comes from the rules below.

**Waveforms.** Each signal is a sine `A·sin(2πft + φ)` or a cosine `A·cos(2πft + φ)`. A cosine is a shifted sine, so every period rule below is the same for both.

**One continuous sinusoid** `x(t) = A·sin(2πft + φ)`, `f ≠ 0`: `T₀ = 1/|f|`. A negative `f` gives the same period. `f = 0` is a constant: it repeats for **every** positive time shift, so it is periodic, but there is no smallest positive period, so it has **no** fundamental period `T₀`. (In discrete time shifts are whole numbers, so a constant has the smallest shift `N₀ = 1`.)

**One discrete sinusoid** `x[n] = A·sin(2πfn + φ)`, `f` in cycles per sample: it repeats after `N` samples only if `fN` is a whole number, so it is periodic **exactly when `f` is rational**. With `f = p/q` in lowest terms (`q > 0`), `N₀ = q`. So `f = 3/8` has `N₀ = 8`. Special case: `f = 1/2` gives `sin(πn + φ) = sin φ·(−1)ⁿ`, which is all zeros when `sin φ = 0`; that constant has `N₀ = 1`, not 2. Because `n` is whole, `f`, `f + 1` and `−f` give the same samples up to sign, so `f = 5/4` behaves like `1/4`.

**Sum of continuous sinusoids.** A common period must make `T·f_k` a whole number for **every** frequency `f_k` (distinct sinusoids are independent, so each must complete whole cycles by itself). That is possible exactly when every ratio `f_j/f_k` is rational:
- all ratios rational: periodic, `T₀ = 1/f₀` with `f₀ = gcd(f₁, f₂, …)`. For fractions, write them over a common denominator `L`: `f_k = a_k/L`, then `f₀ = gcd(a_k)/L`. (For example `1/2` and `3/4` give `f₀ = 1/4`, `T₀ = 4`. This is the same as the least common multiple of the periods 2 and 4/3.)
- some ratio irrational: **not periodic**. Example: `1` and `√2`.

**Sum of discrete sinusoids.** Every frequency must be rational, and `N₀ = lcm(q₁, q₂, …)`. Example: `1/4` and `1/6` give `lcm(4, 6) = 12`. One irrational frequency makes the whole sum aperiodic.

**Merging before deciding.** Terms that give the same sinusoid are added first, because they can cancel. A sine term equals `A·sinφ·cos(2πgt) + s·A·cosφ·sin(2πgt)` and a cosine term equals `A·cosφ·cos(2πgt) − s·A·sinφ·sin(2πgt)`, where `g = |f|` and `s = sign f` (discrete: `g` is `f` reduced into `[0, 1/2]`, which also handles `f + 1` and `−f`). Adding the cosine and sine parts of terms with equal `g` gives the real amplitude; a term whose merged amplitude is zero must not count. Without this, `sin(2πt) + sin(2πt + π) = 0` or `sin(2√2πt) + sin(2√2πt + π) + sin(2πt)` would be analysed wrongly. Terms with `f = 0` (or a whole-number discrete `f`) are constants and never change the period. If nothing oscillating remains the signal is constant (continuous: no `T₀`; discrete: `N₀ = 1`).

**Exact arithmetic (why you can type `3/4`, `pi`, `sqrt(2)`).** A frequency is read into the exact form `(n/d)·π^e·√m` using whole numbers (BigInt), so `3/4` is exactly 3/4 and `0.1` is exactly 1/10. A ratio of two such numbers is rational **if and only if** they have the same `e` and the same squarefree `m` (`√m` is irrational for `m > 1`, `π` is irrational and in fact transcendental, and `√m₁/√m₂` is irrational for different squarefree `m₁, m₂`). This is a decision on whole numbers, never on floating-point approximations. `T₀ = 1/f₀` is also kept exactly (for example `1/π` or `√2/2`).

**Limitations.**
- A **decimal is a fraction.** `0.3333` is exactly `3333/10000` (so a discrete `f = 0.3333` has `N₀ = 10000`), `1.4142` is `7071/5000` and `3.14159` is not `π`. A decimal can never be proved irrational, so it is never classified as irrational. Use `pi` or `sqrt(2)` for exact irrational values.
- Irrational frequencies are accepted only in the forms `r·π^k·√m` (such as `pi`, `3*pi/2`, `sqrt(2)/10`, `1/pi`). Sums inside one frequency (`1 + sqrt(2)`) are not supported.
- "Cancelled" means a merged amplitude below `1e-9` times the largest amplitude. Phases are ordinary numbers, so this is the only floating-point decision in the analysis (typing `pi` for a phase is exact).
- The "numerical sanity check" (`max |x(t + T₀) − x(t)|`) only confirms a period that the rules already found. It is never used to decide periodicity.
- Limits: 1 to 4 signals (one plot is drawn for each); `0 < A ≤ 100`; `|f| ≤ 100`; `|φ| ≤ 1000`; plot window ≤ 100 s (discrete: ≤ 200 samples) and at most 200 cycles of the fastest wave.

**Frequency ratio shown in the result card.** For a sum, the card shows the ratios of the frequencies that really oscillate (merged terms, so a cancelled term is not listed): two signals give `f₁/f₂ = 1/2 (rational), that is f₁ : f₂ = 1 : 2`; three or more give `f₂/f₁, f₃/f₁, …` and the whole-number proportion `f₁ : f₂ : f₃ = 2 : 3 : 4`. In **continuous** time a rational ratio makes the sum periodic. In **discrete** time the ratio is only shown for information: the test is that **every** frequency is rational (`√2/10` and `√2/5` have the rational ratio 1/2, but each is irrational, so the discrete sum is aperiodic, while the same two frequencies in continuous time are periodic).

**Highlighting one period.** The shaded band is taken from the analysis, never from the picture:
- continuous: from `t = 0` to `t = T₀` (the exact fundamental period, for example `1/π` for `f = π`);
- discrete: the `N₀` samples `n = 0, 1, …, N₀ − 1`. The band reaches half a sample past both ends so it covers whole stems, and the next period starts at `n = N₀`.

A sum is drawn as Signal 1, Signal 2, … and the Result. Only the **Result** can carry the fundamental period `T₀` or `N₀` (magenta). Each Signal plot shows that signal's own period as a **component period** (grey-blue, labelled "Component period T₁ = …"), which is not the period of the sum. An aperiodic sum has no fundamental period, so nothing is marked on its Result. Nothing is marked for a constant, or when the period is longer than the plotted window (a note says so). Tests check that the marked span is a true period of the plotted signal, that no shorter span is, and (discrete) that it equals the smallest `N` found by brute force on the drawn samples.

## Convolution Simulator (Person 6)

Convolution combines two signals into a third. `h` is flipped, slid along `x`, multiplied with it, and the overlap is added up (or integrated). The module does it in **two modes**.

### Discrete-time convolution (exact)
`y[n] = Σ x[k]·h[n−k]`, the sum over every `k` where both `x[k]` and `h[n−k]` exist.

For ONE output sample `y[n]`:
1. **Flip** `h[k]` to `h[−k]` (reverse the order, so a sequence starting at `b` and ending at `e` now starts at `−e`).
2. **Shift** it by `n`: `h[n−k]` is the flipped copy slid `n` places to the right.
3. **Multiply** the samples that line up: `x[k]·h[n−k]`.
4. **Sum** the products. The total is `y[n]`.

**Indices.** A finite sequence is a start index plus a list of values; it is 0 everywhere else. If `x` has `N` values starting at `a` and `h` has `M` values starting at `b`:
- `y` has **`N + M − 1`** values, starting at `a + b` and ending at `(a + N − 1) + (b + M − 1)`.
- For one output sample, `k` runs from `max(start(x), n − end(h))` to `min(end(x), n − start(h))`. Those are exactly the positions where both `x[k]` and `h[n−k]` exist.
- The length rule counts the values you typed (including any zeros at the ends). If the first or last values of the output happen to be 0, the nonzero part can be shorter, but the declared extent is still `N + M − 1`.

**Worked example.** `x = [1, 2, 3, 4]`, `h = [1, 1, 1]`, both starting at 0. `y = [1, 3, 6, 9, 7, 4]` (6 = 4 + 3 − 1 values). For example `y[3] = x[1]h[2] + x[2]h[1] + x[3]h[0] = 2 + 3 + 4 = 9`.

**Nonzero starts.** `x = [1, 2]` starting at −2 and `h = [1, 1, 1]` starting at 3 give `y = [1, 3, 3, 2]` starting at `−2 + 3 = 1`, so `y[1..4]`.

**Facts the tests check.** Convolving with the impulse `δ[n]` gives `x` back; with `δ[n−2]` it delays `x` by 2 (the start index moves by 2). `x*h = h*x`, `(x*h)*g = x*(h*g)`, `(cx)*h = c(x*h)`, and the values of `y` add up to `(Σx)(Σh)`. All of these are shown or checked in the page and the test file.

**Exact.** There is no approximation: only a finite number of products are added. The only error is the tiny rounding any computer makes with decimal numbers (for whole numbers the result is exactly right).

### Continuous-time convolution (numerical approximation)
`y(t) = ∫ x(τ)·h(t−τ) dτ`.

For ONE time `t`:
1. **Flip** `h(τ)` to `h(−τ)`.
2. **Shift** it to `h(t−τ)` (its starting point now sits at `τ = t`).
3. **Multiply** `x(τ)·h(t−τ)` at every `τ`.
4. **Integrate** the product over `τ`. The area is `y(t)`.

**Signals have a time range.** The integral of two never-ending waves does not settle, so each signal is `x(t) = A·wave(t)` for `start ≤ t ≤ end` and 0 elsewhere. The wave is written in absolute time (for example `sin(2πft)`) and the range cuts a piece out of it. A *rectangular pulse* is just the constant `A` on its range. If `x` lives on `[a, b]` and `h` on `[c, d]`, then `y` lives on `[a + c, b + d]`.

**Integration limits.** `x(τ)` is nonzero for `a ≤ τ ≤ b`; `h(t−τ)` is nonzero for `t − d ≤ τ ≤ t − c`. So the product is nonzero only for `lo ≤ τ ≤ hi` with `lo = max(a, t − d)` and `hi = min(b, t − c)`. If `hi ≤ lo` the signals do not overlap and `y(t) = 0`.

**Trapezoidal rule.** The interval `[lo, hi]` is cut into `M = ceil((hi − lo)/step)` equal slices of width `Δ = (hi − lo)/M` (never wider than the step you chose). Each slice is a trapezoid, and adding their areas gives

`∫ f ≈ Δ·( ½·f₀ + f₁ + f₂ + … + f(M−1) + ½·f(M) )`.

Because the limits sit exactly on the edges of the overlap, the pulse edges are never inside a slice.

**Accuracy (what to expect).**
- For smooth integrands the error is about `Δ²/12 · (f′(hi) − f′(lo))`: halving the step cuts the error to about a quarter. The module's tests check this ratio (≈ 4) and the formula itself.
- A constant integrand (pulse × pulse) is integrated exactly for any step, so two pulses give an exact triangle or trapezoid.
- A jump inside the integral (a square wave) cannot be followed exactly, so near it the error is about the size of the step. The page warns about this.
- The page shows the same `y(t)` for the step, step/2 and step/4 ("Accuracy at this t"). If the values agree to several digits the step is small enough.

**Worked example.** Two pulses of height 1 on `[0, 1]`: `y(t) = min(t, 2 − t)` for `0 ≤ t ≤ 2`, a triangle with peak 1 at `t = 1`. A sine `sin(2πt)` on `[0, 1]` with a pulse of height 1 on `[0, 0.5]` gives `y(0.5) = 1/π ≈ 0.3183`.

**Self-checks shown on the page.**
- *Area rule:* `∫y dt = (∫x dt)·(∫h dt)`. The readout shows both sides; a mismatch means the step is too coarse.
- *Impulse:* a very narrow, tall pulse of area 1 acts like an impulse and gives back (almost) `x` (the "Near-impulse" example).

**Limits.** Amplitude up to 100 (negative allowed), frequency up to 50 Hz, at most 100 cycles in a time range, time ranges up to 20 s wide and `|time| ≤ 100`, step between 0.002 and 0.5, and at most 3 million integrand evaluations per result (otherwise the page asks for a larger step or shorter ranges). The plot of `y(t)` uses at least 301 points.

### Exact discrete sums vs approximate continuous integrals
| | Discrete-time | Continuous-time |
|---|---|---|
| Formula | `y[n] = Σ x[k]·h[n−k]` | `y(t) = ∫ x(τ)·h(t−τ) dτ` |
| Method | finite sum | trapezoidal rule |
| Exact? | yes (up to decimal rounding) | no: an approximation that improves as the step shrinks |
| Plot | stems | lines |
| Output extent | `N + M − 1` samples from `a + b` | the range `[a + c, b + d]` |


# Signal Lab: Interactive Signals & Systems Simulator

A browser-based simulator built with HTML, CSS, vanilla JavaScript and Plotly.js.
No backend, no database, no build tools.

## How to run
1. Download or clone the project.
2. Double-click `index.html` (needs internet once, to load Plotly from its CDN).
3. Check the "System check" card on the dashboard. Every line should show a green tick.

## Modules
| # | Module | Owner |
|---|--------|-------|
| 0 | Core, Dashboard, Integration | Person 1 |
| 1 | Signal Generator | Person 2 |
| 2 | Signal Operations | Person 3 |
| 3 | Even & Odd Decomposition | Person 4 |
| 4 | Periodicity Analyzer | Person 5 |
| 5 | Convolution Simulator (continuous and discrete) | Person 6 |

## Periodicity Analyzer
Choose Continuous or Discrete, a Single Signal or a Sum of Signals (up to 4), and a sine or cosine for each. "Try a Preset" fills the controls with predefined signal settings; preset names only describe the signal and never reveal the result. The result card shows PERIODIC or APERIODIC, the fundamental period (only when one exists), the frequencies, their ratio and a short reason. A periodic result shades one complete fundamental period (magenta) between dashed start and end lines, with the period value on an arrow. In a sum, the individual signals show grey-blue "component periods", which are not the period of the sum. "How did we get this result?" lists the steps.

**Typing numbers.** The frequency, amplitude and phase boxes accept whole numbers (`2`), decimals (`0.75`), fractions (`3/4`) and exact forms: `pi`, `2*pi`, `pi/4`, `sqrt(2)`, `sqrt(2)/10`, `1/(2*pi)`. A decimal is always read as the exact fraction it spells (`0.3333` is 3333/10000, not 1/3), so use fractions, `pi` or `sqrt` when exactness matters. The rules and limits are in `docs/MATH-NOTES.md`.

**Shared plot helper.** `SignalLab.plot.makePeriodMarkers(spec)` (in `plotHelpers.js`) builds the shaded band, start/end lines and labelled arrow for any module; pass its `shapes` and `annotations` to `plotContinuous` or `plotStem` through `options.shapes` and `options.annotations`. Modules that do not pass them are unchanged.

## Convolution Simulator
Pick **Continuous-Time Convolution** or **Discrete-Time Convolution** at the top of the controls. A coloured banner always says which one is on screen (cyan with line plots for continuous, magenta with stem plots for discrete). Each mode keeps its own inputs, and "Examples" buttons load ready-made cases.

- **Discrete-time**: `y[n] = Σ x[k]·h[n−k]`. Type two finite sequences (for example `1, 2, 3, 4`, fractions like `1/3` are fine) and the index each one starts at. The answer is exact. The output has `N + M − 1` values starting at `start(x) + start(h)`, and the page checks this every time. A table lists the products added for every output sample.
- **Continuous-time**: `y(t) = ∫ x(τ)·h(t−τ) dτ`. Each signal is a sine, cosine, square wave or rectangular pulse on its own time range (0 outside it). The integral is **approximated with the trapezoidal rule**, and you choose the step size. An accuracy table repeats one y(t) with the step, step/2 and step/4 so you can see the approximation settle.
- **Step by step**: the slider (or ◀ ▶ buttons) moves the flipped copy of h across x. You see the faint original h, the flipped and shifted h, the product (with the trapezoids shaded in continuous mode, or the overlapping samples shaded in discrete mode), and the four steps with the current numbers.

Limits (so the page stays fast and readable): discrete sequences up to 20 values, start indices from −50 to 50; continuous time ranges up to 20 s wide, amplitude up to 100, frequency up to 50 Hz, step size from 0.002 to 0.5, and at most 3 million integrand calculations per result. Details and formulas are in `docs/MATH-NOTES.md`.

**Shared plot helper.** `plotContinuous` and `plotStem` also accept `options.xRange` (like `yRange`) to fix the horizontal range, so an axis does not jump while a slider moves traces. Modules that do not pass it are unchanged.

## Tests
Open `tests/math-tests.html` in a browser. Every line should say PASS. The Convolution tests cover known hand-checked results, impulses, start indices, output length, the laws of convolution (commutative, associative, sum rule) against an independent method, the trapezoidal rule against exact integrals, and its error behaviour.

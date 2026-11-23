# Team rules

## Who edits what
- Edit ONLY the two files in your own module folder (`*.math.js` and `*.ui.js`).
- Build your controls and explanation text from your `*.ui.js` file (fill the `#yourmodule-controls` and `#yourmodule-explain` containers). Do not edit `index.html`.
- Need something changed in `core/`, `css/` or `index.html`? Ask Person 1.

## Code style
1. One function does one job, with a comment above it explaining what it does.
2. Descriptive names: `calculateEvenPart`, not `cep`.
3. Prefer simple `for` loops over clever chains of `map` and `reduce`.
4. Write every formula as a comment in plain text above the code that uses it.
5. Reuse the CSS classes in `css/components.css` and the colors in `css/base.css`.
6. Put math in `*.math.js` (no HTML, no Plotly) and screen code in `*.ui.js`.

## Git
- One branch per module: `module/generator`, `module/operations`, and so on.
- Commit small and often, with clear messages.
- Only Person 1 merges into `main`.

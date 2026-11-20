/* ==========================================================
   plotHelpers.js  (owner: Person 1)

   Shared Plotly code, so every module's graphs look the same.

   Each "trace" you pass in is a simple object:
       { x: [...], y: [...], name: "x(t)", color: "#22d3ee" }
   ========================================================== */
(function () {

  // Same colors as the CSS variables in base.css
  const COLORS = {
    cyan: "#22d3ee", magenta: "#e879f9", amber: "#fbbf24", green: "#34d399",
    text: "#e8ecff", dim: "#9ba8d4", grid: "#26335f"
  };

  // Plotly settings: responsive = the plot resizes with its box
  const CONFIG = { responsive: true, displaylogo: false };

  /* Builds the dark-theme layout shared by all plots. */
  function makeLayout(options) {
    options = options || {};
    const layout = {
      title: options.title ? { text: options.title, font: { size: 15 } } : undefined,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: COLORS.text, family: "Segoe UI, system-ui, sans-serif" },
      margin: { l: 55, r: 20, t: options.title ? 45 : 20, b: 50 },
      xaxis: { title: options.xLabel || "t", gridcolor: COLORS.grid, zerolinecolor: COLORS.dim },
      yaxis: { title: options.yLabel || "x(t)", gridcolor: COLORS.grid, zerolinecolor: COLORS.dim },
      legend: { orientation: "h", y: -0.25 },
      height: options.height || 380
    };
    // Optional: fix the vertical range, e.g. yRange: [-3, 3].
    // Without it, Plotly rescales automatically and a bigger amplitude
    // would look the same height as a small one.
    if (options.yRange) { layout.yaxis.range = options.yRange; }
    // Optional: fix the horizontal range too, e.g. xRange: [-1, 5]. Needed when
    // traces move (a slider) so the axis does not jump around.
    if (options.xRange) { layout.xaxis.range = options.xRange; }
    // Optional: drawings on top of the plot (see makePeriodMarkers below)
    if (options.shapes) { layout.shapes = options.shapes; }
    if (options.annotations) { layout.annotations = options.annotations; }
    return layout;
  }

  /* ---------------------------------------------------------
     makePeriodMarkers(spec)
     Builds the drawings that HIGHLIGHT one period of a signal:
       - a shaded band over the period
       - dashed vertical lines at its start and end
       - a double arrow between them, labelled with the period value
       - small captions naming the start and end (only when there is room)
     Returns { shapes, annotations }; pass them to plotContinuous or
     plotStem as options.shapes and options.annotations.

     spec = {
       kind:    "continuous" | "discrete",
       start, end:  where the period starts and ends. Continuous: the two
                time values. Discrete: the first and LAST sample number
                (for N0 = 8 starting at 0: start 0, end 7). The band then
                reaches half a sample past both, so it covers whole stems.
       label:   text between the arrows, e.g. "T₀ = 4 s"
       yArrow:  height (in y units) at which the arrow is drawn
       startLabel, endLabel:  short captions under the arrow, at the two lines
       windowStart, windowEnd (optional): the plotted x range; the captions
                are left out when the band is too narrow to hold them
       color, fill (optional)
     --------------------------------------------------------- */
  function makePeriodMarkers(spec) {
    const color = spec.color || COLORS.magenta;
    const fill = spec.fill || "rgba(232, 121, 249, 0.14)";
    const discrete = spec.kind === "discrete";
    const left = discrete ? spec.start - 0.5 : spec.start;     // edges of the band
    const right = discrete ? spec.end + 0.5 : spec.end;

    const edge = function (x) {
      return { type: "line", xref: "x", yref: "paper", x0: x, x1: x, y0: 0, y1: 1,
               line: { color: color, width: 2, dash: "dash" } };
    };
    const shapes = [
      { type: "rect", xref: "x", yref: "paper", x0: left, x1: right, y0: 0, y1: 1,
        fillcolor: fill, line: { width: 0 }, layer: "below" },
      edge(spec.start),
      edge(spec.end)
    ];

    // Two arrows tail-to-head over the same line = one arrow with a head at each end
    const arrow = function (fromX, toX) {
      return { xref: "x", yref: "y", axref: "x", ayref: "y",
               x: toX, y: spec.yArrow, ax: fromX, ay: spec.yArrow,
               showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 2, arrowcolor: color, text: "" };
    };
    // The label is centred on the arrow. When the band is narrower than the text
    // (about 7 px per character on a 520 px wide plot), centring would push the text
    // off the left edge of the plot, so it starts at the left end of the band instead.
    let labelLeft = false;
    if (spec.windowStart !== undefined && spec.windowEnd !== undefined && spec.windowEnd > spec.windowStart) {
      labelLeft = (right - left) / (spec.windowEnd - spec.windowStart) < String(spec.label || "").length * 7 / 520;
    }
    const annotations = [
      arrow(left, right),
      arrow(right, left),
      { xref: "x", yref: "y", x: labelLeft ? left : (left + right) / 2, y: spec.yArrow, text: spec.label,
        showarrow: false, xanchor: labelLeft ? "left" : "center", xshift: labelLeft ? 2 : 0,
        yanchor: "bottom", yshift: 4,
        font: { color: color, size: 13 }, bgcolor: "rgba(10, 15, 31, 0.8)" }
    ];

    // Captions under the arrow, at the two ends. They are left out when the
    // band covers less than 30% of the plot, because they would run into each other.
    let room = true;
    if (spec.windowStart !== undefined && spec.windowEnd !== undefined && spec.windowEnd > spec.windowStart) {
      room = (right - left) / (spec.windowEnd - spec.windowStart) >= 0.3;
    }
    if (room) {
      const caption = function (x, text, anchor, shift) {
        return { xref: "x", yref: "y", x: x, y: spec.yArrow, text: text, showarrow: false,
                 xanchor: anchor, xshift: shift, yanchor: "top", yshift: -6,
                 font: { color: color, size: 11 }, bgcolor: "rgba(10, 15, 31, 0.8)" };
      };
      annotations.push(caption(spec.start, spec.startLabel || "start", "left", 4));
      annotations.push(caption(spec.end, spec.endLabel || "end", "right", -4));
    }
    return { shapes: shapes, annotations: annotations };
  }

  /* ---------------------------------------------------------
     plotContinuous(divId, traces, options)
     Draws smooth-looking lines. Use this with many closely
     spaced samples (e.g. step = 0.01).
     options (all optional): { title, xLabel, yLabel, height, yRange, xRange, shapes, annotations }
     --------------------------------------------------------- */
  function plotContinuous(divId, traces, options) {
    const plotlyTraces = traces.map(function (tr, index) {
      return {
        x: tr.x, y: tr.y, name: tr.name || "",
        type: "scatter", mode: "lines",
        line: { color: tr.color || defaultColor(index), width: 2.5 }
      };
    });
    Plotly.react(divId, plotlyTraces, makeLayout(options), CONFIG);
  }

  /* ---------------------------------------------------------
     plotStem(divId, traces, options)
     Draws DISCRETE signals as stems: a vertical line from 0 up to
     each value, with a dot on top.

     Trick: Plotly breaks a line wherever it sees null, so we build
     [n, n, null, n2, n2, null ...] for x and [0, y, null, ...] for y.
     That draws many separate vertical lines in a single trace.
     --------------------------------------------------------- */
  function plotStem(divId, traces, options) {
    const plotlyTraces = [];

    traces.forEach(function (tr, index) {
      const color = tr.color || defaultColor(index);
      const lineX = [];
      const lineY = [];
      for (let i = 0; i < tr.x.length; i++) {
        lineX.push(tr.x[i], tr.x[i], null);
        lineY.push(0, tr.y[i], null);
      }
      // The vertical stems (hidden from the legend)
      plotlyTraces.push({
        x: lineX, y: lineY, type: "scatter", mode: "lines",
        line: { color: color, width: 2 }, showlegend: false, hoverinfo: "skip"
      });
      // The dots on top (this one carries the legend name)
      plotlyTraces.push({
        x: tr.x, y: tr.y, name: tr.name || "", type: "scatter", mode: "markers",
        marker: { color: color, size: 8 }
      });
    });

    const layout = makeLayout(options);
    layout.xaxis.title = (options && options.xLabel) || "n";
    // One tick per integer n (right for x[n]). Pass autoXTicks: true when the
    // x axis is TIME (e.g. 0.05 s between samples) so Plotly picks the ticks.
    if (!(options && options.autoXTicks)) { layout.xaxis.dtick = 1; }
    Plotly.react(divId, plotlyTraces, layout, CONFIG);
  }

  /* Picks a color from the palette when the caller didn't give one. */
  function defaultColor(index) {
    const palette = [COLORS.cyan, COLORS.magenta, COLORS.amber, COLORS.green];
    return palette[index % palette.length];
  }

  /* ---------------------------------------------------------
     resizePlotsIn(containerId)
     Plots drawn while their tab is hidden get the wrong size.
     app.js calls this every time a tab becomes visible.
     --------------------------------------------------------- */
  function resizePlotsIn(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof Plotly === "undefined") { return; }
    const plots = container.querySelectorAll(".plot-area");
    plots.forEach(function (div) {
      if (div.data) { Plotly.Plots.resize(div); }   // div.data exists once Plotly drew in it
    });
  }

  SignalLab.plot.COLORS          = COLORS;
  SignalLab.plot.plotContinuous  = plotContinuous;
  SignalLab.plot.plotStem        = plotStem;
  SignalLab.plot.resizePlotsIn   = resizePlotsIn;
  SignalLab.plot.makePeriodMarkers = makePeriodMarkers;

})();

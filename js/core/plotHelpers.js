(function () {
  const COLORS = {
    cyan: "#22d3ee", magenta: "#e879f9", amber: "#fbbf24", green: "#34d399",
    text: "#e8ecff", dim: "#9ba8d4", grid: "#26335f"
  };
  const CONFIG = { responsive: true, displaylogo: false };
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
    if (options.yRange) { layout.yaxis.range = options.yRange; }
    if (options.xRange) { layout.xaxis.range = options.xRange; }
    if (options.shapes) { layout.shapes = options.shapes; }
    if (options.annotations) { layout.annotations = options.annotations; }
    return layout;
  }
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
    const arrow = function (fromX, toX) {
      return { xref: "x", yref: "y", axref: "x", ayref: "y",
               x: toX, y: spec.yArrow, ax: fromX, ay: spec.yArrow,
               showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 2, arrowcolor: color, text: "" };
    };
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
      plotlyTraces.push({
        x: lineX, y: lineY, type: "scatter", mode: "lines",
        line: { color: color, width: 2 }, showlegend: false, hoverinfo: "skip"
      });
      plotlyTraces.push({
        x: tr.x, y: tr.y, name: tr.name || "", type: "scatter", mode: "markers",
        marker: { color: color, size: 8 }
      });
    });

    const layout = makeLayout(options);
    layout.xaxis.title = (options && options.xLabel) || "n";
    if (!(options && options.autoXTicks)) { layout.xaxis.dtick = 1; }
    Plotly.react(divId, plotlyTraces, layout, CONFIG);
  }
  function defaultColor(index) {
    const palette = [COLORS.cyan, COLORS.magenta, COLORS.amber, COLORS.green];
    return palette[index % palette.length];
  }
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
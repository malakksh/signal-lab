

(function () {
  const COLORS = {
    cyan: "#22d3ee", magenta: "#e879f9", amber: "#fbbf24", green: "#34d399",
    text: "#e8ecff", dim: "#9ba8d4", grid: "#26335f"
  };

  // CONFIG dah object fe e3dadat ll plotly lkol elrosomat
  // plotly deh library benstakhdmha 3shan nersem charts w graphs felweb
  // responsive:true --> betkhaly elrasm motanasab ma3 hagm elshasha aw elcontainer elfeh
  // displaylogo:false --> betkhfy ellogo beta3 plotly mn eltoolbar elbyzhar feh zoom w download
  const CONFIG = { responsive: true, displaylogo: false };

  // options parameter haysta2bel e3dadat elrasm
  function makeLayout(options) {

    // law options msh mab3ota aw b null aw undefined aw ay falsy value yeb2a hanstakhdem {} elhya object fady
    // 3shan law maba3tnash argument elcode may2rash properties mn undefined w ye3mel error badal dah yeshatghal b object fady
    options = options || {};

    
    const layout = {

      // law option.title mawgod hay3mel title obj eltext property hatkon esm eltitle welfont elsize 15
      // law mafesh option.title haykhaly eltitle undefined
      title: options.title ? { text: options.title, font: { size: 15 } } : undefined,

      // lon el bg llgoz2 elbara elplot
      paper_bgcolor: "rgba(0,0,0,0)",
      // lon el bg lgoz2 elplot
      plot_bgcolor: "rgba(0,0,0,0)",

      // benhaded elfont beta3 elplot
      font: { color: COLORS.text, family: "Segoe UI, system-ui, sans-serif" },

      // elmargin elbetthaded hawalen elrasm
      margin: { l: 55, r: 20, t: options.title ? 45 : 20, b: 50 },

      // eltitle law fe xlabel haykon hwa el xlabel law mafesh haykon t
      xaxis: { title: options.xLabel || "t", gridcolor: COLORS.grid, zerolinecolor: COLORS.dim },
      // eltitle law fe ylabel haykon hwa el ylabel law mafesh haykon x(t)
      yaxis: { title: options.yLabel || "x(t)", gridcolor: COLORS.grid, zerolinecolor: COLORS.dim },
      
      // el legend hwa elgoz2 elbyzhar feh esm kol signal 3shan ne3raf kol line by3abar 3an eh
      // orientation: "h" --> elelgend hyakon horizontal (el3anaser gamb ba3d)
      // y:-0.25 bethaded makan elelgend 3al y-axis beta3ha w -ve 3shan teb2a taht elrasma msh gowaha 
      legend: { orientation: "h", y: -0.25 },

      // law elheight etba3atet hanstakhdmha law la elheight haykon 380
      height: options.height || 380
    };

    // bendef e3dadat ll layout law eluser aw elmodule ba3athom
    // law yRange(xRange) mawgoda bendefha ll y-axis(x-axis) badal ma plotly tehaded elrange by default
    if (options.yRange) { layout.yaxis.range = options.yRange; }
    if (options.xRange) { layout.xaxis.range = options.xRange; }
    if (options.shapes) { layout.shapes = options.shapes; }
    if (options.annotations) { layout.annotations = options.annotations; }
    return layout;
  }

  // function betsta2bel obj spec bykon feh elstart w end w color w fill w signal type...
  // betgahez elshapes w el annotations w kol module bystakhdmha byb3at elhagat deh llplotly layout
  function makePeriodMarkers(spec) {
    const color = spec.color || COLORS.magenta;
    const fill = spec.fill || "rgba(232, 121, 249, 0.14)";
    const discrete = spec.kind === "discrete";
    const left = discrete ? spec.start - 0.5 : spec.start;
    const right = discrete ? spec.end + 0.5 : spec.end;

    // function edge gowa function makePeriodMarkers 3shan ne3mel vertical line b sohola felmakan elhanhadedo
    // x --> dah elmakan el3ayzen nersem 3ando elkhat
    const edge = function (x) {
      // xref: "x" --> values el x beta3et elshape mortabeta bl x-axis beta3 elrasm
      // yref: "paper" --> el y mortabeta blmesaha beta3et elplot ya3ny y=0 3and akher mesaha felrasm y=1 3and a3la mesaha felrasm
      // x0: x, x1: x --> dah vertical line 3shan value el x felbedaya welnehaya equal
      // y0: 0, y1: 1 --> dah ma3nah en elkhat mn taht l fo2
      return { type: "line", xref: "x", yref: "paper", x0: x, x1: x, y0: 0, y1: 1,
               line: { color: color, width: 2, dash: "dash" } };
    };


    const shapes = [
      { type: "rect", xref: "x", yref: "paper", x0: left, x1: right, y0: 0, y1: 1,
        fillcolor: fill, line: { width: 0 }, layer: "below" },
      edge(spec.start),
      edge(spec.end)
    ];

    // benstakhdmha 3shan ne3mel arrow ben no2tten 
    const arrow = function (fromX, toX) {
      // xref (yref)--> reference b makan ras elsahm beta3 el x (el y)
      //axref (ayref)--> reference b makan bedayet elsahm beta3 el x (el y)
      return { xref: "x", yref: "y", axref: "x", ayref: "y",
               x: toX, y: spec.yArrow, ax: fromX, ay: spec.yArrow,
               showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 2, arrowcolor: color, text: "" };
    };


    let labelLeft = false;
    // elwindowstart w elwindowend yekono mawgoden w windowend yekon akbar mn windowstart 
    if (spec.windowStart !== undefined && spec.windowEnd !== undefined && spec.windowEnd > spec.windowStart) {
      // (righ - left)--> tol elmant2a elbenhadedha
      // (spec.windowEnd - spec.windowStart)--> tol elwindow elzaher felplot
      // (right - left) / (spec.windowEnd - spec.windowStart)--> nesbet 3ard elregion l 3ard elwindow kolaha
      labelLeft = (right - left) / (spec.windowEnd - spec.windowStart) < String(spec.label || "").length * 7 / 520;
    }

    // array annotations betb2a 3anaser betwadah hagat felgraph momkn tekon arrows aw text aw label
    const annotations = [
      // arrow(left, right) --> bet3mel arrow mn left to right
      arrow(left, right),
      // arrow(right, left) --> bet3mel arrow mn right to left
      arrow(right, left),
      { xref: "x", yref: "y", x: labelLeft ? left : (left + right) / 2, y: spec.yArrow, text: spec.label,
        // xanchor--> bethaded no2tet ertkaz eltext
        // xshift--> betharak elannotation horizontaly law labelleft b true hattharak 2px law false msh hattharak 
        showarrow: false, xanchor: labelLeft ? "left" : "center", xshift: labelLeft ? 2 : 0,
        // xanchor--> bethaded no2tet ertkaz eltext veritacally 
        // yshift--> betharak elannotation lfo2 4px
        yanchor: "bottom", yshift: 4,
        font: { color: color, size: 13 }, bgcolor: "rgba(10, 15, 31, 0.8)" }
    ];

    // mesahet el3ard
    let room = true;
    if (spec.windowStart !== undefined && spec.windowEnd !== undefined && spec.windowEnd > spec.windowStart) {
      room = (right - left) / (spec.windowEnd - spec.windowStart) >= 0.3;
    }
    // room --> true --> fe mesa7a kafya
    if (room) {
      // x --> makan eltext 3al x-axis
      // text --> eltext nafso
      // anchor --> no2tet elertkaz
      // shift --> tahreek eltext horizontaly
      const caption = function (x, text, anchor, shift) {
        return { xref: "x", yref: "y", x: x, y: spec.yArrow, text: text, showarrow: false,
                 xanchor: anchor, xshift: shift, yanchor: "top", yshift: -6,
                 font: { color: color, size: 11 }, bgcolor: "rgba(10, 15, 31, 0.8)" };
      };

      // push() --> method betdef element felarray
      // hena badef elstart wel end labels
      annotations.push(caption(spec.start, spec.startLabel || "start", "left", 4));
      annotations.push(caption(spec.end, spec.endLabel || "end", "right", -4));
    }
    return { shapes: shapes, annotations: annotations };
  }

  // function mas2ola 3an rasm el continuous signals
  // divId --> id elhtml element elhanrsem feh
  // traces --> bayanat elsignals
  // options --> e3dadat elrasm
  function plotContinuous(divId, traces, options) {
    // .map() --> array method betakhod kol element felarray te3mel 3aleh 3amalya w teraga3 array gededa
    // benmor 3ala kol trase
    // tr --> elcurrent trace , index --> rakam eltrace felarray
    const plotlyTraces = traces.map(function (tr, index) {
      // ben3mel elplotly trace
      // x --> values el x
      // y --> values el y
      // name --> esm eltrace law mafesh hanstakhdem empty string
      // type:"scatter" --> plotly betstakhdem scatter traces 3shan tersem no2at aw lines ben elno2at
      // mode:"lines" --> ben3red lines msh markers
      return {
        x: tr.x, y: tr.y, name: tr.name || "",
        type: "scatter", mode: "lines",
        line: { color: tr.color || defaultColor(index), width: 2.5 }
      };
    });
    // rasm elcontinous graph
    // plotly.react() --> function benstakhdmha 3shan tersem 
    // divId --> makan elrasm
    // plotlyTraces --> eldata elhanrsmha
    // makeLayout(options) --> benstad3y elfunction 3shan negahez ellayout
    // CONFIG --> ele3dadat el3ama ll plotly
    // fa hya betstakhdem elmakan , elbayanat , shakl elrasm , ele3dadat 3shan te3red elgraph
    Plotly.react(divId, plotlyTraces, makeLayout(options), CONFIG);
  }

  // function mas2ola 3an rasm el discrete signals
  function plotStem(divId, traces, options) {
    // array fadya w han7ot feha plotly traces
    const plotlyTraces = [];

    // forEach() --> hat3ady 3ala kol trace
    traces.forEach(function (tr, index) {
      const color = tr.color || defaultColor(index);
      // arrays fadya hanstakhdmha 3shan nersem vertical lines lkol sample feldiscrete signal
      const lineX = [];
      const lineY = [];

      for (let i = 0; i < tr.x.length; i++) {
        // benstakhdem null 3shan ehna msh 3ayzen newasal ben elvertical lines b khat horizontal
        lineX.push(tr.x[i], tr.x[i], null);
        lineY.push(0, tr.y[i], null);
      }
      // 3andna 2 traces zeyada fel discrete awel wahda betrsem elvertical lines mn 0 l value elsample eltrace eltany byrsem no2at elsamples
      // hena benzawed trace gededa elfeha elvertical lines 
      plotlyTraces.push({
        // x: lineX (y: lineY) --> values x (y) elkhasa blvertical lines
        // type: "scatter" --> scatter plot
        // mode: "lines" --> benrsem lines
        x: lineX, y: lineY, type: "scatter", mode: "lines",
        line: { color: color, width: 2 }, showlegend: false, hoverinfo: "skip"
      });
      // trace mas2ol 3an rasm elno2at nafsaha 
      plotlyTraces.push({
        // x: tr.x --> makan elsamples
        // y: tr.y --> values elsamples
        // name: tr.name || "" --> esm elsignal
        // mode: "markers" --> ben3red markers msh lines
        x: tr.x, y: tr.y, name: tr.name || "", type: "scatter", mode: "markers",
        marker: { color: color, size: 8 }
      });
    });

    // bengahez layout lldiscrete plot
    const layout = makeLayout(options);
    // benhaded 3enwan elx-axis
    layout.xaxis.title = (options && options.xLabel) || "n";
    // law autoXTicks --> false haynafez elcode
    // dtick --> bethaded elmasafa ben eltick marks 3alaxis
    // law matnafzsh elplotly hathaded eltick spacing by default
    if (!(options && options.autoXTicks)) { layout.xaxis.dtick = 1; }
    // rasm eldiscrete signals
    // divId --> makan elrasm
    // plotlyTraces --> eldata
    // layout --> e3dadat elrasm
    // CONFIG --> ele3dat el3ama
    Plotly.react(divId, plotlyTraces, layout, CONFIG);
  }

  // function betkhtar lon eftrady 3ala hasab elindex
  function defaultColor(index) {
    const palette = [COLORS.cyan, COLORS.magenta, COLORS.amber, COLORS.green];
    // if index = 0 --> 0 % 4 = 0 --> palette[0] --> cyan
    // benstakhdem % 3shan law 3andna 3adad keber mn elsignals w mafesh 3adad alwan kefaya ne2dar nekarar elalwan 
    return palette[index % palette.length];
  }

  // function mas2ola tezabat hagm elgraphs
  // containerId --> elcontainer elfeh elplots
  function resizePlotsIn(containerId) {
    const container = document.getElementById(containerId);
    // (!container )--> law elcontainer msh mawgod
    // plotly --> ya3ny law plotly msh mawgoda
    // law ay shart etha2a2 btokhrog mn elfunction
    if (!container || typeof Plotly === "undefined") { return; }
    // container.querySelectorAll(".plot-area") --> bengeb kol elelements elgowa elcontainer el3andaha elclass dah
    const plots = container.querySelectorAll(".plot-area");
    // ben3ady 3ala kol plot mawgod felcontainer
    plots.forEach(function (div) {
      // benrage3 hal elelement dah plotly rasamet feh data wala la
      // Plotly.Plots.resize(div); --> law elplot mawgod bnotlob mn plotly yezbot hagmaha
      if (div.data) { Plotly.Plots.resize(div); }
    });
  }

  // benkhaly elfunctions mota7a lba2y elproject
  // signalLab.plot kan obj fady kda ehna bendeflo functions
  SignalLab.plot.COLORS          = COLORS;
  SignalLab.plot.plotContinuous  = plotContinuous;
  SignalLab.plot.plotStem        = plotStem;
  SignalLab.plot.resizePlotsIn   = resizePlotsIn;
  SignalLab.plot.makePeriodMarkers = makePeriodMarkers;

})();

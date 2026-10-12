// ─── Fábrica de gráficos ─────────────────────────────────────────────────────

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function _isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
function _tickColor()   { return _isDark() ? 'rgba(255,255,255,0.4)'  : '#6b6b66'; }
function _gridColor()   { return _isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }
function _legendColor() { return _isDark() ? '#a8a89f' : '#555550'; }
function _surfaceColor(){ return _isDark() ? '#242422' : '#ffffff'; }

function legendOpts(position = "bottom") {
  return {
    display: true,
    position,
    labels: {
      color: _legendColor(),
      font: { size: 11 },
      boxWidth: 10,
      padding: 12,
    },
  };
}

function scaleX(extra = {}) {
  return {
    ticks: { color: _tickColor(), font: { size: 11 }, maxRotation: 0 },
    grid: { display: false },
    border: { display: false },
    ...extra,
  };
}

function scaleY(extra = {}) {
  return {
    ticks: { color: _tickColor(), font: { size: 11 } },
    grid: { color: _gridColor() },
    border: { display: false },
    ...extra,
  };
}

function scaleYH() {
  return {
    ticks: { color: _tickColor(), font: { size: 11 } },
    grid: { display: false },
    border: { display: false },
  };
}

// Rosca / pizza
// externalLegendId: se fornecido, renderiza legenda em HTML no elemento com esse id
function makeDonut(
  id,
  labels,
  data,
  colors,
  { cutout = "65%", showPctInLegend = false, externalLegendId = null } = {},
) {
  destroyChart(id);
  const total = data.reduce((a, b) => a + b, 0);

  // Legenda com % quando solicitado
  const legendLabels = showPctInLegend
    ? labels.map((l, i) => `${l}  ${pct(data[i], total)}`)
    : labels;

  charts[id] = new Chart(document.getElementById(id), {
    type: "doughnut",
    data: {
      labels: legendLabels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: _surfaceColor(),
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      plugins: {
        legend: {
          display: !externalLegendId,
          position: "bottom",
          labels: {
            color: _legendColor(),
            font: { size: 11 },
            boxWidth: 10,
            padding: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${labels[ctx.dataIndex]}: ${fmt(ctx.parsed)} (${pct(ctx.parsed, total)})`,
          },
        },
      },
    },
  });

  // Legenda externa em HTML com percentual
  if (externalLegendId) {
    const el = document.getElementById(externalLegendId);
    if (el) {
      el.innerHTML = labels
        .map(
          (lbl, i) => `
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:9px;height:9px;border-radius:2px;background:${colors[i]};flex-shrink:0"></span>
          <span style="flex:1;font-size:11px;color:var(--text2)">${lbl}</span>
          <span style="font-size:12px;font-weight:600;color:var(--text);margin-left:4px">${pct(data[i], total)}</span>
        </div>`,
        )
        .join("");
    }
  }

  return charts[id];
}

// Barra horizontal
function makeBarH(id, labels, data, colors, { suffix = "" } = {}) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: "bar",
    indexAxis: "y",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.x)}${suffix}` },
        },
      },
      scales: {
        x: scaleX(),
        y: scaleYH(),
      },
    },
  });
  return charts[id];
}

// Barra vertical
function makeBarV(
  id,
  labels,
  data,
  colors,
  { suffix = " demandas", showLegend = false, legendLabel = "" } = {},
) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: legendLabel,
          data,
          backgroundColor: colors,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: showLegend ? legendOpts("top") : { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y)}${suffix}` },
        },
      },
      scales: { x: scaleX(), y: scaleY() },
    },
  });
  return charts[id];
}

// Linha
function makeLine(id, labels, datasets) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: datasets.length > 1 ? legendOpts("bottom") : { display: false },
      },
      scales: { x: scaleX(), y: scaleY() },
    },
  });
  return charts[id];
}

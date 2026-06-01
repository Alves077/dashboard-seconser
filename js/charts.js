// ─── Fábrica de gráficos ─────────────────────────────────────────────────────

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// Cor legível em fundo claro E escuro
const LEGEND_COLOR = '#555550';

function legendOpts(position = 'bottom') {
  return {
    display: true,
    position,
    labels: {
      color: LEGEND_COLOR,
      font: { size: 11 },
      boxWidth: 10,
      padding: 12,
    },
  };
}

function scaleX(extra = {}) {
  return {
    ticks: { color: '#6b6b66', font: { size: 11 }, maxRotation: 0 },
    grid:  { display: false },
    border:{ display: false },
    ...extra,
  };
}

function scaleY(extra = {}) {
  return {
    ticks: { color: '#6b6b66', font: { size: 11 } },
    grid:  { color: 'rgba(0,0,0,0.06)' },
    border:{ display: false },
    ...extra,
  };
}

function scaleYH() {
  return {
    ticks: { color: '#6b6b66', font: { size: 11 } },
    grid:  { display: false },
    border:{ display: false },
  };
}

// Rosca / pizza
function makeDonut(id, labels, data, colors, { cutout = '65%' } = {}) {
  destroyChart(id);
  const total = data.reduce((a, b) => a + b, 0);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      plugins: {
        legend: legendOpts('bottom'),
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct(ctx.parsed, total)})`,
          },
        },
      },
    },
  });
  return charts[id];
}

// Barra horizontal
function makeBarH(id, labels, data, colors, { suffix = '' } = {}) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.x)}${suffix}` } },
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
function makeBarV(id, labels, data, colors, { suffix = ' demandas', showLegend = false, legendLabel = '' } = {}) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: legendLabel,
        data,
        backgroundColor: colors,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: showLegend ? legendOpts('top') : { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}${suffix}` } },
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
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: datasets.length > 1
          ? legendOpts('bottom')
          : { display: false },
      },
      scales: { x: scaleX(), y: scaleY() },
    },
  });
  return charts[id];
}

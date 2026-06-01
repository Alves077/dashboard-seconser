function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function makeDonut(id, labels, data, colors) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } }
    }
  });
  return charts[id];
}

function makeBarH(id, labels, data, colors) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 3 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc }, border: { display: false } },
        y: { ticks: { color: tc, font: { size: 10 } }, grid: { display: false }, border: { display: false } }
      }
    }
  });
  return charts[id];
}

function makeBarV(id, labels, data, colors, tooltipSuffix) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 3 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString('pt-BR')}${tooltipSuffix || ''}` } }
      },
      scales: {
        x: { ticks: { color: tc, font: { size: 10 }, maxRotation: 0 }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc }, border: { display: false } }
      }
    }
  });
  return charts[id];
}

function makeLine(id, labels, datasets) {
  destroyChart(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1, labels: { color: tc, font: { size: 10 }, boxWidth: 10 } } },
      scales: {
        x: { ticks: { color: tc, font: { size: 10 }, maxRotation: 0 }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc }, border: { display: false } }
      }
    }
  });
  return charts[id];
}

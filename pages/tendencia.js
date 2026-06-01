// ─── Tendência ────────────────────────────────────────────────────────────────

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function onDataLoaded() {
  render(allRows);
}

function populateFilters() {}

function render(rows) {
  const total = rows.length;
  if (!total) return;

  const range = dateRange(rows);
  if (range) {
    document.getElementById("sub-periodo").textContent =
      mesLabel(range.min) +
      " – " +
      mesLabel(range.max) +
      " · " +
      fmt(total) +
      " registros";
  }
  document.getElementById("last-update").textContent =
    "atualizado " +
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const mensalEntries = buildMensalMap(rows);
  const labels = mensalEntries.map(([, v]) => v.lbl);
  const volumes = mensalEntries.map(([, v]) => v.rows.length);
  const picoIdx = volumes.indexOf(Math.max(...volumes));
  const ultIdx = mensalEntries.length - 1;

  // KPIs
  setText("tPicoMes", labels[picoIdx] || "—");
  setText("tPicoVal", fmt(volumes[picoIdx] || 0) + " demandas");
  setText("tUltMes", labels[ultIdx] || "—");
  setText("tUltVal", fmt(volumes[ultIdx] || 0) + " demandas");

  if (mensalEntries.length >= 2) {
    const diff = volumes[ultIdx] - volumes[ultIdx - 1];
    const sinal = diff > 0 ? "+" : "";
    setText("tVariacao", sinal + fmt(diff));
    setText("tVariacaoSub", "vs. " + labels[ultIdx - 1]);
    const accent = document
      .querySelector("#tVariacao")
      ?.closest(".kpi")
      ?.querySelector(".kpi-accent");
    if (accent)
      accent.style.background = diff > 0 ? "var(--red)" : "var(--green)";
  }

  const mediaVol = volumes.reduce((a, b) => a + b, 0) / (volumes.length || 1);
  setText("tMedia", Math.round(mediaVol).toLocaleString("pt-BR"));
  setText("tMeses", mensalEntries.length);

  if (mensalEntries.length) {
    const topCat = groupBy(mensalEntries[ultIdx][1].rows, "Categoria")[0];
    if (topCat) {
      setText("tCatAlta", topCat[0]);
      setText("tCatAltaVal", fmt(topCat[1]) + " no mês");
    }
  }

  // Volume mensal
  setText(
    "pico-label",
    "pico: " + (labels[picoIdx] || "—") + " · " + fmt(volumes[picoIdx] || 0),
  );
  makeBarV(
    "cVolMensal",
    labels,
    volumes,
    volumes.map((_, i) => (i === picoIdx ? COLORS.red : COLORS.blue)),
    { suffix: " demandas", showLegend: true, legendLabel: "Demandas abertas" },
  );

  // Situação por mês — linhas
  makeLine("cSitMensal", labels, [
    {
      label: "OK",
      data: mensalEntries.map(([, v]) => count(v.rows, "Situação", "OK")),
      borderColor: COLORS.green,
      backgroundColor: "rgba(99,153,34,0.08)",
      tension: 0.3,
      fill: false,
      pointRadius: 3,
    },
    {
      label: "Em Atendimento",
      data: mensalEntries.map(([, v]) =>
        count(v.rows, "Situação", "Em Atendimento"),
      ),
      borderColor: COLORS.amber,
      backgroundColor: "transparent",
      tension: 0.3,
      fill: false,
      pointRadius: 3,
    },
    {
      label: "Em Atraso",
      data: mensalEntries.map(([, v]) =>
        count(v.rows, "Situação", "Em Atraso"),
      ),
      borderColor: COLORS.red,
      backgroundColor: "transparent",
      tension: 0.3,
      fill: false,
      pointRadius: 3,
    },
  ]);

  // Top 5 categorias ao longo do tempo
  const topCats = groupBy(rows, "Categoria")
    .slice(0, 5)
    .map(([k]) => k);
  const catColors = [
    COLORS.blue,
    COLORS.purple,
    COLORS.green,
    COLORS.amber,
    COLORS.red,
  ];
  makeLine(
    "cCatMensal",
    labels,
    topCats.map((cat, i) => ({
      label: cat,
      data: mensalEntries.map(([, v]) => count(v.rows, "Categoria", cat)),
      borderColor: catColors[i] || COLORS.gray,
      backgroundColor: "transparent",
      tension: 0.3,
      fill: false,
      pointRadius: 2,
    })),
  );

  // Tempo médio mensal
  const tempoMes = mensalEntries.map(([, v]) => {
    const okR = v.rows.filter((r) => r["Situação"] === "OK");
    const vals = okR
      .map((r) =>
        parseFloat((r["Dias Execução"] || "").toString().replace(",", ".")),
      )
      .filter((n) => !isNaN(n) && n >= 0);
    return vals.length
      ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      : null;
  });

  destroyChart("cTempoMensal");
  charts["cTempoMensal"] = new Chart(document.getElementById("cTempoMensal"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Dias médios",
          data: tempoMes,
          borderColor: COLORS.purple,
          backgroundColor: "rgba(127,119,221,0.08)",
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} dias` } },
      },
      scales: {
        x: {
          ticks: { color: "#6b6b66", font: { size: 11 }, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: "#6b6b66",
            font: { size: 11 },
            callback: (v) => v + "d",
          },
          grid: { color: "rgba(0,0,0,0.06)" },
          border: { display: false },
        },
      },
    },
  });

  // Taxa de atraso mensal
  const atrasoMes = mensalEntries.map(([, v]) => {
    const ar = count(v.rows, "Situação", "Em Atraso");
    return v.rows.length ? +((ar / v.rows.length) * 100).toFixed(1) : 0;
  });

  destroyChart("cAtrasoMensal");
  charts["cAtrasoMensal"] = new Chart(
    document.getElementById("cAtrasoMensal"),
    {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "% Em Atraso",
            data: atrasoMes,
            borderColor: COLORS.red,
            backgroundColor: "rgba(226,75,74,0.08)",
            tension: 0.3,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}%` } },
        },
        scales: {
          x: {
            ticks: { color: "#6b6b66", font: { size: 11 }, maxRotation: 0 },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            ticks: {
              color: "#6b6b66",
              font: { size: 11 },
              callback: (v) => v + "%",
            },
            grid: { color: "rgba(0,0,0,0.06)" },
            border: { display: false },
          },
        },
      },
    },
  );
}

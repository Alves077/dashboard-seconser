// ─── Tendência ────────────────────────────────────────────────────────────────

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

function populateFilters() {}

function onDataLoaded() {
  render(allRows);
}

// Remove mês incompleto: se o último mês tem < 40% do penúltimo, descarta
function filtrarMesIncompleto(entries) {
  if (entries.length < 2) return entries;
  const last = entries[entries.length - 1][1].rows.length;
  const prev = entries[entries.length - 2][1].rows.length;
  return last < prev * 0.4 ? entries.slice(0, -1) : entries;
}

function render(rows) {
  const total = rows.length;
  if (!total) return;

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
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

  // ── Agrupamento base — por Data Saída ─────────────────────────────────────────
  const mensalRaw = buildMensalMap(rows);
  const mensalEntries = filtrarMesIncompleto(mensalRaw);
  const labels = mensalEntries.map(([, v]) => v.lbl);
  const volumes = mensalEntries.map(([, v]) => v.rows.length);

  // ── Agrupamento por Data Retorno (concluídos) ─────────────────────────────────
  const retornoMap = {};
  labels.forEach(
    (lbl) => (retornoMap[lbl] = { total: 0, noPrazo: 0, foraPrazo: 0 }),
  );

  rows.forEach((r) => {
    if ((r["Situação"] || "").trim() !== "OK") return;
    const d = parseDate(r["Data Retorno"]);
    if (!d || isNaN(d)) return;
    const lbl = mesLabel(d);
    if (!(lbl in retornoMap)) return;
    const dias = parseFloat(
      (r["Dias Execução"] || "").toString().replace(",", "."),
    );
    retornoMap[lbl].total++;
    if (!isNaN(dias)) {
      if (dias <= 5) retornoMap[lbl].noPrazo++;
      else retornoMap[lbl].foraPrazo++;
    }
  });

  const concluidos = labels.map((lbl) => retornoMap[lbl]?.total || 0);
  const noPrazo = labels.map((lbl) => retornoMap[lbl]?.noPrazo || 0);
  const foraPrazo = labels.map((lbl) => retornoMap[lbl]?.foraPrazo || 0);
  const txNoPrazo = labels.map((lbl, i) => {
    const t = retornoMap[lbl]?.total || 0;
    return t ? +((retornoMap[lbl].noPrazo / t) * 100).toFixed(1) : null;
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const picoIdx = volumes.indexOf(Math.max(...volumes));
  const ultIdx = mensalEntries.length - 1;
  const mediaVol = Math.round(
    volumes.reduce((a, b) => a + b, 0) / (volumes.length || 1),
  );

  // Saldo acumulado: entradas - concluídos ao longo de todo o período
  const saldoTotal =
    volumes.reduce((a, b) => a + b, 0) - concluidos.reduce((a, b) => a + b, 0);

  // Taxa de cumprimento de prazo global
  const totalConc = concluidos.reduce((a, b) => a + b, 0);
  const totalPrazo = noPrazo.reduce((a, b) => a + b, 0);
  const txPrazoGlobal = totalConc
    ? ((totalPrazo / totalConc) * 100).toFixed(1)
    : "—";

  // Variação último mês completo vs penúltimo
  const diff = volumes[ultIdx] - volumes[ultIdx - 1];
  const sinal = diff > 0 ? "+" : "";

  setText("tPicoMes", labels[picoIdx] || "—");
  setText("tPicoVal", fmt(volumes[picoIdx] || 0) + " demandas");
  setText("tUltMes", labels[ultIdx] || "—");
  setText("tUltVal", fmt(volumes[ultIdx] || 0) + " demandas");
  setText("tVariacao", sinal + fmt(diff));
  setText("tVariacaoSub", "vs. " + labels[ultIdx - 1]);
  setText("tMedia", fmt(mediaVol));
  setText("tMeses", mensalEntries.length);
  setText("tSaldo", (saldoTotal > 0 ? "+" : "") + fmt(saldoTotal));
  setText(
    "tSaldoSub",
    saldoTotal > 0 ? "estoque crescendo" : "passivo sendo reduzido",
  );
  setText("tPrazoGlobal", txPrazoGlobal + "%");
  setText(
    "tPrazoGlobalSub",
    fmt(totalPrazo) + " de " + fmt(totalConc) + " no prazo",
  );

  // Cor do acento de variação
  const varAccent = document
    .querySelector("#tVariacao")
    ?.closest(".kpi")
    ?.querySelector(".kpi-accent");
  if (varAccent)
    varAccent.style.background = diff > 0 ? "var(--red)" : "var(--green)";

  // Cor do acento de saldo
  const saldoAccent = document
    .querySelector("#tSaldo")
    ?.closest(".kpi")
    ?.querySelector(".kpi-accent");
  if (saldoAccent)
    saldoAccent.style.background =
      saldoTotal > 0 ? "var(--red)" : "var(--green)";

  // ── BLOCO 1: Saldo acumulado — estoque de demandas ───────────────────────────
  // Entradas (Data Saída) vs Concluídos (Data Retorno) + saldo acumulado
  const saldoMes = [];
  let acum = 0;
  labels.forEach((_, i) => {
    acum += volumes[i] - concluidos[i];
    saldoMes.push(acum);
  });

  destroyChart("cVolMensal");
  charts["cVolMensal"] = new Chart(document.getElementById("cVolMensal"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Entradas",
          data: volumes,
          borderColor: COLORS.blue,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: false,
        },
        {
          label: "Concluídos",
          data: concluidos,
          borderColor: COLORS.green,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: false,
        },
        {
          label: "Saldo acumulado",
          data: saldoMes,
          borderColor: COLORS.red,
          backgroundColor: COLORS.red + "18",
          borderWidth: 2,
          borderDash: [5, 3],
          pointRadius: 3,
          tension: 0.3,
          fill: false,
          yAxisID: "ySaldo",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { left: 4, right: 16 } },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: "#555550",
            font: { size: 11 },
            boxWidth: 10,
            padding: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === "Saldo acumulado")
                return ` Saldo: ${ctx.parsed.y > 0 ? "+" : ""}${fmt(ctx.parsed.y)}`;
              return ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#6b6b66", font: { size: 11 }, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
          offset: true,
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#6b6b66", font: { size: 11 } },
          grid: { color: "rgba(0,0,0,0.06)" },
          border: { display: false },
        },
        ySaldo: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          ticks: {
            color: COLORS.red,
            font: { size: 11 },
            callback: (v) => (v > 0 ? "+" : "") + fmt(v),
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    },
  });

  // ── BLOCO 2: Mapa de sazonalidade por categoria ───────────────────────────────
  // Tabela calor: linhas = top categorias, colunas = meses
  // Intensidade relativa ao máximo de cada categoria (normalizada por linha)
  const topCats = groupBy(rows, "Categoria")
    .slice(0, 6)
    .map(([k]) => k);

  // Monta matrix: cat → mês → volume
  const matrix = {};
  topCats.forEach((cat) => {
    matrix[cat] = {};
    labels.forEach((lbl) => (matrix[cat][lbl] = 0));
  });
  mensalEntries.forEach(([, v]) => {
    topCats.forEach((cat) => {
      matrix[cat][v.lbl] = v.rows.filter(
        (r) => (r["Categoria"] || "").trim() === cat,
      ).length;
    });
  });

  // Renderiza tabela de calor
  const heatColors = (pct) => {
    // branco → azul: interpolação linear
    const r = Math.round(255 - pct * (255 - 55));
    const g = Math.round(255 - pct * (255 - 138));
    const b = Math.round(255 - pct * (255 - 221));
    return `rgb(${r},${g},${b})`;
  };

  const heatTextColor = (pct) => (pct > 0.55 ? "#fff" : "var(--text)");

  let heatHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 8px 4px 0;color:var(--text3);
                       font-weight:500;white-space:nowrap;min-width:160px">Categoria</th>
            ${labels
              .map(
                (lbl) => `
              <th style="text-align:center;padding:4px 2px;color:var(--text3);
                         font-weight:500;white-space:nowrap;min-width:42px">${lbl}</th>`,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>`;

  topCats.forEach((cat) => {
    const vals = labels.map((lbl) => matrix[cat][lbl]);
    const maxVal = Math.max(...vals, 1);
    heatHTML += `<tr>
      <td style="padding:3px 8px 3px 0;color:var(--text2);white-space:nowrap;
                 overflow:hidden;text-overflow:ellipsis;max-width:160px"
          title="${cat}">${cat}</td>
      ${vals
        .map((v) => {
          const p = v / maxVal;
          const bg = heatColors(p);
          const col = heatTextColor(p);
          return `<td style="text-align:center;padding:3px 2px">
          <span style="display:block;padding:3px 2px;border-radius:3px;
                       background:${bg};color:${col};font-weight:${v > 0 ? "500" : "400"}">
            ${v > 0 ? fmt(v) : "—"}
          </span>
        </td>`;
        })
        .join("")}
    </tr>`;
  });

  heatHTML += "</tbody></table></div>";
  setHTML("heatSazon", heatHTML);

  // ── BLOCO 3: Taxa de cumprimento de prazo mensal ──────────────────────────────
  // Prazo = Data Saída + 5 dias → diasExecução > 5 = fora do prazo
  // Agrupado por Data Retorno — sem viés de mês incompleto

  const maxCauda2 = Math.max(...txNoPrazo.filter((v) => v !== null), 1);
  const foraPrazoPct = labels.map((lbl, i) => {
    const t = retornoMap[lbl]?.total || 0;
    return t ? +((retornoMap[lbl].foraPrazo / t) * 100).toFixed(1) : null;
  });

  destroyChart("cPrazoMensal");
  charts["cPrazoMensal"] = new Chart(document.getElementById("cPrazoMensal"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Fora do prazo (>5 dias)",
          data: foraPrazoPct,
          borderColor: COLORS.red,
          backgroundColor: COLORS.red + "18",
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: true,
          yAxisID: "yPct",
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { left: 4, right: 16 } },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: "#555550",
            font: { size: 11 },
            boxWidth: 10,
            padding: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const lbl = ctx.label;
              const pctVal = ctx.parsed.y;
              const total = retornoMap[lbl]?.total || 0;
              const fora = retornoMap[lbl]?.foraPrazo || 0;
              return ` Fora do prazo: ${pctVal !== null ? pctVal + "%" : "—"} (${fmt(fora)} de ${fmt(total)})`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#6b6b66", font: { size: 11 }, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
          offset: true,
        },
        yPct: {
          type: "linear",
          position: "left",
          beginAtZero: true,
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
  });

  // ── Tempo médio mensal agrupado por Data Retorno ─────────────────────────────
  // Agrupa pelo mês em que o serviço FOI CONCLUÍDO, não pelo mês em que entrou.
  // Isso evita o viés de seleção: serviços que entraram e saíram no mesmo mês
  // são os mais rápidos e puxam a média para baixo artificialmente.
  const tempoRetornoMap = {};
  labels.forEach((lbl) => (tempoRetornoMap[lbl] = { soma: 0, cnt: 0 }));

  rows.forEach((r) => {
    if ((r["Situação"] || "").trim() !== "OK") return;
    const d = parseDate(r["Data Retorno"]);
    if (!d || isNaN(d)) return;
    const lbl = mesLabel(d);
    if (!(lbl in tempoRetornoMap)) return;
    const v = parseFloat(
      (r["Dias Execução"] || "").toString().replace(",", "."),
    );
    if (isNaN(v) || v < 0) return;
    tempoRetornoMap[lbl].soma += v;
    tempoRetornoMap[lbl].cnt++;
  });

  const tempoMes = labels.map((lbl) => {
    const { soma, cnt } = tempoRetornoMap[lbl];
    return cnt >= 5 ? +(soma / cnt).toFixed(1) : null;
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
          borderColor: COLORS.blue,
          backgroundColor: COLORS.blue + "18",
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
          beginAtZero: true,
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
}

loadData();

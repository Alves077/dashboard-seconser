// ─── Render — Visão Geral ────────────────────────────────────────────────────

// Helper: barra HTML com valor absoluto + percentual
function barRow(label, n, total, color, labelWidth) {
  const w = labelWidth || "200px";
  const maxN = n; // caller passes pre-computed max; we receive fill% directly
  return `
    <div class="bar-row">
      <span class="bar-label" style="color:var(--text2);width:${w}" title="${label}">${label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${n}%;background:${color}"></div></div>
      <span class="bar-val">${arguments[1] === undefined ? "—" : fmt(arguments[6] !== undefined ? arguments[6] : n)}</span>
      <span class="bar-pct">${pct(arguments[6] !== undefined ? arguments[6] : n, total)}</span>
    </div>`;
}

function makeBar(
  label,
  fillPct,
  absVal,
  total,
  color,
  labelWidth,
  showLabel = true,
) {
  const w = labelWidth || "160px";
  return `
    <div class="bar-row">
      ${showLabel ? `<span class="bar-label" style="color:var(--text2);width:${w}" title="${label}">${label}</span>` : ""}
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(fillPct, 1)}%;background:${color}"></div></div>
      <span class="bar-val">${fmt(absVal)}</span>
      <span class="bar-pct">${pct(absVal, total)}</span>
    </div>`;
}

function render(rows) {
  const total = rows.length;
  if (!total) {
    setText("sub-periodo", "Sem dados para os filtros selecionados");
    return;
  }

  updateTopbar(rows);

  const ok = count(rows, "Situação", "OK");
  const at = count(rows, "Situação", "Em Atendimento");
  const ar = count(rows, "Situação", "Em Atraso");
  const abertos = at + ar;
  const { reabIds, reabTotal } = calcReaberturas(rows);

  const okRows = rows.filter((r) => r["Situação"] === "OK");
  const diasVals = okRows
    .map((r) =>
      parseFloat((r["Dias Execução"] || "").toString().replace(",", ".")),
    )
    .filter((v) => !isNaN(v) && v >= 0);
  const media = diasVals.length
    ? diasVals.reduce((a, b) => a + b, 0) / diasVals.length
    : 0;
  const sorted = [...diasVals].sort((a, b) => a - b);
  const mediana = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  // ── KPIs ───────────────────────────────────────────────────────────────────
  setText("kTotal", fmt(total));
  setText("kOk", fmt(ok));
  setText("kOkPct", pct(ok, total) + " do total");
  setText("kAt", fmt(abertos));
  setText("kAtPct", pct(abertos, total) + " do total");
  setText("kAr", fmt(ar));
  setText("kArPct", pct(ar, abertos) + " dos abertos");
  setText("kReab", fmt(reabIds));
  setText(
    "kReabPct",
    fmt(reabTotal) + " evento(s) · " + pct(reabIds, total) + " dos serviços",
  );
  setHTML(
    "kMedia",
    fmtDec(media) +
      '<span style="font-size:15px;font-weight:400;color:var(--text2)"> d</span>',
  );
  setText("kMediaSub", "Mediana: " + Math.round(mediana) + " dias");

  setText("badge-ok", pct(ok, total) + " no prazo");
  setText("badge-at", fmt(abertos) + " em aberto");
  setText("badge-ar", fmt(ar) + " em atraso");

  // ── Categorias ─────────────────────────────────────────────────────────────
  const cats = groupBy(rows, "Categoria");
  const topCat = cats[0] || ["—", 0];
  const mainCats = cats.slice(1).filter(([, n]) => n >= 5);
  const skipped = cats.filter(([, n]) => n < 5).length;

  setText("catTop", topCat[0]);
  setHTML(
    "catTopVal",
    fmt(topCat[1]) +
      ' · <span style="color:var(--blue)">' +
      pct(topCat[1], total) +
      "</span>",
  );

  const maxCat = mainCats.length ? mainCats[0][1] : topCat[1];
  let catsHTML = mainCats
    .map(([lbl, n]) =>
      makeBar(
        lbl,
        Math.round((n / maxCat) * 100),
        n,
        total,
        "var(--purple)",
        "200px",
      ),
    )
    .join("");

  if (skipped > 0) {
    catsHTML += `<div class="cats-note">+ ${skipped} categoria${skipped > 1 ? "s" : ""} com menos de 5 registros</div>`;
  }
  setHTML("catBars", catsHTML);

  // ── Regiões — barras horizontais com volume + % + tempo médio ─────────────
  const regs = groupBy(rows, "Região");
  const maxReg = regs.length ? regs[0][1] : 1;

  const regTempoSum = {},
    regTempoCnt = {};
  okRows.forEach((r) => {
    const reg = (r["Região"] || "").trim();
    const v = parseFloat(
      (r["Dias Execução"] || "").toString().replace(",", "."),
    );
    if (!reg || isNaN(v) || v < 0) return;
    regTempoSum[reg] = (regTempoSum[reg] || 0) + v;
    regTempoCnt[reg] = (regTempoCnt[reg] || 0) + 1;
  });

  const regAbertos = {};
  rows.forEach((r) => {
    const sit = (r["Situação"] || "").trim();
    if (sit !== "Em Atendimento" && sit !== "Em Atraso") return;
    const reg = (r["Região"] || "").trim();
    if (!reg) return;
    if (!regAbertos[reg]) regAbertos[reg] = { at: 0, ar: 0 };
    if (sit === "Em Atendimento") regAbertos[reg].at++;
    else regAbertos[reg].ar++;
  });

  const regListEl = document.getElementById("regList");
  if (regListEl) {
    regListEl.innerHTML = regs
      .map(([lbl, n]) => {
        const fillPct = Math.round((n / maxReg) * 100);
        const tempo =
          regTempoCnt[lbl] >= 3
            ? fmtDec(regTempoSum[lbl] / regTempoCnt[lbl]) + "d"
            : "—";
        const ab = regAbertos[lbl] || { at: 0, ar: 0 };

        return `
        <div class="reg-row">
          <span class="reg-label" title="${lbl}">${lbl}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(fillPct, 1)}%;background:var(--blue)"></div></div>
          <span class="reg-col-vol">${fmt(n)}</span>
          <span class="reg-col-pct">${pct(n, total)}</span>
          <span class="reg-col-tempo">${tempo}</span>
          <span class="reg-col-ar ${ab.ar > 0 ? "" : "reg-col-zero"}">${ab.ar > 0 ? fmt(ab.ar) : "—"}</span>
          <span class="reg-col-at ${ab.at > 0 ? "" : "reg-col-zero"}">${ab.at > 0 ? fmt(ab.at) : "—"}</span>
        </div>`;
      })
      .join("");
  }

  // ── Reaberturas ────────────────────────────────────────────────────────────
  const reabByCat = {},
    reabByReg = {};
  const seenReabIds = new Set();
  rows.forEach((r) => {
    const occ = parseInt(r["Ocorrências"] || 1);
    if (occ <= 1) return;
    const id = r["ID Colab"];
    if (seenReabIds.has(id)) return;
    seenReabIds.add(id);
    const eventos = occ - 1;
    const cat = (r["Categoria"] || "").trim();
    const reg = (r["Região"] || "").trim();
    reabByCat[cat] = (reabByCat[cat] || 0) + eventos;
    reabByReg[reg] = (reabByReg[reg] || 0) + eventos;
  });

  const reabCatEntries = Object.entries(reabByCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const reabRegEntries = Object.entries(reabByReg).sort((a, b) => b[1] - a[1]);
  const maxReabCat = reabCatEntries.length ? reabCatEntries[0][1] : 1;
  const maxReabReg = reabRegEntries.length ? reabRegEntries[0][1] : 1;

  setText("rTotal", fmt(reabIds));
  setText("rEventos", fmt(reabTotal) + " reaberturas totais");
  setText("rPct", pct(reabIds, total) + " dos serviços");

  setHTML(
    "reabList",
    reabCatEntries
      .map(([lbl, n]) =>
        makeBar(
          lbl,
          Math.round((n / maxReabCat) * 100),
          n,
          reabTotal,
          "var(--purple)",
          "160px",
        ),
      )
      .join(""),
  );

  const totalByReg = {};
  rows.forEach((r) => {
    const reg = (r["Região"] || "").trim();
    if (reg) totalByReg[reg] = (totalByReg[reg] || 0) + 1;
  });

  setHTML(
    "reabRegBars",
    reabRegEntries
      .slice(0, 5)
      .map(([lbl, n]) => {
        const regTotal = totalByReg[lbl] || 1;
        const taxa = fmtDec((n / regTotal) * 100) + "%";
        const fillPct = Math.round((n / maxReabReg) * 100);
        return `
    <div class="bar-row">
      <span class="bar-label" style="color:var(--text2);width:160px" title="${lbl}">${lbl}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(fillPct, 1)}%;background:var(--blue)"></div></div>
      <span class="bar-val">${fmt(n)}</span>
      <span class="bar-pct" title="taxa de reabertura da região" style="color:var(--amber);font-weight:500">${taxa}</span>
    </div>`;
      })
      .join(""),
  );

  // ── Faixas execução — rosca ────────────────────────────────────────────────
  const faixas = groupBy(okRows, "Faixa Execução").filter(
    ([k]) => k && k !== "0. Em Atendimento",
  );
  const faixaLabelMap = {
    "1. Até 3 dias": "Até 3 dias",
    "2. 4 a 7 dias": "4 a 7 dias",
    "3. 8 a 15 dias": "8 a 15 dias",
    "4. Mais de 15 dias": "Mais de 15 dias",
  };
  makeDonut(
    "cFaixas",
    faixas.map(([k]) => faixaLabelMap[k] || k),
    faixas.map(([, v]) => v),
    faixas.map((_, i) => COLORS.faixas[i] || COLORS.gray),
    { cutout: "65%", externalLegendId: "cFaixasLegend" },
  );

  // ── Tempo médio por categoria ─────────────────────────────────────────────
  const tempoMap = {},
    tempoCnt = {};
  okRows.forEach((r) => {
    const cat = (r["Categoria"] || "").trim();
    const raw = (r["Dias Execução"] || "").toString().replace(",", ".").trim();
    const v = parseFloat(raw);
    if (!cat || isNaN(v) || v < 0) return;
    tempoMap[cat] = (tempoMap[cat] || 0) + v;
    tempoCnt[cat] = (tempoCnt[cat] || 0) + 1;
  });
  const tempoData = Object.entries(tempoMap)
    .filter(([k]) => tempoCnt[k] >= 10)
    .map(([k, v]) => [k, +(v / tempoCnt[k]).toFixed(1), tempoCnt[k]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const tempoEl = document.getElementById("cTempoHTML");
  if (tempoEl) {
    if (!tempoData.length) {
      tempoEl.innerHTML =
        '<p style="font-size:11px;color:var(--text3);padding:8px 0">Dados insuficientes para calcular média.</p>';
    } else {
      const maxTempo = tempoData[0][1];
      tempoEl.innerHTML = tempoData
        .map(
          ([lbl, dias, cnt]) => `
        <div class="bar-row">
          <span class="bar-label" style="color:var(--text2);width:160px" title="${lbl}">${lbl}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((dias / maxTempo) * 100)}%;background:var(--purple)"></div></div>
          <span class="bar-val">${fmtDec(dias)}d</span>
          <span class="bar-pct" style="color:var(--text3);white-space:nowrap">${fmt(cnt)} serv.</span>
        </div>`,
        )
        .join("");
    }
  }

  // ── Top 10 bairros ────────────────────────────────────────────────────────
  const bairros = groupBy(rows, "Bairro").slice(0, 10);
  const maxB = bairros.length ? bairros[0][1] : 1;
  setHTML(
    "bairroList",
    bairros
      .map(
        ([lbl, n], i) => `
    <div class="rank-row">
      <span class="rank-num">${i + 1}</span>
      <span class="rank-name" title="${lbl}">${lbl}</span>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((n / maxB) * 100)}%"></div></div>
      <span class="bar-val" style="width:36px">${fmt(n)}</span>
      <span class="bar-pct">${pct(n, total)}</span>
    </div>`,
      )
      .join(""),
  );

  // ── Volume mensal ─────────────────────────────────────────────────────────
  const mensalEntries = buildMensalMap(rows);
  const mensalLabels = mensalEntries.map(([, v]) => v.lbl);
  const mensalVals = mensalEntries.map(([, v]) => v.rows.length);
  const picoIdx = mensalVals.indexOf(Math.max(...mensalVals));

  const retornoMap = {};
  mensalEntries.forEach(([k, v]) => {
    retornoMap[v.lbl] = 0;
  });
  rows.forEach((r) => {
    if ((r["Situação"] || "").trim() !== "OK") return;
    const d = parseDate(r["Data Retorno"]);
    if (!d || isNaN(d)) return;
    const lbl = mesLabel(d);
    if (lbl in retornoMap) retornoMap[lbl] = (retornoMap[lbl] || 0) + 1;
  });
  const retornoVals = mensalLabels.map((lbl) => retornoMap[lbl] || 0);

  const picoRetIdx = retornoVals.indexOf(Math.max(...retornoVals));
  const picoEntLabel = mensalEntries.length
    ? "entrada: " + mensalLabels[picoIdx] + " · " + fmt(mensalVals[picoIdx])
    : "";
  const picoRetLabel = retornoVals.length
    ? "conclusão: " +
      mensalLabels[picoRetIdx] +
      " · " +
      fmt(retornoVals[picoRetIdx])
    : "";
  setHTML(
    "pico-label",
    picoEntLabel && picoRetLabel
      ? `<span>pico ${picoEntLabel}</span><span style="color:var(--text3);margin:0 6px">·</span><span style="color:var(--green)">pico ${picoRetLabel}</span>`
      : picoEntLabel || picoRetLabel,
  );

  destroyChart("cMensal");
  charts["cMensal"] = new Chart(document.getElementById("cMensal"), {
    type: "line",
    data: {
      labels: mensalLabels,
      datasets: [
        {
          label: "Entradas",
          data: mensalVals,
          borderColor: COLORS.blue,
          backgroundColor: COLORS.blue + "22",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
        },
        {
          label: "Concluídos",
          data: retornoVals,
          borderColor: COLORS.green,
          backgroundColor: COLORS.green + "22",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { left: 8, right: 16 } },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: "#555550",
            font: { size: 11 },
            boxWidth: 10,
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              if (items.length < 2) return "";
              const entradas =
                items.find((i) => i.dataset.label === "Entradas")?.parsed.y ??
                0;
              const concluidos =
                items.find((i) => i.dataset.label === "Concluídos")?.parsed.y ??
                0;
              const saldo = concluidos - entradas;
              const sinal = saldo >= 0 ? "+" : "";
              return [
                "",
                "Saldo: " +
                  sinal +
                  fmt(saldo) +
                  (saldo >= 0 ? " ✓" : " ↑ estoque"),
              ];
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
      },
    },
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}
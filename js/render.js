// ─── Render — Visão Geral ────────────────────────────────────────────────────

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
  setText("kAt", fmt(at));
  setText("kAtPct", pct(at, total) + " do total");
  setText("kAr", fmt(ar));
  setText("kArPct", pct(ar, total) + " do total");
  setText("kReab", fmt(reabIds));
  setText(
    "kReabPct",
    fmt(reabTotal) + " evento(s) · " + pct(reabIds, total) + " dos serviços",
  );
  setHTML(
    "kMedia",
    media.toFixed(1) +
      '<span style="font-size:15px;font-weight:400;color:var(--text2)"> d</span>',
  );
  setText("kMediaSub", "Mediana: " + Math.round(mediana) + " dias");

  setText("badge-ok", pct(ok, total) + " no prazo");
  setText("badge-at", fmt(at) + " em atendimento");
  setText("badge-ar", fmt(ar) + " em atraso");

  // ── Situação — display simples sem canvas ─────────────────────────────────
  destroyChart("cSit");
  const taxaOk = total ? (ok / total) * 100 : 0;
  setHTML(
    "cSitDisplay",
    `
    <div class="sit-display">
      <div class="sit-display-pct" style="color:var(--green)">${taxaOk.toFixed(1)}%</div>
      <div class="sit-display-label">taxa de sucesso</div>
      <div class="sit-display-row">
        <span class="sit-display-item">
          <span class="sit-display-dot" style="background:var(--amber)"></span>
          <span style="color:var(--amber);font-weight:500">${fmt(at)}</span>
          <span>em atendimento</span>
        </span>
        <span class="sit-display-item">
          <span class="sit-display-dot" style="background:var(--red)"></span>
          <span style="color:var(--red);font-weight:500">${fmt(ar)}</span>
          <span>em atraso</span>
        </span>
      </div>
    </div>
  `,
  );

  // ── Categorias — só as com ≥ 10 registros + nota das demais ───────────────
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
    .map(
      ([lbl, n]) => `
    <div class="bar-row">
      <span class="bar-label" style="color:var(--text2);width:200px" title="${lbl}">${lbl}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((n / maxCat) * 100)}%;background:var(--purple)"></div></div>
      <span class="bar-n">${fmt(n)}</span>
    </div>`,
    )
    .join("");

  if (skipped > 0) {
    catsHTML += `<div class="cats-note">+ ${skipped} categoria${skipped > 1 ? "s" : ""} com menos de 5 registros</div>`;
  }

  setHTML("catBars", catsHTML);

  // ── Regiões — rosca ────────────────────────────────────────────────────────
  const regs = groupBy(rows, "Região");
  makeDonut(
    "cReg",
    regs.map((r) => r[0]),
    regs.map((r) => r[1]),
    regs.map((_, i) => COLORS.regioes[i] || COLORS.gray),
    { cutout: "55%" },
  );

  // ── Reaberturas ────────────────────────────────────────────────────────────
  const reabRows = rows.filter((r) => parseInt(r["Ocorrências"] || 1) > 1);
  const reabCats = groupBy(reabRows, "Categoria").slice(0, 4);
  setText("rTotal", fmt(reabIds));
  setText("rEventos", fmt(reabTotal) + " eventos de reabertura");
  setText("rPct", pct(reabIds, total) + " dos serviços");

  const badgeCls = ["b-red", "b-amb", "b-blue", "b-blue"];
  setHTML(
    "reabList",
    reabCats
      .map(
        ([lbl, n], i) =>
          `<div class="list-row"><span>${lbl}</span><span class="badge ${badgeCls[i] || "b-blue"}">${fmt(n)}</span></div>`,
      )
      .join(""),
  );

  const reabRegs = groupBy(reabRows, "Região");
  const maxRR = reabRegs.length ? reabRegs[0][1] : 1;
  setHTML(
    "reabRegBars",
    reabRegs
      .slice(0, 5)
      .map(
        ([lbl, n]) => `
    <div class="bar-row">
      <span class="bar-label">${lbl}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((n / maxRR) * 100)}%;background:var(--blue)"></div></div>
      <span class="bar-n">${fmt(n)}</span>
    </div>`,
      )
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
    { cutout: "60%" },
  );

  // ── Tempo médio por categoria — mín. 10 registros ─────────────────────────
  const tempoData = avgBy(okRows, "Categoria", "Dias Execução", 10).slice(0, 5);
  if (tempoData.length) {
    makeBarH(
      "cTempo",
      tempoData.map(([k]) =>
        k
          .replace("Lâmpada", "Lâmp.")
          .replace("Iluminação", "Ilum.")
          .replace("Irregular", "Irr."),
      ),
      tempoData.map(([, v]) => +v.toFixed(1)),
      COLORS.purple,
      { suffix: " dias" },
    );
  } else {
    const el = document.getElementById("cTempo");
    if (el)
      el.parentElement.innerHTML =
        '<p style="font-size:11px;color:var(--text3);padding:8px 0">Dados insuficientes para calcular média.</p>';
  }

  // ── Top 8 bairros ──────────────────────────────────────────────────────────
  const bairros = groupBy(rows, "Bairro").slice(0, 8);
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
      <span class="rank-n">${fmt(n)}</span>
    </div>`,
      )
      .join(""),
  );

  // ── Volume mensal ──────────────────────────────────────────────────────────
  const mensalEntries = buildMensalMap(rows);
  const mensalLabels = mensalEntries.map(([, v]) => v.lbl);
  const mensalVals = mensalEntries.map(([, v]) => v.rows.length);
  const picoIdx = mensalVals.indexOf(Math.max(...mensalVals));

  setText(
    "pico-label",
    mensalEntries.length
      ? "pico: " + mensalLabels[picoIdx] + " · " + fmt(mensalVals[picoIdx])
      : "",
  );

  makeBarV(
    "cMensal",
    mensalLabels,
    mensalVals,
    mensalVals.map((_, i) => (i === picoIdx ? COLORS.red : COLORS.blue)),
    { suffix: " demandas", showLegend: true, legendLabel: "Demandas abertas" },
  );
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

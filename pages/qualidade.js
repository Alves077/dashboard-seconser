// ─── Qualidade ────────────────────────────────────────────────────────────────

function populateFilters() {
  const selCat = document.getElementById('qFiltCat');
  if (!selCat) return;
  selCat.innerHTML = '<option value="">Todas</option>';
  groupBy(allRows, 'Categoria').map(([k]) => k).filter(Boolean)
    .forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; selCat.appendChild(o); });
}

function applyFilters() {
  const nMeses = parseInt(document.getElementById('qFiltPeriodo')?.value || '0') || 0;
  const cat = document.getElementById('qFiltCat')?.value || '';
  let rows = allRows;
  if (cat) rows = rows.filter(r => (r['Categoria'] || '').trim() === cat);
  if (nMeses > 0) {
    // Descobre meses calendário presentes, ordena, descarta incompleto (< 40% do anterior)
    const monthCount = {};
    rows.forEach(r => {
      const d = parseDate(r['Data Saída']);
      if (!d || isNaN(d)) return;
      const k = d.getFullYear() * 100 + d.getMonth();
      monthCount[k] = (monthCount[k] || 0) + 1;
    });
    const monthKeys = Object.keys(monthCount).map(Number).sort((a, b) => a - b);
    if (monthKeys.length >= 2) {
      const last = monthCount[monthKeys[monthKeys.length - 1]];
      const prev = monthCount[monthKeys[monthKeys.length - 2]];
      if (last < prev * 0.4) monthKeys.pop();
    }
    const validKeys = new Set(monthKeys.slice(-nMeses));
    rows = rows.filter(r => {
      const d = parseDate(r['Data Saída']);
      return d && !isNaN(d) && validKeys.has(d.getFullYear() * 100 + d.getMonth());
    });
  }
  render(rows);
}

function onDataLoaded() {
  populateFilters();
  render(allRows);
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

  // ── Valores base ─────────────────────────────────────────────────────────────
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

  const faixas = groupBy(okRows, "Faixa Execução").filter(
    ([k]) => k && k !== "0. Em Atendimento",
  );
  const rapidos = faixas.find(([k]) => k === "1. Até 3 dias");
  const long15 = faixas.find(([k]) => k === "4. Mais de 15 dias");

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  // KPI 1: Taxa de conclusão (mantém — é o termômetro principal)
  setText("qTaxaOk", pct(ok, total));
  setText("qTaxaOkSub", fmt(ok) + " de " + fmt(total));

  // KPI 2: Reincidência — % de serviços que precisaram de mais de uma visita
  setText("qTaxaReab", pct(reabIds, total));
  setText(
    "qTaxaReabSub",
    fmt(reabIds) + " IDs · " + fmt(reabTotal) + " eventos",
  );

  // KPI 3: Resolução rápida — concluídos em ≤3 dias (maior faixa, mede eficiência imediata)
  setText("qRapido", rapidos ? pct(rapidos[1], ok) : "—");
  setText(
    "qRapidoSub",
    rapidos ? fmt(rapidos[1]) + " concluídos" : "sem dados",
  );

  // KPI 4: Cauda longa — concluídos acima de 15 dias (passivo crítico)
  setText("qLong", long15 ? pct(long15[1], ok) : "0,0%");
  setText("qLongSub", long15 ? fmt(long15[1]) + " serviços" : "0 serviços");

  // KPI 5: Tempo médio
  setHTML(
    "qMedia",
    fmtDec(media) +
      '<span style="font-size:15px;font-weight:400;color:var(--text2)"> d</span>',
  );
  setText("qMediaSub", "Mediana: " + Math.round(mediana) + " dias");

  // KPI 6: Em atraso agora
  setText("qTaxaAr", pct(ar, abertos || 1));
  setText("qTaxaArSub", fmt(ar) + " de " + fmt(abertos) + " abertos");

  // ── BLOCO 2 esquerda: Desvio de prazo por região ──────────────────────────────
  // Mostra a FALHA (taxa de atraso), não o sucesso — regiões ordenadas do pior ao melhor
  const regioes = [
    ...new Set(rows.map((r) => (r["Região"] || "").trim()).filter(Boolean)),
  ].sort();

  const regDesvio = regioes
    .map((reg) => {
      const regRows = rows.filter((r) => (r["Região"] || "").trim() === reg);
      const regAr = count(regRows, "Situação", "Em Atraso");
      const regAt = count(regRows, "Situação", "Em Atendimento");
      // considera abertos como potencial atraso futuro (contexto + atraso confirmado)
      const txAr = regRows.length ? (regAr / regRows.length) * 100 : 0;
      const txAt = regRows.length ? (regAt / regRows.length) * 100 : 0;
      return { reg, n: regRows.length, txAr, txAt, regAr, regAt };
    })
    .sort((a, b) => b.txAr - a.txAr);

  const maxDesvReg = regDesvio.length ? Math.max(regDesvio[0].txAr, 0.1) : 1;

  setHTML(
    "regDesvioList",
    regDesvio
      .map(({ reg, n, txAr, txAt, regAr, regAt }) => {
        const cor =
          txAr > 5 ? "var(--red)" : txAr > 2 ? "var(--amber)" : "var(--green)";
        const fillPct = Math.max((txAr / maxDesvReg) * 100, txAr > 0 ? 2 : 0);
        return `
      <div class="bar-row">
        <span class="bar-label" style="width:120px" title="${reg}">${reg}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${fillPct.toFixed(0)}%;background:${cor}"></div>
        </div>
        <span class="bar-val" style="color:${cor};font-weight:600;width:38px">${fmtDec(txAr)}%</span>
        <span class="bar-sub" style="font-size:10px;color:var(--text3);width:80px;text-align:right;flex-shrink:0">${regAr > 0 ? fmt(regAr) + " em atraso" : "nenhum em atraso"}</span>
      </div>`;
      })
      .join(""),
  );

  // ── BLOCO 2 direita: Taxa de reabertura por categoria ────────────────────────
  // reaberturas da cat / total de serviços da cat — detecta má execução técnica
  const seenReabIds = new Set();
  const reabByCat = {};
  rows.forEach((r) => {
    const occ = parseInt(r["Ocorrências"] || 1);
    if (occ <= 1) return;
    const id = r["ID Colab"];
    if (seenReabIds.has(id)) return;
    seenReabIds.add(id);
    const cat = (r["Categoria"] || "").trim();
    reabByCat[cat] = (reabByCat[cat] || 0) + 1;
  });

  const totalByCat = {};
  rows.forEach((r) => {
    const cat = (r["Categoria"] || "").trim();
    if (cat) totalByCat[cat] = (totalByCat[cat] || 0) + 1;
  });

  // Taxa = reabIds da cat / total da cat — mínimo 10 serviços para entrar
  const catTaxaReab = Object.entries(reabByCat)
    .map(([cat, reab]) => {
      const tot = totalByCat[cat] || 1;
      if (tot < 10) return null;
      return { cat, reab, tot, taxa: (reab / tot) * 100 };
    })
    .filter(Boolean)
    .sort((a, b) => b.taxa - a.taxa)
    .slice(0, 8);

  const maxTaxaReab = catTaxaReab.length ? catTaxaReab[0].taxa : 1;

  setHTML(
    "catReabTaxaList",
    catTaxaReab.length
      ? catTaxaReab
          .map(({ cat, reab, tot, taxa }) => {
            const cor =
              taxa > 5
                ? "var(--red)"
                : taxa > 2
                  ? "var(--amber)"
                  : "var(--purple)";
            const fillPct = Math.max((taxa / maxTaxaReab) * 100, 2);
            return `
      <div class="bar-row">
        <span class="bar-label" style="width:170px" title="${cat}">${cat}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${fillPct.toFixed(0)}%;background:${cor}"></div>
        </div>
        <span class="bar-val" style="color:${cor};font-weight:600;width:38px">${fmtDec(taxa)}%</span>
        <span class="bar-sub" style="font-size:10px;color:var(--text3);width:72px;text-align:right;flex-shrink:0">${fmt(reab)} reaberto${reab !== 1 ? "s" : ""}</span>
      </div>`;
          })
          .join("")
      : '<p style="font-size:11px;color:var(--text3);padding:8px 0">Sem reaberturas no período.</p>',
  );

  // ── BLOCO 3 esquerda: Histograma de tempo de execução dia a dia ─────────────
  // Mostra distribuição real dos dias — o donut dizia "61.9% até 3 dias"
  // mas não revelava se o DIP resolve em 1 dia ou empurra até o limite do 3º
  const histBuckets = { 0: 0 };
  for (let i = 1; i <= 15; i++) histBuckets[i] = 0;
  histBuckets["16+"] = 0;

  diasVals.forEach((v) => {
    const d = Math.round(v);
    if (d < 0) return;
    if (d === 0) histBuckets[0]++;
    else if (d <= 15) histBuckets[d]++;
    else histBuckets["16+"]++;
  });

  const histLabels = [
    "0d",
    ...Array.from({ length: 15 }, (_, i) => String(i + 1)),
    ">15",
  ];
  const histData = [
    histBuckets[0],
    ...Array.from({ length: 15 }, (_, i) => histBuckets[i + 1]),
    histBuckets["16+"],
  ];
  const histColors = histLabels.map(
    (_, i) =>
      i === 0
        ? COLORS.green + "bb" // mesmo dia — verde mais suave para distinguir do 1-3d
        : i <= 3
          ? COLORS.green // 1-3 dias
          : i <= 7
            ? COLORS.blue // 4-7 dias
            : i <= 15
              ? COLORS.amber // 8-15 dias
              : COLORS.red, // >15 dias
  );

  destroyChart("cHistograma");
  charts["cHistograma"] = new Chart(document.getElementById("cHistograma"), {
    type: "bar",
    data: {
      labels: histLabels,
      datasets: [
        {
          data: histData,
          backgroundColor: histColors,
          borderRadius: 3,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (ctx) =>
              ctx[0].label === ">15"
                ? "Mais de 15 dias"
                : ctx[0].label === "0d"
                  ? "Mesmo dia (0 dias)"
                  : ctx[0].label + (ctx[0].label === "1" ? " dia" : " dias"),
            label: (ctx) =>
              ` ${fmt(ctx.parsed.y)} serviços  (${pct(ctx.parsed.y, diasVals.length)})`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: _tickColor(), font: { size: 10 }, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
          title: {
            display: true,
            text: "Dias de execução",
            color: _tickColor(),
            font: { size: 10 },
            padding: { top: 4 },
          },
        },
        y: {
          beginAtZero: true,
          ticks: { color: _tickColor(), font: { size: 10 } },
          grid: { color: _gridColor() },
          border: { display: false },
        },
      },
    },
  });

  // Legenda manual embaixo do histograma
  setHTML(
    "histLegend",
    `
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px">
      ${[
        [COLORS.green, "1–3 dias"],
        [COLORS.blue, "4–7 dias"],
        [COLORS.amber, "8–15 dias"],
        [COLORS.red, ">15 dias"],
      ]
        .map(
          ([cor, lbl]) => `
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2)">
          <span style="width:9px;height:9px;border-radius:2px;background:${cor};flex-shrink:0"></span>
          ${lbl}
        </span>`,
        )
        .join("")}
    </div>`,
  );

  // ── BLOCO 3 direita: Distribuição de faixas por região — tabela ───────────────
  const faixaKeys = [
    "1. Até 3 dias",
    "2. 4 a 7 dias",
    "3. 8 a 15 dias",
    "4. Mais de 15 dias",
  ];
  const faixaShort = ["≤3d", "4–7d", "8–15d", ">15d"];
  const faixaCores = [COLORS.green, COLORS.blue, COLORS.amber, COLORS.red];

  let tableHTML = `
    <div style="display:flex;gap:4px;align-items:center;margin-bottom:8px;
                padding-bottom:6px;border-bottom:0.5px solid var(--border)">
      <span style="width:110px;flex-shrink:0;font-size:10px;color:var(--text3);
                   text-transform:uppercase;letter-spacing:.04em">Região</span>
      ${faixaShort
        .map(
          (s, i) => `
        <div style="flex:1;text-align:center">
          <span style="font-size:10px;font-weight:600;color:${faixaCores[i]}">${s}</span>
        </div>`,
        )
        .join("")}
      <span style="width:44px;flex-shrink:0;font-size:10px;color:var(--text3);
                   text-transform:uppercase;text-align:right;letter-spacing:.04em">Total</span>
    </div>`;

  // Ordena regiões por % >15d decrescente (piores primeiro)
  const regOrdenadaFaixas = regioes
    .map((reg) => {
      const regOkRows = okRows.filter(
        (r) => (r["Região"] || "").trim() === reg,
      );
      const regTotal = regOkRows.length;
      const counts = faixaKeys.map(
        (k) =>
          regOkRows.filter((r) => (r["Faixa Execução"] || "").trim() === k)
            .length,
      );
      const pctLong = regTotal ? (counts[3] / regTotal) * 100 : 0;
      return { reg, regTotal, counts, pctLong };
    })
    .filter((d) => d.regTotal > 0)
    .sort((a, b) => b.pctLong - a.pctLong);

  regOrdenadaFaixas.forEach(({ reg, regTotal, counts }) => {
    tableHTML += `
      <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">
        <span style="width:110px;flex-shrink:0;font-size:11px;color:var(--text2);
                     white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
              title="${reg}">${reg}</span>
        ${counts
          .map(
            (n, i) => `
          <div style="flex:1;text-align:center">
            <span class="faixa-cell" style="display:inline-block;min-width:32px;padding:2px 4px;border-radius:4px;
                         font-size:11px;font-weight:${n > 0 ? "600" : "400"};
                         color:${n > 0 ? faixaCores[i] : "var(--text3)"};
                         background:${n > 0 ? faixaCores[i] + "22" : "transparent"}">
              ${n > 0 ? pct(n, regTotal) : "—"}
            </span>
          </div>`,
          )
          .join("")}
        <span class="bar-val" style="width:44px;flex-shrink:0;font-size:11px;color:var(--text2);
                     text-align:right;font-variant-numeric:tabular-nums">${fmt(regTotal)}</span>
      </div>`;
  });

  setHTML("faixaRegTable", tableHTML);

  // ── BLOCO 4: Evolução mensal — duas linhas limpas ────────────────────────────
  // Agrupado por Data Retorno dos concluídos — sem viés de mês incompleto
  // Linha azul:  tempo médio de execução (dias)
  // Linha âmbar: % de concluídos com >15 dias (cauda longa — dado limpo)

  // Descobre o range de meses a partir das datas de saída
  const mensalMap = {};
  rows.forEach((r) => {
    const d = parseDate(r["Data Saída"]);
    if (!d || isNaN(d)) return;
    const k = d.getFullYear() * 100 + d.getMonth();
    if (!mensalMap[k]) mensalMap[k] = { lbl: mesLabel(d) };
  });

  // Agrupa concluídos por Data Retorno
  const retornoMap = {}; // k → { dias: [], long15: 0, total: 0 }
  rows.forEach((r) => {
    if ((r["Situação"] || "").trim() !== "OK") return;
    const d = parseDate(r["Data Retorno"]);
    if (!d || isNaN(d)) return;
    const k = d.getFullYear() * 100 + d.getMonth();
    if (!retornoMap[k])
      retornoMap[k] = { lbl: mesLabel(d), dias: [], long15: 0, total: 0 };
    const v = parseFloat(
      (r["Dias Execução"] || "").toString().replace(",", "."),
    );
    if (!isNaN(v) && v >= 0) {
      retornoMap[k].dias.push(v);
      if (v > 15) retornoMap[k].long15++;
    }
    retornoMap[k].total++;
  });

  const retornoEntries = Object.entries(retornoMap).sort(
    (a, b) => +a[0] - +b[0],
  );

  // Remove mês atual se incompleto (< 40% do anterior)
  if (retornoEntries.length >= 2) {
    const last = retornoEntries[retornoEntries.length - 1][1].total;
    const prev = retornoEntries[retornoEntries.length - 2][1].total;
    if (last < prev * 0.4) retornoEntries.pop();
  }

  const mLabels = retornoEntries.map(([, v]) => v.lbl);
  const mTempo = retornoEntries.map(([, v]) => {
    if (v.dias.length < 5) return null;
    return +(v.dias.reduce((a, b) => a + b, 0) / v.dias.length).toFixed(1);
  });
  const mCaudaLonga = retornoEntries.map(([, v]) => {
    if (v.total < 5) return null;
    return +((v.long15 / v.total) * 100).toFixed(1);
  });

  // Eixo Y esquerdo (dias): começa em 0
  // Eixo Y direito (%): começa em 0, max dinâmico com folga generosa para dar respiro visual
  const maxCauda = Math.max(...mCaudaLonga.filter((v) => v !== null), 1);
  const yCaudaMax = Math.ceil((maxCauda * 1.25) / 5) * 5; // folga de 25% sobre o pico real

  destroyChart("cEvolucao");
  charts["cEvolucao"] = new Chart(document.getElementById("cEvolucao"), {
    type: "line",
    data: {
      labels: mLabels,
      datasets: [
        {
          label: "Tempo médio (dias)",
          data: mTempo,
          borderColor: COLORS.blue,
          backgroundColor: COLORS.blue + "18",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
          yAxisID: "yDias",
          spanGaps: true,
        },
        {
          label: "Cauda longa >15d (%)",
          data: mCaudaLonga,
          borderColor: COLORS.amber,
          backgroundColor: COLORS.amber + "18",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
          yAxisID: "yCauda",
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
            color: _legendColor(),
            font: { size: 11 },
            boxWidth: 10,
            padding: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.yAxisID === "yDias")
                return ` Tempo médio: ${ctx.parsed.y !== null ? ctx.parsed.y + "d" : "—"}`;
              if (ctx.dataset.yAxisID === "yCauda")
                return ` Cauda >15d: ${ctx.parsed.y !== null ? ctx.parsed.y + "%" : "—"}`;
              return "";
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: _tickColor(), font: { size: 11 }, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
          offset: true,
        },
        yDias: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          ticks: {
            color: COLORS.blue,
            font: { size: 11 },
            callback: (v) => v + "d",
          },
          grid: { color: _gridColor() },
          border: { display: false },
        },
        yCauda: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          max: yCaudaMax,
          ticks: {
            color: COLORS.amber,
            font: { size: 11 },
            callback: (v) => v + "%",
            maxTicksLimit: 5,
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    },
  });
}

// ── Fix do bug: chama loadData() automaticamente ao carregar a página ─────────
loadData();

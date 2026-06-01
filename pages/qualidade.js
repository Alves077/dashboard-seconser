// ─── Qualidade ────────────────────────────────────────────────────────────────

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHTML(id, val) { const el = document.getElementById(id); if (el) el.innerHTML   = val; }

function onDataLoaded() {
  render(allRows);
}

function populateFilters() {}

function render(rows) {
  const total = rows.length;
  if (!total) return;

  const range = dateRange(rows);
  if (range) {
    document.getElementById('sub-periodo').textContent =
      mesLabel(range.min) + ' – ' + mesLabel(range.max) + ' · ' + fmt(total) + ' registros';
  }
  document.getElementById('last-update').textContent =
    'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const ok     = count(rows, 'Situação', 'OK');
  const ar     = count(rows, 'Situação', 'Em Atraso');
  const { reabIds } = calcReaberturas(rows);
  const okRows = rows.filter(r => r['Situação'] === 'OK');

  const diasVals = okRows
    .map(r => parseFloat((r['Dias Execução'] || '').toString().replace(',', '.')))
    .filter(v => !isNaN(v) && v >= 0);
  const media   = diasVals.length ? diasVals.reduce((a, b) => a + b, 0) / diasVals.length : 0;
  const sorted  = [...diasVals].sort((a, b) => a - b);
  const mediana = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  const faixas  = groupBy(okRows, 'Faixa Execução').filter(([k]) => k && k !== '0. Em Atendimento');
  const sla7    = faixas
    .filter(([k]) => k === '1. Até 3 dias' || k === '2. 4 a 7 dias')
    .reduce((s, [, n]) => s + n, 0);
  const long15  = faixas.find(([k]) => k === '4. Mais de 15 dias');

  setText('qTaxaOk',   pct(ok, total));
  setText('qTaxaAr',   pct(ar, total));
  setText('qTaxaReab', pct(reabIds, total));
  setText('qSla7',     pct(sla7, ok));
  setHTML('qMedia',    media.toFixed(1) + '<span style="font-size:15px;font-weight:400;color:var(--text2)"> d</span>');
  setText('qMediaSub', 'Mediana: ' + Math.round(mediana) + ' dias');
  setText('qLong',     long15 ? pct(long15[1], ok) : '0%');

  // SLA por região
  const regioes = [...new Set(rows.map(r => (r['Região'] || '').trim()).filter(Boolean))].sort();
  setHTML('slaRegList', regioes.map(reg => {
    const regRows = rows.filter(r => (r['Região'] || '').trim() === reg);
    const regOk   = count(regRows, 'Situação', 'OK');
    const taxa    = regRows.length ? regOk / regRows.length * 100 : 0;
    const cor     = taxa >= 95 ? 'var(--green)' : taxa >= 80 ? 'var(--amber)' : 'var(--red)';
    return `<div class="bar-row">
      <span class="bar-label" title="${reg}">${reg}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${taxa.toFixed(0)}%;background:${cor}"></div></div>
      <span class="bar-n" style="color:${cor};font-weight:600">${taxa.toFixed(0)}%</span>
    </div>`;
  }).join(''));

  // SLA por categoria
  const catsSla = groupBy(rows, 'Categoria').slice(0, 7).map(([cat]) => {
    const catRows = rows.filter(r => (r['Categoria'] || '').trim() === cat);
    const catOk   = count(catRows, 'Situação', 'OK');
    const taxa    = catRows.length ? catOk / catRows.length * 100 : 0;
    return { cat, taxa };
  }).sort((a, b) => b.taxa - a.taxa);

  setHTML('slaCatList', catsSla.map(({ cat, taxa }) => {
    const cor = taxa >= 95 ? 'var(--green)' : taxa >= 80 ? 'var(--amber)' : 'var(--red)';
    return `<div class="bar-row">
      <span class="bar-label" title="${cat}">${cat}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${taxa.toFixed(0)}%;background:${cor}"></div></div>
      <span class="bar-n" style="color:${cor};font-weight:600">${taxa.toFixed(0)}%</span>
    </div>`;
  }).join(''));

  // Reaberturas por categoria
  const reabRows = rows.filter(r => parseInt(r['Ocorrências'] || 1) > 1);
  const reabCats = groupBy(reabRows, 'Categoria').slice(0, 7);
  makeBarH('cReabCat',
    reabCats.map(([k]) => k),
    reabCats.map(([, v]) => v),
    COLORS.purple,
    { suffix: ' registros' }
  );

  // Faixas execução — rosca
  const faixaLabelMap = {
    '1. Até 3 dias':      'Até 3 dias',
    '2. 4 a 7 dias':      '4-7 dias',
    '3. 8 a 15 dias':     '8-15 dias',
    '4. Mais de 15 dias': '> 15 dias',
  };
  makeDonut('cFaixaQ',
    faixas.map(([k]) => faixaLabelMap[k] || k),
    faixas.map(([, v]) => v),
    faixas.map((_, i) => COLORS.faixas[i] || COLORS.gray),
    { cutout: '60%' }
  );

  // Tempo médio por região
  const tempoReg = regioes.map(reg => {
    const regOkRows = okRows.filter(r => (r['Região'] || '').trim() === reg);
    const vals = regOkRows
      .map(r => parseFloat((r['Dias Execução'] || '').toString().replace(',', '.')))
      .filter(v => !isNaN(v) && v >= 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return [reg, avg];
  }).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  makeBarH('cTempoReg',
    tempoReg.map(([k]) => k),
    tempoReg.map(([, v]) => +v.toFixed(1)),
    COLORS.blue,
    { suffix: ' dias' }
  );
}

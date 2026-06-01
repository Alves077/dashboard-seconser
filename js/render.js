function render(rows) {
  const total = rows.length;
  if (!total) {
    document.getElementById('sub-periodo').textContent = 'Sem dados para os filtros selecionados';
    return;
  }

  const ok = count(rows, 'Situação', 'OK');
  const at = count(rows, 'Situação', 'Em Atendimento');
  const ar = count(rows, 'Situação', 'Em Atraso');
  const reab = countIf(rows, 'Ocorrências', v => parseInt(v || 0) > 1);
  const diasVals = rows
    .filter(r => r['Situação'] === 'OK')
    .map(r => parseFloat(r['Dias Execução'] || 0))
    .filter(v => !isNaN(v));
  const media = diasVals.length ? diasVals.reduce((a, b) => a + b, 0) / diasVals.length : 0;
  const sorted = [...diasVals].sort((a, b) => a - b);
  const mediana = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  // KPIs
  document.getElementById('kTotal').textContent = fmt(total);
  document.getElementById('kOk').textContent = fmt(ok);
  document.getElementById('kOkPct').textContent = pct(ok, total) + ' do total';
  document.getElementById('kAt').textContent = fmt(at);
  document.getElementById('kAr').textContent = fmt(ar);
  document.getElementById('kReab').textContent = fmt(reab);
  document.getElementById('kReabPct').textContent = pct(reab, total) + ' do total';
  document.getElementById('kMedia').innerHTML = media.toFixed(1) + '<span style="font-size:14px;font-weight:400;color:var(--text2)"> d</span>';
  document.getElementById('kMediaSub').textContent = 'Mediana: ' + Math.round(mediana) + ' dias';

  // Badges topbar
  document.getElementById('badge-ok').textContent = pct(ok, total) + ' no prazo';
  document.getElementById('badge-at').textContent = fmt(at) + ' em atendimento';
  document.getElementById('badge-ar').textContent = fmt(ar) + ' em atraso';

  // Situação card
  document.getElementById('sOk').textContent = fmt(ok);
  document.getElementById('sAt').textContent = fmt(at);
  document.getElementById('sAr').textContent = fmt(ar);
  document.getElementById('sTaxa').textContent = pct(ok, total);

  // Donut situação
  makeDonut('cSit',
    ['OK', 'Em atendimento', 'Em atraso'],
    [ok, at, ar],
    ['#639922', '#BA7517', '#E24B4A']
  );

  // Categorias
  const cats = groupBy(rows, 'Categoria');
  const topCat = cats[0] || ['—', 0];
  document.getElementById('catTop').textContent = topCat[0];
  document.getElementById('catTopVal').innerHTML =
    fmt(topCat[1]) + ' · <span style="color:var(--blue)">' + pct(topCat[1], total) + '</span>';
  const otherCats = cats.slice(1, 7);
  const maxCat = otherCats.length ? otherCats[0][1] : 1;
  document.getElementById('catBars').innerHTML = otherCats.map(([lbl, n]) => `
    <div class="bar-row">
      <span class="bar-label" title="${lbl}">${lbl}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(n / maxCat * 100)}%;background:var(--purple)"></div></div>
      <span class="bar-n">${fmt(n)}</span>
    </div>`).join('');

  // Regiões
  const regs = groupBy(rows, 'Região');
  const regColors = ['#378ADD', '#7F77DD', '#1D9E75', '#BA7517', '#888780'];
  makeBarH('cReg',
    regs.map(r => r[0]),
    regs.map(r => r[1]),
    regs.map((_, i) => regColors[i] || '#888780')
  );

  // Reaberturas
  const reabRows = rows.filter(r => parseInt(r['Ocorrências'] || 0) > 1);
  const reabCats = groupBy(reabRows, 'Categoria').slice(0, 4);
  const badgeClasses = ['b-red', 'b-amb', 'b-blue', 'b-blue'];
  document.getElementById('rTotal').textContent = fmt(reab);
  document.getElementById('rPct').textContent = 'reaberturas · ' + pct(reab, total) + ' do total';
  document.getElementById('reabList').innerHTML = reabCats.map(([lbl, n], i) =>
    `<div class="list-row"><span style="font-size:11px">${lbl}</span><span class="badge ${badgeClasses[i] || 'b-blue'}">${fmt(n)}</span></div>`
  ).join('');

  const reabRegs = groupBy(reabRows, 'Região');
  const maxReabReg = reabRegs.length ? reabRegs[0][1] : 1;
  document.getElementById('reabRegBars').innerHTML = reabRegs.slice(0, 5).map(([lbl, n]) => `
    <div class="bar-row">
      <span class="bar-label">${lbl}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(n / maxReabReg * 100)}%;background:var(--blue)"></div></div>
      <span class="bar-n">${fmt(n)}</span>
    </div>`).join('');

  // Faixas de execução
  const okRows = rows.filter(r => r['Situação'] === 'OK');
  const faixas = groupBy(okRows, 'Faixa Execução').filter(([k]) => k && k !== '0. Em Atendimento');
  const faixaColors = { '1. Até 3 dias': 'var(--green)', '2. 4 a 7 dias': 'var(--blue)', '3. 8 a 15 dias': 'var(--amber)', '4. Mais de 15 dias': 'var(--red)' };
  const faixaLabels = { '1. Até 3 dias': 'Até 3 dias', '2. 4 a 7 dias': '4 a 7 dias', '3. 8 a 15 dias': '8 a 15 dias', '4. Mais de 15 dias': 'Mais de 15 dias' };
  const totalFaixa = faixas.reduce((s, [, n]) => s + n, 0) || 1;
  document.getElementById('faixaList').innerHTML = faixas.map(([k, n]) => `
    <div class="list-row">
      <div style="display:flex;align-items:center;gap:6px"><span class="faixa-dot" style="background:${faixaColors[k] || '#888'}"></span><span>${faixaLabels[k] || k}</span></div>
      <span style="font-size:11px;color:var(--text2)">${fmt(n)} · <b style="color:var(--text)">${pct(n, totalFaixa)}</b></span>
    </div>`).join('');

  // Tempo médio por categoria
  const tempoData = avgBy(okRows, 'Categoria').filter(([, v]) => v > 0).slice(0, 5);
  destroyChart('cTempo');
  charts['cTempo'] = new Chart(document.getElementById('cTempo'), {
    type: 'bar', indexAxis: 'y',
    data: {
      labels: tempoData.map(([k]) => k.replace('Lâmpada', 'Lâmp.').replace('Iluminação', 'Ilum.').replace('Irregular', 'Irr.')),
      datasets: [{ data: tempoData.map(([, v]) => +v.toFixed(1)), backgroundColor: '#7F77DD', borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(1)} dias` } } },
      scales: {
        x: { ticks: { color: tc, font: { size: 10 }, callback: v => v + 'd' }, grid: { color: gc }, border: { display: false } },
        y: { ticks: { color: tc, font: { size: 10 } }, grid: { display: false }, border: { display: false } }
      }
    }
  });

  // Top 8 bairros
  const bairros = groupBy(rows, 'Bairro').slice(0, 8);
  const maxB = bairros.length ? bairros[0][1] : 1;
  document.getElementById('bairroList').innerHTML = bairros.map(([lbl, n], i) => `
    <div class="rank-row">
      <span class="rank-num">${i + 1}</span>
      <span class="rank-name" title="${lbl}">${lbl}</span>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round(n / maxB * 100)}%"></div></div>
      <span class="rank-n">${fmt(n)}</span>
    </div>`).join('');

  // Volume mensal
  const mensal = {};
  rows.forEach(r => {
    const d = parseDate(r['Data Saída']);
    if (!d || isNaN(d)) return;
    const k = d.getFullYear() * 100 + d.getMonth();
    const lbl = mesLabel(d);
    if (!mensal[k]) mensal[k] = { lbl, n: 0 };
    mensal[k].n++;
  });
  const mensalSorted = Object.entries(mensal).sort((a, b) => +a[0] - +b[0]);
  const mensalVals = mensalSorted.map(([, v]) => v.n);
  const picoIdx = mensalVals.indexOf(Math.max(...mensalVals));
  document.getElementById('pico-label').textContent =
    mensalSorted.length ? 'pico: ' + mensalSorted[picoIdx][1].lbl + ' · ' + fmt(mensalVals[picoIdx]) : '';
  makeBarV('cMensal',
    mensalSorted.map(([, v]) => v.lbl),
    mensalVals,
    mensalVals.map((_, i) => i === picoIdx ? '#E24B4A' : '#378ADD'),
    ' demandas'
  );
}

// ── Estado específico do relatório ───────────────────────────────────────────
const CACHE_KEY = 'dip_csv_v2';
let activeTab = 'mensal';
let relatorioRendered = false;

// ── Helpers específicos do relatório ─────────────────────────────────────────
function fmtDate(s) {
  const d = parseDate(s);
  if (!d || isNaN(d)) return s || '—';
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}
function toInputDate(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function mesKey(d) {
  return d.getFullYear() * 100 + d.getMonth();
}

// ── Normalização de dados (mantida local — não importa data.js) ──────────────
const HEADER_MAP = {
  'ID Colab': 'ID Colab', 'Categoria': 'Categoria', 'Bairro': 'Bairro',
  'Região': 'Região', 'RegiÃ£o': 'Região',
  'Data Saída': 'Data Saída', 'Data SaÃ\xadda': 'Data Saída',
  'Data Retorno': 'Data Retorno', 'Prazo': 'Prazo',
  'Situação': 'Situação', 'SituaÃ§Ã£o': 'Situação',
  'Dias Execução': 'Dias Execução', 'Dias ExecuÃ§Ã£o': 'Dias Execução',
  'Faixa Execução': 'Faixa Execução', 'Faixa ExecuÃ§Ã£o': 'Faixa Execução',
  'Ocorrências': 'Ocorrências', 'OcorrÃªncias': 'Ocorrências',
  'Latitude': 'Latitude', 'Longitude': 'Longitude',
};

function normalizeRow(row) {
  const out = {};
  Object.keys(row).forEach(k => {
    const clean = HEADER_MAP[k.trim()] || k.trim();
    out[clean] = row[k];
  });
  const retorno = (out['Data Retorno'] || '').trim();
  if (retorno) {
    out['Situação'] = 'OK';
  } else {
    const prazo = parseDate(out['Prazo']);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    out['Situação'] = (prazo && !isNaN(prazo) && hoje > prazo) ? 'Em Atraso' : 'Em Atendimento';
  }
  return out;
}

// ── Carregamento de dados (lógica própria — não compartilha com data.js) ─────
function loadData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, url, csv } = JSON.parse(raw);
      if (url === CSV_URL && (Date.now() - ts) < CACHE_TTL_MS && csv) {
        processCSV(csv); return;
      }
    }
  } catch (e) { }

  Papa.parse(CSV_URL, {
    download: true, header: true, skipEmptyLines: true,
    complete(results) {
      const csv = Papa.unparse(results.data);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), url: CSV_URL, csv }));
      } catch (e) { }
      allRows = results.data.map(normalizeRow);
      onDataLoaded();
    },
    error(err) {
      document.getElementById('loading').innerHTML =
        '<span style="color:var(--red)">Erro ao carregar dados: ' + err.message + '</span>';
    },
  });
}

function processCSV(csvText) {
  const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  allRows = results.data.map(normalizeRow);
  onDataLoaded();
}

// ── Abas ─────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.body.className = 'tab-' + tab;
  document.getElementById('tabBtnMensal').classList.toggle('tab-active', tab === 'mensal');
  document.getElementById('tabBtnAbertos').classList.toggle('tab-active', tab === 'abertos');
  document.getElementById('filtersMensal').style.display = tab === 'mensal' ? 'flex' : 'none';
  document.getElementById('filtersAbertos').style.display = tab === 'abertos' ? 'flex' : 'none';
  document.getElementById('relatorio').style.display = (tab === 'mensal' && relatorioRendered) ? 'block' : 'none';
  const la = document.getElementById('lista-abertos');
  la.style.display = tab === 'abertos' ? 'block' : 'none';
  if (tab === 'abertos') renderListaAbertos();
}

// ── Após carregar dados ──────────────────────────────────────────────────────
function onDataLoaded() {
  document.getElementById('loading').style.display = 'none';
  document.body.className = 'tab-mensal';

  const hoje = new Date();
  const mesAtual = mesKey(hoje);
  const mesesMap = {};

  allRows.forEach(r => {
    const d = parseDate(r['Data Saída']);
    if (!d || isNaN(d)) return;
    const k = mesKey(d);
    if (k >= mesAtual) return;
    if (!mesesMap[k]) mesesMap[k] = mesLabel(d);
  });

  const meses = Object.entries(mesesMap).sort((a, b) => +b[0] - +a[0]);

  const sel = document.getElementById('selMes');
  sel.innerHTML = '<option value="">Selecione o mês…</option>';
  meses.forEach(([k, lbl]) => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = lbl;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    if (sel.value) renderRelatorio(+sel.value, mesesMap);
    else document.getElementById('relatorio').style.display = 'none';
  });

  if (meses.length) {
    sel.value = meses[0][0];
    renderRelatorio(+meses[0][0], mesesMap);
  }

  const abertos = allRows.filter(r => r['Situação'] !== 'OK');
  updateFilterOptions();

  const datasAbertos = abertos.map(r => parseDate(r['Data Saída'])).filter(d => d && !isNaN(d));
  if (datasAbertos.length) {
    const minD = new Date(Math.min(...datasAbertos));
    const maxD = new Date(Math.max(...datasAbertos));
    ['filtDe', 'filtAte'].forEach(id => {
      document.getElementById(id).min = toInputDate(minD);
      document.getElementById(id).max = toInputDate(maxD);
    });
  }
}

// ── Render do relatório mensal ───────────────────────────────────────────────
function renderRelatorio(mesK, mesesMap) {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
  const rel = document.getElementById('relatorio');
  relatorioRendered = true;
  if (activeTab === 'mensal') rel.style.display = 'block';

  const ano = Math.floor(mesK / 100);
  const mes = mesK % 100;
  const lbl = mesesMap[mesK];

  const rowsMes = allRows.filter(r => {
    const d = parseDate(r['Data Saída']);
    return d && !isNaN(d) && d.getFullYear() === ano && d.getMonth() === mes;
  });

  const mesAnteriorK = mes === 0 ? (ano - 1) * 100 + 11 : ano * 100 + (mes - 1);
  const lblAnterior = mesesMap[mesAnteriorK] || null;

  const ultimoDiaMesAnterior = new Date(ano, mes, 0);
  ultimoDiaMesAnterior.setHours(23, 59, 59, 999);
  const saldoAnterior = allRows.filter(r => {
    const saida = parseDate(r['Data Saída']);
    if (!saida || isNaN(saida) || saida > ultimoDiaMesAnterior) return false;
    const retorno = parseDate(r['Data Retorno']);
    return !retorno || isNaN(retorno) || retorno > ultimoDiaMesAnterior;
  }).length;

  const total = rowsMes.length;
  const concluidos = rowsMes.filter(r => r['Situação'] === 'OK').length;
  const abertos = rowsMes.filter(r => r['Situação'] !== 'OK').length;

  const okRows = rowsMes.filter(r => r['Situação'] === 'OK');
  const diasVals = okRows.map(r =>
    parseFloat((r['Dias Execução'] || '').toString().replace(',', '.'))
  ).filter(v => !isNaN(v) && v >= 0);

  const noPrazo = diasVals.filter(v => v <= 5).length;
  const media = diasVals.length ? diasVals.reduce((a, b) => a + b, 0) / diasVals.length : 0;

  const seen = new Map();
  rowsMes.forEach(r => {
    const id = r['ID Colab'];
    const occ = parseInt(r['Ocorrências'] || 1);
    if (!seen.has(id)) seen.set(id, occ);
  });
  let reabIds = 0, reabTotal = 0;
  seen.forEach(occ => { if (occ > 1) { reabIds++; reabTotal += occ - 1; } });

  const catMap = {}, catOkMap = {}, catArMap = {};
  rowsMes.forEach(r => {
    const c = (r['Categoria'] || '').trim();
    if (!c) return;
    catMap[c] = (catMap[c] || 0) + 1;
    if (r['Situação'] === 'OK') catOkMap[c] = (catOkMap[c] || 0) + 1;
    if (r['Situação'] === 'Em Atraso') catArMap[c] = (catArMap[c] || 0) + 1;
  });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const regMap = {}, regOkMap = {}, regArMap = {};
  rowsMes.forEach(r => {
    const reg = (r['Região'] || '').trim();
    if (!reg) return;
    regMap[reg] = (regMap[reg] || 0) + 1;
    if (r['Situação'] === 'OK') regOkMap[reg] = (regOkMap[reg] || 0) + 1;
    if (r['Situação'] === 'Em Atraso') regArMap[reg] = (regArMap[reg] || 0) + 1;
  });
  const regs = Object.entries(regMap).sort((a, b) => b[1] - a[1]);

  const bairroMap = {}, bairroOkMap = {}, bairroArMap = {};
  rowsMes.forEach(r => {
    const b = (r['Bairro'] || '').trim();
    if (!b) return;
    bairroMap[b] = (bairroMap[b] || 0) + 1;
    if (r['Situação'] === 'OK') bairroOkMap[b] = (bairroOkMap[b] || 0) + 1;
    if (r['Situação'] === 'Em Atraso') bairroArMap[b] = (bairroArMap[b] || 0) + 1;
  });
  const bairros = Object.entries(bairroMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const faixaKeyMap = {
    '1. Até 3 dias': 'Até 3 dias', '2. 4 a 7 dias': '4 a 7 dias',
    '3. 8 a 15 dias': '8 a 15 dias', '4. Mais de 15 dias': 'Mais de 15 dias',
  };
  const faixaOrdem = ['Até 3 dias', '4 a 7 dias', '8 a 15 dias', 'Mais de 15 dias'];
  const faixaCores = ['#639922', '#378ADD', '#BA7517', '#E24B4A'];
  const faixaMap = { 'Até 3 dias': 0, '4 a 7 dias': 0, '8 a 15 dias': 0, 'Mais de 15 dias': 0 };
  okRows.forEach(r => {
    const f = faixaKeyMap[(r['Faixa Execução'] || '').trim()];
    if (f) faixaMap[f]++;
  });
  const faixaVals = faixaOrdem.map(k => faixaMap[k]);
  const totalFaixas = faixaVals.reduce((a, b) => a + b, 0);

  const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  rel.innerHTML = `
    <div class="rel-header">
      <div>
        <div class="rel-title">Relatório Mensal · ${lbl}</div>
        <div class="rel-subtitle">Departamento de Iluminação Pública · Seconser Niterói</div>
      </div>
      <div class="rel-meta">
        Gerado em ${dataGeracao}<br>
        ${fmt(total)} serviços no período<br>
        Dados: Google Sheets via Apps Script
      </div>
    </div>

    ${lblAnterior ? `
    <div class="context-box">
      <strong>Contexto:</strong> ao início de ${lbl}, havia <strong>${fmt(saldoAnterior)} serviços em aberto</strong>
      acumulados de meses anteriores (saldo de ${lblAnterior}).
    </div>` : ''}

    <div class="rel-section">
      <div class="rel-section-title">Indicadores do mês</div>
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Entradas</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--blue)"></span><span class="kpi-value">${fmt(total)}</span></div>
          <div class="kpi-sub">serviços abertos</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Concluídos</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--green)"></span><span class="kpi-value">${fmt(concluidos)}</span></div>
          <div class="kpi-sub">${pct(concluidos, total)} do total</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">No Prazo</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--blue)"></span><span class="kpi-value">${pct(noPrazo, concluidos || 1)}</span></div>
          <div class="kpi-sub">${fmt(noPrazo)} de ${fmt(concluidos)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Tempo Médio</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--gray)"></span><span class="kpi-value">${fmtDec(media)}<span style="font-size:14px;font-weight:400;color:var(--text2)"> d</span></span></div>
          <div class="kpi-sub">dos concluídos</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Em Aberto</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--amber)"></span><span class="kpi-value">${fmt(abertos)}</span></div>
          <div class="kpi-sub">${pct(abertos, total)} do total</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Reaberturas</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--purple)"></span><span class="kpi-value">${fmt(reabIds)}</span></div>
          <div class="kpi-sub">${fmt(reabTotal)} evento(s)</div>
        </div>
      </div>
    </div>

    <div class="rel-section">
      <div class="rel-section-title">Distribuição</div>
      <div class="g2">
        <div class="card">
          <div class="card-title">Por categoria</div>
          <table class="reg-table">
            <thead><tr><th>Categoria</th><th>Total</th><th>%</th><th>Concluídos</th><th>Em Atraso</th></tr></thead>
            <tbody>${cats.map(([cat, n]) => `
              <tr>
                <td>${cat}</td><td>${fmt(n)}</td><td>${pct(n, total)}</td>
                <td style="color:var(--green)">${fmt(catOkMap[cat] || 0)}</td>
                <td style="color:${(catArMap[cat] || 0) > 0 ? 'var(--red)' : 'var(--text3)'}">${(catArMap[cat] || 0) > 0 ? fmt(catArMap[cat]) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-title">Top bairros</div>
          <table class="reg-table">
            <thead><tr><th>Bairro</th><th>Total</th><th>%</th><th>Concluídos</th><th>Em Atraso</th></tr></thead>
            <tbody>${bairros.map(([b, n]) => `
              <tr>
                <td>${b}</td><td>${fmt(n)}</td><td>${pct(n, total)}</td>
                <td style="color:var(--green)">${fmt(bairroOkMap[b] || 0)}</td>
                <td style="color:${(bairroArMap[b] || 0) > 0 ? 'var(--red)' : 'var(--text3)'}">${(bairroArMap[b] || 0) > 0 ? fmt(bairroArMap[b]) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="rel-section">
      <div class="rel-section-title">Detalhamento</div>
      <div class="g2">
        <div class="card">
          <div class="card-title">Distribuição por faixa · só concluídos</div>
          <div style="position:relative;height:180px;margin-bottom:12px"><canvas id="cFaixas"></canvas></div>
          <div id="cFaixasLegend" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>
        <div class="card">
          <div class="card-title">Por região</div>
          <table class="reg-table">
            <thead><tr><th>Região</th><th>Total</th><th>%</th><th>Concluídos</th><th>Em Atraso</th></tr></thead>
            <tbody>${regs.map(([reg, n]) => `
              <tr>
                <td>${reg}</td><td>${fmt(n)}</td><td>${pct(n, total)}</td>
                <td style="color:var(--green)">${fmt(regOkMap[reg] || 0)}</td>
                <td style="color:${(regArMap[reg] || 0) > 0 ? 'var(--red)' : 'var(--text3)'}">${(regArMap[reg] || 0) > 0 ? fmt(regArMap[reg]) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="rel-section obs-section">
      <div class="rel-section-title">Observações</div>
      <div class="obs-label">
        Notas do período
        <span class="obs-badge">SOME NA IMPRESSÃO SE VAZIO</span>
      </div>
      <textarea class="obs-textarea" id="obsText"
        placeholder="Ex: Fevereiro teve recesso de carnaval, impactando o volume de entradas…"
        oninput="document.getElementById('obsPrint').textContent = this.value"></textarea>
      <div class="obs-print" id="obsPrint"></div>
    </div>
  `;

  renderDonutFaixas(faixaOrdem, faixaVals, faixaCores, totalFaixas);
}

// ── Filtros dependentes (aba Abertos) ────────────────────────────────────────
function updateFilterOptions() {
  const filtDe  = document.getElementById('filtDe').value;
  const filtAte = document.getElementById('filtAte').value;
  const catEl   = document.getElementById('filtCat');
  const regEl   = document.getElementById('filtReg');
  const curCat  = catEl.value;
  const curReg  = regEl.value;

  let base = allRows.filter(r => r['Situação'] !== 'OK');
  if (filtDe) {
    const de = new Date(filtDe + 'T00:00:00');
    base = base.filter(r => { const d = parseDate(r['Data Saída']); return d && d >= de; });
  }
  if (filtAte) {
    const ate = new Date(filtAte + 'T23:59:59');
    base = base.filter(r => { const d = parseDate(r['Data Saída']); return d && d <= ate; });
  }

  const baseC = curReg ? base.filter(r => (r['Região'] || '').trim() === curReg) : base;
  const availCats = [...new Set(baseC.map(r => (r['Categoria'] || '').trim()).filter(Boolean))].sort();
  catEl.innerHTML = '<option value="">Todas</option>';
  availCats.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    if (c === curCat) o.selected = true;
    catEl.appendChild(o);
  });
  if (curCat && !availCats.includes(curCat)) catEl.value = '';

  const baseR = curCat ? base.filter(r => (r['Categoria'] || '').trim() === curCat) : base;
  const availRegs = [...new Set(baseR.map(r => (r['Região'] || '').trim()).filter(Boolean))].sort();
  regEl.innerHTML = '<option value="">Todas</option>';
  availRegs.forEach(r => {
    const o = document.createElement('option'); o.value = r; o.textContent = r;
    if (r === curReg) o.selected = true;
    regEl.appendChild(o);
  });
  if (curReg && !availRegs.includes(curReg)) regEl.value = '';
}

// ── Lista de Serviços em Aberto ───────────────────────────────────────────────
function renderListaAbertos() {
  updateFilterOptions();
  const container = document.getElementById('lista-abertos');

  const filtDe  = document.getElementById('filtDe').value;
  const filtAte = document.getElementById('filtAte').value;
  const filtCat = document.getElementById('filtCat').value;
  const filtReg = document.getElementById('filtReg').value;

  let rows = allRows.filter(r => r['Situação'] !== 'OK');
  if (filtDe) {
    const de = new Date(filtDe + 'T00:00:00');
    rows = rows.filter(r => { const d = parseDate(r['Data Saída']); return d && d >= de; });
  }
  if (filtAte) {
    const ate = new Date(filtAte + 'T23:59:59');
    rows = rows.filter(r => { const d = parseDate(r['Data Saída']); return d && d <= ate; });
  }
  if (filtCat) rows = rows.filter(r => (r['Categoria'] || '').trim() === filtCat);
  if (filtReg) rows = rows.filter(r => (r['Região'] || '').trim() === filtReg);

  rows.sort((a, b) => {
    const da = parseDate(a['Data Saída']), db = parseDate(b['Data Saída']);
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
    return da - db;
  });

  if (rows.length === 0) {
    container.innerHTML = '<div class="la-empty">Nenhum serviço em aberto com os filtros selecionados.</div>';
    return;
  }

  const groups = {}, groupOrder = [];
  rows.forEach(r => {
    const reg = (r['Região'] || '').trim() || '(sem região)';
    if (!groups[reg]) { groups[reg] = []; groupOrder.push(reg); }
    groups[reg].push(r);
  });

  const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  let html = `
    <div class="la-header">
      <div>
        <div class="rel-title">Serviços em Aberto</div>
        <div class="rel-subtitle">Departamento de Iluminação Pública · Seconser Niterói</div>
      </div>
      <div class="rel-meta">
        Gerado em ${dataGeracao}<br>
        ${fmt(rows.length)} serviço(s) em aberto<br>
        Ordenado por Data Saída · mais antigos primeiro
      </div>
    </div>`;

  groupOrder.forEach(reg => {
    const regRows = groups[reg];
    html += `
    <div class="la-group">
      <div class="la-group-title">${reg} <span class="la-group-count">${regRows.length} serviço(s)</span></div>
      <table class="la-table">
        <thead><tr><th>ID</th><th>Categoria</th><th>Bairro</th><th>Data Saída</th><th>Data Retorno</th><th>Situação</th></tr></thead>
        <tbody>
          ${regRows.map(r => {
            const cor = r['Situação'] === 'Em Atraso' ? 'var(--red)' : 'var(--amber)';
            return `<tr>
              <td class="la-id">${r['ID Colab'] || '—'}</td>
              <td>${r['Categoria'] || '—'}</td>
              <td>${r['Bairro'] || '—'}</td>
              <td>${fmtDate(r['Data Saída'])}</td>
              <td style="border-bottom:1px solid var(--text3);min-width:110px"></td>
              <td><span class="la-badge" style="background:${cor}">${r['Situação']}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  });

  container.innerHTML = html;
}

// ── Donut de faixas ───────────────────────────────────────────────────────────
function renderDonutFaixas(faixaOrdem, faixaVals, faixaCores, totalFaixas) {
  const ctx = document.getElementById('cFaixas');
  if (!ctx) return;
  charts['cFaixas'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: faixaOrdem,
      datasets: [{
        data: faixaVals,
        backgroundColor: faixaCores,
        borderWidth: 2,
        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#242422' : '#ffffff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct(ctx.parsed, totalFaixas)})`,
          },
        },
      },
    },
  });

  const leg = document.getElementById('cFaixasLegend');
  if (leg) {
    leg.innerHTML = faixaOrdem.map((lbl, i) => `
    <div style="display:flex;align-items:center;gap:6px">
      <span style="width:9px;height:9px;border-radius:2px;background:${faixaCores[i]};flex-shrink:0"></span>
      <span style="flex:1;font-size:11px;color:var(--text2)">${lbl}</span>
      <span style="font-size:11px;color:var(--text3);margin-right:4px">${fmt(faixaVals[i])}</span>
      <span style="font-size:12px;font-weight:600;color:var(--text);width:36px;text-align:right">${pct(faixaVals[i], totalFaixas)}</span>
    </div>`).join('');
  }
}

// ── Date Picker customizado ───────────────────────────────────────────────────
const MESES_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const dpState = {
  de:  { y: new Date().getFullYear(), m: new Date().getMonth(), sel: null, mode: 'days' },
  ate: { y: new Date().getFullYear(), m: new Date().getMonth(), sel: null, mode: 'days' },
};

function openDp(which, e) {
  e.stopPropagation();
  const panel = document.getElementById('dp-' + which);
  const isOpen = panel.classList.contains('dp-open');
  closeDps();
  if (!isOpen) {
    const s = dpState[which];
    s.mode = 'days';
    if (s.sel) { s.y = s.sel.getFullYear(); s.m = s.sel.getMonth(); }
    renderDp(which);
    panel.classList.add('dp-open');
  }
}

function closeDps() {
  document.querySelectorAll('.dp-dropdown').forEach(d => d.classList.remove('dp-open'));
}

function getDpBounds(which) {
  const hid = document.getElementById(which === 'de' ? 'filtDe' : 'filtAte');
  return {
    min: hid.min ? new Date(hid.min + 'T00:00:00') : null,
    max: hid.max ? new Date(hid.max + 'T00:00:00') : null,
  };
}

function renderDp(which) {
  dpState[which].mode === 'months' ? renderDpMonths(which) : renderDpDays(which);
}

function renderDpDays(which) {
  const panel = document.getElementById('dp-' + which);
  const st    = dpState[which];
  const { min, max } = getDpBounds(which);
  const today = new Date(); today.setHours(0,0,0,0);
  const first = new Date(st.y, st.m, 1).getDay();
  const days  = new Date(st.y, st.m + 1, 0).getDate();

  let grid = '<div class="dp-grid">';
  ['D','S','T','Q','Q','S','S'].forEach(w => grid += `<span class="dp-wd">${w}</span>`);
  for (let i = 0; i < first; i++) grid += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const dt  = new Date(st.y, st.m, d);
    const sel = st.sel && dt.getTime() === st.sel.getTime();
    const tod = dt.getTime() === today.getTime();
    const dis = (min && dt < min) || (max && dt > max);
    const cls = ['dp-day', sel ? 'dp-sel' : '', tod && !sel ? 'dp-today' : '', dis ? 'dp-dis' : ''].filter(Boolean).join(' ');
    grid += `<span class="${cls}" onclick="pickDay('${which}','${toInputDate(dt)}',event)">${d}</span>`;
  }
  grid += '</div>';

  panel.innerHTML = `
    <div class="dp-nav">
      <button class="dp-nav-btn" onclick="navDp('${which}',-1,event)">&#8249;</button>
      <button class="dp-label-btn" onclick="toggleDpMode('${which}',event)">${MESES_PT[st.m]} ${st.y} ▾</button>
      <button class="dp-nav-btn" onclick="navDp('${which}',1,event)">&#8250;</button>
    </div>
    ${grid}
    <div class="dp-footer">
      <button class="dp-footer-btn" onclick="clearDp('${which}',event)">Limpar data</button>
      <button class="dp-footer-btn dp-today-btn" onclick="pickToday('${which}',event)">Hoje</button>
    </div>`;
}

function renderDpMonths(which) {
  const panel = document.getElementById('dp-' + which);
  const st    = dpState[which];
  const { min, max } = getDpBounds(which);

  let grid = '<div class="dp-month-grid">';
  MESES_ABR.forEach((lbl, i) => {
    const first = new Date(st.y, i, 1);
    const last  = new Date(st.y, i + 1, 0);
    const dis   = (max && first > max) || (min && last < min);
    const sel   = st.sel && st.sel.getFullYear() === st.y && st.sel.getMonth() === i;
    const cls   = ['dp-mth', sel ? 'dp-sel' : '', dis ? 'dp-dis' : ''].filter(Boolean).join(' ');
    grid += `<span class="${cls}" onclick="selectDpMonth('${which}',${i},event)">${lbl}</span>`;
  });
  grid += '</div>';

  panel.innerHTML = `
    <div class="dp-nav">
      <button class="dp-nav-btn" onclick="navDpYear('${which}',-1,event)">&#8249;</button>
      <span class="dp-month-label">${st.y}</span>
      <button class="dp-nav-btn" onclick="navDpYear('${which}',1,event)">&#8250;</button>
    </div>
    ${grid}`;
}

function toggleDpMode(which, e) {
  if (e) e.stopPropagation();
  dpState[which].mode = dpState[which].mode === 'months' ? 'days' : 'months';
  renderDp(which);
}
function selectDpMonth(which, m, e) {
  if (e) e.stopPropagation();
  dpState[which].m    = m;
  dpState[which].mode = 'days';
  renderDp(which);
}
function navDp(which, dir, e) {
  if (e) e.stopPropagation();
  const st = dpState[which];
  st.m += dir;
  if (st.m > 11) { st.m = 0; st.y++; }
  if (st.m <  0) { st.m = 11; st.y--; }
  renderDp(which);
}
function navDpYear(which, dir, e) {
  if (e) e.stopPropagation();
  dpState[which].y += dir;
  renderDp(which);
}
function pickDay(which, ds, e) {
  if (e) e.stopPropagation();
  const [y, m, d] = ds.split('-').map(Number);
  dpState[which].sel = new Date(y, m - 1, d);
  document.getElementById(which === 'de' ? 'filtDe' : 'filtAte').value = ds;
  setDpLabel(which, ds);
  closeDps();
  onDpChange(which, ds);
}
function pickToday(which, e) {
  if (e) e.stopPropagation();
  const t = new Date(); t.setHours(0,0,0,0);
  const { min, max } = getDpBounds(which);
  if ((min && t < min) || (max && t > max)) return;
  pickDay(which, toInputDate(t));
}
function clearDp(which, e) {
  if (e) e.stopPropagation();
  dpState[which].sel = null;
  document.getElementById(which === 'de' ? 'filtDe' : 'filtAte').value = '';
  setDpLabel(which, '');
  closeDps();
  onDpChange(which, '');
}
function setDpLabel(which, ds) {
  const el = document.getElementById('dp-' + which + '-lbl');
  if (ds) {
    el.textContent = fmtDate(ds.split('-').reverse().join('/'));
    el.classList.remove('dp-placeholder');
  } else {
    el.textContent = 'Selecione';
    el.classList.add('dp-placeholder');
  }
}
function onDpChange(which, ds) {
  const deEl  = document.getElementById('filtDe');
  const ateEl = document.getElementById('filtAte');
  if (which === 'de')  ateEl.min = ds || deEl.min;
  else                 deEl.max  = ds || ateEl.max;
  renderListaAbertos();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.datepicker')) closeDps();
});

function clearFilters() {
  const deEl  = document.getElementById('filtDe');
  const ateEl = document.getElementById('filtAte');
  dpState.de.sel  = null; deEl.value  = ''; setDpLabel('de', '');
  dpState.ate.sel = null; ateEl.value = ''; setDpLabel('ate', '');
  deEl.max  = ateEl.max;
  ateEl.min = deEl.min;
  document.getElementById('filtCat').value = '';
  document.getElementById('filtReg').value = '';
  renderListaAbertos();
}

// ── Print ────────────────────────────────────────────────────────────────────
window.addEventListener('beforeprint', () => {
  const obs = document.getElementById('obsText');
  const sec = document.querySelector('.obs-section');
  if (sec) sec.classList.toggle('obs-vazia', !obs || !obs.value.trim());
  let ps = document.getElementById('__printPage');
  if (!ps) { ps = document.createElement('style'); ps.id = '__printPage'; document.head.appendChild(ps); }
  ps.textContent = activeTab === 'abertos' ? '@page { margin: 0.8cm 1cm; }' : '@page { margin: 0; }';
});
window.addEventListener('afterprint', () => {
  const sec = document.querySelector('.obs-section');
  if (sec) sec.classList.remove('obs-vazia');
  const ps = document.getElementById('__printPage');
  if (ps) ps.remove();
});

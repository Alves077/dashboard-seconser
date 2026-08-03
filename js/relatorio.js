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
// Linha de variação para os KPIs. inverso = true quando subir é ruim.
function deltaKpi(atual, anterior, lblAnt, unidade, inverso) {
  if (anterior === null || anterior === undefined) return '';
  const dif = atual - anterior;
  if (Math.abs(dif) < 0.05) return `<div class="kpi-delta kpi-delta-flat">estável vs ${lblAnt}</div>`;
  const ruim = inverso ? dif > 0 : dif < 0;
  return `<div class="kpi-delta ${ruim ? 'kpi-delta-bad' : 'kpi-delta-good'}">vs ${fmtDec(anterior)}${unidade} em ${lblAnt}</div>`;
}

// Agrega por coluna devolvendo volume, pendencias e qualidade de execucao
function agrupar(rows, col) {
  const m = {};
  rows.forEach(r => {
    const k = (r[col] || '').trim();
    if (!k) return;
    if (!m[k]) m[k] = { total: 0, atraso: 0, abertos: 0, somaDias: 0, nDias: 0, fora: 0 };
    const o = m[k];
    o.total++;
    if (r['Situação'] === 'OK') {
      const v = parseFloat((r['Dias Execução'] || '').toString().replace(',', '.'));
      if (!isNaN(v) && v >= 0) { o.somaDias += v; o.nDias++; if (v > 5) o.fora++; }
    } else {
      o.abertos++;
      if (r['Situação'] === 'Em Atraso') o.atraso++;
    }
  });
  return Object.entries(m).map(([k, o]) => ({
    k, ...o,
    media: o.nDias ? o.somaDias / o.nDias : null,
    pctFora: o.nDias ? (o.fora / o.nDias) * 100 : null
  }));
}

// Celulas padronizadas das tabelas
function celMedia(v) {
  if (v === null) return '<td style="color:var(--text3)">—</td>';
  const cor = v > 15 ? 'var(--red)' : v > 5 ? 'var(--amber)' : 'var(--text)';
  return `<td style="color:${cor};font-weight:${v > 15 ? '600' : '400'}">${fmtDec(v)}d</td>`;
}
function celPct(v) {
  if (v === null) return '<td style="color:var(--text3)">—</td>';
  const cor = v >= 70 ? 'var(--red)' : v >= 40 ? 'var(--amber)' : 'var(--text)';
  return `<td style="color:${cor};font-weight:${v >= 70 ? '600' : '400'}">${fmtDec(v)}%</td>`;
}
function celAtraso(n) {
  return `<td style="color:${n > 0 ? 'var(--red)' : 'var(--text3)'}">${n > 0 ? fmt(n) : '—'}</td>`;
}

function celAberto(o) {
  return o.abertos ? `<td>${fmt(o.abertos)}</td>` : '<td style="color:var(--text3)">—</td>';
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
  sel.innerHTML = '<option value="">Selecione o mês…</option><option value="todos">Histórico completo</option>';
  meses.forEach(([k, lbl]) => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = lbl;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    if (sel.value === 'todos') renderRelatorio(null, mesesMap);
    else if (sel.value) renderRelatorio(+sel.value, mesesMap);
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

  const todos = mesK === null;
  const lbl = todos ? 'Histórico Completo' : mesesMap[mesK];

  const rowsMes = todos
    ? allRows
    : allRows.filter(r => {
        const ano = Math.floor(mesK / 100);
        const mes = mesK % 100;
        const d = parseDate(r['Data Saída']);
        return d && !isNaN(d) && d.getFullYear() === ano && d.getMonth() === mes;
      });

  // ── Cálculos exclusivos do modo "Todo o Período" ──────────────────────────
  let faixasIdade = [], serieMensal = [], ultimos3 = [], maisAntigos = [];
  if (todos) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    // Fila em aberto por tempo de espera
    const abertosRows = allRows.filter(r => r['Situação'] !== 'OK');
    const buckets = [
      { lbl: 'Até 5 dias', nota: 'dentro do prazo', max: 5,    cor: '#639922', n: 0 },
      { lbl: '6 a 15 dias',  nota: '',              max: 15,   cor: '#C9A227', n: 0 },
      { lbl: '16 a 30 dias', nota: '',              max: 30,   cor: '#BA7517', n: 0 },
      { lbl: '31 a 90 dias', nota: '',              max: 90,   cor: '#E24B4A', n: 0 },
      { lbl: 'Mais de 90 dias', nota: '',           max: 1e9,  cor: '#8C1D1B', n: 0 },
    ];
    let acima150 = 0;
    abertosRows.forEach(r => {
      const d = parseDate(r['Data Saída']);
      if (!d || isNaN(d)) return;
      const dias = Math.floor((hoje - d) / 86400000);
      if (dias > 150) acima150++;
      (buckets.find(b => dias <= b.max) || buckets[buckets.length - 1]).n++;
    });
    faixasIdade = { buckets, total: abertosRows.length, acima150 };

    // Série mensal: média de execução e % fora do prazo por mês de registro
    const mm = {};
    allRows.forEach(r => {
      const d = parseDate(r['Data Saída']);
      if (!d || isNaN(d)) return;
      const k = mesKey(d);
      if (!mm[k]) mm[k] = { k, lbl: mesLabel(d), reg: 0, exec: 0, abertos: 0, soma: 0, n: 0, fora: 0 };
      const o = mm[k];
      o.reg++;
      if (r['Situação'] === 'OK') {
        o.exec++;
        const v = parseFloat((r['Dias Execução'] || '').toString().replace(',', '.'));
        if (!isNaN(v) && v >= 0) { o.soma += v; o.n++; if (v > 5) o.fora++; }
      } else o.abertos++;
    });
    serieMensal = Object.values(mm).sort((a, b) => a.k - b.k).map(o => ({
      ...o,
      media: o.n ? o.soma / o.n : null,
      pctFora: o.n ? (o.fora / o.n) * 100 : null,
    }));

    // Últimos 3 meses + saldo de fila de cada um
    ultimos3 = serieMensal.slice(-3).map(m => {
      const ano = Math.floor(m.k / 100), mes = m.k % 100;
      const ini = new Date(ano, mes, 1);
      const fim = new Date(ano, mes + 1, 0); fim.setHours(23, 59, 59, 999);
      let execNoMes = 0, filaFimMes = 0;
      allRows.forEach(r => {
        const ret = parseDate(r['Data Retorno']);
        if (ret && !isNaN(ret) && ret >= ini && ret <= fim) execNoMes++;
        const saida = parseDate(r['Data Saída']);
        if (saida && !isNaN(saida) && saida <= fim && (!ret || isNaN(ret) || ret > fim)) filaFimMes++;
      });
      return { ...m, saldo: m.reg - execNoMes, filaFim: filaFimMes };
    });

    // Serviços mais antigos ainda em aberto
    maisAntigos = abertosRows
      .map(r => {
        const d = parseDate(r['Data Saída']);
        return (!d || isNaN(d)) ? null : { r, d, dias: Math.floor((hoje - d) / 86400000) };
      })
      .filter(Boolean)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 8);
  }

  let lblAnterior = null;
  let mesAnteriorK = null;
  let saldoAnterior = 0;
  let executadosNoMes = 0;   // concluídos DENTRO do mês, de qualquer data de registro
  let execDoMes = 0;         // destes, os que também foram registrados no mês
  if (!todos) {
    const ano = Math.floor(mesK / 100);
    const mes = mesK % 100;
    mesAnteriorK = mes === 0 ? (ano - 1) * 100 + 11 : ano * 100 + (mes - 1);
    lblAnterior = mesesMap[mesAnteriorK] || null;
    const ultimoDiaMesAnterior = new Date(ano, mes, 0);
    ultimoDiaMesAnterior.setHours(23, 59, 59, 999);
    saldoAnterior = allRows.filter(r => {
      const saida = parseDate(r['Data Saída']);
      if (!saida || isNaN(saida) || saida > ultimoDiaMesAnterior) return false;
      const retorno = parseDate(r['Data Retorno']);
      return !retorno || isNaN(retorno) || retorno > ultimoDiaMesAnterior;
    }).length;

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    ultimoDia.setHours(23, 59, 59, 999);
    allRows.forEach(r => {
      const ret = parseDate(r['Data Retorno']);
      if (!ret || isNaN(ret) || ret < primeiroDia || ret > ultimoDia) return;
      executadosNoMes++;
      const saida = parseDate(r['Data Saída']);
      if (saida && !isNaN(saida) && saida >= primeiroDia && saida <= ultimoDia) execDoMes++;
    });
  }

  const total = rowsMes.length;
  const concluidos = rowsMes.filter(r => r['Situação'] === 'OK').length;
  const abertos = rowsMes.filter(r => r['Situação'] !== 'OK').length;
  const filaFim = saldoAnterior + total - executadosNoMes;

  const okRows = rowsMes.filter(r => r['Situação'] === 'OK');
  const diasVals = okRows.map(r =>
    parseFloat((r['Dias Execução'] || '').toString().replace(',', '.'))
  ).filter(v => !isNaN(v) && v >= 0);

  const noPrazo = diasVals.filter(v => v <= 5).length;
  const media = diasVals.length ? diasVals.reduce((a, b) => a + b, 0) / diasVals.length : 0;

  // Comparativo com o mês anterior (mesma lógica de rowsMes + media/noPrazo)
  let mediaAnt = null, noPrazoPctAnt = null;
  if (!todos && lblAnterior) {
    const anoA = Math.floor(mesAnteriorK / 100);
    const mesA = mesAnteriorK % 100;
    const diasAnt = allRows
      .filter(r => {
        if (r['Situação'] !== 'OK') return false;
        const d = parseDate(r['Data Saída']);
        return d && !isNaN(d) && d.getFullYear() === anoA && d.getMonth() === mesA;
      })
      .map(r => parseFloat((r['Dias Execução'] || '').toString().replace(',', '.')))
      .filter(v => !isNaN(v) && v >= 0);
    if (diasAnt.length) {
      mediaAnt = diasAnt.reduce((a, b) => a + b, 0) / diasAnt.length;
      noPrazoPctAnt = (diasAnt.filter(v => v <= 5).length / diasAnt.length) * 100;
    }
  }
  
  const seen = new Map();
  rowsMes.forEach(r => {
    const id = r['ID Colab'];
    const occ = parseInt(r['Ocorrências'] || 1);
    if (!seen.has(id)) seen.set(id, occ);
  });
  let reabIds = 0, reabTotal = 0;
  seen.forEach(occ => { if (occ > 1) { reabIds++; reabTotal += occ - 1; } });

  // Categorias: mostra as 8 maiores e agrupa a cauda para não estourar a altura
  const catsAll = agrupar(rowsMes, 'Categoria').sort((a, b) => b.total - a.total || a.k.localeCompare(b.k));
  const cats = todos ? catsAll.slice(0, 8) : catsAll;
  const catsCauda = todos ? catsAll.slice(8) : [];
  const cauda = catsCauda.length ? {
    n: catsCauda.length,
    total: catsCauda.reduce((s, c) => s + c.total, 0),
    atraso: catsCauda.reduce((s, c) => s + c.atraso, 0),
  } : null;
  const regs = agrupar(rowsMes, 'Região').sort((a, b) => b.total - a.total);

  // Bairros em dois recortes: volume de pedidos e backlog (proporção parada, não a contagem bruta —
  // senão bairros de alto volume aparecem no topo só por terem mais gente esperando em números absolutos)
  const MIN_BACKLOG = todos ? 50 : 15;
  const bairrosAll = agrupar(rowsMes, 'Bairro');
  const bairrosVol = [...bairrosAll].sort((a, b) => b.total - a.total).slice(0, 8);
  const bairrosBacklog = bairrosAll
    .filter(b => b.total >= MIN_BACKLOG)
    .sort((a, b) => (b.abertos / b.total) - (a.abertos / a.total))
    .slice(0, 8);

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
        <div class="rel-title">${todos ? 'Visão Geral · Todo o Período' : 'Relatório Mensal · ' + lbl}</div>
        <div class="rel-subtitle">Departamento de Iluminação Pública · Seconser Niterói</div>
      </div>
      <div class="rel-meta">
        Gerado em ${dataGeracao}<br>
        ${fmt(total)} serviços ${todos ? 'no período' : 'registrados no mês'}<br>
        Dados: Google Sheets via Apps Script
      </div>
    </div>

    ${todos && serieMensal.length ? `
    <div class="context-box">
      Indicadores acumulados de <strong>${fmt(serieMensal.length)} meses</strong>.
      ${(() => {
        const agora = new Date();
        const kAtual = agora.getFullYear() * 100 + agora.getMonth();
        const f = [...serieMensal].reverse().find(m => m.k < kAtual && m.media !== null);
        return f ? `No último mês fechado (<strong>${f.lbl}</strong>): tempo médio
          <strong>${fmtDec(f.media)}d</strong> e <strong>${fmtDec(f.pctFora)}%</strong> fora do prazo.` : '';
      })()}
    </div>` : ''}

    <div class="rel-section">
      <div class="rel-section-title">${todos ? 'Indicadores gerais' : 'Indicadores do mês'}</div>
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Entradas</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--blue)"></span><span class="kpi-value">${fmt(total)}</span></div>
          <div class="kpi-sub">serviços registrados</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Concluídos</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--green)"></span><span class="kpi-value">${fmt(concluidos)}</span></div>
          <div class="kpi-sub">${pct(concluidos, total)} ${todos ? 'do total' : '· até hoje'}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">No Prazo</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--blue)"></span><span class="kpi-value">${pct(noPrazo, concluidos || 1)}</span></div>
          <div class="kpi-sub">${fmt(noPrazo)} de ${fmt(concluidos)}</div>
          ${deltaKpi(concluidos ? (noPrazo / concluidos) * 100 : 0, noPrazoPctAnt, lblAnterior, '%', false)}
        </div>
        <div class="kpi">
          <div class="kpi-label">Tempo Médio</div>
          <div style="display:flex;align-items:center"><span class="kpi-accent" style="background:var(--gray)"></span><span class="kpi-value">${fmtDec(media)}<span style="font-size:14px;font-weight:400;color:var(--text2)"> d</span></span></div>
          <div class="kpi-sub">dos concluídos</div>
          ${deltaKpi(media, mediaAnt, lblAnterior, 'd', true)}
        </div>
        <div class="kpi">
          <div class="kpi-label">Abertos</div>
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
    ${todos && faixasIdade.total ? `
    <div class="rel-section">
      <div class="rel-section-title">Composição da fila em aberto</div>
      <div class="card">
        <div class="card-head">
          <div class="card-title">${fmt(faixasIdade.total)} serviços pendentes, por tempo de espera</div>
          <div class="card-aside">${fmt(faixasIdade.total - faixasIdade.buckets[0].n)} de ${fmt(faixasIdade.total)}
            (${pct(faixasIdade.total - faixasIdade.buckets[0].n, faixasIdade.total)}) já passaram do prazo</div>
        </div>
        <div class="faixa-bar">
          ${faixasIdade.buckets.filter(b => b.n).map(b => {
            const p = (b.n / faixasIdade.total) * 100;
            return `<span class="faixa-seg" style="width:${p}%;background:${b.cor}"
              title="${b.lbl}: ${fmt(b.n)}">${p >= 7 ? fmtDec(p) + '%' : ''}</span>`;
          }).join('')}
        </div>
        <div class="faixa-legend">
          ${faixasIdade.buckets.map((b, i) => `
          <span class="faixa-item">
            <span class="faixa-dot" style="background:${b.cor}"></span>
            <span class="faixa-lbl">${b.lbl}</span>
            <span class="faixa-pc">${fmt(b.n)}</span>
            ${b.nota ? `<span class="faixa-n">· ${b.nota}</span>` : ''}
            ${i === 4 && faixasIdade.acima150 ? `<span class="faixa-n">· ${fmt(faixasIdade.acima150)} acima de 150 dias</span>` : ''}
          </span>`).join('')}
        </div>
      </div>
    </div>` : ''}

    ${todos && ultimos3.length ? `
    <div class="rel-section">
      <div class="rel-section-title">Últimos meses</div>
      <div class="card">
        <table class="reg-table">
          <thead><tr><th>Mês</th><th>Registrados</th><th>Executados</th><th>Abertos</th><th>Tempo Médio</th><th>Fora do Prazo</th><th>Fila no Fim</th></tr></thead>
          <tbody>${ultimos3.map(m => `
            <tr>
              <td>${m.lbl}</td>
              <td>${fmt(m.reg)}</td><td>${fmt(m.exec)}</td><td>${fmt(m.abertos)}</td>
              ${celMedia(m.media)}${celPct(m.pctFora)}
              <td style="color:${m.saldo > 0 ? 'var(--red)' : 'var(--green)'};font-weight:600">${fmt(m.filaFim)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="card-note">
          Fila no fim do mês conta todos os serviços pendentes naquela data, de qualquer mês de registro; ao lado, a variação no período.
        </div>
      </div>
    </div>` : ''}

    ${!todos ? `
    <div class="rel-section">
      <div class="rel-section-title">Movimento da fila</div>
      <div class="bal">
        <div class="bal-cell">
          <div class="bal-k">Fila em 01/${lbl.split('/')[0]}</div>
          <div class="bal-v">${fmt(saldoAnterior)}</div>
          <div class="bal-n">pendentes de meses anteriores</div>
        </div>
        <div class="bal-op">+</div>
        <div class="bal-cell">
          <div class="bal-k">Registrados em ${lbl.split('/')[0]}</div>
          <div class="bal-v" style="color:var(--blue)">${fmt(total)}</div>
          <div class="bal-n">novos serviços no mês</div>
        </div>
        <div class="bal-op">−</div>
        <div class="bal-cell">
          <div class="bal-k">Executados em ${lbl.split('/')[0]}</div>
          <div class="bal-v" style="color:var(--green)">${fmt(executadosNoMes)}</div>
          <div class="bal-n">concluídos no mês</div>
        </div>
        <div class="bal-op">=</div>
        <div class="bal-cell bal-end">
          <div class="bal-k">Fila em ${new Date(Math.floor(mesK/100), mesK%100+1, 0).getDate()}/${lbl.split('/')[0]}</div>
          <div class="bal-v" style="color:${filaFim > saldoAnterior ? 'var(--red)' : 'var(--green)'}">${fmt(filaFim)}</div>
          <div class="bal-n">pendentes ao fim do mês</div>
        </div>
      </div>
      <div class="bal-note">
        Dos ${fmt(executadosNoMes)} executados, ${fmt(execDoMes)} foram registrados em ${lbl}
        e ${fmt(executadosNoMes - execDoMes)} em meses anteriores.
      </div>
    </div>` : ''}

    <div class="rel-section">
      <div class="card">
        <div class="card-title">Distribuição por faixa · só concluídos</div>
        <div class="faixa-bar" id="cFaixasBar"></div>
        <div class="faixa-legend" id="cFaixasLegend"></div>
      </div>
    </div>

    <div class="rel-section">
      <div class="rel-section-title">Distribuição</div>
      <div class="g2">
        <div class="card">
          <div class="card-title">Por categoria</div>
          <table class="reg-table">
            <thead><tr><th>Categoria</th><th>Total</th><th>%</th><th>Abertos</th><th>Tempo Médio</th></tr></thead>
            <tbody>${cats.map(c => `
              <tr>
                <td>${c.k}</td><td>${fmt(c.total)}</td><td>${pct(c.total, total)}</td>
                ${celAberto(c)}${celMedia(c.media)}
              </tr>`).join('')}
              ${cauda ? `<tr class="row-cauda">
                <td>Demais (${cauda.n} categorias)</td><td>${fmt(cauda.total)}</td><td>${pct(cauda.total, total)}</td>
                ${celAtraso(cauda.atraso)}<td style="color:var(--text3)">—</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-title">Por região</div>
          <table class="reg-table">
            <thead><tr><th>Região</th><th>Total</th><th>%</th><th>Abertos</th><th>Tempo Médio</th><th>Fora do Prazo</th></tr></thead>
            <tbody>${regs.map(r => `
              <tr>
                <td>${r.k}</td><td>${fmt(r.total)}</td><td>${pct(r.total, total)}</td>
                ${celAberto(r)}${celMedia(r.media)}${celPct(r.pctFora)}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="rel-section">
      <div class="rel-section-title">Bairros</div>
      <div class="g2">
        <div class="card">
          <div class="card-title">Maior volume de pedidos</div>
          <table class="reg-table">
            <thead><tr><th>Bairro</th><th>Total</th><th>Abertos</th><th>Tempo Médio</th><th>Fora do Prazo</th></tr></thead>
            <tbody>${bairrosVol.map(b => `
              <tr>
                <td>${b.k}</td><td>${fmt(b.total)}</td>${celAberto(b)}
                ${celMedia(b.media)}${celPct(b.pctFora)}
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="card-note">Tempo médio considera apenas os serviços já concluídos.</div>
        </div>
        <div class="card">
          <div class="card-title">Maior backlog</div>
          ${bairrosBacklog.length ? `
          <table class="reg-table">
            <thead><tr><th>Bairro</th><th>Total</th><th>Abertos</th><th>Tempo Médio</th><th>Fora do Prazo</th></tr></thead>
            <tbody>${bairrosBacklog.map(b => `
              <tr>
                <td>${b.k}</td><td>${fmt(b.total)}</td>${celAberto(b)}
                ${celMedia(b.media)}${celPct(b.pctFora)}
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="card-note">Bairros com ${MIN_BACKLOG} ou mais serviços no período, ordenados pela proporção ainda pendente. Tempo médio considera apenas os já concluídos — bairros com muito pendente podem ter tempo real maior do que o exibido.</div>` : `
          <div class="card-note">Nenhum bairro atingiu ${MIN_BACKLOG} serviços no período.</div>`}
        </div>
      </div>
    </div>

    ${todos && serieMensal.length > 1 ? `
    <div class="rel-section">
      <div class="rel-section-title">Evolução mensal</div>
      <div class="card">
        <div class="card-title">Tempo médio de execução e percentual fora do prazo</div>
        <div style="position:relative;height:230px"><canvas id="cEvolucao"></canvas></div>
        <div class="card-note">Serviços agrupados pelo mês de registro. Prazo de atendimento: 5 dias corridos.</div>
      </div>
    </div>` : ''}

    ${todos && maisAntigos.length ? `
    <div class="rel-section">
      <div class="rel-section-title">Serviços mais antigos ainda em aberto</div>
      <div class="card">
        <table class="reg-table reg-table-center">
          <thead><tr><th>Serviço</th><th>Categoria</th><th>Bairro</th><th>Região</th><th>Registrado em</th><th>Dias em Aberto</th></tr></thead>
          <tbody>${maisAntigos.map(o => `
            <tr>
              <td>${o.r['ID Colab'] || '—'}</td>
              <td>${(o.r['Categoria'] || '—').trim()}</td>
              <td>${(o.r['Bairro'] || '—').trim()}</td>
              <td>${(o.r['Região'] || '—').trim()}</td>
              <td>${fmtDate(o.r['Data Saída'])}</td>
              <td style="color:var(--red);font-weight:600">${fmt(o.dias)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="card-note">Dias em aberto contados até a data de geração do relatório.</div>
      </div>
    </div>` : ''}

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

  renderBarraFaixas(faixaOrdem, faixaVals, faixaCores, totalFaixas);
  if (todos && serieMensal.length > 1) renderEvolucao(serieMensal);
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

// ── Evolução mensal (2 eixos, legível em P&B) ────────────────────────────────
function renderEvolucao(serie) {
  const ctx = document.getElementById('cEvolucao');
  if (!ctx) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const eixo = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const grade = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const linha = dark ? '#E8E6E1' : '#2B2F33';

  charts['cEvolucao'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: serie.map(m => m.lbl),
      datasets: [
        {
          label: 'Tempo médio (dias)',
          data: serie.map(m => m.media),
          yAxisID: 'y',
          borderColor: linha,
          backgroundColor: linha,
          borderWidth: 2.4,
          pointStyle: 'circle',
          pointRadius: 3,
          tension: 0.25,
        },
        {
          label: 'Fora do prazo (%)',
          data: serie.map(m => m.pctFora),
          yAxisID: 'y1',
          borderColor: '#8A8F95',
          backgroundColor: '#fff',
          borderWidth: 1.8,
          borderDash: [5, 3],
          pointStyle: 'rect',
          pointRadius: 3.5,
          pointBorderWidth: 1.6,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: { usePointStyle: true, pointStyleWidth: 14, boxWidth: 14, boxHeight: 7, padding: 16, font: { size: 11 }, color: eixo },
        },
        tooltip: {
          callbacks: {
            label: (c) => c.datasetIndex === 0
              ? ` Tempo médio: ${fmtDec(c.parsed.y)}d`
              : ` Fora do prazo: ${fmtDec(c.parsed.y)}%`,
          },
        },
      },
      scales: {
        x: { ticks: { color: eixo, font: { size: 10 } }, grid: { display: false } },
        y: {
          position: 'left', beginAtZero: true,
          ticks: { color: eixo, font: { size: 10 }, callback: (v) => v + 'd' },
          grid: { color: grade },
        },
        y1: {
          position: 'right', beginAtZero: true, max: 100,
          ticks: { color: eixo, font: { size: 10 }, callback: (v) => v + '%' },
          grid: { display: false },
        },
      },
    },
  });
}

// ── Barra de faixas de execução ──────────────────────────────────────────────
function renderBarraFaixas(faixaOrdem, faixaVals, faixaCores, totalFaixas) {
  const bar = document.getElementById('cFaixasBar');
  const leg = document.getElementById('cFaixasLegend');
  if (!bar || !leg) return;

  if (!totalFaixas) {
    bar.innerHTML = '';
    leg.innerHTML = '<span class="faixa-empty">Sem serviços concluídos no período.</span>';
    return;
  }

  // Segmentos: só entram faixas com valor; rótulo interno some se a fatia for estreita
  bar.innerHTML = faixaOrdem.map((lbl, i) => {
    const v = faixaVals[i];
    if (!v) return '';
    const p = (v / totalFaixas) * 100;
    return `<span class="faixa-seg" style="width:${p}%;background:${faixaCores[i]}"
      title="${lbl}: ${fmt(v)} (${pct(v, totalFaixas)})">${p >= 7 ? pct(v, totalFaixas) : ''}</span>`;
  }).join('');

  leg.innerHTML = faixaOrdem.map((lbl, i) => `
    <span class="faixa-item">
      <span class="faixa-dot" style="background:${faixaCores[i]}"></span>
      <span class="faixa-lbl">${lbl}</span>
      <span class="faixa-n">${fmt(faixaVals[i])}</span>
      <span class="faixa-pc">${pct(faixaVals[i], totalFaixas)}</span>
    </span>`).join('');
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
  ps.textContent = activeTab === 'abertos' ? '@page { margin: 0.8cm 1cm; }' : '@page { margin: 1cm 1cm 1.2cm; }';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    Object.values(charts).forEach(c => c && c.resize());
  }));
});
window.addEventListener('afterprint', () => {
  const sec = document.querySelector('.obs-section');
  if (sec) sec.classList.remove('obs-vazia');
  const ps = document.getElementById('__printPage');
  if (ps) ps.remove();
});
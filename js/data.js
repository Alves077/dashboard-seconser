function fmt(n) { return n.toLocaleString('pt-BR'); }
function pct(a, b) { return b ? (a / b * 100).toFixed(1) + '%' : '—'; }

function parseDate(s) {
  if (!s) return null;
  const p = s.split('/');
  if (p.length === 3) return new Date(+p[2], +p[1] - 1, +p[0]);
  return new Date(s);
}

function mesLabel(d) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[d.getMonth()] + '/' + String(d.getFullYear()).slice(2);
}

function count(rows, col, val) {
  return rows.filter(r => r[col] && r[col].trim() === val).length;
}

function countIf(rows, col, fn) {
  return rows.filter(r => fn(r[col])).length;
}

function groupBy(rows, col) {
  const m = {};
  rows.forEach(r => {
    const k = (r[col] || '').trim();
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function avgBy(rows, col) {
  const m = {}, cnt = {};
  rows.forEach(r => {
    const k = (r[col] || '').trim();
    const v = parseFloat(r['Dias Execução'] || r['Dias ExecuÃ§Ã£o'] || 0);
    if (!isNaN(v)) { m[k] = (m[k] || 0) + v; cnt[k] = (cnt[k] || 0) + 1; }
  });
  return Object.entries(m).map(([k, v]) => [k, v / cnt[k]]).sort((a, b) => b[1] - a[1]);
}

function normalizeHeaders(row) {
  const map = {
    'ID Colab': 'ID Colab',
    'Categoria': 'Categoria',
    'Bairro': 'Bairro',
    'Região': 'Região',
    'RegiÃ£o': 'Região',
    'Data Saída': 'Data Saída',
    'Data SaÃ\xadda': 'Data Saída',
    'Data Retorno': 'Data Retorno',
    'Prazo': 'Prazo',
    'Situação': 'Situação',
    'SituaÃ§Ã£o': 'Situação',
    'Dias Execução': 'Dias Execução',
    'Dias ExecuÃ§Ã£o': 'Dias Execução',
    'Faixa Execução': 'Faixa Execução',
    'Faixa ExecuÃ§Ã£o': 'Faixa Execução',
    'Ocorrências': 'Ocorrências',
    'OcorrÃªncias': 'Ocorrências',
    'Latitude': 'Latitude',
    'Longitude': 'Longitude'
  };
  const out = {};
  Object.keys(row).forEach(k => {
    const clean = map[k.trim()] || k.trim();
    out[clean] = row[k];
  });
  return out;
}

function loadData() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  const errEl = document.getElementById('error-msg');
  if (errEl) errEl.style.display = 'none';

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete(results) {
      allRows = results.data.map(normalizeHeaders);
      if (typeof populateFilters === 'function') populateFilters();
      if (typeof updateSubPeriodo === 'function') updateSubPeriodo();
      if (typeof render === 'function') render(allRows);
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = 'block';
    },
    error(err) {
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = 'Erro ao carregar dados. Verifique se a planilha está publicada publicamente. (' + err.message + ')';
      }
    }
  });
}

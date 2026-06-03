// ─── Fetch + normalização de cabeçalhos ─────────────────────────────────────

const HEADER_MAP = {
  'ID Colab':           'ID Colab',
  'Categoria':          'Categoria',
  'Bairro':             'Bairro',
  'Regi\u00e3o':        'Região',
  'RegiÃ£o':            'Região',
  'Data Sa\u00edda':    'Data Saída',
  'Data SaÃ\xadda':     'Data Saída',
  'Data Retorno':       'Data Retorno',
  'Prazo':              'Prazo',
  'Situa\u00e7\u00e3o': 'Situação',
  'SituaÃ§Ã£o':         'Situação',
  'Dias Execu\u00e7\u00e3o': 'Dias Execução',
  'Dias ExecuÃ§Ã£o':    'Dias Execução',
  'Faixa Execu\u00e7\u00e3o': 'Faixa Execução',
  'Faixa ExecuÃ§Ã£o':   'Faixa Execução',
  'Ocorr\u00eancias':   'Ocorrências',
  'OcorrÃªncias':       'Ocorrências',
  'Latitude':           'Latitude',
  'Longitude':          'Longitude',
};

const CACHE_KEY = 'dip_csv_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos em ms

function normalizeRow(row) {
  const out = {};
  Object.keys(row).forEach(k => {
    const clean = HEADER_MAP[k.trim()] || k.trim();
    out[clean] = row[k];
  });
  return out;
}

function processCSV(csvText) {
  const results = Papa.parse(csvText, {
    header:         true,
    skipEmptyLines: true,
  });
  allRows = results.data.map(normalizeRow);
  if (typeof onDataLoaded === 'function') onDataLoaded();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display     = 'block';
}

function loadData() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('app').style.display     = 'none';
  const errEl = document.getElementById('error-msg');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  // Verifica cache
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, csv } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) {
        processCSV(csv);
        return;
      }
    }
  } catch(e) {}

  // Busca via PapaParse (contorna CORS do Apps Script)
  Papa.parse(CSV_URL, {
    download:       true,
    header:         true,
    skipEmptyLines: true,
    complete(results) {
      const csv = Papa.unparse(results.data);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), csv }));
      } catch(e) {}
      allRows = results.data.map(normalizeRow);
      if (typeof onDataLoaded === 'function') onDataLoaded();
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display     = 'block';
    },
    error(err) {
      document.getElementById('loading').style.display = 'none';
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent   = 'Erro ao carregar dados. (' + err.message + ')';
      }
    },
  });
}
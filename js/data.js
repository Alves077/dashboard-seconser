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

function normalizeRow(row) {
  const out = {};
  Object.keys(row).forEach(k => {
    const clean = HEADER_MAP[k.trim()] || k.trim();
    out[clean] = row[k];
  });
  return out;
}

function loadData() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('app').style.display     = 'none';
  const errEl = document.getElementById('error-msg');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  Papa.parse(CSV_URL, {
    download:       true,
    header:         true,
    skipEmptyLines: true,
    complete(results) {
      allRows = results.data.map(normalizeRow);
      // onDataLoaded definido por cada página — sempre chamado após parse completo
      if (typeof onDataLoaded === 'function') onDataLoaded();
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display     = 'block';
    },
    error(err) {
      document.getElementById('loading').style.display = 'none';
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent   =
          'Erro ao carregar dados. Verifique se a planilha está publicada publicamente. (' +
          err.message + ')';
      }
    },
  });
}

// ─── Fetch + normalização de cabeçalhos ─────────────────────────────────────

const HEADER_MAP = {
  "ID Colab": "ID Colab",
  Categoria: "Categoria",
  Bairro: "Bairro",
  "Regi\u00e3o": "Região",
  "RegiÃ£o": "Região",
  "Data Sa\u00edda": "Data Saída",
  "Data SaÃ\xadda": "Data Saída",
  "Data Retorno": "Data Retorno",
  Prazo: "Prazo",
  "Situa\u00e7\u00e3o": "Situação",
  "SituaÃ§Ã£o": "Situação",
  "Dias Execu\u00e7\u00e3o": "Dias Execução",
  "Dias ExecuÃ§Ã£o": "Dias Execução",
  "Faixa Execu\u00e7\u00e3o": "Faixa Execução",
  "Faixa ExecuÃ§Ã£o": "Faixa Execução",
  "Ocorr\u00eancias": "Ocorrências",
  OcorrÃªncias: "Ocorrências",
  Latitude: "Latitude",
  Longitude: "Longitude",
};

const CACHE_KEY = "dip_csv_v2";

function normalizeRow(row) {
  const out = {};
  Object.keys(row).forEach((k) => {
    const clean = HEADER_MAP[k.trim()] || k.trim();
    out[clean] = row[k];
  });

  // Recalcula Situação dinamicamente — ignora valor estático do Sheets,
  // que pode estar desatualizado em fins de semana/feriados.
  const retorno = (out["Data Retorno"] || "").trim();
  if (retorno) {
    out["Situação"] = "OK";
  } else {
    const prazo = parseDate(out["Prazo"]);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (prazo && !isNaN(prazo) && hoje > prazo) {
      out["Situação"] = "Em Atraso";
    } else {
      out["Situação"] = "Em Atendimento";
    }
  }

  return out;
}

function processCSV(csvText) {
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  allRows = results.data.map(normalizeRow);
  if (typeof onDataLoaded === "function") onDataLoaded();
  document.getElementById("app").classList.remove("sk-loading");
}

function refreshData() {
  // Força busca nova ignorando o cache — usado pelo botão Atualizar
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {}
  loadData();
}

function loadData() {
  const appEl = document.getElementById("app");
  if (appEl) appEl.classList.add("sk-loading");
  document.getElementById("loading").style.display = "none";
  const errEl = document.getElementById("error-msg");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  // Tenta cache — guarda o CSV raw (pequeno) e deixa o PapaParse parsear
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, url, csv } = JSON.parse(raw);
      if (url === CSV_URL && Date.now() - ts < CACHE_TTL_MS && csv) {
        processCSV(csv);
        return;
      }
    }
  } catch (e) {
    /* cache corrompido — busca de novo */
  }

  // Busca via PapaParse (contorna CORS do Apps Script)
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete(results) {
      const csv = Papa.unparse(results.data);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            ts: Date.now(),
            url: CSV_URL,
            csv,
          }),
        );
      } catch (e) {
        /* localStorage cheio — continua sem cache */
      }

      allRows = results.data.map(normalizeRow);
      if (typeof onDataLoaded === "function") onDataLoaded();
      document.getElementById("app").classList.remove("sk-loading");
    },
    error(err) {
      if (appEl) appEl.classList.remove("sk-loading");
      document.getElementById("loading").style.display = "flex";
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = "Erro ao carregar dados. (" + err.message + ")";
      }
    },
  });
}

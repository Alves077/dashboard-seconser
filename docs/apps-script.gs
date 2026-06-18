// ─────────────────────────────────────────────────────────────────────────────
// Backend Google Apps Script — fonte de dados do dashboard DIP / Seconser Niterói
//
// Web App publicado (doGet) que lê a primeira aba da planilha de origem,
// converte para CSV e serve com cache fragmentado (CacheService) para reduzir
// leituras da planilha. O front-end (js/config.js → CSV_URL) consome este endpoint.
//
// Planilha de origem: ID 1ejyJms7546NEmsn7A7VCXwSdr6NUmL6lmuNh2UTSbUA
// Autenticação: query param ?token=seconser2026dip (proteção fraca — já exposta no front)
// ─────────────────────────────────────────────────────────────────────────────

function doGet(e) {
  const TOKEN    = 'seconser2026dip';
  const CACHE_NS = 'dip_csv_';        // prefixo das chaves de chunk
  const CHUNK_SZ = 90000;             // 90KB por chunk — margem segura abaixo do limite de 100KB
  const TTL      = 300;               // 5 minutos em segundos

  if (e.parameter.token !== TOKEN) {
    return ContentService
      .createTextOutput('Acesso negado')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const cache = CacheService.getScriptCache();

  // ── Tenta ler do cache ───────────────────────────────────────────────────
  const meta = cache.get(CACHE_NS + 'meta');
  if (meta) {
    const { chunks } = JSON.parse(meta);
    const parts = cache.getAll(
      Array.from({ length: chunks }, (_, i) => CACHE_NS + i)
    );
    // Verifica se todos os chunks ainda estão presentes
    if (Object.keys(parts).length === chunks) {
      const csv = Array.from({ length: chunks }, (_, i) => parts[CACHE_NS + i]).join('');
      return ContentService
        .createTextOutput(csv)
        .setMimeType(ContentService.MimeType.CSV);
    }
  }

  // ── Cache ausente ou expirado: lê a planilha ────────────────────────────
  const sheet = SpreadsheetApp
    .openById('1ejyJms7546NEmsn7A7VCXwSdr6NUmL6lmuNh2UTSbUA')
    .getSheets()[0];

  const data = sheet.getDataRange().getValues();
  const csv = data.map(row => row.map(cell => {
    const s = String(cell);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  }).join(',')).join('\n');

  // ── Fragmenta e grava no cache ───────────────────────────────────────────
  try {
    const chunks = Math.ceil(csv.length / CHUNK_SZ);
    const entries = {};
    for (let i = 0; i < chunks; i++) {
      entries[CACHE_NS + i] = csv.slice(i * CHUNK_SZ, (i + 1) * CHUNK_SZ);
    }
    entries[CACHE_NS + 'meta'] = JSON.stringify({ chunks, ts: Date.now() });
    cache.putAll(entries, TTL);
  } catch(err) {
    // Falha ao gravar cache — serve o CSV normalmente sem cache
  }

  return ContentService
    .createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}

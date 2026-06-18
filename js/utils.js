// ─── Funções utilitárias puras ───────────────────────────────────────────────

function fmt(n) {
  return Number(n).toLocaleString("pt-BR");
}

function fmtDec(n, casas) {
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: casas ?? 1,
    maximumFractionDigits: casas ?? 1,
  });
}

function pct(a, b) {
  if (!b) return "—";
  return fmtDec((a / b) * 100) + "%";
}

function parseDate(s) {
  if (!s) return null;
  const p = s.split("/");
  if (p.length === 3) return new Date(+p[2], +p[1] - 1, +p[0]);
  return new Date(s);
}

function mesLabel(d) {
  const m = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return m[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
}

function count(rows, col, val) {
  return rows.filter((r) => (r[col] || "").trim() === val).length;
}

function countIf(rows, col, fn) {
  return rows.filter((r) => fn(r[col])).length;
}

// 227 IDs únicos reabertos = demandas distintas que voltaram
// reabTotal = soma de (Ocorrências - 1) por ID único = quantas vezes voltaram
function calcReaberturas(rows) {
  const seen = new Map();
  rows.forEach((r) => {
    const id = r["ID Colab"];
    const occ = parseInt(r["Ocorrências"] || 1);
    if (!seen.has(id)) seen.set(id, occ);
  });
  let reabIds = 0,
    reabTotal = 0;
  seen.forEach((occ) => {
    if (occ > 1) {
      reabIds++;
      reabTotal += occ - 1;
    }
  });
  return { reabIds, reabTotal };
}

function groupBy(rows, col) {
  const m = {};
  rows.forEach((r) => {
    const k = (r[col] || "").trim();
    if (!k) return;
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function avgBy(rows, groupCol, valueCol, minCount = 5) {
  const sum = {},
    cnt = {};
  rows.forEach((r) => {
    const k = (r[groupCol] || "").trim();
    const v = parseFloat((r[valueCol] || "").toString().replace(",", "."));
    if (!k || isNaN(v) || v < 0) return;
    sum[k] = (sum[k] || 0) + v;
    cnt[k] = (cnt[k] || 0) + 1;
  });
  return Object.entries(sum)
    .filter(([k]) => cnt[k] >= minCount)
    .map(([k, v]) => [k, v / cnt[k], cnt[k]])
    .sort((a, b) => b[1] - a[1]);
}

function buildMensalMap(rows) {
  const m = {};
  rows.forEach((r) => {
    const d = parseDate(r["Data Saída"]);
    if (!d || isNaN(d)) return;
    const k = d.getFullYear() * 100 + d.getMonth();
    if (!m[k]) m[k] = { lbl: mesLabel(d), rows: [] };
    m[k].rows.push(r);
  });
  return Object.entries(m).sort((a, b) => +a[0] - +b[0]);
}

function dateRange(rows) {
  const datas = rows
    .map((r) => parseDate(r["Data Saída"]))
    .filter((d) => d && !isNaN(d));
  if (!datas.length) return null;
  return {
    min: new Date(Math.min(...datas)),
    max: new Date(Math.max(...datas)),
  };
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

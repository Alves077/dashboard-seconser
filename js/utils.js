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
    if (!seen.has(id))
      seen.set(id, { occ, cat: (r["Categoria"] || "").trim(), reg: (r["Região"] || "").trim() });
  });
  let reabIds = 0, reabTotal = 0;
  const reabByCat = {}, reabEventosByCat = {}, reabByReg = {};
  seen.forEach(({ occ, cat, reg }) => {
    if (occ > 1) {
      reabIds++;
      reabTotal += occ - 1;
      reabByCat[cat] = (reabByCat[cat] || 0) + 1;
      reabEventosByCat[cat] = (reabEventosByCat[cat] || 0) + (occ - 1);
      reabByReg[reg] = (reabByReg[reg] || 0) + (occ - 1);
    }
  });
  return { reabIds, reabTotal, reabByCat, reabEventosByCat, reabByReg };
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

// Retorna rows filtradas aos últimos N meses calendário completos (exclui mês corrente)
function getPeriodRows(sourceRows, nMeses) {
  if (!nMeses) return sourceRows;
  const monthCount = {};
  sourceRows.forEach(r => {
    const d = parseDate(r['Data Saída']);
    if (!d || isNaN(d)) return;
    const k = d.getFullYear() * 100 + d.getMonth();
    monthCount[k] = (monthCount[k] || 0) + 1;
  });
  const monthKeys = Object.keys(monthCount).map(Number).sort((a, b) => a - b);
  const now = new Date();
  const currentKey = now.getFullYear() * 100 + now.getMonth();
  if (monthKeys[monthKeys.length - 1] === currentKey) monthKeys.pop();
  const validKeys = new Set(monthKeys.slice(-nMeses));
  return sourceRows.filter(r => {
    const d = parseDate(r['Data Saída']);
    return d && !isNaN(d) && validKeys.has(d.getFullYear() * 100 + d.getMonth());
  });
}

// Atualiza selects de Região e Categoria de forma dependente
// Passar null em regSelId para pular o select de região
function updateDependentSelects(rows, regSelId, catSelId) {
  const selR = regSelId ? document.getElementById(regSelId) : null;
  const selC = catSelId ? document.getElementById(catSelId) : null;
  const curReg = selR?.value || '';
  const curCat = selC?.value || '';

  if (selR) {
    const regs = [...new Set(rows.map(r => (r['Região'] || '').trim()).filter(Boolean))].sort();
    selR.innerHTML = '<option value="">Todas</option>';
    regs.forEach(v => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === curReg) o.selected = true;
      selR.appendChild(o);
    });
    if (curReg && !regs.includes(curReg)) selR.value = '';
  }

  if (selC) {
    const rowsForCat = selR?.value ? rows.filter(r => (r['Região'] || '').trim() === selR.value) : rows;
    const cats = groupBy(rowsForCat, 'Categoria').map(([k]) => k).filter(Boolean);
    selC.innerHTML = '<option value="">Todas</option>';
    cats.forEach(v => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === curCat) o.selected = true;
      selC.appendChild(o);
    });
    if (curCat && !cats.includes(curCat)) selC.value = '';
  }
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  _updateThemeBtn();
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  _updateThemeBtn();
  if (typeof render === 'function' && typeof allRows !== 'undefined' && allRows.length) {
    const lu = document.getElementById('last-update');
    const luText = lu ? lu.textContent : null;
    render(typeof currentRows !== 'undefined' && currentRows.length ? currentRows : allRows);
    if (lu && luText) lu.textContent = luText;
  }
}

function _updateThemeBtn() {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '◑' : '◐';
  btn.title = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Tema claro' : 'Tema escuro';
}

function fixFiltersTop() {
  const tb = document.querySelector('.topbar');
  const fl = document.querySelector('.filters');
  if (tb && fl) fl.style.top = tb.offsetHeight + 'px';
}
window.addEventListener('resize', fixFiltersTop);
window.addEventListener('load', fixFiltersTop);

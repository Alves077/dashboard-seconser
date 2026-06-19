// ─── Filtros ─────────────────────────────────────────────────────────────────

let filtersInitialized = false;

function _homePeriodRows() {
  const mes = document.getElementById('fMes')?.value || '';
  if (mes) {
    return allRows.filter(r => {
      const d = parseDate(r['Data Saída']);
      return d && !isNaN(d) && mesLabel(d) === mes;
    });
  }
  const nMeses = parseInt(document.getElementById('fPeriodo')?.value || '0') || 0;
  if (!nMeses) return allRows;
  const monthCount = {};
  allRows.forEach(r => {
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
  return allRows.filter(r => {
    const d = parseDate(r['Data Saída']);
    return d && !isNaN(d) && validKeys.has(d.getFullYear() * 100 + d.getMonth());
  });
}

function _updateHomeOptions(periodRows) {
  const selR = document.getElementById('fRegiao');
  const selC = document.getElementById('fCat');
  const curReg = selR?.value || '';
  const curCat = selC?.value || '';

  const regs = [...new Set(periodRows.map(r => (r['Região'] || '').trim()).filter(Boolean))].sort();
  if (selR) {
    selR.innerHTML = '<option value="">Todas</option>';
    regs.forEach(v => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === curReg) o.selected = true;
      selR.appendChild(o);
    });
    if (curReg && !regs.includes(curReg)) selR.value = '';
  }

  const rowsForCat = selR?.value ? periodRows.filter(r => (r['Região'] || '').trim() === selR.value) : periodRows;
  const cats = groupBy(rowsForCat, 'Categoria').map(([k]) => k).filter(Boolean);
  if (selC) {
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

function populateFilters() {
  // Popula meses individuais no select fMes
  const selM = document.getElementById('fMes');
  if (selM) {
    const curMes = selM.value;
    selM.innerHTML = '<option value="">Todos</option>';
    const meses = {};
    allRows.forEach(r => {
      const d = parseDate(r['Data Saída']);
      if (d && !isNaN(d)) {
        const k = d.getFullYear() * 100 + d.getMonth();
        meses[k] = mesLabel(d);
      }
    });
    Object.entries(meses).sort((a, b) => +a[0] - +b[0]).forEach(([, lbl]) => {
      const o = document.createElement('option');
      o.value = lbl; o.textContent = lbl;
      if (lbl === curMes) o.selected = true;
      selM.appendChild(o);
    });
  }

  _updateHomeOptions(allRows);

  if (!filtersInitialized) {
    document.getElementById('fPeriodo')?.addEventListener('change', () => {
      const val = document.getElementById('fPeriodo')?.value || '0';
      if (val !== '0') document.getElementById('fMes').value = '';
      applyFilters();
    });
    document.getElementById('fMes')?.addEventListener('change', () => {
      if (document.getElementById('fMes')?.value)
        document.getElementById('fPeriodo').value = '0';
      applyFilters();
    });
    ['fRegiao', 'fCat'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    filtersInitialized = true;
  }
}

function applyFilters() {
  const periodRows = _homePeriodRows();
  _updateHomeOptions(periodRows);
  const regiao = document.getElementById('fRegiao')?.value || '';
  const cat = document.getElementById('fCat')?.value || '';
  let rows = periodRows;
  if (regiao) rows = rows.filter(r => (r['Região'] || '').trim() === regiao);
  if (cat) rows = rows.filter(r => (r['Categoria'] || '').trim() === cat);
  render(rows);
}

function updateTopbar(rows) {
  const range = dateRange(rows);
  if (range) {
    const el = document.getElementById('sub-periodo');
    if (el)
      el.textContent =
        mesLabel(range.min) + ' – ' + mesLabel(range.max) + ' · ' + fmt(rows.length) + ' registros';
  }
  const lu = document.getElementById('last-update');
  if (lu)
    lu.textContent =
      'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

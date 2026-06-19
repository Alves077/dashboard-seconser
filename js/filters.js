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
  return getPeriodRows(allRows, parseInt(document.getElementById('fPeriodo')?.value || '0') || 0);
}

function _updateHomeOptions(periodRows) {
  updateDependentSelects(periodRows, 'fRegiao', 'fCat');
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

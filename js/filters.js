// ─── Filtros ─────────────────────────────────────────────────────────────────

let filtersInitialized = false;

function resetSelect(id, defaultLabel) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${defaultLabel}</option>`;
}

function populateFilters() {
  // Reseta antes de repopular — evita duplicação no botão Atualizar
  resetSelect('fPeriodo', 'Todos');
  resetSelect('fRegiao',  'Todas');
  resetSelect('fCat',     'Todas');

  // Períodos ordenados
  const meses = {};
  allRows.forEach(r => {
    const d = parseDate(r['Data Saída']);
    if (d && !isNaN(d)) {
      const k = d.getFullYear() * 100 + d.getMonth();
      meses[k] = mesLabel(d);
    }
  });
  const selP = document.getElementById('fPeriodo');
  Object.entries(meses).sort((a, b) => +a[0] - +b[0]).forEach(([, lbl]) => {
    selP.appendChild(Object.assign(document.createElement('option'), { value: lbl, textContent: lbl }));
  });

  // Regiões
  const selR = document.getElementById('fRegiao');
  [...new Set(allRows.map(r => (r['Região'] || '').trim()).filter(Boolean))].sort()
    .forEach(v => selR.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: v })));

  // Categorias (ordenadas por volume)
  const selC = document.getElementById('fCat');
  groupBy(allRows, 'Categoria').map(([k]) => k).filter(Boolean)
    .forEach(v => selC.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: v })));

  // Listeners adicionados só uma vez
  if (!filtersInitialized) {
    ['fPeriodo', 'fRegiao', 'fCat'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });
    filtersInitialized = true;
  }
}

function applyFilters() {
  const periodo = document.getElementById('fPeriodo')?.value || '';
  const regiao  = document.getElementById('fRegiao')?.value  || '';
  const cat     = document.getElementById('fCat')?.value     || '';

  let rows = allRows;
  if (periodo) rows = rows.filter(r => { const d = parseDate(r['Data Saída']); return d && mesLabel(d) === periodo; });
  if (regiao)  rows = rows.filter(r => (r['Região']    || '').trim() === regiao);
  if (cat)     rows = rows.filter(r => (r['Categoria'] || '').trim() === cat);

  render(rows);
}

function updateTopbar(rows) {
  const range = dateRange(rows);
  if (range) {
    const el = document.getElementById('sub-periodo');
    if (el) el.textContent = mesLabel(range.min) + ' – ' + mesLabel(range.max) + ' · ' + fmt(rows.length) + ' registros';
  }
  const lu = document.getElementById('last-update');
  if (lu) lu.textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

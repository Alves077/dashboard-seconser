function updateSubPeriodo() {
  const datas = allRows.map(r => parseDate(r['Data Saída'])).filter(d => d && !isNaN(d));
  if (!datas.length) return;
  const min = new Date(Math.min(...datas));
  const max = new Date(Math.max(...datas));
  document.getElementById('sub-periodo').textContent =
    mesLabel(min) + ' – ' + mesLabel(max) + ' · ' + fmt(allRows.length) + ' registros';
  document.getElementById('last-update').textContent =
    'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function populateFilters() {
  const meses = {};
  allRows.forEach(r => {
    const d = parseDate(r['Data Saída']);
    if (d && !isNaN(d)) {
      const k = d.getFullYear() * 100 + d.getMonth();
      meses[k] = mesLabel(d);
    }
  });
  const sel = document.getElementById('fPeriodo');
  Object.entries(meses).sort((a, b) => +a[0] - +b[0]).forEach(([, lbl]) => {
    const o = document.createElement('option');
    o.value = lbl;
    o.textContent = lbl;
    sel.appendChild(o);
  });

  const regs = [...new Set(allRows.map(r => (r['Região'] || '').trim()).filter(Boolean))].sort();
  const selR = document.getElementById('fRegiao');
  regs.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    selR.appendChild(o);
  });

  const cats = groupBy(allRows, 'Categoria').map(([k]) => k).filter(Boolean);
  const selC = document.getElementById('fCat');
  cats.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    selC.appendChild(o);
  });

  ['fPeriodo', 'fRegiao', 'fCat'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters)
  );
}

function applyFilters() {
  const periodo = document.getElementById('fPeriodo').value;
  const regiao = document.getElementById('fRegiao').value;
  const cat = document.getElementById('fCat').value;
  let rows = allRows;
  if (periodo) rows = rows.filter(r => {
    const d = parseDate(r['Data Saída']);
    return d && mesLabel(d) === periodo;
  });
  if (regiao) rows = rows.filter(r => (r['Região'] || '').trim() === regiao);
  if (cat) rows = rows.filter(r => (r['Categoria'] || '').trim() === cat);
  render(rows);
}

// ─── Ponto de entrada ────────────────────────────────────────────────────────

function onDataLoaded() {
  populateFilters();
  updateTopbar(allRows);
  render(allRows);
}

loadData();

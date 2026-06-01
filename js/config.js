// ─── Configuração central ────────────────────────────────────────────────────
// Altere CSV_URL ao trocar a planilha de origem
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRdf3k8zVVJRakFS6Z87Gct-7RneG1INv--7a1lDCMvuO6qtwd57kpyxHsGAOfqcZe9Gf2RBCqYtDRu/pub?gid=0&single=true&output=csv';

// Estado global
let allRows = [];
let charts  = {};

// Cores dos gráficos (adapta ao tema do SO)
const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
const tc = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
const gc = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

// Paleta fixa
const COLORS = {
  blue:   '#378ADD',
  green:  '#639922',
  amber:  '#BA7517',
  red:    '#E24B4A',
  purple: '#7F77DD',
  gray:   '#888780',
  regioes: ['#378ADD', '#7F77DD', '#1D9E75', '#BA7517', '#888780'],
  faixas:  ['#639922', '#378ADD', '#BA7517', '#E24B4A'],
};

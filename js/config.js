const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRdf3k8zVVJRakFS6Z87Gct-7RneG1INv--7a1lDCMvuO6qtwd57kpyxHsGAOfqcZe9Gf2RBCqYtDRu/pub?gid=0&single=true&output=csv';

let allRows = [];
let charts = {};
const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
const tc = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
const gc = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

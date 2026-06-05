// ─── Configuração central ────────────────────────────────────────────────────
// Altere CSV_URL ao trocar a planilha de origem
const CSV_URL =
  "https://script.google.com/macros/s/AKfycbxuYGEryQj26BBs_9ocypkJGokMaOJXk4Bq6T47rEUMi823AvKZ1SB4oztNpG7KVH6V1Q/exec?token=seconser2026dip";

// TTL do cache local (localStorage). Altere conforme necessidade operacional.
// 30 minutos é adequado para um dashboard atualizado manualmente via Power Query.
const CACHE_TTL_MS = 30 * 60 * 1000;

// Estado global
let allRows = [];
let charts = {};

// Cores dos gráficos (adapta ao tema do SO)
const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
const tc = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
const gc = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

// Paleta fixa
const COLORS = {
  blue: "#378ADD",
  green: "#639922",
  amber: "#BA7517",
  red: "#E24B4A",
  purple: "#7F77DD",
  gray: "#888780",
  regioes: ["#378ADD", "#7F77DD", "#1D9E75", "#BA7517", "#888780"],
  faixas: ["#639922", "#378ADD", "#BA7517", "#E24B4A"],
};

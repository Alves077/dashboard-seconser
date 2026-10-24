const inteiro = new Intl.NumberFormat('pt-BR')
const decimal1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 16.973 */
export function numero(n: number): string {
  return Number.isFinite(n) ? inteiro.format(n) : '—'
}

/** 4,2 */
export function decimal(n: number | null | undefined): string {
  return n !== null && n !== undefined && Number.isFinite(n) ? decimal1.format(n) : '—'
}

/** 7 (inteiro) ou 7,5 — para medidas em dias, sem "7,0" */
function enxuto(n: number | null | undefined): string {
  return n !== null && n !== undefined && Number.isInteger(n) ? numero(n) : decimal(n)
}

/** 12,4% — sem base vira "—" (nunca NaN/Infinity na tela) */
export function pct(parte: number, total: number): string {
  return total > 0 ? `${decimal1.format((parte / total) * 100)}%` : '—'
}

/** 38,7% · 100% (sem ",0" no inteiro) — para textos curtos */
export function pctCurto(parte: number, total: number): string {
  if (total <= 0) return '—'
  const v = (parte / total) * 100
  return Number.isInteger(Math.round(v * 10) / 10) ? `${numero(Math.round(v))}%` : `${decimal1.format(v)}%`
}

/** "1 dia" / "3 dias" */
export function dias(n: number): string {
  return `${numero(n)} ${n === 1 ? 'dia' : 'dias'}`
}

/** Há quanto tempo está em aberto: "hoje" (saiu hoje — "0 dias" lia estranho; usuário, 24/10/2026), "1 dia", "12 dias" */
export function diasEspera(n: number): string {
  return n === 0 ? 'hoje' : dias(n)
}

/** Quanto levou (da saída à execução): "mesmo dia", "1 dia", "2,5 dias" (mediana de lista par) */
export function diasLevou(n: number): string {
  return n === 0 ? 'mesmo dia' : `${enxuto(n)} ${n === 1 ? 'dia' : 'dias'}`
}

/** Espera em coluna de tabela: "hoje" ou o número ("12", ou "12d" com o sufixo) */
export function diasEsperaCurto(n: number, sufixo = ''): string {
  return n === 0 ? 'hoje' : `${enxuto(n)}${sufixo}`
}

/** Quanto levou em coluna de tabela: "mesmo dia" ou o número ("3", ou "2,5d" com o sufixo) */
export function diasLevouCurto(n: number, sufixo = ''): string {
  return n === 0 ? 'mesmo dia' : `${enxuto(n)}${sufixo}`
}

/** A mediana na frase e no indicador dos Executados: "metade no mesmo dia" / "metade em até 3 dias" */
export function metadeEm(mediana: number): string {
  return mediana === 0 ? 'metade no mesmo dia' : `metade em até ${diasLevou(mediana)}`
}

/** Variação % de b para a (null sem base: anterior vazio ou zero) — nos indicadores do Panorama, Prazo e Evolução */
export function variacao(a: number | null, b: number | null | undefined): number | null {
  return a === null || b === null || b === undefined || b === 0 ? null : ((a - b) / b) * 100
}

/** "1 serviço" / "2 serviços" */
export function plural(n: number, um: string, varios: string): string {
  return `${numero(n)} ${n === 1 ? um : varios}`
}

/** Comparação para ordenar texto em português (acentos, maiúsculas) */
export const compararTexto = new Intl.Collator('pt-BR', { sensitivity: 'base' }).compare

/** "Pé Pequeno" → "pe pequeno" (busca sem acento/caixa) */
export function normalizarBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

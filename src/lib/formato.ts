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

/** 12,4% — sem base vira "—" (nunca NaN/Infinity na tela) */
export function pct(parte: number, total: number): string {
  return total > 0 ? `${decimal1.format((parte / total) * 100)}%` : '—'
}

/** "1 dia" / "3 dias" */
export function dias(n: number): string {
  return `${numero(n)} ${n === 1 ? 'dia' : 'dias'}`
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

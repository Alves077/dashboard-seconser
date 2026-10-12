// Datas como "número do dia" (dias desde 01/01/1970), sem hora nem fuso.
// O banco guarda só a data (AAAA-MM-DD); `new Date('2026-10-09')` vira meia-noite UTC, que no
// Brasil é dia 8 — por isso nada aqui passa por fuso: a conta é sempre em dias inteiros.

export type Dia = number

const MS_DIA = 86_400_000
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function diaDe(ano: number, mes0: number, dia: number): Dia {
  return Date.UTC(ano, mes0, dia) / MS_DIA
}

/** '2026-10-09' (ou '2026-10-09 18:42:00') → Dia; vazio/inválido → null */
export function diaDeIso(s: string | null | undefined): Dia | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? diaDe(+m[1], +m[2] - 1, +m[3]) : null
}

/** Hoje no relógio do usuário (Niterói), como Dia */
export function hoje(): Dia {
  const d = new Date()
  return diaDe(d.getFullYear(), d.getMonth(), d.getDate())
}

export function partes(d: Dia) {
  const x = new Date(d * MS_DIA)
  return { ano: x.getUTCFullYear(), mes0: x.getUTCMonth(), dia: x.getUTCDate() }
}

export function isoDe(d: Dia): string {
  return new Date(d * MS_DIA).toISOString().slice(0, 10)
}

/** 09/10/2026 */
export function formatarDia(d: Dia | null): string {
  if (d === null) return '—'
  const p = partes(d)
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes0 + 1).padStart(2, '0')}/${p.ano}`
}

/** 09/10 */
export function formatarDiaCurto(d: Dia): string {
  const p = partes(d)
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes0 + 1).padStart(2, '0')}`
}

// ── Meses ──────────────────────────────────────────────────────────────────
// Chave de mês = ano * 100 + mês de 0 a 11, como no site antigo (outubro/2026 = 202609, porque
// janeiro é 0). Ordena certo e cabe num número; para exibir, use sempre rotuloMes/rotuloMesLongo.
export type ChaveMes = number

export function chaveMes(d: Dia): ChaveMes {
  const p = partes(d)
  return p.ano * 100 + p.mes0
}

export function inicioDoMes(d: Dia): Dia {
  const p = partes(d)
  return diaDe(p.ano, p.mes0, 1)
}

export function fimDoMes(d: Dia): Dia {
  const p = partes(d)
  return diaDe(p.ano, p.mes0 + 1, 0)
}

export function somarMeses(d: Dia, n: number): Dia {
  const p = partes(d)
  return diaDe(p.ano, p.mes0 + n, 1)
}

export function diaDaChave(k: ChaveMes): Dia {
  return diaDe(Math.floor(k / 100), k % 100, 1)
}

/** 'out/26' */
export function rotuloMes(k: ChaveMes): string {
  return `${MESES_ABREV[k % 100]}/${String(Math.floor(k / 100)).slice(2)}`
}

/** 'outubro de 2026' */
export function rotuloMesLongo(k: ChaveMes): string {
  return `${MESES[k % 100]} de ${Math.floor(k / 100)}`
}

/** Todas as chaves de mês entre dois dias, inclusive */
export function mesesEntre(de: Dia, ate: Dia): ChaveMes[] {
  const r: ChaveMes[] = []
  for (let d = inicioDoMes(de); d <= ate; d = somarMeses(d, 1)) r.push(chaveMes(d))
  return r
}

// Filtros globais (valem em todas as páginas) e o recorte de período.
// Ficam na URL: voltar/avançar funcionam e um link filtrado pode ser compartilhado.
import {
  chaveMes,
  diaDaChave,
  diaDe,
  diaDeIso,
  fimDoMes,
  formatarDia,
  inicioDoMes,
  isoDe,
  partes,
  rotuloMesLongo,
  somarMeses,
  type ChaveMes,
  type Dia,
} from '@/lib/datas'
import type { Saida } from '@/dados/tipos'

export type Atalho =
  | 'tudo'
  | '7d'
  | '30d'
  | '90d'
  | 'este-mes'
  | 'mes-anterior'
  | '3m'
  | '6m'
  | '12m'
  | 'este-ano'

export const ATALHOS: { id: Atalho; rotulo: string }[] = [
  { id: 'tudo', rotulo: 'Todo o período' },
  { id: '7d', rotulo: 'Últimos 7 dias' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: '90d', rotulo: 'Últimos 90 dias' },
  { id: 'este-mes', rotulo: 'Este mês' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
  { id: '3m', rotulo: 'Últimos 3 meses fechados' },
  { id: '6m', rotulo: 'Últimos 6 meses fechados' },
  { id: '12m', rotulo: 'Últimos 12 meses fechados' },
  { id: 'este-ano', rotulo: 'Este ano' },
]

export type Periodo =
  | { tipo: 'atalho'; atalho: Atalho }
  | { tipo: 'mes'; mes: ChaveMes }
  | { tipo: 'intervalo'; de: Dia; ate: Dia }

/** Contar o período pela data de saída (foi para a rua) ou de retorno (foi executado) */
export type ContarPor = 'saida' | 'retorno'

export interface Filtros {
  periodo: Periodo
  contarPor: ContarPor
  regiao: string | null
  bairro: string | null
  categoria: string | null
  /** quem pediu: Cidadão, Regional, Vereador… */
  origem: string | null
}

/** Padrão ao abrir: últimos 30 dias (Panorama = "como estamos agora"; decisão de 12/10/2026) */
export const PERIODO_PADRAO: Periodo = { tipo: 'atalho', atalho: '30d' }

export const ehPeriodoPadrao = (p: Periodo) => p.tipo === 'atalho' && p.atalho === '30d'

export const FILTROS_PADRAO: Filtros = {
  periodo: PERIODO_PADRAO,
  contarPor: 'saida',
  regiao: null,
  bairro: null,
  categoria: null,
  origem: null,
}

// ── URL ────────────────────────────────────────────────────────────────────

const ATALHOS_VALIDOS = new Set(ATALHOS.map((a) => a.id))

export function lerFiltros(p: URLSearchParams): Filtros {
  let periodo: Periodo = FILTROS_PADRAO.periodo
  const pp = p.get('periodo')
  const mes = /^(\d{4})-(\d{2})$/.exec(p.get('mes') ?? '')
  const de = diaDeIso(p.get('de'))
  const ate = diaDeIso(p.get('ate'))
  if (pp === 'mes' && mes) periodo = { tipo: 'mes', mes: +mes[1] * 100 + (+mes[2] - 1) }
  else if (pp === 'intervalo' && de !== null && ate !== null)
    periodo = { tipo: 'intervalo', de: Math.min(de, ate), ate: Math.max(de, ate) }
  else if (pp && ATALHOS_VALIDOS.has(pp as Atalho)) periodo = { tipo: 'atalho', atalho: pp as Atalho }

  return {
    periodo,
    contarPor: p.get('por') === 'retorno' ? 'retorno' : 'saida',
    regiao: p.get('regiao') || null,
    bairro: p.get('bairro') || null,
    categoria: p.get('categoria') || null,
    origem: p.get('origem') || null,
  }
}

/** Escreve os filtros na URL, mantendo outros parâmetros (ex.: ?servico= da Ficha) */
export function escreverFiltros(f: Filtros, base: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base)
  for (const k of ['periodo', 'mes', 'de', 'ate', 'por', 'regiao', 'bairro', 'categoria', 'origem', 'situacao']) p.delete(k)
  const per = f.periodo
  if (per.tipo === 'mes') {
    const { ano, mes0 } = partes(diaDaChave(per.mes))
    p.set('periodo', 'mes')
    p.set('mes', `${ano}-${String(mes0 + 1).padStart(2, '0')}`)
  } else if (per.tipo === 'intervalo') {
    p.set('periodo', 'intervalo')
    p.set('de', isoDe(per.de))
    p.set('ate', isoDe(per.ate))
  } else if (!ehPeriodoPadrao(per)) p.set('periodo', per.atalho) // o padrão não vai para a URL
  if (f.contarPor === 'retorno') p.set('por', 'retorno')
  if (f.regiao) p.set('regiao', f.regiao)
  if (f.bairro) p.set('bairro', f.bairro)
  if (f.categoria) p.set('categoria', f.categoria)
  if (f.origem) p.set('origem', f.origem)
  return p
}

// ── Período → intervalo de dias ────────────────────────────────────────────

export interface Intervalo {
  de: Dia | null
  ate: Dia | null
  /** termina hoje ou no mês corrente: números ainda vão mudar */
  parcial: boolean
  rotulo: string
}

/** Últimos N meses fechados: exclui o mês corrente (como o site antigo) */
function mesesFechados(n: number, hoje: Dia): [Dia, Dia] {
  const iniAtual = inicioDoMes(hoje)
  return [somarMeses(iniAtual, -n), iniAtual - 1]
}

export function intervaloDo(per: Periodo, hoje: Dia): Intervalo {
  if (per.tipo === 'mes') {
    const de = diaDaChave(per.mes)
    const ate = fimDoMes(de)
    return { de, ate, parcial: ate >= hoje, rotulo: rotuloMesLongo(per.mes) }
  }
  if (per.tipo === 'intervalo') {
    return {
      de: per.de,
      ate: per.ate,
      parcial: per.ate >= hoje,
      rotulo: `${formatarDia(per.de)} a ${formatarDia(per.ate)}`,
    }
  }
  const rotulo = ATALHOS.find((a) => a.id === per.atalho)!.rotulo
  switch (per.atalho) {
    case 'tudo':
      return { de: null, ate: null, parcial: true, rotulo }
    case '7d':
    case '30d':
    case '90d': {
      const n = parseInt(per.atalho)
      return { de: hoje - (n - 1), ate: hoje, parcial: true, rotulo }
    }
    case 'este-mes':
      return { de: inicioDoMes(hoje), ate: hoje, parcial: true, rotulo }
    case 'mes-anterior': {
      const de = somarMeses(inicioDoMes(hoje), -1)
      return { de, ate: fimDoMes(de), parcial: false, rotulo: rotuloMesLongo(chaveMes(de)) }
    }
    case '3m':
    case '6m':
    case '12m': {
      const [de, ate] = mesesFechados(parseInt(per.atalho), hoje)
      return { de, ate, parcial: false, rotulo }
    }
    case 'este-ano':
      return { de: diaDe(partes(hoje).ano, 0, 1), ate: hoje, parcial: true, rotulo }
  }
}

/** O período de mesmo tamanho logo antes (para "▲ 12% vs. anterior"); null para "todo o período" */
export function intervaloAnterior(i: Intervalo): Intervalo | null {
  if (i.de === null || i.ate === null) return null
  const ehMesInteiro = i.de === inicioDoMes(i.de) && i.ate === fimDoMes(i.ate)
  if (ehMesInteiro) {
    // meses inteiros comparam com os mesmos N meses anteriores (fev tem 28 dias, não 31)
    const n = (partes(i.ate).ano - partes(i.de).ano) * 12 + partes(i.ate).mes0 - partes(i.de).mes0 + 1
    const de = somarMeses(i.de, -n)
    const ate = i.de - 1
    return { de, ate, parcial: false, rotulo: `${formatarDia(de)} a ${formatarDia(ate)}` }
  }
  const tam = i.ate - i.de + 1
  return { de: i.de - tam, ate: i.de - 1, parcial: false, rotulo: `${formatarDia(i.de - tam)} a ${formatarDia(i.de - 1)}` }
}

// ── Aplicar ────────────────────────────────────────────────────────────────

/** Filtros do serviço (lugar, categoria, origem) — sem período e sem situação */
export function filtrarLugar(saidas: Saida[], f: Filtros): Saida[] {
  if (!f.regiao && !f.bairro && !f.categoria && !f.origem) return saidas
  return saidas.filter((s) => {
    const sv = s.servico
    return (
      (!f.regiao || sv.regiao === f.regiao) &&
      (!f.bairro || sv.bairro === f.bairro) &&
      (!f.categoria || sv.categoria === f.categoria) &&
      (!f.origem || sv.origem === f.origem)
    )
  })
}

export function noIntervalo(s: Saida, i: Intervalo, por: ContarPor): boolean {
  const d = por === 'saida' ? s.dataSaida : s.dataRetorno
  if (d === null) return false // contando por retorno, quem não voltou fica de fora
  return (i.de === null || d >= i.de) && (i.ate === null || d <= i.ate)
}

/** Aplica todos os filtros às saídas */
export function aplicarFiltros(saidas: Saida[], f: Filtros, hoje: Dia): { saidas: Saida[]; intervalo: Intervalo } {
  const intervalo = intervaloDo(f.periodo, hoje)
  const r = filtrarLugar(saidas, f).filter((s) => noIntervalo(s, intervalo, f.contarPor))
  return { saidas: r, intervalo }
}

/** Quantos filtros estão diferentes do padrão (contador do botão "Filtros" no celular) */
export function contarAtivos(f: Filtros): number {
  return (
    (ehPeriodoPadrao(f.periodo) ? 0 : 1) +
    (f.contarPor !== 'saida' ? 1 : 0) +
    (f.regiao ? 1 : 0) +
    (f.bairro ? 1 : 0) +
    (f.categoria ? 1 : 0) +
    (f.origem ? 1 : 0)
  )
}

/** Dimensões do serviço que viram filtro (e opção de lista com contagem) */
export type Dimensao = 'regiao' | 'bairro' | 'categoria' | 'origem'

const valorDe: Record<Dimensao, (s: Saida) => string | null> = {
  regiao: (s) => s.servico.regiao,
  bairro: (s) => s.servico.bairro,
  categoria: (s) => s.servico.categoria,
  origem: (s) => s.servico.origem,
}

/**
 * Quantas saídas cada opção teria com os OUTROS filtros aplicados (o da própria dimensão
 * fica de fora — senão só a opção escolhida teria contagem). Alimenta "Fonseca (128)" e
 * deixa desabilitadas as opções com zero, sem sumir da lista.
 */
export function contarOpcoes(saidas: Saida[], f: Filtros, hoje: Dia): Record<Dimensao, Map<string, number>> {
  const intervalo = intervaloDo(f.periodo, hoje)
  const base = saidas.filter((s) => noIntervalo(s, intervalo, f.contarPor))
  const r = {} as Record<Dimensao, Map<string, number>>
  for (const d of Object.keys(valorDe) as Dimensao[]) {
    const sem = { ...f, [d]: null }
    // bairro depende da região escolhida; região não depende do bairro
    if (d === 'regiao') sem.bairro = null
    const m = new Map<string, number>()
    for (const s of filtrarLugar(base, sem)) {
      const v = valorDe[d](s)
      if (v) m.set(v, (m.get(v) ?? 0) + 1)
    }
    r[d] = m
  }
  return r
}

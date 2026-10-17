// Cálculos do Panorama. Dois recortes, sempre nomeados na tela:
//   AGORA       — a fila de hoje: serviços cuja saída mais recente não voltou. Respeita lugar,
//                 categoria e origem; NÃO depende do período (um pedido de fevereiro parado ainda está na fila).
//   NO PERÍODO  — saídas dentro do período escolhido (por data de saída ou de retorno).
import {
  CATEGORIA_RISCO,
  quemDe,
  diasEmAberto,
  diasExecucao,
  emAberto,
  media,
  mediana,
  noPrazo,
  situacao,
  ultimaSaida,
} from '@/dados/regras'
import type { Base, Saida, Servico } from '@/dados/tipos'
import {
  filtrarLugar,
  intervaloAnterior,
  intervaloDo,
  noIntervalo,
  type ContarPor,
  type Filtros,
  type Intervalo,
} from '@/filtros/filtros'
import { chaveMes, diaDaChave, inicioDoMes, somarMeses, type ChaveMes, type Dia } from '@/lib/datas'

// ── Agora ──────────────────────────────────────────────────────────────────

export const FAIXAS_ESPERA = [
  { id: 'prazo', rotulo: 'Até 5 dias', nota: 'no prazo', max: 5 },
  { id: '6a15', rotulo: '6 a 15 dias', nota: '', max: 15 },
  { id: '16a30', rotulo: '16 a 30 dias', nota: '', max: 30 },
  { id: '31a90', rotulo: '31 a 90 dias', nota: '', max: 90 },
  { id: 'mais90', rotulo: 'Mais de 90 dias', nota: '', max: Infinity },
] as const

export interface ItemFila {
  servico: Servico
  saida: Saida
  dias: number
}

export function calcularAgora(servicos: Servico[], hoje: Dia) {
  const itens: ItemFila[] = []
  let atraso = 0
  let risco = 0
  const espera = FAIXAS_ESPERA.map(() => 0)
  for (const s of servicos) {
    const u = ultimaSaida(s.saidas)
    if (!emAberto(u)) continue
    const dias = diasEmAberto(u, hoje)
    itens.push({ servico: s, saida: u, dias })
    if (situacao(u, hoje) === 'atraso') atraso++
    if (s.categoria === CATEGORIA_RISCO) risco++
    espera[FAIXAS_ESPERA.findIndex((f) => dias <= f.max)]++
  }
  itens.sort((a, b) => b.dias - a.dias)
  return { total: itens.length, atraso, risco, espera, itens }
}

// ── Indicadores do período ─────────────────────────────────────────────────

/**
 * Período "provisório": mais que isto das saídas ainda em aberto. O tempo médio só conta quem já voltou
 * (os rápidos) e ainda vai subir — contando pela saída, os meses recentes pareciam melhores do que são.
 */
export const LIMIAR_PROVISORIO = 0.1

export interface Indicadores {
  saidas: number
  executadas: number
  noPrazo: number
  pctNoPrazo: number | null
  tempoMedio: number | null
  tempoMediano: number | null
  /** saídas que eram volta à rua de um serviço já atendido (2ª saída em diante) */
  reaberturas: number
  pctReaberturas: number | null
  /** saídas do período ainda sem retorno */
  abertas: number
  /** dessas, as que já passaram do prazo — contam como FORA do prazo: não têm mais como ficar dentro */
  vencidas: number
  /** muita coisa ainda em aberto (> LIMIAR_PROVISORIO): o tempo médio ainda vai mudar */
  provisorio: boolean
}

/**
 * No prazo (regra de 14/10/2026, decisão do usuário): executados em até 5 dias ÷ (executados + em aberto que
 * já passaram dos 5 dias). Contando pela saída, os meses recentes têm muita coisa em aberto; "entre os
 * executados" deixava de fora justamente os atrasados (set/26: 30,7% → 13,2%, o número real). Contando pelo
 * retorno, tudo já voltou e a conta é a de sempre. O Relatório Mensal mantém a regra do site antigo.
 */
export function indicadores(saidas: Saida[], hoje: Dia): Indicadores {
  const exec: number[] = []
  let dentro = 0
  let reab = 0
  let abertas = 0
  let vencidas = 0
  for (const s of saidas) {
    if (s.ordem > 1) reab++
    const d = diasExecucao(s)
    if (d === null) {
      abertas++
      if (situacao(s, hoje) === 'atraso') vencidas++
      continue
    }
    exec.push(d)
    if (noPrazo(s)) dentro++
  }
  return {
    saidas: saidas.length,
    executadas: exec.length,
    noPrazo: dentro,
    pctNoPrazo: exec.length + vencidas ? (dentro / (exec.length + vencidas)) * 100 : null,
    tempoMedio: media(exec),
    tempoMediano: mediana(exec),
    reaberturas: reab,
    pctReaberturas: saidas.length ? (reab / saidas.length) * 100 : null,
    abertas,
    vencidas,
    provisorio: saidas.length > 0 && abertas / saidas.length > LIMIAR_PROVISORIO,
  }
}

/** Mês a mês (últimos 12 + o corrente, parcial), para as mini-linhas dos indicadores */
export function serieMensal(saidas: Saida[], por: ContarPor, hoje: Dia) {
  const ultimo = chaveMes(hoje)
  const primeiro = chaveMes(somarMeses(inicioDoMes(hoje), -12))
  const grupos = new Map<ChaveMes, Saida[]>()
  for (const s of saidas) {
    const d = por === 'saida' ? s.dataSaida : s.dataRetorno
    if (d === null) continue
    const k = chaveMes(d)
    if (k < primeiro || k > ultimo) continue
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(s)
  }
  const meses: { mes: ChaveMes; ind: Indicadores; parcial: boolean }[] = []
  for (let d = diaDaChave(primeiro); chaveMes(d) <= ultimo; d = somarMeses(d, 1)) {
    const k = chaveMes(d)
    meses.push({ mes: k, ind: indicadores(grupos.get(k) ?? [], hoje), parcial: k === ultimo })
  }
  // antes do 1º mês com dado a série não existe (não é zero)
  const ini = meses.findIndex((m) => m.ind.saidas > 0)
  return ini < 0 ? [] : meses.slice(ini)
}

// ── Movimento da fila no período ───────────────────────────────────────────
// fila no início + entraram − executadas = fila no fim (conta saídas; uma reabertura volta para a fila)

export interface Movimento {
  de: Dia | null
  ate: Dia
  inicio: number
  entraram: number
  executadas: number
  /** das executadas, quantas tinham saído antes do período */
  executadasAntigas: number
  fim: number
}

export function movimento(saidasLugar: Saida[], i: Intervalo, hoje: Dia): Movimento {
  const de = i.de
  const ate = Math.min(i.ate ?? hoje, hoje)
  let inicio = 0
  let entraram = 0
  let executadas = 0
  let executadasAntigas = 0
  let fim = 0
  for (const s of saidasLugar) {
    const r = s.dataRetorno
    if (de !== null && s.dataSaida < de && (r === null || r >= de)) inicio++
    if ((de === null || s.dataSaida >= de) && s.dataSaida <= ate) entraram++
    if (r !== null && (de === null || r >= de) && r <= ate) {
      executadas++
      if (de !== null && s.dataSaida < de) executadasAntigas++
    }
    if (s.dataSaida <= ate && (r === null || r > ate)) fim++
  }
  return { de, ate, inicio, entraram, executadas, executadasAntigas, fim }
}

// ── Quebras (região, categoria, bairro, origem) ────────────────────────────

export interface LinhaQuebra {
  nome: string
  /** saídas no período */
  saidas: number
  /** dessas saídas, as que ainda não voltaram (em aberto) */
  abertosPeriodo: number
  /** e, delas, as que já passaram do prazo */
  atrasoPeriodo: number
  /** fila de agora */
  fila: number
  atraso: number
  pctNoPrazo: number | null
  tempoMedio: number | null
}

function quebrar(
  noPeriodo: Saida[],
  filaItens: ItemFila[],
  chave: (s: Servico) => string,
  hoje: Dia,
): LinhaQuebra[] {
  const porNome = new Map<string, { saidas: Saida[]; fila: number; atraso: number }>()
  const pegar = (n: string) => {
    if (!porNome.has(n)) porNome.set(n, { saidas: [], fila: 0, atraso: 0 })
    return porNome.get(n)!
  }
  for (const s of noPeriodo) pegar(chave(s.servico)).saidas.push(s)
  for (const it of filaItens) {
    const g = pegar(chave(it.servico))
    g.fila++
    if (situacao(it.saida, hoje) === 'atraso') g.atraso++
  }
  return [...porNome].map(([nome, g]) => {
    const ind = indicadores(g.saidas, hoje)
    const abertas = g.saidas.filter((s) => s.dataRetorno === null)
    return {
      nome,
      saidas: g.saidas.length,
      abertosPeriodo: abertas.length,
      atrasoPeriodo: abertas.filter((s) => situacao(s, hoje) === 'atraso').length,
      fila: g.fila,
      atraso: g.atraso,
      pctNoPrazo: ind.pctNoPrazo,
      tempoMedio: ind.tempoMedio,
    }
  })
}

/**
 * 2º nível da origem escolhida (as regionais, os vereadores…), como os bairros de uma região.
 * Conta SEM o "quem" escolhido, para a lista mostrar todos com o escolhido marcado.
 * null quando não há o que abrir: nenhuma origem, ou origem com um nome só (Cidadão, Ouvidoria…).
 */
function quebrarQuem(base: Base, f: Filtros, intervalo: Intervalo, hoje: Dia): LinhaQuebra[] | null {
  if (!f.origem) return null
  const lugar = filtrarLugar(base.saidas, { ...f, quem: null })
  const nomes = new Set(lugar.map((s) => quemDe(s.servico)))
  if (nomes.size < 2 && !f.quem) return null
  const noPeriodo = lugar.filter((s) => noIntervalo(s, intervalo, f.contarPor))
  const agora = calcularAgora([...new Set(lugar.map((s) => s.servico))], hoje)
  return quebrar(noPeriodo, agora.itens, (s) => quemDe(s) ?? s.origem, hoje)
}

// ── Tudo do Panorama ───────────────────────────────────────────────────────

export function calcularPanorama(base: Base, f: Filtros, hoje: Dia) {
  const lugar = filtrarLugar(base.saidas, f)
  const intervalo = intervaloDo(f.periodo, hoje)
  const anterior = intervaloAnterior(intervalo)
  const noPeriodo = lugar.filter((s) => noIntervalo(s, intervalo, f.contarPor))
  const noAnterior = anterior ? lugar.filter((s) => noIntervalo(s, anterior, f.contarPor)) : null

  const servicosLugar = [...new Set(lugar.map((s) => s.servico))]
  const agora = calcularAgora(servicosLugar, hoje)

  const primeiraSaida = lugar.reduce((m, s) => Math.min(m, s.dataSaida), Infinity)

  return {
    intervalo,
    anterior,
    primeiraSaida: Number.isFinite(primeiraSaida) ? primeiraSaida : null,
    agora,
    atual: indicadores(noPeriodo, hoje),
    previo: noAnterior ? indicadores(noAnterior, hoje) : null,
    serie: serieMensal(lugar, f.contarPor, hoje),
    movimento: movimento(lugar, intervalo, hoje),
    regioes: quebrar(noPeriodo, agora.itens, (s) => s.regiao, hoje),
    categorias: quebrar(noPeriodo, agora.itens, (s) => s.categoria ?? 'Sem categoria', hoje),
    bairros: quebrar(noPeriodo, agora.itens, (s) => s.bairro, hoje),
    origens: quebrar(noPeriodo, agora.itens, (s) => s.origem, hoje),
    quens: quebrarQuem(base, f, intervalo, hoje),
  }
}

export type Panorama = ReturnType<typeof calcularPanorama>

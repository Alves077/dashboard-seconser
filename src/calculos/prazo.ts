// Cálculos da página Prazo — "Estamos atendendo bem?". Três recortes, sempre nomeados na tela:
//   NO PERÍODO — saídas do período pela data escolhida em "contar por". Prazo e dias de execução só
//                existem para quem VOLTOU (executado): serviço aberto não tem prazo para medir.
//   AGORA      — atraso da fila de hoje (respeita lugar/categoria/origem, não o período).
//   MÊS A MÊS  — mini-tendência dos indicadores (13 meses, o atual parcial).
import { CATEGORIA_RISCO, diasExecucao, media, situacao, ultimaSaida } from '@/dados/regras'
import type { Base, Saida, Servico } from '@/dados/tipos'
import { PRAZO_DIAS } from '@/config'
import { filtrarLugar, intervaloAnterior, intervaloDo, noIntervalo, type ContarPor, type Filtros } from '@/filtros/filtros'
import { chaveMes, diaDaChave, fimDoMes, inicioDoMes, somarMeses, type ChaveMes, type Dia } from '@/lib/datas'
import { calcularAgora, indicadores, type ItemFila } from './panorama'

// ── Faixas de tempo de execução ────────────────────────────────────────────
// "Até 3" separa o que foi resolvido rápido do que foi resolvido no limite do prazo (4–5).

export const FAIXAS_EXEC = [
  { id: 'ate3', rotulo: 'Até 3 dias', curto: 'Até 3', max: 3, noPrazo: true },
  { id: '4a5', rotulo: '4 a 5 dias', curto: '4–5', max: 5, noPrazo: true },
  { id: '6a15', rotulo: '6 a 15 dias', curto: '6–15', max: 15, noPrazo: false },
  { id: '16a30', rotulo: '16 a 30 dias', curto: '16–30', max: 30, noPrazo: false },
  { id: 'mais30', rotulo: 'Mais de 30 dias', curto: '> 30', max: Infinity, noPrazo: false },
] as const

const faixaDe = (d: number) => FAIXAS_EXEC.findIndex((f) => d <= f.max)

// ── Histograma ─────────────────────────────────────────────────────────────
// Dia a dia até 15 (onde estão o prazo e a maior parte) e a cauda agrupada.

export const ULTIMO_DIA_DIARIO = 15

export const CAUDA = [
  { id: '16a30', rotulo: '16 a 30 dias', curto: '16–30', max: 30 },
  { id: '31a90', rotulo: '31 a 90 dias', curto: '31–90', max: 90 },
  { id: 'mais90', rotulo: 'Mais de 90 dias', curto: '> 90', max: Infinity },
] as const

export interface Distribuicao {
  /** índice = dias (0 = mesmo dia … 15) */
  porDia: number[]
  /** mesma ordem de CAUDA */
  cauda: number[]
  total: number
  dentro: number
  fora: number
  mais30: number
  /** número de dias mais comum (empate: o menor) */
  maisComum: number | null
}

export function distribuicao(executadas: number[]): Distribuicao {
  const porDia = Array.from({ length: ULTIMO_DIA_DIARIO + 1 }, () => 0)
  const cauda = CAUDA.map(() => 0)
  const freq = new Map<number, number>()
  let dentro = 0
  let mais30 = 0
  for (const d of executadas) {
    if (d <= PRAZO_DIAS) dentro++
    if (d > 30) mais30++
    if (d <= ULTIMO_DIA_DIARIO) porDia[d]++
    else cauda[CAUDA.findIndex((c) => d <= c.max)]++
    freq.set(d, (freq.get(d) ?? 0) + 1)
  }
  let maisComum: number | null = null
  let maior = 0
  for (const [d, n] of freq) {
    if (n > maior || (n === maior && d < maisComum!)) {
      maior = n
      maisComum = d
    }
  }
  return { porDia, cauda, total: executadas.length, dentro, fora: executadas.length - dentro, mais30, maisComum }
}

// ── Tempo por região/bairro (tabela de calor) ──────────────────────────────

export interface LinhaFaixas {
  nome: string
  executadas: number
  /** contagem por faixa, na ordem de FAIXAS_EXEC */
  faixas: number[]
  pctNoPrazo: number
  tempoMedio: number | null
}

function linhasFaixas(executadas: Saida[], chave: (s: Servico) => string): LinhaFaixas[] {
  const grupos = new Map<string, number[]>()
  for (const s of executadas) {
    const k = chave(s.servico)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(diasExecucao(s)!)
  }
  return [...grupos].map(([nome, ds]) => {
    const faixas = FAIXAS_EXEC.map(() => 0)
    for (const d of ds) faixas[faixaDe(d)]++
    const dentro = ds.filter((d) => d <= PRAZO_DIAS).length
    return { nome, executadas: ds.length, faixas, pctNoPrazo: (dentro / ds.length) * 100, tempoMedio: media(ds) }
  })
}

// ── Atraso de agora por região/bairro ──────────────────────────────────────

export interface LinhaAtraso {
  nome: string
  fila: number
  atraso: number
  /** em atraso há mais de 30 dias além do prazo */
  atrasoLongo: number
  /** dias em aberto do mais antigo */
  maisAntigo: number
}

function linhasAtraso(itens: ItemFila[], chave: (s: Servico) => string, hoje: Dia): LinhaAtraso[] {
  const grupos = new Map<string, LinhaAtraso>()
  for (const it of itens) {
    const nome = chave(it.servico)
    if (!grupos.has(nome)) grupos.set(nome, { nome, fila: 0, atraso: 0, atrasoLongo: 0, maisAntigo: 0 })
    const g = grupos.get(nome)!
    g.fila++
    if (situacao(it.saida, hoje) !== 'atraso') continue
    g.atraso++
    if (it.dias - PRAZO_DIAS > 30) g.atrasoLongo++
    g.maisAntigo = Math.max(g.maisAntigo, it.dias)
  }
  return [...grupos.values()]
}

// ── Retrabalho (precisou voltar à rua) ─────────────────────────────────────
// Unidade única (serviços): dos serviços com saída no período, quantos tiveram uma saída de
// reabertura no período. O site antigo dividia IDs reabertos por saídas.

export interface LinhaReabertura {
  nome: string
  servicos: number
  reabertos: number
  pct: number
}

/** Serviço que voltou à rua no período (a volta mais recente dele no período) */
export interface Voltou {
  servico: Servico
  /** idas à rua do serviço, desde sempre */
  idas: number
  /** retorno da ida anterior (quando foi dado como executado) */
  executadoEm: Dia | null
  /** saída da reabertura */
  voltouEm: Dia
}

/** Volta "rápida": até uma semana depois de dado como executado */
export const VOLTA_RAPIDA_DIAS = 7

export const MINIMO_REABERTURA = 10

function taxaReabertura(saidas: Saida[]) {
  const servicos = new Set<string>()
  const reabertos = new Set<string>()
  for (const s of saidas) {
    servicos.add(s.servico.chave)
    if (s.ordem > 1) reabertos.add(s.servico.chave)
  }
  return { servicos: servicos.size, reabertos: reabertos.size, pct: servicos.size ? (reabertos.size / servicos.size) * 100 : null }
}

function retrabalho(noPeriodo: Saida[], semCategoria: Saida[], noAnterior: Saida[] | null) {
  const total = taxaReabertura(noPeriodo)
  const previo = noAnterior ? taxaReabertura(noAnterior) : null

  // por categoria (sem o filtro de categoria: a escolhida aparece entre as demais)
  const porCat = new Map<string, Saida[]>()
  for (const s of semCategoria) {
    const nome = s.servico.categoria ?? 'Sem categoria'
    if (!porCat.has(nome)) porCat.set(nome, [])
    porCat.get(nome)!.push(s)
  }
  const categorias: LinhaReabertura[] = [...porCat].map(([nome, ss]) => {
    const t = taxaReabertura(ss)
    return { nome, servicos: t.servicos, reabertos: t.reabertos, pct: t.pct ?? 0 }
  })

  // serviços que voltaram no período: quem mais foi à rua primeiro
  const porServico = new Map<string, Voltou>()
  for (const s of noPeriodo) {
    if (s.ordem < 2) continue
    const atual = porServico.get(s.servico.chave)
    if (!atual || s.dataSaida > atual.voltouEm) {
      porServico.set(s.servico.chave, {
        servico: s.servico,
        idas: s.servico.saidas.length,
        executadoEm: s.servico.saidas[s.ordem - 2]?.dataRetorno ?? null,
        voltouEm: s.dataSaida,
      })
    }
  }

  // por serviço (a volta mais recente de cada um), na mesma unidade da taxa
  const voltaram = [...porServico.values()].sort((a, b) => b.idas - a.idas || b.voltouEm - a.voltouEm)
  const comIntervalo = voltaram.filter((v) => v.executadoEm !== null)
  const rapidas = comIntervalo.filter((v) => v.voltouEm - v.executadoEm! <= VOLTA_RAPIDA_DIAS).length

  return {
    ...total,
    previo,
    /** serviços com a execução anterior conhecida, e quantos voltaram em até VOLTA_RAPIDA_DIAS */
    comIntervalo: comIntervalo.length,
    rapidas,
    categorias: categorias.filter((l) => l.servicos >= MINIMO_REABERTURA).sort((a, b) => b.pct - a.pct || b.servicos - a.servicos),
    poucas: categorias.filter((l) => l.servicos < MINIMO_REABERTURA && l.reabertos > 0),
    voltaram,
  }
}

// ── Tendência mês a mês (mini-linhas dos indicadores) ─────────────────────

export interface MesPrazo {
  mes: ChaveMes
  parcial: boolean
  pctNoPrazo: number | null
  tempoMedio: number | null
  /** em atraso no fim do mês (no mês atual, hoje) */
  atraso: number
  pctReabertura: number | null
}

function serie(lugar: Saida[], por: ContarPor, hoje: Dia): MesPrazo[] {
  const ultimo = chaveMes(hoje)
  const primeiro = chaveMes(somarMeses(inicioDoMes(hoje), -12))
  const grupos = new Map<ChaveMes, Saida[]>()
  for (const s of lugar) {
    const d = por === 'saida' ? s.dataSaida : s.dataRetorno
    if (d === null) continue
    const k = chaveMes(d)
    if (k < primeiro || k > ultimo) continue
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(s)
  }
  const meses: MesPrazo[] = []
  for (let d = diaDaChave(primeiro); chaveMes(d) <= ultimo; d = somarMeses(d, 1)) {
    const k = chaveMes(d)
    const parcial = k === ultimo
    const fim = parcial ? hoje : fimDoMes(d)
    // atraso naquele dia: saiu, passou do prazo e ainda não tinha voltado
    let atraso = 0
    for (const s of lugar) if (s.dataSaida + PRAZO_DIAS < fim && (s.dataRetorno === null || s.dataRetorno > fim)) atraso++
    const ss = grupos.get(k) ?? []
    const ind = indicadores(ss)
    meses.push({ mes: k, parcial, pctNoPrazo: ind.pctNoPrazo, tempoMedio: ind.tempoMedio, atraso, pctReabertura: taxaReabertura(ss).pct })
  }
  // antes do 1º mês com dado a série não existe (não é zero)
  const ini = meses.findIndex((m) => (grupos.get(m.mes)?.length ?? 0) > 0)
  return ini < 0 ? [] : meses.slice(ini)
}

// ── Tudo da página ─────────────────────────────────────────────────────────

export function calcularPrazo(base: Base, f: Filtros, hoje: Dia) {
  const intervalo = intervaloDo(f.periodo, hoje)
  const anterior = intervaloAnterior(intervalo)
  const dentro = (s: Saida) => noIntervalo(s, intervalo, f.contarPor)
  const executada = (s: Saida) => s.dataRetorno !== null

  const lugar = filtrarLugar(base.saidas, f)
  const noPeriodo = lugar.filter(dentro)
  const noAnterior = anterior ? lugar.filter((s) => noIntervalo(s, anterior, f.contarPor)) : null
  const executadas = noPeriodo.filter(executada)

  // As quebras saem SEM o próprio filtro, para comparar: com uma região escolhida, mostram os
  // bairros dela (o escolhido em destaque); a categoria escolhida aparece entre as demais.
  const nivelBairro = f.regiao !== null
  const semLugar = filtrarLugar(base.saidas, nivelBairro ? { ...f, bairro: null } : { ...f, regiao: null, bairro: null })
  const chaveLugar = (s: Servico) => (nivelBairro ? s.bairro : s.regiao)
  const servicosDe = (ss: Saida[]) => [...new Set(ss.map((s) => s.servico))]

  const agora = calcularAgora(servicosDe(lugar), hoje)
  const agoraQuebra = calcularAgora(servicosDe(semLugar), hoje)
  const primeiraSaida = lugar.reduce((m, s) => Math.min(m, s.dataSaida), Infinity)

  return {
    intervalo,
    anterior,
    primeiraSaida: Number.isFinite(primeiraSaida) ? primeiraSaida : null,
    atual: indicadores(noPeriodo),
    previo: noAnterior ? indicadores(noAnterior) : null,
    agora: { fila: agora.total, atraso: agora.atraso, atrasoLongo: agora.itens.filter((i) => situacao(i.saida, hoje) === 'atraso' && i.dias - PRAZO_DIAS > 30).length },
    /** saídas do período que ainda não voltaram (contando pela saída, ficam fora da conta) */
    semRetorno: noPeriodo.length - executadas.length,
    distribuicao: distribuicao(executadas.map((s) => diasExecucao(s)!)),
    nivelBairro,
    faixas: linhasFaixas(semLugar.filter((s) => dentro(s) && executada(s)), chaveLugar),
    atrasos: linhasAtraso(agoraQuebra.itens, chaveLugar, hoje),
    retrabalho: retrabalho(noPeriodo, filtrarLugar(base.saidas, { ...f, categoria: null }).filter(dentro), noAnterior),
    serie: serie(lugar, f.contarPor, hoje),
  }
}

export type Prazo = ReturnType<typeof calcularPrazo>

/** Categoria de risco aparece com o raio nas listas */
export const ehRisco = (nome: string) => nome === CATEGORIA_RISCO

/** Situação atual do serviço (pela saída mais recente) — para a lista de retrabalho */
export const situacaoAtual = (s: Servico, hoje: Dia) => situacao(ultimaSaida(s.saidas), hoje)

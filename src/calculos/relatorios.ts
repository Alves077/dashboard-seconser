// Cálculos dos Relatórios. O mensal/histórico espelha o relatório do site antigo; os de abertos e a
// lista de campo partem da fila de hoje (não dependem do período).
import { CATEGORIA_RISCO, diasExecucao, FAIXAS, faixa, media, situacao } from '@/dados/regras'
import type { Base, Saida, Servico } from '@/dados/tipos'
import { PRAZO_DIAS } from '@/config'
import { filtrarLugar, type Filtros } from '@/filtros/filtros'
import { compararTexto } from '@/lib/formato'
import { chaveMes, diaDaChave, fimDoMes, somarMeses, type ChaveMes, type Dia } from '@/lib/datas'
import { calcularAgora, FAIXAS_ESPERA, type ItemFila } from './panorama'

// ── Relatório mensal / histórico completo (espelho do relatorio.js do site antigo) ───────────
// Unidade: saídas para a rua (1 linha da planilha), pela data de saída. "Abertos" e "em atraso" são a
// situação de hoje de cada saída. Mês: só meses fechados; histórico: tudo, com blocos a mais.

export interface GrupoMensal {
  nome: string
  total: number
  abertos: number
  atraso: number
  media: number | null
  pctFora: number | null
}

function agruparMensal(saidas: Saida[], chave: (s: Saida) => string, hoje: Dia): GrupoMensal[] {
  const g = new Map<string, { total: number; abertos: number; atraso: number; dias: number[] }>()
  for (const s of saidas) {
    const k = chave(s)
    if (!g.has(k)) g.set(k, { total: 0, abertos: 0, atraso: 0, dias: [] })
    const o = g.get(k)!
    o.total++
    const d = diasExecucao(s)
    if (d !== null) o.dias.push(d)
    else {
      o.abertos++
      if (situacao(s, hoje) === 'atraso') o.atraso++
    }
  }
  return [...g].map(([nome, o]) => ({
    nome,
    total: o.total,
    abertos: o.abertos,
    atraso: o.atraso,
    media: media(o.dias),
    pctFora: o.dias.length ? (o.dias.filter((d) => d > PRAZO_DIAS).length / o.dias.length) * 100 : null,
  }))
}

/** Concluídos: quantos, no prazo, tempo médio */
function qualidade(saidas: Saida[]) {
  const dias = saidas.map(diasExecucao).filter((d): d is number => d !== null)
  const noPrazo = dias.filter((d) => d <= PRAZO_DIAS).length
  return { concluidos: dias.length, noPrazo, pctNoPrazo: dias.length ? (noPrazo / dias.length) * 100 : null, media: media(dias) }
}

const abertasNoDia = (saidas: Saida[], dia: Dia) => saidas.filter((s) => s.dataSaida <= dia && (s.dataRetorno === null || s.dataRetorno > dia)).length

/** Meses fechados com saída (o mais recente primeiro) — opções do seletor */
export function mesesDoRelatorio(base: Base, hoje: Dia): ChaveMes[] {
  const atual = chaveMes(hoje)
  return [...new Set(base.saidas.map((s) => chaveMes(s.dataSaida)))].filter((k) => k < atual).sort((a, b) => b - a)
}

export interface MesHistorico {
  mes: ChaveMes
  registrados: number
  executados: number
  abertos: number
  media: number | null
  pctFora: number | null
  parcial: boolean
}

export function relatorioMensal(base: Base, f: Filtros, mes: ChaveMes | null, hoje: Dia) {
  const lugar = filtrarLugar(base.saidas, f)
  const todos = mes === null
  const doMes = (k: ChaveMes) => lugar.filter((s) => chaveMes(s.dataSaida) === k)
  const linhas = mes === null ? lugar : doMes(mes)

  const total = linhas.length
  const q = qualidade(linhas)
  const abertos = total - q.concluidos

  // reaberturas: serviços do recorte com mais de uma ida à rua (e quantas voltas, no total)
  const servicos = [...new Set(linhas.map((s) => s.servico))]
  const reabIds = servicos.filter((s) => s.saidas.length > 1).length
  const reabTotal = servicos.reduce((t, s) => t + Math.max(0, s.saidas.length - 1), 0)

  // mês: comparação com o mês anterior e movimento da fila
  let anterior: { mes: ChaveMes; media: number | null; pctNoPrazo: number | null } | null = null
  let movimento: { inicio: number; registrados: number; executados: number; doMes: number; fim: number; ini: Dia; fimDia: Dia } | null = null
  if (mes !== null) {
    const ini = diaDaChave(mes)
    const fimDia = fimDoMes(ini)
    const mesAnt = chaveMes(somarMeses(ini, -1))
    const qa = qualidade(doMes(mesAnt))
    if (qa.concluidos) anterior = { mes: mesAnt, media: qa.media, pctNoPrazo: qa.pctNoPrazo }
    const inicio = abertasNoDia(lugar, ini - 1)
    let executados = 0
    let execDoMes = 0
    for (const s of lugar) {
      const r = s.dataRetorno
      if (r === null || r < ini || r > fimDia) continue
      executados++
      if (s.dataSaida >= ini && s.dataSaida <= fimDia) execDoMes++
    }
    movimento = { inicio, registrados: total, executados, doMes: execDoMes, fim: inicio + total - executados, ini, fimDia }
  }

  const faixas = FAIXAS.map(() => 0)
  for (const s of linhas) {
    const fx = faixa(s)
    if (fx) faixas[FAIXAS.findIndex((x) => x.id === fx)]++
  }

  const catsTodas = agruparMensal(linhas, (s) => s.servico.categoria ?? 'Sem categoria', hoje).sort(
    (a, b) => b.total - a.total || compararTexto(a.nome, b.nome),
  )
  // no histórico, as 8 maiores e o resto numa linha (senão a página estoura)
  const categorias = todos ? catsTodas.slice(0, 8) : catsTodas
  const caudaLista = todos ? catsTodas.slice(8) : []
  const cauda = caudaLista.length
    ? { n: caudaLista.length, total: caudaLista.reduce((t, c) => t + c.total, 0), abertos: caudaLista.reduce((t, c) => t + c.abertos, 0) }
    : null
  const regioes = agruparMensal(linhas, (s) => s.servico.regiao || 'Sem região', hoje).sort((a, b) => b.total - a.total)

  // bairros: volume e backlog (proporção ainda pendente, só com volume mínimo — senão bairros grandes
  // aparecem no topo só por terem mais gente esperando em números absolutos)
  const minimoBacklog = todos ? 50 : 15
  const bairrosTodos = agruparMensal(linhas, (s) => s.servico.bairro, hoje)
  const bairrosVolume = [...bairrosTodos].sort((a, b) => b.total - a.total).slice(0, 8)
  const bairrosBacklog = bairrosTodos
    .filter((b) => b.total >= minimoBacklog)
    .sort((a, b) => b.abertos / b.total - a.abertos / a.total)
    .slice(0, 8)

  // só no histórico completo
  let historico: {
    meses: number
    ultimoFechado: MesHistorico | null
    fila: { espera: number[]; total: number; acima150: number }
    ultimos3: (MesHistorico & { filaFim: number; saldo: number })[]
    serie: MesHistorico[]
    maisAntigos: ItemFila[]
  } | null = null
  if (todos) {
    const abertasHoje = lugar.filter((s) => s.dataRetorno === null)
    const espera = FAIXAS_ESPERA.map(() => 0)
    let acima150 = 0
    for (const s of abertasHoje) {
      const d = hoje - s.dataSaida
      if (d > 150) acima150++
      espera[FAIXAS_ESPERA.findIndex((x) => d <= x.max)]++
    }
    const porMes = new Map<ChaveMes, Saida[]>()
    for (const s of lugar) {
      const k = chaveMes(s.dataSaida)
      if (!porMes.has(k)) porMes.set(k, [])
      porMes.get(k)!.push(s)
    }
    const atual = chaveMes(hoje)
    const serie: MesHistorico[] = [...porMes]
      .sort((a, b) => a[0] - b[0])
      .map(([k, ss]) => {
        const qm = qualidade(ss)
        return {
          mes: k,
          registrados: ss.length,
          executados: qm.concluidos,
          abertos: ss.length - qm.concluidos,
          media: qm.media,
          pctFora: qm.concluidos ? ((qm.concluidos - qm.noPrazo) / qm.concluidos) * 100 : null,
          parcial: k >= atual,
        }
      })
    const ultimos3 = serie.slice(-3).map((m) => {
      const ini = diaDaChave(m.mes)
      const fimDia = Math.min(fimDoMes(ini), hoje)
      const execNoMes = lugar.filter((s) => s.dataRetorno !== null && s.dataRetorno >= ini && s.dataRetorno <= fimDia).length
      return { ...m, filaFim: abertasNoDia(lugar, fimDia), saldo: m.registrados - execNoMes }
    })
    historico = {
      meses: serie.length,
      ultimoFechado: [...serie].reverse().find((m) => m.mes < atual && m.media !== null) ?? null,
      fila: { espera, total: abertasHoje.length, acima150 },
      ultimos3,
      serie,
      maisAntigos: calcularAgora([...new Set(lugar.map((s) => s.servico))], hoje).itens.slice(0, 8),
    }
  }

  return {
    todos,
    mes,
    total,
    ...q,
    abertos,
    reabIds,
    reabTotal,
    anterior,
    movimento,
    faixas,
    categorias,
    cauda,
    regioes,
    minimoBacklog,
    bairrosVolume,
    bairrosBacklog,
    historico,
  }
}

export type RelatorioMensal = ReturnType<typeof relatorioMensal>

// ── Serviços em aberto (espelho do tratamento_manual/relatorio_abertos.py) ──────────────────
// Unidade: saídas sem retorno (o que está na rua hoje); espera = dias desde o registro (data de saída).

export interface ItemAberto {
  saida: Saida
  servico: Servico
  dias: number
}

export interface LinhaLugarAberto {
  nome: string
  abertos: number
  media: number
  mais30: number
  maisAntigo: number
}

export interface LinhaSimplesAberto {
  nome: string
  abertos: number
  media: number
}

/** As maiores e o resto numa linha "Demais (n)", como no script (senão a página estoura) */
function tabelaSimples(itens: ItemAberto[], chave: (s: Servico) => string, limite = 6): LinhaSimplesAberto[] {
  const g = new Map<string, number[]>()
  for (const it of itens) {
    const k = chave(it.servico) || '—'
    if (!g.has(k)) g.set(k, [])
    g.get(k)!.push(it.dias)
  }
  let linhas = [...g].sort((a, b) => b[1].length - a[1].length || compararTexto(a[0], b[0]))
  if (linhas.length > limite + 1) {
    const cauda = linhas.slice(limite).flatMap(([, d]) => d)
    linhas = [...linhas.slice(0, limite), [`Demais (${linhas.length - limite})`, cauda]]
  }
  return linhas.map(([nome, d]) => ({ nome, abertos: d.length, media: d.reduce((a, b) => a + b, 0) / d.length }))
}

/** Origem como no script: "Cidadão", o nome do vereador, ou o detalhe da origem */
export const origemTexto = (s: Servico) => (s.origem === 'Cidadão' ? 'Cidadão' : s.vereador || s.origemDetalhe || s.origem)

export function relatorioAbertos(base: Base, f: Filtros, hoje: Dia) {
  const abertasCidade = base.saidas.filter((s) => s.dataRetorno === null)
  const itens: ItemAberto[] = filtrarLugar(abertasCidade, f).map((s) => ({ saida: s, servico: s.servico, dias: hoje - s.dataSaida }))
  const n = itens.length
  const filtrado = !!(f.regiao || f.bairro || f.categoria || f.origem)
  const porBairro = !!(f.regiao || f.bairro)

  const atraso = itens.filter((it) => situacao(it.saida, hoje) === 'atraso').length
  const media = n ? itens.reduce((t, it) => t + it.dias, 0) / n : 0
  const maisAntigo = n ? Math.max(...itens.map((it) => it.dias)) : 0
  const registroMaisAntigo = n ? Math.min(...itens.map((it) => it.saida.dataSaida)) : null
  const institucionais = itens.filter((it) => it.servico.origem !== 'Cidadão')
  const mais30 = itens.filter((it) => it.dias > 30).length

  const espera = FAIXAS_ESPERA.map(() => 0)
  for (const it of itens) espera[FAIXAS_ESPERA.findIndex((x) => it.dias <= x.max)]++

  const grupos = new Map<string, number[]>()
  for (const it of itens) {
    const k = (porBairro ? it.servico.bairro : it.servico.regiao) || '—'
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(it.dias)
  }
  const lugares: LinhaLugarAberto[] = [...grupos]
    .sort((a, b) => b[1].length - a[1].length || compararTexto(a[0], b[0]))
    .map(([nome, d]) => ({
      nome,
      abertos: d.length,
      media: d.reduce((a, b) => a + b, 0) / d.length,
      mais30: d.filter((x) => x > 30).length,
      maisAntigo: Math.max(...d),
    }))

  // mês de registro
  const porMes = new Map<ChaveMes, number>()
  for (const it of itens) {
    const k = chaveMes(it.saida.dataSaida)
    porMes.set(k, (porMes.get(k) ?? 0) + 1)
  }

  const vereadores = new Map<string, number>()
  for (const it of institucionais) if (it.servico.vereador) vereadores.set(it.servico.vereador, (vereadores.get(it.servico.vereador) ?? 0) + 1)

  return {
    n,
    totalCidade: abertasCidade.length,
    filtrado,
    /** quem "concentra" no texto de abertura: o bairro, a região ou o recorte */
    nome: f.bairro ?? f.regiao ?? 'O recorte',
    porBairro,
    atraso,
    media,
    maisAntigo,
    registroMaisAntigo,
    institucionais: institucionais.length,
    mais30,
    espera,
    lugares,
    tres: lugares.slice(0, 3),
    meses: [...porMes].sort((a, b) => a[0] - b[0]),
    categorias: tabelaSimples(itens, (s) => s.categoria ?? 'Sem categoria'),
    origens: tabelaSimples(itens, (s) => s.origem),
    vereadores: [...vereadores].sort((a, b) => b[1] - a[1] || compararTexto(a[0], b[0])),
    antigos: [...itens].sort((a, b) => b.dias - a.dias || a.servico.idColab - b.servico.idColab).slice(0, filtrado ? 10 : 8),
  }
}

export type RelatorioAbertos = ReturnType<typeof relatorioAbertos>

// ── Lista de campo ─────────────────────────────────────────────────────────
// Região (mais serviços primeiro) → bairro (ordem alfabética, para achar rápido) → mais antigos primeiro.

export interface BairroCampo {
  nome: string
  itens: ItemFila[]
}

export interface RegiaoCampo {
  nome: string
  total: number
  bairros: BairroCampo[]
}

export function listaCampo(base: Base, f: Filtros, hoje: Dia, soAtraso: boolean): { regioes: RegiaoCampo[]; total: number; risco: number } {
  const lugar = filtrarLugar(base.saidas, f)
  const { itens } = calcularAgora([...new Set(lugar.map((s) => s.servico))], hoje)
  const escolhidos = soAtraso ? itens.filter((i) => i.saida.dataSaida + PRAZO_DIAS < hoje) : itens
  const porRegiao = new Map<string, Map<string, ItemFila[]>>()
  for (const it of escolhidos) {
    const r = it.servico.regiao || 'Sem região'
    if (!porRegiao.has(r)) porRegiao.set(r, new Map())
    const b = porRegiao.get(r)!
    if (!b.has(it.servico.bairro)) b.set(it.servico.bairro, [])
    b.get(it.servico.bairro)!.push(it)
  }
  const regioes = [...porRegiao].map(([nome, bairros]) => ({
    nome,
    total: [...bairros.values()].reduce((t, l) => t + l.length, 0),
    bairros: [...bairros]
      .map(([b, lista]) => ({ nome: b, itens: lista.sort((x, y) => y.dias - x.dias) }))
      .sort((x, y) => compararTexto(x.nome, y.nome)),
  }))
  regioes.sort((a, b) => b.total - a.total || compararTexto(a.nome, b.nome))
  return { regioes, total: escolhidos.length, risco: escolhidos.filter((i) => i.servico.categoria === CATEGORIA_RISCO).length }
}

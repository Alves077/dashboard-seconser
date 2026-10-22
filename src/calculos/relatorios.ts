// Cálculos dos Relatórios. O mensal/histórico espelha o relatório do site antigo; os de abertos e a
// lista de campo partem da fila de hoje (não dependem do período).
import { CATEGORIA_RISCO, diasExecucao, FAIXAS, faixa, media, situacao } from '@/dados/regras'
import type { Base, Saida, Servico } from '@/dados/tipos'
import { PRAZO_DIAS } from '@/config'
import { filtrarLugar, noIntervalo, type Filtros, type Intervalo } from '@/filtros/filtros'
import { distanciaM, RAIO_PERTO_M } from '@/lib/geo'
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
  /** executados NO mês (pela data de retorno, de qualquer mês de saída) — gráfico saídas × retornos */
  retornos: number
  /** pendentes no último dia do mês (ou hoje, no mês em curso), de qualquer mês de saída — o estoque */
  filaFim: number
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
    const retornosNoMes = new Map<ChaveMes, number>()
    for (const s of lugar) if (s.dataRetorno !== null) retornosNoMes.set(chaveMes(s.dataRetorno), (retornosNoMes.get(chaveMes(s.dataRetorno)) ?? 0) + 1)
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
          retornos: retornosNoMes.get(k) ?? 0,
          filaFim: abertasNoDia(lugar, Math.min(fimDoMes(diaDaChave(k)), hoje)),
        }
      })
    // saldo do mês: saíram − executados no mês (vermelho na tabela quando a fila cresceu)
    const ultimos3 = serie.slice(-3).map((m) => ({ ...m, saldo: m.registrados - m.retornos }))
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

/**
 * `saida` = quando saíram para a rua (seletor da própria aba; null = qualquer data). O período global do site
 * não vale aqui: com o padrão "últimos 30 dias", a fila esconderia justamente os pedidos parados há mais tempo.
 */
export function relatorioAbertos(base: Base, f: Filtros, hoje: Dia, saida: Intervalo | null = null) {
  const abertasCidade = base.saidas.filter((s) => s.dataRetorno === null)
  const itens: ItemAberto[] = filtrarLugar(abertasCidade, f)
    .filter((s) => saida === null || noIntervalo(s, saida, 'saida'))
    .map((s) => ({ saida: s, servico: s.servico, dias: hoje - s.dataSaida }))
  const n = itens.length
  const filtrado = !!(f.regiao || f.bairro || f.categoria || f.origem || f.quem || saida)
  // a tabela de distribuição desce um nível em relação ao filtro: cidade → regiões, região → bairros, bairro → ruas
  // (com um bairro só, "por bairro" virava uma linha igual ao total — usuário, 21/10/2026)
  const nivel: 'regiao' | 'bairro' | 'rua' = f.bairro ? 'rua' : f.regiao ? 'bairro' : 'regiao'

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
    const k = (nivel === 'rua' ? it.servico.rua || 'Rua não identificada' : nivel === 'bairro' ? it.servico.bairro : it.servico.regiao) || '—'
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(it.dias)
  }
  const linha = (nome: string, d: number[]): LinhaLugarAberto => ({
    nome,
    abertos: d.length,
    media: d.reduce((a, b) => a + b, 0) / d.length,
    mais30: d.filter((x) => x > 30).length,
    maisAntigo: Math.max(...d),
  })
  let lugares: LinhaLugarAberto[] = [...grupos].sort((a, b) => b[1].length - a[1].length || compararTexto(a[0], b[0])).map(([nome, d]) => linha(nome, d))
  // ruas: um bairro pode ter dezenas, quase todas com 1 pedido — as 10 com mais pedidos e o resto somado
  const MAX_RUAS = 10
  if (nivel === 'rua' && lugares.length > MAX_RUAS + 1) {
    const resto = [...grupos].sort((a, b) => b[1].length - a[1].length || compararTexto(a[0], b[0])).slice(MAX_RUAS)
    lugares = [...lugares.slice(0, MAX_RUAS), linha(`Demais (${resto.length} ruas)`, resto.flatMap(([, d]) => d))]
  }

  // mês de registro
  const porMes = new Map<ChaveMes, number>()
  for (const it of itens) {
    const k = chaveMes(it.saida.dataSaida)
    porMes.set(k, (porMes.get(k) ?? 0) + 1)
  }

  const vereadores = new Map<string, number>()
  for (const it of institucionais) if (it.servico.vereador) vereadores.set(it.servico.vereador, (vereadores.get(it.servico.vereador) ?? 0) + 1)

  // época escolhida (7/30/90 dias, este ano, um mês; usuário, 21/10/2026): o relatório conta os que saíram nela e quantos
  // seguem em aberto — "concentra N dos M em aberto na cidade" comparava a época com a fila inteira — e esconde o que a
  // época não deixa acontecer (nos últimos 7 dias ninguém espera mais de 6: "16 a 30", "> 30 dias" dariam zero; em
  // setembro, visto em 21/10, ninguém espera menos de 21: "Até 5 dias" daria zero e "em atraso" sempre 100%)
  const epoca = saida
    ? {
        saiu: filtrarLugar(base.saidas, f).filter((s) => noIntervalo(s, saida, 'saida')).length,
        /** a menor e a maior espera possíveis na época (de quem saiu no último e no primeiro dia dela) */
        esperaMin: saida.ate === null ? 0 : Math.max(0, hoje - saida.ate),
        esperaMax: saida.de === null ? Infinity : hoje - saida.de,
      }
    : null

  return {
    n,
    totalCidade: abertasCidade.length,
    epoca,
    filtrado,
    /** quem "concentra" no texto de abertura: o bairro, a região ou o recorte */
    nome: f.bairro ?? f.regiao ?? 'O recorte',
    nivel,
    atraso,
    media,
    maisAntigo,
    registroMaisAntigo,
    institucionais: institucionais.length,
    mais30,
    espera,
    lugares,
    tres: lugares.filter((l) => !l.nome.startsWith('Demais (')).slice(0, 3),
    meses: [...porMes].sort((a, b) => a[0] - b[0]),
    categorias: tabelaSimples(itens, (s) => s.categoria ?? 'Sem categoria'),
    origens: tabelaSimples(itens, (s) => s.origem),
    vereadores: [...vereadores].sort((a, b) => b[1] - a[1] || compararTexto(a[0], b[0])),
    antigos: [...itens].sort((a, b) => b.dias - a.dias || a.servico.idColab - b.servico.idColab).slice(0, filtrado ? 10 : 8),
    // modo "Hoje" (o que saiu para a rua no dia; usuário, 21/10/2026): espera e atraso dão zero, então o relatório mostra
    // o dia — quem está voltando à rua e quantos lugares foram atendidos. Sem "risco elétrico" (a categoria é mais o que
    // poderia ser do que o que é — a chefia estranharia) e sem a lista do que saiu (é a Lista de campo; estoura em mutirão)
    /** saídas de 2ª ida ou mais: serviço que voltou à rua */
    voltando: itens.filter((it) => it.saida.ordem > 1).length,
    /** quantos lugares do nível de baixo (bairros; ruas quando há um bairro escolhido) */
    atendidos: new Set(itens.map((it) => (nivel === 'rua' ? it.servico.rua || '—' : it.servico.bairro))).size,
  }
}

export type RelatorioAbertos = ReturnType<typeof relatorioAbertos>

/**
 * Faixas de espera que a época deixa acontecer (índice em FAIXAS_ESPERA e rótulo): nos últimos 7 dias a espera vai
 * até 6, então só "Até 5 dias" e "6 dias"; em setembro, visto em 21/10, de 21 a 50 — "21 a 30 dias" e "31 a 50 dias".
 * As faixas das pontas levam o rótulo cortado no que a época permite.
 */
export function faixasDaEpoca(esperaMin: number, esperaMax: number) {
  return FAIXAS_ESPERA.flatMap((fx, i) => {
    const de = i === 0 ? 0 : FAIXAS_ESPERA[i - 1].max + 1
    if (de > esperaMax || fx.max < esperaMin) return []
    if (de >= esperaMin && fx.max <= esperaMax) return [{ i, rotulo: fx.rotulo as string }]
    const a = Math.max(de, esperaMin)
    const b = Math.min(fx.max, esperaMax)
    return [{ i, rotulo: a === b ? `${a} dias` : b === Infinity ? `Mais de ${a - 1} dias` : `${a} a ${b} dias` }]
  })
}

/** o que a época deixa variar: "em atraso" (passou de 5 dias) e "acima de 30 dias"; sem época, os dois */
export function variaNaEpoca(ep: { esperaMin: number; esperaMax: number } | null) {
  const varia = (limite: number) => !ep || (ep.esperaMin <= limite && ep.esperaMax > limite)
  return { atraso: varia(PRAZO_DIAS), mais30: varia(30) }
}

// ── Lista de campo ─────────────────────────────────────────────────────────
// Região (mais serviços primeiro) → bairro (ordem alfabética, para achar rápido) → grupos de pedidos PRÓXIMOS →
// mais antigos primeiro. Grupo (decisão do usuário, 17/10/2026): a equipe resolve o que está perto de uma vez. Pela
// distância e não pelo nome da rua — avenida/estrada longa tem o mesmo nome a quilômetros. O pedido mais antigo
// ainda sem grupo puxa todos a até 300 m dele (grupo de no máximo ~600 m de ponta a ponta, sem "corrente" que
// atravessa o bairro); sem pino, junta pela rua. Nome do grupo: a rua mais comum nele ("… e arredores" se houver outras).
// Ajustes de 20/10/2026 (mutirão de 75 saídas em Camboinhas): empate na espera começa pelo ponto mais denso, nome
// sem repetir no bairro, pedido sozinho vai para o grupo da mesma rua se estiver perto. Próximo passo: áreas com
// nome que a equipe usa (rascunho em saidas/relatorios/areas_bairros.xlsx, no projeto de dados).

export interface GrupoCampo {
  nome: string
  itens: ItemFila[]
}

export interface BairroCampo {
  nome: string
  /** todos os itens do bairro, na ordem dos grupos */
  itens: ItemFila[]
  grupos: GrupoCampo[]
}

const temPino = (it: ItemFila) => it.servico.lat !== null && it.servico.lng !== null
const distancia = (a: ItemFila, b: ItemFila) => distanciaM(a.servico.lat!, a.servico.lng!, b.servico.lat!, b.servico.lng!)
/** grupo que sobrou pequeno (até isto) é desfeito: cada pedido vai para o grupo de um vizinho próximo */
const GRUPO_PEQUENO = 2
/** …ou, sem vizinho a até 300 m, para o grupo da mesma rua a até isto */
const JUNTAR_MESMA_RUA_M = 500

/**
 * Nomes dos grupos de um bairro, sem repetir (antes, num mutirão em Camboinhas, dois grupos "Avenida Doutor Geraldo
 * de Melo Ourivio e arredores"): cada grupo leva a rua mais comum nele que ainda não deu nome a outro grupo; se todas
 * já deram, "(outro trecho)".
 */
function nomearGrupos(grupos: ItemFila[][]): GrupoCampo[] {
  const usados = new Set<string>()
  return grupos.map((itens) => {
    const contagem = new Map<string, number>()
    for (const it of itens) if (it.servico.rua) contagem.set(it.servico.rua, (contagem.get(it.servico.rua) ?? 0) + 1)
    const ruas = [...contagem].sort((a, b) => b[1] - a[1] || compararTexto(a[0], b[0])).map(([r]) => r)
    if (ruas.length === 0) ruas.push('Rua não identificada')
    const livre = ruas.find((r) => !usados.has(r))
    usados.add(livre ?? ruas[0])
    if (!temPino(itens[0])) return { nome: `${livre ?? ruas[0]} (sem pino no mapa)`, itens }
    const nome = livre ?? `${ruas[0]} (outro trecho)`
    return { nome: contagem.size > 1 ? `${nome} e arredores` : nome, itens }
  })
}

function porProximidade(lista: ItemFila[]): GrupoCampo[] {
  const perto = (a: ItemFila, b: ItemFila) =>
    temPino(a) ? temPino(b) && distancia(a, b) <= RAIO_PERTO_M : !temPino(b) && a.servico.rua === b.servico.rua
  // vizinhos de cada pedido, calculados uma vez (para achar o ponto mais denso)
  const vizinhos = new Map(lista.map((a) => [a, lista.filter((b) => b !== a && perto(a, b))]))
  const livres = new Set(lista)
  const grupos: ItemFila[][] = []
  while (livres.size > 0) {
    // 1º o que espera há mais tempo (como sempre). Empate — mutirão, todos saíram no mesmo dia — : o que tem mais
    // vizinhos ainda sem grupo. Antes o empate caía num pedido qualquer e os círculos de 300 m cortavam o bairro no meio.
    let semente: ItemFila | null = null
    let densidade = -1
    for (const it of livres) {
      const d = vizinhos.get(it)!.filter((v) => livres.has(v)).length
      if (!semente || it.dias > semente.dias || (it.dias === semente.dias && d > densidade)) {
        semente = it
        densidade = d
      }
    }
    const itens = [semente!, ...vizinhos.get(semente!)!.filter((v) => livres.has(v)).sort((x, y) => y.dias - x.dias)]
    for (const it of itens) livres.delete(it)
    grupos.push(itens)
  }
  // grupo que sobrou pequeno (1 ou 2 pedidos) é desfeito se der: cada pedido vai para o grupo do vizinho mais perto
  // a até 300 m (o círculo do outro grupo começou longe e não o alcançou — ex.: um pedido a 26 m de outro grupo) ou,
  // sem isso, para o grupo da mesma rua a até 500 m (a Rua da Graça se partia em dois)
  for (let i = grupos.length - 1; i >= 0; i--) {
    if (grupos[i].length > GRUPO_PEQUENO) continue
    const ficam: ItemFila[] = []
    for (const it of grupos[i]) {
      if (!temPino(it)) {
        ficam.push(it)
        continue
      }
      let destino: ItemFila[] | null = null
      let perto = RAIO_PERTO_M
      let mesmaRua: ItemFila[] | null = null
      let pertoRua = JUNTAR_MESMA_RUA_M
      for (const g of grupos) {
        if (g === grupos[i] || g.length <= GRUPO_PEQUENO) continue
        for (const outro of g) {
          if (!temPino(outro)) continue
          const d = distancia(it, outro)
          if (d <= perto) [perto, destino] = [d, g]
          if (it.servico.rua && outro.servico.rua === it.servico.rua && d <= pertoRua) [pertoRua, mesmaRua] = [d, g]
        }
      }
      const alvo = destino ?? mesmaRua
      if (alvo) alvo.push(it)
      else ficam.push(it)
    }
    if (ficam.length) grupos[i] = ficam
    else grupos.splice(i, 1)
  }
  return nomearGrupos(grupos)
}

export interface RegiaoCampo {
  nome: string
  total: number
  bairros: BairroCampo[]
}

/** `saida` como em relatorioAbertos: quando a saída em aberto foi para a rua (null = qualquer data) */
export function listaCampo(
  base: Base,
  f: Filtros,
  hoje: Dia,
  soAtraso: boolean,
  saida: Intervalo | null = null,
): { regioes: RegiaoCampo[]; total: number; risco: number } {
  const lugar = filtrarLugar(base.saidas, f)
  const { itens } = calcularAgora([...new Set(lugar.map((s) => s.servico))], hoje)
  const escolhidos = itens.filter(
    (i) => (!soAtraso || i.saida.dataSaida + PRAZO_DIAS < hoje) && (saida === null || noIntervalo(i.saida, saida, 'saida')),
  )
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
      .map(([b, lista]) => {
        const grupos = porProximidade(lista)
        return { nome: b, grupos, itens: grupos.flatMap((g) => g.itens) }
      })
      .sort((x, y) => compararTexto(x.nome, y.nome)),
  }))
  regioes.sort((a, b) => b.total - a.total || compararTexto(a.nome, b.nome))
  return { regioes, total: escolhidos.length, risco: escolhidos.filter((i) => i.servico.categoria === CATEGORIA_RISCO).length }
}

// Página Vereadores: O QUE cada vereador pediu e em que pé está — não "quem é atendido mais rápido".
// Limites (decisão de 13/10/2026; página pública): sem % no prazo, sem cores de bom/ruim e sem comparação
// entre vereadores; ordem pelo número de pedidos. O tempo médio até a execução entra SÓ no perfil de cada
// um, sem comparação (pedido do usuário, 14/10/2026). Prazo é desempenho da SECONSER (equipe, chuva,
// programa de LED), não de quem pediu — lado a lado por vereador seria lido como favorecimento.
//
// Unidade: o PEDIDO (serviço), não a saída. Pedido "no período" = serviço com alguma saída no período
// (pela data escolhida em "contar por"). "Em aberto" = fila de hoje (não depende do período).
// Valem os filtros de lugar e categoria; a origem é sempre "Vereador" aqui.
import { emAberto, quemDe, SEM_VEREADOR, ultimaSaida } from '@/dados/regras'
import type { Base, Servico, Vereador } from '@/dados/tipos'
import { filtrarLugar, intervaloDo, noIntervalo, type Filtros, type Intervalo } from '@/filtros/filtros'
import { calcularAgora, indicadores } from './panorama'
import { chaveMes, diaDaChave, inicioDoMes, somarMeses, type ChaveMes, type Dia } from '@/lib/datas'
import { compararTexto } from '@/lib/formato'

export const ORIGEM_VEREADOR = 'Vereador'
/** Detalhe da origem das indicações legislativas (no Colab: tag 3067; aqui pelo rótulo do tratamento) */
const INDICACAO_LEGISLATIVA = 'Indicação legislativa'

export interface LinhaVereador {
  nome: string
  /** null = "Sem vereador identificado" */
  vereador: Vereador | null
  /** pedidos com saída no período */
  pedidos: number
  /** desses, os que já foram executados (a última saída voltou) */
  executados: number
  /** em aberto hoje (qualquer data) */
  emAberto: number
  /** desses, indicações legislativas (pedido formal da Câmara: merece atenção) */
  indicacoesAbertas: number
}

export const ehIndicacao = (s: Servico) => s.origemDetalhe === INDICACAO_LEGISLATIVA

/** Serviços de vereador com os filtros de lugar e categoria (sem o "quem", sem o período) */
function servicosDeVereador(base: Base, f: Filtros, quem: string | null): Servico[] {
  const saidas = filtrarLugar(base.saidas, { ...f, origem: ORIGEM_VEREADOR, quem })
  return [...new Set(saidas.map((s) => s.servico))]
}

const noPeriodo = (s: Servico, i: Intervalo, f: Filtros) => s.saidas.some((x) => noIntervalo(x, i, f.contarPor))
const aberto = (s: Servico) => emAberto(ultimaSaida(s.saidas))

// ── Lista ──────────────────────────────────────────────────────────────────

export function calcularVereadores(base: Base, f: Filtros, hoje: Dia) {
  const intervalo = intervaloDo(f.periodo, hoje)
  const servicos = servicosDeVereador(base, f, null)
  const porNome = new Map(base.vereadores.map((v) => [v.nome, v]))
  const linhas = new Map<string, LinhaVereador>()
  for (const s of servicos) {
    const nome = quemDe(s) ?? SEM_VEREADOR
    if (!linhas.has(nome))
      linhas.set(nome, { nome, vereador: porNome.get(nome) ?? null, pedidos: 0, executados: 0, emAberto: 0, indicacoesAbertas: 0 })
    const l = linhas.get(nome)!
    const ab = aberto(s)
    if (noPeriodo(s, intervalo, f)) {
      l.pedidos++
      if (!ab) l.executados++
    }
    if (ab) {
      l.emAberto++
      if (ehIndicacao(s)) l.indicacoesAbertas++
    }
  }
  const ordem = [...linhas.values()]
    .filter((l) => l.pedidos > 0 || l.emAberto > 0)
    .sort((a, b) => b.pedidos - a.pedidos || b.emAberto - a.emAberto || compararTexto(a.nome, b.nome))
  const comNome = ordem.filter((l) => l.nome !== SEM_VEREADOR)
  const semNome = ordem.find((l) => l.nome === SEM_VEREADOR) ?? null

  // todos os pedidos do período (qualquer origem), para "N% dos pedidos"
  const todos = [...new Set(filtrarLugar(base.saidas, { ...f, origem: null, quem: null }).map((s) => s.servico))]
  const pedidosTodos = todos.filter((s) => noPeriodo(s, intervalo, f)).length
  const soma = (k: 'pedidos' | 'emAberto' | 'indicacoesAbertas') => ordem.reduce((t, l) => t + l[k], 0)

  return {
    intervalo,
    /** os que ganham cartão com foto (mais pedidos no período) */
    destaques: comNome.filter((l) => l.pedidos > 0).slice(0, 6),
    outros: comNome.filter((l) => l.pedidos > 0).slice(6).concat(comNome.filter((l) => l.pedidos === 0)),
    semNome,
    pedidos: soma('pedidos'),
    emAberto: soma('emAberto'),
    indicacoesAbertas: soma('indicacoesAbertas'),
    vereadoresComPedido: comNome.filter((l) => l.pedidos > 0).length,
    pedidosTodos,
  }
}

export type DadosVereadores = ReturnType<typeof calcularVereadores>

// ── Perfil de um vereador ─────────────────────────────────────────────────

export interface ContaNome {
  nome: string
  n: number
}

function contar(servicos: Servico[], chave: (s: Servico) => string): ContaNome[] {
  const m = new Map<string, number>()
  for (const s of servicos) m.set(chave(s), (m.get(chave(s)) ?? 0) + 1)
  return [...m].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n || compararTexto(a.nome, b.nome))
}

export function calcularPerfil(base: Base, f: Filtros, quem: string, hoje: Dia) {
  const intervalo = intervaloDo(f.periodo, hoje)
  const servicos = servicosDeVereador(base, f, quem)
  const doPeriodo = servicos.filter((s) => noPeriodo(s, intervalo, f))
  // tempo até a execução: as saídas do período (como no resto do site, conta cada ida à rua)
  const ind = indicadores(
    filtrarLugar(base.saidas, { ...f, origem: ORIGEM_VEREADOR, quem }).filter((s) => noIntervalo(s, intervalo, f.contarPor)),
    hoje,
  )

  // pedidos por mês: mês da 1ª saída (quando o pedido foi para a rua pela 1ª vez), desde o começo da base
  // (até 24 meses). Com só 13 meses, quem pediu muito no começo (ex.: jul–set/25) sumia do gráfico.
  const ultimo = chaveMes(hoje)
  const inicioBase = base.saidas.reduce((m, s) => Math.min(m, s.dataSaida), hoje)
  const primeiro = Math.max(chaveMes(inicioBase), chaveMes(somarMeses(inicioDoMes(hoje), -23)))
  const porMes = new Map<ChaveMes, number>()
  for (const s of servicos) {
    const k = chaveMes(s.saidas[0].dataSaida)
    if (k >= primeiro && k <= ultimo) porMes.set(k, (porMes.get(k) ?? 0) + 1)
  }
  const meses: { mes: ChaveMes; n: number; parcial: boolean }[] = []
  for (let d = diaDaChave(primeiro); chaveMes(d) <= ultimo; d = somarMeses(d, 1)) {
    const k = chaveMes(d)
    meses.push({ mes: k, n: porMes.get(k) ?? 0, parcial: k === ultimo })
  }

  const agora = calcularAgora(servicos, hoje)
  return {
    intervalo,
    vereador: base.vereadores.find((v) => v.nome === quem) ?? null,
    pedidos: doPeriodo.length,
    executados: doPeriodo.filter((s) => !aberto(s)).length,
    indicacoes: doPeriodo.filter(ehIndicacao).length,
    tempoMedio: ind.tempoMedio,
    tempoMediano: ind.tempoMediano,
    execucoes: ind.executadas,
    /** tempo médio provisório: muitos pedidos do período ainda em aberto */
    tempoProvisorio: ind.provisorio,
    emAberto: agora.total,
    /** desde o começo da base, com os mesmos filtros de lugar/categoria */
    total: servicos.length,
    primeiroPedido: servicos.length ? Math.min(...servicos.map((s) => s.saidas[0].dataSaida)) : null,
    meses,
    regioes: contar(doPeriodo, (s) => s.regiao),
    bairros: contar(doPeriodo, (s) => s.bairro),
    categorias: contar(doPeriodo, (s) => s.categoria ?? 'Sem categoria'),
    /** fila de hoje, mais antigos primeiro */
    abertos: agora.itens,
    indicacoesAbertas: agora.itens.filter((it) => ehIndicacao(it.servico)).length,
  }
}

export type PerfilVereador = ReturnType<typeof calcularPerfil>

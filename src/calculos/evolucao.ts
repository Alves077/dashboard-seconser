// Cálculos da página Evolução — "Está melhorando ou piorando?". Tudo dentro do período escolhido,
// cortado no último dia com dado (data da última carga), em blocos que dependem do tamanho dele:
//   até 14 dias  → dia a dia
//   até 190 dias → blocos de ~7 dias de tamanho IGUAL cobrindo o período inteiro (dia a dia, os fins de
//                  semana e os dias sem despacho viravam zeros e a linha um serrote; semana de calendário
//                  deixava pontas de 1–2 dias)
//   acima        → mês a mês (o mês atual, em curso)
// Por bloco: entraram (saídas), executados (retornos), fila (em aberto no fim do bloco), tempo médio e
// % no prazo dos executados no bloco. Por construção: fila no fim − fila no início = entraram − executados.
import { PRAZO_DIAS } from '@/config'
import { media, situacao } from '@/dados/regras'
import type { Base, Saida, Servico } from '@/dados/tipos'
import { filtrarLugar, intervaloAnterior, intervaloDo, type ContarPor, type Filtros } from '@/filtros/filtros'
import { LIMIAR_PROVISORIO } from './panorama'
import {
  chaveMes,
  diaDe,
  diaDaChave,
  fimDoMes,
  formatarDia,
  formatarDiaCurto,
  inicioDoMes,
  rotuloMes,
  rotuloMesLongo,
  somarMeses,
  type Dia,
} from '@/lib/datas'

export type Passo = 'dia' | 'semana' | 'mes'

export interface Bloco {
  ini: Dia
  fim: Dia
  /** rótulo do eixo (curto) */
  rotulo: string
  /** rótulo da dica (por extenso) */
  nome: string
  /** mês atual, ainda em curso */
  parcial: boolean
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const diaDaSemana = (d: Dia) => (((d + 4) % 7) + 7) % 7 // 01/01/1970 foi uma quinta

function escolherPasso(dias: number): Passo {
  if (dias <= 14) return 'dia'
  if (dias <= 190) return 'semana'
  return 'mes'
}

function montarBlocos(de: Dia, ate: Dia, passo: Passo, hoje: Dia): Bloco[] {
  const dias = ate - de + 1
  if (passo === 'dia') {
    return Array.from({ length: dias }, (_, i) => {
      const d = de + i
      return { ini: d, fim: d, rotulo: formatarDiaCurto(d), nome: `${DIAS_SEMANA[diaDaSemana(d)]}, ${formatarDia(d)}`, parcial: false }
    })
  }
  if (passo === 'semana') {
    // n blocos de tamanho igual (6 a 8 dias) cobrindo o período exato
    const n = Math.max(1, Math.round(dias / 7))
    const corte = (k: number) => de + Math.round((k * dias) / n)
    return Array.from({ length: n }, (_, k) => {
      const ini = corte(k)
      const fim = corte(k + 1) - 1
      return { ini, fim, rotulo: formatarDiaCurto(ini), nome: `${formatarDiaCurto(ini)} a ${formatarDiaCurto(fim)} (${fim - ini + 1} dias)`, parcial: false }
    })
  }
  const r: Bloco[] = []
  for (let m = inicioDoMes(de); m <= ate; m = somarMeses(m, 1)) {
    const k = chaveMes(m)
    const ini = Math.max(diaDaChave(k), de)
    const fim = Math.min(fimDoMes(m), ate)
    const inteiro = ini === diaDaChave(k) && fim === fimDoMes(m)
    r.push({
      ini,
      fim,
      rotulo: rotuloMes(k),
      nome: inteiro ? rotuloMesLongo(k) : `${rotuloMesLongo(k)} (${formatarDiaCurto(ini)} a ${formatarDiaCurto(fim)})`,
      parcial: fimDoMes(m) >= hoje,
    })
  }
  return r
}

/** Bloco com menos executados que isto não vira ponto de tempo médio / % no prazo (2 casos enganam) */
export const MINIMO_BLOCO = 5

export interface Ponto {
  entraram: number
  executados: number
  fila: number
  tempoMedio: number | null
  pctNoPrazo: number | null
  /** contando pela saída: dos que saíram no bloco, quantos ainda estão em aberto */
  abertos: number
  /** muita coisa do bloco ainda em aberto: o tempo médio ainda vai subir */
  provisorio: boolean
}

/**
 * Tempo médio e no prazo de um bloco. Pelo retorno (execução): os que voltaram no bloco, de qualquer mês de
 * saída. Pela saída: os que SAÍRAM no bloco — tempo médio só dos já executados (provisório se mais de 10%
 * ainda está em aberto) e no prazo = em até 5 dias ÷ (executados + em aberto já vencidos), a mesma regra do
 * Panorama e do Prazo (14/10/2026).
 */
function qualidade(dias: number[], vencidas: number) {
  const conta = dias.length >= MINIMO_BLOCO
  const decididas = dias.length + vencidas
  return {
    tempoMedio: conta ? media(dias) : null,
    pctNoPrazo: decididas >= MINIMO_BLOCO ? (dias.filter((d) => d <= PRAZO_DIAS).length / decididas) * 100 : null,
  }
}

function serie(saidas: Saida[], blocos: Bloco[], por: ContarPor, hoje: Dia): Ponto[] {
  const n = blocos.length
  const de = blocos[0].ini
  const ate = blocos[n - 1].fim
  const qual = (d: Dia) => blocos.findIndex((b) => d <= b.fim)
  const entraram = blocos.map(() => 0)
  const executados = blocos.map(() => 0)
  const dias: number[][] = blocos.map(() => [])
  const abertos = blocos.map(() => 0)
  const vencidas = blocos.map(() => 0)
  const fila = blocos.map(() => 0)
  for (const s of saidas) {
    const saiuNoPeriodo = s.dataSaida >= de && s.dataSaida <= ate
    if (saiuNoPeriodo) entraram[qual(s.dataSaida)]++
    const r = s.dataRetorno
    if (r !== null && r >= de && r <= ate) executados[qual(r)]++
    if (por === 'retorno') {
      if (r !== null && r >= de && r <= ate) dias[qual(r)].push(r - s.dataSaida)
    } else if (saiuNoPeriodo) {
      const i = qual(s.dataSaida)
      if (r !== null) dias[i].push(r - s.dataSaida)
      else {
        abertos[i]++
        if (situacao(s, hoje) === 'atraso') vencidas[i]++
      }
    }
    if (s.dataSaida > ate || (r !== null && r < de)) continue
    for (let i = 0; i < n; i++) {
      const f = blocos[i].fim
      if (s.dataSaida <= f && (r === null || r > f)) fila[i]++
    }
  }
  return blocos.map((_, i) => ({
    entraram: entraram[i],
    executados: executados[i],
    fila: fila[i],
    ...qualidade(dias[i], vencidas[i]),
    abertos: abertos[i],
    provisorio: por === 'saida' && entraram[i] > 0 && abertos[i] / entraram[i] > LIMIAR_PROVISORIO,
  }))
}

/** No prazo de uma janela inteira, pela regra do "Contar por" (ver qualidade) */
function qualidadeJanela(saidas: Saida[], de: Dia, ate: Dia, por: ContarPor, hoje: Dia) {
  const dias: number[] = []
  let vencidas = 0
  let executados = 0
  for (const s of saidas) {
    const r = s.dataRetorno
    if (r !== null && r >= de && r <= ate) executados++
    if (por === 'retorno') {
      if (r !== null && r >= de && r <= ate) dias.push(r - s.dataSaida)
    } else if (s.dataSaida >= de && s.dataSaida <= ate) {
      if (r !== null) dias.push(r - s.dataSaida)
      else if (situacao(s, hoje) === 'atraso') vencidas++
    }
  }
  const decididas = dias.length + vencidas
  return { executados, pctNoPrazo: decididas ? (dias.filter((d) => d <= PRAZO_DIAS).length / decididas) * 100 : null }
}

const abertasEm = (saidas: Saida[], dia: Dia) => saidas.filter((s) => s.dataSaida <= dia && (s.dataRetorno === null || s.dataRetorno > dia)).length

// ── Saldo por região/bairro ────────────────────────────────────────────────

export interface LinhaSaldo {
  nome: string
  entraram: number
  executados: number
  /** entraram − executados = quanto a fila cresceu (+) ou diminuiu (−) no período */
  saldo: number
  filaInicio: number
  filaFim: number
}

function saldos(saidas: Saida[], de: Dia, ate: Dia, chave: (s: Servico) => string): LinhaSaldo[] {
  const g = new Map<string, LinhaSaldo>()
  const pegar = (n: string) => {
    if (!g.has(n)) g.set(n, { nome: n, entraram: 0, executados: 0, saldo: 0, filaInicio: 0, filaFim: 0 })
    return g.get(n)!
  }
  for (const s of saidas) {
    const r = s.dataRetorno
    const l = pegar(chave(s.servico))
    if (s.dataSaida >= de && s.dataSaida <= ate) l.entraram++
    if (r !== null && r >= de && r <= ate) l.executados++
    if (s.dataSaida < de && (r === null || r >= de)) l.filaInicio++
    if (s.dataSaida <= ate && (r === null || r > ate)) l.filaFim++
  }
  return [...g.values()]
    .map((l) => ({ ...l, saldo: l.entraram - l.executados }))
    .filter((l) => l.entraram || l.executados || l.filaInicio || l.filaFim)
}

// ── Categorias: o que mudou (entradas no período × no período anterior) ───

export interface LinhaCategoria {
  nome: string
  atual: number
  anterior: number | null
}

function categorias(saidas: Saida[], de: Dia, ate: Dia, ant: { de: Dia; ate: Dia } | null): LinhaCategoria[] {
  const g = new Map<string, LinhaCategoria>()
  const pegar = (n: string) => {
    if (!g.has(n)) g.set(n, { nome: n, atual: 0, anterior: ant ? 0 : null })
    return g.get(n)!
  }
  for (const s of saidas) {
    const nome = s.servico.categoria ?? 'Sem categoria'
    if (s.dataSaida >= de && s.dataSaida <= ate) pegar(nome).atual++
    else if (ant && s.dataSaida >= ant.de && s.dataSaida <= ant.ate) pegar(nome).anterior! += 1
  }
  return [...g.values()].sort((a, b) => b.atual - a.atual || (b.anterior ?? 0) - (a.anterior ?? 0))
}

// ── Tudo da página ─────────────────────────────────────────────────────────

export function calcularEvolucao(base: Base, f: Filtros, hoje: Dia) {
  const lugar = filtrarLugar(base.saidas, f)
  const periodo = intervaloDo(f.periodo, hoje)
  const todo = periodo.de === null
  const primeira = lugar.reduce((m, s) => Math.min(m, s.dataSaida), Infinity)
  const de = periodo.de ?? (Number.isFinite(primeira) ? primeira : hoje)
  // não há dado depois da última carga (nem no futuro): o período termina no último dia com dado —
  // senão os dias seguintes viram "zero saídas" que não aconteceram
  const ultimoDia = base.atualizadoEm
    ? diaDe(base.atualizadoEm.getFullYear(), base.atualizadoEm.getMonth(), base.atualizadoEm.getDate())
    : hoje
  const limite = Math.min(hoje, ultimoDia)
  const ate = Math.max(de, Math.min(periodo.ate ?? limite, limite))
  const dias = ate - de + 1
  const passo = escolherPasso(dias)
  const blocos = montarBlocos(de, ate, passo, hoje)
  const pontos = serie(lugar, blocos, f.contarPor, hoje)

  // comparação justa: se o período foi cortado no último dia com dado, compara com a mesma
  // quantidade de dias logo antes (e não com o período anterior inteiro)
  const cortado = periodo.ate !== null && ate < periodo.ate
  const anterior = todo ? null : cortado ? { de: de - dias, ate: de - 1, parcial: false, rotulo: '' } : intervaloAnterior(periodo)
  const janelaAnterior = anterior ? { de: anterior.de!, ate: Math.min(anterior.ate!, limite) } : null
  const somaAnterior = janelaAnterior
    ? (() => {
        const q = qualidadeJanela(lugar, janelaAnterior.de, janelaAnterior.ate, f.contarPor, hoje)
        let entraram = 0
        for (const s of lugar) if (s.dataSaida >= janelaAnterior.de && s.dataSaida <= janelaAnterior.ate) entraram++
        return { entraram, executados: q.executados, pctNoPrazo: q.pctNoPrazo }
      })()
    : null

  // o período inteiro (mesma regra dos blocos)
  const qTotal = qualidadeJanela(lugar, de, ate, f.contarPor, hoje)

  const nivelBairro = f.regiao !== null
  const semLugar = filtrarLugar(base.saidas, nivelBairro ? { ...f, bairro: null } : { ...f, regiao: null, bairro: null })

  return {
    periodo,
    todo,
    de,
    ate,
    dias,
    passo,
    blocos,
    pontos,
    /** último dia com dado e se ele encurtou o período (carga atrasada) */
    ultimoDia: limite,
    cortadoPelaCarga: cortado && limite < hoje,
    total: {
      entraram: pontos.reduce((t, p) => t + p.entraram, 0),
      executados: qTotal.executados,
      pctNoPrazo: qTotal.pctNoPrazo,
      /** "todo o período" começa do zero: não há fila no início para comparar */
      filaInicio: todo ? null : abertasEm(lugar, de - 1),
      filaFim: pontos[pontos.length - 1]?.fila ?? 0,
    },
    anterior: somaAnterior,
    /** o período de mesmo tamanho logo antes (para "vs. set/26") */
    periodoAnterior: anterior,
    /** os dias exatos comparados (cortados no último dia com dado), para escrever as datas */
    janelaAnterior,
    nivelBairro,
    saldos: saldos(semLugar, de, ate, (s) => (nivelBairro ? s.bairro : s.regiao)),
    categorias: categorias(filtrarLugar(base.saidas, { ...f, categoria: null }), de, ate, janelaAnterior),
  }
}

export type Evolucao = ReturnType<typeof calcularEvolucao>

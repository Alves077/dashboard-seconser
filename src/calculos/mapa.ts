// Cálculos do Mapa: UM pino por serviço (situação da saída mais recente) — o site antigo punha um
// pino por saída, e o serviço reaberto aparecia 2–3 vezes no mesmo lugar.
import { CATEGORIA_RISCO, diasEmAberto, emAberto, situacao, ultimaSaida } from '@/dados/regras'
import type { Base, Saida, Servico, Situacao } from '@/dados/tipos'
import { filtrarLugar, intervaloDo, noIntervalo, type Filtros, type Intervalo } from '@/filtros/filtros'
import { compararTexto } from '@/lib/formato'
import type { Dia } from '@/lib/datas'

/** O que o mapa mostra (controle próprio da página, ?mostrar=) */
export type Mostrar = 'abertos' | 'atraso' | 'executados' | 'todos'

export const OPCOES_MOSTRAR: { id: Mostrar; rotulo: string; usaPeriodo: boolean }[] = [
  // abertos/em atraso também respeitam o período (decisão de 14/10/2026): os em aberto hoje que SAÍRAM
  // para a rua no período; com "Todo o período", a fila inteira. O painel avisa quantos a fila toda tem.
  { id: 'abertos', rotulo: 'Abertos', usaPeriodo: true },
  { id: 'atraso', rotulo: 'Em atraso', usaPeriodo: true },
  { id: 'executados', rotulo: 'Executados no período', usaPeriodo: true },
  { id: 'todos', rotulo: 'Todos do período', usaPeriodo: true },
]

/** Caixa de Niterói (do site antigo): pino fora dela é coordenada errada, não entra no mapa */
const NITEROI = { latMin: -23.0, latMax: -22.82, lngMin: -43.15, lngMax: -42.95 }
export const CENTRO_NITEROI: [number, number] = [-22.91, -43.085]

const coordenadaValida = (lat: number | null, lng: number | null): boolean =>
  lat !== null &&
  lng !== null &&
  lat >= NITEROI.latMin &&
  lat <= NITEROI.latMax &&
  lng >= NITEROI.lngMin &&
  lng <= NITEROI.lngMax

export interface Ponto {
  servico: Servico
  saida: Saida
  situacao: Situacao
  /** dias em aberto (abertos) ou de execução (executados) */
  dias: number
  risco: boolean
  lat: number
  lng: number
}

export interface Contagem {
  nome: string
  total: number
  atraso: number
}

function contar(pontos: Ponto[], chave: (p: Ponto) => string): Contagem[] {
  const m = new Map<string, Contagem>()
  for (const p of pontos) {
    const n = chave(p)
    const c = m.get(n) ?? { nome: n, total: 0, atraso: 0 }
    c.total++
    if (p.situacao === 'atraso') c.atraso++
    m.set(n, c)
  }
  return [...m.values()].sort((a, b) => b.total - a.total || compararTexto(a.nome, b.nome))
}

/** Serviços que entram conforme "mostrar" (já com filtros de lugar/categoria/origem) */
function selecionar(servicos: Servico[], mostrar: Mostrar, i: Intervalo, f: Filtros, hoje: Dia): { servico: Servico; saida: Saida }[] {
  const r: { servico: Servico; saida: Saida }[] = []
  for (const s of servicos) {
    const u = ultimaSaida(s.saidas)
    if (mostrar === 'abertos' || mostrar === 'atraso') {
      if (!emAberto(u)) continue
      if (mostrar === 'atraso' && situacao(u, hoje) !== 'atraso') continue
      // em aberto não tem data de retorno: o período conta pela saída (a que está na rua agora)
      if (!noIntervalo(u, i, 'saida')) continue
      r.push({ servico: s, saida: u })
    } else if (mostrar === 'executados') {
      // executado no período = a saída mais recente voltou dentro do período (pela data de retorno)
      if (u.dataRetorno !== null && noIntervalo(u, i, 'retorno')) r.push({ servico: s, saida: u })
    } else {
      // todos do período: teve alguma saída no período (pela data escolhida); cor = situação atual
      if (s.saidas.some((x) => noIntervalo(x, i, f.contarPor))) r.push({ servico: s, saida: u })
    }
  }
  return r
}

export function calcularMapa(base: Base, f: Filtros, mostrar: Mostrar, hoje: Dia) {
  const intervalo = intervaloDo(f.periodo, hoje)
  const servicos = [...new Set(filtrarLugar(base.saidas, f).map((s) => s.servico))]
  const escolhidos = selecionar(servicos, mostrar, intervalo, f, hoje)
  // a fila inteira (sem o período), para o aviso "a fila toda tem N"
  const filaToda =
    mostrar === 'abertos' || mostrar === 'atraso'
      ? selecionar(servicos, mostrar, { de: null, ate: null, parcial: true, rotulo: '' }, f, hoje).length
      : null

  const pontos: Ponto[] = []
  let semCoordenada = 0
  for (const { servico, saida } of escolhidos) {
    if (!coordenadaValida(servico.lat, servico.lng)) {
      semCoordenada++
      continue
    }
    const sit = situacao(saida, hoje)
    pontos.push({
      servico,
      saida,
      situacao: sit,
      dias: saida.dataRetorno === null ? diasEmAberto(saida, hoje) : saida.dataRetorno - saida.dataSaida,
      risco: servico.categoria === CATEGORIA_RISCO,
      lat: servico.lat!,
      lng: servico.lng!,
    })
  }

  const porSituacao: Record<Situacao, number> = { ok: 0, andamento: 0, atraso: 0 }
  for (const p of pontos) porSituacao[p.situacao]++

  const abertos = pontos.filter((p) => p.situacao !== 'ok')
  return {
    intervalo,
    pontos,
    total: escolhidos.length,
    filaToda,
    semCoordenada,
    porSituacao,
    risco: pontos.filter((p) => p.risco && p.situacao !== 'ok').length,
    regioes: contar(pontos, (p) => p.servico.regiao),
    bairros: contar(pontos, (p) => p.servico.bairro),
    categorias: contar(pontos, (p) => p.servico.categoria ?? 'Sem categoria'),
    maisAntigos: [...abertos].sort((a, b) => b.dias - a.dias).slice(0, 8),
  }
}

export type DadosMapa = ReturnType<typeof calcularMapa>

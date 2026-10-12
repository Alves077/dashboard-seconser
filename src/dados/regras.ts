// Regras de negócio das saídas — as mesmas da vw_servicos (MySQL e Supabase) e do site antigo.
import { PRAZO_DIAS } from '@/config'
import type { Dia } from '@/lib/datas'
import type { Saida, Situacao } from './tipos'

/** Saída + 5 dias corridos */
export function prazo(s: Saida): Dia {
  return s.dataSaida + PRAZO_DIAS
}

/** Retornou → OK; senão passou do prazo → Em Atraso; senão → Em Atendimento */
export function situacao(s: Saida, hoje: Dia): Situacao {
  if (s.dataRetorno !== null) return 'ok'
  return prazo(s) < hoje ? 'atraso' : 'andamento'
}

export function emAberto(s: Saida): boolean {
  return s.dataRetorno === null
}

/** Dias entre saída e retorno (só para OK) */
export function diasExecucao(s: Saida): number | null {
  return s.dataRetorno === null ? null : s.dataRetorno - s.dataSaida
}

/** Dias desde a saída, para quem ainda não voltou */
export function diasEmAberto(s: Saida, hoje: Dia): number {
  return hoje - s.dataSaida
}

export function noPrazo(s: Saida): boolean | null {
  const d = diasExecucao(s)
  return d === null ? null : d <= PRAZO_DIAS
}

export type Faixa = 'ate3' | '4a7' | '8a15' | 'mais15'

export const FAIXAS: { id: Faixa; rotulo: string; curto: string }[] = [
  { id: 'ate3', rotulo: 'Até 3 dias', curto: '≤ 3d' },
  { id: '4a7', rotulo: '4 a 7 dias', curto: '4–7d' },
  { id: '8a15', rotulo: '8 a 15 dias', curto: '8–15d' },
  { id: 'mais15', rotulo: 'Mais de 15 dias', curto: '> 15d' },
]

export function faixa(s: Saida): Faixa | null {
  const d = diasExecucao(s)
  if (d === null) return null
  if (d <= 3) return 'ate3'
  if (d <= 7) return '4a7'
  if (d <= 15) return '8a15'
  return 'mais15'
}

/** A saída mais recente do serviço manda na situação "atual" dele (mapa, ficha, lista de campo) */
export function ultimaSaida(saidas: Saida[]): Saida {
  return saidas[saidas.length - 1]
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  ok: 'Concluído',
  andamento: 'Em atendimento',
  atraso: 'Em atraso',
}

/** Categoria revisada que conta como risco elétrico (DESIGN.md: destaque nos abertos) */
export const CATEGORIA_RISCO = 'Fiação e risco elétrico'

/** Mediana certa (lista par = média dos dois do meio) */
export function mediana(valores: number[]): number | null {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

export function media(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
}

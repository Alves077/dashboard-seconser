// Regras de negócio das saídas — as mesmas da vw_servicos (MySQL e Supabase) e do site antigo.
import { PRAZO_DIAS } from '@/config'
import type { Dia } from '@/lib/datas'
import { diasEspera, diasLevou } from '@/lib/formato'
import type { Saida, Servico, Situacao } from './tipos'

/** Saída + 5 dias corridos */
export function prazo(s: Saida): Dia {
  return s.dataSaida + PRAZO_DIAS
}

/** Retornou → OK; senão passou do prazo → Em Atraso; senão → Em Atendimento */
export function situacao(s: Saida, hoje: Dia): Situacao {
  if (s.dataRetorno !== null) return 'ok'
  return prazo(s) < hoje ? 'atraso' : 'andamento'
}

/** Os dias no selo da situação: executado → quanto levou ("mesmo dia", "3 dias"); em aberto → há quanto espera ("hoje") */
export function textoDiasSelo(sit: Situacao, n: number): string {
  return sit === 'ok' ? diasLevou(n) : diasEspera(n)
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

/** Pedido de vereador sem o nome identificado (Indicação da Câmara que não achamos no siscam) */
export const SEM_VEREADOR = 'Sem vereador identificado'

/**
 * "Quem" dentro da origem — o 2º nível, como o bairro dentro da região: o vereador (pela pessoa,
 * não pelo tipo de pedido — ofício, indicação…), ou o detalhe da origem (a regional, a associação…).
 * Cidadão não tem 2º nível (null).
 */
export function quemDe(s: Servico): string | null {
  if (s.origem === 'Vereador') return s.vereador ?? SEM_VEREADOR
  return s.origemDetalhe
}

/**
 * Espaço público do serviço, para mostrar: "Praça César Tinoco (praça)"; sem nome no cadastro, só o tipo
 * ("Escadaria"). null quando o serviço não é dentro de um espaço público.
 */
export function rotuloLugar(s: Servico): string | null {
  if (!s.tipoLocal) return null
  const tipo = s.tipoLocal.charAt(0).toUpperCase() + s.tipoLocal.slice(1)
  return s.local ? `${s.local} (${s.tipoLocal})` : tipo
}

/**
 * Endereço para as listas dos relatórios: rua e número, sem o fim que alguns trazem do Colab (" - Bairro, Niterói - RJ,
 * 24360-000, Brasil", ", Niterói - RJ", CEP solto) — o bairro já está no grupo da lista (usuário, 24/10/2026). Só o FIM:
 * "Brasil" e "Niterói" no começo são nome de rua (Rua Pau Brasil). A ficha continua com o endereço inteiro.
 */
export function enderecoCurto(e: string): string {
  return e
    .replace(/\s+-\s+[^,]+,\s*Niter[oó]i\s*-\s*RJ\b.*$/i, '')
    .replace(/,\s*Niter[oó]i\s*-\s*RJ\b.*$/i, '')
    .replace(/,\s*\d{5}-?\d{3}(,\s*Brasil)?\s*$/i, '')
    .trim()
}

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

// Frase do prazo das saídas do período, a mesma no Panorama e no Prazo (revista com o usuário, 17/10/2026).
// Regra: os que saíram são divididos em partes que SOMAM o total (no prazo + fora do prazo + ainda dentro do
// prazo); a porcentagem fica no cartão "No prazo", com as mesmas partes na nota. Antes: "64 de 559 (11,4%) — os 323 executados mais os 236…"
// — o 559 não aparecia em lugar nenhum e era quebrado num corte diferente do que vinha antes (650).
import type { ReactNode } from 'react'
import type { Indicadores } from '@/calculos/panorama'
import { numero } from '@/lib/formato'

const B = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>

/** As partes dos que saíram no período (somam `saidas`) */
export function partesDoPrazo(i: Indicadores) {
  const foraExecutados = i.executadas - i.noPrazo
  return {
    noPrazo: i.noPrazo,
    fora: foraExecutados + i.vencidas,
    foraExecutados,
    foraAbertos: i.vencidas,
    aindaNoPrazo: i.abertas - i.vencidas,
  }
}

/** "1, 2 e 3" */
function juntar(itens: ReactNode[]): ReactNode {
  return itens.map((x, k) => (
    <span key={k}>
      {k > 0 && (k === itens.length - 1 ? ' e ' : ', ')}
      {x}
    </span>
  ))
}

/**
 * Curta (usuário, 17/10/2026: a versão longa virava parágrafo no celular): "saíram 650 para a rua: 64 foram executados no
 * prazo, 495 passaram do prazo e 91 ainda estão no prazo". O detalhe (executados com atraso × em aberto) e a porcentagem
 * ficam no cartão "No prazo".
 */
export function FrasePrazoSaidas({ i, quando }: { i: Indicadores; quando: string }) {
  const p = partesDoPrazo(i)
  const partes: ReactNode[] = []
  // cada parte com o verbo (usuário: "64 no prazo" — 64 o quê?). "Passaram do prazo" cobre os executados com
  // atraso e os ainda em aberto depois dos 5 dias; o detalhe fica no cartão
  if (p.noPrazo > 0)
    partes.push(
      <>
        <B>{numero(p.noPrazo)}</B> {p.noPrazo === 1 ? 'foi executado' : 'foram executados'} no prazo
      </>,
    )
  if (p.fora > 0)
    partes.push(
      <>
        <B>{numero(p.fora)}</B> {p.fora === 1 ? 'passou' : 'passaram'} do prazo
      </>,
    )
  if (p.aindaNoPrazo > 0) partes.push(<>{numero(p.aindaNoPrazo)} {p.aindaNoPrazo === 1 ? 'ainda está' : 'ainda estão'} no prazo</>)
  return (
    <>
      {quando}, {i.saidas === 1 ? 'saiu' : 'saíram'} <B>{numero(i.saidas)}</B> para a rua: {juntar(partes)}.
    </>
  )
}

/** Contando pelo retorno todos já foram executados: "foram executados 809: 85 no prazo e 724 com atraso." */
export function FrasePrazoRetorno({ i, quando }: { i: Indicadores; quando: string }) {
  const atraso = i.executadas - i.noPrazo
  return (
    <>
      {quando}, {i.executadas === 1 ? 'foi executado' : 'foram executados'} <B>{numero(i.executadas)}</B>: <B>{numero(i.noPrazo)}</B> dentro do prazo
      {atraso > 0 && <> e {numero(atraso)} com atraso</>}.
    </>
  )
}

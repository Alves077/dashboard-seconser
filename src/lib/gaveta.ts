// Vai-e-volta dentro de um card (região → bairros, origem → nomes): nomes de transição únicos por card e a
// classe comum das regras (estilos.css, "*.gaveta-cartao" / "*.gaveta-lista").
import type { CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { direcaoDaTroca } from './ganchos'

/** O card inteiro: muda de altura suavemente */
export const gavetaCartao = (nome: string) =>
  ({ viewTransitionName: `gaveta-${nome}`, viewTransitionClass: 'gaveta-cartao' }) as CSSProperties

/** A lista dentro do card: desliza (entrar = da direita; voltar = da esquerda). Espalhar no elemento: {...gavetaLista('x')} */
export const gavetaLista = (nome: string) => ({
  style: { viewTransitionName: `gaveta-${nome}-lista`, viewTransitionClass: 'gaveta-lista' } as CSSProperties,
  'data-gaveta-lista': nome,
})

/**
 * Troca de nível que NÃO passa pela URL (estado do próprio componente, ex.: "Onde estão"): sem navegação o
 * React Router não dispara a transição — dispara aqui. Sem View Transitions: troca direta. Com movimento reduzido
 * a transição acontece, mas só como esmaecer (estilos.css).
 */
export function trocarComTransicao(direcao: 'gaveta-entra' | 'gaveta-volta', alvos: string[], trocar: () => void) {
  if (!document.startViewTransition) {
    trocar()
    return
  }
  direcaoDaTroca(direcao, alvos)
  document.startViewTransition(() => flushSync(trocar))
}

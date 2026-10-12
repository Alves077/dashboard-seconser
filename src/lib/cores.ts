// Cor de identidade das regiões: ordem fixa da paleta categórica validada (DESIGN.md §3).
// A cor segue a região em todas as páginas (lista, tabela, gráfico), nunca a posição no ranking.
// Sempre ao lado do nome — a cor ajuda a achar, o texto é que informa.
const REGIOES = ['Leste', 'Norte', 'Oceânica', 'Pendotiba', 'Praias da Baía']
const FUNDO = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5']
const VARIAVEL = ['--c-s1', '--c-s2', '--c-s3', '--c-s4', '--c-s5']

/** classe Tailwind de fundo (pontinho/marca) */
export function corRegiao(nome: string): string {
  const i = REGIOES.indexOf(nome)
  return i >= 0 ? FUNDO[i] : 'bg-ink-3'
}

/** variável CSS (para SVG/canvas: var(--c-s1)) */
export function varRegiao(nome: string): string {
  const i = REGIOES.indexOf(nome)
  return i >= 0 ? `var(${VARIAVEL[i]})` : 'var(--c-ink-3)'
}

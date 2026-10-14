// Cor de identidade das regiões: ordem fixa da paleta categórica validada (DESIGN.md §3).
// A cor segue a região em todas as páginas (lista, tabela, gráfico), nunca a posição no ranking.
// Sempre ao lado do nome — a cor ajuda a achar, o texto é que informa.
const REGIOES = ['Leste', 'Norte', 'Oceânica', 'Pendotiba', 'Praias da Baía']
const FUNDO = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5']

/** classe Tailwind de fundo (pontinho/marca) */
export function corRegiao(nome: string): string {
  const i = REGIOES.indexOf(nome)
  return i >= 0 ? FUNDO[i] : 'bg-ink-3'
}

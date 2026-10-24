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

// Faixas de espera (FAIXAS_ESPERA: até 5 · 6–15 · 16–30 · 31–90 · > 90 dias) — a MESMA paleta no Panorama, no Mensal e no
// Em aberto, na tela e no PDF (usuário, 24/10/2026: eram três). A 1ª faixa é o prazo: verde; depois âmbar → vermelho
// escuro, cada vez mais grave. Sem o laranja do risco elétrico (cor reservada). Vizinhas com luminância diferente (P&B).
/** na tela (variáveis CSS: valem no tema claro e no escuro) */
export const COR_ESPERA = [
  'var(--c-ok)',
  'var(--c-andamento)',
  'color-mix(in oklab, var(--c-andamento) 55%, var(--c-atraso))',
  'var(--c-atraso)',
  'color-mix(in oklab, var(--c-atraso) 65%, black)',
]
/** no PDF (o color-mix já resolvido) */
export const COR_ESPERA_PDF = ['#0ca30c', '#fab219', '#e77c28', '#d03b3b', '#872727']
/** texto escuro dentro da faixa (verde, âmbar e laranja: branco ficava com contraste baixo) */
export const TEXTO_ESCURO_ESPERA = (i: number) => i < 3

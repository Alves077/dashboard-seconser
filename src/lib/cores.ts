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

// Faixas da saída à execução (FAIXAS_EXEC, as da página Prazo: até 3 · 4–5 · 6–15 · 16–30 · > 30 dias) nos Executados,
// tela e PDF: as duas primeiras no prazo, em verde (claro e escuro); fora do prazo, do dourado ao vermelho — vizinhas com
// luminância bem diferente, para a impressão em preto e branco
export const COR_EXEC = [
  'var(--c-ok)',
  'var(--c-ok-texto)',
  'var(--c-andamento)',
  'color-mix(in oklab, var(--c-andamento) 55%, var(--c-atraso))',
  'var(--c-atraso)',
]
export const COR_EXEC_PDF = ['#0ca30c', '#006300', '#fab219', '#e77c28', '#d03b3b']
/** texto escuro dentro da faixa (no verde-escuro e no vermelho, branco) */
export const TEXTO_ESCURO_EXEC = (i: number) => i !== 1 && i !== 4

// Faixas do relatório mensal (FAIXAS, as do site antigo: até 3 · 4–7 · 8–15 · > 15 dias): verde · azul · âmbar · vermelho.
// Azul um pouco mais escuro que o s1: o branco em cima dele ficava em 4,4:1
export const COR_FAIXA_MENSAL = ['var(--c-ok)', 'color-mix(in oklab, var(--c-s1) 82%, black)', 'var(--c-andamento)', 'var(--c-atraso)']
export const COR_FAIXA_MENSAL_PDF = ['#0ca30c', '#2263b1', '#fab219', '#d03b3b']
/** texto escuro no verde e no âmbar */
export const TEXTO_ESCURO_FAIXA_MENSAL = (i: number) => i === 0 || i === 2

// Como a busca casa o texto digitado com um registro (endereço, bairro, região). Pedido do usuário, 17/10/2026:
//   - qualquer trecho, inclusive do meio ou do fim ("peixoto" acha "Av. Ernani do Amaral Peixoto")
//   - por palavras, em qualquer ordem ("ernani amaral", "peixoto amaral")
//   - sem diferença de maiúscula e de acento ("SAO GONCALO" = "São Gonçalo")
//   - tolerante a erro de digitação ("amral peixoto")
// Regra: TODA palavra digitada tem que bater com alguma palavra do registro — começo da palavra (melhor),
// trecho dela, ou quase igual (1 letra trocada/faltando/sobrando; 2 em palavras longas). A pontuação ordena os
// resultados: frase inteira igual > começo de palavra > trecho > aproximado.
import { normalizarBusca } from '@/lib/formato'

/** palavras soltas que não ajudam a achar nada quando vêm junto de outras ("rua da conceição") */
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/** "Av. Ernani do Amaral-Peixoto, 120" → "av ernani do amaral peixoto 120" */
function normalizarTexto(s: string): string {
  return normalizarBusca(s)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export interface Consulta {
  texto: string
  termos: string[]
}

export function prepararConsulta(s: string): Consulta {
  const texto = normalizarTexto(s)
  const todos = texto.split(' ').filter(Boolean)
  const uteis = todos.filter((t) => !VAZIAS.has(t))
  return { texto, termos: uteis.length ? uteis : todos }
}

/** Distância de edição (com troca de duas letras vizinhas), parando cedo se passar do limite */
function distancia(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1
  let ante: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const atual = [i]
    let menor = i
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, atual[j - 1] + 1, prev[j - 1] + custo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, ante[j - 2] + 1)
      atual.push(v)
      if (v < menor) menor = v
    }
    if (menor > limite) return limite + 1
    ante = prev
    prev = atual
  }
  return prev[b.length]
}

/** Quanto um termo casa com uma palavra: 3 começo · 2 trecho · 1 aproximado · 0 não casa */
function casarTermo(termo: string, palavra: string): number {
  if (palavra.startsWith(termo)) return 3
  // trecho só a partir de 3 letras ("de" dentro de "Pedro" não é o que a pessoa procura)
  if (termo.length >= 3 && palavra.includes(termo)) return 2
  // números (nº da casa, CEP) só exatos ou pelo começo
  if (termo.length < 4 || /\d/.test(termo) || /\d/.test(palavra)) return 0
  const limite = termo.length >= 8 ? 2 : 1
  // a palavra inteira, ou o começo dela (quem ainda está digitando: "peixo" ~ "peixoto")
  if (distancia(termo, palavra, limite) <= limite) return 1
  if (palavra.length > termo.length && distancia(termo, palavra.slice(0, termo.length), limite) <= limite) return 1
  return 0
}

/**
 * Índice para buscar rápido: cada palavra diferente aparece uma vez só, com a lista de registros que a têm.
 * O casamento (inclusive o aproximado, que é o caro) roda nas palavras do vocabulário — alguns milhares —
 * e não em registro × palavra (17 mil × 10): ~150 ms por tecla viraram poucos ms.
 */
export interface Indice<T> {
  itens: T[]
  textos: string[]
  vocabulario: Map<string, number[]>
  /** resultado de cada termo já buscado: digitando "amaral pei…", o "amaral" não é recalculado a cada letra */
  porTermo: Map<string, Map<number, number>>
}

export function criarIndice<T>(itens: T[], textoDe: (x: T) => string): Indice<T> {
  const textos: string[] = []
  const vocabulario = new Map<string, number[]>()
  itens.forEach((x, i) => {
    const texto = normalizarTexto(textoDe(x))
    textos.push(texto)
    for (const p of new Set(texto.split(' '))) {
      if (!p) continue
      const lista = vocabulario.get(p)
      if (lista) lista.push(i)
      else vocabulario.set(p, [i])
    }
  })
  return { itens, textos, vocabulario, porTermo: new Map() }
}

function registrosDoTermo<T>(indice: Indice<T>, termo: string): Map<number, number> {
  const guardado = indice.porTermo.get(termo)
  if (guardado) return guardado
  const doTermo = new Map<number, number>()
  for (const [palavra, registros] of indice.vocabulario) {
    const v = casarTermo(termo, palavra)
    if (!v) continue
    for (const i of registros) if ((doTermo.get(i) ?? 0) < v) doTermo.set(i, v)
  }
  if (indice.porTermo.size > 50) indice.porTermo.clear()
  indice.porTermo.set(termo, doTermo)
  return doTermo
}

/** Os `limite` melhores: toda palavra digitada casa com alguma do registro; ordem pela pontuação (empate: ordem original) */
export function buscar<T>(indice: Indice<T>, c: Consulta, limite: number): T[] {
  if (!c.termos.length) return []
  let pontos: Map<number, number> | null = null
  for (const termo of c.termos) {
    const doTermo = registrosDoTermo(indice, termo)
    if (pontos === null) pontos = doTermo
    else {
      const juntos = new Map<number, number>()
      for (const [i, v] of doTermo) {
        const antes = pontos.get(i)
        if (antes !== undefined) juntos.set(i, antes + v)
      }
      pontos = juntos
    }
    if (!pontos.size) return []
  }
  return [...pontos!]
    .map(([i, p]) => ({ i, p: p + (indice.textos[i].includes(c.texto) ? 10 : 0) }))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .slice(0, limite)
    .map(({ i }) => indice.itens[i])
}

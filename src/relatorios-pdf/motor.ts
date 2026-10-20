// Motor do PDF dos relatórios: pdf-lib + Inter (a mesma fonte do site). Tudo é medido em px de CSS
// (1 px = 0,75 pt) e com y contado de cima para baixo, para os números baterem com a folha da tela
// (Folha.tsx e .tabela-folha em estilos.css). Este módulo só é baixado quando alguém pede o PDF.
//
// Fonte em .woff (não .woff2): o fontkit do pdf-lib quebra ao recortar woff2 ("Index out of range").
import fontkit from '@pdf-lib/fontkit'
import { LineCapStyle, PDFDocument, popGraphicsState, pushGraphicsState, rgb, setCharacterSpacing, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import url300 from '@fontsource/inter/files/inter-latin-300-normal.woff?url'
import url400 from '@fontsource/inter/files/inter-latin-400-normal.woff?url'
import url500 from '@fontsource/inter/files/inter-latin-500-normal.woff?url'
import url600 from '@fontsource/inter/files/inter-latin-600-normal.woff?url'
import url700 from '@fontsource/inter/files/inter-latin-700-normal.woff?url'

/** 1 px de CSS em pontos do PDF */
const PT = 0.75
const A4: [number, number] = [595.28, 841.89]
export const PAGINA = { largura: A4[0] / PT, altura: A4[1] / PT }
/**
 * Formato "contínuo" (celular, usuário 20/10/2026: a folha A4 chegava "cortada", com metade em branco): uma página
 * só, do tamanho do conteúdo, que rola como uma tela. Desenha numa página alta e no fim corta a sobra de baixo.
 * 14.400 pt (200 polegadas) é o limite de tamanho de página dos leitores de PDF; passou disso, abre outra página.
 */
const ALTURA_MAX_CONTINUO_PT = 14400
export type Formato = 'a4' | 'continuo'
/** 12 mm, como o @page da impressão */
export const MARGEM = (12 / 25.4) * 96
/** respiro entre o fim do conteúdo e o rodapé (que fica dentro da margem de baixo) */
const RODAPE = 6
/** respiro de cima de um cartão (.cartao-folha: 8px) — repetido quando o cartão continua na página seguinte */
const TOPO_CARTAO = 8

// métricas da Inter (em em): a caixa da linha centra o texto como o navegador
const ASC = 0.96875
const CONTEUDO = 0.96875 + 0.2421875

/** Cores do tema claro (estilos.css :root) — o papel é sempre claro */
export const COR = {
  ink: '#0d253d',
  ink2: '#273951',
  ink3: '#5a6a83',
  line: '#e3e8ee',
  page: '#f6f9fc',
  branco: '#ffffff',
  ok: '#0ca30c',
  okTexto: '#006300',
  andamento: '#fab219',
  andamentoTexto: '#8a5a00',
  atraso: '#d03b3b',
  atrasoTexto: '#b42323',
  risco: '#ec835a',
  s1: '#2a78d6',
  s7: '#4a3aa7',
}

export type Peso = 300 | 400 | 500 | 600 | 700
const PESOS: Peso[] = [300, 400, 500, 600, 700]
const URLS: Record<Peso, string> = { 300: url300, 400: url400, 500: url500, 600: url600, 700: url700 }

/** Pedaço de texto com estilo próprio dentro de uma frase (o <strong> da tela). `icone`: o raio do risco elétrico */
export interface Trecho {
  t: string
  peso?: Peso
  cor?: string
  tam?: number
  icone?: 'raio'
}
export type Alinhar = 'esq' | 'centro' | 'dir'
export interface OpcoesTexto {
  tam?: number
  peso?: Peso
  cor?: string
  alinhar?: Alinhar
  /** altura da linha em múltiplos do tamanho (padrão do site: 1,5) */
  lh?: number
  /** espaço entre letras, em px (títulos em maiúsculas) */
  espaco?: number
  opacidade?: number
}

/** Caracteres que a Inter (recorte latino) não tem */
const TROCAS: Record<string, string> = { '→': '›', '≤': '<=', '≥': '>=', '⚡': '' }

const cores = new Map<string, RGB>()
function rgbDe(hex: string): RGB {
  let c = cores.get(hex)
  if (!c) {
    const n = parseInt(hex.slice(1), 16)
    c = rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
    cores.set(hex, c)
  }
  return c
}

/** Retângulo de cantos redondos (cada canto o seu raio), em px, a partir do canto de cima à esquerda */
function retanguloRedondo(w: number, h: number, [a, b, c, d]: number[]): string {
  return `M${a},0 H${w - b} A${b},${b} 0 0 1 ${w},${b} V${h - c} A${c},${c} 0 0 1 ${w - c},${h} H${d} A${d},${d} 0 0 1 0,${h - d} V${a} A${a},${a} 0 0 1 ${a},0 Z`
}

/**
 * Regras tipográficas da fonte desligadas: o pdf-lib desenha só as letras e joga fora o ajuste de posição
 * (kerning), mas o fontkit aplicava tudo a cada texto — era ~70% do tempo da lista de campo. Texto em
 * português com letras acentuadas prontas (á, ç) não precisa de nenhuma delas.
 */
const SEM_FORMAS = Object.fromEntries(
  ['ccmp', 'locl', 'rlig', 'mark', 'mkmk', 'calt', 'clig', 'liga', 'rclig', 'curs', 'kern'].map((f) => [f, false]),
)

/**
 * WOFF → TTF com o descompactador do próprio navegador (nativo, rápido). Sem isso o fontkit descompactava
 * as tabelas em JavaScript a cada PDF (~0,35 s no computador). Formato: https://www.w3.org/TR/WOFF/
 */
async function woffParaTtf(woff: ArrayBuffer): Promise<ArrayBuffer> {
  const v = new DataView(woff)
  if (v.getUint32(0) !== 0x774f4646 || typeof DecompressionStream === 'undefined') return woff // não é WOFF: usa como veio
  const n = v.getUint16(12)
  const tabelas = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const e = 44 + i * 20
      const [tag, offset, comprimido, tamanho, soma] = [v.getUint32(e), v.getUint32(e + 4), v.getUint32(e + 8), v.getUint32(e + 12), v.getUint32(e + 16)]
      let dados = new Uint8Array(woff, offset, comprimido)
      if (comprimido < tamanho) {
        const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate'))
        dados = new Uint8Array(await new Response(fluxo).arrayBuffer())
      }
      return { tag, soma, dados }
    }),
  )
  const alinhar = (x: number) => (x + 3) & ~3
  let pos = 12 + n * 16
  const total = tabelas.reduce((s, t) => s + alinhar(t.dados.length), pos)
  const ttf = new Uint8Array(total)
  const w = new DataView(ttf.buffer)
  const potencia = 2 ** Math.floor(Math.log2(n))
  w.setUint32(0, v.getUint32(4)) // flavor
  w.setUint16(4, n)
  w.setUint16(6, potencia * 16)
  w.setUint16(8, Math.log2(potencia))
  w.setUint16(10, n * 16 - potencia * 16)
  tabelas.forEach((t, i) => {
    w.setUint32(12 + i * 16, t.tag)
    w.setUint32(16 + i * 16, t.soma)
    w.setUint32(20 + i * 16, pos)
    w.setUint32(24 + i * 16, t.dados.length)
    ttf.set(t.dados, pos)
    pos += alinhar(t.dados.length)
  })
  return ttf.buffer
}

let fontes: Promise<ArrayBuffer[]> | null = null
/** Baixa as fontes uma vez por visita. Chamado também ao abrir Relatórios, para o PDF sair na hora do toque */
export function carregarFontes(): Promise<ArrayBuffer[]> {
  if (!fontes) {
    fontes = Promise.all(
      PESOS.map((p) =>
        fetch(URLS[p])
          .then((r) => {
            if (!r.ok) throw new Error(`Fonte do PDF não carregou (${r.status})`)
            return r.arrayBuffer()
          })
          .then(woffParaTtf),
      ),
    )
    // falhou (sem internet): tenta de novo no próximo pedido
    fontes.catch(() => (fontes = null))
  }
  return fontes
}

/** O documento sendo montado: página atual, posição (y) e as peças de desenho */
export class Folha {
  pagina!: PDFPage
  /** posição atual, de cima para baixo, em px */
  y = MARGEM
  readonly x0 = MARGEM
  readonly largura = PAGINA.largura - 2 * MARGEM
  /** onde o conteúdo terminou em cada página (para fechar um cartão que continua na seguinte) */
  readonly fimDaPagina: number[] = []
  /** chamado a cada página nova — a tabela usa para repetir o cabeçalho */
  aoVirar: (() => void) | null = null
  private _medindo = false
  private cartoesAbertos = 0

  readonly doc: PDFDocument
  private readonly fontes: Record<Peso, PDFFont>
  private readonly caracteres: Set<number>
  /** página contínua (celular) em vez de folhas A4 */
  readonly continuo: boolean
  /** altura da página em px (A4, ou a página alta do formato contínuo antes do corte) */
  private readonly altura: number

  private constructor(doc: PDFDocument, fontes: Record<Peso, PDFFont>, caracteres: Set<number>, formato: Formato) {
    this.doc = doc
    this.fontes = fontes
    this.caracteres = caracteres
    this.continuo = formato === 'continuo'
    this.altura = this.continuo ? ALTURA_MAX_CONTINUO_PT / PT : PAGINA.altura
  }

  static async criar(titulo: string, formato: Formato = 'a4'): Promise<Folha> {
    const [bytes, doc] = await Promise.all([carregarFontes(), PDFDocument.create()])
    doc.registerFontkit(fontkit)
    const lista = await Promise.all(bytes.map((b) => doc.embedFont(b, { subset: true, features: SEM_FORMAS })))
    const porPeso = Object.fromEntries(PESOS.map((p, i) => [p, lista[i]])) as Record<Peso, PDFFont>
    doc.setTitle(titulo, { showInWindowTitleBar: true })
    doc.setAuthor('Departamento de Iluminação Pública · SECONSER Niterói')
    doc.setCreator('Painel da DIP')
    doc.setProducer('Painel da DIP')
    doc.setLanguage('pt-BR')
    const f = new Folha(doc, porPeso, new Set(lista[1].getCharacterSet()), formato)
    f.novaPagina()
    return f
  }

  /** medindo: nada é desenhado e não há quebra de página (só conta a altura) */
  get medindo() {
    return this._medindo
  }
  /** último y útil da página (acima do rodapé) */
  get fim() {
    return this.altura - MARGEM - RODAPE
  }
  get alturaUtil() {
    return this.fim - MARGEM
  }
  get indicePagina() {
    return this.doc.getPageCount() - 1
  }
  /** topo do conteúdo numa página nova (desce o respiro dos cartões que continuam) */
  private get topo() {
    return MARGEM + this.cartoesAbertos * TOPO_CARTAO
  }

  novaPagina() {
    if (this.doc.getPageCount() > 0) this.fimDaPagina.push(this.y)
    this.pagina = this.doc.addPage([A4[0], this.altura * PT])
    this.y = this.topo
    this.aoVirar?.()
  }

  /** pula para a página seguinte se `h` não couber no que resta (numa página ainda vazia, nunca) */
  garantir(h: number) {
    if (this._medindo) return
    if (h > this.fim - this.y && this.y > this.topo + 0.5) this.novaPagina()
  }

  /** altura que `desenhar` ocupa, sem desenhar nada */
  medir(desenhar: () => void): number {
    const [y, m] = [this.y, this._medindo]
    this._medindo = true
    this.y = 0
    try {
      desenhar()
      return this.y
    } finally {
      this.y = y
      this._medindo = m
    }
  }

  /** bloco que não quebra no meio (break-inside: avoid): vai inteiro para a página seguinte se não couber */
  inteiro(desenhar: () => void) {
    const h = this.medir(desenhar)
    if (h <= this.alturaUtil) this.garantir(h)
    desenhar()
  }

  abrirCartao() {
    this.cartoesAbertos++
  }
  fecharCartao() {
    this.cartoesAbertos--
  }

  // ---- texto ----

  // medir texto passa pelo fontkit (lento): cada texto é medido uma vez por peso, no tamanho 1, e guardado.
  // Sem isso a lista de campo da cidade (800 linhas) levava ~9 s no computador.
  private readonly limpos = new Map<string, string>()
  private readonly larguras: Record<Peso, Map<string, number>> = { 300: new Map(), 400: new Map(), 500: new Map(), 600: new Map(), 700: new Map() }

  /** só os caracteres que a fonte tem (acento solto vira a letra sem acento; emoji some) */
  limpo(s: string): string {
    const guardado = this.limpos.get(s)
    if (guardado !== undefined) return guardado
    let r = ''
    for (const ch of s) {
      if (this.caracteres.has(ch.codePointAt(0)!)) r += ch
      else if (ch in TROCAS && [...TROCAS[ch]].every((c) => this.caracteres.has(c.codePointAt(0)!))) r += TROCAS[ch]
      else if (/\s/.test(ch)) r += ' '
      else {
        const sem = ch.normalize('NFD').replace(/\p{M}/gu, '')
        if (sem && [...sem].every((c) => this.caracteres.has(c.codePointAt(0)!))) r += sem
      }
    }
    this.limpos.set(s, r)
    return r
  }

  medirTexto(s: string, tam: number, peso: Peso = 400, espaco = 0): number {
    const t = this.limpo(s)
    const cache = this.larguras[peso]
    let w1 = cache.get(t)
    if (w1 === undefined) {
      // largura em "em": no tamanho `tam` (px) dá tam × em px (pt e px se cancelam)
      w1 = this.fontes[peso].widthOfTextAtSize(t, 1)
      cache.set(t, w1)
    }
    return w1 * tam + (espaco ? espaco * [...t].length : 0)
  }

  /** largura de um trecho (ícone conta como uma letra larga e um espaço) */
  private larguraTrecho(p: Trecho, tam: number): number {
    const t = p.tam ?? tam
    return p.icone ? t * 1.15 : this.medirTexto(p.t, t, p.peso ?? 400)
  }

  /** linha de base de uma linha cujo topo está em `y` (caixa de altura tam × lh, texto centrado como no CSS) */
  base(y: number, tam: number, lh: number) {
    return y + (lh * tam - CONTEUDO * tam) / 2 + ASC * tam
  }

  /** uma linha de texto com o topo da caixa em `y` (ou a linha de base em `base`) */
  texto(s: string, x: number, y: number, o: OpcoesTexto & { base?: number } = {}) {
    if (this._medindo) return
    const { tam = 12, peso = 400, cor = COR.ink, alinhar = 'esq', lh = 1.5, espaco = 0, opacidade } = o
    const t = this.limpo(s)
    if (!t.trim()) return
    const w = this.medirTexto(t, tam, peso, espaco)
    const xi = alinhar === 'centro' ? x - w / 2 : alinhar === 'dir' ? x - w : x
    const base = o.base ?? this.base(y, tam, lh)
    const comum = { size: tam * PT, font: this.fontes[peso], color: rgbDe(cor), opacity: opacidade, y: (this.altura - base) * PT }
    // espaço entre letras pelo próprio PDF (Tc): o texto continua uma palavra só para copiar e buscar
    if (espaco) this.pagina.pushOperators(pushGraphicsState(), setCharacterSpacing(espaco * PT))
    this.pagina.drawText(t, { ...comum, x: xi * PT })
    if (espaco) this.pagina.pushOperators(popGraphicsState())
  }

  /** quebra trechos (estilos diferentes na mesma frase) em linhas que cabem em `largura` */
  // `peso`: o do texto sem peso próprio — medir com o peso errado jogava o trecho seguinte por cima do negrito
  quebrar(trechos: Trecho[], largura: number, tam = 12, peso: Peso = 400): Trecho[][] {
    const linhas: Trecho[][] = [[]]
    let usado = 0
    let espaco: Trecho | null = null
    const ultima = () => linhas[linhas.length - 1]
    const pular = () => {
      linhas.push([])
      usado = 0
      espaco = null
    }
    const por = (p: Trecho) => {
      const l = ultima()
      const ant = l[l.length - 1]
      // junta com o anterior de mesmo estilo (menos chamadas de desenho)
      if (ant && !ant.icone && !p.icone && ant.peso === p.peso && ant.cor === p.cor && ant.tam === p.tam) l[l.length - 1] = { ...ant, t: ant.t + p.t }
      else l.push(p)
      usado += this.larguraTrecho(p, tam)
    }
    for (const bruto of trechos) {
      const tr: Trecho = { ...bruto, peso: bruto.peso ?? peso }
      const partes = tr.icone ? [''] : this.limpo(tr.t).split(/(\n| +)/)
      for (const parte of partes) {
        if (!tr.icone && !parte) continue
        if (parte === '\n') {
          pular()
          continue
        }
        if (!tr.icone && !parte.trim()) {
          espaco = { ...tr, t: ' ' }
          continue
        }
        let palavra: Trecho = tr.icone ? { ...tr, t: '' } : { ...tr, t: parte }
        let w = this.larguraTrecho(palavra, tam)
        const we = espaco && ultima().length ? this.larguraTrecho(espaco, tam) : 0
        if (ultima().length && usado + we + w > largura) pular()
        else if (we && espaco) por(espaco)
        espaco = null
        // palavra maior que a linha inteira (endereço sem espaço): corta por letra
        while (w > largura && !palavra.icone && [...palavra.t].length > 1) {
          const letras = [...palavra.t]
          let k = 1
          while (k < letras.length && this.larguraTrecho({ ...palavra, t: letras.slice(0, k + 1).join('') }, tam) <= largura - usado) k++
          por({ ...palavra, t: letras.slice(0, k).join('') })
          pular()
          palavra = { ...palavra, t: letras.slice(k).join('') }
          w = this.larguraTrecho(palavra, tam)
        }
        por(palavra)
      }
    }
    return linhas
  }

  /** desenha linhas já quebradas com o topo em `y`; devolve a altura */
  desenharLinhas(linhas: Trecho[][], x: number, y: number, largura: number, o: OpcoesTexto = {}): number {
    const { tam = 12, lh = 1.5, alinhar = 'esq', peso = 400, cor = COR.ink } = o
    linhas.forEach((linha, i) => {
      if (this._medindo) return
      const topo = y + i * lh * tam
      const base = this.base(topo, tam, lh)
      const w = linha.reduce((s, p) => s + this.larguraTrecho(p, tam), 0)
      let xi = alinhar === 'centro' ? x + (largura - w) / 2 : alinhar === 'dir' ? x + largura - w : x
      for (const p of linha) {
        const t = p.tam ?? tam
        if (p.icone) this.raio(xi, topo, t, lh * tam)
        else this.texto(p.t, xi, 0, { tam: t, peso: p.peso ?? peso, cor: p.cor ?? cor, base })
        xi += this.larguraTrecho(p, tam)
      }
    })
    return linhas.length * lh * tam
  }

  /** parágrafo em `this.y` (avança o y); devolve a altura */
  paragrafo(trechos: Trecho[] | string, x: number, largura: number, o: OpcoesTexto = {}): number {
    const lista = typeof trechos === 'string' ? [{ t: trechos }] : trechos
    const h = this.desenharLinhas(this.quebrar(lista, largura, o.tam ?? 12, o.peso ?? 400), x, this.y, largura, o)
    this.y += h
    return h
  }

  // ---- formas ----

  caixa(
    x: number,
    y: number,
    w: number,
    h: number,
    o: { fundo?: string; borda?: string; esp?: number; raio?: number | number[]; opacidade?: number; pagina?: PDFPage },
  ) {
    if (this._medindo || w <= 0 || h <= 0) return
    const pg = o.pagina ?? this.pagina
    const raios = typeof o.raio === 'number' ? [o.raio, o.raio, o.raio, o.raio] : (o.raio ?? [0, 0, 0, 0])
    const esp = o.esp ?? 1
    const cores = { color: o.fundo ? rgbDe(o.fundo) : undefined, borderColor: o.borda ? rgbDe(o.borda) : undefined, opacity: o.opacidade, borderOpacity: o.opacidade }
    if (raios.every((r) => r === 0)) {
      pg.drawRectangle({ x: x * PT, y: (this.altura - y - h) * PT, width: w * PT, height: h * PT, ...cores, borderWidth: o.borda ? esp * PT : 0 })
      return
    }
    // a borda fica por dentro (como no CSS): o caminho anda meia espessura para dentro
    const m = o.borda ? esp / 2 : 0
    const r = raios.map((v) => Math.max(0, Math.min(v - m, (w - 2 * m) / 2, (h - 2 * m) / 2)))
    pg.drawSvgPath(retanguloRedondo(w - 2 * m, h - 2 * m, r), {
      x: (x + m) * PT,
      y: (this.altura - y - m) * PT,
      scale: PT,
      ...cores,
      borderWidth: o.borda ? esp : undefined,
    })
  }

  linha(x1: number, y1: number, x2: number, y2: number, o: { cor?: string; esp?: number; traco?: number[]; redonda?: boolean; opacidade?: number } = {}) {
    if (this._medindo) return
    this.pagina.drawLine({
      start: { x: x1 * PT, y: (this.altura - y1) * PT },
      end: { x: x2 * PT, y: (this.altura - y2) * PT },
      thickness: (o.esp ?? 1) * PT,
      color: rgbDe(o.cor ?? COR.line),
      opacity: o.opacidade,
      dashArray: o.traco?.map((v) => v * PT),
      lineCap: o.redonda ? LineCapStyle.Round : undefined,
    })
  }

  /** linha quebrada por pontos (gráfico), em px da página */
  trilha(pontos: [number, number][], o: { cor: string; esp?: number; traco?: number[] }) {
    if (this._medindo || pontos.length < 2) return
    const d = pontos.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ')
    this.pagina.drawSvgPath(d, {
      x: 0,
      y: this.altura * PT,
      scale: PT,
      borderColor: rgbDe(o.cor),
      borderWidth: o.esp ?? 2,
      borderDashArray: o.traco,
      borderLineCap: LineCapStyle.Round,
    })
  }

  circulo(x: number, y: number, r: number, o: { fundo: string; borda?: string; esp?: number }) {
    if (this._medindo) return
    this.pagina.drawCircle({
      x: x * PT,
      y: (this.altura - y) * PT,
      size: r * PT,
      color: rgbDe(o.fundo),
      borderColor: o.borda ? rgbDe(o.borda) : undefined,
      borderWidth: o.borda ? (o.esp ?? 1) * PT : undefined,
    })
  }

  /** raio do risco elétrico (o ⚡ da tela), centrado numa linha de altura `alturaLinha` com topo em `y` */
  raio(x: number, y: number, tam: number, alturaLinha: number) {
    if (this._medindo) return
    const s = tam * 0.85
    const topo = y + (alturaLinha - s) / 2
    // desenho do ícone "zap" (24 × 24), preenchido
    this.pagina.drawSvgPath('M13,2 L3,14 L12,14 L11,22 L21,10 L12,10 Z', {
      x: x * PT,
      y: (this.altura - topo) * PT,
      scale: (s / 24) * PT,
      color: rgbDe(COR.risco),
    })
  }

  // ---- fim ----

  /**
   * Rodapé de todas as páginas: o que é (esquerda) e "Página 1 de 3" (direita, com o aviso antes). No formato
   * contínuo vem logo depois do conteúdo, e a página é cortada ali (sem a sobra em branco embaixo).
   */
  rodapes(esquerda: string, aviso?: string) {
    const paginas = this.doc.getPages()
    const atual = this.pagina
    const tam = 9
    paginas.forEach((p, i) => {
      this.pagina = p
      const fimConteudo = i === paginas.length - 1 ? this.y : this.fimDaPagina[i]
      const y = this.continuo ? fimConteudo + 24 : this.altura - MARGEM + 10
      if (this.continuo) {
        const alto = y + tam * 1.5 + MARGEM
        p.setMediaBox(0, (this.altura - alto) * PT, A4[0], alto * PT)
      }
      const pagina = this.continuo && paginas.length === 1 ? '' : `Página ${i + 1} de ${paginas.length}`
      const direita = [aviso, pagina].filter(Boolean).join('  ·  ')
      const livre = this.largura - this.medirTexto(direita, tam) - 16
      let esq = esquerda
      while (esq.length > 4 && this.medirTexto(esq, tam) > livre) esq = `${esq.slice(0, -2).trimEnd()}…`
      this.texto(esq, this.x0, y, { tam, cor: COR.ink3 })
      this.texto(direita, this.x0 + this.largura, y, { tam, cor: COR.ink3, alinhar: 'dir' })
    })
    this.pagina = atual
  }

  async salvar(): Promise<Blob> {
    const bytes = await this.doc.save()
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
  }
}

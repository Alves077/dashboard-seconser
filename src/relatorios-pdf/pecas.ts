// Peças comuns dos relatórios em PDF — as mesmas da folha na tela (relatorios/Folha.tsx): cabeçalho,
// seção com título, cartão, tabela, barra de faixas e gráfico ao longo do tempo. Medidas em px de CSS.
import { escala } from '@/componentes/graficos/GraficoTempo'
import { numero, pct } from '@/lib/formato'
import { COR, MARGEM, type Alinhar, type Folha, type Trecho } from './motor'

export interface Cabecalho {
  titulo: string
  subtitulo?: string
  meta: string[]
}

/** CabecalhoFolha: título, departamento e subtítulo à esquerda; datas à direita; fio grosso embaixo */
export function cabecalho(f: Folha, c: Cabecalho) {
  const x = f.x0
  const w = f.largura
  const larguraMeta = Math.max(0, ...c.meta.map((m) => f.medirTexto(m, 10.5)))
  const larguraEsq = w - larguraMeta - 16
  const y0 = f.y
  const linhasTitulo = f.quebrar([{ t: c.titulo }], larguraEsq, 19, 600)
  let y = y0 + f.desenharLinhas(linhasTitulo, x, y0, larguraEsq, { tam: 19, peso: 600, lh: 1.25 })
  y += 2
  f.texto('Departamento de Iluminação Pública · SECONSER Niterói', x, y, { tam: 11.5, cor: COR.ink2 })
  y += 11.5 * 1.5
  if (c.subtitulo) {
    y += 4
    y += f.desenharLinhas(f.quebrar([{ t: c.subtitulo }], larguraEsq, 12), x, y, larguraEsq, { tam: 12, cor: COR.ink2 })
  }
  const alturaMeta = c.meta.length * 10.5 * 1.625
  const alto = Math.max(y - y0, alturaMeta)
  // as datas alinham pela base, como no "items-end" da tela
  c.meta.forEach((m, i) => f.texto(m, x + w, y0 + alto - alturaMeta + i * 10.5 * 1.625, { tam: 10.5, cor: COR.ink3, alinhar: 'dir', lh: 1.625 }))
  f.y = y0 + alto + 12
  f.caixa(x, f.y, w, 2, { fundo: COR.ink })
  f.y += 2 + 20
}

/** Título de seção (h3 da folha): miúdo, em maiúsculas, espaçado */
export function tituloSecao(f: Folha, x: number, titulo: string) {
  f.texto(titulo.toUpperCase(), x, f.y, { tam: 10, peso: 600, cor: COR.ink3, espaco: 0.8 })
  f.y += 15 + 8
}

/**
 * Seção da folha: margem de cima (menos no topo da página), título e conteúdo. `inteira`: não quebra no
 * meio (vai para a página seguinte se não couber); seções longas (listas) quebram entre linhas.
 */
export function secao(
  f: Folha,
  x: number,
  w: number,
  titulo: string,
  conteudo: (x: number, w: number) => void,
  o: { cartao?: boolean; colado?: boolean; inteira?: boolean } = {},
) {
  const { inteira = true } = o
  const corpo = () => {
    tituloSecao(f, x, titulo)
    if (o.cartao) cartao(f, x, w, conteudo)
    else conteudo(x, w)
  }
  if (!o.colado && f.y > MARGEM + 1) f.y += 20
  if (inteira) f.inteiro(corpo)
  else {
    // o título nunca fica sozinho no pé da página
    f.garantir(23 + 90)
    corpo()
  }
}

/** .cartao-folha: borda fina arredondada em volta (continua na página seguinte, se precisar) */
export function cartao(f: Folha, x: number, w: number, conteudo: (x: number, w: number) => void) {
  const pagina0 = f.indicePagina
  const y0 = f.y
  f.y += 8
  f.abrirCartao()
  conteudo(x + 12, w - 24)
  f.fecharCartao()
  f.y += 6
  if (f.medindo) return
  const paginas = f.doc.getPages()
  for (let p = pagina0; p <= f.indicePagina; p++) {
    const topo = p === pagina0 ? y0 : MARGEM
    const fim = p === f.indicePagina ? f.y : f.fimDaPagina[p] + 6
    f.caixa(x, topo, w, fim - topo, { borda: COR.line, raio: 8, pagina: paginas[p] })
  }
}

/** Duas (ou mais) colunas lado a lado; se o bloco não couber numa página inteira, uma embaixo da outra */
export function colunas(f: Folha, x: number, w: number, partes: [number, (x: number, w: number) => void][], gap: number) {
  const total = partes.reduce((s, [fr]) => s + fr, 0)
  const livre = w - gap * (partes.length - 1)
  let xi = x
  const posicoes = partes.map(([fr, desenhar]) => {
    const wi = (livre * fr) / total
    const p = { x: xi, w: wi, desenhar }
    xi += wi + gap
    return p
  })
  const alturas = posicoes.map((p) => f.medir(() => p.desenhar(p.x, p.w)))
  const alto = Math.max(...alturas)
  if (alto > f.alturaUtil) {
    posicoes.forEach((p, i) => {
      if (i > 0) f.y += gap
      p.desenhar(x, w)
    })
    return
  }
  f.garantir(alto)
  const y0 = f.y
  for (const p of posicoes) {
    f.y = y0
    p.desenhar(p.x, p.w)
  }
  f.y = y0 + alto
}

// ---- tabela ----

export interface Coluna {
  titulo: string
  /** alinhamento do corpo; o cabeçalho segue a regra da folha: 1ª coluna e 'esq' à esquerda, o resto centrado */
  alinhar?: Alinhar
  /** cabeçalho à esquerda mesmo não sendo a 1ª coluna (th.esq) */
  esq?: boolean
  /** largura fixa em fração da tabela (w-[14%]); só com `fixa` */
  fracao?: number
  /** pode quebrar linha (nome longo, endereço); sem isso fica numa linha só, se couber */
  quebra?: boolean
}

export interface Celula {
  trechos: Trecho[]
  /** segunda linha menor e mais clara (o lugar público debaixo do endereço) */
  abaixo?: string
  /** linha em branco para escrever à mão (retorno da lista de campo) */
  retorno?: boolean
}

export type LinhaTabela =
  | { tipo?: 'dados' | 'total'; celulas: (Celula | string)[] }
  /** subtítulo que ocupa a linha toda (grupo de pedidos próximos) */
  | { tipo: 'grupo'; trechos: Trecho[] }

export interface EstiloTabela {
  tam: number
  padX: number
  padY: number
  lh?: number
  /** texto centrado na altura da linha (lista de campo); sem isso, no topo */
  meio?: boolean
  /** larguras pelas frações (table-fixed); colunas sem fração dividem o resto */
  fixa?: boolean
  /** a última linha sem o fio de baixo (dentro de cartão) */
  ultimaSemFio?: boolean
}

const TAM_CABECALHO = 10
const ESPACO_CABECALHO = 0.4
const TAM_ABAIXO = 10.5
const RETORNO = 20

const celulaDe = (c: Celula | string): Celula => (typeof c === 'string' ? { trechos: [{ t: c }] } : c)
const textoDe = (c: Celula) => c.trechos.map((t) => t.t).join('')

/** Larguras como o navegador faz numa tabela automática: cabe → sobra repartida; não cabe → espreme o que quebra */
function larguras(f: Folha, w: number, colunas: Coluna[], linhas: LinhaTabela[], e: EstiloTabela): number[] {
  if (e.fixa) {
    const fixo = colunas.reduce((s, c) => s + (c.fracao ?? 0), 0)
    const soltas = colunas.filter((c) => c.fracao === undefined).length
    return colunas.map((c) => (c.fracao !== undefined ? c.fracao * w : ((1 - fixo) * w) / Math.max(1, soltas)))
  }
  const min = colunas.map(() => 0)
  const max = colunas.map(() => 0)
  // só o espaço comum separa palavras: o espaço que não quebra (NBSP) segura o nome numa linha
  const medirPalavras = (s: string, tam: number, peso: 400 | 500 | 600 = 400, espaco = 0) =>
    Math.max(0, ...s.split(/ +/).map((p) => f.medirTexto(p, tam, peso, espaco)))
  colunas.forEach((c, i) => {
    const t = c.titulo.toUpperCase()
    min[i] = medirPalavras(t, TAM_CABECALHO, 500, ESPACO_CABECALHO)
    max[i] = f.medirTexto(t, TAM_CABECALHO, 500, ESPACO_CABECALHO)
  })
  for (const l of linhas) {
    if (l.tipo === 'grupo') continue
    l.celulas.forEach((bruta, i) => {
      const c = celulaDe(bruta)
      const inteira = c.trechos.reduce((s, t) => s + (t.icone ? e.tam * 1.15 : f.medirTexto(t.t, t.tam ?? e.tam, t.peso ?? 400)), 0)
      const abaixo = c.abaixo ? f.medirTexto(c.abaixo, TAM_ABAIXO) : 0
      const cheia = Math.max(inteira, abaixo)
      max[i] = Math.max(max[i], cheia)
      const menor = colunas[i].quebra ? Math.max(medirPalavras(textoDe(c), e.tam, 400), c.abaixo ? medirPalavras(c.abaixo, TAM_ABAIXO) : 0) : cheia
      min[i] = Math.max(min[i], menor)
    })
  }
  const pad = 2 * e.padX
  const mn = min.map((v) => v + pad)
  const mx = max.map((v, i) => Math.max(v, min[i]) + pad)
  const somaMin = mn.reduce((a, b) => a + b, 0)
  const somaMax = mx.reduce((a, b) => a + b, 0)
  if (somaMax <= w) return mx.map((v) => v + ((w - somaMax) * v) / somaMax)
  // nem o mínimo cabe: fica no mínimo e passa um pouco do cartão, como o navegador (número partido ao meio, nunca)
  if (somaMin >= w) return mn
  return mn.map((v, i) => v + ((w - somaMin) * (mx[i] - mn[i])) / (somaMax - somaMin))
}

/** .tabela-folha: cabeçalho miúdo em maiúsculas, fio fino entre as linhas; na página seguinte repete o cabeçalho */
export function tabela(f: Folha, x: number, w: number, colunas: Coluna[], linhas: LinhaTabela[], e: EstiloTabela) {
  const lh = e.lh ?? 1.5
  const ws = larguras(f, w, colunas, linhas, e)
  const xs = ws.map((_, i) => x + ws.slice(0, i).reduce((a, b) => a + b, 0))
  const alinhCab = (i: number): Alinhar => (i === 0 || colunas[i].esq ? 'esq' : 'centro')

  // cabeçalho
  const linhasCab = colunas.map((c, i) => f.quebrar([{ t: c.titulo.toUpperCase() }], ws[i] - 2 * e.padX, TAM_CABECALHO, 500))
  const altCab = Math.max(...linhasCab.map((l) => l.length)) * TAM_CABECALHO * lh + 2 * e.padY
  const desenharCabecalho = () => {
    linhasCab.forEach((l, i) =>
      l.forEach((linha, k) =>
        f.texto(
          linha.map((t) => t.t).join(''),
          alinhCab(i) === 'esq' ? xs[i] + e.padX : xs[i] + ws[i] / 2,
          f.y + e.padY + k * TAM_CABECALHO * lh,
          { tam: TAM_CABECALHO, peso: 500, cor: COR.ink3, alinhar: alinhCab(i), espaco: ESPACO_CABECALHO, lh },
        ),
      ),
    )
    f.linha(x, f.y + altCab - 0.5, x + w, f.y + altCab - 0.5)
    f.y += altCab
  }

  // corpo: cada linha montada antes (altura conhecida para decidir a quebra de página)
  const montadas = linhas.map((l) => {
    if (l.tipo === 'grupo') {
      const ls = f.quebrar(l.trechos, w - 2 * e.padX, 11, 600)
      return { l, celulas: [], alt: 8 + ls.length * 11 * lh + e.padY, ls }
    }
    const celulas = l.celulas.map((bruta, i) => {
      const c = celulaDe(bruta)
      const largura = ws[i] - 2 * e.padX
      // coluna sem `quebra` fica numa linha só, mesmo passando um pouco da célula (td.num: nowrap, como o navegador)
      const ls = c.retorno ? [] : f.quebrar(c.trechos, colunas[i].quebra ? largura : Infinity, e.tam, l.tipo === 'total' ? 600 : 400)
      const lsAbaixo = c.abaixo ? f.quebrar([{ t: c.abaixo }], largura, TAM_ABAIXO) : []
      const alt = c.retorno ? RETORNO : ls.length * e.tam * lh + lsAbaixo.length * TAM_ABAIXO * lh
      return { c, ls, lsAbaixo, alt }
    })
    return { l, celulas, alt: Math.max(...celulas.map((c) => c.alt)) + 2 * e.padY, ls: [] as Trecho[][] }
  })

  f.garantir(altCab + (montadas[0]?.alt ?? 0) + (montadas[0]?.l.tipo === 'grupo' ? (montadas[1]?.alt ?? 0) : 0))
  desenharCabecalho()
  const antes = f.aoVirar
  f.aoVirar = () => {
    antes?.()
    desenharCabecalho()
  }

  montadas.forEach((m, k) => {
    // o subtítulo do grupo nunca fica sozinho no pé da página
    f.garantir(m.alt + (m.l.tipo === 'grupo' ? (montadas[k + 1]?.alt ?? 0) : 0))
    const y = f.y
    const ultima = k === montadas.length - 1
    if (m.l.tipo === 'grupo') {
      f.caixa(x, y, w, m.alt, { fundo: COR.page })
      f.desenharLinhas(m.ls, x + e.padX, y + 8, w - 2 * e.padX, { tam: 11, peso: 600, lh })
    } else {
      if (m.l.tipo === 'total') f.linha(x, y + 0.5, x + w, y + 0.5, { cor: COR.ink, opacidade: 0.3 })
      m.celulas.forEach((cel, i) => {
        const largura = ws[i] - 2 * e.padX
        const cx = xs[i] + e.padX
        if (cel.c.retorno) {
          const yl = y + m.alt - e.padY
          f.linha(cx, yl, cx + largura, yl, { cor: COR.ink3, opacidade: 0.6 })
          return
        }
        const topo = e.meio ? y + (m.alt - cel.alt) / 2 : y + e.padY
        const alinhar = colunas[i].alinhar ?? 'esq'
        const h = f.desenharLinhas(cel.ls, cx, topo, largura, { tam: e.tam, lh, alinhar, peso: m.l.tipo === 'total' ? 600 : 400 })
        if (cel.lsAbaixo.length) f.desenharLinhas(cel.lsAbaixo, cx, topo + h, largura, { tam: TAM_ABAIXO, lh, alinhar, cor: COR.ink3 })
      })
    }
    const antesDoTotal = montadas[k + 1]?.l.tipo === 'total'
    if (!(ultima && e.ultimaSemFio) && !antesDoTotal) f.linha(x, y + m.alt - 0.5, x + w, y + m.alt - 0.5)
    f.y += m.alt
  })
  f.aoVirar = antes
}

// ---- barra de faixas ----

export interface ParteFaixa {
  rotulo: string
  n: number
  cor: string
  nota?: string
  /** faixa clara (verde, âmbar, laranja): número escuro em cima */
  textoEscuro?: boolean
}

/** BarraFaixas: barra 100% empilhada (com a parte de cada faixa) e a legenda centrada embaixo */
export function barraFaixas(f: Folha, x: number, w: number, partes: ParteFaixa[], total: number, comPct = true) {
  const visiveis = partes.filter((p) => p.n > 0)
  const vao = 2
  const util = w - vao * Math.max(0, visiveis.length - 1)
  let xi = x
  visiveis.forEach((p, i) => {
    const wi = (util * p.n) / total
    const raio = [i === 0 ? 6 : 0, i === visiveis.length - 1 ? 6 : 0, i === visiveis.length - 1 ? 6 : 0, i === 0 ? 6 : 0]
    f.caixa(xi, f.y, wi, 24, { fundo: p.cor, raio })
    if (p.n / total >= 0.07) f.texto(pct(p.n, total), xi + wi / 2, f.y, { tam: 10, peso: 600, cor: p.textoEscuro ? COR.ink : COR.branco, alinhar: 'centro', lh: 2.4 })
    xi += wi + vao
  })
  f.y += 24 + 8

  // legenda: itens em linhas centradas (flex-wrap justify-center gap-x-4)
  const itens = partes.map((p) => {
    const trechos: Trecho[] = [
      { t: `${p.rotulo} `, cor: COR.ink2 },
      { t: numero(p.n), peso: 500, cor: COR.ink },
      ...(comPct ? [{ t: ` (${pct(p.n, total)})`, cor: COR.ink3 }] : []),
      ...(p.nota ? [{ t: ` · ${p.nota}`, cor: COR.ink3 }] : []),
    ]
    const largura = 10 + 6 + trechos.reduce((s, t) => s + f.medirTexto(t.t, 11, t.peso ?? 400), 0)
    return { p, trechos, largura }
  })
  const linhas: (typeof itens)[] = [[]]
  let usado = 0
  for (const it of itens) {
    const l = linhas[linhas.length - 1]
    if (l.length && usado + 16 + it.largura > w) {
      linhas.push([it])
      usado = it.largura
    } else {
      usado += (l.length ? 16 : 0) + it.largura
      l.push(it)
    }
  }
  for (const l of linhas) {
    const larg = l.reduce((s, it) => s + it.largura, 0) + 16 * (l.length - 1)
    let xl = x + (w - larg) / 2
    for (const it of l) {
      f.caixa(xl, f.y + (16.5 - 10) / 2, 10, 10, { fundo: it.p.cor, raio: 3 })
      f.desenharLinhas([it.trechos], xl + 16, f.y, it.largura, { tam: 11, lh: 1.5 })
      xl += it.largura + 16
    }
    f.y += 16.5 + 4
  }
  f.y -= 4
}

// ---- gráfico ----

export interface Grafico {
  rotulos: string[]
  valores: (number | null)[]
  /** último mês ainda em curso: o trecho final tracejado e o ponto vazado */
  parcial: boolean
  cor: string
  formatar: (v: number) => string
  marcasFixas?: number[]
  referencia?: { valor: number; rotulo: string }
}

const ESQ = 40
const DIR = 12
const TOPO = 12
const BAIXO = 24

/** GraficoTempo (uma série, sem interação): grade tracejada, linha, pontos e meses embaixo */
export function grafico(f: Folha, x: number, w: number, altura: number, g: Grafico) {
  const n = g.rotulos.length
  const y0 = f.y
  const passo = n > 1 ? (w - ESQ - DIR) / (n - 1) : 0
  const px = (i: number) => x + (n > 1 ? ESQ + i * passo : (ESQ + w - DIR) / 2)
  const nums = g.valores.filter((v): v is number => v !== null)
  const marcas = g.marcasFixas ?? escala(Math.max(1, ...nums, g.referencia?.valor ?? 0) * 1.05)
  const topo = marcas[marcas.length - 1]
  const py = (v: number) => y0 + TOPO + (1 - v / topo) * (altura - TOPO - BAIXO)

  for (const m of marcas) {
    f.linha(x + ESQ, py(m), x + w - DIR, py(m), { cor: COR.line, traco: m === 0 ? undefined : [2, 3] })
    f.texto(g.formatar(m), x + ESQ - 6, 0, { tam: 10, cor: COR.ink3, alinhar: 'dir', base: py(m) + 3.2 })
  }
  if (g.referencia) {
    const yr = py(g.referencia.valor)
    f.linha(x + ESQ, yr, x + w - DIR, yr, { cor: COR.ok, esp: 1.5, traco: [5, 4] })
    f.texto(g.referencia.rotulo, x + w - DIR, 0, { tam: 10, cor: COR.okTexto, alinhar: 'dir', base: yr - 5 })
  }

  // até o corte a linha é cheia; o mês em curso sai tracejado
  const corte = g.parcial && n > 1 ? n - 1 : n
  let atual: [number, number][] = []
  for (let i = 0; i < corte; i++) {
    const v = g.valores[i]
    if (v === null) {
      f.trilha(atual, { cor: g.cor })
      atual = []
    } else atual.push([px(i), py(v)])
  }
  f.trilha(atual, { cor: g.cor })
  if (corte < n) {
    const resto: [number, number][] = []
    for (let i = Math.max(0, corte - 1); i < n; i++) {
      const v = g.valores[i]
      if (v !== null) resto.push([px(i), py(v)])
    }
    f.trilha(resto, { cor: g.cor, traco: [4, 4] })
  }
  if (n <= 40)
    g.valores.forEach((v, i) => {
      if (v === null) return
      const aberto = i >= corte
      f.circulo(px(i), py(v), 3, { fundo: aberto ? COR.branco : g.cor, borda: aberto ? g.cor : COR.branco, esp: 1.5 })
    })

  // um rótulo de mês a cada ~52 px (sempre o último)
  const cada = Math.max(1, Math.ceil(52 / (passo || 52)))
  g.rotulos.forEach((r, i) => {
    if ((n - 1 - i) % cada !== 0) return
    const alinhar: Alinhar = n > 1 && i === 0 ? 'esq' : n > 1 && i === n - 1 ? 'dir' : 'centro'
    f.texto(r, px(i), 0, { tam: 10, cor: COR.ink3, alinhar, base: y0 + altura - 6 })
  })
  f.y = y0 + altura
}

/** Nota miúda debaixo de uma tabela (text-[10.5px] text-ink-3 mt-1.5) */
export function nota(f: Folha, x: number, w: number, texto: string, tam = 10.5) {
  f.y += 6
  f.paragrafo(texto, x, w, { tam, cor: COR.ink3 })
}

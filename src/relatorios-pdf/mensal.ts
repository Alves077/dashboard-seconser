// Relatório mensal / histórico em PDF — as mesmas seções de relatorios/Mensal.tsx, na mesma ordem.
import { FAIXAS_ESPERA } from '@/calculos/panorama'
import type { GrupoMensal, RelatorioMensal } from '@/calculos/relatorios'
import { PRAZO_DIAS } from '@/config'
import { CATEGORIA_RISCO, FAIXAS } from '@/dados/regras'
import { formatarDia, formatarDiaCurto, rotuloMes } from '@/lib/datas'
import { decimal, numero, pct } from '@/lib/formato'
import { COR, type Folha, type Trecho } from './motor'
import { barraFaixas, colunas, grafico, nota, secao, tabela, type Celula, type Coluna, type EstiloTabela, type LinhaTabela } from './pecas'

// as mesmas cores da tela (Mensal.tsx), já resolvidas (o color-mix vira a cor final)
const COR_FAIXA = [COR.ok, '#2263b1', COR.andamento, COR.atraso]
const COR_ESPERA = [COR.ok, COR.andamento, COR.risco, COR.atraso, '#922929']

const ESTILO: EstiloTabela = { tam: 12, padX: 6, padY: 5, ultimaSemFio: true }

const media = (v: number | null): Celula =>
  v === null ? { trechos: [{ t: '—', cor: COR.ink3 }] } : { trechos: [{ t: `${decimal(v)} d`, ...(v > 15 ? { peso: 600, cor: COR.atrasoTexto } : v > PRAZO_DIAS ? { cor: COR.andamentoTexto } : {}) }] }
const fora = (v: number | null): Celula =>
  v === null ? { trechos: [{ t: '—', cor: COR.ink3 }] } : { trechos: [{ t: `${decimal(v)}%`, ...(v >= 70 ? { peso: 600, cor: COR.atrasoTexto } : v >= 40 ? { cor: COR.andamentoTexto } : {}) }] }
const abertos = (n: number): Celula => ({ trechos: [{ t: n ? numero(n) : '—', ...(n ? {} : { cor: COR.ink3 }) }] })

/** "vs 7,2 d em ago/26" — verde/vermelho pelo sentido bom; "estável" quando quase igual */
function versus(atual: number | null, antes: number | null, mes: string, unidade: string, subirBom: boolean): Trecho[] {
  if (atual === null || antes === null) return []
  const dif = atual - antes
  if (Math.abs(dif) < 0.05) return [{ t: ` · estável vs ${mes}`, cor: COR.ink2 }]
  const bom = subirBom ? dif > 0 : dif < 0
  return [{ t: ' · ' }, { t: `vs ${decimal(antes)}${unidade} em ${mes}`, cor: bom ? COR.okTexto : COR.atrasoTexto }]
}

/** NumeroFolha: rótulo miúdo, número grande e fino, linha de apoio */
function numeros(f: Folha, x: number, w: number, itens: { rotulo: string; valor: string; apoio: Trecho[] }[], porLinha: number) {
  const vao = 8
  const wi = (w - vao * (porLinha - 1)) / porLinha
  for (let i = 0; i < itens.length; i += porLinha) {
    const linha = itens.slice(i, i + porLinha)
    const apoios = linha.map((it) => f.quebrar(it.apoio, wi - 24, 10.5))
    const alto = 8 + 15 + 2 + 25 + 2 + Math.max(...apoios.map((a) => a.length)) * 15.75 + 8
    linha.forEach((it, k) => {
      const xi = x + k * (wi + vao)
      f.caixa(xi, f.y, wi, alto, { borda: COR.line, raio: 6 })
      f.texto(it.rotulo.toUpperCase(), xi + 12, f.y + 8, { tam: 10, peso: 500, cor: COR.ink3, espaco: 0.4 })
      f.texto(it.valor, xi + 12, f.y + 8 + 15 + 2, { tam: 20, peso: 300, lh: 1.25 })
      f.desenharLinhas(apoios[k], xi + 12, f.y + 8 + 15 + 2 + 25 + 2, wi - 24, { tam: 10.5, lh: 1.5, cor: COR.ink2 })
    })
    f.y += alto + (i + porLinha < itens.length ? vao : 0)
  }
}

function tabelaBairros(f: Folha, x: number, w: number, linhas: GrupoMensal[]) {
  const cols: Coluna[] = [{ titulo: 'Bairro', quebra: true }, { titulo: 'Total', alinhar: 'centro' }, { titulo: 'Abertos', alinhar: 'centro' }, { titulo: 'T. médio', alinhar: 'centro' }, { titulo: 'Fora', alinhar: 'centro' }]
  tabela(f, x, w, cols, linhas.map((b) => ({ celulas: [b.nome, numero(b.total), abertos(b.abertos), media(b.media), fora(b.pctFora)] })), ESTILO)
}

/** Movimento da fila: fila no início + registrados − executados = fila no fim (caixas centradas na linha) */
function movimento(f: Folha, x: number, w: number, termos: { rotulo: string; nota: string; valor: number; destaque?: boolean; cor?: string }[]) {
  const op = 24
  const wi = (w - op * 3) / 4
  const montados = termos.map((t) => {
    const rot = f.quebrar([{ t: t.rotulo }], wi - 16, 10)
    const nt = f.quebrar([{ t: t.nota }], wi - 16, 10)
    return { t, rot, nt, alto: 8 + (rot.length + nt.length) * 15 + 2 + 27 + 8 }
  })
  const alto = Math.max(...montados.map((m) => m.alto))
  montados.forEach((m, i) => {
    const xi = x + i * (wi + op)
    const yi = f.y + (alto - m.alto) / 2
    f.caixa(xi, yi, wi, m.alto, { borda: m.t.destaque ? COR.ink : COR.line, raio: 6 })
    let y = yi + 8
    y += f.desenharLinhas(m.rot, xi + 8, y, wi - 16, { tam: 10, cor: COR.ink2, alinhar: 'centro' })
    y += f.desenharLinhas(m.nt, xi + 8, y, wi - 16, { tam: 10, cor: COR.ink3, alinhar: 'centro' })
    f.texto(numero(m.t.valor), xi + wi / 2, y + 2, { tam: 18, peso: m.t.destaque ? 400 : 300, cor: m.t.cor ?? COR.ink, alinhar: 'centro' })
    if (i < 3) f.texto(['+', '−', '='][i], xi + wi + op / 2, f.y + alto / 2 - 12, { tam: 16, cor: COR.ink3, alinhar: 'centro' })
  })
  f.y += alto
}

export function desenharMensal(f: Folha, r: RelatorioMensal, obs: string) {
  const x = f.x0
  const w = f.largura
  if (r.total === 0) {
    f.paragrafo(`Nenhum serviço com esses filtros ${r.todos ? 'no período' : 'neste mês'}.`, x, w, { tam: 13, cor: COR.ink2, alinhar: 'centro' })
    return
  }
  const h = r.historico
  const m = r.movimento
  const mesAnt = r.anterior ? rotuloMes(r.anterior.mes) : ''
  const mesCurto = r.mes !== null ? rotuloMes(r.mes) : ''
  const totalFaixas = r.faixas.reduce((a, b) => a + b, 0)
  const forte = (t: string): Trecho => ({ t, peso: 600, cor: COR.ink })

  if (h) {
    const trechos: Trecho[] = [{ t: 'Indicadores acumulados de ' }, forte(`${numero(h.meses)} meses`), { t: '.' }]
    if (h.ultimoFechado)
      trechos.push(
        { t: ' No último mês fechado (' },
        forte(rotuloMes(h.ultimoFechado.mes)),
        { t: '): tempo médio ' },
        forte(`${decimal(h.ultimoFechado.media)} d`),
        { t: ' e ' },
        forte(`${decimal(h.ultimoFechado.pctFora)}%`),
        { t: ' fora do prazo.' },
      )
    const linhas = f.quebrar(trechos, w - 24, 12.5)
    const alto = linhas.length * 12.5 * 1.625 + 16
    f.caixa(x, f.y, w, alto, { fundo: COR.page, raio: 6 })
    f.desenharLinhas(linhas, x + 12, f.y + 8, w - 24, { tam: 12.5, lh: 1.625, cor: COR.ink2 })
    f.y += alto
  }

  secao(f, x, w, r.todos ? 'Indicadores gerais' : 'Indicadores do mês', (xi, wi) =>
    numeros(
      f,
      xi,
      wi,
      [
        { rotulo: 'Entradas', valor: numero(r.total), apoio: [{ t: 'serviços registrados' }] },
        { rotulo: 'Concluídos', valor: numero(r.concluidos), apoio: [{ t: `${pct(r.concluidos, r.total)} ${r.todos ? 'do total' : '· até hoje'}` }] },
        {
          rotulo: 'No prazo',
          valor: r.pctNoPrazo === null ? '—' : `${decimal(r.pctNoPrazo)}%`,
          apoio: [{ t: `${numero(r.noPrazo)} de ${numero(r.concluidos)}` }, ...(r.anterior ? versus(r.pctNoPrazo, r.anterior.pctNoPrazo, mesAnt, '%', true) : [])],
        },
        {
          rotulo: 'Tempo médio',
          valor: r.media === null ? '—' : `${decimal(r.media)} d`,
          apoio: [{ t: 'dos concluídos' }, ...(r.anterior ? versus(r.media, r.anterior.media, mesAnt, ' d', false) : [])],
        },
        { rotulo: 'Abertos', valor: numero(r.abertos), apoio: [{ t: `${pct(r.abertos, r.total)} do total` }] },
        { rotulo: 'Reaberturas', valor: numero(r.reabIds), apoio: [{ t: `${numero(r.reabTotal)} ${r.reabTotal === 1 ? 'evento' : 'eventos'}` }] },
      ],
      3,
    ),
  )

  if (h && h.fila.total > 0)
    secao(
      f,
      x,
      w,
      'Composição da fila em aberto',
      (xi, wi) => {
        const direita = `${numero(h.fila.total - h.fila.espera[0])} de ${numero(h.fila.total)} (${pct(h.fila.total - h.fila.espera[0], h.fila.total)}) já passaram do prazo`
        f.texto(`${numero(h.fila.total)} serviços pendentes, por tempo de espera`, xi, f.y, { tam: 12.5, peso: 500 })
        f.texto(direita, xi + wi, f.y + 1.5, { tam: 11, cor: COR.ink2, alinhar: 'dir' })
        f.y += 12.5 * 1.5 + 8
        barraFaixas(f, xi, wi, FAIXAS_ESPERA.map((fx, i) => ({ rotulo: fx.rotulo, n: h.fila.espera[i], cor: COR_ESPERA[i], textoEscuro: i < 3 })), h.fila.total)
        if (h.fila.acima150 > 0) nota(f, xi, wi, `${numero(h.fila.acima150)} acima de 150 dias.`)
      },
      { cartao: true },
    )

  if (h && h.ultimos3.length > 0)
    secao(
      f,
      x,
      w,
      'Últimos meses',
      (xi, wi) => {
        const cols: Coluna[] = [
          { titulo: 'Mês' },
          ...['Registrados', 'Executados', 'Abertos', 'T. médio', 'Fora do prazo', 'Fila no fim'].map((t): Coluna => ({ titulo: t, alinhar: 'centro' })),
        ]
        const linhas: LinhaTabela[] = h.ultimos3.map((u) => ({
          celulas: [
            { trechos: [{ t: rotuloMes(u.mes) }, ...(u.parcial ? [{ t: ' (em curso)', tam: 10, cor: COR.ink3 }] : [])] },
            numero(u.registrados),
            numero(u.executados),
            numero(u.abertos),
            media(u.media),
            fora(u.pctFora),
            { trechos: [{ t: numero(u.filaFim), peso: 600, cor: u.saldo > 0 ? COR.atrasoTexto : COR.okTexto }] },
          ],
        }))
        tabela(f, xi, wi, cols, linhas, ESTILO)
        nota(f, xi, wi, 'Fila no fim do mês conta todos os pendentes naquela data, de qualquer mês de registro (vermelho: cresceu no mês; verde: diminuiu).')
      },
      { cartao: true },
    )

  if (m)
    secao(f, x, w, 'Movimento da fila', (xi, wi) => {
      movimento(f, xi, wi, [
        { rotulo: `Fila em ${formatarDiaCurto(m.ini)}`, nota: 'pendentes de meses anteriores', valor: m.inicio },
        { rotulo: `Registrados em ${mesCurto}`, nota: 'novos serviços no mês', valor: m.registrados },
        { rotulo: `Executados em ${mesCurto}`, nota: 'concluídos no mês', valor: m.executados },
        { rotulo: `Fila em ${formatarDiaCurto(m.fimDia)}`, nota: 'pendentes ao fim do mês', valor: m.fim, destaque: true, cor: m.fim > m.inicio ? COR.atrasoTexto : COR.okTexto },
      ])
      f.y += 8
      f.paragrafo(`Dos ${numero(m.executados)} executados, ${numero(m.doMes)} foram registrados em ${mesCurto} e ${numero(m.executados - m.doMes)} em meses anteriores.`, xi, wi, {
        tam: 11,
        cor: COR.ink3,
      })
    })

  if (totalFaixas > 0)
    secao(
      f,
      x,
      w,
      'Distribuição por faixa · só concluídos',
      (xi, wi) => barraFaixas(f, xi, wi, FAIXAS.map((fx, i) => ({ rotulo: fx.rotulo, n: r.faixas[i], cor: COR_FAIXA[i], textoEscuro: i === 0 || i === 2 })), totalFaixas),
      { cartao: true },
    )

  f.y += 20
  colunas(
    f,
    x,
    w,
    [
      [
        1,
        (xi, wi) =>
          secao(
            f,
            xi,
            wi,
            'Por categoria',
            (xc, wc) => {
              const linhas: LinhaTabela[] = r.categorias.map((c) => ({
                celulas: [
                  { trechos: [...(c.nome === CATEGORIA_RISCO ? [{ t: '', icone: 'raio' as const }] : []), { t: c.nome }] },
                  numero(c.total),
                  pct(c.total, r.total),
                  abertos(c.abertos),
                  media(c.media),
                ],
              }))
              if (r.cauda)
                linhas.push({
                  celulas: [{ trechos: [{ t: `Demais (${numero(r.cauda.n)} categorias)`, cor: COR.ink2 }] }, numero(r.cauda.total), pct(r.cauda.total, r.total), abertos(r.cauda.abertos), media(null)],
                })
              tabela(f, xc, wc, [{ titulo: 'Categoria', quebra: true }, ...['Total', '%', 'Abertos', 'T. médio'].map((t): Coluna => ({ titulo: t, alinhar: 'centro' }))], linhas, ESTILO)
            },
            { cartao: true, colado: true },
          ),
      ],
      [
        1,
        (xi, wi) =>
          secao(
            f,
            xi,
            wi,
            'Por região',
            (xc, wc) =>
              tabela(
                f,
                xc,
                wc,
                [{ titulo: 'Região', quebra: true }, ...['Total', '%', 'Abertos', 'T. médio', 'Fora'].map((t): Coluna => ({ titulo: t, alinhar: 'centro' }))],
                r.regioes.map((g) => ({ celulas: [g.nome, numero(g.total), pct(g.total, r.total), abertos(g.abertos), media(g.media), fora(g.pctFora)] })),
                ESTILO,
              ),
            { cartao: true, colado: true },
          ),
      ],
    ],
    24,
  )

  f.y += 20
  colunas(
    f,
    x,
    w,
    [
      [
        1,
        (xi, wi) =>
          secao(
            f,
            xi,
            wi,
            'Bairros · maior volume de pedidos',
            (xc, wc) => {
              tabelaBairros(f, xc, wc, r.bairrosVolume)
              nota(f, xc, wc, 'Tempo médio considera apenas os serviços já concluídos.')
            },
            { cartao: true, colado: true },
          ),
      ],
      [
        1,
        (xi, wi) =>
          secao(
            f,
            xi,
            wi,
            'Bairros · maior backlog',
            (xc, wc) => {
              if (r.bairrosBacklog.length) {
                tabelaBairros(f, xc, wc, r.bairrosBacklog)
                nota(
                  f,
                  xc,
                  wc,
                  `Bairros com ${r.minimoBacklog} ou mais serviços ${r.todos ? 'no período' : 'no mês'}, pela proporção ainda pendente. Com muito pendente, o tempo real pode ser maior que o exibido.`,
                )
              } else f.paragrafo(`Nenhum bairro atingiu ${r.minimoBacklog} serviços ${r.todos ? 'no período' : 'no mês'}.`, xc, wc, { tam: 11, cor: COR.ink3 })
            },
            { cartao: true, colado: true },
          ),
      ],
    ],
    24,
  )

  if (h && h.serie.length > 1)
    secao(
      f,
      x,
      w,
      'Evolução mensal',
      (xi, wi) => {
        const rotulos = h.serie.map((s) => rotuloMes(s.mes))
        const parcial = h.serie[h.serie.length - 1].parcial
        colunas(
          f,
          xi,
          wi,
          [
            [
              1,
              (xc, wc) => {
                f.texto('Tempo médio de execução · dias', xc, f.y, { tam: 12, peso: 500 })
                f.y += 18 + 4
                grafico(f, xc, wc, 170, {
                  rotulos,
                  valores: h.serie.map((s) => s.media),
                  parcial,
                  cor: COR.ink2,
                  formatar: (v) => decimal(v).replace(',0', ''),
                  referencia: { valor: PRAZO_DIAS, rotulo: `prazo · ${PRAZO_DIAS} dias` },
                })
              },
            ],
            [
              1,
              (xc, wc) => {
                f.texto('Fora do prazo · % dos concluídos', xc, f.y, { tam: 12, peso: 500 })
                f.y += 18 + 4
                grafico(f, xc, wc, 170, { rotulos, valores: h.serie.map((s) => s.pctFora), parcial, cor: COR.atraso, formatar: (v) => `${Math.round(v)}%`, marcasFixas: [0, 25, 50, 75, 100] })
              },
            ],
          ],
          24,
        )
        nota(f, xi, wi, 'Serviços agrupados pelo mês de registro. Prazo de atendimento: 5 dias corridos.')
      },
      { cartao: true },
    )

  if (h && h.maisAntigos.length > 0)
    secao(
      f,
      x,
      w,
      'Serviços mais antigos ainda em aberto',
      (xi, wi) => {
        tabela(
          f,
          xi,
          wi,
          [
            { titulo: 'Serviço' },
            { titulo: 'Categoria', alinhar: 'centro', quebra: true },
            { titulo: 'Bairro', alinhar: 'centro', quebra: true },
            { titulo: 'Região', alinhar: 'centro' },
            { titulo: 'Registrado em', alinhar: 'centro' },
            { titulo: 'Dias em aberto', alinhar: 'centro' },
          ],
          h.maisAntigos.map(({ servico, saida, dias }) => ({
            celulas: [
              { trechos: [{ t: String(servico.idColab), peso: 600 }] },
              servico.categoria ?? 'Sem categoria',
              servico.bairro,
              servico.regiao,
              formatarDia(saida.dataSaida),
              { trechos: [{ t: numero(dias), peso: 600, cor: COR.atrasoTexto }] },
            ],
          })),
          ESTILO,
        )
        nota(f, xi, wi, 'Dias em aberto contados até a data de geração do relatório.')
      },
      { cartao: true },
    )

  if (obs.trim())
    secao(f, x, w, 'Observações', (xi, wi) => f.paragrafo(obs.trim(), xi, wi, { tam: 12, lh: 1.625 }), { inteira: false })
}

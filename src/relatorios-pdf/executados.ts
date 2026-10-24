// Serviços executados em PDF — as mesmas seções de relatorios/Executados.tsx: abertura, 4 indicadores, distribuição um
// nível abaixo do filtro, categoria e origem e, se pedida, a lista por região (cartão) e bairro (linha de grupo), execução mais recente primeiro.
import { FAIXAS_EXEC } from '@/calculos/prazo'
import type { LinhaLugarExecutado, RelatorioExecutados } from '@/calculos/relatorios'
import { PRAZO_DIAS } from '@/config'
import { enderecoCurto } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDiaNoAno, type Dia } from '@/lib/datas'
import { decimal, diasLevou, diasLevouCurto, metadeEm, numero, pct } from '@/lib/formato'
import { ESTILO, kpis, tituloCartao } from './abertos'
import { COR, type Folha, type Trecho } from './motor'
import { barraFaixas, cartao, colunas, nota, secao, tabela, type Coluna, type EstiloTabela, type LinhaTabela } from './pecas'

const NIVEL = {
  regiao: { grupo: 'Região', tres: 'Regiões' },
  bairro: { grupo: 'Bairro', tres: 'Bairros' },
  rua: { grupo: 'Rua', tres: 'Ruas' },
} as const

// as mesmas cores da tela (Executados.tsx), com o color-mix já resolvido
const COR_EXEC = [COR.ok, COR.okTexto, COR.andamento, '#e77c28', COR.atraso]
const TEXTO_ESCURO = [true, false, true, true, false]


/** a lista: larguras fixas, para as tabelas das regiões ficarem alinhadas uma embaixo da outra */
const ESTILO_LISTA: EstiloTabela = { ...ESTILO, fixa: true }

export function desenharExecutados(
  f: Folha,
  r: RelatorioExecutados,
  detalhes: Map<string, Detalhe> | null,
  hoje: Dia,
  quando: string,
  comLista: boolean,
) {
  const x = f.x0
  const w = f.largura
  if (r.n === 0) {
    f.paragrafo('Nenhum serviço executado nessa época com esses filtros.', x, w, { tam: 13, cor: COR.ink2, alinhar: 'centro' })
    return
  }
  const { grupo, tres } = NIVEL[r.nivel]
  const forte = (t: string): Trecho => ({ t, peso: 600, cor: COR.ink })
  const um = r.n === 1

  // abertura: fio verde à esquerda, fundo claro (como na tela)
  const trechos: Trecho[] = [
    { t: `${quando.charAt(0).toUpperCase()}${quando.slice(1)} ${um ? 'foi executado' : 'foram executados'} ` },
    forte(numero(r.n)),
    { t: ` ${um ? 'serviço' : 'serviços'}: ` },
    forte(`${numero(r.noPrazo)} no prazo`),
    { t: ` (${pct(r.noPrazo, r.n)}) e ` },
    forte(numero(r.foraPrazo)),
    { t: ` com mais de ${PRAZO_DIAS} dias. Da saída à execução, ` },
    forte(`${decimal(r.media)} dias`),
    ...(r.mediana === 0
      ? [{ t: ' em média; metade ' }, forte('no mesmo dia'), { t: '.' }]
      : [{ t: ' em média; metade em até ' }, forte(diasLevou(r.mediana)), { t: '.' }]),
  ]
  if (r.lugares.length > 1) trechos.push({ t: ` ${tres} com mais execuções: ${r.tres.map((l) => `${l.nome} (${numero(l.executados)})`).join(', ')}.` })
  const linhas = f.quebrar(trechos, w - 27, 12)
  const alto = linhas.length * 12 * 1.625 + 16
  f.caixa(x, f.y, w, alto, { fundo: COR.page, raio: [0, 6, 6, 0] })
  f.caixa(x, f.y, 3, alto, { fundo: COR.ok })
  f.desenharLinhas(linhas, x + 15, f.y + 8, w - 27, { tam: 12, lh: 1.625, cor: COR.ink2 })
  f.y += alto - 4

  secao(f, x, w, 'Indicadores', (xi, wi) =>
    kpis(f, xi, wi, [
      { rotulo: 'Executados', valor: numero(r.n), apoio: quando, cor: COR.ok },
      { rotulo: 'No prazo', valor: numero(r.noPrazo), apoio: `${pct(r.noPrazo, r.n)} · até ${PRAZO_DIAS} dias`, cor: COR.ok },
      { rotulo: 'Fora do prazo', valor: numero(r.foraPrazo), apoio: `${pct(r.foraPrazo, r.n)} · mais de ${PRAZO_DIAS} dias`, cor: COR.atraso },
      { rotulo: 'Tempo médio', valor: decimal(r.media), unidade: 'd', apoio: metadeEm(r.mediana), cor: COR.ink3 },
    ]),
  )

  // o que a média esconde: quantos em cada faixa de dias (como na tela)
  secao(
    f,
    x,
    w,
    'Tempo até a execução',
    (xi, wi) => {
      f.texto(`${numero(r.n)} ${um ? 'executado' : 'executados'}, pelos dias da saída à execução`, xi, f.y, { tam: 12.5, peso: 500 })
      f.texto(`${numero(r.noPrazo)} de ${numero(r.n)} (${pct(r.noPrazo, r.n)}) no prazo de ${PRAZO_DIAS} dias`, xi + wi, f.y + 1.5, { tam: 11, cor: COR.ink2, alinhar: 'dir' })
      f.y += 12.5 * 1.5 + 8
      barraFaixas(
        f,
        xi,
        wi,
        FAIXAS_EXEC.map((fx, i) => ({ rotulo: fx.rotulo, n: r.faixas[i], cor: COR_EXEC[i], textoEscuro: TEXTO_ESCURO[i] })),
        r.n,
        false,
      )
    },
    { cartao: true },
  )

  /** executados, % no prazo e tempo médio; com `total` (na largura toda), também % do total, mediana e a linha do total */
  const tabelaExec = (xd: number, wd: number, titulo: string, linhas: LinhaLugarExecutado[], total = false) =>
    tabela(
      f,
      xd,
      wd,
      [{ titulo, quebra: true }, ...['Executados', ...(total ? ['%'] : []), 'No prazo', 'Tempo médio', ...(total ? ['Mediana'] : [])].map((t): Coluna => ({ titulo: t, alinhar: 'centro' }))],
      [
        ...linhas.map((l) => ({
          celulas: [
            { trechos: [{ t: l.nome, peso: 500 as const }] },
            numero(l.executados),
            ...(total ? [pct(l.executados, r.n)] : []),
            pct(l.noPrazo, l.executados),
            `${decimal(l.media)}d`,
            ...(total ? [diasLevouCurto(l.mediana, 'd')] : []),
          ],
        })),
        ...(total ? [{ tipo: 'total' as const, celulas: ['Total', numero(r.n), '100%', pct(r.noPrazo, r.n), `${decimal(r.media)}d`, diasLevouCurto(r.mediana, 'd')] }] : []),
      ],
      ESTILO,
    )

  // lugar na largura toda (se houver mais de um) e categoria + origem lado a lado embaixo, como na tela
  secao(f, x, w, 'Distribuição', (xi, wi) => {
    if (r.lugares.length > 1) {
      cartao(f, xi, wi, (xd, wd) => {
        tituloCartao(f, xd, `Por ${grupo.toLowerCase()}`)
        tabelaExec(xd, wd, grupo, r.lugares, true)
        if (r.lugares.some((l) => l.nome.startsWith('Demais ('))) nota(f, xd, wd, `${r.nivel === 'rua' ? 'Ruas com mais execuções; as demais somadas' : 'Bairros com mais execuções; os demais somados'} na última linha.`)
      })
      f.y += 16
    }
    colunas(
      f,
      xi,
      wi,
      [
        [
          1,
          (xc, wc) =>
            cartao(f, xc, wc, (xd, wd) => {
              tituloCartao(f, xd, 'Por categoria')
              tabelaExec(xd, wd, 'Categoria', r.categorias)
            }),
        ],
        [
          1,
          (xc, wc) =>
            cartao(f, xc, wc, (xd, wd) => {
              tituloCartao(f, xd, 'Por origem do pedido')
              tabelaExec(xd, wd, 'Origem', r.origens)
              if (r.vereadores.length > 0) nota(f, xd, wd, `Vereadores: ${r.vereadores.map(([v, n]) => `${v} (${n})`).join(', ')}.`)
            }),
        ],
      ],
      20,
    )
  })

  if (!comLista) return

  const colunasLista: Coluna[] = [
    { titulo: 'Serviço', fracao: 0.13, quebra: true },
    { titulo: 'Categoria', esq: true, quebra: true, fracao: 0.17 },
    { titulo: detalhes ? 'Endereço' : 'Rua', esq: true, quebra: true },
    { titulo: 'Saída', fracao: 0.09, alinhar: 'centro' },
    { titulo: 'Execução', fracao: 0.1, alinhar: 'centro' },
    // 10%: cabe "mesmo dia" numa linha
    { titulo: 'Dias', fracao: 0.1, alinhar: 'centro' },
  ]
  secao(
    f,
    x,
    w,
    'Serviços executados',
    (xi, wi) => {
      f.paragrafo(
        `Por região e bairro, a execução mais recente primeiro. Dias = da saída à execução (em vermelho, mais de ${PRAZO_DIAS}). "2ª ida" embaixo do número = serviço que tinha voltado à rua.`,
        xi,
        wi,
        { tam: 10.5, lh: 1.5, cor: COR.ink3 },
      )
      f.y += 8
      r.regioes.forEach((reg, i) => {
        if (i > 0) f.y += 12
        cartao(f, xi, wi, (xc, wc) => {
          f.texto(reg.nome, xc, f.y, { tam: 12, peso: 600 })
          f.texto(`${numero(reg.total)} ${reg.total === 1 ? 'serviço' : 'serviços'}`, xc + wc, f.y + 1, { tam: 11, cor: COR.ink2, alinhar: 'dir' })
          f.y += 18 + 4
          const linhasTabela: LinhaTabela[] = reg.bairros.flatMap((b): LinhaTabela[] => [
            { tipo: 'grupo', trechos: [{ t: `${b.nome} ` }, { t: `· ${numero(b.itens.length)}`, peso: 400, cor: COR.ink3 }] },
            ...b.itens.map(({ servico, saida, dias }) => ({
              celulas: [
                { trechos: [{ t: String(servico.idColab), peso: 600 as const }], pilula: saida.ordem > 1 ? `${saida.ordem}ª ida` : undefined },
                servico.categoria ?? 'Sem categoria',
                // com login, rua e número (sem o fim " - Bairro, Niterói - RJ, CEP": o bairro já é o grupo); sem, só a rua
                (detalhes ? (e => (e ? enderecoCurto(e) : null))(detalhes.get(servico.chave)?.endereco) : servico.rua) ?? '—',
                formatarDiaNoAno(saida.dataSaida, hoje),
                formatarDiaNoAno(saida.dataRetorno!, hoje),
                { trechos: [{ t: diasLevouCurto(dias), ...(dias > PRAZO_DIAS ? { peso: 500 as const, cor: COR.atrasoTexto } : {}) }] },
              ],
            })),
          ])
          tabela(f, xc, wc, colunasLista, linhasTabela, ESTILO_LISTA)
        })
      })
    },
    { inteira: false },
  )
}

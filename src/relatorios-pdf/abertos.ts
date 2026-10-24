// Serviços em aberto em PDF — as mesmas seções de relatorios/Abertos.tsx (compacto, como o PDF do
// tratamento_manual/relatorio_abertos.py): contexto, 6 indicadores, composição da fila, distribuição e os mais antigos.
// Modo "Hoje" (`doDia`): o resumo do dia, como na tela — abertura do dia, 4 indicadores, sem barra e colunas de espera
// e sem lista no fim (a do dia é a Lista de campo). Outra época: abertura e indicadores de quem saiu nela, sem as faixas de espera e o
// "> 30 dias" que ela não deixa acontecer (como na tela).
import { faixasDaEpoca, origemTexto, variaNaEpoca, type LinhaSimplesAberto, type RelatorioAbertos } from '@/calculos/relatorios'
import { enderecoCurto } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDia, rotuloMes, type Dia } from '@/lib/datas'
import { decimal, numero, pct } from '@/lib/formato'
import { COR, type Folha, type Trecho } from './motor'
import { barraFaixas, cartao, colunas, nota, secao, tabela, type Celula, type Coluna, type EstiloTabela } from './pecas'

// as mesmas cores da tela (Abertos.tsx), com o color-mix já resolvido
const COR_ESPERA = [COR.ok, COR.andamento, '#e77c28', COR.atraso, '#872727']

/** .folha-compacta: tabela menor, numa linha só (menos o que pode quebrar) */
export const ESTILO: EstiloTabela = { tam: 10.5, padX: 5, padY: 3, ultimaSemFio: true }

const MESES_NO_RESUMO = 12
/** a partir de quantas letras um texto da tabela de mais antigos pode quebrar linha */
const LONGO = 24

/** nome do nível da tabela de distribuição (um abaixo do filtro) e a frase "os três … com mais pendências" */
const NIVEL = {
  regiao: { grupo: 'Região', tres: 'As três regiões', um: 'outra região', varios: 'outras', plural: 'regiões' },
  bairro: { grupo: 'Bairro', tres: 'Os três bairros', um: 'outro bairro', varios: 'outros', plural: 'bairros' },
  rua: { grupo: 'Rua', tres: 'As três ruas', um: 'outra rua', varios: 'outras', plural: 'ruas' },
} as const

/** espera acima de 30 dias em vermelho, acima de 15 em âmbar */
const corDias = (v: number) => (v > 30 ? COR.atrasoTexto : v > 15 ? COR.andamentoTexto : undefined)
const dias = (v: number, peso: 400 | 600 = 400): Celula => ({ trechos: [{ t: `${decimal(v)}d`, peso, cor: corDias(v) }] })

/** Indicador do script: rótulo, barrinha de cor ao lado do número e uma linha de apoio (também nos Executados) */
export function kpis(f: Folha, x: number, w: number, itens: { rotulo: string; valor: string; unidade?: string; apoio: string; cor: string }[]) {
  const vao = 6
  const wi = (w - vao * (itens.length - 1)) / itens.length
  const montados = itens.map((it) => ({
    it,
    rot: f.quebrar([{ t: it.rotulo.toUpperCase() }], wi - 20, 9.5),
    apoio: it.apoio ? f.quebrar([{ t: it.apoio }], wi - 20, 10) : [],
  }))
  const alto = 8 + Math.max(...montados.map((m) => m.rot.length * 14.25 + 4 + 20 + 4 + m.apoio.length * 15)) + 8
  montados.forEach((m, k) => {
    const xi = x + k * (wi + vao)
    f.caixa(xi, f.y, wi, alto, { borda: COR.line, raio: 6 })
    let y = f.y + 8
    m.rot.forEach((l, i) => f.texto(l.map((t) => t.t).join(''), xi + 10, y + i * 14.25, { tam: 9.5, peso: 600, cor: COR.ink3, espaco: 0.47 }))
    y += m.rot.length * 14.25 + 4
    f.caixa(xi + 10, y, 3, 20, { fundo: m.it.cor, raio: 1.5 })
    f.texto(m.it.valor, xi + 21, y, { tam: 20, peso: 700, lh: 1 })
    if (m.it.unidade) f.texto(m.it.unidade, xi + 21 + f.medirTexto(m.it.valor, 20, 700) + 2, 0, { tam: 11, cor: COR.ink2, base: f.base(y, 20, 1) })
    y += 20 + 4
    f.desenharLinhas(m.apoio, xi + 10, y, wi - 20, { tam: 10, cor: COR.ink2 })
  })
  f.y += alto
}

function tabelaSimples(f: Folha, x: number, w: number, titulo: string, linhas: LinhaSimplesAberto[], total: number, doDia = false) {
  tabela(
    f,
    x,
    w,
    [{ titulo, quebra: true }, ...(doDia ? ['Saíram', '%'] : ['Abertos', '%', 'Espera média']).map((t): Coluna => ({ titulo: t, alinhar: 'centro' }))],
    linhas.map((l) => ({
      celulas: [{ trechos: [{ t: l.nome, peso: 500 }] }, numero(l.abertos), pct(l.abertos, total), ...(doDia ? [] : [`${decimal(l.media)}d`])],
    })),
    ESTILO,
  )
}

/** título dentro do cartão (text-[12px] font-semibold mb-1) */
export function tituloCartao(f: Folha, x: number, texto: string) {
  f.texto(texto, x, f.y, { tam: 12, peso: 600 })
  f.y += 18 + 4
}

export function desenharAbertos(
  f: Folha,
  r: RelatorioAbertos,
  detalhes: Map<string, Detalhe> | null,
  hoje: Dia,
  doDia = false,
  quando: string | null = null,
) {
  const x = f.x0
  const w = f.largura
  if (r.n === 0) {
    f.paragrafo('Nenhum serviço em aberto com esses filtros.', x, w, { tam: 13, cor: COR.ink2, alinhar: 'centro' })
    return
  }
  const { grupo, tres, um, varios, plural } = NIVEL[r.nivel]
  const somaTres = r.tres.reduce((t, l) => t + l.abertos, 0)
  const ultimosMeses = r.meses.slice(-MESES_NO_RESUMO)
  const antes = r.meses.slice(0, -MESES_NO_RESUMO).reduce((t, [, n]) => t + n, 0)
  const forte = (t: string): Trecho => ({ t, peso: 600, cor: COR.ink })
  // época escolhida (menos "Hoje"): conta quem saiu nela e esconde o que ela não deixa acontecer
  const ep = doDia ? null : r.epoca
  const faixas = faixasDaEpoca(ep?.esperaMin ?? 0, ep?.esperaMax ?? Infinity)
  const varia = variaNaEpoca(ep)
  const mostra30 = varia.mais30

  // contexto: fio âmbar à esquerda, fundo claro
  const trechos: Trecho[] = doDia
    ? aberturaDoDia()
    : ep
      ? [
          { t: 'Dos ' },
          forte(numero(ep.saiu)),
          { t: ` que saíram para a rua ${quando ?? 'na época'}, ` },
          forte(`${numero(r.n)} seguem em aberto`),
          { t: ` (${pct(r.n, ep.saiu)})` },
          ...(ep.saiu > r.n ? [{ t: ' e ' }, forte(numero(ep.saiu - r.n)), { t: ' já tiveram retorno' }] : []),
          { t: '. ' },
        ]
      : r.filtrado
        ? [{ t: `${r.nome} concentra ` }, forte(`${numero(r.n)} dos ${numero(r.totalCidade)} serviços em aberto`), { t: ` na cidade (${pct(r.n, r.totalCidade)}). ` }]
        : [forte(`${numero(r.n)} serviços em aberto`), { t: ' na cidade. ' }]
  if (!doDia) {
  trechos.push(
    ...(varia.atraso ? [forte(numero(r.atraso))] : [{ t: 'Todos' }]),
    { t: ' já passaram do prazo de 5 dias e a espera média é de ' },
    forte(`${decimal(r.media)} dias`),
    { t: `. ${tres} com mais pendências (${r.tres.map((l) => l.nome).join(', ')}) somam ` },
    forte(numero(somaTres)),
    { t: ` serviços (${pct(somaTres, r.n)}).` },
  )
  // um mês só: "Por mês de registro: set/26: 12" repetiria o total (como na tela)
  if (r.meses.length > 1) {
    trechos.push({ t: ' Por mês de registro: ' })
    if (antes > 0) trechos.push({ t: `antes de ${rotuloMes(ultimosMeses[0][0])}: ` }, forte(numero(antes)), { t: ' · ' })
    ultimosMeses.forEach(([k, n], i) => trechos.push({ t: `${i > 0 ? ' · ' : ''}${rotuloMes(k)}: ` }, forte(numero(n))))
    trechos.push({ t: '.' })
  }
  }

  /** "Hoje saíram 75 para a rua: Camboinhas (61), Piratininga (14) e mais 3 em outros 2 bairros." (como na tela) */
  function aberturaDoDia(): Trecho[] {
    const nomeados = r.lugares.filter((l) => !l.nome.startsWith('Demais (')).slice(0, 3)
    const resto = r.n - nomeados.reduce((s, l) => s + l.abertos, 0)
    const lugaresResto = (r.nivel === 'rua' ? r.atendidos : r.lugares.length) - nomeados.length
    // "(61)" inteiro em negrito: o PDF pode quebrar a linha onde o estilo muda, e "( / 61)" ficava partido
    const partes: Trecho[][] = nomeados.map((l) => [{ t: `${l.nome} ` }, forte(`(${numero(l.abertos)})`)])
    if (resto > 0) partes.push([{ t: `mais ${numero(resto)} em ${lugaresResto === 1 ? um : `${varios} ${numero(lugaresResto)} ${plural}`}` }])
    const saida: Trecho[] = [{ t: `Hoje ${r.n === 1 ? 'saiu' : 'saíram'} ` }, forte(numero(r.n)), { t: ' para a rua: ' }]
    partes.forEach((p, i) => saida.push(...(i > 0 ? [{ t: i === partes.length - 1 ? ' e ' : ', ' }] : []), ...p))
    saida.push({ t: '.' })
    return saida
  }
  const linhas = f.quebrar(trechos, w - 27, 12)
  const alto = linhas.length * 12 * 1.625 + 16
  f.caixa(x, f.y, w, alto, { fundo: COR.page, raio: [0, 6, 6, 0] })
  f.caixa(x, f.y, 3, alto, { fundo: COR.andamento })
  f.desenharLinhas(linhas, x + 15, f.y + 8, w - 27, { tam: 12, lh: 1.625, cor: COR.ink2 })
  f.y += alto - 4 // mb-4 (16) em vez dos 20 de cima de toda seção

  secao(f, x, w, 'Indicadores', (xi, wi) =>
    kpis(f, xi, wi, doDia ? [
      { rotulo: 'Saíram hoje', valor: numero(r.n), apoio: 'para a rua', cor: COR.andamento },
      { rotulo: 'Voltando à rua', valor: numero(r.voltando), apoio: '2ª ida ou mais', cor: COR.ink3 },
      { rotulo: 'Institucionais', valor: numero(r.institucionais), apoio: 'regional, vereador etc.', cor: COR.s1 },
      { rotulo: r.nivel === 'rua' ? 'Ruas atendidas' : 'Bairros atendidos', valor: numero(r.atendidos), apoio: 'com saída hoje', cor: COR.s7 },
    ] : [
      ...(ep
        ? [
            { rotulo: 'Saíram', valor: numero(ep.saiu), apoio: quando ?? 'na época', cor: COR.ink3 },
            { rotulo: 'Em aberto', valor: numero(r.n), apoio: `${pct(r.n, ep.saiu)} das saídas`, cor: COR.andamento },
          ]
        : [{ rotulo: 'Em aberto', valor: numero(r.n), apoio: r.filtrado ? `${pct(r.n, r.totalCidade)} da cidade` : 'cidade toda', cor: COR.andamento }]),
      ...(varia.atraso ? [{ rotulo: 'Em atraso', valor: numero(r.atraso), apoio: `${pct(r.atraso, r.n)} · prazo de 5 dias`, cor: COR.atraso }] : []),
      { rotulo: 'Espera média', valor: decimal(r.media), unidade: 'd', apoio: 'desde o registro', cor: COR.ink3 },
      ...(mostra30 ? [{ rotulo: 'Acima de 30 dias', valor: numero(r.mais30), apoio: `${pct(r.mais30, r.n)} da fila`, cor: COR.atraso }] : []),
      ...(!ep || !varia.atraso || !mostra30
        ? [{ rotulo: 'Mais antigo', valor: numero(r.maisAntigo), unidade: 'd', apoio: r.registroMaisAntigo === null ? '' : `desde ${formatarDia(r.registroMaisAntigo)}`, cor: COR.s7 }]
        : []),
      { rotulo: 'Institucionais', valor: numero(r.institucionais), apoio: 'regional, vereador etc.', cor: COR.s1 },
    ]),
  )

  if (!doDia) secao(
    f,
    x,
    w,
    'Composição da fila em aberto',
    (xi, wi) => {
      f.texto(`${numero(r.n)} serviços pendentes, por tempo de espera`, xi, f.y, { tam: 12.5, peso: 500 })
      f.texto(`${varia.atraso ? `${numero(r.n - r.espera[0])} de ${numero(r.n)} (${pct(r.n - r.espera[0], r.n)})` : 'Todos'} já passaram do prazo`, xi + wi, f.y + 1.5, { tam: 11, cor: COR.ink2, alinhar: 'dir' })
      f.y += 12.5 * 1.5 + 8
      barraFaixas(
        f,
        xi,
        wi,
        faixas.map(({ i, rotulo }) => ({ rotulo, n: r.espera[i], cor: COR_ESPERA[i], textoEscuro: i < 3, nota: i === 0 ? 'dentro do prazo' : undefined })),
        r.n,
        false,
      )
    },
    { cartao: true },
  )

  secao(
    f,
    x,
    w,
    'Distribuição',
    // "por região/bairro/rua" na largura toda e categoria + origem lado a lado embaixo, como na tela (antes as três
    // espremidas em duas colunas: nomes e títulos quebrando — usuário, 21/10/2026, achou a tela mais agradável)
    (xi, wi) => {
      // um lugar só: a tabela seria uma linha igual ao total — sai (como na tela)
      if (r.lugares.length > 1) cartao(f, xi, wi, (xd, wd) => {
        tituloCartao(f, xd, `Por ${grupo.toLowerCase()}`)
        tabela(
          f,
          xd,
          wd,
          [
            { titulo: grupo, quebra: true },
            ...(doDia ? ['Saíram', '%'] : ['Abertos', '%', 'Espera média', ...(mostra30 ? ['> 30 dias'] : []), 'Mais antigo']).map(
              (t): Coluna => ({ titulo: t, alinhar: 'centro' }),
            ),
          ],
          [
            ...r.lugares.map((l) => ({
              celulas: [
                { trechos: [{ t: l.nome, peso: 500 as const }] },
                numero(l.abertos),
                pct(l.abertos, r.n),
                ...(doDia
                  ? []
                  : [
                      dias(l.media),
                      ...(mostra30 ? [l.mais30 ? numero(l.mais30) : '—'] : []),
                      { trechos: [{ t: `${numero(l.maisAntigo)}d`, peso: 600 as const, cor: corDias(l.maisAntigo) }] },
                    ]),
              ],
            })),
            {
              tipo: 'total' as const,
              celulas: ['Total', numero(r.n), '100%', ...(doDia ? [] : [`${decimal(r.media)}d`, ...(mostra30 ? [numero(r.mais30)] : []), `${numero(r.maisAntigo)}d`])],
            },
          ],
          ESTILO,
        )
        nota(
          f,
          xd,
          wd,
          `${doDia ? '' : `Espera contada do registro do serviço até ${formatarDia(hoje)}.`}${r.lugares.some((l) => l.nome.startsWith('Demais (')) ? ' Ruas com mais pedidos; as demais somadas na última linha.' : ''}`.trim(),
        )
      })
      if (r.lugares.length > 1) f.y += 16
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
                tabelaSimples(f, xd, wd, 'Categoria', r.categorias, r.n, doDia)
              }),
          ],
          [
            1,
            (xc, wc) =>
              cartao(f, xc, wc, (xd, wd) => {
                tituloCartao(f, xd, 'Por origem do pedido')
                tabelaSimples(f, xd, wd, 'Origem', r.origens, r.n, doDia)
                if (r.vereadores.length > 0) nota(f, xd, wd, `Vereadores: ${r.vereadores.map(([v, n]) => `${v} (${n})`).join(', ')}.`)
              }),
          ],
        ],
        20,
      )
    },
  )

  // dia: sem lista — a do que saiu é a Lista de campo (como na tela)
  if (doDia) return

  secao(
    f,
    x,
    w,
    'Serviços mais antigos ainda em aberto',
    (xi, wi) =>
      tabela(
        f,
        xi,
        wi,
        [
          { titulo: 'Serviço' },
          ...(detalhes ? [{ titulo: 'Endereço', esq: true, quebra: true }] : []),
          { titulo: 'Bairro', alinhar: 'centro', quebra: true },
          { titulo: 'Categoria', alinhar: 'centro' },
          { titulo: 'Origem', alinhar: 'centro', quebra: true },
          { titulo: 'Registro', alinhar: 'centro' },
          { titulo: 'Dias', alinhar: 'centro' },
        ],
        r.antigos.map(({ servico, saida, dias: d }) => {
          const origem = origemTexto(servico)
          return {
            celulas: [
              { trechos: [{ t: String(servico.idColab), peso: 600 }] },
              ...(detalhes ? [(e => (e ? enderecoCurto(e) : '—'))(detalhes.get(servico.chave)?.endereco)] : []),
              // só texto LONGO quebra (como na tela); o resto fica numa linha
              servico.bairro.length > LONGO ? servico.bairro : { trechos: [{ t: servico.bairro.replace(/ /g, '\u00a0') }] },
              servico.categoria ?? 'Sem categoria',
              origem.length > LONGO ? origem : { trechos: [{ t: origem.replace(/ /g, '\u00a0') }] },
              formatarDia(saida.dataSaida),
              { trechos: [{ t: numero(d), peso: 600, cor: COR.atrasoTexto }] },
            ],
          }
        }),
        ESTILO,
      ),
    { cartao: true },
  )
}

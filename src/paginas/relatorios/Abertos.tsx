// Serviços em aberto — o mesmo relatório do tratamento_manual/relatorio_abertos.py (PDF de 1 página),
// seção por seção: contexto, 6 indicadores, composição da fila, distribuição por bairro (ou região),
// categoria e origem (com os vereadores) e os mais antigos. Não depende do período.
// Modo "Hoje" (`doDia`, usuário 21/10/2026): o que saiu para a rua no dia — espera e atraso dariam zero, então troca a
// abertura e os indicadores (voltando à rua, lugares atendidos), tira a barra e as colunas de espera e a lista dos mais
// antigos (a lista do dia é a Lista de campo). Mesmo esqueleto, para a troca de época não mudar as coisas de lugar.
// Outra época (7/30/90 dias, este ano, um mês; usuário, 21/10/2026): a abertura e os indicadores contam quem saiu nela e
// quantos seguem em aberto, e somem as faixas de espera e o "> 30 dias" que a época não deixa acontecer.
import { clsx } from 'clsx'
import { faixasDaEpoca, origemTexto, variaNaEpoca, type LinhaSimplesAberto, type RelatorioAbertos } from '@/calculos/relatorios'
import { enderecoCurto } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDia, rotuloMes, type Dia } from '@/lib/datas'
import { decimal, numero, pct } from '@/lib/formato'
import { BarraFaixas, IdServico, Rolavel, SecaoFolha } from './Folha'

// cores do script: verde · dourado · âmbar escuro · vermelho · vermelho escuro
const COR_ESPERA = [
  'var(--c-ok)',
  'var(--c-andamento)',
  'color-mix(in oklab, var(--c-andamento) 55%, var(--c-atraso))',
  'var(--c-atraso)',
  'color-mix(in oklab, var(--c-atraso) 65%, black)',
]

/** Espera: acima de 30 dias em vermelho, acima de 15 em âmbar (como no script) */
const corDias = (v: number) => (v > 30 ? 'text-atraso-texto' : v > 15 ? 'text-andamento-texto' : undefined)

/** Indicador do script: rótulo, barrinha de cor ao lado do número e uma linha de apoio (também nos Executados) */
export function Kpi({ rotulo, valor, unidade, apoio, cor }: { rotulo: string; valor: string; unidade?: string; apoio: string; cor: string }) {
  return (
    <div className="rounded-md border border-line px-2.5 py-2">
      <p className="text-[9.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase">{rotulo}</p>
      <p className="mt-1 flex items-center">
        <span aria-hidden className="mr-2 h-5 w-[3px] rounded-full" style={{ background: cor }} />
        <span className="numeros text-[20px] leading-none font-bold tracking-[-0.03em] text-ink">{valor}</span>
        {unidade && <span className="ml-0.5 text-[11px] text-ink-2">{unidade}</span>}
      </p>
      <p className="mt-1 text-[10px] text-ink-2">{apoio}</p>
    </div>
  )
}

function TabelaSimples({ titulo, linhas, total, doDia = false }: { titulo: string; linhas: LinhaSimplesAberto[]; total: number; doDia?: boolean }) {
  return (
    <Rolavel minimo="max-sm:min-w-[21rem]">
      <table className="tabela-folha">
        <thead>
          <tr>
            <th>{titulo}</th>
            <th className="num">{doDia ? 'Saíram' : 'Abertos'}</th>
            <th className="num">%</th>
            {!doDia && <th className="num">Espera média</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome}>
              {/* "quebra": o compacto é uma linha só, mas nome longo ("Ministério Público do Estado do Rio de
                  Janeiro") empurrava as colunas de número para fora do cartão */}
              <td className="quebra font-medium">{l.nome}</td>
              <td className="num">{numero(l.abertos)}</td>
              <td className="num">{pct(l.abertos, total)}</td>
              {!doDia && <td className="num">{decimal(l.media)}d</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Rolavel>
  )
}

const MESES_NO_RESUMO = 12
/** a partir de quantas letras um texto da tabela de mais antigos pode quebrar linha */
const LONGO = 24

/** nome do nível da tabela de distribuição (um abaixo do filtro) e a frase "os três … com mais pendências" */
const NIVEL = {
  regiao: { grupo: 'Região', tres: 'As três regiões', um: 'outra região', varios: 'outras', plural: 'regiões' },
  bairro: { grupo: 'Bairro', tres: 'Os três bairros', um: 'outro bairro', varios: 'outros', plural: 'bairros' },
  rua: { grupo: 'Rua', tres: 'As três ruas', um: 'outra rua', varios: 'outras', plural: 'ruas' },
} as const

/** "Hoje saíram 75 para a rua: Camboinhas (61), Piratininga (14) e mais 3 em outros 2 bairros." */
function AberturaDoDia({ r }: { r: RelatorioAbertos }) {
  const nivel = NIVEL[r.nivel]
  const nomeados = r.lugares.filter((l) => !l.nome.startsWith('Demais (')).slice(0, 3)
  const resto = r.n - nomeados.reduce((s, l) => s + l.abertos, 0)
  // no mesmo nível da tabela: regiões, bairros ou ruas (com rua, a tabela soma o resto em "Demais": conta as ruas)
  const lugaresResto = (r.nivel === 'rua' ? r.atendidos : r.lugares.length) - nomeados.length
  const partes = nomeados.map((l) => (
    <span key={l.nome}>
      {l.nome} (<strong className="font-semibold text-ink">{numero(l.abertos)}</strong>)
    </span>
  ))
  if (resto > 0)
    partes.push(
      <span key="resto">
        mais {numero(resto)} em {lugaresResto === 1 ? nivel.um : `${nivel.varios} ${numero(lugaresResto)} ${nivel.plural}`}
      </span>,
    )
  return (
    <>
      Hoje {r.n === 1 ? 'saiu' : 'saíram'} <strong className="font-semibold text-ink">{numero(r.n)}</strong> para a rua:{' '}
      {partes.map((p, i) => (
        <span key={i}>
          {i > 0 && (i === partes.length - 1 ? ' e ' : ', ')}
          {p}
        </span>
      ))}
      .
    </>
  )
}

export function RelatorioAbertosFolha({
  r,
  detalhes,
  hoje,
  doDia = false,
  quando = null,
}: {
  r: RelatorioAbertos
  detalhes: Map<string, Detalhe> | null
  hoje: Dia
  /** época "Hoje" (o que saiu para a rua no dia) */
  doDia?: boolean
  /** a época escolhida, para a frase: "nos últimos 30 dias", "em setembro de 2026" */
  quando?: string | null
}) {
  if (r.n === 0) return <p className="py-10 text-center text-[13px] text-ink-2">Nenhum serviço em aberto com esses filtros.</p>
  const { grupo, tres } = NIVEL[r.nivel]
  // época escolhida (menos "Hoje"): conta quem saiu nela e esconde o que ela não deixa acontecer
  const ep = doDia ? null : r.epoca
  const faixas = faixasDaEpoca(ep?.esperaMin ?? 0, ep?.esperaMax ?? Infinity)
  const varia = variaNaEpoca(ep)
  const mostra30 = varia.mais30
  const somaTres = r.tres.reduce((t, l) => t + l.abertos, 0)
  // mês a mês só os 12 mais recentes; o resto vira "antes de …" (com anos de fila virava um parágrafo de ~100 meses)
  const ultimosMeses = r.meses.slice(-MESES_NO_RESUMO)
  const antes = r.meses.slice(0, -MESES_NO_RESUMO).reduce((t, [, n]) => t + n, 0)

  return (
    <div className="folha-compacta">
      <p className="mb-4 rounded-r-md border-l-[3px] border-andamento bg-page px-3 py-2 text-[12px] leading-relaxed text-ink-2">
        {doDia ? (
          <AberturaDoDia r={r} />
        ) : (
          <>
        {ep ? (
          <>
            Dos <strong className="font-semibold text-ink">{numero(ep.saiu)}</strong> que saíram para a rua {quando ?? 'na época'},{' '}
            <strong className="font-semibold text-ink">{numero(r.n)} seguem em aberto</strong> ({pct(r.n, ep.saiu)})
            {ep.saiu > r.n && (
              <>
                {' '}e <strong className="font-semibold text-ink">{numero(ep.saiu - r.n)}</strong> já tiveram retorno
              </>
            )}
            .
          </>
        ) : r.filtrado ? (
          <>
            {r.nome} concentra{' '}
            <strong className="font-semibold text-ink">
              {numero(r.n)} dos {numero(r.totalCidade)} serviços em aberto
            </strong>{' '}
            na cidade ({pct(r.n, r.totalCidade)}).
          </>
        ) : (
          <>
            <strong className="font-semibold text-ink">{numero(r.n)} serviços em aberto</strong> na cidade.
          </>
        )}{' '}
        {varia.atraso ? <strong className="font-semibold text-ink">{numero(r.atraso)}</strong> : 'Todos'} já passaram do prazo de 5 dias e a espera média é de{' '}
        <strong className="font-semibold text-ink">{decimal(r.media)} dias</strong>. {tres} com mais
        pendências ({r.tres.map((l) => l.nome).join(', ')}) somam <strong className="font-semibold text-ink">{numero(somaTres)}</strong> serviços (
        {pct(somaTres, r.n)}).
        {/* um mês só (época de um mês, por exemplo): "Por mês de registro: set/26: 12" repetiria o total */}
        {r.meses.length > 1 && (
          <>
            {' '}Por mês de registro:{' '}
            {antes > 0 && (
              <span>
                antes de {rotuloMes(ultimosMeses[0][0])}: <strong className="font-semibold text-ink">{numero(antes)}</strong> ·{' '}
              </span>
            )}
            {ultimosMeses.map(([k, n], i) => (
              <span key={k}>
                {i > 0 && ' · '}
                {rotuloMes(k)}: <strong className="font-semibold text-ink">{numero(n)}</strong>
              </span>
            ))}
            .
          </>
        )}
          </>
        )}
      </p>

      <SecaoFolha titulo="Indicadores">
        {doDia ? (
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4 print:grid-cols-4">
            <Kpi rotulo="Saíram hoje" valor={numero(r.n)} apoio="para a rua" cor="var(--c-andamento)" />
            <Kpi rotulo="Voltando à rua" valor={numero(r.voltando)} apoio="2ª ida ou mais" cor="var(--c-ink-3)" />
            <Kpi rotulo="Institucionais" valor={numero(r.institucionais)} apoio="regional, vereador etc." cor="var(--c-s1)" />
            <Kpi rotulo={r.nivel === 'rua' ? 'Ruas atendidas' : 'Bairros atendidos'} valor={numero(r.atendidos)} apoio="com saída hoje" cor="var(--c-s7)" />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
          {/* com época: "Saíram" e "Em aberto · % das saídas" no lugar de "Em aberto · % da cidade" (a cidade é a fila toda,
              não a época; "Seguem em aberto" quebrava em duas linhas e desalinhava a fileira — usuário, 21/10/2026); "Em atraso" e "Acima de 30 dias" só se a época deixa variar (nos últimos 30 dias "> 30" dá sempre
              zero; em setembro "em atraso" dá sempre 100%) — no lugar do que sai, "Mais antigo" */}
          {ep ? (
            <>
              <Kpi rotulo="Saíram" valor={numero(ep.saiu)} apoio={quando ?? 'na época'} cor="var(--c-ink-3)" />
              <Kpi rotulo="Em aberto" valor={numero(r.n)} apoio={`${pct(r.n, ep.saiu)} das saídas`} cor="var(--c-andamento)" />
            </>
          ) : (
            <Kpi rotulo="Em aberto" valor={numero(r.n)} apoio={r.filtrado ? `${pct(r.n, r.totalCidade)} da cidade` : 'cidade toda'} cor="var(--c-andamento)" />
          )}
          {varia.atraso && <Kpi rotulo="Em atraso" valor={numero(r.atraso)} apoio={`${pct(r.atraso, r.n)} · prazo de 5 dias`} cor="var(--c-atraso)" />}
          <Kpi rotulo="Espera média" valor={decimal(r.media)} unidade="d" apoio="desde o registro" cor="var(--c-ink-3)" />
          {mostra30 && <Kpi rotulo="Acima de 30 dias" valor={numero(r.mais30)} apoio={`${pct(r.mais30, r.n)} da fila`} cor="var(--c-atraso)" />}
          {(!ep || !varia.atraso || !mostra30) && (
            <Kpi
              rotulo="Mais antigo"
              valor={numero(r.maisAntigo)}
              unidade="d"
              apoio={r.registroMaisAntigo === null ? '' : `desde ${formatarDia(r.registroMaisAntigo)}`}
              cor="var(--c-s7)"
            />
          )}
          <Kpi rotulo="Institucionais" valor={numero(r.institucionais)} apoio="regional, vereador etc." cor="var(--c-s1)" />
        </div>
        )}
      </SecaoFolha>

      {!doDia && (
      <SecaoFolha titulo="Composição da fila em aberto" cartao>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[12.5px] font-medium text-ink">{numero(r.n)} serviços pendentes, por tempo de espera</p>
          <p className="text-[11px] text-ink-2">
            {varia.atraso ? `${numero(r.n - r.espera[0])} de ${numero(r.n)} (${pct(r.n - r.espera[0], r.n)})` : 'Todos'} já passaram do prazo
          </p>
        </div>
        <BarraFaixas
          comPct={false}
          partes={faixas.map(({ i, rotulo }) => ({ rotulo, n: r.espera[i], cor: COR_ESPERA[i], textoEscuro: i < 3, nota: i === 0 ? 'dentro do prazo' : undefined }))}
          total={r.n}
        />
      </SecaoFolha>
      )}

      <SecaoFolha titulo="Distribuição">
        {/* "por região/bairro/rua" na largura toda e categoria + origem lado a lado embaixo — na tela e no papel (antes o
            papel espremia as três em duas colunas: nomes e títulos quebrando; usuário, 21/10/2026, achou a tela mais agradável) */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 max-sm:[&>*]:min-w-0">
          {/* um lugar só (tudo saiu numa região, por exemplo): a tabela seria uma linha igual ao total — sai; a abertura já diz onde */}
          {r.lugares.length > 1 && (
          <div className="cartao-folha">
            <p className="mb-1 text-[12px] font-semibold text-ink">Por {grupo.toLowerCase()}</p>
            <Rolavel>
              <table className="tabela-folha">
                <thead>
                  <tr>
                    <th>{grupo}</th>
                    <th className="num">{doDia ? 'Saíram' : 'Abertos'}</th>
                    <th className="num">%</th>
                    {!doDia && (
                      <>
                        <th className="num">Espera média</th>
                        {mostra30 && <th className="num">&gt; 30 dias</th>}
                        <th className="num">Mais antigo</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {r.lugares.map((l) => (
                    <tr key={l.nome}>
                      <td className="quebra font-medium">{l.nome}</td>
                      <td className="num">{numero(l.abertos)}</td>
                      <td className="num">{pct(l.abertos, r.n)}</td>
                      {!doDia && (
                        <>
                          <td className={clsx('num', corDias(l.media))}>{decimal(l.media)}d</td>
                          {mostra30 && <td className="num">{l.mais30 ? numero(l.mais30) : '—'}</td>}
                          <td className={clsx('num font-semibold', corDias(l.maisAntigo))}>{numero(l.maisAntigo)}d</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border-t border-ink/30">Total</td>
                    <td className="num border-t border-ink/30">{numero(r.n)}</td>
                    <td className="num border-t border-ink/30">100%</td>
                    {!doDia && (
                      <>
                        <td className="num border-t border-ink/30">{decimal(r.media)}d</td>
                        {mostra30 && <td className="num border-t border-ink/30">{numero(r.mais30)}</td>}
                        <td className="num border-t border-ink/30">{numero(r.maisAntigo)}d</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </Rolavel>
            <p className="mt-1.5 text-[10.5px] text-ink-3">
              {!doDia && `Espera contada do registro do serviço até ${formatarDia(hoje)}.`}
              {r.lugares.some((l) => l.nome.startsWith('Demais (')) && ' Ruas com mais pedidos; as demais somadas na última linha.'}
            </p>
          </div>
          )}
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:[&>*]:min-w-0 print:grid print:grid-cols-2 print:gap-x-5">
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por categoria</p>
              <TabelaSimples titulo="Categoria" linhas={r.categorias} total={r.n} doDia={doDia} />
            </div>
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por origem do pedido</p>
              <TabelaSimples titulo="Origem" linhas={r.origens} total={r.n} doDia={doDia} />
              {r.vereadores.length > 0 && (
                <p className="mt-1.5 text-[10.5px] text-ink-3">Vereadores: {r.vereadores.map(([v, n]) => `${v} (${n})`).join(', ')}.</p>
              )}
            </div>
          </div>
        </div>
      </SecaoFolha>

      {/* dia: sem lista — a do que saiu é a Lista de campo com "Hoje" (agrupada por proximidade); num mutirão estourava */}
      {!doDia && (
      <SecaoFolha titulo="Serviços mais antigos ainda em aberto" cartao>
        <Rolavel minimo="max-sm:min-w-[38rem]">
          <table className="tabela-folha">
            <thead>
              <tr>
                <th>Serviço</th>
                {detalhes && <th className="esq">Endereço</th>}
                <th>Bairro</th>
                <th>Categoria</th>
                <th>Origem</th>
                <th className="num">Registro</th>
                <th className="num">Dias</th>
              </tr>
            </thead>
            <tbody>
              {r.antigos.map(({ servico, saida, dias }) => (
                <tr key={servico.chave}>
                  <td>
                    <IdServico servico={servico} />
                  </td>
                  {detalhes && <td className="quebra">{(e => (e ? enderecoCurto(e) : '—'))(detalhes.get(servico.chave)?.endereco)}</td>}
                  {/* numa linha só (compacto, como o PDF do script); só texto LONGO quebra — bairro que veio do Colab,
                      associação, promotoria —, que antes espremia o endereço e jogava "Registro" e "Dias" para fora */}
                  <td className={clsx('centro', servico.bairro.length > LONGO && 'quebra')}>{servico.bairro}</td>
                  <td className="centro">{servico.categoria ?? 'Sem categoria'}</td>
                  <td className={clsx('centro', origemTexto(servico).length > LONGO && 'quebra')}>{origemTexto(servico)}</td>
                  <td className="num">{formatarDia(saida.dataSaida)}</td>
                  <td className="num font-semibold text-atraso-texto">{numero(dias)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Rolavel>
      </SecaoFolha>
      )}

    </div>
  )
}

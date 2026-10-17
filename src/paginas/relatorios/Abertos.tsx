// Serviços em aberto — o mesmo relatório do tratamento_manual/relatorio_abertos.py (PDF de 1 página),
// seção por seção: contexto, 6 indicadores, composição da fila, distribuição por bairro (ou região),
// categoria e origem (com os vereadores) e os mais antigos. Não depende do período.
import { clsx } from 'clsx'
import { FAIXAS_ESPERA } from '@/calculos/panorama'
import { origemTexto, type LinhaSimplesAberto, type RelatorioAbertos } from '@/calculos/relatorios'
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

/** Indicador do script: rótulo, barrinha de cor ao lado do número e uma linha de apoio */
function Kpi({ rotulo, valor, unidade, apoio, cor }: { rotulo: string; valor: string; unidade?: string; apoio: string; cor: string }) {
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

function TabelaSimples({ titulo, linhas, total }: { titulo: string; linhas: LinhaSimplesAberto[]; total: number }) {
  return (
    <Rolavel minimo="max-sm:min-w-[21rem]">
      <table className="tabela-folha">
        <thead>
          <tr>
            <th>{titulo}</th>
            <th className="num">Abertos</th>
            <th className="num">%</th>
            <th className="num">Espera média</th>
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
              <td className="num">{decimal(l.media)}d</td>
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

export function RelatorioAbertosFolha({ r, detalhes, hoje }: { r: RelatorioAbertos; detalhes: Map<string, Detalhe> | null; hoje: Dia }) {
  if (r.n === 0) return <p className="py-10 text-center text-[13px] text-ink-2">Nenhum serviço em aberto com esses filtros.</p>
  const grupo = r.porBairro ? 'Bairro' : 'Região'
  const somaTres = r.tres.reduce((t, l) => t + l.abertos, 0)
  // mês a mês só os 12 mais recentes; o resto vira "antes de …" (com anos de fila virava um parágrafo de ~100 meses)
  const ultimosMeses = r.meses.slice(-MESES_NO_RESUMO)
  const antes = r.meses.slice(0, -MESES_NO_RESUMO).reduce((t, [, n]) => t + n, 0)

  return (
    <div className="folha-compacta">
      <p className="mb-4 rounded-r-md border-l-[3px] border-andamento bg-page px-3 py-2 text-[12px] leading-relaxed text-ink-2">
        {r.filtrado ? (
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
        <strong className="font-semibold text-ink">{numero(r.atraso)}</strong> já passaram do prazo de 5 dias e a espera média é de{' '}
        <strong className="font-semibold text-ink">{decimal(r.media)} dias</strong>. {r.porBairro ? 'Os três bairros' : 'As três regiões'} com mais
        pendências ({r.tres.map((l) => l.nome).join(', ')}) somam <strong className="font-semibold text-ink">{numero(somaTres)}</strong> serviços (
        {pct(somaTres, r.n)}). Por mês de registro:{' '}
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
      </p>

      <SecaoFolha titulo="Indicadores">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
          <Kpi rotulo="Em aberto" valor={numero(r.n)} apoio={r.filtrado ? `${pct(r.n, r.totalCidade)} da cidade` : 'cidade toda'} cor="var(--c-andamento)" />
          <Kpi rotulo="Em atraso" valor={numero(r.atraso)} apoio={`${pct(r.atraso, r.n)} · prazo de 5 dias`} cor="var(--c-atraso)" />
          <Kpi rotulo="Espera média" valor={decimal(r.media)} unidade="d" apoio="desde o registro" cor="var(--c-ink-3)" />
          <Kpi rotulo="Acima de 30 dias" valor={numero(r.mais30)} apoio={`${pct(r.mais30, r.n)} da fila`} cor="var(--c-atraso)" />
          <Kpi
            rotulo="Mais antigo"
            valor={numero(r.maisAntigo)}
            unidade="d"
            apoio={r.registroMaisAntigo === null ? '' : `desde ${formatarDia(r.registroMaisAntigo)}`}
            cor="var(--c-s7)"
          />
          <Kpi rotulo="Institucionais" valor={numero(r.institucionais)} apoio="regional, vereador etc." cor="var(--c-s1)" />
        </div>
      </SecaoFolha>

      <SecaoFolha titulo="Composição da fila em aberto" cartao>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[12.5px] font-medium text-ink">{numero(r.n)} serviços pendentes, por tempo de espera</p>
          <p className="text-[11px] text-ink-2">
            {numero(r.n - r.espera[0])} de {numero(r.n)} ({pct(r.n - r.espera[0], r.n)}) já passaram do prazo
          </p>
        </div>
        <BarraFaixas
          comPct={false}
          partes={FAIXAS_ESPERA.map((f, i) => ({ rotulo: f.rotulo, n: r.espera[i], cor: COR_ESPERA[i], textoEscuro: i < 3, nota: i === 0 ? 'dentro do prazo' : undefined }))}
          total={r.n}
        />
      </SecaoFolha>

      <SecaoFolha titulo="Distribuição">
        {/* tela: "por bairro" na largura toda e categoria + origem lado a lado embaixo (em duas colunas as tabelas
            não cabiam: vazavam da folha ou ganhavam barra de rolagem); papel: as duas colunas de sempre (1 página) */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 max-sm:[&>*]:min-w-0 print:grid-cols-[1.15fr_1fr]">
          <div className="cartao-folha">
            <p className="mb-1 text-[12px] font-semibold text-ink">Por {grupo.toLowerCase()}</p>
            <Rolavel>
              <table className="tabela-folha">
                <thead>
                  <tr>
                    <th>{grupo}</th>
                    <th className="num">Abertos</th>
                    <th className="num">%</th>
                    <th className="num">Espera média</th>
                    <th className="num">&gt; 30 dias</th>
                    <th className="num">Mais antigo</th>
                  </tr>
                </thead>
                <tbody>
                  {r.lugares.map((l) => (
                    <tr key={l.nome}>
                      <td className="quebra font-medium">{l.nome}</td>
                      <td className="num">{numero(l.abertos)}</td>
                      <td className="num">{pct(l.abertos, r.n)}</td>
                      <td className={clsx('num', corDias(l.media))}>{decimal(l.media)}d</td>
                      <td className="num">{l.mais30 ? numero(l.mais30) : '—'}</td>
                      <td className={clsx('num font-semibold', corDias(l.maisAntigo))}>{numero(l.maisAntigo)}d</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border-t border-ink/30">Total</td>
                    <td className="num border-t border-ink/30">{numero(r.n)}</td>
                    <td className="num border-t border-ink/30">100%</td>
                    <td className="num border-t border-ink/30">{decimal(r.media)}d</td>
                    <td className="num border-t border-ink/30">{numero(r.mais30)}</td>
                    <td className="num border-t border-ink/30">{numero(r.maisAntigo)}d</td>
                  </tr>
                </tfoot>
              </table>
            </Rolavel>
            <p className="mt-1.5 text-[10.5px] text-ink-3">Espera contada do registro do serviço até {formatarDia(hoje)}.</p>
          </div>
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:[&>*]:min-w-0 print:flex print:flex-col">
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por categoria</p>
              <TabelaSimples titulo="Categoria" linhas={r.categorias} total={r.n} />
            </div>
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por origem do pedido</p>
              <TabelaSimples titulo="Origem" linhas={r.origens} total={r.n} />
              {r.vereadores.length > 0 && (
                <p className="mt-1.5 text-[10.5px] text-ink-3">Vereadores: {r.vereadores.map(([v, n]) => `${v} (${n})`).join(', ')}.</p>
              )}
            </div>
          </div>
        </div>
      </SecaoFolha>

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
                  {detalhes && <td className="quebra">{detalhes.get(servico.chave)?.endereco ?? '—'}</td>}
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

    </div>
  )
}

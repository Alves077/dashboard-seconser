// Relatório mensal / histórico completo — o mesmo relatório do site antigo (relatorio.js), seção por
// seção. Mudanças combinadas: categoria revisada, filtros de região/categoria/origem valendo, e a
// evolução mensal em dois gráficos (o antigo tinha dois eixos no mesmo quadro).
import { clsx } from 'clsx'
import { GraficoTempo } from '@/componentes/graficos/GraficoTempo'
import { FAIXAS_ESPERA } from '@/calculos/panorama'
import type { GrupoMensal, RelatorioMensal } from '@/calculos/relatorios'
import { PRAZO_DIAS } from '@/config'
import { CATEGORIA_RISCO, FAIXAS } from '@/dados/regras'
import { formatarDia, formatarDiaCurto, rotuloMes, rotuloMesLongo } from '@/lib/datas'
import { decimal, numero, pct } from '@/lib/formato'
import { BarraFaixas, IdServico, NumeroFolha, Observacoes, Rolavel, SecaoFolha } from './Folha'

// cores do antigo: ≤3 verde · 4–7 azul · 8–15 âmbar · >15 vermelho
const COR_FAIXA = ['var(--c-ok)', 'var(--c-s1)', 'var(--c-andamento)', 'var(--c-atraso)']
const COR_ESPERA = ['var(--c-ok)', 'var(--c-andamento)', 'var(--c-risco)', 'var(--c-atraso)', 'color-mix(in oklab, var(--c-atraso) 70%, black)']

/** Tempo médio: acima de 15 dias em vermelho, acima de 5 em âmbar (como no antigo) */
function Media({ v }: { v: number | null }) {
  if (v === null) return <td className="num text-ink-3">—</td>
  return <td className={clsx('num', v > 15 ? 'font-semibold text-atraso-texto' : v > PRAZO_DIAS && 'text-andamento-texto')}>{decimal(v)} d</td>
}

/** Fora do prazo: 70% ou mais em vermelho, 40% ou mais em âmbar */
function Fora({ v }: { v: number | null }) {
  if (v === null) return <td className="num text-ink-3">—</td>
  return <td className={clsx('num', v >= 70 ? 'font-semibold text-atraso-texto' : v >= 40 && 'text-andamento-texto')}>{decimal(v)}%</td>
}

const Abertos = ({ n }: { n: number }) => <td className={clsx('num', !n && 'text-ink-3')}>{n ? numero(n) : '—'}</td>

/** "vs 7,2 d em ago/26", verde/vermelho pelo sentido bom; "estável" quando quase igual */
function Versus({ atual, antes, mes, unidade, subirBom }: { atual: number | null; antes: number | null; mes: string; unidade: string; subirBom: boolean }) {
  if (atual === null || antes === null) return null
  const dif = atual - antes
  if (Math.abs(dif) < 0.05) return <span className="text-ink-2">estável vs {mes}</span>
  const bom = subirBom ? dif > 0 : dif < 0
  return (
    <span className={bom ? 'text-ok-texto' : 'text-atraso-texto'}>
      vs {decimal(antes)}
      {unidade} em {mes}
    </span>
  )
}

function TabelaBairros({ linhas }: { linhas: GrupoMensal[] }) {
  return (
    <table className="tabela-folha">
      <thead>
        <tr>
          <th>Bairro</th>
          <th className="num">Total</th>
          <th className="num">Abertos</th>
          <th className="num">T. médio</th>
          <th className="num">Fora</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((b) => (
          <tr key={b.nome}>
            <td>{b.nome}</td>
            <td className="num">{numero(b.total)}</td>
            <Abertos n={b.abertos} />
            <Media v={b.media} />
            <Fora v={b.pctFora} />
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function RelatorioMensalFolha({ r, obs, aoMudarObs }: { r: RelatorioMensal; obs: string; aoMudarObs: (v: string) => void }) {
  const h = r.historico
  const m = r.movimento
  const mesAnt = r.anterior ? rotuloMes(r.anterior.mes) : ''
  const mesCurto = r.mes !== null ? rotuloMes(r.mes) : ''
  const totalFaixas = r.faixas.reduce((a, b) => a + b, 0)

  if (r.total === 0) return <p className="py-10 text-center text-[13px] text-ink-2">Nenhum serviço com esses filtros {r.todos ? 'no período' : 'neste mês'}.</p>

  return (
    <>
      {h && (
        <p className="mb-5 rounded-md bg-page px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
          Indicadores acumulados de <strong className="font-semibold text-ink">{numero(h.meses)} meses</strong>.
          {h.ultimoFechado && (
            <>
              {' '}
              No último mês fechado (<strong className="font-semibold text-ink">{rotuloMes(h.ultimoFechado.mes)}</strong>): tempo médio{' '}
              <strong className="font-semibold text-ink">{decimal(h.ultimoFechado.media)} d</strong> e{' '}
              <strong className="font-semibold text-ink">{decimal(h.ultimoFechado.pctFora)}%</strong> fora do prazo.
            </>
          )}
        </p>
      )}

      <SecaoFolha titulo={r.todos ? 'Indicadores gerais' : 'Indicadores do mês'}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <NumeroFolha rotulo="Entradas" valor={numero(r.total)} apoio="serviços registrados" />
          <NumeroFolha rotulo="Concluídos" valor={numero(r.concluidos)} apoio={`${pct(r.concluidos, r.total)} ${r.todos ? 'do total' : '· até hoje'}`} />
          <NumeroFolha
            rotulo="No prazo"
            valor={r.pctNoPrazo === null ? '—' : `${decimal(r.pctNoPrazo)}%`}
            apoio={
              <>
                {numero(r.noPrazo)} de {numero(r.concluidos)}
                {r.anterior && (
                  <>
                    {' · '}
                    <Versus atual={r.pctNoPrazo} antes={r.anterior.pctNoPrazo} mes={mesAnt} unidade="%" subirBom />
                  </>
                )}
              </>
            }
          />
          <NumeroFolha
            rotulo="Tempo médio"
            valor={r.media === null ? '—' : `${decimal(r.media)} d`}
            apoio={
              <>
                dos concluídos
                {r.anterior && (
                  <>
                    {' · '}
                    <Versus atual={r.media} antes={r.anterior.media} mes={mesAnt} unidade=" d" subirBom={false} />
                  </>
                )}
              </>
            }
          />
          <NumeroFolha rotulo="Abertos" valor={numero(r.abertos)} apoio={`${pct(r.abertos, r.total)} do total`} />
          <NumeroFolha
            rotulo="Reaberturas"
            valor={numero(r.reabIds)}
            apoio={`${numero(r.reabTotal)} ${r.reabTotal === 1 ? 'evento' : 'eventos'}`}
          />
        </div>
      </SecaoFolha>

      {h && h.fila.total > 0 && (
        <SecaoFolha titulo="Composição da fila em aberto" cartao>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[12.5px] font-medium text-ink">{numero(h.fila.total)} serviços pendentes, por tempo de espera</p>
            <p className="text-[11px] text-ink-2">
              {numero(h.fila.total - h.fila.espera[0])} de {numero(h.fila.total)} ({pct(h.fila.total - h.fila.espera[0], h.fila.total)}) já passaram do
              prazo
            </p>
          </div>
          <BarraFaixas partes={FAIXAS_ESPERA.map((f, i) => ({ rotulo: f.rotulo, n: h.fila.espera[i], cor: COR_ESPERA[i] }))} total={h.fila.total} />
          {h.fila.acima150 > 0 && <p className="mt-1.5 text-[10.5px] text-ink-3">{numero(h.fila.acima150)} acima de 150 dias.</p>}
        </SecaoFolha>
      )}

      {h && h.ultimos3.length > 0 && (
        <SecaoFolha titulo="Últimos meses" cartao>
          <Rolavel>
            <table className="tabela-folha">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className="num">Registrados</th>
                  <th className="num">Executados</th>
                  <th className="num">Abertos</th>
                  <th className="num">T. médio</th>
                  <th className="num">Fora do prazo</th>
                  <th className="num">Fila no fim</th>
                </tr>
              </thead>
              <tbody>
                {h.ultimos3.map((x) => (
                  <tr key={x.mes}>
                    <td>
                      {rotuloMes(x.mes)}
                      {x.parcial && <span className="text-[10px] text-ink-3"> (em curso)</span>}
                    </td>
                    <td className="num">{numero(x.registrados)}</td>
                    <td className="num">{numero(x.executados)}</td>
                    <td className="num">{numero(x.abertos)}</td>
                    <Media v={x.media} />
                    <Fora v={x.pctFora} />
                    <td className={clsx('num font-semibold', x.saldo > 0 ? 'text-atraso-texto' : 'text-ok-texto')}>{numero(x.filaFim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
          <p className="mt-1.5 text-[10.5px] text-ink-3">
            Fila no fim do mês conta todos os pendentes naquela data, de qualquer mês de registro (vermelho: cresceu no mês; verde: diminuiu).
          </p>
        </SecaoFolha>
      )}

      {m && (
        <SecaoFolha titulo="Movimento da fila">
          <div className="numeros flex flex-col gap-1 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center sm:text-center">
            <Termo rotulo={`Fila em ${formatarDiaCurto(m.ini)}`} nota="pendentes de meses anteriores" valor={m.inicio} />
            <Operador>+</Operador>
            <Termo rotulo={`Registrados em ${mesCurto}`} nota="novos serviços no mês" valor={m.registrados} sinal="+" />
            <Operador>−</Operador>
            <Termo rotulo={`Executados em ${mesCurto}`} nota="concluídos no mês" valor={m.executados} sinal="−" />
            <Operador>=</Operador>
            <Termo
              rotulo={`Fila em ${formatarDiaCurto(m.fimDia)}`}
              nota="pendentes ao fim do mês"
              valor={m.fim}
              sinal="="
              tom={m.fim > m.inicio ? 'text-atraso-texto' : 'text-ok-texto'}
              destaque
            />
          </div>
          <p className="mt-2 text-[11px] text-ink-3">
            Dos {numero(m.executados)} executados, {numero(m.doMes)} foram registrados em {mesCurto} e {numero(m.executados - m.doMes)} em meses anteriores.
          </p>
        </SecaoFolha>
      )}

      {totalFaixas > 0 && (
        <SecaoFolha titulo="Distribuição por faixa · só concluídos" cartao>
          <BarraFaixas partes={FAIXAS.map((f, i) => ({ rotulo: f.rotulo, n: r.faixas[i], cor: COR_FAIXA[i] }))} total={totalFaixas} />
        </SecaoFolha>
      )}

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2 print:grid-cols-2">
        <SecaoFolha titulo="Por categoria" colado cartao>
          <Rolavel minimo="max-sm:min-w-[26rem]">
            <table className="tabela-folha">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="num">Total</th>
                  <th className="num">%</th>
                  <th className="num">Abertos</th>
                  <th className="num">T. médio</th>
                </tr>
              </thead>
              <tbody>
                {r.categorias.map((c) => (
                  <tr key={c.nome}>
                    <td>
                      {c.nome === CATEGORIA_RISCO && <span aria-label="risco">⚡ </span>}
                      {c.nome}
                    </td>
                    <td className="num">{numero(c.total)}</td>
                    <td className="num">{pct(c.total, r.total)}</td>
                    <Abertos n={c.abertos} />
                    <Media v={c.media} />
                  </tr>
                ))}
                {r.cauda && (
                  <tr>
                    <td className="text-ink-2">Demais ({numero(r.cauda.n)} categorias)</td>
                    <td className="num">{numero(r.cauda.total)}</td>
                    <td className="num">{pct(r.cauda.total, r.total)}</td>
                    <Abertos n={r.cauda.abertos} />
                    <td className="num text-ink-3">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Rolavel>
        </SecaoFolha>
        <SecaoFolha titulo="Por região" colado cartao>
          <Rolavel>
            <table className="tabela-folha">
              <thead>
                <tr>
                  <th>Região</th>
                  <th className="num">Total</th>
                  <th className="num">%</th>
                  <th className="num">Abertos</th>
                  <th className="num">T. médio</th>
                  <th className="num">Fora</th>
                </tr>
              </thead>
              <tbody>
                {r.regioes.map((g) => (
                  <tr key={g.nome}>
                    <td>{g.nome}</td>
                    <td className="num">{numero(g.total)}</td>
                    <td className="num">{pct(g.total, r.total)}</td>
                    <Abertos n={g.abertos} />
                    <Media v={g.media} />
                    <Fora v={g.pctFora} />
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
        </SecaoFolha>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2 print:grid-cols-2">
        <SecaoFolha titulo="Bairros · maior volume de pedidos" colado cartao>
          <TabelaBairros linhas={r.bairrosVolume} />
          <p className="mt-1.5 text-[10.5px] text-ink-3">Tempo médio considera apenas os serviços já concluídos.</p>
        </SecaoFolha>
        <SecaoFolha titulo="Bairros · maior backlog" colado cartao>
          {r.bairrosBacklog.length ? (
            <>
              <TabelaBairros linhas={r.bairrosBacklog} />
              <p className="mt-1.5 text-[10.5px] text-ink-3">
                Bairros com {r.minimoBacklog} ou mais serviços {r.todos ? 'no período' : 'no mês'}, pela proporção ainda pendente. Com muito pendente, o
                tempo real pode ser maior que o exibido.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-ink-3">
              Nenhum bairro atingiu {r.minimoBacklog} serviços {r.todos ? 'no período' : 'no mês'}.
            </p>
          )}
        </SecaoFolha>
      </div>

      {h && h.serie.length > 1 && (
        <SecaoFolha titulo="Evolução mensal" cartao>
          {/* o antigo tinha dois eixos no mesmo quadro: aqui, dois gráficos lado a lado */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2 print:grid-cols-2">
            <div>
              <p className="mb-1 text-[12px] font-medium text-ink">Tempo médio de execução · dias</p>
              <GraficoTempo
                altura={170}
                intervalos={h.serie.map((x) => ({ rotulo: rotuloMes(x.mes), nome: rotuloMesLongo(x.mes), parcial: x.parcial }))}
                series={[{ id: 'media', nome: 'Tempo médio', cor: 'var(--c-ink-2)', valores: h.serie.map((x) => x.media) }]}
                formatar={(v) => decimal(v).replace(',0', '')}
                referencia={{ valor: PRAZO_DIAS, rotulo: `prazo · ${PRAZO_DIAS} dias` }}
                descricao="Tempo médio de execução por mês de registro"
              />
            </div>
            <div>
              <p className="mb-1 text-[12px] font-medium text-ink">Fora do prazo · % dos concluídos</p>
              <GraficoTempo
                altura={170}
                intervalos={h.serie.map((x) => ({ rotulo: rotuloMes(x.mes), nome: rotuloMesLongo(x.mes), parcial: x.parcial }))}
                series={[{ id: 'fora', nome: 'Fora do prazo', cor: 'var(--c-atraso)', valores: h.serie.map((x) => x.pctFora) }]}
                formatar={(v) => `${Math.round(v)}%`}
                marcasFixas={[0, 25, 50, 75, 100]}
                descricao="Parte dos concluídos fora do prazo por mês de registro"
              />
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] text-ink-3">Serviços agrupados pelo mês de registro. Prazo de atendimento: 5 dias corridos.</p>
        </SecaoFolha>
      )}

      {h && h.maisAntigos.length > 0 && (
        <SecaoFolha titulo="Serviços mais antigos ainda em aberto" cartao>
          <Rolavel minimo="max-sm:min-w-[34rem]">
            <table className="tabela-folha">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Categoria</th>
                  <th>Bairro</th>
                  <th>Região</th>
                  <th className="num">Registrado em</th>
                  <th className="num">Dias em aberto</th>
                </tr>
              </thead>
              <tbody>
                {h.maisAntigos.map(({ servico, saida, dias }) => (
                  <tr key={servico.chave}>
                    <td>
                      <IdServico servico={servico} />
                    </td>
                    <td className="centro">{servico.categoria}</td>
                    <td className="centro">{servico.bairro}</td>
                    <td className="centro">{servico.regiao}</td>
                    <td className="num">{formatarDia(saida.dataSaida)}</td>
                    <td className="num font-semibold text-atraso-texto">{numero(dias)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
          <p className="mt-1.5 text-[10.5px] text-ink-3">Dias em aberto contados até a data de geração do relatório.</p>
        </SecaoFolha>
      )}

      <Observacoes valor={obs} aoMudar={aoMudarObs} />
    </>
  )
}

function Termo({
  rotulo,
  nota,
  valor,
  destaque,
  sinal,
  tom,
}: {
  rotulo: string
  nota: string
  valor: number
  destaque?: boolean
  sinal?: string
  tom?: string
}) {
  return (
    <div
      className={clsx(
        'flex items-baseline justify-between gap-3 rounded-md border px-3 py-1.5 sm:block sm:px-2 sm:py-2',
        destaque ? 'border-ink' : 'border-line',
      )}
    >
      <div>
        <p className="text-[11px] text-ink-2 sm:text-[10px]">
          {sinal && <span className="mr-1 font-medium sm:hidden">{sinal}</span>}
          {rotulo}
        </p>
        <p className="text-[10px] text-ink-3 max-sm:hidden">{nota}</p>
      </div>
      <p className={clsx('text-[17px] sm:mt-0.5 sm:text-[18px]', destaque ? 'font-normal' : 'font-light', tom ?? 'text-ink')}>{numero(valor)}</p>
    </div>
  )
}

function Operador({ children }: { children: string }) {
  return (
    <span aria-hidden className="hidden px-1 text-[16px] text-ink-3 sm:block">
      {children}
    </span>
  )
}

// Serviços executados (pedido do usuário, 21/10/2026: "uma forma de ver uma listagem dos serviços fechados"): os que
// voltaram da rua numa época (seletor da aba, pela data de execução). Mesmo esqueleto do Em aberto — abertura, 4
// indicadores, distribuição um nível abaixo do filtro, categoria e origem — e, se pedida (`comLista`), a lista por região e bairro, execução
// mais recente primeiro. Sem a lista é o resumo de uma página (usuário, 24/10/2026: senão, para algo simples, imprimia
// uma lista gigante).
// Dias = da saída à execução; em vermelho, passou do prazo de 5 dias.
import { clsx } from 'clsx'
import { Fragment } from 'react'
import { FAIXAS_EXEC } from '@/calculos/prazo'
import type { LinhaLugarExecutado, RelatorioExecutados } from '@/calculos/relatorios'
import { PRAZO_DIAS } from '@/config'
import { enderecoCurto } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDiaNoAno, type Dia } from '@/lib/datas'
import { decimal, diasLevou, diasLevouCurto, metadeEm, numero, pct } from '@/lib/formato'
import { Kpi } from './Abertos'
import { BarraFaixas, IdServico, Rolavel, SecaoFolha } from './Folha'

/** nome do nível da distribuição (um abaixo do filtro) e a frase "… com mais execuções" */
const NIVEL = {
  regiao: { grupo: 'Região', tres: 'Regiões' },
  bairro: { grupo: 'Bairro', tres: 'Bairros' },
  rua: { grupo: 'Rua', tres: 'Ruas' },
} as const

const forte = 'font-semibold text-ink'

// faixas da página Prazo: as duas primeiras no prazo, em verde (claro e escuro); fora do prazo, do dourado ao vermelho —
// vizinhas com luminância bem diferente, para a impressão em preto e branco
const COR_EXEC = [
  'var(--c-ok)',
  'var(--c-ok-texto)',
  'var(--c-andamento)',
  'color-mix(in oklab, var(--c-andamento) 55%, var(--c-atraso))',
  'var(--c-atraso)',
]
const TEXTO_ESCURO = [true, false, true, true, false]


/**
 * executados, % no prazo e tempo médio; só na do lugar (`comTotal`, na largura toda), também o % do total, a mediana e a
 * linha do total — na metade da folha, categoria e origem com mais colunas espremiam os nomes
 */
function TabelaExecutados({ titulo, linhas, r, comTotal = false }: { titulo: string; linhas: LinhaLugarExecutado[]; r: RelatorioExecutados; comTotal?: boolean }) {
  return (
    <Rolavel minimo="max-sm:min-w-[24rem]">
      <table className="tabela-folha">
        <thead>
          <tr>
            <th>{titulo}</th>
            <th className="num">Executados</th>
            {comTotal && <th className="num">%</th>}
            <th className="num">No prazo</th>
            <th className="num">Tempo médio</th>
            {comTotal && <th className="num">Mediana</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome}>
              {/* "quebra": nome longo ("Acendimento fora de hora") não empurra os números para fora do cartão */}
              <td className="quebra font-medium">{l.nome}</td>
              <td className="num">{numero(l.executados)}</td>
              {comTotal && <td className="num">{pct(l.executados, r.n)}</td>}
              <td className="num">{pct(l.noPrazo, l.executados)}</td>
              <td className="num">{decimal(l.media)}d</td>
              {comTotal && <td className="num">{diasLevouCurto(l.mediana, 'd')}</td>}
            </tr>
          ))}
        </tbody>
        {comTotal && (
          <tfoot>
            <tr className="font-semibold">
              <td className="border-t border-ink/30">Total</td>
              <td className="num border-t border-ink/30">{numero(r.n)}</td>
              <td className="num border-t border-ink/30">100%</td>
              <td className="num border-t border-ink/30">{pct(r.noPrazo, r.n)}</td>
              <td className="num border-t border-ink/30">{decimal(r.media)}d</td>
              <td className="num border-t border-ink/30">{diasLevouCurto(r.mediana, 'd')}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </Rolavel>
  )
}

/** com login, o endereço (rua e número, sem o fim " - Bairro, Niterói - RJ, CEP"); sem, só a rua */
function enderecoDaLista(servico: { chave: string; rua: string | null }, detalhes: Map<string, Detalhe> | null) {
  if (!detalhes) return servico.rua ?? '—'
  const e = detalhes.get(servico.chave)?.endereco
  return e ? enderecoCurto(e) : '—'
}

export function RelatorioExecutadosFolha({
  r,
  detalhes,
  hoje,
  quando,
  comLista,
}: {
  r: RelatorioExecutados
  detalhes: Map<string, Detalhe> | null
  hoje: Dia
  /** a época, para a frase: "hoje", "nos últimos 7 dias", "em setembro de 2026" */
  quando: string
  /** com a lista de todos os executados (senão, só o resumo) */
  comLista: boolean
}) {
  if (r.n === 0) return <p className="py-10 text-center text-[13px] text-ink-2">Nenhum serviço executado nessa época com esses filtros.</p>
  const { grupo, tres } = NIVEL[r.nivel]
  const Quando = quando.charAt(0).toUpperCase() + quando.slice(1)
  const um = r.n === 1

  return (
    <div className="folha-compacta">
      <p className="mb-4 rounded-r-md border-l-[3px] border-ok bg-page px-3 py-2 text-[12px] leading-relaxed text-ink-2">
        {Quando} {um ? 'foi executado' : 'foram executados'} <strong className={forte}>{numero(r.n)}</strong> {um ? 'serviço' : 'serviços'}:{' '}
        <strong className={forte}>{numero(r.noPrazo)} no prazo</strong> ({pct(r.noPrazo, r.n)}) e <strong className={forte}>{numero(r.foraPrazo)}</strong> com
        mais de {PRAZO_DIAS} dias. Da saída à execução, <strong className={forte}>{decimal(r.media)} dias</strong> em média;{' '}
        {r.mediana === 0 ? (
          <>
            metade <strong className={forte}>no mesmo dia</strong>
          </>
        ) : (
          <>
            metade em até <strong className={forte}>{diasLevou(r.mediana)}</strong>
          </>
        )}
        .
        {r.lugares.length > 1 && (
          <>
            {' '}
            {tres} com mais execuções: {r.tres.map((l) => `${l.nome} (${numero(l.executados)})`).join(', ')}.
          </>
        )}
      </p>

      <SecaoFolha titulo="Indicadores">
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4 print:grid-cols-4">
          <Kpi rotulo="Executados" valor={numero(r.n)} apoio={quando} cor="var(--c-ok)" />
          <Kpi rotulo="No prazo" valor={numero(r.noPrazo)} apoio={`${pct(r.noPrazo, r.n)} · até ${PRAZO_DIAS} dias`} cor="var(--c-ok)" />
          <Kpi rotulo="Fora do prazo" valor={numero(r.foraPrazo)} apoio={`${pct(r.foraPrazo, r.n)} · mais de ${PRAZO_DIAS} dias`} cor="var(--c-atraso)" />
          <Kpi rotulo="Tempo médio" valor={decimal(r.media)} unidade="d" apoio={metadeEm(r.mediana)} cor="var(--c-ink-3)" />
        </div>
      </SecaoFolha>

      {/* o que a média esconde: quantos em cada faixa de dias (usuário, 24/10/2026) */}
      <SecaoFolha titulo="Tempo até a execução" cartao>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[12.5px] font-medium text-ink">
            {numero(r.n)} {um ? 'executado' : 'executados'}, pelos dias da saída à execução
          </p>
          <p className="text-[11px] text-ink-2">
            {numero(r.noPrazo)} de {numero(r.n)} ({pct(r.noPrazo, r.n)}) no prazo de {PRAZO_DIAS} dias
          </p>
        </div>
        <BarraFaixas
          comPct={false}
          partes={FAIXAS_EXEC.map((fx, i) => ({ rotulo: fx.rotulo, n: r.faixas[i], cor: COR_EXEC[i], textoEscuro: TEXTO_ESCURO[i] }))}
          total={r.n}
        />
      </SecaoFolha>

      <SecaoFolha titulo="Distribuição">
        {/* lugar na largura toda; categoria e origem lado a lado embaixo — como no Em aberto */}
        <div className="grid grid-cols-1 gap-y-4 max-sm:[&>*]:min-w-0">
          {/* um lugar só: a tabela seria uma linha igual ao total — sai (como no Em aberto) */}
          {r.lugares.length > 1 && (
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por {grupo.toLowerCase()}</p>
              <TabelaExecutados titulo={grupo} linhas={r.lugares} r={r} comTotal />
              {r.lugares.some((l) => l.nome.startsWith('Demais (')) && (
                <p className="mt-1.5 text-[10.5px] text-ink-3">
                  {r.nivel === 'rua' ? 'Ruas com mais execuções; as demais somadas' : 'Bairros com mais execuções; os demais somados'} na última linha.
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:[&>*]:min-w-0 print:grid print:grid-cols-2 print:gap-x-5">
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por categoria</p>
              <TabelaExecutados titulo="Categoria" linhas={r.categorias} r={r} />
            </div>
            <div className="cartao-folha">
              <p className="mb-1 text-[12px] font-semibold text-ink">Por origem do pedido</p>
              <TabelaExecutados titulo="Origem" linhas={r.origens} r={r} />
              {r.vereadores.length > 0 && (
                <p className="mt-1.5 text-[10.5px] text-ink-3">Vereadores: {r.vereadores.map(([v, n]) => `${v} (${n})`).join(', ')}.</p>
              )}
            </div>
          </div>
        </div>
      </SecaoFolha>

      {comLista && (
      <SecaoFolha titulo="Serviços executados">
        <p className="mb-2 text-[10.5px] text-ink-3">
          Por região e bairro, a execução mais recente primeiro. Dias = da saída à execução (em vermelho, mais de {PRAZO_DIAS}). "2ª ida" embaixo do número =
          serviço que tinha voltado à rua.
        </p>
        {r.regioes.map((reg) => (
          <div key={reg.nome} className="cartao-folha mt-3 first-of-type:mt-0">
            <p className="mb-1 flex items-baseline justify-between gap-3 text-[12px] font-semibold text-ink">
              {reg.nome}
              <span className="numeros text-[11px] font-normal text-ink-2">
                {numero(reg.total)} {reg.total === 1 ? 'serviço' : 'serviços'}
              </span>
            </p>
            <Rolavel minimo="max-sm:min-w-[36rem]">
              <table className="tabela-folha">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th className="esq">Categoria</th>
                    <th className="esq">{detalhes ? 'Endereço' : 'Rua'}</th>
                    <th className="num">Saída</th>
                    <th className="num">Execução</th>
                    <th className="num">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {reg.bairros.map((b) => (
                    <Fragment key={b.nome}>
                      <tr>
                        <td colSpan={6} className="bg-page pt-2 text-[11px] font-semibold text-ink">
                          {b.nome} <span className="numeros font-normal text-ink-3">· {numero(b.itens.length)}</span>
                        </td>
                      </tr>
                      {b.itens.map(({ servico, saida, dias }) => (
                        <tr key={`${servico.chave}-${saida.ordem}`}>
                          <td>
                            <IdServico servico={servico} ordem={saida.ordem} />
                          </td>
                          <td className="quebra">{servico.categoria ?? 'Sem categoria'}</td>
                          <td className="quebra">{enderecoDaLista(servico, detalhes)}</td>
                          <td className="num">{formatarDiaNoAno(saida.dataSaida, hoje)}</td>
                          <td className="num">{formatarDiaNoAno(saida.dataRetorno!, hoje)}</td>
                          <td className={clsx('num', dias > PRAZO_DIAS && 'font-medium text-atraso-texto')}>{diasLevouCurto(dias)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </Rolavel>
          </div>
        ))}
      </SecaoFolha>
      )}
    </div>
  )
}

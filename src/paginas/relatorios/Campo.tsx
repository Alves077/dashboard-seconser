// Lista de campo: os serviços em aberto para levar à rua. Região → bairro (ordem alfabética) → grupos de
// pedidos a até 300 m (o do pedido mais antigo primeiro; calculos/relatorios.ts) → mais antigos primeiro; coluna de retorno em branco para preencher à mão. Endereço e local para quem tem
// acesso. O número do serviço abre a ficha (na tela). Na impressão, cada região começa numa página nova.
// Celular: cartões (consulta na rua, com uma mão) no lugar da tabela; a coluna de retorno, que é para
// escrever à mão, fica só no papel — imprimindo pelo celular sai a tabela.
import { SeloSituacao } from '@/componentes/ui/SeloSituacao'
import type { RegiaoCampo } from '@/calculos/relatorios'
import { Fragment } from 'react'
import { CATEGORIA_RISCO, enderecoCurto, rotuloLugar, situacao } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDia, formatarDiaNoAno, type Dia } from '@/lib/datas'
import { diasEspera, diasEsperaCurto, numero } from '@/lib/formato'
import { IdServico } from './Folha'

export function ListaCampoFolha({ regioes, detalhes, hoje }: { regioes: RegiaoCampo[]; detalhes: Map<string, Detalhe> | null; hoje: Dia }) {
  if (regioes.length === 0) return <p className="py-10 text-center text-[13px] text-ink-2">Nenhum serviço em aberto com esses filtros.</p>
  return (
    <>
      <p className="mb-4 text-[10.5px] leading-relaxed text-ink-3">
        Dias = desde a última saída para a rua (em vermelho, passou dos 5 dias). "2ª ida" embaixo do número = serviço que voltou à rua.
        <span className="max-sm:hidden print:inline"> Anotar à mão a data de retorno.</span>
        <span className="print:hidden"> Toque no número do serviço para ver a ficha.</span>
      </p>
      {regioes.map((reg, i) => (
        <section key={reg.nome} className={i > 0 ? 'quebra-pagina mt-8 print:mt-0' : undefined}>
          <h3 className="flex items-baseline justify-between gap-3 border-b border-ink pb-1 text-[15px] font-semibold text-ink">
            {reg.nome}
            <span className="numeros text-[11px] font-normal text-ink-2">
              {numero(reg.total)} {reg.total === 1 ? 'serviço' : 'serviços'}
            </span>
          </h3>
          {reg.bairros.map((b) => (
            <div key={b.nome} className="mt-5">
              {/* bairro em destaque (fio à esquerda): é por ele que a equipe se acha na lista */}
              <h4 className="mb-1.5 border-l-[3px] border-ink pl-2 text-[14px] leading-tight font-semibold text-ink">
                {b.nome} <span className="numeros text-[12px] font-normal text-ink-2">· {numero(b.itens.length)}</span>
              </h4>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line sm:hidden print:hidden">
                {b.grupos.map((r) => (
                  <Fragment key={r.itens[0].servico.chave}>
                    <li className="bg-page px-3 py-1.5 text-[11px] font-semibold text-ink-2">
                      {r.nome} <span className="numeros font-normal text-ink-3">· {numero(r.itens.length)}</span>
                    </li>
                    {r.itens.map(({ servico, saida, dias: d }) => {
                      const det = detalhes?.get(servico.chave)
                      const lugar = rotuloLugar(servico) ?? det?.local
                      return (
                        <li key={servico.chave} className="px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px]">
                              <IdServico servico={servico} ordem={saida.ordem} />
                            </span>
                            <SeloSituacao situacao={situacao(saida, hoje)} texto={diasEspera(d)} />
                          </div>
                          <p className="mt-1.5 text-[13px] text-ink">
                            {servico.categoria === CATEGORIA_RISCO && <span aria-hidden>⚡ </span>}
                            {servico.categoria ?? 'Sem categoria'}
                          </p>
                          {detalhes && <p className="text-[12px] text-ink-2">{det?.endereco ? enderecoCurto(det.endereco) : '—'}</p>}
                          {lugar && <p className="text-[11px] text-ink-3">{lugar}</p>}
                          <p className="mt-0.5 text-[11px] text-ink-3">Saiu em {formatarDia(saida.dataSaida)}</p>
                        </li>
                      )
                    })}
                  </Fragment>
                ))}
              </ul>
              {/* computador e papel: a tabela (no papel, com a coluna de retorno para escrever à mão) */}
              <div className="overflow-x-auto max-sm:hidden print:block print:overflow-visible">
                <table className="tabela-folha tabela-campo min-w-[640px] table-fixed print:min-w-0">
                  <thead>
                    <tr>
                      <th className="w-[14%]">Serviço</th>
                      <th className={detalhes ? 'esq w-[20%]' : 'esq w-[42%]'}>Categoria</th>
                      {detalhes && <th className="esq">Endereço</th>}
                      <th className="w-[9%]">Saída</th>
                      <th className="w-[7%]">Dias</th>
                      <th className="w-[16%]">Retorno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.grupos.map((r) => (
                      <Fragment key={r.itens[0].servico.chave}>
                        {/* subtítulo do grupo de pedidos próximos: a equipe resolve o que está perto de uma vez */}
                        <tr className="linha-rua">
                          <td colSpan={detalhes ? 6 : 5}>
                            {r.nome} <span className="numeros font-normal text-ink-3">· {numero(r.itens.length)}</span>
                          </td>
                        </tr>
                        {r.itens.map(({ servico, saida, dias }) => {
                          const d = detalhes?.get(servico.chave)
                          const atraso = situacao(saida, hoje) === 'atraso'
                          const lugar = rotuloLugar(servico) ?? d?.local
                          return (
                            <tr key={servico.chave}>
                              <td>
                                <IdServico servico={servico} ordem={saida.ordem} />
                              </td>
                              <td>
                                {servico.categoria === CATEGORIA_RISCO && <span aria-hidden>⚡ </span>}
                                {servico.categoria ?? 'Sem categoria'}
                                {!detalhes && lugar && <span className="block text-[10.5px] text-ink-3">{lugar}</span>}
                              </td>
                              {detalhes && (
                                <td>
                                  {d?.endereco ? enderecoCurto(d.endereco) : '—'}
                                  {lugar && <span className="block text-[10.5px] text-ink-3">{lugar}</span>}
                                </td>
                              )}
                              {/* sem o ano só quando é deste ano: "20/12" de um pedido de 301 dias deixava o ano em dúvida */}
                              <td className="num">{formatarDiaNoAno(saida.dataSaida, hoje)}</td>
                              <td className={`num ${atraso ? 'font-medium text-atraso-texto' : ''}`}>{diasEsperaCurto(dias)}</td>
                              {/* para escrever à mão */}
                              <td className="retorno">
                                <span className="block h-5 border-b border-ink-3/60" />
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ))}

    </>
  )
}

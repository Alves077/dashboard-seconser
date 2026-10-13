// Lista de campo: os serviços em aberto para levar à rua. Região → bairro (ordem alfabética) → mais
// antigos primeiro; coluna de retorno em branco para preencher à mão. Endereço e local para quem tem
// acesso. O número do serviço abre a ficha (na tela). Na impressão, cada região começa numa página nova.
import type { RegiaoCampo } from '@/calculos/relatorios'
import { CATEGORIA_RISCO, situacao } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDiaCurto, type Dia } from '@/lib/datas'
import { numero } from '@/lib/formato'
import { IdServico } from './Folha'

export function ListaCampoFolha({ regioes, detalhes, hoje }: { regioes: RegiaoCampo[]; detalhes: Map<string, Detalhe> | null; hoje: Dia }) {
  if (regioes.length === 0) return <p className="py-10 text-center text-[13px] text-ink-2">Nenhum serviço em aberto com esses filtros.</p>
  return (
    <>
      <p className="mb-4 text-[10.5px] leading-relaxed text-ink-3">
        Dias = desde a última saída para a rua (em vermelho, passou dos 5 dias). "(2ª ida)" = serviço que voltou à rua. Anotar à mão a data de
        retorno.<span className="print:hidden"> Toque no número do serviço para ver a ficha.</span>
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
            <div key={b.nome} className="mt-3">
              <h4 className="mb-1 text-[12px] font-semibold text-ink">
                {b.nome} <span className="numeros font-normal text-ink-3">· {numero(b.itens.length)}</span>
              </h4>
              {/* tela estreita: a tabela rola de lado; no papel, cabe na largura */}
              <div className="overflow-x-auto print:overflow-visible">
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
                    {b.itens.map(({ servico, saida, dias }) => {
                      const d = detalhes?.get(servico.chave)
                      const atraso = situacao(saida, hoje) === 'atraso'
                      return (
                        <tr key={servico.chave}>
                          <td>
                            <IdServico servico={servico} ordem={saida.ordem} />
                          </td>
                          <td>
                            {servico.categoria === CATEGORIA_RISCO && <span aria-label="risco">⚡ </span>}
                            {servico.categoria}
                          </td>
                          {detalhes && (
                            <td>
                              {d?.endereco ?? '—'}
                              {d?.local && <span className="block text-[10.5px] text-ink-3">{d.local}</span>}
                            </td>
                          )}
                          <td className="num">{formatarDiaCurto(saida.dataSaida)}</td>
                          <td className={`num ${atraso ? 'font-medium text-atraso-texto' : ''}`}>{numero(dias)}</td>
                          {/* para escrever à mão */}
                          <td>
                            <span className="block h-5 border-b border-ink-3/60" />
                          </td>
                        </tr>
                      )
                    })}
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

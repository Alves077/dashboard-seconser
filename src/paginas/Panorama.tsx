// PROVISÓRIO (fase 1, base): prova a cadeia dados → filtros → estados → ficha de ponta a ponta.
// A página completa (fluxo da fila, regiões, categorias, bairros) é a fase 2 do docs/PLANO_V2.md.
import { clsx } from 'clsx'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import { SeloRisco, SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { filaAtual, indicadoresPeriodo, variacao } from '@/calculos/indicadores'
import { useBase } from '@/dados/consultas'
import { CATEGORIA_RISCO, situacao } from '@/dados/regras'
import { aplicarFiltros, filtrarLugar, intervaloAnterior, noIntervalo } from '@/filtros/filtros'
import { useResumoPeriodo } from '@/filtros/useResumoPeriodo'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDia } from '@/lib/datas'
import { decimal, dias, numero, pct } from '@/lib/formato'
import { useFicha, useHoje } from '@/lib/ganchos'

function Kpi({
  rotulo,
  valor,
  sufixo,
  nota,
  delta,
  deltaBom,
  tom,
}: {
  rotulo: string
  valor: string
  sufixo?: string
  nota?: string
  delta?: number | null
  /** subir é bom (no prazo) ou ruim (tempo médio)? */
  deltaBom?: 'subir' | 'descer'
  tom?: 'atraso'
}) {
  const bom = delta == null || deltaBom === undefined ? null : deltaBom === 'subir' ? delta >= 0 : delta <= 0
  return (
    <Card className={clsx('px-5 py-4', tom === 'atraso' && 'border-l-[3px] border-l-atraso')}>
      <p className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">{rotulo}</p>
      <p className="numeros mt-1.5 text-[32px] leading-none font-light tracking-[-0.64px] text-ink">
        {valor}
        {sufixo && <span className="ml-1 text-base font-normal tracking-normal text-ink-2">{sufixo}</span>}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-ink-2">
        {delta != null && (
          <span className={clsx('numeros font-medium', bom ? 'text-ok-texto' : 'text-atraso-texto')}>
            {delta >= 0 ? '▲' : '▼'} {decimal(Math.abs(delta))}%
          </span>
        )}
        {nota}
      </p>
    </Card>
  )
}

function KpisCarregando() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-busy="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Card key={i} className="px-5 py-4">
          <Esqueleto className="h-3 w-24" />
          <Esqueleto className="mt-3 h-8 w-20" />
          <Esqueleto className="mt-3 h-3 w-28" />
        </Card>
      ))}
    </div>
  )
}

export function Panorama() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { filtros, limpar } = useFiltros()
  const { abrir } = useFicha()
  const hoje = useHoje()
  const resumo = useResumoPeriodo()

  const dados = useMemo(() => {
    if (!base) return null
    const { saidas, intervalo } = aplicarFiltros(base.saidas, filtros, hoje)
    const ant = intervaloAnterior(intervalo)
    const lugar = filtrarLugar(base.saidas, filtros)
    const anteriores = ant ? lugar.filter((s) => noIntervalo(s, ant, filtros.contarPor)) : null
    const servicosLugar = [...new Set(lugar.map((s) => s.servico))]
    return {
      atual: indicadoresPeriodo(saidas),
      anterior: anteriores ? indicadoresPeriodo(anteriores) : null,
      fila: filaAtual(servicosLugar, hoje),
      intervalo,
    }
  }, [base, filtros, hoje])

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Panorama</h1>
        <p className="mt-1 text-ink-2">
          Como estamos agora · <span className="text-ink">{resumo}</span>
          {dados?.intervalo.parcial && dados.intervalo.de !== null && (
            <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink-2">parcial</span>
          )}
        </p>
      </div>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-64" />
        </Card>
      ) : isLoading || !dados ? (
        <KpisCarregando />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Kpi rotulo="Fila em aberto" valor={numero(dados.fila.abertos)} nota="serviços aguardando agora" />
          <Kpi
            rotulo="Em atraso"
            valor={numero(dados.fila.atraso)}
            nota={`${pct(dados.fila.atraso, dados.fila.abertos)} da fila · ${numero(dados.fila.risco)} com risco elétrico`}
            tom="atraso"
          />
          <Kpi
            rotulo={filtros.contarPor === 'retorno' ? 'Execuções' : 'Saídas para a rua'}
            valor={numero(dados.atual.saidas)}
            delta={variacao(dados.atual.saidas, dados.anterior?.saidas ?? null)}
            nota={dados.anterior ? 'vs. período anterior' : 'no período'}
          />
          <Kpi
            rotulo="No prazo (5 dias)"
            valor={dados.atual.pctNoPrazo === null ? '—' : decimal(dados.atual.pctNoPrazo)}
            sufixo={dados.atual.pctNoPrazo === null ? undefined : '%'}
            delta={variacao(dados.atual.pctNoPrazo, dados.anterior?.pctNoPrazo ?? null)}
            deltaBom="subir"
            nota={`${numero(dados.atual.noPrazo)} de ${numero(dados.atual.concluidas)} executados`}
          />
          <Kpi
            rotulo="Tempo médio"
            valor={decimal(dados.atual.tempoMedio)}
            sufixo="dias"
            delta={variacao(dados.atual.tempoMedio, dados.anterior?.tempoMedio ?? null)}
            deltaBom="descer"
            nota={dados.atual.tempoMediano === null ? undefined : `mediana ${decimal(dados.atual.tempoMediano)} dias`}
          />
        </div>
      )}

      <Card className="mt-6" aria-labelledby="mais-antigos">
        <CabecalhoCard
          id="mais-antigos"
          titulo="Esperando há mais tempo"
          subtitulo="Serviços da fila atual, do mais antigo para o mais novo. Toque para ver a ficha."
        />
        <div className="mt-3 pb-2">
          {error ? null : isLoading || !dados ? (
            <ul aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex items-center gap-4 border-t border-line px-5 py-3">
                  <Esqueleto className="h-4 w-14" />
                  <Esqueleto className="h-4 flex-1" />
                  <Esqueleto className="h-5 w-24 rounded-full" />
                </li>
              ))}
            </ul>
          ) : dados.fila.maisAntigos.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum serviço em aberto aqui"
              texto="Com esses filtros de região, bairro e categoria, a fila está zerada."
              aoLimpar={limpar}
              altura="min-h-48"
            />
          ) : (
            <ul>
              {dados.fila.maisAntigos.slice(0, 8).map(({ servico, saida, dias: d }) => (
                <li key={servico.chave}>
                  <button
                    type="button"
                    onClick={() => abrir(servico.chave)}
                    className="group flex min-h-14 w-full items-center gap-4 border-t border-line px-5 py-3 text-left hover:bg-ink/[0.03]"
                  >
                    <span className="numeros w-16 shrink-0 text-[13px] font-medium text-ink">{servico.idColab}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{servico.categoria}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {servico.bairro} · {servico.regiao} · saiu em {formatarDia(saida.dataSaida)}
                      </span>
                    </span>
                    {servico.categoria === CATEGORIA_RISCO && <SeloRisco className="max-sm:hidden" />}
                    <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} />
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  )
}

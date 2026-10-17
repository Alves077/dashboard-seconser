// Prazo — "Estamos atendendo bem?". Indicadores (no prazo, tempo médio, em atraso agora, precisou
// voltar), quantos dias levou (histograma), atraso de agora e tempo por região lado a lado, e o
// retrabalho. Prazo e dias só existem para quem VOLTOU; o atraso de agora é a fila de hoje.
import { useMemo, type ReactNode } from 'react'
import { EstadoErro, Esqueleto } from '@/componentes/estados/Estados'
import { Card } from '@/componentes/ui/Card'
import { calcularPrazo, type Prazo as Dados } from '@/calculos/prazo'
import { PRAZO_DIAS } from '@/config'
import { useBase } from '@/dados/consultas'
import type { Periodo } from '@/filtros/filtros'
import { fraseQuando, rotuloComparacao } from '@/filtros/frases'
import { useFiltros } from '@/filtros/useFiltros'
import { numero, pctCurto, plural } from '@/lib/formato'
import { useHoje } from '@/lib/ganchos'
import { AtrasoAgora } from './prazo/AtrasoAgora'
import { Distribuicao } from './prazo/Distribuicao'
import { Faixas } from './prazo/Faixas'
import { Indicadores } from './prazo/Indicadores'
import { Retrabalho } from './prazo/Retrabalho'

const B = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>

/** O essencial numa frase, antes dos gráficos */
// Frase de abertura (revista 17/10/2026): "64 de 559 foram executados" fazia pensar que 559 foram executados;
// 559 são os que já têm resultado (executados + em aberto que já venceram). Agora cada número diz de onde vem.
function Resumo({ d, periodo }: { d: Dados; periodo: Periodo }) {
  const { atual, distribuicao: dist, intervalo, primeiraSaida } = d
  const { filtros } = useFiltros()
  const porRetorno = filtros.contarPor === 'retorno'
  const quando = fraseQuando(periodo, intervalo, primeiraSaida)
  const p = (filhos: ReactNode) => <p className="text-[15px] leading-relaxed text-ink-2">{filhos}</p>
  const longos = dist.mais30 > 0 && (
    <>
      {' '}{dist.total === 1 ? 'Do 1 executado' : `Dos ${numero(dist.total)} executados`}, <B>{numero(dist.mais30)}</B> ({pctCurto(dist.mais30, dist.total)}) levaram mais de 30 dias.
    </>
  )
  if (porRetorno) {
    if (dist.total === 0) return p(<>{quando}, nenhum serviço executado com esses filtros.</>)
    if (dist.total === 1)
      return p(<>{quando}, foi executado 1 serviço, {atual.noPrazo === 1 ? 'dentro' : 'fora'} do prazo de {PRAZO_DIAS} dias.</>)
    return p(
      <>
        {quando}, {dist.total === 1 ? 'foi executado' : 'foram executados'} <B>{numero(dist.total)}</B> e <B>{numero(atual.noPrazo)}</B> ({pctCurto(atual.noPrazo, dist.total)}) {dist.total === 1 ? '' : 'deles '}em até{' '}
        {PRAZO_DIAS} dias da saída.{longos}
      </>,
    )
  }
  if (atual.saidas === 0) return p(<>{quando}, nenhuma saída para a rua com esses filtros.</>)
  const avaliados = atual.executadas + atual.vencidas
  const noPrazoAinda = atual.abertas - atual.vencidas
  if (avaliados === 0)
    return p(
      <>
        {quando}, saíram <B>{numero(atual.saidas)}</B> para a rua e todos ainda estão dentro dos {PRAZO_DIAS} dias: ainda não dá para medir o prazo.
      </>,
    )
  return p(
    <>
      {quando}, saíram <B>{numero(atual.saidas)}</B> para a rua e <B>{numero(atual.noPrazo)}</B> {atual.noPrazo === 1 ? 'foi executado' : 'foram executados'} em até{' '}
      {PRAZO_DIAS} dias: <B>{pctCurto(atual.noPrazo, avaliados)}</B> {avaliados === 1 ? 'do 1 que já tem resultado' : `dos ${numero(avaliados)} que já têm resultado`}
      {atual.vencidas > 0 ? (
        <>
          {' '}({plural(atual.executadas, 'executado', 'executados')} e {numero(atual.vencidas)} em aberto que já {atual.vencidas === 1 ? 'venceu' : 'venceram'})
        </>
      ) : null}
      .{noPrazoAinda > 0 && <> {noPrazoAinda === 1 ? 'O outro ainda está' : `Os outros ${numero(noPrazoAinda)} ainda estão`} dentro do prazo.</>}
      {longos}
    </>,
  )
}

// silhueta de histograma (classes inteiras: o Tailwind só gera o que aparece escrito)
const ALTURAS_ESQUELETO = ['h-1/4', 'h-2/3', 'h-3/4', 'h-1/2', 'h-1/2', 'h-1/3', 'h-2/5', 'h-1/3', 'h-1/4', 'h-1/5', 'h-1/5', 'h-1/6', 'h-1/6', 'h-1/6', 'h-1/5', 'h-1/6', 'h-2/5', 'h-1/3', 'h-1/5']

function Carregando() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="px-5 py-4">
            <Esqueleto className="h-3 w-24" />
            <Esqueleto className="mt-3 h-8 w-20" />
            <Esqueleto className="mt-3 h-3 w-full" />
            <Esqueleto className="mt-4 h-7 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Esqueleto className="h-4 w-40" />
        <Esqueleto className="mt-3 h-8 w-80 max-w-full" />
        <div className="mt-5 flex h-44 items-end gap-[2px]">
          {ALTURAS_ESQUELETO.map((h, i) => (
            <Esqueleto key={i} className={`flex-1 rounded-b-none ${h}`} />
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i} className="p-5">
            <Esqueleto className="h-4 w-48" />
            <Esqueleto className="mt-2 h-3 w-64" />
            {Array.from({ length: 5 }, (_, j) => (
              <Esqueleto key={j} className="mt-3 h-8 w-full" />
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function Prazo() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()
  const d = useMemo(() => (base ? calcularPrazo(base, filtros, hoje) : null), [base, filtros, hoje])

  const porRetorno = filtros.contarPor === 'retorno'
  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria, filtros.quem ?? filtros.origem].filter(Boolean).join(' · ')

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Prazo</h1>
          {escopo && <span className="text-sm text-ink-2">{escopo}</span>}
        </div>
        <div className="mt-2">{d ? <Resumo d={d} periodo={filtros.periodo} /> : !error && <Esqueleto className="h-5 w-2/3" />}</div>
      </header>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-72" />
        </Card>
      ) : isLoading || !d ? (
        <Carregando />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="titulo-periodo" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 id="titulo-periodo" className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
                No período · {d.intervalo.rotulo}
              </h2>
              <span className="text-xs text-ink-3">
                {porRetorno ? 'executados no período' : 'entre os que saíram no período (em aberto já vencido conta como fora do prazo)'}
                {d.intervalo.parcial && d.intervalo.de !== null && ' · em curso, números ainda mudam'}
              </span>
            </div>
            <Indicadores p={d} comparacao={rotuloComparacao(d.anterior)} />
            <Distribuicao p={d} />
            {/* onde: o atraso de hoje e o tempo que levou, lado a lado (com região escolhida, os bairros) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AtrasoAgora linhas={d.atrasos} nivelBairro={d.nivelBairro} />
              <Faixas linhas={d.faixas} nivelBairro={d.nivelBairro} />
            </div>
            <Retrabalho r={d.retrabalho} />
          </section>
        </div>
      )}
    </>
  )
}

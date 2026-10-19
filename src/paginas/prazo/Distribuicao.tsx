// Quantos dias levou: histograma dos dias até a execução — dia a dia até 15 e a cauda agrupada
// (16–30, 31–90, > 90). A linha do prazo separa o que ficou dentro (verde) do que passou (vermelho):
// a posição já diz, a cor reforça. Em cima, a escolha clara de quais serviços entram na conta.
import { clsx } from 'clsx'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Check, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import { CAUDA, ULTIMO_DIA_DIARIO, type Prazo } from '@/calculos/prazo'
import { PRAZO_DIAS } from '@/config'
import type { ContarPor } from '@/filtros/filtros'
import { useFiltros } from '@/filtros/useFiltros'
import { dias, numero, pct, pctCurto } from '@/lib/formato'
import { MarcadorChave } from '@/componentes/ui/MarcadorChave'

interface Barra {
  id: string
  /** rótulo no eixo */
  eixo: string
  /** rótulo por extenso (dica e tabela) */
  nome: string
  n: number
  dentro: boolean
  cauda: boolean
}

function montarBarras(d: Prazo['distribuicao']): Barra[] {
  const diarias = d.porDia.map((n, i) => ({
    id: `d${i}`,
    eixo: String(i),
    nome: i === 0 ? 'No mesmo dia' : dias(i),
    n,
    dentro: i <= PRAZO_DIAS,
    cauda: false,
  }))
  const cauda = CAUDA.map((c, i) => ({ id: c.id, eixo: c.curto, nome: c.rotulo, n: d.cauda[i], dentro: false, cauda: true }))
  return [...diarias, ...cauda]
}

function Histograma({ d }: { d: Prazo['distribuicao'] }) {
  const [foco, setFoco] = useState<string | null>(null)
  const barras = montarBarras(d)
  const maxDiario = Math.max(0, ...d.porDia)
  const maxCauda = Math.max(0, ...d.cauda)
  // a cauda pode ser várias vezes a maior barra diária (meses ruins): aí ela é cortada no topo, com
  // o valor escrito — senão o dia a dia, onde está o prazo, vira uma linha rente ao chão
  const corta = maxDiario > 0 && maxCauda > 2 * maxDiario
  const escala = corta ? maxDiario * 1.35 : Math.max(1, maxDiario, maxCauda)
  // rótulo direto só no que importa: a maior barra do dia a dia e a cauda
  const destaque = new Set(barras.filter((b) => b.cauda || (b.n === maxDiario && b.n > 0)).map((b) => b.id))

  const coluna = (b: Barra, i: number) => {
    const cortada = b.n > escala
    const altura = b.n === 0 ? 0 : Math.max((Math.min(b.n, escala) / escala) * 100, 1.5)
    const ativa = foco === b.id
    // dica alinhada pela borda nas primeiras/últimas colunas (não sai do cartão)
    const lado = i < 3 ? 'left-0' : i > barras.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
    return (
      <div
        key={b.id}
        onPointerEnter={() => setFoco(b.id)}
        onPointerDown={() => setFoco(b.id)}
        onPointerLeave={() => setFoco(null)}
        className={clsx('relative flex h-full flex-col justify-end', b.cauda ? 'flex-[2.2]' : 'flex-1')}
      >
        {/* número sobre a barra (selecionados) ou dentro da folga do topo (cortadas) */}
        {(destaque.has(b.id) || cortada) && b.n > 0 && !ativa && (
          <span className="numeros pointer-events-none mb-0.5 text-center text-[10px] leading-none text-ink-2">{numero(b.n)}</span>
        )}
        <div
          className={clsx(
            'relative w-full rounded-t-[3px] transition-opacity duration-150',
            b.dentro ? 'bg-ok' : 'bg-atraso',
            foco && !ativa && 'opacity-45',
          )}
          style={{ height: `${altura}%` }}
        >
          {/* corte: duas faixas na cor do cartão, inclinadas */}
          {cortada && <span aria-hidden className="absolute inset-x-0 top-2 h-[3px] -skew-y-12 bg-card" />}
        </div>
        {ativa && (
          <div
            role="tooltip"
            className={clsx(
              'pointer-events-none absolute bottom-full z-10 mb-1 rounded-md border border-line bg-card px-2.5 py-1.5 text-xs whitespace-nowrap text-ink shadow-2',
              lado,
            )}
          >
            <span className="font-medium">{b.nome}</span>
            <span className="numeros block text-ink-2">
              {numero(b.n)} {b.n === 1 ? 'executado' : 'executados'} · {pct(b.n, d.total)}
            </span>
          </div>
        )}
      </div>
    )
  }

  const diarias = barras.slice(0, ULTIMO_DIA_DIARIO + 1)
  const cauda = barras.slice(ULTIMO_DIA_DIARIO + 1)
  // rótulos do eixo: todos no computador; no celular só 0, 5, 10, 15 (o resto fica invisível, mas ocupa o lugar)
  const rotulo = (b: Barra, i: number) => (
    <span
      key={b.id}
      className={clsx(
        'numeros text-center text-[10px] whitespace-nowrap text-ink-3',
        b.cauda ? 'flex-[2.2]' : 'flex-1',
        !b.cauda && i % 5 !== 0 && 'invisible sm:visible',
      )}
    >
      {b.eixo}
    </span>
  )

  return (
    <figure className="min-w-0">
      <div aria-hidden className="flex h-44 items-end gap-[2px] border-b border-line pt-6">
        {diarias.slice(0, PRAZO_DIAS + 1).map(coluna)}
        {/* linha do prazo, entre o dia 5 e o dia 6 */}
        <div className="relative h-full w-0">
          <span className="absolute -top-1 bottom-0 left-0 border-l border-dashed border-ink-3" />
          <span className="absolute -top-6 left-1 text-[10px] whitespace-nowrap text-ink-2">prazo · {PRAZO_DIAS} dias</span>
        </div>
        {diarias.slice(PRAZO_DIAS + 1).map((b, i) => coluna(b, i + PRAZO_DIAS + 1))}
        {/* cauda agrupada, um pouco afastada: as barras dela somam vários dias */}
        <div className="w-1.5 shrink-0" />
        {cauda.map((b, i) => coluna(b, i + ULTIMO_DIA_DIARIO + 1))}
      </div>
      <div aria-hidden className="mt-1 flex gap-[2px]">
        {diarias.map(rotulo)}
        <div className="w-1.5 shrink-0" />
        {cauda.map((b) => rotulo(b, 0))}
      </div>
      {/* celular: legenda centralizada, com mais respiro; computador: título à esquerda, cores à direita */}
      <figcaption className="mt-3 flex flex-col items-center gap-2.5 text-center text-[11px] text-ink-3 sm:mt-1.5 sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
        <span>dias da saída até a execução</span>
        <span className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span aria-hidden className="size-2.5 rounded-[3px] bg-ok" />
            <Check aria-hidden className="size-3 text-ok-texto" />
            Dentro do prazo
          </span>
          <span className="flex items-center gap-1.5 text-ink-2">
            <span aria-hidden className="size-2.5 rounded-[3px] bg-atraso" />
            <X aria-hidden className="size-3 text-atraso-texto" />
            Fora do prazo
          </span>
        </span>
      </figcaption>
      {corta && (
        <p className="mt-3 text-center text-[11px] text-ink-3 sm:mt-1.5 sm:text-left">
          Barra com corte no topo: maior que a escala, o número está escrito sobre ela.
        </p>
      )}
      {/* sr-only num invólucro: aplicado direto na <table>, a legenda (caption) escapava e aparecia */}
      <div className="sr-only">
      <table>
        <caption>Executados por dias até a execução</caption>
        <thead>
          <tr>
            <th scope="col">Dias</th>
            <th scope="col">Executados</th>
            <th scope="col">Parte</th>
          </tr>
        </thead>
        <tbody>
          {barras.map((b) => (
            <tr key={b.id}>
              <th scope="row">{b.nome}</th>
              <td>{numero(b.n)}</td>
              <td>{pct(b.n, d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}

/** O que entra na conta: a escolha muda o "contar por" global (vale para as outras páginas também) */
const OPCOES: { v: ContarPor; t: string }[] = [
  { v: 'retorno', t: 'Executados no período' },
  { v: 'saida', t: 'Saíram no período' },
]

export function Distribuicao({ p }: { p: Prazo }) {
  const { filtros, mudar } = useFiltros()
  const { distribuicao: d, semRetorno } = p
  const porSaida = filtros.contarPor === 'saida'

  return (
    <Card aria-labelledby="titulo-distribuicao">
      <CabecalhoCard id="titulo-distribuicao" titulo="Quantos dias levou" subtitulo="Da saída para a rua até a execução, serviço a serviço." />
      <div className="px-5 pt-3 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <ToggleGroup
            aria-label="Quais serviços entram na conta"
            value={[filtros.contarPor]}
            onValueChange={(v) => v[0] && mudar({ contarPor: v[0] as ContarPor })}
            className="relative flex h-9 shrink-0 items-center self-start rounded-full border border-line bg-page p-0.5"
          >
            <MarcadorChave className="bg-card shadow-1" />
            {OPCOES.map((o) => (
              <Toggle
                key={o.v}
                value={o.v}
                className="opcao-chave h-full rounded-full px-3 text-xs whitespace-nowrap text-ink-2 data-pressed:font-medium data-pressed:text-ink"
              >
                {/* abaixo de 360 px os dois rótulos inteiros não cabem: "no período" some (o texto ao lado explica) */}
                {o.t.replace(' no período', '')}
                <span className="max-[359px]:hidden"> no período</span>
              </Toggle>
            ))}
          </ToggleGroup>
          <p className="text-xs leading-relaxed text-ink-2">
            {porSaida ? (
              <>
                Só os que <strong className="font-medium text-ink">saíram no período e já voltaram</strong>.{' '}
                {semRetorno > 0 && (
                  <>
                    <span className="numeros">{numero(semRetorno)}</span> ainda estão na rua e não entram — por isso os rápidos pesam mais.
                  </>
                )}
              </>
            ) : (
              <>
                Tudo o que <strong className="font-medium text-ink">voltou da rua no período</strong>, mesmo o que tinha saído antes. Abertos
                não entram: sem retorno, não há prazo para medir.
              </>
            )}
          </p>
        </div>

        {d.total === 0 ? (
          <EstadoVazio
            titulo="Nenhum executado"
            texto={porSaida ? 'Nada do que saiu no período voltou ainda.' : 'Nada voltou da rua com esses filtros neste período.'}
            altura="min-h-56"
          />
        ) : (
          <>
            <div className="mt-5">
              <Histograma d={d} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">
              <Fato rotulo="Executados" valor={numero(d.total)} />
              <Fato rotulo="Dentro do prazo" valor={numero(d.dentro)} nota={pctCurto(d.dentro, d.total)} icone={<Check aria-hidden className="size-3.5 text-ok-texto" />} />
              <Fato rotulo="Mais comum" valor={d.maisComum === null ? '—' : d.maisComum === 0 ? 'mesmo dia' : dias(d.maisComum)} />
              <Fato rotulo="Mais de 30 dias" valor={numero(d.mais30)} nota={pctCurto(d.mais30, d.total)} icone={<X aria-hidden className="size-3.5 text-atraso-texto" />} />
            </dl>
          </>
        )}
      </div>
    </Card>
  )
}

function Fato({ rotulo, valor, nota, icone }: { rotulo: string; valor: string; nota?: string; icone?: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] text-ink-3">
        {icone}
        {rotulo}
      </dt>
      <dd className="numeros mt-0.5 text-[15px] text-ink">
        {valor}
        {nota && <span className="ml-1.5 text-xs text-ink-3">{nota}</span>}
      </dd>
    </div>
  )
}

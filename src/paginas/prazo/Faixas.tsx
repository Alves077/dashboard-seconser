// Quanto tempo levou, por região (ou pelos bairros da região escolhida): parte dos executados em
// cada faixa de dias. Faixas agrupadas sob "No prazo" (até 3 · 4–5) e "Fora do prazo" (6–15 · 16–30
// · > 30). Calor numa cor só — mais forte, maior a parte; o número está sempre escrito. Piores primeiro.
// Na visão de bairros, TODOS aparecem (a soma tem que bater com a região), com o total da região no topo.
import { clsx } from 'clsx'
import { ArrowLeft, Check, X } from 'lucide-react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import { FAIXAS_EXEC, type LinhaFaixas } from '@/calculos/prazo'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { compararTexto, decimal, numero } from '@/lib/formato'

/** Bairro com menos executados que isto vai para o grupo "poucos casos", com quantidades em vez de % */
const MINIMO_BAIRRO = 10
const NO_PRAZO = FAIXAS_EXEC.filter((f) => f.noPrazo).length

/** Fundo da célula: a cor da escala misturada ao cartão, mais forte quanto maior a parte */
const fundo = (parte: number) =>
  parte > 0 ? { background: `color-mix(in oklab, var(--c-o3) ${Math.round(6 + parte * 54)}%, transparent)` } : undefined

/** Soma das linhas (o total da região, quando a tabela mostra os bairros dela) */
function somar(nome: string, linhas: LinhaFaixas[]): LinhaFaixas {
  const executadas = linhas.reduce((t, l) => t + l.executadas, 0)
  const faixas = FAIXAS_EXEC.map((_, i) => linhas.reduce((t, l) => t + l.faixas[i], 0))
  const somaDias = linhas.reduce((t, l) => t + (l.tempoMedio ?? 0) * l.executadas, 0)
  const dentro = faixas.filter((_, i) => FAIXAS_EXEC[i].noPrazo).reduce((t, n) => t + n, 0)
  return {
    nome,
    executadas,
    faixas,
    pctNoPrazo: executadas ? (dentro / executadas) * 100 : 0,
    tempoMedio: executadas ? somaDias / executadas : null,
  }
}

type Tipo = 'normal' | 'pequena' | 'total'

export function Faixas({ linhas, nivelBairro }: { linhas: LinhaFaixas[]; nivelBairro: boolean }) {
  const { filtros, mudar } = useFiltros()
  const pior = (a: LinhaFaixas, b: LinhaFaixas) => a.pctNoPrazo - b.pctNoPrazo || b.executadas - a.executadas || compararTexto(a.nome, b.nome)
  // os de poucos casos vão para um grupo no fim, com a QUANTIDADE nas células: "1 de 2 = 50%" engana
  const grandes = linhas.filter((l) => !nivelBairro || l.executadas >= MINIMO_BAIRRO).sort(pior)
  const pequenos = nivelBairro
    ? linhas.filter((l) => l.executadas < MINIMO_BAIRRO).sort((a, b) => b.executadas - a.executadas || compararTexto(a.nome, b.nome))
    : []
  const total = nivelBairro && linhas.length > 1 ? somar(`Toda a região ${filtros.regiao}`, linhas) : null

  const ativo = (nome: string) => (nivelBairro ? filtros.bairro === nome : filtros.regiao === nome)
  const alternar = (nome: string) =>
    nivelBairro ? mudar({ bairro: filtros.bairro === nome ? null : nome }) : mudar({ regiao: filtros.regiao === nome ? null : nome })

  const linha = (l: LinhaFaixas, tipo: Tipo) => {
    const sel = tipo !== 'total' && ativo(l.nome)
    const conteudoNome = (
      <>
        {!nivelBairro && <span aria-hidden className={clsx('mt-[5px] size-2.5 shrink-0 rounded-full', corRegiao(l.nome))} />}
        <span className="min-w-0">
          <span className={clsx('line-clamp-2 leading-snug break-words text-ink', (sel || tipo === 'total') && 'font-medium')}>{l.nome}</span>
          <span className="block text-[11px] text-ink-3">
            {numero(l.executadas)} exec. · {decimal(l.tempoMedio)} d
          </span>
        </span>
      </>
    )
    return (
      <tr
        key={`${tipo}-${l.nome}`}
        onClick={tipo === 'total' ? undefined : () => alternar(l.nome)}
        className={clsx('group', tipo !== 'total' && 'cursor-pointer')}
      >
        <th
          scope="row"
          className={clsx(
            'rounded-md py-1.5 pr-1 pl-2 text-left font-normal',
            tipo === 'total' ? 'bg-page' : sel ? 'bg-acao-suave' : 'group-hover:bg-realce',
          )}
        >
          {tipo === 'total' ? (
            <span className="flex min-w-0 items-start gap-2">{conteudoNome}</span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                alternar(l.nome)
              }}
              aria-pressed={sel}
              className="flex w-full min-w-0 items-start gap-2 text-left"
            >
              {conteudoNome}
            </button>
          )}
        </th>
        {l.faixas.map((n, i) => {
          const parte = n / l.executadas
          return (
            <td key={FAIXAS_EXEC[i].id} className="px-[1px] py-[1px]">
              <span
                title={`${FAIXAS_EXEC[i].rotulo}: ${numero(n)} de ${numero(l.executadas)}`}
                className={clsx(
                  'flex h-10 items-center justify-center rounded-[4px] text-xs',
                  n === 0 ? 'text-ink-3' : 'text-ink',
                  tipo === 'total' && 'font-medium',
                  sel && 'ring-1 ring-acao/40',
                )}
                style={fundo(parte)}
              >
                {n === 0 ? '—' : tipo === 'pequena' ? numero(n) : `${Math.round(parte * 100)}%`}
              </span>
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <Card aria-labelledby="titulo-faixas" className="flex flex-col overflow-hidden">
      <CabecalhoCard
        id="titulo-faixas"
        titulo={nivelBairro ? `Quanto tempo levou · ${filtros.regiao}` : 'Quanto tempo levou, por região'}
        subtitulo="Parte dos executados no período em cada faixa de dias. Piores primeiro."
        acao={
          nivelBairro && (
            <button
              type="button"
              onClick={() => mudar({ regiao: null })}
              className="pressionavel flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-acao hover:bg-realce"
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Regiões
            </button>
          )
        }
      />
      {linhas.length === 0 ? (
        <EstadoVazio titulo="Nenhum executado no período" altura="min-h-40" />
      ) : (
        <div className="mt-2 flex flex-1 flex-col px-3 pb-3">
          <table className="w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-[2px] text-[13px]">
            <caption className="sr-only">
              {nivelBairro ? 'Bairros' : 'Regiões'}: parte dos executados em cada faixa de dias até a execução
            </caption>
            <colgroup>
              <col className="w-[30%]" />
              {FAIXAS_EXEC.map((f) => (
                <col key={f.id} />
              ))}
            </colgroup>
            <thead>
              {/* grupo: no prazo / fora do prazo (ícone + texto, não só cor) */}
              <tr className="text-[11px] font-medium">
                <td />
                <th scope="colgroup" colSpan={NO_PRAZO} className="pb-0.5">
                  <span className="mx-[1px] flex items-center justify-center gap-1 border-b-2 border-ok pb-1 text-ok-texto">
                    <Check aria-hidden className="size-3" />
                    No prazo
                  </span>
                </th>
                <th scope="colgroup" colSpan={FAIXAS_EXEC.length - NO_PRAZO} className="pb-0.5">
                  <span className="mx-[1px] flex items-center justify-center gap-1 border-b-2 border-atraso pb-1 text-atraso-texto">
                    <X aria-hidden className="size-3" />
                    Fora do prazo
                  </span>
                </th>
              </tr>
              <tr className="text-[11px] text-ink-3">
                <th scope="col" className="py-1.5 pl-2 text-left font-medium tracking-[0.4px] uppercase">
                  {nivelBairro ? 'Bairro' : 'Região'}
                </th>
                {FAIXAS_EXEC.map((f) => (
                  <th key={f.id} scope="col" className="px-0.5 py-1.5 text-center font-medium whitespace-nowrap">
                    {f.curto}
                    <span className="sr-only"> dias</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="numeros">
              {total && linha(total, 'total')}
              {grandes.map((l) => linha(l, 'normal'))}
              {pequenos.length > 0 && (
                <tr>
                  <td colSpan={FAIXAS_EXEC.length + 1} className="px-2 pt-3 pb-1 text-[11px] text-ink-3">
                    Menos de {MINIMO_BAIRRO} executados: nas células, a quantidade (percentual de poucos casos engana)
                  </td>
                </tr>
              )}
              {pequenos.map((l) => linha(l, 'pequena'))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

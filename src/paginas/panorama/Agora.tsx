// AGORA — a fila de hoje. Não depende do período (dito na tela, não só no código).
import { clsx } from 'clsx'
import { AlarmClock, ArrowLeft, ChevronRight, Zap } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/componentes/ui/Card'
import { SeloRisco, SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { FAIXAS_ESPERA, type calcularAgora } from '@/calculos/panorama'
import { CATEGORIA_RISCO, situacao } from '@/dados/regras'
import { ehPeriodoPadrao } from '@/filtros/filtros'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDia, type Dia } from '@/lib/datas'
import { dias, numero, pct, plural } from '@/lib/formato'
import { direcaoDaTroca, useFicha } from '@/lib/ganchos'

const COR_ESPERA = ['bg-o1', 'bg-o2', 'bg-o3', 'bg-o4', 'bg-o5']

/** Barra única dividida pelo tempo de espera; os números ficam na legenda (sempre legíveis) */
function BarraEspera({ espera, total }: { espera: number[]; total: number }) {
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label="Fila por tempo de espera">
        {espera.map((n, i) =>
          n > 0 ? <span key={FAIXAS_ESPERA[i].id} className={clsx('h-full', COR_ESPERA[i])} style={{ flexGrow: n }} /> : null,
        )}
        {total === 0 && <span className="h-full flex-1 bg-line" />}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {FAIXAS_ESPERA.map((f, i) => (
          <div key={f.id} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-ink-2">
              <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-sm', COR_ESPERA[i])} />
              <span className="truncate">{f.rotulo}</span>
            </dt>
            <dd className="numeros mt-0.5 pl-4 text-[15px] font-medium text-ink">
              {numero(espera[i])}
              <span className="ml-1.5 text-xs font-normal text-ink-3">{pct(espera[i], total)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function Agora({ agora, hoje }: { agora: ReturnType<typeof calcularAgora>; hoje: Dia }) {
  const { filtros, mudar } = useFiltros()
  const { abrir } = useFicha()
  const [mais, setMais] = useState(false)
  const lista = agora.itens.slice(0, mais ? 15 : 5)
  const soRisco = filtros.categoria === CATEGORIA_RISCO
  // filtros ligados que este bloco não usa — dito na tela para ninguém achar que o filtro falhou
  const ignorados = ehPeriodoPadrao(filtros.periodo) ? [] : ['O período']

  return (
    <Card aria-labelledby="titulo-agora">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-4">
        <h2 id="titulo-agora" className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
          Agora · fila de hoje ({formatarDia(hoje)})
        </h2>
        {ignorados.length ? (
          <p className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink-2">
            {ignorados.join(' e ')} não se aplica aqui: é a fila de hoje, de qualquer mês.
          </p>
        ) : (
          <p className="text-xs text-ink-3">Tudo o que está aberto, de qualquer mês — não muda com o período.</p>
        )}
      </div>

      <div className="grid gap-6 px-5 pt-3 pb-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-10">
        <div>
          <p className="numeros text-[44px] leading-none font-light tracking-[-1px] text-ink">{numero(agora.total)}</p>
          <p className="mt-1.5 text-[13px] text-ink-2">{agora.total === 1 ? 'serviço aguardando' : 'serviços aguardando execução'}</p>
          <ul className="mt-4 flex flex-col gap-2 text-[13px]">
            <li className="flex items-center gap-2 text-atraso-texto">
              <AlarmClock aria-hidden className="size-4 shrink-0" />
              <span className="numeros font-medium">{numero(agora.atraso)}</span>
              <span className="text-ink-2">em atraso · {pct(agora.atraso, agora.total)}</span>
            </li>
            <li>
              {soRisco ? (
                <button
                  type="button"
                  onClick={() => {
                    direcaoDaTroca('volta')
                    mudar({ categoria: null })
                  }}
                  className="pressionavel -mx-2 flex min-h-9 items-center gap-2 rounded-md bg-risco/12 px-2 text-left text-risco-texto hover:bg-risco/20"
                >
                  <ArrowLeft aria-hidden className="size-4 shrink-0" />
                  <span>
                    Só risco elétrico · <span className="underline underline-offset-4">voltar para todas as categorias</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    direcaoDaTroca('entra')
                    mudar({ categoria: CATEGORIA_RISCO })
                  }}
                  disabled={agora.risco === 0}
                  className="pressionavel -mx-2 flex min-h-9 items-center gap-2 rounded-md px-2 text-risco-texto hover:bg-risco/10 disabled:opacity-60"
                >
                  <Zap aria-hidden className="size-4 shrink-0" />
                  <span className="numeros font-medium">{numero(agora.risco)}</span>
                  <span className="text-ink-2 underline decoration-line underline-offset-4">com risco elétrico</span>
                </button>
              )}
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-[13px] font-medium text-ink">Há quanto tempo esperam</h3>
          <BarraEspera espera={agora.espera} total={agora.total} />
          <p className="mt-3 text-xs text-ink-3">Contado da última saída para a rua até hoje. Prazo: 5 dias corridos.</p>
        </div>
      </div>

      {lista.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-5 pt-3 pb-2 text-[13px] font-medium text-ink">Esperando há mais tempo</h3>
          {/* divisória entre linhas (antes só o hover separava) */}
          <ul className="divide-y divide-line border-t border-line">
            {lista.map(({ servico, saida, dias: d }) => (
              <li key={servico.chave}>
                <button
                  type="button"
                  onClick={() => abrir(servico.chave)}
                  className="group flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-ink/[0.03] sm:gap-4"
                >
                  <span className="numeros w-14 shrink-0 text-[13px] font-medium text-ink">{servico.idColab}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{servico.categoria}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {servico.bairro} · saiu em {formatarDia(saida.dataSaida)}
                    </span>
                    {/* celular: selo embaixo, para o nome da categoria caber */}
                    <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} className="mt-1 sm:hidden" />
                  </span>
                  {servico.categoria === CATEGORIA_RISCO && <SeloRisco className="max-sm:hidden" />}
                  <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} className="max-sm:hidden" />
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
          {agora.total > 5 && (
            <button
              type="button"
              onClick={() => setMais((v) => !v)}
              className="h-11 w-full border-t border-line text-[13px] font-medium text-acao hover:bg-ink/[0.03]"
            >
              {mais ? 'Mostrar menos' : `Mostrar mais (${plural(Math.min(agora.total, 15) - 5, 'outro', 'outros')})`}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}

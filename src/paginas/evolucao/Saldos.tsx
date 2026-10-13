// A fila cresceu ou diminuiu, por região (ou pelos bairros da região escolhida)? Saldo = entraram −
// executados no período = fila no fim − fila no início. Barra divergente a partir do centro: para a
// direita cresceu (vermelho), para a esquerda diminuiu (verde); o número vem com ▲/▼ e o texto.
import { clsx } from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { LinhaSaldo } from '@/calculos/evolucao'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { compararTexto, numero } from '@/lib/formato'

export function Saldos({ linhas, nivelBairro, todo }: { linhas: LinhaSaldo[]; nivelBairro: boolean; todo: boolean }) {
  const { filtros, mudar } = useFiltros()
  const [todos, setTodos] = useState(false)
  // mais cresceu primeiro
  const ordem = [...linhas].sort((a, b) => b.saldo - a.saldo || b.filaFim - a.filaFim || compararTexto(a.nome, b.nome))
  const visiveis = nivelBairro && !todos ? ordem.slice(0, 12) : ordem
  const max = Math.max(1, ...ordem.map((l) => Math.abs(l.saldo)))
  const soma = linhas.reduce((t, l) => t + l.saldo, 0)

  const ativo = (nome: string) => (nivelBairro ? filtros.bairro === nome : filtros.regiao === nome)
  const alternar = (nome: string) =>
    nivelBairro ? mudar({ bairro: filtros.bairro === nome ? null : nome }) : mudar({ regiao: filtros.regiao === nome ? null : nome })

  return (
    <Card aria-labelledby="titulo-saldos" className="flex flex-col">
      <CabecalhoCard
        id="titulo-saldos"
        titulo={
          todo
            ? nivelBairro
              ? `Onde está a fila · ${filtros.regiao}`
              : 'Onde está a fila, por região'
            : nivelBairro
              ? `A fila cresceu ou diminuiu? · ${filtros.regiao}`
              : 'A fila cresceu ou diminuiu, por região'
        }
        subtitulo={
          todo
            ? `Desde o início, entraram − executados = o que está em aberto (${numero(soma)}).`
            : `Entraram − executados no período (no total, ${soma > 0 ? '+' : ''}${numero(soma)}).`
        }
        acao={
          nivelBairro && (
            <button
              type="button"
              onClick={() => mudar({ regiao: null })}
              className="pressionavel flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-acao hover:bg-ink/[0.03]"
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Regiões
            </button>
          )
        }
      />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3">
        {visiveis.length === 0 ? (
          <EstadoVazio titulo="Nada no período" texto="Nenhuma entrada ou execução com esses filtros." altura="min-h-40" />
        ) : (
          <>
            <ol className="flex flex-col gap-1">
              {visiveis.map((l) => {
                const sel = ativo(l.nome)
                const largura = (Math.abs(l.saldo) / max) * 50
                return (
                  <li key={l.nome}>
                    <button
                      type="button"
                      onClick={() => alternar(l.nome)}
                      aria-pressed={sel}
                      className={clsx('w-full rounded-md px-2 py-2 text-left', sel ? 'bg-acao-suave' : 'hover:bg-ink/[0.03]')}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={clsx('flex min-w-0 items-center gap-2 text-[13px] text-ink', sel && 'font-medium')}>
                          {!nivelBairro && <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', corRegiao(l.nome))} />}
                          <span className="truncate">{l.nome}</span>
                        </span>
                        <span
                          className={clsx(
                            'numeros shrink-0 text-[15px] font-medium',
                            l.saldo > 0 ? 'text-atraso-texto' : l.saldo < 0 ? 'text-ok-texto' : 'text-ink-2',
                          )}
                        >
                          {l.saldo > 0 ? '▲ +' : l.saldo < 0 ? '▼ −' : ''}
                          {numero(Math.abs(l.saldo))}
                          <span className="sr-only">{l.saldo > 0 ? ' (fila cresceu)' : l.saldo < 0 ? ' (fila diminuiu)' : ' (fila igual)'}</span>
                        </span>
                      </span>
                      {/* barra divergente: o centro é o zero */}
                      <span aria-hidden className="relative mt-1.5 block h-2 rounded-full bg-line/60">
                        <span className="absolute top-[-2px] bottom-[-2px] left-1/2 w-px bg-ink-3/60" />
                        {l.saldo !== 0 && (
                          <span
                            className={clsx('absolute inset-y-0 rounded-full', l.saldo > 0 ? 'left-1/2 bg-atraso' : 'right-1/2 bg-ok')}
                            style={{ width: `${Math.max(largura, 1)}%` }}
                          />
                        )}
                      </span>
                      <span className="numeros mt-1.5 block text-[11px] leading-relaxed text-ink-3">
                        entraram {numero(l.entraram)} · executados {numero(l.executados)}
                        {todo ? <> · em aberto {numero(l.filaFim)}</> : <> · fila {numero(l.filaInicio)} → {numero(l.filaFim)}</>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {nivelBairro && ordem.length > 12 && (
              <button
                type="button"
                onClick={() => setTodos((v) => !v)}
                className="mt-auto h-10 w-full rounded-md pt-1 text-[13px] font-medium text-acao hover:bg-ink/[0.03]"
              >
                {todos ? 'Mostrar só os 12 primeiros' : `Mostrar todos (${numero(ordem.length)})`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

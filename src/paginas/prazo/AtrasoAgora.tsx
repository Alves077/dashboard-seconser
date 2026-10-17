// Em atraso agora, por região (ou pelos bairros da região escolhida): a fila de hoje que já passou
// dos 5 dias. Não depende do período. Mais atrasos primeiro; tocar filtra.
import { ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { LinhaAtraso } from '@/calculos/prazo'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { compararTexto, numero, pctCurto } from '@/lib/formato'
import { gavetaCartao, gavetaLista } from '@/lib/gaveta'
import { direcaoDaTroca } from '@/lib/ganchos'

export function AtrasoAgora({ linhas, nivelBairro }: { linhas: LinhaAtraso[]; nivelBairro: boolean }) {
  const { filtros, mudar } = useFiltros()
  const [todos, setTodos] = useState(false)
  const ordem = linhas
    .filter((l) => l.atraso > 0 || l.nome === (nivelBairro ? filtros.bairro : filtros.regiao))
    .sort((a, b) => b.atraso - a.atraso || compararTexto(a.nome, b.nome))
  const visiveis = nivelBairro && !todos ? ordem.slice(0, 10) : ordem
  const max = Math.max(1, ...visiveis.map((l) => l.atraso))
  const total = linhas.reduce((s, l) => s + l.atraso, 0)

  const ativo = (nome: string) => (nivelBairro ? filtros.bairro === nome : filtros.regiao === nome)
  // região → bairros desliza a lista (lib/gaveta.ts); escolher um bairro dentro do nível, não
  const alternar = (nome: string) => {
    if (nivelBairro) return mudar({ bairro: filtros.bairro === nome ? null : nome })
    direcaoDaTroca(filtros.regiao === nome ? 'gaveta-volta' : 'gaveta-entra', ['atraso', 'faixas'])
    mudar({ regiao: filtros.regiao === nome ? null : nome })
  }

  return (
    <Card aria-labelledby="titulo-atraso" className="flex flex-col" style={gavetaCartao('atraso')}>
      <CabecalhoCard
        id="titulo-atraso"
        titulo={nivelBairro ? `Em atraso agora · ${filtros.regiao}` : 'Em atraso agora, por região'}
        subtitulo={`Fila de hoje que já passou dos 5 dias (${numero(total)}). Não depende do período.`}
        acao={
          nivelBairro && (
            <button
              type="button"
              onClick={() => {
                direcaoDaTroca('gaveta-volta', ['atraso', 'faixas'])
                mudar({ regiao: null })
              }}
              className="pressionavel flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-acao hover:bg-realce"
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Regiões
            </button>
          )
        }
      />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3" {...gavetaLista('atraso')}>
        {visiveis.length === 0 ? (
          <EstadoVazio titulo="Nenhum serviço em atraso" texto="Toda a fila de hoje está dentro dos 5 dias." altura="min-h-40" />
        ) : (
          <>
            {/* três andares (nome e número · barra · detalhe): a linha única espremia tudo no celular */}
            <ol className="flex flex-col gap-1">
              {visiveis.map((l) => {
                const sel = ativo(l.nome)
                return (
                  <li key={l.nome}>
                    <button
                      type="button"
                      onClick={() => alternar(l.nome)}
                      aria-pressed={sel}
                      className={clsx('w-full rounded-md px-2 py-2 text-left', sel ? 'bg-acao-suave' : 'tocavel hover:bg-realce')}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={clsx('flex min-w-0 items-center gap-2 text-[13px] text-ink', sel && 'font-medium')}>
                          {!nivelBairro && <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', corRegiao(l.nome))} />}
                          <span className="truncate">{l.nome}</span>
                        </span>
                        <span className="numeros shrink-0 text-[15px] font-medium text-ink">
                          {numero(l.atraso)}
                          <span className="ml-1 text-xs font-normal text-ink-3">({pctCurto(l.atraso, l.fila)} da fila)</span>
                        </span>
                      </span>
                      <span aria-hidden className="mt-1.5 block h-2 rounded-full bg-line/60">
                        <span className="block h-full rounded-full bg-atraso" style={{ width: `${l.atraso > 0 ? Math.max((l.atraso / max) * 100, 1.5) : 0}%` }} />
                      </span>
                      <span className="numeros mt-1.5 block text-[11px] leading-relaxed text-ink-3">
                        {l.atraso === 0 ? (
                          'nenhum em atraso'
                        ) : (
                          <>
                            {numero(l.atrasoLongo)} ({pctCurto(l.atrasoLongo, l.atraso)}) com +30 dias de atraso · mais antigo: {numero(l.maisAntigo)} dias
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {nivelBairro && ordem.length > 10 && (
              <button
                type="button"
                onClick={() => setTodos((v) => !v)}
                className="mt-auto h-10 w-full rounded-md pt-1 text-[13px] font-medium text-acao tocavel hover:bg-realce"
              >
                {todos ? 'Mostrar só os 10 primeiros' : `Mostrar todos (${numero(ordem.length)})`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

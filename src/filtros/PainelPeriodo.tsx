import { clsx } from 'clsx'
import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { useBase } from '@/dados/consultas'
import { chaveMes, diaDeIso, isoDe, mesesEntre, rotuloMesLongo } from '@/lib/datas'
import { useHoje } from '@/lib/ganchos'
import { ATALHOS, intervaloDo, type ContarPor, type Periodo } from './filtros'
import { useFiltros } from './useFiltros'

/** Conteúdo do seletor de período (no popover do desktop e na gaveta do celular) */
export function PainelPeriodo({ aoEscolher }: { aoEscolher?: () => void }) {
  const { filtros, mudar } = useFiltros()
  const { data: base } = useBase()
  const hoje = useHoje()
  const atual = filtros.periodo

  // meses com saída registrada, do mais recente ao mais antigo
  const meses = useMemo(() => {
    if (!base?.saidas.length) return []
    let min = Infinity
    let max = -Infinity
    for (const s of base.saidas) {
      if (s.dataSaida < min) min = s.dataSaida
      if (s.dataSaida > max) max = s.dataSaida
    }
    return mesesEntre(min, Math.max(max, hoje)).reverse()
  }, [base, hoje])

  const intervaloAtual = intervaloDo(atual, hoje)
  const [de, setDe] = useState(intervaloAtual.de !== null ? isoDe(intervaloAtual.de) : '')
  const [ate, setAte] = useState(intervaloAtual.ate !== null ? isoDe(intervaloAtual.ate) : isoDe(hoje))

  const escolher = (p: Periodo) => {
    mudar({ periodo: p })
    aoEscolher?.()
  }
  const aplicarIntervalo = () => {
    const d = diaDeIso(de)
    const a = diaDeIso(ate)
    if (d === null || a === null) return
    escolher({ tipo: 'intervalo', de: Math.min(d, a), ate: Math.max(d, a) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Atalhos</legend>
          <ul className="flex flex-col">
            {ATALHOS.map((a) => {
              const ativo = atual.tipo === 'atalho' && atual.atalho === a.id
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => escolher({ tipo: 'atalho', atalho: a.id })}
                    className={clsx(
                      'flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]',
                      ativo ? 'font-medium text-ink' : 'text-ink-2 hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    <Check aria-hidden className={clsx('size-4 shrink-0 text-acao', !ativo && 'invisible')} />
                    {a.rotulo}
                  </button>
                </li>
              )
            })}
          </ul>
        </fieldset>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Um mês</span>
            <select
              value={atual.tipo === 'mes' ? String(atual.mes) : ''}
              onChange={(e) => e.target.value && escolher({ tipo: 'mes', mes: Number(e.target.value) })}
              className="h-11 rounded-md border border-line-input bg-card px-3 text-ink"
            >
              <option value="">Escolher mês…</option>
              {meses.map((k) => (
                <option key={k} value={k}>
                  {rotuloMesLongo(k)}
                  {k === chaveMes(hoje) ? ' (em curso)' : ''}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Intervalo</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-ink-2">
                De
                <input
                  type="date"
                  value={de}
                  max={ate || undefined}
                  onChange={(e) => setDe(e.target.value)}
                  className="h-11 min-w-0 rounded-md border border-line-input bg-card px-2 text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-2">
                Até
                <input
                  type="date"
                  value={ate}
                  min={de || undefined}
                  onChange={(e) => setAte(e.target.value)}
                  className="h-11 min-w-0 rounded-md border border-line-input bg-card px-2 text-ink"
                />
              </label>
            </div>
            <Botao variante="secundario" tamanho="compacto" onClick={aplicarIntervalo} disabled={!de || !ate} className="mt-1 self-start">
              Aplicar intervalo
            </Botao>
          </fieldset>
        </div>
      </div>

      <ContarPorEscolha valor={filtros.contarPor} aoMudar={(v) => mudar({ contarPor: v })} />
    </div>
  )
}

function ContarPorEscolha({ valor, aoMudar }: { valor: ContarPor; aoMudar: (v: ContarPor) => void }) {
  const opcoes: { v: ContarPor; titulo: string; texto: string }[] = [
    { v: 'saida', titulo: 'Data de saída', texto: 'quando foi para a rua' },
    { v: 'retorno', titulo: 'Data de retorno', texto: 'quando foi executado' },
  ]
  return (
    <fieldset className="border-t border-line pt-3">
      <legend className="mb-1.5 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Contar o período pela</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {opcoes.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={valor === o.v}
            onClick={() => aoMudar(o.v)}
            className={clsx(
              'pressionavel rounded-lg border px-3 py-2 text-left',
              valor === o.v ? 'border-acao bg-acao-suave' : 'border-line hover:border-acao/40',
            )}
          >
            <span className="block text-[13px] font-medium text-ink">{o.titulo}</span>
            <span className="block text-xs text-ink-2">{o.texto}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

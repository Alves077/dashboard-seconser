// Escolha do período (popover no computador, gaveta no celular). Três jeitos, do mais rápido ao mais
// livre: atalho → um mês (grade por ano, com a contagem dos outros filtros) → intervalo personalizado.
import { clsx } from 'clsx'
import { CalendarRange, ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { useBase } from '@/dados/consultas'
import { chaveMes, diaDeIso, isoDe, mesesEntre, rotuloMesLongo, type ChaveMes } from '@/lib/datas'
import { numero } from '@/lib/formato'
import { useHoje } from '@/lib/ganchos'
import { filtrarLugar, intervaloDo, type Atalho, type ContarPor, type Periodo } from './filtros'
import { useFiltros } from './useFiltros'

// Os mais usados; os demais atalhos continuam valendo em links antigos, só não aparecem aqui
const ATALHOS_VISIVEIS: { id: Atalho; rotulo: string }[] = [
  { id: 'tudo', rotulo: 'Todo o período' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: 'este-mes', rotulo: 'Este mês' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
  { id: '3m', rotulo: 'Últimos 3 meses' },
  { id: 'este-ano', rotulo: 'Este ano' },
]
const MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const rotuloSecao = 'mb-2 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase'

/** Saídas por mês com os outros filtros (lugar, categoria, origem) — o período não entra */
function useContagemMeses() {
  const { data: base } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()
  return useMemo(() => {
    const m = new Map<ChaveMes, number>()
    if (!base) return { contagem: m, meses: [] as ChaveMes[] }
    let min = Infinity
    for (const s of filtrarLugar(base.saidas, filtros)) {
      if (s.dataSaida < min) min = s.dataSaida
      const d = filtros.contarPor === 'saida' ? s.dataSaida : s.dataRetorno
      if (d === null) continue
      const k = chaveMes(d)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    const meses = Number.isFinite(min) ? mesesEntre(min, hoje) : []
    return { contagem: m, meses }
  }, [base, filtros, hoje])
}

function GradeMeses({ selecionado, aoEscolher }: { selecionado: ChaveMes | null; aoEscolher: (k: ChaveMes) => void }) {
  const { contagem, meses } = useContagemMeses()
  const hoje = useHoje()
  const corrente = chaveMes(hoje)
  const anos = [...new Set(meses.map((k) => Math.floor(k / 100)))].sort((a, b) => b - a)
  if (!anos.length) return <p className="text-[13px] text-ink-3">Sem meses com dados.</p>
  return (
    <div className="flex flex-col gap-3">
      {anos.map((ano) => (
        <div key={ano} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-2">
          <span className="numeros pt-2 text-xs font-medium text-ink-2">{ano}</span>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
            {MES_CURTO.map((nome, m0) => {
              const k = ano * 100 + m0
              const existe = meses.includes(k)
              const n = contagem.get(k) ?? 0
              const ativo = selecionado === k
              if (!existe) return <span key={k} aria-hidden />
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => aoEscolher(k)}
                  disabled={n === 0 && !ativo}
                  aria-pressed={ativo}
                  aria-label={`${rotuloMesLongo(k)}: ${numero(n)} saídas${k === corrente ? ', em curso' : ''}`}
                  className={clsx(
                    'pressionavel flex min-h-11 flex-col items-center justify-center rounded-md border text-[13px] leading-tight disabled:cursor-not-allowed disabled:opacity-35',
                    ativo ? 'border-acao bg-acao text-sobre-acao' : 'border-line bg-card text-ink hover:border-acao/40',
                  )}
                >
                  <span className="flex items-center gap-1 font-medium">
                    {nome}
                    {k === corrente && (
                      <span aria-hidden className={clsx('size-1.5 rounded-full', ativo ? 'bg-sobre-acao' : 'bg-andamento')} title="em curso" />
                    )}
                  </span>
                  <span className={clsx('numeros text-[11px]', ativo ? 'text-sobre-acao/80' : 'text-ink-3')}>{numero(n)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ContarPorEscolha({ valor, aoMudar }: { valor: ContarPor; aoMudar: (v: ContarPor) => void }) {
  const opcoes: { v: ContarPor; titulo: string }[] = [
    { v: 'saida', titulo: 'Saída para a rua' },
    { v: 'retorno', titulo: 'Retorno (execução)' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
      <span className="text-xs text-ink-2">Contar pela data de</span>
      <div role="radiogroup" aria-label="Contar o período pela data de" className="flex h-9 items-center rounded-full border border-line bg-page p-0.5">
        {opcoes.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={valor === o.v}
            onClick={() => aoMudar(o.v)}
            className={clsx(
              'pressionavel h-full rounded-full px-3 text-xs whitespace-nowrap',
              valor === o.v ? 'bg-card font-medium text-ink shadow-1' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.titulo}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Conteúdo do seletor de período */
export function PainelPeriodo({ aoEscolher }: { aoEscolher?: () => void }) {
  const { filtros, mudar } = useFiltros()
  const hoje = useHoje()
  const atual = filtros.periodo
  const intervaloAtual = intervaloDo(atual, hoje)
  const [livreAberto, setLivreAberto] = useState(atual.tipo === 'intervalo')
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
      <section>
        <h3 className={rotuloSecao}>Atalhos</h3>
        <div className="flex flex-wrap gap-1.5">
          {ATALHOS_VISIVEIS.map((a) => {
            const ativo = atual.tipo === 'atalho' && atual.atalho === a.id
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => escolher({ tipo: 'atalho', atalho: a.id })}
                className={clsx(
                  'pressionavel h-9 rounded-full border px-3 text-[13px]',
                  ativo ? 'border-acao bg-acao font-medium text-sobre-acao' : 'border-line bg-card text-ink hover:border-acao/40',
                )}
              >
                {a.rotulo}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className={rotuloSecao}>Um mês</h3>
        <GradeMeses selecionado={atual.tipo === 'mes' ? atual.mes : null} aoEscolher={(k) => escolher({ tipo: 'mes', mes: k })} />
      </section>

      <section>
        <button
          type="button"
          onClick={() => setLivreAberto((v) => !v)}
          aria-expanded={livreAberto}
          className={clsx('flex h-9 items-center gap-2 text-[13px] font-medium', atual.tipo === 'intervalo' ? 'text-acao' : 'text-ink-2 hover:text-ink')}
        >
          <CalendarRange aria-hidden className="size-4" />
          Intervalo personalizado
          <ChevronDown aria-hidden className={clsx('size-4 transition-transform duration-150', livreAberto && 'rotate-180')} />
        </button>
        {livreAberto && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1 text-xs text-ink-2">
                De
                <input
                  type="date"
                  value={de}
                  max={ate || undefined}
                  onChange={(e) => setDe(e.target.value)}
                  className="h-11 w-full min-w-0 rounded-md border border-line-input bg-card px-3 text-ink"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-ink-2">
                Até
                <input
                  type="date"
                  value={ate}
                  min={de || undefined}
                  max={isoDe(hoje)}
                  onChange={(e) => setAte(e.target.value)}
                  className="h-11 w-full min-w-0 rounded-md border border-line-input bg-card px-3 text-ink"
                />
              </label>
            </div>
            <Botao variante="primario" tamanho="compacto" onClick={aplicarIntervalo} disabled={!de || !ate} className="self-start">
              Aplicar {de && ate ? `${de.split('-').reverse().join('/')} a ${ate.split('-').reverse().join('/')}` : 'intervalo'}
            </Botao>
          </div>
        )}
      </section>

      <ContarPorEscolha valor={filtros.contarPor} aoMudar={(v) => mudar({ contarPor: v })} />
    </div>
  )
}

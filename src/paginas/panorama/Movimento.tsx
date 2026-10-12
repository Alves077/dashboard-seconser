// Movimento da fila: fila no início + saíram − executadas = fila no fim.
// Vem do relatório mensal antigo, que era o único lugar com essa conta — aqui vale para qualquer período.
// Computador: equação em linha. Celular: lista tipo extrato (rótulo à esquerda, número à direita).
import { clsx } from 'clsx'
import { CircleCheck, Hourglass, Inbox, Truck, type LucideIcon } from 'lucide-react'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { Movimento as Mov } from '@/calculos/panorama'
import { chaveMes, formatarDia, rotuloMes, type Dia } from '@/lib/datas'
import { numero, plural } from '@/lib/formato'

interface TermoConta {
  chave: string
  sinal: '' | '+' | '−' | '='
  rotulo: string
  valor: number
  nota?: string
  icone: LucideIcon
  corIcone: string
  corValor?: string
}

export function Movimento({ m, primeiraSaida, hoje }: { m: Mov; primeiraSaida: Dia | null; hoje: Dia }) {
  const desde = m.de ?? primeiraSaida
  const variou = m.fim - m.inicio
  const tomFim = m.de === null ? undefined : variou > 0 ? 'text-atraso-texto' : variou < 0 ? 'text-ok-texto' : undefined

  const termos: TermoConta[] = [
    ...(m.de !== null
      ? [{ chave: 'ini', sinal: '' as const, rotulo: `Fila em ${formatarDia(m.de)}`, valor: m.inicio, nota: 'vinda de antes', icone: Inbox, corIcone: 'text-ink-3' }]
      : []),
    { chave: 'sai', sinal: m.de !== null ? '+' : '', rotulo: 'Saíram para a rua', valor: m.entraram, nota: 'no período', icone: Truck, corIcone: 'text-s1' },
    {
      chave: 'exe',
      sinal: '−',
      rotulo: 'Executadas',
      valor: m.executadas,
      nota: m.de !== null && m.executadasAntigas > 0 ? `${numero(m.executadasAntigas)} tinham saído antes` : undefined,
      icone: CircleCheck,
      corIcone: 'text-ok',
    },
    {
      chave: 'fim',
      sinal: '=',
      rotulo: m.ate >= hoje ? 'Fila hoje' : `Fila em ${formatarDia(m.ate)}`,
      valor: m.fim,
      nota:
        m.de === null
          ? 'ainda aguardando'
          : variou === 0
            ? 'igual ao início'
            : `${variou > 0 ? 'cresceu' : 'diminuiu'} ${plural(Math.abs(variou), 'serviço', 'serviços')}`,
      icone: Hourglass,
      corIcone: variou > 0 && m.de !== null ? 'text-atraso' : variou < 0 ? 'text-ok' : 'text-andamento',
      corValor: tomFim,
    },
  ]

  return (
    <Card aria-labelledby="titulo-movimento">
      <CabecalhoCard
        id="titulo-movimento"
        titulo="Movimento da fila"
        subtitulo={
          m.de === null
            ? `Desde ${desde !== null ? rotuloMes(chaveMes(desde)) : 'o início'}: tudo o que saiu para a rua e o que já voltou.`
            : 'Quanto entrou e quanto foi executado no período, de qualquer mês de saída.'
        }
      />

      {/* celular: extrato */}
      <ul className="mx-5 my-4 divide-y divide-line rounded-lg bg-page md:hidden">
        {termos.map((x) => (
          <li key={x.chave} className={clsx('flex items-center gap-3 px-3 py-2.5', x.sinal === '=' && 'bg-ink/[0.03]')}>
            <span aria-hidden className="w-3 text-center text-sm font-medium text-ink-3">
              {x.sinal}
            </span>
            <x.icone aria-hidden className={clsx('size-4 shrink-0', x.corIcone)} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-ink">{x.rotulo}</span>
              {x.nota && <span className="block text-[11px] text-ink-3">{x.nota}</span>}
            </span>
            <span className={clsx('numeros text-lg font-light text-ink', x.sinal === '=' && 'font-normal', x.corValor)}>{numero(x.valor)}</span>
          </li>
        ))}
      </ul>

      {/* computador: equação */}
      <div className="hidden items-stretch gap-2 p-5 pt-4 md:flex">
        {termos.map((x, i) => (
          <div key={x.chave} className="flex min-w-0 flex-1 items-stretch gap-2">
            {i > 0 && (
              <span aria-hidden className="grid w-5 shrink-0 place-items-center text-lg font-light text-ink-3">
                {x.sinal}
              </span>
            )}
            <div className="min-w-0 flex-1 rounded-lg bg-page px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-ink-2">
                <x.icone aria-hidden className={clsx('size-3.5 shrink-0', x.corIcone)} />
                <span className="truncate">{x.rotulo}</span>
              </p>
              <p className={clsx('numeros mt-1 text-2xl font-light tracking-[-0.4px] text-ink', x.corValor)}>{numero(x.valor)}</p>
              {x.nota && <p className="mt-0.5 truncate text-xs text-ink-3">{x.nota}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

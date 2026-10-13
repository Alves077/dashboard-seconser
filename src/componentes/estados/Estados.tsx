// Estados que ocupam o MESMO lugar do conteúdo (mesma moldura e altura), para nada pular
// nem desalinhar a grade (DESIGN.md §7).
import { clsx } from 'clsx'
import { CloudOff, Lock, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Botao } from '@/componentes/ui/Botao'

/** Bloco que pulsa no formato do conteúdo final. Com movimento reduzido, fica parado. */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-md bg-line motion-reduce:animate-none', className)} />
}

function Moldura({
  icone,
  titulo,
  texto,
  acao,
  altura,
  tom = 'neutro',
}: {
  icone: ReactNode
  titulo: string
  texto?: ReactNode
  acao?: ReactNode
  altura?: string
  tom?: 'neutro' | 'erro'
}) {
  return (
    <div
      role={tom === 'erro' ? 'alert' : 'status'}
      className={clsx('flex flex-col items-center justify-center gap-2 px-6 py-8 text-center', altura)}
    >
      <div
        className={clsx(
          'mb-1 grid size-10 place-items-center rounded-full',
          tom === 'erro' ? 'bg-atraso/10 text-atraso-texto' : 'bg-ink/5 text-ink-3',
        )}
      >
        {icone}
      </div>
      <p className="text-sm font-medium text-ink">{titulo}</p>
      {texto && <p className="max-w-sm text-[13px] text-ink-3">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

/** Conteúdo só para quem tem acesso à parte restrita (ex.: página de Relatórios sem login) */
export function EstadoRestrito({
  titulo,
  texto,
  acao,
  altura,
}: {
  titulo: string
  texto?: ReactNode
  acao?: ReactNode
  altura?: string
}) {
  return <Moldura icone={<Lock className="size-5" aria-hidden />} titulo={titulo} texto={texto} acao={acao} altura={altura} />
}

/** Filtro sem resultado: diz o que aconteceu e oferece a saída */
export function EstadoVazio({
  titulo = 'Nenhum serviço com esses filtros',
  texto,
  aoLimpar,
  altura,
}: {
  titulo?: string
  texto?: ReactNode
  aoLimpar?: () => void
  altura?: string
}) {
  return (
    <Moldura
      icone={<SearchX className="size-5" aria-hidden />}
      titulo={titulo}
      texto={texto}
      altura={altura}
      acao={
        aoLimpar && (
          <Botao variante="secundario" tamanho="compacto" onClick={aoLimpar}>
            Limpar filtros
          </Botao>
        )
      }
    />
  )
}

export function EstadoErro({
  erro,
  aoTentar,
  altura,
}: {
  erro: unknown
  aoTentar?: () => void
  altura?: string
}) {
  const detalhe = erro instanceof Error ? erro.message : null
  return (
    <Moldura
      tom="erro"
      icone={<CloudOff className="size-5" aria-hidden />}
      titulo="Não foi possível carregar os dados"
      texto={
        <>
          Pode ser a conexão ou o serviço de dados fora do ar.
          {detalhe && <span className="mt-1 block text-xs text-ink-3">({detalhe})</span>}
        </>
      }
      altura={altura}
      acao={
        aoTentar && (
          <Botao variante="primario" tamanho="compacto" onClick={aoTentar}>
            Tentar de novo
          </Botao>
        )
      }
    />
  )
}

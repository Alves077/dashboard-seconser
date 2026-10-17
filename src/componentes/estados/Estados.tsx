// Estados que ocupam o MESMO lugar do conteúdo (mesma moldura e altura), para nada pular
// nem desalinhar a grade (DESIGN.md §7).
import { clsx } from 'clsx'
import { CloudOff, Lock, SearchX } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'

/** Bloco que pulsa no formato do conteúdo final. Com movimento reduzido, fica parado. */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-md bg-line motion-reduce:animate-none', className)} />
}

/** Página genérica (título, 4 indicadores, um bloco grande) enquanto o arquivo da página chega */
export function EsqueletoPagina() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="mb-2">
        <Esqueleto className="h-7 w-40" />
        <Esqueleto className="mt-3 h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="px-5 py-4">
            <Esqueleto className="h-3 w-24" />
            <Esqueleto className="mt-3 h-8 w-20" />
            <Esqueleto className="mt-3 h-3 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Esqueleto className="h-4 w-56" />
        <Esqueleto className="mt-5 h-60 w-full" />
      </Card>
    </div>
  )
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
          tom === 'erro' ? 'bg-atraso/10 text-atraso-texto' : 'bg-realce-forte text-ink-3',
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
  rotuloAcao = 'Limpar filtros',
  altura,
}: {
  titulo?: string
  texto?: ReactNode
  aoLimpar?: () => void
  /** texto do botão (padrão "Limpar filtros"; ex.: "Ver a fila toda" no Mapa) */
  rotuloAcao?: string
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
            {rotuloAcao}
          </Botao>
        )
      }
    />
  )
}

/**
 * O motivo em palavras de quem usa: o texto técnico ("Failed to fetch", "statement timeout") não diz nada a
 * ninguém da DIP — ele vai para o console, para quem for investigar.
 */
function motivoDoErro(erro: unknown): string {
  const msg = erro instanceof Error ? erro.message : String(erro ?? '')
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? String((erro as { code: unknown }).code) : ''
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg))
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
  if (codigo === '57014' || /timeout|timed out/i.test(msg)) return 'O banco de dados demorou demais para responder. Tente de novo em instantes.'
  if (/jwt|token|auth/i.test(msg)) return 'Sua sessão expirou. Entre de novo.'
  return 'Pode ser a conexão ou o serviço de dados fora do ar.'
}

export function EstadoErro({
  erro,
  aoTentar,
  altura,
  titulo = 'Não foi possível carregar os dados',
}: {
  erro: unknown
  aoTentar?: () => void
  altura?: string
  titulo?: string
}) {
  useEffect(() => {
    if (erro) console.error(erro)
  }, [erro])
  return (
    <Moldura
      tom="erro"
      icone={<CloudOff className="size-5" aria-hidden />}
      titulo={titulo}
      texto={motivoDoErro(erro)}
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

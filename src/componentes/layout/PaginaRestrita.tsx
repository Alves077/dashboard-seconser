import { LogIn } from 'lucide-react'
import type { ReactNode } from 'react'
import { EstadoErro, EstadoRestrito, Esqueleto } from '@/componentes/estados/Estados'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'
import { useDetalhes } from '@/dados/consultas'
import { useSessao } from '@/dados/sessao'
import { useInterface } from './interface'

/**
 * Página só da equipe da DIP (com acesso à parte restrita): Relatórios e Serviços. O menu já a esconde (usePaginas);
 * quem chega pelo link vê o título com o botão de entrar, e depois de entrar a página aparece sozinha (o acesso muda
 * e o componente redesenha).
 */
export function PaginaRestrita({
  nome,
  titulo,
  texto,
  tituloErro,
  children,
}: {
  nome: string
  titulo: string
  texto: string
  tituloErro: string
  children: ReactNode
}) {
  const { modo, usuario } = useSessao()
  const { acesso, erroRestrito, error: erroDetalhes, refetch: tentarDetalhes } = useDetalhes()
  const { setLoginAberto } = useInterface()
  if (acesso === true) return children
  return (
    <>
      <h1 className="mb-5 text-2xl font-normal tracking-[-0.4px] text-ink">{nome}</h1>
      <Card>
        {erroRestrito ? (
          <EstadoErro erro={erroDetalhes} aoTentar={() => tentarDetalhes()} altura="min-h-72" titulo={tituloErro} />
        ) : acesso === undefined ? (
          <div aria-busy="true" className="flex min-h-72 flex-col items-center justify-center gap-3">
            <Esqueleto className="size-10 rounded-full" />
            <Esqueleto className="h-4 w-56" />
          </div>
        ) : (
          <EstadoRestrito
            titulo={titulo}
            texto={usuario ? 'Sua conta não tem acesso a esta parte. Fale com o administrador.' : texto}
            acao={
              !usuario &&
              modo === 'supabase' && (
                <Botao variante="primario" tamanho="compacto" onClick={() => setLoginAberto(true)}>
                  <LogIn aria-hidden className="size-4" /> Entrar
                </Botao>
              )
            }
            altura="min-h-72"
          />
        )}
      </Card>
    </>
  )
}

// Tela de erro das rotas (errorElement do React Router), no lugar do "Unexpected Application Error".
//
// Caso mais comum: "Failed to fetch dynamically imported module". O Mapa (MapaGrande) e o mini-mapa da
// ficha são carregados só quando abertos (lazy). Se o site ganhou versão nova enquanto a aba estava
// aberta (ou o Vite se reorganizou no `npm run dev`), o arquivo antigo não existe mais. Recarregar a
// página busca a versão nova e resolve — então recarrega sozinho, UMA vez (marca na sessão evita laço).
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useRouteError } from 'react-router'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'

const MARCA = 'recarregou-por-modulo'
const JANELA_MS = 10_000

// Mensagens dos navegadores para "não achei o arquivo do módulo" (Chrome/Edge, Safari, Firefox)
const FALHA_MODULO =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i

function ehFalhaDeModulo(erro: unknown) {
  return erro instanceof Error && FALHA_MODULO.test(erro.message)
}

/**
 * Já recarregou por isso nos últimos 10 s? Então o problema não se resolve recarregando: mostra a tela.
 * Só LÊ a marca (o desenho pode rodar duas vezes no modo estrito); quem grava é o efeito, antes de recarregar.
 */
function recarregouAgora() {
  try {
    return Date.now() - Number(sessionStorage.getItem(MARCA) ?? 0) < JANELA_MS
  } catch {
    return true // navegação privada sem sessionStorage: não arrisca laço, mostra a tela
  }
}

export function ErroPagina({ telaCheia = false }: { telaCheia?: boolean }) {
  const erro = useRouteError()
  const navegar = useNavigate()
  // decidido uma vez, na montagem (não muda se o componente redesenhar)
  const [recarregarSozinho] = useState(() => ehFalhaDeModulo(erro) && !recarregouAgora())

  useEffect(() => {
    if (!recarregarSozinho) return
    try {
      sessionStorage.setItem(MARCA, String(Date.now()))
    } catch {
      /* sem sessionStorage: recarregarSozinho já seria false */
    }
    window.location.reload()
  }, [recarregarSozinho])

  if (recarregarSozinho)
    return (
      <p role="status" className="flex min-h-72 items-center justify-center gap-2 text-[13px] text-ink-3">
        <RefreshCw aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> Atualizando para a versão mais nova…
      </p>
    )

  const detalhe = erro instanceof Error ? erro.message : null
  const conteudo = (
    <Card>
      <div role="alert" className="flex min-h-72 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <div className="mb-1 grid size-10 place-items-center rounded-full bg-atraso/10 text-atraso-texto">
          <TriangleAlert aria-hidden className="size-5" />
        </div>
        <p className="text-sm font-medium text-ink">Algo deu errado nesta página</p>
        <p className="max-w-sm text-[13px] text-ink-3">
          {ehFalhaDeModulo(erro)
            ? 'Não foi possível carregar uma parte do site. Pode ser a conexão ou uma versão nova publicada agora.'
            : 'Tente de novo. Se continuar, avise o administrador com o texto abaixo.'}
          {detalhe && <span className="mt-1 block text-xs break-words text-ink-3">({detalhe})</span>}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Botao variante="primario" tamanho="compacto" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden className="size-4" /> Tentar de novo
          </Botao>
          <Botao variante="secundario" tamanho="compacto" onClick={() => navegar('/')}>
            Voltar ao Panorama
          </Botao>
        </div>
      </div>
    </Card>
  )

  // erro fora das páginas (ex.: ficha): sem cabeçalho em volta, centraliza na tela
  return telaCheia ? <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-4">{conteudo}</main> : conteudo
}

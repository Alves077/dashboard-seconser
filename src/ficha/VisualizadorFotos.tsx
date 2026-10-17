// Foto ampliada na própria página, por cima da ficha. Setas (tela, teclado ← → e arrastar no
// celular) passam as fotos; Esc, × ou tocar fora fecha. Trocar de foto não anima: é ação repetida.
import { Dialog } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Foto } from '@/dados/tipos'

const ARRASTE_MINIMO = 50 // px para contar como "passar a foto"

export function VisualizadorFotos({
  fotos,
  indice,
  aoMudar,
  aoFechar,
}: {
  fotos: Foto[]
  indice: number | null
  aoMudar: (i: number) => void
  aoFechar: () => void
}) {
  const inicioX = useRef<number | null>(null)
  // fotos que não carregaram (sumiram do Colab): mensagem no lugar do ícone quebrado
  const [falhas, setFalhas] = useState<Set<string>>(() => new Set())
  const total = fotos.length
  const atual = indice === null ? null : fotos[indice]
  const anterior = () => indice !== null && aoMudar((indice - 1 + total) % total)
  const proxima = () => indice !== null && aoMudar((indice + 1) % total)

  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') anterior()
    if (e.key === 'ArrowRight') proxima()
  }
  const aoPressionar = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') inicioX.current = e.clientX
  }
  const aoSoltar = (e: PointerEvent) => {
    if (inicioX.current === null) return
    const dx = e.clientX - inicioX.current
    inicioX.current = null
    if (Math.abs(dx) >= ARRASTE_MINIMO) (dx > 0 ? anterior : proxima)()
  }

  const seta =
    'pressionavel absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65'

  return (
    <Dialog.Root open={atual !== null} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className="fixed inset-0 z-[60] bg-black/85 transition-opacity duration-200 ease-saida data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          onKeyDown={aoTeclar}
          // tocar no fundo escuro (fora da foto e dos botões) fecha
          onClick={(e) => e.target === e.currentTarget && aoFechar()}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] outline-none transition-[opacity,scale] duration-200 ease-saida data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
        >
          <Dialog.Title className="sr-only">
            Foto {indice !== null ? indice + 1 : ''} de {total}
          </Dialog.Title>

          {atual && falhas.has(atual.url) && (
            <p className="flex flex-col items-center gap-2 text-sm text-white/80">
              <ImageOff aria-hidden className="size-8" />
              Foto indisponível (não está mais no Colab)
            </p>
          )}
          {atual && !falhas.has(atual.url) && (
            <img
              key={atual.url}
              src={atual.url}
              alt={`Foto ${(indice ?? 0) + 1} de ${total} do serviço`}
              referrerPolicy="no-referrer"
              draggable={false}
              onPointerDown={aoPressionar}
              onPointerUp={aoSoltar}
              onError={() => setFalhas((f) => new Set(f).add(atual.url))}
              className="max-h-full max-w-full touch-pan-y rounded-lg object-contain shadow-2 select-none"
            />
          )}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] text-white">
            <span className="numeros text-sm" aria-live="polite">
              {indice !== null ? indice + 1 : ''} de {total}
            </span>
            <Dialog.Close
              aria-label="Fechar foto"
              className="pressionavel grid size-11 place-items-center rounded-full bg-black/45 hover:bg-black/65"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>

          {total > 1 && (
            <>
              <button type="button" onClick={anterior} aria-label="Foto anterior" className={`${seta} left-3`}>
                <ChevronLeft aria-hidden className="size-6" />
              </button>
              <button type="button" onClick={proxima} aria-label="Próxima foto" className={`${seta} right-3`}>
                <ChevronRight aria-hidden className="size-6" />
              </button>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

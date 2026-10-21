// Mapa pequeno com o pino do serviço (Ficha). Carregado sob demanda: o Leaflet só baixa
// quando uma ficha com coordenada é aberta.
// Desde 20/10/2026 (usuário): os outros pedidos em aberto de "Perto daqui" aparecem como pontos mais claros (tocar
// abre a ficha deles) e o botão do canto amplia o mapa em tela cheia ali mesmo, sem ir para a página Mapa.
import 'leaflet/dist/leaflet.css'
import { Dialog } from '@base-ui/react/dialog'
import { Maximize2, X } from 'lucide-react'
import { useState } from 'react'
import { CircleMarker, MapContainer, Tooltip } from 'react-leaflet'
import type { Situacao } from '@/dados/tipos'
import { FundoMapa } from './FundoMapa'

const VAR_COR: Record<Situacao, string> = { ok: '--c-ok', andamento: '--c-andamento', atraso: '--c-atraso' }

const cor = (s: Situacao) => getComputedStyle(document.documentElement).getPropertyValue(VAR_COR[s]).trim() || '#533afd'

export interface PontoPerto {
  chave: string
  lat: number
  lng: number
  situacao: Situacao
  /** "902909 · Caixa de passagem / quadro" (dica ao passar o mouse) */
  rotulo: string
}

interface Props {
  lat: number
  lng: number
  situacao: Situacao
  /** "Serviço 925835" (título da tela cheia) */
  titulo: string
  perto: PontoPerto[]
  aoAbrir: (chave: string) => void
}

/** Os pinos: vizinhos mais claros e menores por baixo; este, cheio e com halo branco, por cima */
function Pinos({ lat, lng, situacao, perto, aoAbrir, grande }: Omit<Props, 'titulo'> & { grande: boolean }) {
  return (
    <>
      {perto.map((p) => (
        <CircleMarker
          key={p.chave}
          center={[p.lat, p.lng]}
          radius={grande ? 7 : 6}
          pathOptions={{ color: '#fff', weight: 1.5, opacity: 0.9, fillColor: cor(p.situacao), fillOpacity: 0.45 }}
          eventHandlers={{ click: () => aoAbrir(p.chave) }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {p.rotulo}
          </Tooltip>
        </CircleMarker>
      ))}
      {/* halo branco + ponto na cor da situação (a situação também está escrita na ficha) */}
      <CircleMarker center={[lat, lng]} radius={11} interactive={false} pathOptions={{ color: '#fff', weight: 3, fillColor: cor(situacao), fillOpacity: 1 }} />
    </>
  )
}

export default function MiniMapa(props: Props) {
  const { lat, lng, titulo, perto, aoAbrir } = props
  const [cheio, setCheio] = useState(false)
  // tocar num vizinho na tela cheia: fecha o mapa grande e abre a ficha dele
  const abrirVizinho = (chave: string) => {
    setCheio(false)
    aoAbrir(chave)
  }
  return (
    <div className="relative">
      <MapContainer
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={16}
        // dentro de uma gaveta que rola: sem roda do mouse e sem arrastar com um dedo
        scrollWheelZoom={false}
        dragging={!matchMedia('(pointer: coarse)').matches}
        attributionControl
        className="mapa-tema h-48 w-full rounded-lg"
      >
        <FundoMapa />
        <Pinos {...props} grande={false} />
      </MapContainer>
      <button
        type="button"
        onClick={() => setCheio(true)}
        aria-label="Ampliar o mapa"
        title="Ampliar o mapa"
        className="pressionavel absolute top-2 right-2 z-[1000] grid size-9 place-items-center rounded-md border border-line bg-card text-ink-2 shadow-1 hover:text-ink"
      >
        <Maximize2 aria-hidden className="size-4" />
      </button>

      <Dialog.Root open={cheio} onOpenChange={setCheio}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup className="fixed inset-2 z-[60] flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-2 transition-[opacity,scale] duration-200 ease-saida data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100 sm:inset-6">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <div className="min-w-0">
                <Dialog.Title className="truncate text-[15px] font-medium text-ink">{titulo}</Dialog.Title>
                <Dialog.Description className="text-xs text-ink-3">
                  {perto.length
                    ? `Pontos claros: ${perto.length === 1 ? 'outro pedido em aberto' : `os ${perto.length} outros pedidos em aberto`} até 300 m (toque para abrir).`
                    : 'Nenhum outro pedido em aberto até 300 m.'}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Fechar o mapa" className="pressionavel grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-realce-forte">
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </div>
            <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom attributionControl className="mapa-tema min-h-0 w-full flex-1">
              <FundoMapa />
              <Pinos {...props} aoAbrir={abrirVizinho} grande />
            </MapContainer>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

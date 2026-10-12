// Mapa pequeno com o pino do serviço (Ficha). Carregado sob demanda: o Leaflet só baixa
// quando uma ficha com coordenada é aberta.
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import type { Situacao } from '@/dados/tipos'

const VAR_COR: Record<Situacao, string> = { ok: '--c-ok', andamento: '--c-andamento', atraso: '--c-atraso' }

const cor = (s: Situacao) => getComputedStyle(document.documentElement).getPropertyValue(VAR_COR[s]).trim() || '#533afd'

export default function MiniMapa({ lat, lng, situacao }: { lat: number; lng: number; situacao: Situacao }) {
  return (
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
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {/* halo branco + ponto na cor da situação (a situação também está escrita na ficha) */}
      <CircleMarker center={[lat, lng]} radius={11} pathOptions={{ color: '#fff', weight: 3, fillColor: cor(situacao), fillOpacity: 1 }} />
    </MapContainer>
  )
}

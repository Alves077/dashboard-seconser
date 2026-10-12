// Mapa de fundo: OpenStreetMap padrão (sem chave, sem conta). Padrão "suave": o mesmo mapa com cores
// bem apagadas (filtro CSS em estilos.css), para os pinos de situação não disputarem com as estradas
// coloridas e ícones de comércio — mantendo água e verde reconhecíveis e todos os nomes de rua e bairro.
// "Detalhado" = o OSM com as cores originais. No tema escuro os dois são invertidos.
// (O CARTO Positron/Dark Matter foi testado e descartado: hoje devolve "API KEY REQUIRED" em todo tile.)
// Crédito obrigatório: © OpenStreetMap (licença dos dados); o prefixo "Leaflet" fica
// (decisão do usuário: mostra a biblioteca usada).
import { TileLayer } from 'react-leaflet'

const CREDITO_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export function FundoMapa({ detalhado = false }: { detalhado?: boolean }) {
  return (
    <TileLayer
      // className só vale na criação da camada: a troca recria
      key={detalhado ? 'detalhado' : 'suave'}
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution={CREDITO_OSM}
      maxZoom={19}
      className={detalhado ? 'fundo-osm' : 'fundo-osm fundo-suave'}
    />
  )
}

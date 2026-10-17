import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { escreverFiltros, FILTROS_PADRAO, lerFiltros, type Filtros } from './filtros'

/** Filtros globais lidos/escritos na URL (#/rota?periodo=…&regiao=…) */
export function useFiltros() {
  const [params, setParams] = useSearchParams()
  // o objeto só muda quando muda um FILTRO: abrir/fechar a Ficha (?servico=) também mexe na URL, e antes
  // isso recalculava a página inteira (300–400 ms com 4–5× o volume de hoje)
  const chave = escreverFiltros(lerFiltros(params), new URLSearchParams()).toString()
  const filtros = useMemo(() => lerFiltros(new URLSearchParams(chave)), [chave])

  const mudar = useCallback(
    (parcial: Partial<Filtros>) => {
      setParams(
        (atual) => {
          const f = { ...lerFiltros(atual), ...parcial }
          // bairro só faz sentido dentro da região escolhida
          if (parcial.regiao !== undefined && parcial.bairro === undefined) f.bairro = null
          // e o "quem" (a regional, o vereador…) só dentro da origem escolhida
          if (parcial.origem !== undefined && parcial.quem === undefined) f.quem = null
          return escreverFiltros(f, atual)
        },
        // troca suave (crossfade curto) em vez de os números pularem; ver estilos.css
        { viewTransition: true },
      )
    },
    [setParams],
  )

  const limpar = useCallback(
    () => setParams((atual) => escreverFiltros(FILTROS_PADRAO, atual), { viewTransition: true }),
    [setParams],
  )

  return { filtros, mudar, limpar }
}

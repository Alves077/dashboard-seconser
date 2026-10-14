// Vereadores — "O que os vereadores pediram?". Pública, com limites (calculos/vereadores.ts): o que cada
// um pediu e em que pé está; sem prazo/tempo médio por vereador e sem comparação entre eles.
// O perfil é o filtro global origem=Vereador + quem=<nome>: o link pode ser mandado, e "Ver no mapa",
// Prazo, Evolução e Relatórios já abrem só com os pedidos dele.
import { useMemo } from 'react'
import { EstadoErro, Esqueleto } from '@/componentes/estados/Estados'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'
import { calcularPerfil, calcularVereadores, ORIGEM_VEREADOR } from '@/calculos/vereadores'
import { useBase } from '@/dados/consultas'
import { useFiltros } from '@/filtros/useFiltros'
import { direcaoDaTroca, useHoje } from '@/lib/ganchos'
import { Lista } from './vereadores/Lista'
import { Perfil } from './vereadores/Perfil'

function Carregando() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Esqueleto className="h-5 w-2/3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="flex flex-col items-center px-3 pt-4 pb-3">
            <Esqueleto className="size-16 rounded-full" />
            <Esqueleto className="mt-3 h-3 w-24" />
            <Esqueleto className="mt-3 h-7 w-12" />
            <Esqueleto className="mt-3 h-3 w-28" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Esqueleto className="h-4 w-48" />
        <Esqueleto className="mt-5 h-40 w-full" />
      </Card>
    </div>
  )
}

export function Vereadores() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { filtros, mudar } = useFiltros()
  const hoje = useHoje()
  // origem de outro tipo escolhida (ex.: Regional): aqui não vale — a página é só de vereadores
  const outraOrigem = filtros.origem !== null && filtros.origem !== ORIGEM_VEREADOR
  const quem = filtros.origem === ORIGEM_VEREADOR ? filtros.quem : null
  const lista = useMemo(() => (base && !quem ? calcularVereadores(base, filtros, hoje) : null), [base, filtros, hoje, quem])
  const perfil = useMemo(() => (base && quem ? calcularPerfil(base, filtros, quem, hoje) : null), [base, filtros, hoje, quem])
  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria].filter(Boolean).join(' · ')

  const abrir = (nome: string) => {
    direcaoDaTroca('entra')
    mudar({ origem: ORIGEM_VEREADOR, quem: nome })
  }
  const voltar = () => {
    direcaoDaTroca('volta')
    mudar({ origem: null })
  }

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Vereadores</h1>
          {escopo && <span className="text-sm text-ink-2">{escopo}</span>}
        </div>
      </header>

      {outraOrigem && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="text-[13px] text-ink-2">
            Esta página mostra só pedidos de vereador; o filtro “Quem pediu: {filtros.origem}” não vale aqui.
          </p>
          <Botao variante="secundario" tamanho="compacto" onClick={() => mudar({ origem: null })}>
            Tirar esse filtro
          </Botao>
        </Card>
      )}

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-72" />
        </Card>
      ) : isLoading || (!lista && !perfil) ? (
        <Carregando />
      ) : perfil && quem ? (
        <Perfil p={perfil} quem={quem} aoVoltar={voltar} />
      ) : lista ? (
        <Lista d={lista} periodo={filtros.periodo} aoAbrir={abrir} />
      ) : null}
    </>
  )
}

// Foto do vereador, redonda. As fotos vêm do site da Câmara Municipal de Niterói, baixadas uma vez e
// recortadas à mão no rosto, na mesma escala (public/img/vereadores/<id>.webp, 256×256; parâmetros do
// recorte em docs/fotos-vereadores.json; refazer: scripts/recortar-fotos-vereadores.mjs) — o site não
// depende do link da Câmara. 10 das 22 originais têm só 130×140: nítidas até ~64 px, suaves acima disso.
// Sem foto (não está no site da Câmara) ou arquivo ainda não feito (vereador novo): iniciais.
// A foto é decorativa: o nome sempre aparece ao lado (alt vazio).
import { clsx } from 'clsx'
import { Landmark } from 'lucide-react'
import { useState } from 'react'
import type { Vereador } from '@/dados/tipos'

function iniciais(nome: string) {
  const partes = nome.split(/[\s/]+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2)
  return partes[0][0] + partes[partes.length - 1][0]
}

/**
 * `vereador` null = pedido sem vereador identificado (ícone da Câmara no lugar da foto).
 * Enquanto a foto chega fica um círculo neutro e ela aparece com um esmaecer curto (antes "pulava" na
 * tela). `prioridade` = carregar já, sem esperar a rolagem (cartões no topo da página).
 */
export function FotoVereador({
  vereador,
  className = 'size-8',
  prioridade = false,
}: {
  vereador: Vereador | null
  className?: string
  prioridade?: boolean
}) {
  const [falhou, setFalhou] = useState(false)
  const [carregou, setCarregou] = useState(false)
  const base = clsx('inline-grid shrink-0 place-items-center overflow-hidden rounded-full', className)
  if (!vereador)
    return (
      <span aria-hidden className={clsx(base, 'bg-ink/5 text-ink-3')}>
        <Landmark className="size-[45%]" />
      </span>
    )
  if (!vereador.fotoUrl || falhou)
    return (
      <span aria-hidden className={clsx(base, 'bg-acao-suave text-[11px] font-medium text-acao-press uppercase')}>
        {iniciais(vereador.nome)}
      </span>
    )
  return (
    <span aria-hidden className={clsx(base, 'bg-line')}>
      <img
        // já no cache: o onLoad pode ter passado antes do React ligar o evento
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) setCarregou(true)
        }}
        src={`${import.meta.env.BASE_URL}img/vereadores/${vereador.id}.webp`}
        alt=""
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setCarregou(true)}
        onError={() => setFalhou(true)}
        className={clsx(
          'size-full object-cover transition-opacity duration-200 ease-out motion-reduce:transition-none',
          carregou ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}

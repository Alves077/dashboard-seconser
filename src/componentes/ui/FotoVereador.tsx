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

/** `vereador` null = pedido sem vereador identificado (ícone da Câmara no lugar da foto) */
export function FotoVereador({ vereador, className = 'size-8' }: { vereador: Vereador | null; className?: string }) {
  const [falhou, setFalhou] = useState(false)
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
    <img
      src={`${import.meta.env.BASE_URL}img/vereadores/${vereador.id}.webp`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFalhou(true)}
      className={clsx(base, 'bg-line object-cover')}
    />
  )
}

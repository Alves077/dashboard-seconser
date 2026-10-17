// Projeto Supabase dip-iluminacao. A chave publishable é pública por definição (vai no site);
// quem protege os dados são as permissões e o RLS do banco (DESENHO_NUVEM.md, seção 3).
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://wxixmcmzpifcmjnujuyx.supabase.co'
export const SUPABASE_CHAVE_PUBLICA: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_x36UY7Bd_NjZd4L58AArPQ_-W27fYPQ'

/**
 * Cenário de teste (dados inventados: pior caso, vazio…), escolhido por `?dados=` no endereço.
 * SÓ no `npm run dev` — no site publicado é sempre null e o código dos cenários nem entra (src/dev/).
 */
export const CENARIO: string | null = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('dados')
  : null

/** De onde vêm os dados. Produção é sempre Supabase; o CSV local (e os cenários) só existem no `npm run dev`. */
export const FONTE: 'csv' | 'supabase' =
  !CENARIO && (import.meta.env.PROD || import.meta.env.VITE_FONTE === 'supabase') ? 'supabase' : 'csv'

/** Prazo de atendimento: 5 dias corridos a partir da saída (decisão de 12/10/2026) */
export const PRAZO_DIAS = 5

/** A partir de quantos dias sem carga nova o site avisa que os dados estão desatualizados */
export const DIAS_PARA_DESATUALIZADO = 2

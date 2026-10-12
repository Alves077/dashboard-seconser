// Projeto Supabase dip-iluminacao. A chave publishable é pública por definição (vai no site);
// quem protege os dados são as permissões e o RLS do banco (DESENHO_NUVEM.md, seção 3).
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://wxixmcmzpifcmjnujuyx.supabase.co'
export const SUPABASE_CHAVE_PUBLICA: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_x36UY7Bd_NjZd4L58AArPQ_-W27fYPQ'

/** De onde vêm os dados. Produção é sempre Supabase; o CSV local só existe no `npm run dev`. */
export const FONTE: 'csv' | 'supabase' =
  import.meta.env.PROD || import.meta.env.VITE_FONTE === 'supabase' ? 'supabase' : 'csv'

/** Prazo de atendimento: 5 dias corridos a partir da saída (decisão de 12/10/2026) */
export const PRAZO_DIAS = 5

/** A partir de quantos dias sem carga nova o site avisa que os dados estão desatualizados */
export const DIAS_PARA_DESATUALIZADO = 2

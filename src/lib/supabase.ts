import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '@/config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
  // detectSessionInUrl: false — o retorno do link de e-mail é lido à mão (index.html + dados/sessao.tsx): o "#" é das rotas
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

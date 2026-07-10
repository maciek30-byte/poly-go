import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // PKCE: po OAuth w URL pojawia się tylko jednorazowy ?code=...,
    // a nie pełny #access_token. Bezpieczniejsze dla SPA — token nie
    // ląduje w pasku adresu ani w historii przeglądarki.
    flowType: 'pkce',
  },
})
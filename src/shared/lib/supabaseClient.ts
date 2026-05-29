import { createClient, type Session, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env var: VITE_SUPABASE_URL. Add it to .env.local (see .env.example).')
}
if (!supabaseAnonKey) {
  throw new Error(
    'Missing env var: VITE_SUPABASE_ANON_KEY. Add it to .env.local (see .env.example).',
  )
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
export type { Session, User }

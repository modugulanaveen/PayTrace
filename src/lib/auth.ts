import { supabase } from './supabase'

export async function signInWithName(name: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Enter your name.')
  const { data, error: lookupError } = await supabase.rpc('get_login_email', { p_name: cleanName })
  if (lookupError) throw new Error('Login setup is incomplete. Run the Phase 2 SQL in Supabase.')
  if (!data) throw new Error('Name not found.')
  const { error } = await supabase.auth.signInWithPassword({ email: data, password })
  if (error) throw new Error('Incorrect name or password.')
}

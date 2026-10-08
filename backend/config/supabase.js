import { createClient } from '@supabase/supabase-js';

let client;

export function obtenerClienteSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Falta configurar SUPABASE_URL o SUPABASE_SECRET_KEY en el backend.');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return client;
}

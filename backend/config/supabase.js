import { createClient } from '@supabase/supabase-js';

let client;

export function leerConfiguracionSupabase(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Falta configurar SUPABASE_URL o SUPABASE_SECRET_KEY en el backend.');
  }
  let parsed;
  try { parsed = new URL(url); } catch {
    throw new Error('SUPABASE_URL debe ser una URL válida.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('SUPABASE_URL debe utilizar HTTPS fuera del desarrollo local.');
  }
  if (key.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SECRET_KEY requiere una clave privada del backend.');
  }
  return { url, key };
}

export function obtenerClienteSupabase() {
  if (client) return client;
  const { url, key } = leerConfiguracionSupabase();
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return client;
}

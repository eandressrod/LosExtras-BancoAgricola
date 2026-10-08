import { repositorioMock } from './mock.js';
import { crearRepositorioSupabase } from './supabase.js';
import { obtenerClienteSupabase } from '../config/supabase.js';

let repositorioSupabase;

/** @returns {import('./contrato.js').RepositorioCatalogo} */
export function obtenerRepositorio() {
  const source = process.env.DATA_SOURCE || 'mock';
  if (source === 'mock') return repositorioMock;
  if (source !== 'supabase') throw new Error('DATA_SOURCE debe ser mock o supabase.');
  repositorioSupabase ??= crearRepositorioSupabase(obtenerClienteSupabase());
  return repositorioSupabase;
}

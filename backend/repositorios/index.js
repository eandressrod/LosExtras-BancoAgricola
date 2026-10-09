import { repositorioMock } from './mock.js';
import { crearRepositorioSupabase } from './supabase.js';
import * as accesosMock from './accesos.mock.js';
import { crearRepositorioAccesosSupabase } from './accesos.supabase.js';
import { obtenerClienteSupabase } from '../config/supabase.js';

let repositorioSupabase;
let accesosSupabase;

// Una fuente inválida es un error de configuración: nunca se sustituye por mock.
function fuenteDeDatos() {
  const source = process.env.DATA_SOURCE || 'mock';
  if (source !== 'mock' && source !== 'supabase') throw new Error('DATA_SOURCE debe ser mock o supabase.');
  return source;
}

/** @returns {import('./contrato.js').RepositorioCatalogo} */
export function obtenerRepositorio() {
  if (fuenteDeDatos() === 'mock') return repositorioMock;
  repositorioSupabase ??= crearRepositorioSupabase(obtenerClienteSupabase());
  return repositorioSupabase;
}

/** @returns {import('./contrato.js').RepositorioAccesos} */
export function obtenerRepositorioAccesos() {
  if (fuenteDeDatos() === 'mock') return accesosMock;
  accesosSupabase ??= crearRepositorioAccesosSupabase(obtenerClienteSupabase());
  return accesosSupabase;
}

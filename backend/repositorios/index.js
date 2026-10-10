import { repositorioMock } from './mock.js';
import { crearRepositorioSupabase } from './supabase.js';
import * as accesosMock from './accesos.mock.js';
import { crearRepositorioAccesosSupabase } from './accesos.supabase.js';
import { crearRepositorioCuentasMock } from './cuentas.mock.js';
import { crearRepositorioCuentasSupabase } from './cuentas.supabase.js';
import { crearRepositorioEstadoEncuestaMock } from './estado-encuesta.mock.js';
import { crearRepositorioEstadoEncuestaSupabase } from './estado-encuesta.supabase.js';
import { crearRepositorioPreferenciasUsuario } from './preferencias.usuario.js';
import { obtenerClienteSupabase } from '../config/supabase.js';


let repositorioSupabase;
let accesosSupabase;
let cuentasSupabase;
let estadoEncuestaSupabase;
let preferenciasSupabase;

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

export function obtenerRepositorioCuentas() {
  if (fuenteDeDatos() === 'mock') return crearRepositorioCuentasMock();
  cuentasSupabase ??= crearRepositorioCuentasSupabase(obtenerClienteSupabase());
  return cuentasSupabase;
}

export function obtenerRepositorioEstadoEncuesta() {
  if (fuenteDeDatos() === 'mock') return crearRepositorioEstadoEncuestaMock();
  estadoEncuestaSupabase ??= crearRepositorioEstadoEncuestaSupabase(obtenerClienteSupabase());
  return estadoEncuestaSupabase;
}

let preferenciasUsuarioSupabase;

/** Repositorio para guardar categorías de interés (H3). Las pruebas unitarias inyectan un mock directamente. */
export function obtenerRepositorioPreferencias() {
  if (fuenteDeDatos() === 'mock') {
  return null; // O el mock si lo tuvieran
  }
  preferenciasSupabase ??= crearRepositorioPreferenciasUsuario(obtenerClienteSupabase());
  return preferenciasSupabase;
}

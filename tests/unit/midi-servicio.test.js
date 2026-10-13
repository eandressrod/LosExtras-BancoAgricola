import test from 'node:test';
import assert from 'node:assert/strict';
import { crearServicioMidi } from '../../hola/servicio.js';
import { generarPerfil, crearBorrador } from '../../hola/modelo.js';

const lote = () => { const b = crearBorrador(); b.agregar(generarPerfil(() => 0)); return b.cambios(); };
test('100 lecturas concurrentes y cambios de vista usan una sola consulta durante 30 segundos', async () => {
  let llamadas = 0, ahora = 0;
  const s = crearServicioMidi({ rpc: async () => { llamadas++; return { data: { perfiles: [] }, error: null }; } }, { reloj: () => ahora });
  await Promise.all(Array.from({ length: 100 }, () => s.leer()));
  await s.leer(); assert.equal(llamadas, 1);
  ahora = 30001; await s.leer(); assert.equal(llamadas, 2);
});
test('mismo identificador no duplica el guardado y la respuesta actualiza la caché', async () => {
  let llamadas = 0;
  const s = crearServicioMidi({ rpc: async (nombre, parametros) => { llamadas++; assert.equal(nombre, 'midi_guardar_cambios'); assert.ok(parametros.cambios.find(c => c.tabla === 'perfiles').datos.contrasena_hash.startsWith('scrypt$')); return { data: { perfiles: [] }, error: null }; } });
  const cambios = lote();
  await Promise.all([s.guardar('peticion-1', cambios), s.guardar('peticion-1', cambios)]);
  await s.leer(); assert.equal(llamadas, 1);
  await assert.rejects(s.guardar('peticion-1', lote()), e => e.estado === 409);
});
test('limita guardados repetidos y los lotes inválidos no consultan Supabase', async () => {
  let llamadas = 0, ahora = 0;
  const s = crearServicioMidi({ rpc: async () => { llamadas++; return { data: {}, error: null }; } }, { reloj: () => ahora });
  await assert.rejects(s.guardar('invalido', [{ tabla: 'privada' }]), e => e.estado === 400);
  assert.equal(llamadas, 0);
  await s.guardar('uno', lote());
  await assert.rejects(s.guardar('dos', lote()), e => e.estado === 429);
  ahora = 2001; await s.guardar('tres', lote()); assert.equal(llamadas, 2);
});
test('un fallo de lectura tiene enfriamiento y nunca se reemplaza por datos ficticios', async () => {
  let llamadas = 0;
  const s = crearServicioMidi({ rpc: async () => { llamadas++; return { data: null, error: { code: '42501' } }; } });
  await assert.rejects(s.leer(), e => e.estado === 503);
  await assert.rejects(s.leer(), e => e.estado === 503);
  assert.equal(llamadas, 1);
});

test('una lectura anterior al guardado no reemplaza la caché con datos viejos', async () => {
  let completar;
  const s = crearServicioMidi({ rpc: nombre => nombre === 'midi_leer_datos' ? new Promise(r => { completar = r; }) : Promise.resolve({ data: { perfiles: [{ id: 'nuevo' }] }, error: null }) });
  const lectura = s.leer();
  await s.guardar('concurrente', lote());
  completar({ data: { perfiles: [] }, error: null });
  await lectura;
  assert.equal((await s.leer()).datos.perfiles[0].id, 'nuevo');
});

test('no envía lotes vacíos y limita realmente a diez guardados por minuto', async () => {
  let llamadas = 0, ahora = 0;
  const s = crearServicioMidi({ rpc: async () => { llamadas++; return { data: {}, error: null }; } }, { reloj: () => ahora });
  await assert.rejects(s.guardar('vacio',[]), e => e.estado === 400);
  assert.equal(llamadas,0);
  for (let i=0;i<10;i++) { ahora=i*2100; await s.guardar(`lote-${i}`,lote()); }
  ahora=23000; await assert.rejects(s.guardar('limite',lote()),e => e.estado===429);
  assert.equal(llamadas,10);
});

test('una respuesta de guardado no confirmada invalida la caché para comprobar el resultado real', async () => {
  let lecturas = 0;
  const s = crearServicioMidi({ rpc: async nombre => nombre === 'midi_leer_datos' ? { data: { revision: ++lecturas }, error: null } : { data: null, error: { code: '' } } });
  await s.leer();
  await assert.rejects(s.guardar('sin-respuesta',lote()),e=>e.estado===503);
  assert.equal((await s.leer()).datos.revision,2);
});

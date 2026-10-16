import test from 'node:test';
import assert from 'node:assert/strict';
import { generarPerfil, crearBorrador, validarCambios } from '../../hola/modelo.js';
import { filaNueva, tablas } from '../../hola/schema.js';

test('los nuevos perfiles de Midi generan solo cuentas bancarias con número completo',()=>{
  const datos=generarPerfil(()=>0.99);
  assert.ok(datos.cuentas.length>0);
  assert.ok(datos.cuentas.every(c=>!/tarjeta/i.test(c.tipo)&&/^[1-9]\d{9}$/.test(c.numero_completo)));
});

test('generar varios perfiles sin instantánea externa tampoco repite números de cuenta',()=>{
  const a=generarPerfil(()=>0.99),b=generarPerfil(()=>0.99);
  const numeros=[...a.cuentas,...b.cuentas].map(c=>c.numero_completo);
  assert.equal(new Set(numeros).size,numeros.length);
});

test('perfiles rápidos usan identificadores cortos y evitan datos existentes y borradores', () => {
  const existentes = { perfiles: [{ id: 'usuario-001', usuario_acceso: 'usuario-002' }], cuentas: [{ id: 'cuenta-001' }] };
  const a = generarPerfil(() => 0.99, existentes);
  assert.match(a.perfiles[0].id, /^usuario-\d{3,}$/);
  assert.equal(a.perfiles[0].usuario_acceso, a.perfiles[0].id);
  assert.ok(!['usuario-001', 'usuario-002'].includes(a.perfiles[0].id));
  const b = generarPerfil(() => 0.99, { perfiles: [...existentes.perfiles, ...a.perfiles], cuentas: [...existentes.cuentas, ...a.cuentas] });
  assert.notEqual(a.perfiles[0].id, b.perfiles[0].id);
  assert.ok(a.cuentas.every(c => /^cuenta-\d{3,}$/.test(c.id) && c.id !== 'cuenta-001'));
});

test('categorías y asociaciones de varios comercios se guardan como registros independientes', () => {
  assert.equal(tablas.categorias.titulo, 'Categorías');
  const b = crearBorrador();
  b.agregar({ categorias: [{ ...filaNueva('categorias'), id: 'Salud', nombre: 'Salud' }], categoria_comercios: [
    { categoria_id: 'Salud', comercio_id: 'a' }, { categoria_id: 'Salud', comercio_id: 'b' }
  ] });
  assert.doesNotThrow(() => validarCambios(b.cambios()));
  assert.equal(b.cambios().filter(c => c.tabla === 'categoria_comercios').length, 2);
  assert.doesNotThrow(() => validarCambios([{ tabla: 'preferencias_usuario', operacion: 'crear', clave: { usuario_id: 'A' }, datos: { usuario_id: 'A', categorias: ['Salud'], encuesta_completada: true } }]));
});

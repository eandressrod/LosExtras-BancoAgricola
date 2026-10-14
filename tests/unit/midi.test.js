import test from 'node:test';
import assert from 'node:assert/strict';
import { generarPerfil, crearBorrador, validarCambios } from '../../hola/modelo.js';

test('Midi genera un perfil con acceso, tarjeta válida y contraseña editable 123', () => {
  const filas = generarPerfil(() => 0);
  const perfil = filas.perfiles[0];
  assert.match(perfil.id, /^usuario-\d{3,}$/);
  assert.equal(perfil.usuario_acceso, perfil.id);
  assert.equal(perfil.contrasena, '123');
  assert.equal(perfil.tipo_tarjeta, 'basica');
  assert.equal(filas.cuentas.length, 0);
  assert.equal(filas.preferencias_usuario[0].encuesta_completada, false);
  assert.deepEqual(filas.preferencias_usuario[0].categorias, []);
  assert.notEqual(generarPerfil().perfiles[0].id, perfil.id);
});

test('Midi genera hasta tres cuentas enlazadas, con campos coherentes', () => {
  const filas = generarPerfil(() => 0.99);
  assert.equal(filas.cuentas.length, 3);
  assert.equal(filas.perfiles[0].tipo_tarjeta, 'black');
  assert.ok(filas.cuentas.every(c => c.perfil_id === filas.perfiles[0].id && c.segmento === 'Black' && c.moneda === 'USD'));
  assert.equal(new Set(filas.cuentas.map(c => c.id)).size, 3);
  assert.deepEqual(filas.cuentas.map(c => c.orden), [1, 2, 3]);
});

test('borrador conserva cambios entre tablas, cancela y no modifica la lectura original', () => {
  const original = { perfiles: [{ id: 'A', nombre: 'Ana', tipo_tarjeta: 'basica', usuario_acceso: 'ana', tiene_contrasena: true, _version: '1' }] };
  const borrador = crearBorrador(original);
  borrador.filas.perfiles[0].nombre = 'Otro';
  borrador.agregar(generarPerfil());
  assert.equal(original.perfiles[0].nombre, 'Ana');
  assert.ok(borrador.cambios().some(c => c.tabla === 'perfiles' && c.operacion === 'editar' && c.version === '1'));
  assert.ok(borrador.cambios().some(c => c.tabla === 'perfiles' && c.operacion === 'crear'));
  borrador.cancelar();
  assert.deepEqual(borrador.cambios(), []);
  assert.equal(borrador.filas.perfiles[0].nombre, 'Ana');
});

test('borrado de una fila nueva no envía DELETE y borrar existente conserva versión y dependencias', () => {
  const b = crearBorrador({ perfiles: [{ id: 'A', nombre: 'Ana', _version: '9', _dependencias: 'firma' }] });
  const nuevas = generarPerfil();
  b.agregar(nuevas);
  b.eliminar('perfiles', nuevas.perfiles[0]);
  assert.ok(!b.cambios().some(c => c.clave.id === nuevas.perfiles[0].id));
  b.eliminar('perfiles', b.filas.perfiles[0]);
  assert.deepEqual(b.cambios()[0], { tabla: 'perfiles', operacion: 'eliminar', clave: { id: 'A' }, version: '9', dependencias: 'firma' });
});

test('validación admite categorías vacías con flag falsa, exige categorías con flag verdadera', () => {
  const base = { tabla: 'preferencias_usuario', operacion: 'crear', clave: { usuario_id: 'A' }, datos: { usuario_id: 'A', categorias: [], encuesta_completada: false } };
  assert.doesNotThrow(() => validarCambios([base]));
  assert.throws(() => validarCambios([{ ...base, datos: { ...base.datos, encuesta_completada: true } }]), /categor/i);
});

test('validación rechaza tablas/campos ajenos, referencias de clave editadas y fechas inválidas', () => {
  assert.throws(() => validarCambios([{ tabla: 'sesiones_revocadas', operacion: 'crear', clave: {}, datos: {} }]), /tabla/i);
  assert.throws(() => validarCambios([{ tabla: 'perfiles', operacion: 'crear', clave: { id: 'A' }, datos: { id: 'A', contrasena_hash: 'x' } }]), /campo/i);
  assert.throws(() => validarCambios([{ tabla: 'perfiles', operacion: 'editar', clave: { id: 'A' }, version: '1', datos: { id: 'B' } }]), /identificador/i);
  const fila = { id: 'x', merchant: '', category: 'Compras', benefit: '', description: '', payment: '', restrictions: '', orden: 0, comercio_id: 'c', instrucciones: '', descripcion_detalle: '', vigencia_desde: '2026-11-01', vigencia_hasta: '2026-10-01', dias_uso: null, imagen_url: null, imagen_alt: null };
  assert.throws(() => validarCambios([{ tabla: 'promociones', operacion: 'crear', clave: { id: 'x' }, datos: fila }]), /fecha|vigencia/i);
});

test('validación requiere acceso en perfiles nuevos y limita tamaño del lote', () => {
  assert.throws(() => validarCambios([{ tabla: 'perfiles', operacion: 'crear', clave: { id: 'x' }, datos: { id: 'x', nombre: 'X', tipo_tarjeta: 'basica', usuario_acceso: null, contrasena: '' } }]), /acceso|contrase/i);
  assert.throws(() => validarCambios(Array(201).fill({})), /200/);
});

test('actualizar conserva campos editados y acepta cambios externos en los demás campos', () => {
  const b = crearBorrador({ perfiles: [{ id: 'A', nombre: 'Ana', tipo_tarjeta: 'basica', usuario_acceso: 'ana', _version: '1' }] });
  b.filas.perfiles[0].nombre = 'Mi edición';
  const conflictos = b.actualizar({ perfiles: [{ id: 'A', nombre: 'Externo', tipo_tarjeta: 'black', usuario_acceso: 'ana', _version: '2' }] });
  assert.equal(b.filas.perfiles[0].nombre, 'Mi edición');
  assert.equal(b.filas.perfiles[0].tipo_tarjeta, 'black');
  assert.equal(b.cambios()[0].version, '2');
  assert.equal(conflictos.length, 1);
});

test('actualizar con una alta duplicada o una edición eliminada conserva íntegro el borrador', () => {
  const b = crearBorrador(); const nuevas = generarPerfil(() => 0); b.agregar(nuevas);
  const cambios = b.cambios();
  assert.throws(() => b.actualizar({ perfiles: [{ ...nuevas.perfiles[0], _version: '1' }] }), /existente/i);
  assert.deepEqual(b.cambios(), cambios);
});

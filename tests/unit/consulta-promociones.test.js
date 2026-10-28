// H22: /api/promociones y /api/para-ti leen y validan la misma consulta (H5, H10, H16 y H17).
import test from 'node:test';
import assert from 'node:assert/strict';
import { leerConsultaPromociones } from '../../backend/servicios/consulta-promociones.js';

const CATEGORIAS = [{ id: 'Compras' }, { id: 'Restaurantes' }];
const PROPIAS = [
  { id: 'cta-a-3', cuentaId: 'c1', tipoTarjeta: 'basica', nombre: 'Básica' },
  { id: 'cta-a-4', cuentaId: 'c2', tipoTarjeta: 'black', nombre: 'Black' }
];
const PERFIL = { id: 'A', tipoTarjeta: 'basica' };
const leer = query => leerConsultaPromociones(new URLSearchParams(query), CATEGORIAS, PROPIAS, PERFIL);

test('H22 una consulta válida entrega los filtros explícitos y la tarjeta propia elegida', () => {
  const { ok, filtros, tarjeta } = leer('categoria=Compras&hoy=1&comercio=%20Siman%20&tarjeta=cta-a-4');
  assert.deepEqual({ ok, filtros, tarjeta },
    { ok: true, filtros: { categoria: 'Compras', hoy: true, comercio: 'Siman' },
      tarjeta: { id: 'cta-a-4', cuentaId: 'c2', tipoTarjeta: 'black', nombre: 'Black', numeroEnmascarado: undefined } });
  const predeterminada = leer('');
  assert.deepEqual(predeterminada.filtros, { categoria: null, hoy: false, comercio: null });
  assert.equal(predeterminada.tarjeta.id, 'cta-a-3');
});

test('H22 cada parámetro inválido tiene su respuesta', () => {
  assert.deepEqual(leer('categoria=Mascotas'), { ok: false, estado: 400, cuerpo: { error: 'Categoría no válida.' } });
  assert.deepEqual(leer('hoy=si'), { ok: false, estado: 400, cuerpo: { error: 'Filtro de disponibilidad no válido.' } });
  assert.deepEqual(leer('comercio=a&comercio=b'), { ok: false, estado: 400, cuerpo: { error: 'Búsqueda por comercio no válida.' } });
  assert.deepEqual(leer('tarjeta=ajena'), { ok: false, estado: 404, cuerpo: { error: 'Tarjeta no encontrada.' } });
  assert.deepEqual(leer('tarjeta='), { ok: false, estado: 400, cuerpo: { error: 'Tarjeta no válida.' } });
});

test('SCRUM-133 la consulta indica si pide todas las tarjetas y entrega las propias', () => {
  const sinParametro = leer('');
  assert.equal(sinParametro.todas, true);
  assert.deepEqual(sinParametro.tarjetas.map(t => t.id), ['cta-a-3', 'cta-a-4']);
  assert.equal(leer('tarjeta=cta-a-4').todas, false);
});

test('H22 sin tarjetas propias la consulta es válida y no tiene tarjeta', () => {
  const sinTarjetas = leerConsultaPromociones(new URLSearchParams(''), CATEGORIAS, [], PERFIL);
  assert.equal(sinTarjetas.ok, true);
  assert.equal(sinTarjetas.tarjeta, null);
});

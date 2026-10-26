import test from 'node:test';
import assert from 'node:assert/strict';
import login from '../../api/auth/login.js';
import guardadas from '../../api/recursos.js';
import { reiniciarGuardadasMock } from '../../backend/repositorios/guardadas.js';
import preferencias from '../../api/preferencias.js';

process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.DATA_SOURCE = 'mock';

const url = ruta => `http://localhost${ruta}`;

async function cookieDe(usuario, contrasena) {
  const res = await login.fetch(new Request(url('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena })
  }));
  assert.equal(res.status, 200);
  return res.headers.getSetCookie()[0].split(';')[0];
}

function pedir(ruta, metodo, cookie, cuerpo) {
  return guardadas.fetch(new Request(url(ruta), {
    method: metodo,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  }));
}

test('GET y POST sin sesión responden 401', async () => {
  reiniciarGuardadasMock();
  assert.equal((await pedir('/api/guardadas', 'GET')).status, 401);
  assert.equal((await pedir('/api/guardadas', 'POST', null, { promocionId: 'restaurante' })).status, 401);
});

test('PUT no está permitido', async () => {
  const res = await guardadas.fetch(new Request(url('/api/guardadas'), { method: 'PUT' }));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET, POST, DELETE');
});

test('JSON malformado o sin identificador responde 400 y no guarda', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('demo.basica', 'Basica2026');
  const roto = await guardadas.fetch(new Request(url('/api/guardadas'), {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: '{no-json'
  }));
  assert.equal(roto.status, 400);
  const vacio = await pedir('/api/guardadas', 'POST', cookie, {});
  assert.equal(vacio.status, 400);
  const lista = await (await pedir('/api/guardadas', 'GET', cookie)).json();
  assert.deepEqual(lista.ids, []);
});

test('guardar dos veces no duplica y el otro perfil no ve la selección', async () => {
  reiniciarGuardadasMock();
  const basica = await cookieDe('demo.basica', 'Basica2026');
  const primera = await pedir('/api/guardadas', 'POST', basica, { promocionId: 'restaurante', usuarioId: 'B' });
  const segunda = await pedir('/api/guardadas', 'POST', basica, { promocionId: 'restaurante' });
  assert.equal(primera.status, 200);
  assert.equal(segunda.status, 200);
  const propias = await (await pedir('/api/guardadas', 'GET', basica)).json();
  assert.deepEqual(propias.ids, ['restaurante']);
  assert.equal(propias.promociones.some(promo => promo.id === 'restaurante'), true);

  const black = await cookieDe('demo.black', 'Black2026');
  const ajenas = await (await pedir('/api/guardadas', 'GET', black)).json();
  assert.deepEqual(ajenas.ids, []);
});

test('un id inexistente no rompe la lista', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('demo.basica', 'Basica2026');
  const alta = await pedir('/api/guardadas', 'POST', cookie, { promocionId: 'no-existe' });
  assert.equal(alta.status, 400);
  const lista = await pedir('/api/guardadas', 'GET', cookie);
  assert.equal(lista.status, 200);
  assert.deepEqual((await lista.json()).ids, []);
});

test('quitar actualiza la lista y repetir el borrado no falla', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('demo.basica', 'Basica2026');
  assert.equal((await pedir('/api/guardadas', 'POST', cookie, { promocionId: 'restaurante' })).status, 200);
  assert.equal((await pedir('/api/guardadas', 'DELETE', cookie, { promocionId: 'restaurante' })).status, 200);
  assert.equal((await pedir('/api/guardadas', 'DELETE', cookie, { promocionId: 'restaurante' })).status, 200);
  const lista = await (await pedir('/api/guardadas', 'GET', cookie)).json();
  assert.deepEqual(lista.ids, []);
  assert.equal(lista.sinCoincidencias, false);
});

test('A con su Black ve la exclusiva y el beneficio de esa tarjeta; con la Básica no', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('demo.basica', 'Basica2026');
  assert.equal((await pedir('/api/guardadas', 'POST', cookie, { promocionId: 'siman-black' })).status, 200);
  assert.equal((await pedir('/api/guardadas', 'POST', cookie, { promocionId: 'tienda' })).status, 200);

  const black = await (await pedir('/api/guardadas?tarjeta=cta-a-4', 'GET', cookie)).json();
  assert.deepEqual(black.ids, ['siman-black', 'tienda']);
  assert.equal(black.promociones.find(promo => promo.id === 'siman-black').benefit, '30 % de descuento');
  assert.equal(black.promociones.find(promo => promo.id === 'tienda').benefit, '25 % de descuento');

  const basica = await (await pedir('/api/guardadas?tarjeta=cta-a-3', 'GET', cookie)).json();
  assert.equal(basica.promociones.find(promo => promo.id === 'siman-black'), undefined);
  assert.equal(basica.promociones.find(promo => promo.id === 'tienda').benefit, '15 % de descuento');
  assert.equal(basica.sinCoincidencias, false);
});

test('una tarjeta ajena, vacía o repetida no se puede usar en Guardadas', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('demo.basica', 'Basica2026');
  assert.equal((await pedir('/api/guardadas?tarjeta=cta-b-2', 'GET', cookie)).status, 404);
  assert.equal((await pedir('/api/guardadas?tarjeta=', 'GET', cookie)).status, 400);
  assert.equal((await pedir('/api/guardadas?tarjeta=cta-a-3&tarjeta=cta-a-4', 'GET', cookie)).status, 400);
});

test('una exclusiva de otra tarjeta queda guardada pero no se muestra como utilizable', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('demo.basica', 'Basica2026');
  assert.equal((await pedir('/api/guardadas', 'POST', cookie, { promocionId: 'siman-black' })).status, 200);
  const lista = await (await pedir('/api/guardadas', 'GET', cookie)).json();
  assert.deepEqual(lista.ids, ['siman-black']);
  assert.deepEqual(lista.promociones, []);
  assert.equal(lista.sinCoincidencias, true);
});

test('QA-AUD-03 al cambiar intereses en Mis preferencias, GET /api/guardadas informa que la causa es intereses y no la tarjeta', async () => {
  reiniciarGuardadasMock();
  const cookie = await cookieDe('h19.usuario.003', 'H19Prueba2026');
  try {
    assert.equal((await pedir('/api/guardadas', 'POST', cookie, { promocionId: 'tienda' })).status, 200);
    const antes = await (await pedir('/api/guardadas', 'GET', cookie)).json();
    assert.deepEqual(antes.promociones.map(p => p.id), ['tienda']);
    assert.equal(antes.sinCoincidencias, false);
    assert.equal(antes.motivoSinCoincidencias, null);

    const cambio = await preferencias.fetch(new Request(url('/api/preferencias'), {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorias: ['Restaurantes'] })
    }));
    assert.equal(cambio.status, 200);

    const despues = await (await pedir('/api/guardadas', 'GET', cookie)).json();
    assert.deepEqual(despues.ids, ['tienda']);
    assert.deepEqual(despues.promociones, []);
    assert.equal(despues.sinCoincidencias, true);
    assert.equal(despues.motivoSinCoincidencias, 'intereses');
  } finally {
    await preferencias.fetch(new Request(url('/api/preferencias'), {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorias: ['Compras'] })
    }));
  }
});
import test from 'node:test';
import assert from 'node:assert/strict';
import promociones from '../../api/promociones.js';
import login from '../../api/auth/login.js';
import preferencias from '../../api/preferencias.js';

process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.DATA_SOURCE = 'mock'; 

const url = (ruta) => `http://localhost${ruta}`;

async function obtenerCookieValida(usuario, contrasena) {
  const res = await login.fetch(new Request(url('/api/auth/login'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena })
  }));
  return res.headers.getSetCookie()[0].split(';')[0];
}

test('H4: GET /api/promociones rechaza acceso sin sesión con 401', async () => {
  const res = await promociones.fetch(new Request(url('/api/promociones')));
  assert.equal(res.status, 401);
});

test('H4: GET /api/promociones filtra por tarjeta y preferencias del usuario', async () => {
  const cookie = await obtenerCookieValida('demo.basica', 'Basica2026'); // Tarjeta básica
  
  // 1. Le guardamos una preferencia específica ('Restaurantes')
  await preferencias.fetch(new Request(url('/api/preferencias'), {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Restaurantes'] })
  }));

  // 2. Consultamos sus promociones
  const resPromos = await promociones.fetch(new Request(url('/api/promociones'), {
    headers: { cookie }
  }));
  
  assert.equal(resPromos.status, 200);
  const lista = await resPromos.json();
  
  // Validaciones
  assert.ok(Array.isArray(lista), 'Debe devolver un arreglo');
  assert.ok(lista.length > 0, 'Debe encontrar al menos una promoción en mock');
  assert.ok(lista.every(p => p.category === 'Restaurantes'), 'Solo debe traer promociones de la categoría elegida');
  assert.ok(lista.every(p => p.benefit), 'Debe incluir el beneficio específico de su tarjeta');
});
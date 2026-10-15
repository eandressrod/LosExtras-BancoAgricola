import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import menu from '../../api/menu.js';
import metas from '../../api/metas.js';
import mensajes from '../../api/mensajes.js';
import login from '../../api/auth/login.js';

process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');

test('H19 remoto: tres perfiles multitarjeta, datos propios, metas persistidas e intentos ajenos', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const cookies = [];
  for (let i = 1; i <= 3; i++) {
    const res = await login.fetch(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ usuario:`h19.usuario.00${i}`, contrasena:'H19Prueba2026' }) }));
    assert.equal(res.status, 200);
    const cookie = res.headers.getSetCookie()[0].split(';')[0]; cookies.push(cookie);
    const req = new Request('http://localhost/api/menu', { headers:{cookie} });
    const respuesta = await menu.fetch(req); assert.equal(respuesta.status,200);
    const data = await respuesta.json();
    assert.equal(data.perfil.id,`h19-usuario-00${i}`); assert.equal(data.tarjetas.length,i+1);
    assert.ok(data.cuentas.every(c => c.numeroCompleto && c.numeroEnmascarado.endsWith(c.numeroCompleto.slice(-4))));
    assert.ok(data.tarjetas.every(t => t.producto.red && t.producto.nombre));
    const inbox = await mensajes.fetch(new Request('http://localhost/api/mensajes',{headers:{cookie}}));
    assert.equal(inbox.status,200); assert.ok((await inbox.json()).every(m => m.id.startsWith(`h19-mensaje-${i+3}-`)));
  }
  const req = (cookie, method, cuerpo) => new Request('http://localhost/api/metas',{method,headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify(cuerpo)});
  let creada;
  try {
    const res = await metas.fetch(req(cookies[0],'POST',{nombre:'QA H19 ' + randomUUID().slice(0,8),objetivo:100,ahorrado:25}));
    assert.equal(res.status,201); creada = await res.json();
    assert.equal((await metas.fetch(req(cookies[1],'PATCH',{...creada,ahorrado:50}))).status,404);
    assert.equal((await metas.fetch(req(cookies[1],'DELETE',{id:creada.id}))).status,404);
    const actual = await metas.fetch(req(cookies[0],'PATCH',{...creada,ahorrado:50})); assert.equal(actual.status,200);
    const consultadas = await metas.fetch(new Request('http://localhost/api/metas',{headers:{cookie:cookies[0]}}));
    assert.equal((await consultadas.json()).find(m => m.id === creada.id).ahorrado,50);
  } finally {
    if (creada?.id) assert.equal((await metas.fetch(req(cookies[0],'DELETE',{id:creada.id}))).status,204);
  }
});

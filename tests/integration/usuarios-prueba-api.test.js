import test from 'node:test';
import assert from 'node:assert/strict';
import { crearToken, NOMBRE_COOKIE } from '../../backend/servicios/sesion.js';
import { estadoActividad } from '../../backend/repositorios/accesos.mock.js';
process.env.SESSION_SECRET='usuarios-prueba-'.repeat(3);

test('la consulta de testing incluye todos los perfiles, claves de prueba y flag sin hashes; la consulta anterior mantiene su contrato', async () => {
  const { crearHandlerPerfiles }=await import('../../api/perfiles.js');
  const perfiles=[{id:'A',nombre:'A',usuarioAcceso:'a',clavePrueba:'123',promocionesAbiertas:true,contrasenaHash:'privado'}, {id:'midi-nuevo',nombre:'Midi',usuarioAcceso:'nuevo',clavePrueba:'otra',promocionesAbiertas:false}];
  const api=crearHandlerPerfiles({publicos:async()=>[{id:'A',nombre:'A'}],pruebas:()=>({listar:async()=>perfiles})});
  const simple=await (await api.fetch(new Request('http://local/api/perfiles'))).json();
  assert.deepEqual(simple,[{id:'A',nombre:'A'}]);
  const res=await api.fetch(new Request('http://local/api/perfiles?testing=1'));
  const datos=await res.json(); assert.equal(datos.length,2); assert.equal(datos[1].clavePrueba,'otra');
  assert.equal(datos[1].promocionesAbiertas,false); assert.ok(!JSON.stringify(datos).includes('privado'));
  assert.match(res.headers.get('cache-control'),/no-store/);
  assert.equal((await api.fetch(new Request('http://local/api/perfiles',{method:'POST'}))).status,405);
});

test('el endpoint de apertura exige sesión, ignora el propietario del cuerpo y no cambia encuesta ni otro usuario', async () => {
  const { crearHandlerApertura }=await import('../../api/promociones-apertura.js');
  const { crearRepositorioUsuariosPruebaMock }=await import('../../backend/repositorios/usuarios-prueba.mock.js');
  const filas=[{id:'A',promocionesAbiertas:false,encuestaCompletada:false},{id:'B',promocionesAbiertas:false}];
  const repo=crearRepositorioUsuariosPruebaMock(filas);
  const api=crearHandlerApertura({accesos:()=>({estadoActividad,buscarPerfilPorId:async id=>({id}),sesionRevocada:async()=>false}),usuarios:()=>repo});
  const request=(cookie=true)=>new Request('http://local/api/promociones-apertura',{method:'POST',headers:cookie?{Cookie:NOMBRE_COOKIE+'='+crearToken('A')}: {},body:JSON.stringify({perfilId:'B'})});
  assert.equal((await api.fetch(request(false))).status,401);
  assert.equal((await api.fetch(new Request('http://local/api/promociones-apertura'))).status,405);
  assert.equal((await api.fetch(request())).status,200); assert.equal((await api.fetch(request())).status,200);
  assert.equal(filas[0].promocionesAbiertas,true); assert.equal(filas[0].encuestaCompletada,false); assert.equal(filas[1].promocionesAbiertas,false);
});

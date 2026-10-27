import test from 'node:test';
import assert from 'node:assert/strict';

test('el perfil de prueba expone solo sus datos acordados y nunca el hash', async () => {
  const { perfilDePrueba } = await import('../../backend/servicios/usuarios-prueba.js');
  assert.deepEqual(perfilDePrueba({ id:'p', nombre:'Ana', tipoTarjeta:'basica', usuarioAcceso:'ana', clavePrueba:'123', promocionesAbiertas:false, contrasenaHash:'privado' }),
    { id:'p', nombre:'Ana', tipoTarjeta:'basica', usuarioAcceso:'ana', clavePrueba:'123', promocionesAbiertas:false });
});

test('seleccionar un usuario entrega sus credenciales sin inventar claves faltantes', async () => {
  const { credencialesDePerfil } = await import('../../public/js/usuarios-prueba.js');
  assert.deepEqual(credencialesDePerfil({ usuarioAcceso:'midi-1', clavePrueba:'ClaveDePrueba' }), { usuario:'midi-1', clave:'ClaveDePrueba' });
  assert.deepEqual(credencialesDePerfil({ usuarioAcceso:'midi-2' }), { usuario:'midi-2', clave:'' });
});

test('apertura en mock es persistente, idempotente y no cambia otro perfil', async () => {
  const { crearRepositorioUsuariosPruebaMock } = await import('../../backend/repositorios/usuarios-prueba.mock.js');
  const repo=crearRepositorioUsuariosPruebaMock([{id:'A',promocionesAbiertas:false},{id:'B',promocionesAbiertas:false}]);
  await repo.marcarApertura('A'); await repo.marcarApertura('A');
  assert.equal((await repo.listar()).find(p=>p.id==='A').promocionesAbiertas,true);
  assert.equal((await repo.listar()).find(p=>p.id==='B').promocionesAbiertas,false);
  assert.equal(await repo.marcarApertura('otro'),null);
});

test('H21 apertura en mock devuelve las marcas de la encuesta y guarda solo la pedida en ese perfil', async () => {
  const { crearRepositorioUsuariosPruebaMock } = await import('../../backend/repositorios/usuarios-prueba.mock.js');
  const repo=crearRepositorioUsuariosPruebaMock([{id:'A',promocionesAbiertas:false},{id:'B',promocionesAbiertas:false}]);
  assert.deepEqual(await repo.marcarApertura('A'),{promocionesAbiertas:true,hojaMostrada:false,avisoCerrado:false});
  assert.deepEqual(await repo.marcarApertura('A','hoja-mostrada'),{promocionesAbiertas:true,hojaMostrada:true,avisoCerrado:false});
  assert.deepEqual(await repo.marcarApertura('A','aviso-cerrado'),{promocionesAbiertas:true,hojaMostrada:true,avisoCerrado:true});
  assert.deepEqual(await repo.marcarApertura('B'),{promocionesAbiertas:true,hojaMostrada:false,avisoCerrado:false});
});

test('registrar apertura usa POST sin un propietario enviado desde el cliente y propaga fallos', async () => {
  const { registrarAperturaPromociones } = await import('../../public/js/usuarios-prueba.js');
  let llamada;
  const marcas = await registrarAperturaPromociones(async (...args)=>{llamada=args;return {ok:true,json:async()=>({promocionesAbiertas:true,hojaMostrada:false,avisoCerrado:false})};});
  assert.deepEqual(marcas,{promocionesAbiertas:true,hojaMostrada:false,avisoCerrado:false});
  assert.equal(llamada[0],'/api/promociones-apertura'); assert.equal(llamada[1].method,'POST'); assert.equal(llamada[1].body,undefined);
  await assert.rejects(registrarAperturaPromociones(async()=>({ok:false})),/apertura/i);
});

test('H21 guardar una marca de la encuesta la envía con la apertura y devuelve el estado guardado', async () => {
  const { marcarEncuesta } = await import('../../public/js/usuarios-prueba.js');
  let llamada;
  const estado = await marcarEncuesta('aviso-cerrado', async (...args)=>{llamada=args;return {ok:true,json:async()=>({hojaMostrada:true,avisoCerrado:true})};});
  assert.equal(llamada[0],'/api/promociones-apertura'); assert.equal(llamada[1].method,'POST');
  assert.deepEqual(JSON.parse(llamada[1].body),{marca:'aviso-cerrado'});
  assert.equal(llamada[1].headers['Content-Type'],'application/json');
  assert.deepEqual(estado,{hojaMostrada:true,avisoCerrado:true});
  await assert.rejects(marcarEncuesta('hoja-mostrada', async()=>({ok:false})),/encuesta/i);
});

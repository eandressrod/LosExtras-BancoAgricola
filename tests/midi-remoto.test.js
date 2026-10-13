// Ejecución explícita: npm run test:midi:remote. Solo crea/elimina sus propios datos UUID.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as pausa } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { crearServicioMidi } from '../hola/servicio.js';
import { generarPerfil, crearBorrador } from '../hola/modelo.js';
import { filaNueva } from '../hola/schema.js';
import { obtenerClienteSupabase } from '../backend/config/supabase.js';
import login from '../api/auth/login.js';
import menu from '../api/menu.js';
import promociones from '../api/promociones.js';

process.env.SESSION_SECRET ||= randomBytes(32).toString('base64url');
test('Midi remoto: alta conjunta, login, cuentas, encuesta, promoción, edición, rollback y limpieza propia', { timeout: 45000 }, async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const client = obtenerClienteSupabase(); let peticiones = 0;
  const servicio = crearServicioMidi({ rpc(...args) { peticiones++; return client.rpc(...args); } });
  const filas = generarPerfil(() => 0.99); const perfil = filas.perfiles[0];
  perfil.nombre = 'QA Midi'; perfil.tipo_tarjeta = 'basica'; filas.cuentas = filas.cuentas.slice(0,1);
  filas.cuentas[0].saldo = '111.50'; filas.cuentas[0].segmento = 'Básica';
  const comercio = `midi-qa-${crypto.randomUUID()}`, promo = `midi-qa-${crypto.randomUUID()}`;
  filas.comercios = [{ ...filaNueva('comercios'), id: comercio, nombre: 'QA Midi' }];
  filas.promociones = [{ ...filaNueva('promociones'), id: promo, comercio_id: comercio, merchant: 'QA Midi', category: 'Compras', description: 'Oferta de prueba', imagen_url: '/recursos/promociones/cafe.jpg', imagen_alt: 'Café' }];
  filas.beneficios_tarjeta = [{ ...filaNueva('beneficios_tarjeta'), promocion_id: promo, beneficio: '5 %', medio_pago: 'Tarjeta Básica' }];
  const b = crearBorrador(); b.agregar(filas); let creado = false, ultima;
  try {
    ultima = await servicio.guardar(crypto.randomUUID(),b.cambios()); creado = true;
    assert.ok(ultima.datos.perfiles.some(p => p.id === perfil.id));
    const acceso = await login.fetch(new Request('http://localhost/api/auth/login', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario:perfil.usuario_acceso,contrasena:'123'}) }));
    assert.equal(acceso.status,200);
    const headers = { cookie: acceso.headers.getSetCookie()[0].split(';')[0] };
    let respuesta = await menu.fetch(new Request('http://localhost/api/menu',{headers}));
    assert.equal(respuesta.status,200); let datos = await respuesta.json();
    assert.equal(datos.perfil.nombre,'QA Midi'); assert.equal(datos.cuentas[0].saldo,111.5); assert.equal(datos.destinoPromociones,'/encuesta.html');
    b.cargar(ultima.datos); const prefs = b.filas.preferencias_usuario.find(p => p.usuario_id === perfil.id);
    prefs.categorias = ['Compras']; prefs.encuesta_completada = true;
    b.eliminar('cuentas',b.filas.cuentas.find(c=>c.perfil_id===perfil.id));
    await pausa(2100); ultima = await servicio.guardar(crypto.randomUUID(),b.cambios());
    respuesta = await menu.fetch(new Request('http://localhost/api/menu',{headers})); assert.equal(respuesta.status,200); datos = await respuesta.json();
    assert.equal(datos.destinoPromociones,'/promociones.html');
    assert.deepEqual(datos.cuentas,[], 'El perfil con acceso puede probar promociones sin cuentas.');
    respuesta = await promociones.fetch(new Request('http://localhost/api/promociones',{headers})); assert.equal(respuesta.status,200);
    assert.ok((await respuesta.json()).some(p => p.id === promo && p.benefit === '5 %'));
    const temporal = `midi-qa-${crypto.randomUUID()}`;
    const malLote = [
      { tabla:'comercios',operacion:'crear',clave:{id:temporal},datos:{...filaNueva('comercios'),id:temporal,nombre:'Rollback'} },
      { tabla:'promociones',operacion:'crear',clave:{id:temporal},datos:{...filaNueva('promociones'),id:temporal,comercio_id:temporal,category:'No válida'} }
    ];
    const invalida = await client.rpc('midi_guardar_cambios',{cambios:malLote}); peticiones++;
    assert.equal(invalida.error?.code,'23514');
    const consulta = await client.rpc('midi_leer_datos'); peticiones++; assert.ifError(consulta.error);
    assert.ok(!consulta.data.comercios.some(c => c.id === temporal)); ultima = {datos:consulta.data};
  } finally {
    if (creado) {
      // Versiones y dependencias actuales; jamás borrar por prefijo ni tocar datos ajenos.
      const consulta = await client.rpc('midi_leer_datos'); peticiones++; assert.ifError(consulta.error);
      const limpiar = crearBorrador(consulta.data);
      for (const [tabla,id] of [['perfiles',perfil.id],['promociones',promo],['comercios',comercio]]) {
        const fila = limpiar.filas[tabla].find(f => f.id === id); if (fila) limpiar.eliminar(tabla,fila);
      }
      await pausa(2100); ultima = await servicio.guardar(crypto.randomUUID(),limpiar.cambios());
      assert.ok(!ultima.datos.perfiles.some(p => p.id === perfil.id));
      assert.ok(!ultima.datos.promociones.some(p => p.id === promo));
      assert.ok(!ultima.datos.comercios.some(c => c.id === comercio));
    }
  }
  assert.ok(peticiones <= 6, `Se excedió el presupuesto de RPC: ${peticiones}`);
});

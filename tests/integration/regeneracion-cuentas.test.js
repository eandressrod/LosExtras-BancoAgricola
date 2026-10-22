import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const ajenas=['perfiles','preferencias_usuario','promociones','beneficios_tarjeta','mensajes_usuario','metas_usuario','puntos_usuario','sesiones_revocadas','sesiones_actividad','categorias','comercios','categoria_comercios','productos_tarjeta','promociones_guardadas','sucursales'];
let antes;
let despues;
async function estado() {
  const filas={};
  for(const tabla of ajenas) filas[tabla]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') as datos from ${tabla} t`)).rows[0].datos;
  return filas;
}
before(async()=>{
  db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  const dir=new URL('../../supabase/migrations/',import.meta.url);
  const files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
  for(const f of files) {
    if(f.endsWith('_regenerar_cuentas_tarjetas.sql')) {
      await db.query("insert into perfiles(id,nombre,tipo_tarjeta) values('qa-otro-perfil','Perfil adicional','black')");
      antes=await estado();
    }
    await db.exec(await readFile(new URL(f,dir),'utf8'));
    if(f.endsWith('_regenerar_cuentas_tarjetas.sql')) despues=await estado(); // Migraciones posteriores (H24) cambian el catálogo.
  }
});
after(async()=>{await db?.close();});

test('solo hay cuentas bancarias, con número completo independiente de las tarjetas',async()=>{
  const {rows}=await db.query('select * from cuentas');
  assert.ok(rows.length>0);assert.ok(rows.every(c=>!/tarjeta/i.test(c.tipo)));
  assert.ok(rows.every(c=>/^[1-9]\d{9}$/.test(c.numero_completo)));
  assert.ok(rows.every(c=>c.numero_enmascarado===c.numero_completo));
});
test('cada tarjeta está asociada a una cuenta del mismo usuario y solo expone cuatro dígitos',async()=>{
  const {rows}=await db.query('select t.*,c.perfil_id as propietario,c.numero_completo from tarjetas_usuario t join cuentas c on c.id=t.cuenta_id');
  assert.ok(rows.length>=13);assert.ok(rows.every(t=>t.perfil_id===t.propietario));
  assert.ok(rows.every(t=>/^•••• \d{4}$/.test(t.numero_enmascarado)&&t.numero_enmascarado!==t.numero_completo));
  const cuenta=(await db.query("select id from cuentas where perfil_id='B' limit 1")).rows[0].id;
  await assert.rejects(db.query("update tarjetas_usuario set cuenta_id=$1 where id='cta-a-3'",[cuenta]),e=>e.code==='23503');
  await assert.rejects(db.query("update tarjetas_usuario set cuenta_id=null where id='cta-a-3'"),e=>e.code==='23502');
});
test('regenerar productos conserva intactas las otras entidades',async()=>{
  assert.ok(antes,'falta la migración de regeneración');assert.deepEqual(despues,antes);
});

test('SCRUM-72: rechaza altas de tarjetas sin cuenta propia y permite cuentas sin tarjeta',async()=>{
  for (const [cuenta,codigo] of [[null,'23502'],['no-existe','23503'],[(await db.query("select id from cuentas where perfil_id='B' limit 1")).rows[0].id,'23503']]) {
    await assert.rejects(db.query(`insert into tarjetas_usuario(id,perfil_id,cuenta_id,producto_id,tipo_tarjeta,numero_enmascarado,saldo,moneda,orden)
      select 'qa-tarjeta-invalida',perfil_id,$1,producto_id,tipo_tarjeta,numero_enmascarado,saldo,moneda,orden
      from tarjetas_usuario where id='cta-a-3'`,[cuenta]),e=>e.code===codigo);
  }
  const sinCuenta=await db.query('select t.id from tarjetas_usuario t left join cuentas c on c.id=t.cuenta_id and c.perfil_id=t.perfil_id where c.id is null');
  assert.equal(sinCuenta.rows.length,0);
  const sinTarjeta=await db.query('select c.id from cuentas c where not exists(select 1 from tarjetas_usuario t where t.cuenta_id=c.id)');
  assert.ok(sinTarjeta.rows.length>0,'Las cuentas sin tarjeta siguen siendo válidas');
});

test('la regeneración incluye perfiles adicionales sin inventar o cambiar sus accesos',async()=>{
  const {rows}=await db.query("select t.id,c.perfil_id from tarjetas_usuario t join cuentas c on c.id=t.cuenta_id where t.perfil_id='qa-otro-perfil'");
  assert.equal(rows.length,1);assert.equal(rows[0].perfil_id,'qa-otro-perfil');
  await assert.rejects(db.query("update tarjetas_usuario set numero_enmascarado='1234567890123456' where id='cta-a-3'"),e=>e.code==='23514');
});

test('adaptador Supabase lee tarjetas y cuentas propias del nuevo modelo con la misma forma del mock',async()=>{
  const {crearRepositorioProductosSupabase}=await import('../../backend/repositorios/productos-menu.supabase.js');
  const {crearRepositorioProductosMock}=await import('../../backend/repositorios/productos-menu.mock.js');
  const cliente={from(tabla){
    assert.equal(tabla,'tarjetas_usuario');let perfil;
    return {select(campos){assert.match(campos,/tarjetas_usuario_cuenta_propietario_fkey/);return this;},
      eq(campo,valor){assert.equal(campo,'perfil_id');perfil=valor;return this;},
      async order(){return {data:(await db.query(`select t.*,to_jsonb(p) as producto,jsonb_build_object('id',c.id,'numero_completo',c.numero_completo) as cuenta
        from tarjetas_usuario t join cuentas c on c.id=t.cuenta_id and c.perfil_id=t.perfil_id
        join productos_tarjeta p on p.id=t.producto_id where t.perfil_id=$1 order by t.orden`,[perfil])).rows};}};
  }};
  const repo=crearRepositorioProductosSupabase(cliente),mock=crearRepositorioProductosMock();
  const campos=t=>({id:t.id,cuentaId:t.cuentaId,numeroEnmascarado:t.numeroEnmascarado,tipoTarjeta:t.tipoTarjeta,cuenta:t.cuenta,saldo:t.saldo});
  assert.deepEqual((await repo.listarTarjetas('A')).map(campos),(await mock.listarTarjetas('A')).map(campos));
  assert.deepEqual(await repo.listarTarjetas('no-existe'),[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('PWA declara alcance raíz, iconos válidos y enlaces en todas las pantallas', async()=>{
  const archivo = p=>readFile(new URL('../../'+p,import.meta.url));
  const manifest=JSON.parse(await archivo('public/pwa/manifest.webmanifest'));
  assert.equal(manifest.name,'Bancoagrícola');assert.equal(manifest.display,'standalone');
  assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/index.html');
  for(const icono of manifest.icons){
    const png=await archivo('public'+icono.src);const lado=Number(icono.sizes.split('x')[0]);
    assert.equal(png.readUInt32BE(16),lado);assert.equal(png.readUInt32BE(20),lado);
  }
  const apple=await archivo('public/pwa/apple-touch-icon.png');assert.equal(apple.readUInt32BE(16),180);
  for(const pantalla of ['index','menu','encuesta','preferencias','promociones','detalle']){
    const html=(await archivo('public/'+pantalla+'.html')).toString();
    assert.match(html,/rel="manifest" href="\/pwa\/manifest.webmanifest"/);
    assert.match(html,/src="\/pwa\/pwa.js"/);assert.match(html,/apple-touch-icon/);
  }
  const config=JSON.parse(await archivo('vercel.json'));
  assert.ok(config.headers.find(h=>h.source==='/pwa/sw.js').headers.some(h=>h.key==='Service-Worker-Allowed'&&h.value==='/'));
});

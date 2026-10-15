import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('servidor local conserva host y puerto para renovar sesión del mismo origen y rechaza otro origen', async () => {
  const entrada = new URL('../../scripts/dev.js', import.meta.url).href;
  // Puerto efímero para probar el servidor real sin detener el que usa otro desarrollador.
  const codigo = `import { Server } from 'node:net';
    const escuchar = Server.prototype.listen;
    Server.prototype.listen = function (puerto, host, callback) {
      return escuchar.call(this, 0, host, () => {
        console.log('PUERTO_PRUEBA=' + this.address().port);
        callback?.();
      });
    };
    await import(${JSON.stringify(entrada)});`;
  const hijo = spawn(process.execPath, ['--input-type=module', '-e', codigo], {
    env: { ...process.env, DATA_SOURCE: 'mock', SESSION_SECRET: 'servidor-local-prueba-'.repeat(3) },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  try {
    const puerto = await new Promise((resolve, reject) => {
      const reloj = setTimeout(() => reject(new Error('El servidor de prueba no inició.')), 10000);
      hijo.on('error', error => { clearTimeout(reloj); reject(error); });
      hijo.on('exit', () => { clearTimeout(reloj); reject(new Error('El servidor de prueba terminó antes de iniciar.')); });
      hijo.stdout.on('data', chunk => {
        const coincidencia = chunk.toString().match(/PUERTO_PRUEBA=(\d+)/);
        if (coincidencia) { clearTimeout(reloj); resolve(coincidencia[1]); }
      });
    });
    const origen = 'http://127.0.0.1:' + puerto;
    const login = await fetch(origen + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'demo.basica', contrasena: 'Basica2026' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const renovar = origin => fetch(origen + '/api/auth/actividad', { method: 'POST', headers: { cookie, origin } });
    assert.equal((await renovar(origen)).status, 200);
    assert.equal((await renovar('https://ajeno.example')).status, 403);
  } finally {
    const salida = once(hijo, 'exit');
    hijo.kill();
    await salida;
  }
});

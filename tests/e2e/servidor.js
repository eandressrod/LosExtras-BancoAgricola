// Arranque global de las pruebas e2e: levanta el servidor local real con datos mock en un puerto efímero,
// para no chocar con `npm run dev` en el 3000 ni usar por error un servidor conectado a Supabase.
import { spawn } from 'node:child_process';
import { once } from 'node:events';

export default async function iniciarServidor() {
  const entrada = new URL('../../scripts/dev.js', import.meta.url).href;
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
    env: { ...process.env, DATA_SOURCE: 'mock', SESSION_SECRET: 'e2e-servidor-local-prueba-'.repeat(3) },
    stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true
  });
  const puerto = await new Promise((resolve, reject) => {
    const reloj = setTimeout(() => reject(new Error('El servidor e2e no inició.')), 10000);
    hijo.on('error', error => { clearTimeout(reloj); reject(error); });
    hijo.on('exit', () => { clearTimeout(reloj); reject(new Error('El servidor e2e terminó antes de iniciar.')); });
    hijo.stdout.on('data', chunk => {
      const coincidencia = chunk.toString().match(/PUERTO_PRUEBA=(\d+)/);
      if (coincidencia) { clearTimeout(reloj); resolve(coincidencia[1]); }
    });
  });
  process.env.E2E_ORIGEN = 'http://127.0.0.1:' + puerto;

  return async () => {
    const salida = once(hijo, 'exit');
    hijo.kill();
    await salida;
  };
}

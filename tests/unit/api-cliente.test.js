import test from 'node:test';
import assert from 'node:assert/strict';
import { getJSON } from '../../public/js/comun.js';

test('un fallo de red muestra un mensaje de reintento comprensible', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  try { await assert.rejects(getJSON('/api/promociones'), /No se pudieron cargar los datos/); }
  finally { globalThis.fetch = original; }
});

test('la consulta evita caché y una respuesta fallida no se trata como datos válidos', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => { assert.equal(options.cache, 'no-store'); return { ok: false, status: 503 }; };
  try { await assert.rejects(getJSON('/api/promociones'), /Intenta de nuevo/); }
  finally { globalThis.fetch = original; }
});

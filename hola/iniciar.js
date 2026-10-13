import { crearServidorMidi } from './servidor.js';
import { crearServicioMidi, errorMidi } from './servicio.js';
import { leerConfiguracionSupabase, obtenerClienteSupabase } from '../backend/config/supabase.js';

let destino = '', servicio, configurada = true;
try {
  destino = new URL(leerConfiguracionSupabase().url).hostname;
  servicio = crearServicioMidi(obtenerClienteSupabase());
} catch {
  configurada = false;
  servicio = { leer: async () => { throw errorMidi('Completa SUPABASE_URL y SUPABASE_SECRET_KEY en .env.', 400); }, guardar: async () => { throw errorMidi('Completa la configuración de Supabase.', 400); } };
}
const puerto = Number(process.env.MIDI_PORT || 3001);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('MIDI_PORT debe ser un puerto válido.');
const server = crearServidorMidi({ servicio, destino, configurada });
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `El puerto ${puerto} está ocupado. Cambia MIDI_PORT o cierra la otra instancia de Midi.` : 'No se pudo iniciar Midi.'); process.exitCode = 1; });
server.listen(puerto, '127.0.0.1', () => console.log(`Midi: http://127.0.0.1:${puerto}`));

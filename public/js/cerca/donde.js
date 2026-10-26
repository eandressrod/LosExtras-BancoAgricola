// H8: bloque «Dónde» del detalle. Distancia aproximada a la sucursal participante más cercana, mapa reducido con
// el recorrido aproximado y enlaces a Waze y a la app de mapas, que llevan solo el destino.
import { almacenSesion } from '../comun.js';
import { sucursalMasCercana, textoDistancia } from './cercania.js';
import { enlaceWaze, enlaceGoogleMaps } from './enlaces.js';
import { recorridoAproximado } from './recorrido.js';
import { leerUbicacion, guardarEleccion, leerEleccion, origenDeZona, permisoConcedido } from './origen.js';
import { cargarZonas, leerZonaGuardada, guardarZona } from './zona.js';
import { crearMapa, crearMarcador, dibujarRecorrido, encuadrar } from './mapa.js';

const MOTIVOS = {
  denegada: 'No diste permiso para usar tu ubicación. Elige una zona.',
  'no-disponible': 'No se pudo obtener tu ubicación. Elige una zona.',
  tiempo: 'Tu ubicación tardó demasiado. Elige una zona.'
};

/** Prepara el bloque para la promoción. Sin sucursales presenciales no muestra distancia. */
export function mostrarDonde(promocion, perfil) {
  const $ = selector => document.querySelector(selector);
  const distancia = $('#donde-distancia');
  const sucursalTexto = $('#donde-sucursal');
  const verDistancia = $('#ver-distancia');
  const contenedorMapa = $('#mapa-detalle');
  const enlaceMapa = $('#mapa-detalle-enlace');
  const nota = $('#donde-nota');
  const acciones = $('.pr-donde__acciones');
  const hoja = $('#zonas');
  const sesion = almacenSesion();
  let zonas = [];
  let mapa = null;
  let ml = null;
  let marcadores = [];

  if (!promocion.branches?.length) return;

  function pintar(origen) {
    const cercana = sucursalMasCercana(promocion, origen);
    const { sucursal, metros } = cercana;
    const destino = { latitud: sucursal.latitude, longitud: sucursal.longitude };
    distancia.textContent = `${textoDistancia(metros)} · ${sucursal.name}`;
    sucursalTexto.textContent = sucursal.address + (origen.tipo === 'zona' ? ` · Desde ${origen.nombre}` : ' · Desde tu ubicación');
    distancia.hidden = sucursalTexto.hidden = false;
    verDistancia.hidden = true;
    $('#abrir-waze').href = enlaceWaze(destino);
    $('#como-llegar').href = enlaceGoogleMaps(destino);
    acciones.hidden = false;
    enlaceMapa.href = '/promociones.html?sucursal=' + encodeURIComponent(sucursal.id);
    contenedorMapa.hidden = nota.hidden = false;
    dibujarMapa(origen, destino);
  }

  async function dibujarMapa(origen, destino) {
    try {
      if (!mapa) {
        ({ ml, mapa } = await crearMapa(contenedorMapa, { centro: destino, zoom: 14, interactivo: false }));
        contenedorMapa.classList.add('pr-mapa--activo');
      }
      for (const marcador of marcadores) marcador.remove();
      marcadores = [
        crearMarcador(ml, { posicion: origen, clase: 'pr-marcador--origen' }).addTo(mapa),
        crearMarcador(ml, { posicion: destino, clase: 'pr-marcador--sucursal' }).addTo(mapa)
      ];
      dibujarRecorrido(mapa, recorridoAproximado(origen, destino));
      encuadrar(mapa, [origen, destino], { margen: 36, zoom: 15, animar: false });
    } catch {
      contenedorMapa.classList.add('pr-mapa--error');
      contenedorMapa.querySelector('.pr-mapa__rotulo').textContent = 'No se pudo cargar el mapa.';
    }
  }

  function pedirOrigen(mensaje = '') {
    distancia.hidden = !mensaje;
    distancia.textContent = mensaje;
    sucursalTexto.hidden = true;
    verDistancia.hidden = false;
  }

  async function usarUbicacion() {
    const lectura = await leerUbicacion(navigator.geolocation);
    if (hoja.open) hoja.close();
    if (!lectura.ok) return pedirOrigen(MOTIVOS[lectura.motivo]);
    guardarEleccion(sesion, perfil.id, { tipo: 'ubicacion' });
    pintar({ tipo: 'ubicacion', latitud: lectura.latitud, longitud: lectura.longitud });
  }

  function elegirZona(zonaId) {
    const origen = origenDeZona(zonas, zonaId);
    if (!origen) return;
    if (hoja.open) hoja.close();
    guardarEleccion(sesion, perfil.id, { tipo: 'zona', zonaId });
    guardarZona(zonaId);
    pintar(origen);
  }

  function pintarZonas() {
    $('#zonas .pr-zonas').replaceChildren(...zonas.map(zona => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.textContent = zona.nombre;
      chip.addEventListener('click', () => elegirZona(zona.id));
      return chip;
    }));
  }

  // Origen: la elección de esta visita, o la zona guardada. Sin origen, «Ver distancia» lo pide en ese momento.
  async function iniciar() {
    try {
      zonas = await cargarZonas();
      pintarZonas();
    } catch { /* Sin zonas aún se puede usar la ubicación. */ }
    const eleccion = leerEleccion(sesion, perfil.id);
    if (eleccion?.tipo === 'ubicacion' && await permisoConcedido(navigator.permissions)) {
      const lectura = await leerUbicacion(navigator.geolocation);
      if (lectura.ok) return pintar({ tipo: 'ubicacion', latitud: lectura.latitud, longitud: lectura.longitud });
    }
    const zonaId = eleccion?.tipo === 'zona' ? eleccion.zonaId : await leerZonaGuardada();
    const origen = zonaId && origenDeZona(zonas, zonaId);
    if (origen) return pintar(origen);
    pedirOrigen();
  }

  verDistancia.addEventListener('click', () => hoja.showModal());
  $('#cerrar-zonas').addEventListener('click', () => hoja.close());
  $('#donde-ubicacion').addEventListener('click', usarUbicacion);
  iniciar();
}

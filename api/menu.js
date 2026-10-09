import { obtenerRepositorioAccesos } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

// Datos ficticios por perfil según los requerimientos de la historia H2
const CUENTAS_FICTICIAS = {
  black: [
    {
      id: 'cta-b1',
      nombre: 'Cuenta Corriente Premium',
      tipo: 'Corriente',
      numeroEnmascarado: '•••• 4821',
      saldo: 3450.75,
      moneda: 'USD',
      segmento: 'Black'
    },
    {
      id: 'cta-b2',
      nombre: 'Tarjeta de Crédito Black',
      tipo: 'Tarjeta de Crédito',
      numeroEnmascarado: '•••• 9012',
      saldo: 1200.00,
      moneda: 'USD',
      segmento: 'Black'
    }
  ],
  basica: [
    {
      id: 'cta-a1',
      nombre: 'Cuenta de Ahorro Libre',
      tipo: 'Ahorro',
      numeroEnmascarado: '•••• 1045',
      saldo: 420.50,
      moneda: 'USD',
      segmento: 'Básica'
    },
    {
      id: 'cta-a2',
      nombre: 'Tarjeta de Débito Clásica',
      tipo: 'Débito',
      numeroEnmascarado: '•••• 3321',
      saldo: 420.50,
      moneda: 'USD',
      segmento: 'Básica'
    }
  ]
};

export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');

    try {
      const repo = obtenerRepositorioAccesos();
      const perfil = await perfilDeSesion(leerCookie(request), repo);

      if (!perfil) {
        return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      }

      // Asegurar que cada perfil ve únicamente sus cuentas
      const tipo = (perfil.tipoTarjeta || 'basica').toLowerCase();
      const cuentas = CUENTAS_FICTICIAS[tipo] || CUENTAS_FICTICIAS.basica;

      // Estado de encuesta: por defecto pendiente para usuarios de prueba hasta completar H3
      const encuestaPendiente = perfil.encuestaPendiente ?? true;

      return responderJson({
        perfil,
        cuentas,
        encuestaPendiente,
        destinoPromociones: encuestaPendiente ? '/encuesta.html' : '/promociones.html'
      });
    } catch (error) {
      console.error('Consulta de menú no disponible:', error.message);
      return responderJson({ error: 'No se pudieron cargar los datos del menú. Intenta de nuevo más tarde.' }, 503);
    }
  }
};

// H22: el perfil se deriva en cada orden a partir de las señales activas; quitar una señal borra todo lo que se derivaba de ella.
import { INDIFERENTE } from './vocabulario.js';

//
// El resultado agrupa las señales activas por clase y ámbito:
//   - intereses (categorías, subcategorías, comercios): definen el alcance y el puntaje;
//   - criterios (canales, beneficios, descubrir): en esta fase solo producen insignias;
//   - indiferencias: criterios respondidos con «Me da igual», distintos de no haber respondido;
//   - rechazos: los aplica H23 mediante ReglasExternas.

/** @param {import('./contrato.js').Senal[]} senales */
export function perfilDeSenales(senales = []) {
  const activas = (senales ?? []).filter(senal => senal.activa !== false);
  const valores = (clase, ambito) => new Set(activas.filter(s => s.clase === clase && s.ambito === ambito).map(s => s.valor));
  const declarados = ambito => new Set([...valores('criterio', ambito)].filter(valor => valor !== INDIFERENTE));
  const categorias = valores('interes', 'categoria');
  const comercios = valores('interes', 'comercio');
  return {
    categorias,
    subcategorias: valores('interes', 'subcategoria'),
    comercios,
    canales: declarados('canal'),
    beneficios: declarados('beneficio'),
    descubrir: [...valores('criterio', 'descubrir')][0] ?? null,
    indiferencias: new Set(activas.filter(s => s.clase === 'criterio' && s.valor === INDIFERENTE).map(s => s.ambito)),
    rechazos: { ofertas: valores('rechazo', 'oferta'), comercios: valores('rechazo', 'comercio'), categorias: valores('rechazo', 'categoria') },
    // Sin intereses declarados se usa la estrategia base; los criterios solos no definen alcance.
    sinIntereses: categorias.size === 0 && comercios.size === 0
  };
}

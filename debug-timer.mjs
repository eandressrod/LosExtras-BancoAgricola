import { abrirListado, parametro } from './tests/integration/pagina-promociones.js';
const OFERTAS = [
  { id: 'tienda', merchant: 'Siman', category: 'Compras', benefit: '15%' },
];
const filtrarMock = url => {
  const com = (parametro(url, 'comercio') ?? '').trim().toLowerCase();
  return OFERTAS.filter(p => !com || p.merchant.toLowerCase().includes(com));
};

const p = await abrirListado({ responder: filtrarMock });
console.log('antes cards hijos:', p.cards.hijos.length);

// Instrospección: ¿qué hace cards.append?
const origAppend = p.cards.append.bind(p.cards);
p.cards.append = (nodo) => {
  console.log('cards.append called with:', typeof nodo, nodo ? Object.keys(nodo) : 'null');
  return origAppend(nodo);
};

// ¿replaceChildren resetea hijos?
const origReplace = p.cards.replaceChildren.bind(p.cards);
p.cards.replaceChildren = () => {
  console.log('cards.replaceChildren called');
  return origReplace();
};

const el = p.obtener('#merchant-search');
await el.input('Siman');
console.log('despues cards hijos:', p.cards.hijos.length);


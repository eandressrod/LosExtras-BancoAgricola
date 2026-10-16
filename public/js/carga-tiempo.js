// La petición y el mínimo visual transcurren juntos; una respuesta lenta no suma otra pausa.
export async function conMinimoCarga(operacion, { minimo = 1000, esperar = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const tiempo = esperar(minimo);
  try { return await operacion(); }
  finally { await tiempo; }
}

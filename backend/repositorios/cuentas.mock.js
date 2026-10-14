const CUENTAS_BASE = [
  // Usuario Demo / A (2 cuentas de ahorro)
  { id: 'cta-demo-1', perfilId: 'demo', nombre: 'Max Electrónico', tipo: 'Cuenta de ahorro', numeroEnmascarado: '•••• 1320', saldo: 30.00, moneda: 'USD', segmento: 'Básica', orden: 1 },
  { id: 'cta-demo-2', perfilId: 'demo', nombre: 'CUENTA DIGITAL', tipo: 'Cuenta de ahorro', numeroEnmascarado: '•••• 5376', saldo: 0.00, moneda: 'USD', segmento: 'Básica', orden: 2 },
  { id: 'cta-a-1', perfilId: 'A', nombre: 'Max Electrónico', tipo: 'Cuenta de ahorro', numeroEnmascarado: '•••• 1320', saldo: 30.00, moneda: 'USD', segmento: 'Básica', orden: 1 },
  { id: 'cta-a-2', perfilId: 'A', nombre: 'CUENTA DIGITAL', tipo: 'Cuenta de ahorro', numeroEnmascarado: '•••• 5376', saldo: 0.00, moneda: 'USD', segmento: 'Básica', orden: 2 },

  // H16 (igual que la migración tarjetas_propias): A con Tarjeta Básica y Tarjeta Black; demo con su Tarjeta Básica.
  { id: 'cta-a-3', perfilId: 'A', nombre: 'Tarjeta de Crédito Básica', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '•••• 4821', saldo: 500.00, moneda: 'USD', segmento: 'Básica', orden: 3 },
  { id: 'cta-a-4', perfilId: 'A', nombre: 'Tarjeta de Crédito Black', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '•••• 7754', saldo: 2500.00, moneda: 'USD', segmento: 'Black', orden: 4 },
  { id: 'cta-demo-3', perfilId: 'demo', nombre: 'Tarjeta de Crédito Básica', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '•••• 3390', saldo: 500.00, moneda: 'USD', segmento: 'Básica', orden: 3 },

  // Usuario B (2 cuentas: corriente y crédito)
  { id: 'cta-b-1', perfilId: 'B', nombre: 'Cuenta Corriente Premium', tipo: 'Corriente', numeroEnmascarado: '•••• 4120', saldo: 3450.75, moneda: 'USD', segmento: 'Black', orden: 1 },
  { id: 'cta-b-2', perfilId: 'B', nombre: 'Tarjeta de Crédito Black', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '•••• 0341', saldo: 1200.00, moneda: 'USD', segmento: 'Black', orden: 2 }
];

export function crearRepositorioCuentasMock(cuentas = CUENTAS_BASE) {
  return {
    async listarPorPerfil(perfilId) {
      if (!perfilId) return [];
      const pid = String(perfilId).trim().toUpperCase();
      // Filtrado estricto por ID de propietario: CERO fallback por tipo de tarjeta
      return cuentas
        .filter(c => c.perfilId.toUpperCase() === pid)
        .sort((a, b) => a.orden - b.orden);
    }
  };
}

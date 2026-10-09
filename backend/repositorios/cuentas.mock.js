const CUENTAS_BASE = [
  // Cuentas Básica / Demo / Usuario A
  { id: 'cta-demo-1', perfilId: 'demo', tipoTarjeta: 'basica', nombre: 'Max Electrónico', tipo: 'Cuenta de ahorro', numeroEnmascarado: '3040751320', saldo: 30.00, moneda: 'USD', segmento: 'Básica', orden: 1 },
  { id: 'cta-demo-2', perfilId: 'demo', tipoTarjeta: 'basica', nombre: 'CUENTA DIGITAL', tipo: 'Cuenta de ahorro', numeroEnmascarado: '3280985376', saldo: 0.00, moneda: 'USD', segmento: 'Básica', orden: 2 },
  { id: 'cta-a-1', perfilId: 'a', tipoTarjeta: 'basica', nombre: 'Max Electrónico', tipo: 'Cuenta de ahorro', numeroEnmascarado: '3040751320', saldo: 30.00, moneda: 'USD', segmento: 'Básica', orden: 1 },
  { id: 'cta-a-2', perfilId: 'a', tipoTarjeta: 'basica', nombre: 'CUENTA DIGITAL', tipo: 'Cuenta de ahorro', numeroEnmascarado: '3280985376', saldo: 0.00, moneda: 'USD', segmento: 'Básica', orden: 2 },
  { id: 'cta-basica-1', perfilId: 'basica', tipoTarjeta: 'basica', nombre: 'Max Electrónico', tipo: 'Cuenta de ahorro', numeroEnmascarado: '3040751320', saldo: 30.00, moneda: 'USD', segmento: 'Básica', orden: 1 },
  
  // Cuentas Black / Usuario B
  { id: 'cta-black-1', perfilId: 'b', tipoTarjeta: 'black', nombre: 'Cuenta Corriente Premium', tipo: 'Corriente', numeroEnmascarado: '1098234120', saldo: 3450.75, moneda: 'USD', segmento: 'Black', orden: 1 },
  { id: 'cta-black-2', perfilId: 'b', tipoTarjeta: 'black', nombre: 'Tarjeta de Crédito Black', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '9984120341', saldo: 1200.00, moneda: 'USD', segmento: 'Black', orden: 2 },
  { id: 'cta-black-3', perfilId: 'black', tipoTarjeta: 'black', nombre: 'Cuenta Corriente Premium', tipo: 'Corriente', numeroEnmascarado: '1098234120', saldo: 3450.75, moneda: 'USD', segmento: 'Black', orden: 1 },
  { id: 'cta-black-4', perfilId: 'black', tipoTarjeta: 'black', nombre: 'Tarjeta de Crédito Black', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '9984120341', saldo: 1200.00, moneda: 'USD', segmento: 'Black', orden: 2 }
];

export function crearRepositorioCuentasMock(cuentas = CUENTAS_BASE) {
  return {
    async listarPorPerfil(perfilId, tipoTarjeta) {
      const pid = String(perfilId || '').toLowerCase();
      const tipo = String(tipoTarjeta || '').toLowerCase();

      let filtradas = cuentas.filter(c => c.perfilId === pid);
      if (filtradas.length === 0 && tipo) {
        filtradas = cuentas.filter(c => c.tipoTarjeta === tipo);
      }
      return filtradas.sort((a, b) => a.orden - b.orden);
    }
  };
}

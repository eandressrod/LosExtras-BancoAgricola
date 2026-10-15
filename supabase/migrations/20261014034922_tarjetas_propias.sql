-- H16: las tarjetas propias son las cuentas de tipo tarjeta de cada usuario; su segmento (Básica/Black) define los beneficios.
-- Acuerdo del equipo: A tiene Tarjeta Básica y Tarjeta Black; demo, su Tarjeta Básica. B ya tiene su Tarjeta Black (cta-b-2).
-- Cambio aditivo e idempotente: no modifica cuentas existentes ni el esquema. Saldo 0 (valor por defecto): no se inventan montos.
insert into public.cuentas (id, perfil_id, nombre, tipo, numero_enmascarado, saldo, moneda, segmento, orden) values
('cta-a-3', 'A', 'Tarjeta de Crédito Básica', 'Tarjeta de Crédito', '•••• 4821', 0, 'USD', 'Básica', 3),
('cta-a-4', 'A', 'Tarjeta de Crédito Black', 'Tarjeta de Crédito', '•••• 7754', 0, 'USD', 'Black', 4),
('cta-demo-3', 'demo', 'Tarjeta de Crédito Básica', 'Tarjeta de Crédito', '•••• 3390', 0, 'USD', 'Básica', 3)
on conflict (id) do nothing;

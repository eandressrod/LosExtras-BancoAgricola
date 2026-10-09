-- H1, ajuste del PO: se conserva el usuario general demo / demo123 (tarjeta básica).
-- Va en una migración nueva porque accesos_prueba ya está en main y no se modifica.
-- Solo se guarda el hash de la clave (npm run hash -- "Clave").

update public.perfiles
set usuario_acceso = 'demo',
    contrasena_hash = 'scrypt$M_MND_a1ICaA2pU6QnSwzA$BNLN7do9LjccyV3SmkWh7skSGfQrAhi_BVL7zD4nlFo'
where id = 'demo';

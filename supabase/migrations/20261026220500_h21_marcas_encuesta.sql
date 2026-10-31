-- H21 parte 2 (SCRUM-71): la encuesta se ofrece sin insistir (ADR-010).
-- «Hoja mostrada»: la hoja ya se abrió sola una vez. «Aviso cerrado»: la persona cerró el aviso de la lista.
-- Son estado de interfaz, como encuesta_completada; no son impresiones ni analítica.
-- Columnas aparte de promociones_abiertas: esa marca ya es verdadera en perfiles que nunca vieron la hoja.
-- Migración aditiva (ADR-005): versiones anteriores ignoran las columnas.

alter table public.perfiles
  add column encuesta_hoja_mostrada boolean not null default false,
  add column encuesta_aviso_cerrado boolean not null default false;

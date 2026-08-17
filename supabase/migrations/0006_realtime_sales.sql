-- ============================================================
-- Habilita Supabase Realtime para la tabla "sales".
-- Sin esto, las suscripciones postgres_changes de SalesTab y
-- PendingSalesBanner nunca reciben eventos: las ventas nuevas
-- solo aparecen al recargar la página (que dispara el fetch inicial).
-- ============================================================

-- REPLICA IDENTITY FULL para que los payloads de UPDATE/DELETE
-- incluyan los valores anteriores completos (necesario para filtros
-- de status como los que usa el banner de ventas pendientes).
alter table public.sales replica identity full;

alter publication supabase_realtime add table public.sales;

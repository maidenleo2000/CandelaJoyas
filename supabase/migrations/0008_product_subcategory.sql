-- ------------------------------------------------------------
-- Subcategorías de la tienda: se guardan dentro de cada categoría
-- en site_settings.data.categories[].subcategories (mismo patrón
-- ya usado para categorías, sin tabla nueva). Acá solo agregamos
-- la columna de producto necesaria para asignarlas.
--
-- "add column if not exists" para no fallar si 0007 (panel interno
-- de stock) ya la creó antes.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists subcategory text default '';

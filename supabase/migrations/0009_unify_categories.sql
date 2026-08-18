-- ============================================================
-- Unifica el modelo de categorías/subcategorías entre la tienda y
-- control-stock: la tienda pasó a guardar subcategorías anidadas en
-- site_settings.data.categories[].subcategories[] (ver 0008 y
-- CategoryManager.jsx). Las tablas stock_categories/stock_subcategories
-- creadas en 0007 quedan obsoletas: ambas apps comparten ahora la misma
-- fuente de taxonomía en vez de mantener dos por separado.
-- ============================================================

alter table public.products drop column if exists category_id;
alter table public.products drop column if exists subcategory_id;

drop table if exists public.stock_subcategories;
drop table if exists public.stock_categories;

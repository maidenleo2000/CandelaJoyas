-- ------------------------------------------------------------
-- Storage: límites de tamaño y tipo MIME del lado servidor.
-- Hasta ahora los buckets no tenían restricciones propias: cualquier admin
-- (único rol con permiso de insert, ver 0002_rls.sql / 0004_correo_argentino.sql)
-- podía subir un archivo de cualquier tipo o tamaño. Esto agrega una
-- validación server-side como respaldo de la validación en el cliente
-- (src/services/storage.js).
-- ------------------------------------------------------------

update storage.buckets
set file_size_limit = 30 * 1024 * 1024,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
where id = 'products';

update storage.buckets
set file_size_limit = 30 * 1024 * 1024,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm']
where id = 'settings';

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['application/pdf']
where id = 'shipping-labels';

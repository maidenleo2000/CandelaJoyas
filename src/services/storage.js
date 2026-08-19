import { supabase } from './supabase';

const PUBLIC_URL_MARKER = '/storage/v1/object/public/';
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const DEFAULT_MAX_SIZE_MB = 30;

/** Sube un archivo a un bucket público y devuelve su URL pública. */
export async function uploadFile(bucket, path, file, { maxSizeMB = DEFAULT_MAX_SIZE_MB } = {}) {
  if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.type?.startsWith(prefix))) {
    throw new Error('Tipo de archivo no permitido. Solo se aceptan imágenes o videos.');
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`El archivo supera el tamaño máximo permitido (${maxSizeMB}MB).`);
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** true si la URL apunta a nuestro Storage de Supabase (no a un link externo). */
export function isStorageUrl(url) {
  return typeof url === 'string' && url.includes(PUBLIC_URL_MARKER);
}

/** Borra un archivo a partir de su URL pública de Supabase Storage. */
export async function deleteFileByUrl(url) {
  if (!isStorageUrl(url)) return;
  const [, rest] = url.split(PUBLIC_URL_MARKER);
  const [bucket, ...pathParts] = rest.split('/');
  const path = decodeURIComponent(pathParts.join('/'));
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn(`No se pudo borrar ${path} del bucket ${bucket}:`, error);
}

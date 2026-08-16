import { supabase } from './supabase';

const PUBLIC_URL_MARKER = '/storage/v1/object/public/';

/** Sube un archivo a un bucket público y devuelve su URL pública. */
export async function uploadFile(bucket, path, file) {
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

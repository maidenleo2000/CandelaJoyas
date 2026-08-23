// Pluralización simple para los nombres de variación configurables (Color/Talle
// pueden renombrarse por tienda, ej: "Medida", "Letra"). No es un pluralizador
// genérico de español, solo cubre el patrón usado en los textos de la tienda:
// palabra termina en vocal -> se agrega "s" (Talle -> Talles, Medida -> Medidas),
// termina en consonante -> se agrega "es" (Color -> Colores).
export function pluralizeEs(word) {
  if (!word) return word;
  const trimmed = word.trim();
  if (!trimmed) return word;
  const vowels = 'aeiouáéíóú';
  const last = trimmed.slice(-1).toLowerCase();
  return vowels.includes(last) ? `${trimmed}s` : `${trimmed}es`;
}

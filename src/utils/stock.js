// Calcula la clave usada en products.stock (jsonb) según el modo de control
// de stock del producto: por talle (con color opcional como sufijo) o por color.
export function getStockKey(mode, colors, { size, color } = {}) {
  if (mode === 'color') return color || null;
  if (!size) return null;
  const hasColors = colors?.length > 0;
  return (hasColors && color) ? `${size}_${color}` : size;
}

export function hasVariantSelected(mode, { size, color } = {}) {
  return mode === 'color' ? !!color : !!size;
}

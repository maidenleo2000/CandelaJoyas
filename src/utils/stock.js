// Calcula la clave usada en products.stock (jsonb) según el modo de control
// de stock del producto: por talle (con color opcional como sufijo), por
// color, o "unico" cuando el producto no tiene ni colores ni talles cargados.
export function getStockKey(mode, colors, sizes, { size, color } = {}) {
  const hasColors = colors?.length > 0;
  const hasSizes = sizes?.length > 0;
  if (!hasColors && !hasSizes) return 'unico';
  if (mode === 'color') return color || null;
  if (!size) return null;
  return (hasColors && color) ? `${size}_${color}` : size;
}

export function hasVariantSelected(mode, colors, sizes, { size, color } = {}) {
  const hasColors = colors?.length > 0;
  const hasSizes = sizes?.length > 0;
  if (!hasColors && !hasSizes) return true;
  return mode === 'color' ? !!color : !!size;
}

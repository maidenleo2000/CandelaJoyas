export function getBasePrice(product) {
  return product?.isOnSale ? Number(product.newPrice) : Number(product.price);
}

export function getInstallmentPrice(product) {
  const base = getBasePrice(product);
  return Math.ceil((base * 1.25) / 100) * 100;
}

export function getCashPrice(product) {
  return getBasePrice(product);
}

export function getFeaturedPrice(product, featuredPriceMode) {
  return featuredPriceMode === 'cash' ? getCashPrice(product) : getInstallmentPrice(product);
}

export function getSecondaryPrice(product, featuredPriceMode) {
  return featuredPriceMode === 'cash' ? getInstallmentPrice(product) : getCashPrice(product);
}

export function getPriceForPaymentMethod(product, paymentMethod) {
  return paymentMethod === 'mercadopago' ? getInstallmentPrice(product) : getCashPrice(product);
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function formatGuaranies(value) {
  const amount = Math.round(Number(value) || 0);
  if (!amount) return '';
  const formatted = new Intl.NumberFormat('es-PY', {
    maximumFractionDigits: 0
  }).format(amount);
  return `Gs. ${formatted}`;
}

function clip(value, max) {
  const text = clean(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const word = cut.replace(/\s+\S*$/, '').trim();
  return word.length > 20 ? word : cut.trim();
}

export function productSearchSnippet(product) {
  const name = clean(product?.productName);
  const price = formatGuaranies(product?.sellingPrice);
  const inStock = product?.stock == null || Number(product?.stock) > 0;
  const title = clip(name, 58) || 'Producto en Zenn';
  const priceBit = price ? `${price} en Paraguay.` : 'Precio en guaraníes, en Paraguay.';
  const stockBit = inStock ? 'Hay stock en Zenn.' : 'Consultá disponibilidad en Zenn.';
  const tail = `${priceBit} ${stockBit}`.trim();
  const lead = clip(name || 'Este producto', Math.max(36, 155 - tail.length - 2));
  const description = `${lead}. ${tail}`;
  return { title, description, priceLabel: price };
}

/** Ruta pública de ficha: siempre slug si existe (evita URLs /producto/{ObjectId}). */
export function productPath(product) {
  if (!product) return '/';
  const nested = product.productId && typeof product.productId === 'object' ? product.productId : null;
  const slug = product.slug || nested?.slug;
  if (slug) return `/producto/${slug}`;
  const id = product._id || product.id || nested?._id || nested?.id;
  if (id) return `/producto/${id}`;
  return '/';
}

export function productHref(product) {
  return productPath(product);
}

/** Búsquedas y productos vistos en este navegador. No expira. */
const KEY = 'zenn_search_memory_v1';
const LAST_QUERY_KEY = 'zenn_last_query';
const MAX_QUERIES = 12;
const MAX_PRODUCTS = 8;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { queries: [], products: [] };
    const parsed = JSON.parse(raw);
    return {
      queries: Array.isArray(parsed.queries) ? parsed.queries : [],
      products: Array.isArray(parsed.products) ? parsed.products : []
    };
  } catch {
    return { queries: [], products: [] };
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* modo privado o cuota llena */
  }
}

export function hasSearchMemory() {
  const data = read();
  return data.queries.length > 0 || data.products.length > 0;
}

export function getSearchMemory() {
  return read();
}

export function rememberQuery(q) {
  const query = String(q || '').trim();
  if (query.length < 2) return;
  try {
    sessionStorage.setItem(LAST_QUERY_KEY, query);
  } catch {
    /* ignore */
  }
  const data = read();
  const lower = query.toLowerCase();
  data.queries = [
    { q: query, at: Date.now() },
    ...data.queries.filter((item) => String(item.q || '').toLowerCase() !== lower)
  ].slice(0, MAX_QUERIES);
  write(data);
}

export function getLastQuery() {
  try {
    return sessionStorage.getItem(LAST_QUERY_KEY) || '';
  } catch {
    return '';
  }
}

export function rememberProduct(product, query) {
  if (!product || (!product._id && !product.id)) return;
  const id = String(product._id || product.id);
  const snap = {
    _id: id,
    productName: product.productName || '',
    brandName: product.brandName || '',
    category: product.category || '',
    sellingPrice: product.sellingPrice,
    price: product.price,
    productImage: product.productImage?.[0] ? [product.productImage[0]] : [],
    slug: product.slug || '',
    at: Date.now()
  };
  const data = read();
  data.products = [snap, ...data.products.filter((item) => String(item._id) !== id)].slice(0, MAX_PRODUCTS);
  const q = String(query || '').trim();
  if (q.length >= 2) {
    const lower = q.toLowerCase();
    data.queries = [
      { q, at: Date.now() },
      ...data.queries.filter((item) => String(item.q || '').toLowerCase() !== lower)
    ].slice(0, MAX_QUERIES);
  }
  write(data);
}

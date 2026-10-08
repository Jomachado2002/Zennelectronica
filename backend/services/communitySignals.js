'use strict';

function money(value) {
  const num = Math.round(Number(value) || 0);
  return `Gs. ${num.toLocaleString('es-PY')}`;
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const STOP = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'un', 'una', 'para', 'con', 'que',
  'por', 'al', 'se', 'esta', 'este', 'semana', 'comprar', 'venta', 'ventas', 'nuevo',
  'nueva', 'mas', 'hoy', 'paraguay', 'producto', 'productos'
]);

function tokens(value) {
  return fold(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

function shelfCards(list, limit) {
  const byPrice = (list || []).slice().sort((a, b) => (Number(a.sellingPrice) || 0) - (Number(b.sellingPrice) || 0));
  const picked = [];
  const seen = new Set();
  const push = (item) => {
    if (!item || seen.has(item.id) || picked.length >= limit) return;
    seen.add(item.id);
    picked.push(item);
  };
  if (byPrice.length) {
    push(byPrice[0]);
    push(byPrice[Math.floor(byPrice.length / 2)]);
    push(byPrice[byPrice.length - 1]);
  }
  byPrice.forEach(push);
  return picked.slice(0, limit).map((item) => {
    const list = Number(item.price) || 0;
    const sell = Number(item.sellingPrice) || 0;
    const off = list > sell && sell > 0 ? Math.round((list - sell) / list * 100) : 0;
    return {
      id: item.id,
      name: clip(item.productName, 90),
      brand: item.brandName || '',
      price: off >= 1 ? `${money(sell)} antes ${money(list)} -${off}%` : money(sell)
    };
  });
}

function matchTrends(rows, trends) {
  const matches = [];
  const seen = new Set();
  for (const trend of trends || []) {
    const brands = (trend.brands || []).map(fold).filter((brand) => brand.length >= 3);
    const words = tokens(trend.term);
    if (!brands.length && !words.length) continue;
    let best = null;
    for (const row of rows) {
      if (seen.has(row.key)) continue;
      const hits = [];
      let brandCount = 0;
      const label = fold(row.label);
      for (const item of row.list) {
        const blob = fold(`${item.brandName || ''} ${item.productName || ''}`);
        const brandHit = brands.some((brand) => blob.includes(brand));
        const wordHit = words.length > 0 && words.every((word) => blob.includes(word) || label.includes(word));
        if (!brandHit && !wordHit) continue;
        if (brandHit) brandCount += 1;
        hits.push(item);
      }
      if (!hits.length) continue;
      const score = brandCount * 10 + hits.length;
      if (!best || score > best.score) best = { row, hits, score };
    }
    if (!best) continue;
    seen.add(best.row.key);
    matches.push({
      key: best.row.key,
      label: best.row.label,
      world: best.row.world,
      fresh: best.hits.length,
      list: best.hits,
      onlyIds: best.hits.map((item) => item.id),
      trend
    });
  }
  return matches;
}

function dossierText({ dateLabel, recentLabels, trends, candidates, account }) {
  const trendLines = (trends || []).map((trend) => {
    const brands = (trend.brands || []).join(', ');
    const source = trend.source ? ` Fuente: ${trend.source}.` : '';
    return `- ${trend.term}${brands ? ` (${brands})` : ''}.${source} ${trend.why || ''}`.trim();
  });
  const blocks = (candidates || []).map((row) => {
    const lines = (row.products || []).map((product) => (
      `  - ${product.id} | ${product.brand} | ${product.name} | ${product.price}`
    ));
    const because = row.trend ? ` | se busca afuera: ${row.trend.term}` : '';
    return `${row.key} | ${row.label} | mundo ${row.world}${because}\n${lines.join('\n')}`;
  });
  return [
    `Fecha: ${dateLabel}.`,
    `Rubros ya publicados estos días, no los repitas: ${recentLabels.length ? recentLabels.join(', ') : 'ninguno'}.`,
    '',
    'Si un precio dice "antes" y un porcentaje, esa promoción existe en la tienda. Si no lo dice, no inventes un descuento.',
    '',
    'Cuenta de Zenn. Likes de Instagram, lo ya publicado y el stock. No son las ventas de la caja:',
    account || 'Sin resumen de cuenta en esta corrida.',
    '',
    'Qué se está comprando afuera, según la búsqueda. No son visitas de nuestra página:',
    trendLines.length ? trendLines.join('\n') : '- Esta corrida no tuvo búsqueda. Recorré el catálogo, un rubro distinto por publicación.',
    '',
    'Productos nuestros que coinciden o que toca subir para llenar el feed. El id es el primero. El precio es el nuestro. No inventes otro:',
    blocks.join('\n\n')
  ].join('\n');
}

module.exports = {
  matchTrends,
  dossierText,
  shelfCards
};

/**
 * Head SEO compartido por el middleware de Vercel.
 * No cambia el HTML de las personas: solo calcula título y canónico.
 */

export const SITE = 'https://www.zenn.com.py';

const ACRONYMS = {
  cpu: 'CPU',
  amd: 'AMD',
  intel: 'Intel',
  ssd: 'SSD',
  hdd: 'HDD',
  ram: 'RAM',
  usb: 'USB',
  nvme: 'NVMe',
  pc: 'PC',
  tv: 'TV',
  hdmi: 'HDMI',
  wifi: 'Wi-Fi',
  rgb: 'RGB',
  oled: 'OLED',
  lcd: 'LCD',
  gpu: 'GPU',
  atx: 'ATX'
};

export function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function humanizeTaxonomy(value) {
  const human = String(value || '')
    .replace(/__[\d_]+$/g, '')
    .replace(/__/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (human.length < 2) return '';
  return human
    .split(' ')
    .map((word) => {
      const key = word.toLowerCase();
      if (ACRONYMS[key]) return ACRONYMS[key];
      return key.charAt(0).toUpperCase() + key.slice(1);
    })
    .join(' ');
}

/** Misma idea que getSeoTitle cuando ya cargó el nombre de la categoría. */
export function categoryHeading(category, subcategory) {
  const sub = String(subcategory || '');
  const cat = String(category || '');
  if (/notebook/i.test(sub) || /notebook/i.test(cat)) {
    return 'Notebooks para estudio, oficina y gaming en Paraguay';
  }
  if (/celular|smartphone/i.test(sub)) {
    return 'Celulares y smartphones en Paraguay';
  }
  const specific = humanizeTaxonomy(sub) || humanizeTaxonomy(cat);
  if (specific) return `${specific} al mejor precio en Paraguay`;
  return 'Equipos de tecnología al mejor precio en Paraguay';
}

function stripTrailingSlash(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Canónico y, si aplica, título que debe verse en el primer HTML.
 * null = no tocar (carrito, admin, búsqueda, id de Mongo).
 */
export function planSeo(pathname, search) {
  const path = stripTrailingSlash(pathname || '/');
  const params = new URLSearchParams(search || '');

  if (path.startsWith('/producto/')) {
    const slug = decodeURIComponent(path.slice('/producto/'.length).split('/')[0] || '');
    if (!slug || /^[a-fA-F0-9]{24}$/.test(slug)) return null;
    return {
      kind: 'product',
      slug,
      canonical: `${SITE}/producto/${slug}`
    };
  }

  if (path === '/categoria-producto') {
    const category = params.get('category') || '';
    const subcategory = params.get('subcategory') || '';
    const clean = new URLSearchParams();
    if (category) clean.set('category', category);
    if (subcategory) clean.set('subcategory', subcategory);
    const q = clean.toString();
    const heading = categoryHeading(category, subcategory);
    return {
      kind: 'category',
      canonical: `${SITE}/categoria-producto${q ? `?${q}` : ''}`,
      title: `${heading} | Zenn Paraguay`,
      description: `Comprá ${heading.toLowerCase()} en Zenn Paraguay. Precio en guaraníes, stock real, garantía y envío a Asunción y todo el país.`
    };
  }

  if (path === '/') {
    return { kind: 'home', canonical: `${SITE}/` };
  }

  if (path === '/nosotros') {
    return {
      kind: 'static',
      canonical: `${SITE}/nosotros`,
      title: 'Nosotros | Zenn | Paraguay',
      description:
        'Somos Zenn, la tienda e-commerce líder de insumos informáticos en Paraguay. Descubre nuestra misión, visión y los servicios que ofrecemos.'
    };
  }

  if (path === '/devoluciones' || path === '/politica-de-devoluciones' || path === '/garantia') {
    return {
      kind: 'static',
      canonical: `${SITE}/devoluciones`,
      title: 'Política de Devoluciones y Garantía | Zenn Paraguay',
      description:
        'Devolvé en Zenn hasta 7 días después de la compra. Sin reembolso en efectivo: el valor se usa como crédito para otro producto. Consultá plazos de garantía por categoría y marca.'
    };
  }

  if (path === '/promociones') {
    return {
      kind: 'static',
      canonical: `${SITE}/promociones`,
      title: 'Promociones y Ofertas | Zenn',
      description:
        'Productos en promoción en Zenn Paraguay. Filtrá por categoría, subcategoría y especificaciones.'
    };
  }

  return null;
}

function replaceTag(html, pattern, next) {
  if (!pattern.test(html)) return html;
  return html.replace(pattern, () => next);
}

export function applyHead(html, meta) {
  if (!html || !meta || !meta.canonical) return html;
  let out = html;
  const canonical = escapeAttr(meta.canonical);
  const canonicalTag = `<link rel="canonical" href="${canonical}"/>`;

  if (/<link rel="canonical" href="[^"]*"\s*\/?>/i.test(out)) {
    out = replaceTag(out, /<link rel="canonical" href="[^"]*"\s*\/?>/i, canonicalTag);
  } else {
    out = out.replace('</head>', `${canonicalTag}\n</head>`);
  }

  out = replaceTag(
    out,
    /<meta property="og:url" content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}"/>`
  );

  if (meta.title) {
    const title = escapeAttr(meta.title);
    out = replaceTag(out, /<title>[^<]*<\/title>/i, `<title>${title}</title>`);
    out = replaceTag(
      out,
      /<meta property="og:title" content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${title}"/>`
    );
    out = replaceTag(
      out,
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${title}"/>`
    );
  }

  if (meta.description) {
    const description = escapeAttr(meta.description);
    out = replaceTag(
      out,
      /<meta name="description" content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${description}"/>`
    );
    out = replaceTag(
      out,
      /<meta property="og:description" content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${description}"/>`
    );
    out = replaceTag(
      out,
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${description}"/>`
    );
  }

  return out;
}

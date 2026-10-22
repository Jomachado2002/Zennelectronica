'use strict';

const COUNTRIES = {
  PRY: 'Paraguay',
  ARG: 'Argentina',
  BRA: 'Brasil',
  USA: 'Estados Unidos',
  ESP: 'España',
  URY: 'Uruguay',
  CHL: 'Chile',
  BOL: 'Bolivia',
  MEX: 'México',
  COL: 'Colombia',
  PER: 'Perú'
};

const DEVICES = {
  DESKTOP: 'Escritorio',
  MOBILE: 'Celular',
  TABLET: 'Tablet'
};

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(row) {
  return {
    keys: Array.isArray(row?.keys) ? row.keys : [],
    clicks: num(row?.clicks),
    impressions: num(row?.impressions),
    ctr: num(row?.ctr),
    position: num(row?.position)
  };
}

function shortUrl(url) {
  return String(url || '')
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
}

function pushLimited(list, item, cap) {
  const count = list.filter((entry) => entry.kind === item.kind).length;
  if (count >= cap) return;
  list.push(item);
}

function buildOpportunities({ queries = [], pages = [], queryPages = [], sitemaps = [] } = {}) {
  const opportunities = [];
  const usedQueries = new Set();
  const sortedQueries = queries.map(normalizeRow).sort((a, b) => b.impressions - a.impressions);

  for (const row of sortedQueries) {
    const query = row.keys[0];
    if (!query || row.impressions < 50 || row.position > 10 || row.ctr >= 0.02) continue;
    usedQueries.add(query);
    pushLimited(opportunities, {
      kind: 'ctr',
      severity: row.impressions >= 200 ? 'alta' : 'media',
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      title: `Poca gente hace clic en «${query}»`,
      detail: `Google ya muestra el sitio en la posición ${row.position.toFixed(1)}, ${Math.round(row.impressions)} veces, y solo el ${(row.ctr * 100).toFixed(1)}% entra.`,
      action: 'Reescribí el título y la descripción de la página que aparece: tienen que decir la búsqueda exacta, con un dato concreto como precio, stock o uso.'
    }, 6);
  }

  for (const row of sortedQueries) {
    const query = row.keys[0];
    if (!query || usedQueries.has(query)) continue;
    if (row.position < 4 || row.position > 10 || row.impressions < 40) continue;
    usedQueries.add(query);
    pushLimited(opportunities, {
      kind: 'top3',
      severity: row.impressions >= 150 ? 'alta' : 'media',
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      title: `«${query}» está cerca del top 3`,
      detail: `Posición media ${row.position.toFixed(1)} con ${Math.round(row.impressions)} impresiones. Ahí se concentra la mayor parte de los clics.`,
      action: 'Enlazá esa ficha desde la categoría y desde productos relacionados, y repetí la consulta en el título y en el primer párrafo.'
    }, 6);
  }

  for (const row of sortedQueries) {
    const query = row.keys[0];
    if (!query || usedQueries.has(query)) continue;
    if (row.position <= 10 || row.position > 20 || row.impressions < 25) continue;
    usedQueries.add(query);
    pushLimited(opportunities, {
      kind: 'page2',
      severity: 'media',
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      title: `«${query}» quedó en la segunda página`,
      detail: `Posición ${row.position.toFixed(1)}. Google ya entiende la página, pero casi nadie pasa de la primera.`,
      action: 'Ampliá la ficha con especificaciones, preguntas reales y enlaces desde páginas que ya rankean. No crees otra URL para la misma búsqueda.'
    }, 6);
  }

  for (const row of sortedQueries) {
    const query = row.keys[0];
    if (!query || usedQueries.has(query)) continue;
    if (row.clicks > 0 || row.impressions < 40) continue;
    usedQueries.add(query);
    pushLimited(opportunities, {
      kind: 'zero_clicks',
      severity: row.impressions >= 100 ? 'alta' : 'media',
      query,
      clicks: 0,
      impressions: row.impressions,
      ctr: 0,
      position: row.position,
      title: `«${query}» se muestra y nadie entra`,
      detail: `${Math.round(row.impressions)} impresiones y 0 clics, en la posición ${row.position.toFixed(1)}.`,
      action: 'El resultado no convence al lado de la competencia. Cambiá título y descripción para que se distingan: marca, precio o disponibilidad en Paraguay.'
    }, 5);
  }

  const byQuery = new Map();
  for (const raw of queryPages) {
    const row = normalizeRow(raw);
    const query = row.keys[0];
    const page = row.keys[1];
    if (!query || !page || row.impressions < 15) continue;
    if (!byQuery.has(query)) byQuery.set(query, []);
    byQuery.get(query).push({ page, ...row });
  }

  for (const [query, list] of byQuery) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.impressions - a.impressions);
    const [first, second] = list;
    if (second.impressions < 20) continue;
    if (first.impressions / second.impressions > 8) continue;
    pushLimited(opportunities, {
      kind: 'cannibal',
      severity: 'alta',
      query,
      page: first.page,
      clicks: first.clicks + second.clicks,
      impressions: first.impressions + second.impressions,
      ctr: 0,
      position: Math.min(first.position, second.position),
      title: `Varias páginas compiten por «${query}»`,
      detail: `${shortUrl(first.page)} y ${shortUrl(second.page)} se reparten la misma búsqueda.`,
      action: 'Elegí una sola URL para esa consulta. En las demás, enlacé hacia esa y evitá el mismo título.'
    }, 5);
  }

  const sortedPages = pages.map(normalizeRow).sort((a, b) => b.impressions - a.impressions);
  for (const row of sortedPages) {
    const page = row.keys[0];
    if (!page || row.position < 18 || row.impressions < 40 || row.clicks >= 5) continue;
    pushLimited(opportunities, {
      kind: 'weak_page',
      severity: 'media',
      page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      title: 'Esta página casi no entra en los resultados',
      detail: `${shortUrl(page)} tiene posición ${row.position.toFixed(1)} y ${Math.round(row.impressions)} impresiones.`,
      action: 'Revisá si el título coincide con búsquedas reales, si el texto es fino y si la URL está en el sitemap.'
    }, 5);
  }

  for (const sitemap of sitemaps) {
    const web = (sitemap.contents || []).find((item) => item.type === 'web');
    const submitted = num(web?.submitted);
    const indexed = num(web?.indexed);
    // La API marca indexed en 0 aunque haya páginas indexadas. Solo sirve si viene un número real.
    if (submitted >= 20 && indexed > 0 && indexed < submitted * 0.5) {
      pushLimited(opportunities, {
        kind: 'indexacion',
        severity: 'alta',
        impressions: submitted,
        clicks: indexed,
        ctr: submitted ? indexed / submitted : 0,
        position: 0,
        title: 'Google indexó menos de la mitad del sitemap',
        detail: `${Math.round(indexed)} indexadas de ${Math.round(submitted)} enviadas.`,
        action: 'Revisá fichas con noindex, canónicas cruzadas o contenido duplicado. Un sitemap grande no se indexa solo si las páginas se parecen.'
      }, 2);
    }
    if (num(sitemap.errors) > 0) {
      pushLimited(opportunities, {
        kind: 'sitemap',
        severity: 'alta',
        impressions: num(sitemap.errors),
        clicks: 0,
        ctr: 0,
        position: 0,
        title: 'El sitemap tiene errores',
        detail: `${num(sitemap.errors)} errores en ${sitemap.path || 'el sitemap'}.`,
        action: 'Corregí las URLs que Google rechazó antes de esperar más tráfico.'
      }, 2);
    }
  }

  const severityRank = { alta: 0, media: 1 };
  opportunities.sort((a, b) => (severityRank[a.severity] - severityRank[b.severity]) || (b.impressions - a.impressions));
  return opportunities.slice(0, 20);
}

function buildReading(summary, previous, days) {
  const clicks = Math.round(num(summary?.clicks));
  const impressions = Math.round(num(summary?.impressions));
  const ctr = num(summary?.ctr) * 100;
  const position = num(summary?.position);
  const monthly = days >= 28 ? impressions : Math.round(impressions * (30 / Math.max(days, 1)));
  const lines = [];

  if (!impressions) {
    lines.push('Google no devolvió impresiones en este rango. Si la propiedad se acaba de verificar, los datos tardan unos días.');
    return lines;
  }

  lines.push(
    `En estos ${days} días Google mostró el sitio ${impressions.toLocaleString('es-PY')} veces y ${clicks.toLocaleString('es-PY')} personas entraron desde la búsqueda. El clic es ${ctr.toFixed(1)}% y la posición media es ${position.toFixed(1)}.`
  );

  if (monthly < 50000) {
    lines.push(
      'Ese volumen está lejos de millones de personas. Google todavía no asocia el sitio con búsquedas grandes. El crecimiento sale de subir de posición en consultas que ya tienen demanda, y de indexar fichas que hoy no aparecen.'
    );
  } else if (monthly < 500000) {
    lines.push('Hay demanda visible. El siguiente salto está en pasar de la posición 4–20 a los primeros resultados, donde se concentra el clic.');
  }

  if (previous && num(previous.impressions) > 0) {
    const clickDiff = clicks - Math.round(num(previous.clicks));
    const impressionDiff = impressions - Math.round(num(previous.impressions));
    if (clickDiff > 0) lines.push(`Los clics subieron ${clickDiff.toLocaleString('es-PY')} respecto al período anterior.`);
    else if (clickDiff < 0) lines.push(`Los clics bajaron ${Math.abs(clickDiff).toLocaleString('es-PY')} respecto al período anterior.`);
    if (impressionDiff > 0) lines.push(`Las impresiones subieron ${impressionDiff.toLocaleString('es-PY')}.`);
    else if (impressionDiff < 0) lines.push(`Las impresiones bajaron ${Math.abs(impressionDiff).toLocaleString('es-PY')}.`);
  }

  return lines;
}

function labelCountry(code) {
  const key = String(code || '').toUpperCase();
  return COUNTRIES[key] || key || 'Otro';
}

function labelDevice(code) {
  return DEVICES[String(code || '').toUpperCase()] || code || 'Otro';
}

module.exports = {
  buildOpportunities,
  buildReading,
  labelCountry,
  labelDevice,
  normalizeRow,
  shortUrl
};

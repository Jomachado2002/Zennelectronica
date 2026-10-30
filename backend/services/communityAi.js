'use strict';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.COMMUNITY_AI_KEY || '';
}

function claudeKey() {
  return process.env.ANTHROPIC_API_KEY || '';
}

function parseJson(text) {
  const raw = String(text || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function scoutPrompt(dateLabel, account) {
  return `Sos el comprador de Zenn Electrónicos, en Asunción, Paraguay. Hoy es ${dateLabel}.
No mires la web de Zenn ni cuántas visitas tiene una tienda. Eso no dice qué quiere la gente.
Esto sí es de nuestra cuenta: qué publicación orgánica se movió, cuál no, y cuánto stock hay. No inventes likes. Si casi nada tuvo comentarios, el ángulo de afuera tiene que invitar a responder, no repetir un catálogo mudo.
${account || 'Hoy no hay resumen de la cuenta.'}

Buscá en Google qué se está comprando o destacando esta semana en electrónica, gamer, celulares y electrodomésticos.
Mirá Nissei, Cellshop, Bristol, Shopping China, Mercado Libre Paraguay y lo que está moviendo AliExpress.
Si la gente busca una marca, el término es esa marca y brands la repite. Ejemplo: DJI. Si busca notebooks gamer, el término es notebook gamer, no notebook a secas: el filtro de después se queda con los que tienen placa de video. Si son teclados gamer, el término es teclado gamer. Pensá en lo que la gente escribe para comprar, no en el producto más barato del rubro.

Devolvé solo JSON, sin precios de nadie:
{"trends":[{"term":"aspiradora dyson","brands":["Dyson"],"source":"Nissei","why":"qué encontraste, en una frase, sin números"}]}
Máximo 6. Si la búsqueda no lo muestra, no lo inventes. Si no hay fuente, source va vacío.`;
}

function writePrompt(dossier) {
  return `Sos el community manager de Zenn Electrónicos, en Asunción. Ya alguien fue a mirar qué se está comprando afuera. Abajo está eso, y al lado los productos que SÍ tenemos, con el precio nuestro en guaraníes.

${dossier}

Cómo decidir:
- Si una tendencia tiene productos nuestros, el primer feed es ese. Si afuera se buscan Dyson y en la lista hay Dyson, se publica la Dyson. No la cambies por otro rubro.
- Los ids de cada rubro ya están elegidos. Son los que se van a publicar. No los cambies por otros. Si el rubro es accesorios, esos ids son los accesorios que hay en stock.
- El hook es una frase para alguien que no nos sigue, usando un precio o una spec de esa lista. No nombres el precio de otra tienda. No escribas hashtags: el sistema los agrega.
- Prohibido, porque no frena el scroll: "nuevo ingreso", "imperdible", "aprovechá", "no te lo pierdas", "lo mejor", "increíble", "stock en Zenn", "mirá esto", "descubre". Si la frase sirve para cualquier producto, reescribila con el modelo, la spec o el precio.
- El día no puede ser un solo rubro. Si el primero es un electrodoméstico, los siguientes tienen que ser otra cosa: placa, accesorio, celular, periférico. Así el feed se llena de todo el catálogo.
- Historias: un id, el producto que se defiende solo por el precio.
- Si el dossier marca un precio con "antes" y un porcentaje, esa promoción existe. El primer feed de ese rubro tiene que usar esos ids. No inventes un descuento que no esté escrito.
- Sugerencias: no escribas una consigna genérica. Decidí la pieza. Si conviene mostrar tres productos de la misma marca a distinto precio, el título es concreto, por ejemplo "Sabías que estos teclados son hermanos". Si conviene una promoción, el título nombra esa promo y usa solo precios de la lista. Si conviene un dato, el título es ese dato. No pidas un meme con famosos ni fotos de personas: la pieza usa las fotos de nuestros productos.
- La cuenta dice qué publicación orgánica tuvo likes y cuál no, qué formato rindió más, qué busca la gente en la tienda, qué promo es real y qué marca tiene varios modelos. Una pieza para seguidores es una pregunta o una comparación con esos datos. No armes el día solo con el rubro que tiene más unidades.
- Si el dossier habla de Reintegro Tienda Naranja, cada hook lo dice en una frase. Es reintegro de Itaú, del 2 al 4 de noviembre, no un descuento del precio. 15% con tope de Gs. 350.000 en cualquier tarjeta de crédito Itaú. 20% con tope de Gs. 500.000 en Amex Platinum y Visa Infinite. Hasta 18 cuotas sin interés. Aplica a toda la tienda.
- Paleta, la pinta el sistema, no vos. No devuelvas HTML.

Devolvé solo JSON:
{
  "feeds": [{"subcategory":"id","productIds":["id"],"hook":"...","why":"qué se busca afuera y qué precio nuestro publicamos"}],
  "stories": [{"subcategory":"id","productId":"id","hook":"..."}],
  "suggestions": [
    {"type":"reel","subcategory":"id","title":"título que va en la pieza","subhead":"una frase con el rango de precios nuestros","brief":"qué tiene que entender quien lo ve","caption":"texto para Instagram, sin hashtags de más"},
    {"type":"imagen","subcategory":"id","title":"Sabías que estos ... son hermanos","subhead":"...","brief":"...","caption":"..."},
    {"type":"dato","subcategory":"id","title":"el dato concreto","subhead":"...","brief":"...","caption":"..."}
  ]
}`;
}

async function askGeminiText(prompt, withSearch, timeoutMs) {
  const key = apiKey();
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: withSearch ? 0.3 : 0.7 }
  };
  if (withSearch) body.tools = [{ google_search: {} }];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(timeoutMs) || (withSearch ? 18000 : 12000))
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Gemini respondió ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
}

async function askClaudeText(prompt, options = {}) {
  const key = claudeKey();
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: Math.max(1000, Number(options.maxTokens) || 6000),
    messages: [{ role: 'user', content: prompt }]
  };
  if (options.temperature != null) body.temperature = Number(options.temperature);
  const timeoutMs = Math.max(8000, Number(options.timeout) || 20000);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Claude respondió ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return (data.content || []).map((part) => part.text || '').join('\n');
}

async function askGemini(prompt, withSearch) {
  return parseJson(await askGeminiText(prompt, withSearch));
}

const FONT_PAIRS = [
  { display: 'Bebas Neue', text: 'Montserrat', mood: 'el cartel de Photoshop: título en mayúsculas enormes, precio en sans' },
  { display: 'Anton', text: 'Inter', mood: 'Impact de afiche, una frase que se lee de lejos' },
  { display: 'Archivo Black', text: 'Archivo', mood: 'bloque negro de campaña, pocas palabras' },
  { display: 'Oswald', text: 'Source Sans 3', mood: 'condensada de titular, la que se usa en banners' },
  { display: 'Barlow Condensed', text: 'Barlow', mood: 'DIN de pieza publicitaria, alta y apretada' },
  { display: 'Teko', text: 'Roboto', mood: 'deportiva de feed, título alto' },
  { display: 'Big Shoulders Display', text: 'Inter', mood: 'ancha de poster, como un logotipo de campaña' },
  { display: 'Staatliches', text: 'Nunito Sans', mood: 'caja alta de sticker' },
  { display: 'Russo One', text: 'Manrope', mood: 'geométrica pesada de anuncio' },
  { display: 'League Spartan', text: 'Outfit', mood: 'grotesca de marca, título muy bold' },
  { display: 'Montserrat', text: 'Montserrat', mood: 'la sans de redes: título en negro, cuerpo en regular' },
  { display: 'Poppins', text: 'Poppins', mood: 'redonda de contenido, título extrabold' },
  { display: 'Syne', text: 'Manrope', mood: 'display de estudio, título con carácter' },
  { display: 'Familjen Grotesk', text: 'Inter', mood: 'grotesca de campaña, limpia y grande' },
  { display: 'Alfa Slab One', text: 'Source Sans 3', mood: 'slab de afiche, título corto' },
  { display: 'Abril Fatface', text: 'Lato', mood: 'poster editorial, un titular enorme' },
  { display: 'Bodoni Moda', text: 'Jost', mood: 'contraste de revista, título fino y grande' },
  { display: 'Playfair Display', text: 'Karla', mood: 'portada, serif de atención con sans de precio' },
  { display: 'Cinzel', text: 'Montserrat', mood: 'mayúsculas de marca, con aire' },
  { display: 'Lilita One', text: 'Nunito', mood: 'cartel redondo que frena el scroll' },
  { display: 'Titan One', text: 'DM Sans', mood: 'display inflada, una pregunta corta' },
  { display: 'Bungee', text: 'DM Sans', mood: 'bloque urbano, pocas palabras' },
  { display: 'Permanent Marker', text: 'Inter', mood: 'marcador encima de la foto, el precio en sans' },
  { display: 'Bangers', text: 'Roboto', mood: 'cómic de meme, solo la frase; el dato va en sans' }
];

function fontHref(pair) {
  const q = (name) => String(name).trim().replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${q(pair.display)}&family=${q(pair.text)}:wght@400;700&display=swap`;
}

function fontPairFor(dateLabel, kind) {
  const seed = [...`${dateLabel || ''}${kind || ''}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FONT_PAIRS[seed % FONT_PAIRS.length];
}

const ART_LAYOUTS = [
  'El producto entra desde la derecha y se corta en el borde. El título vive a la izquierda, en cuatro palabras como máximo, a más de 90px.',
  'Partí el lienzo en dos campos de color distinto. Arriba una frase. Abajo el producto, grande, sin caja y sin círculo.',
  'El precio ocupa casi la mitad del alto. El producto queda chico, a un costado, como prueba de que el número es real.',
  'Tapa de revista: una línea chica arriba, un titular de tres palabras, el producto a sangre por un solo lado.',
  'El precio es un sello redondo que pisa al producto. El fondo es un color plano saturado, no un degradado violeta.',
  'Una sola spec enorme (Hz, RTX, pulgadas, GB) y debajo, en chico, por qué importa. El producto flota a la izquierda.'
];

async function designPieceHtml({ dateLabel, angle, kind, products, brief, title, fonts, campaign = false, attempts = 2, timeout = 50000 }) {
  if (!claudeKey()) return '';
  const lines = (products || []).map((item, index) => (
    `${index + 1}. ${item.name} · ${item.priceText}`
  )).join('\n');
  const pair = fonts && fonts.display ? fonts : fontPairFor(dateLabel, kind);
  const layoutSeed = [...`${dateLabel || ''}|${kind || ''}|${title || ''}|${(products && products[0] && products[0].name) || ''}`]
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const layout = ART_LAYOUTS[layoutSeed % ART_LAYOUTS.length];
  const floor = campaign
    ? 'Los últimos 420px del lienzo quedan vacíos: el sistema pega ahí el banner de Tienda Naranja. No lo dibujes, no escribas 15% ni 20%, no pongas el logo de Itaú.'
    : 'El texto y el precio terminan al menos a 80px del borde de abajo.';
  const prompt = `Sos director de arte de una tienda de electrónica en Asunción. Esta pieza se publica en Instagram y tiene que frenar el dedo. Lienzo exacto de 1080×1350. Si se puede cambiar el producto y la pieza sigue igual, está mal hecha.
Hoy es ${dateLabel}. Tipo de pieza: ${kind}.
Composición de ESTA pieza, obedecela. No la cambies por un producto centrado con el título arriba:
${layout}
Ángulo: ${angle || 'una razón concreta para comentar'}.
Encargo: ${brief || 'Una sola idea, leíble en medio segundo.'}
${title ? `El título, exacto y completo: ${title}` : 'El título nombra este modelo, esta spec o este precio. Máximo ocho palabras.'}
Productos reales. No inventes otro, ni un porcentaje, ni un dato que no esté acá:
${lines || 'No hay producto. Hacé la pieza solo con texto.'}

Tipografía de esta pieza, y no otra. Carácter: ${pair.mood}.
Título: ${pair.display}, enorme. Precio y nombre: ${pair.text}.
Link exacto, en el head:
<link href="${fontHref(pair)}" rel="stylesheet">
Devolvé solo un HTML, con el CSS en un <style>.
Placeholders, y ningún otro src de imagen: {{logo}} {{product1}} {{name1}} {{price1}} {{product2}} {{name2}} {{price2}}
El logo va en <img class="logo" src="{{logo}}" alt="">, chico, en una esquina, sin caja. No escribas la palabra Zenn aparte.
La foto ya viene recortada. Va en <img id="product-1" src="{{product1}}" alt="">, grande, sin tapar una letra.
Prohibido: fondo #fff o white, círculo blanco, tarjeta blanca detrás del producto, tres chips iguales, ficha de catálogo, degradado violeta de siempre, la frase "nuevo ingreso", Octubre Rosa, lazo rosa, fondo rosa de campaña.
Prohibido bajar fotos, memes, series o caras. El golpe es el texto más la foto del producto.
${floor}
Todo el texto entra. Nada cortado. El precio se lee entero.`;
  let last = '';
  for (let attempt = 0; attempt < Math.max(1, Number(attempts) || 1); attempt += 1) {
    const extra = attempt
      ? '\n\nLa respuesta anterior tenía blanco detrás del producto o le faltaba {{product1}}. Hacela de nuevo, con color de campo y el producto flotando.'
      : '';
    try {
      const html = extractHtml(await askClaudeText(`${prompt}${extra}`, { timeout, maxTokens: 8000, temperature: 0.9 }));
      last = html;
      if (!html.includes('<style') || /<script/i.test(html) || hasWhitePlate(html)) continue;
      if (products && products.length && !html.includes('{{product1}}')) continue;
      return html;
    } catch (error) {
      console.error('[community ai] html', error.message || error);
      if (timedOut(error)) break;
    }
  }
  return last && !hasWhitePlate(last) ? '' : '';
}

async function directPiece({ dateLabel, kind, label, products, trends, angle }) {
  if (!apiKey()) return null;
  const trendText = (trends || [])
    .map((item) => `${item.term}${item.source ? ` (${item.source})` : ''}: ${item.why || ''}`)
    .join('\n');
  const lines = (products || []).map((item) => `${item.name}${item.priceText ? ` · ${item.priceText}` : ''}`).join('\n');
  try {
    let raw = await askGemini(`Sos el community manager de Zenn Electrónicos, en Asunción. Hoy es ${dateLabel}.
Qué se está comprando afuera esta semana:
${trendText || 'No hubo búsqueda en vivo. No inventes precios de otras tiendas.'}
La pieza es un ${kind} del rubro ${label || 'catálogo'}. Tiene que frenar el scroll: una sola idea, con el nombre de este producto o su precio. Si la frase sirve para cualquier tienda, está mal.
${angle ? `Ángulo que hay que respetar: ${angle}` : ''}
Prohibido: "nuevo ingreso", "imperdible", "aprovechá", "no te lo pierdas", "lo mejor", "increíble", "descubre", "mirá esto", Octubre Rosa, lazo rosa.
Productos nuestros, con el precio de Zenn:
${lines || 'Elegí el ángulo sin nombrar un producto que no esté.'}
Devolvé solo JSON:
{"angle":"la idea en una frase concreta, para que alguien comente","title":"máximo ocho palabras, con el dato o el precio","brief":"composición distinta a un producto centrado: color de campo que no sea blanco ni violeta, qué es enorme y qué es chico"}
No pidas famosos, fondo blanco ni una ficha de catálogo. No inventes porcentajes ni decibeles.`, false);
    if (!raw || !raw.title) {
      raw = await askGemini(`Devolvé solo este JSON, sin texto alrededor, para una pieza ${kind} de ${label || 'Zenn'} el ${dateLabel}: {"angle":"una frase","title":"titulo corto","brief":"como disenarla sin fondo blanco"}`, false);
    }
    if (!raw) return null;
    return {
      angle: String(raw.angle || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      title: String(raw.title || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      brief: String(raw.brief || '').replace(/\s+/g, ' ').trim().slice(0, 400)
    };
  } catch (error) {
    console.error('[community ai] dirección', error.message || error);
    return null;
  }
}

async function steerTemplate(note, products) {
  if (!apiKey() || !String(note || '').trim()) return null;
  const lines = (products || []).map((item) => item.name).filter(Boolean).join(' · ');
  try {
    const raw = await askGemini(`El community manager quiere otra plantilla para una pieza de Zenn que ya existe.
Pedido: ${String(note).replace(/"/g, '').slice(0, 400)}
Productos que se quedan: ${lines || 'los que ya están'}.
Devolvé solo JSON:
{"angle":"la nueva idea en una frase","brief":"instrucción de diseño para rehacer el HTML: otro margen, otro tipo, otro color de campo que no sea blanco"}
No cambies el producto ni el precio. No pidas fotos de personas.`, false);
    if (!raw) return null;
    return {
      angle: String(raw.angle || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      brief: String(raw.brief || '').replace(/\s+/g, ' ').trim().slice(0, 400)
    };
  } catch (error) {
    console.error('[community ai] plantilla', error.message || error);
    return null;
  }
}

function cleanTrends(raw) {
  const list = Array.isArray(raw && raw.trends) ? raw.trends : [];
  const trends = [];
  for (const item of list) {
    const term = String(item && item.term || '').replace(/\s+/g, ' ').trim();
    if (term.length < 3) continue;
    const brands = [...new Set((item.brands || []).map((brand) => String(brand || '').trim()).filter((brand) => brand.length >= 2))];
    trends.push({
      term: term.slice(0, 80),
      brands: brands.slice(0, 4),
      source: String(item.source || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      why: String(item.why || '').replace(/\d[\d.]*/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
    });
    if (trends.length >= 6) break;
  }
  return trends;
}

async function scoutMarket({ dateLabel, account }) {
  if (!apiKey()) return [];
  try {
    const raw = await askGemini(scoutPrompt(dateLabel, account), true);
    return cleanTrends(raw);
  } catch (error) {
    console.error('[community ai] búsqueda de mercado', error.message || error);
    try {
      const raw = await askGemini(scoutPrompt(dateLabel, account), false);
      return cleanTrends(raw);
    } catch (second) {
      console.error('[community ai]', second.message || second);
      return [];
    }
  }
}

function knownIds(item, allowedProducts) {
  const allowed = new Set(allowedProducts);
  return [...new Set((item.productIds || []).map(String))].filter((id) => allowed.has(id)).slice(0, 5);
}

async function chooseCatalogDay({ dossier, catalog, feedLimit = 8, storyLimit = 4 }) {
  if (!apiKey() || !dossier) return null;
  const byKey = new Map(catalog.map((row) => [row.key, row]));
  let raw = null;
  try {
    raw = await askGemini(writePrompt(dossier), false);
  } catch (error) {
    console.error('[community ai] textos', error.message || error);
    return null;
  }
  if (!raw) return null;
  const feeds = [];
  for (const item of raw.feeds || []) {
    const row = byKey.get(item && item.subcategory);
    if (!row) continue;
    const productIds = knownIds(item, row.productIds);
    feeds.push({
      subcategory: row.key,
      productIds,
      hook: String(item.hook || '').slice(0, 220),
      why: String(item.why || '').slice(0, 300)
    });
    if (feeds.length >= Math.max(8, Number(feedLimit) || 8)) break;
  }
  if (!feeds.length) return null;
  const stories = [];
  for (const item of raw.stories || []) {
    const row = byKey.get(item && item.subcategory);
    if (!row) continue;
    const productId = knownIds({ productIds: [item.productId] }, row.productIds)[0] || '';
    stories.push({
      subcategory: row.key,
      productId,
      hook: String(item.hook || '').slice(0, 220)
    });
    if (stories.length >= Math.max(4, Number(storyLimit) || 4)) break;
  }
  return {
    feeds,
    stories,
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : []
  };
}

async function interpretRevision(note) {
  if (!apiKey() || !String(note || '').trim()) return null;
  try {
    const raw = await askGemini(`Un community manager pidió este cambio sobre una pieza de Instagram que ya está armada:
"${String(note).replace(/"/g, '').slice(0, 400)}"
Devolvé solo JSON {"background":"#RRGGBB","swapProduct":false}.
Si no nombra un color, background va "".
swapProduct es true si pide otro producto o dice que la foto no se recortó.`, false);
    if (!raw) return null;
    const background = /^#[0-9A-Fa-f]{6}$/.test(raw.background || '') ? raw.background : '';
    return { background, swap: Boolean(raw.swapProduct) };
  } catch (error) {
    console.error('[community ai] modificación', error.message || error);
    return null;
  }
}

async function askDayChat({ note, posts, labels, history, angle }) {
  if (!apiKey()) return null;
  const memory = (history || [])
    .slice(-8)
    .map((item) => `${item.role === 'user' ? 'Vos' : 'Plan'}: ${item.text}`)
    .join('\n');
  try {
    const raw = await askGemini(`Sos el community manager de Zenn Electrónicos, en Asunción. Hablás en un chat corto, como una persona, no como un formulario.
Octubre Rosa está cerrado. No lo menciones para usarlo. Si queda en un texto, se saca.
${angle ? `Ángulo de esta fecha: ${angle.brief}` : 'No hay campaña de fecha. Si piden Halloween, Navidad u otra fecha, anotalo.'}
Historial:
${memory || 'Todavía no hablaron.'}
Plan de ese día:
${(posts || []).map((post) => `${post.slot} · ${post.kind} · ${post.subcategoryLabel} · ${(post.titles || []).slice(0, 3).join(' · ')}`).join('\n')}
Rubros con stock: ${(labels || []).slice(0, 80).join(', ')}
Mensaje nuevo: ${String(note || '').slice(0, 500)}
Devolvé solo JSON:
{"reply":"2 o 3 frases. Decí qué vas a cambiar y qué queda. Si solo pide opinión, respondé sin inventar un cambio.","ops":[{"type":"replace","from":"monitores","to":"memoria ram","brand":""}]}
type replace cambia un rubro. type add mete un rubro, brand si nombró marca, all true si dijo todas. type mix separa un grupo en productos distintos. type photo si habla de la foto, el texto de la gráfica o que no llama la atención. type angle si pide una campaña o una fecha: note es la instrucción corta para los copys, por ejemplo Halloween y jugar de noche. Si no hay que tocar piezas, ops va [].`, false);
    if (!raw) return null;
    const ops = Array.isArray(raw.ops) ? raw.ops.filter((op) => op && ['replace', 'add', 'mix', 'photo', 'angle'].includes(op.type)).slice(0, 6) : [];
    return {
      reply: String(raw.reply || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      ops
    };
  } catch (error) {
    console.error('[community ai] chat', error.message || error);
    return null;
  }
}

async function askDayOps({ note, posts, labels }) {
  if (!apiKey()) return null;
  try {
    const raw = await askGemini(`El community manager quiere cambiar el plan de un día de Zenn. No inventes rubros ni marcas que no estén en el pedido o en la lista.
Plan:
${(posts || []).map((post) => `${post.slot} · ${post.kind} · ${post.subcategoryLabel} · ${(post.titles || []).length} productos`).join('\n')}
Rubros con stock: ${(labels || []).slice(0, 80).join(', ')}
Pedido: ${String(note || '').slice(0, 500)}
Devolvé solo JSON:
{"ops":[{"type":"replace","from":"monitores","to":"memoria ram","brand":""},{"type":"add","to":"notebook","brand":"Acer","all":true},{"type":"mix","from":"auriculares","count":5},{"type":"photo","note":"el cambio de la foto"}]}
type replace cambia un rubro por otro. type add mete un rubro, con brand si nombró una marca y all true si dijo todas. type mix cambia un grupo del mismo rubro por productos distintos. type photo solo si habla del texto, la tipografía, la sombra o la posición de la foto. Si no hay cambio, ops va vacío.`, false);
    const ops = Array.isArray(raw && raw.ops) ? raw.ops : null;
    if (!ops) return null;
    return ops
      .filter((op) => op && ['replace', 'add', 'mix', 'photo'].includes(op.type))
      .slice(0, 6);
  } catch (error) {
    console.error('[community ai] día', error.message || error);
    return null;
  }
}

function communityAiReady() {
  return Boolean(apiKey());
}

function claudeReady() {
  return Boolean(claudeKey());
}

function extractHtml(text) {
  const raw = String(text || '').replace(/```html|```/gi, '');
  const start = raw.search(/<(!doctype|html|div|style)/i);
  if (start < 0) return '';
  return raw.slice(start).trim();
}

function timedOut(error) {
  return Boolean(error) && (
    error.name === 'TimeoutError'
    || error.name === 'AbortError'
    || /aborted|timeout/i.test(String(error.message || ''))
  );
}

function hasWhitePlate(html) {
  return /background\s*:\s*(#fff\b|#ffffff\b|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i.test(html);
}

async function revisePieceHtml({ html, note, products }) {
  if (!claudeKey()) {
    const error = new Error('Falta la clave de Claude. Sin eso no se modifica el HTML.');
    error.statusCode = 400;
    throw error;
  }
  const list = products || [];
  const lines = list.map((item, index) => (
    `${index + 1}. ${item.name} · ${item.price}. Placeholders: {{product${index + 1}}} {{name${index + 1}}} {{price${index + 1}}}`
  )).join('\n');
  const keep = ['{{logo}}'].concat(list.flatMap((_, index) => [
    `{{product${index + 1}}}`,
    `{{name${index + 1}}}`,
    `{{price${index + 1}}}`
  ])).join(' ');
  const base = `Sos el director de arte de Zenn Electrónicos, en Asunción. Te paso el HTML de una pieza de 1080×1350 que ya está armada.
Cambio que pide el community manager:
${note}

Productos reales. No inventes otro ni cambies el precio:
${lines || 'No hay producto nuevo.'}

Devolvé solo el HTML, con el CSS adentro.
Conservá estos placeholders tal cual. No los cambies por una url ni por una foto: ${keep}
La foto va en <img id="product-1" src="{{product1}}" alt=""> grande, flotando, sin tarjeta y sin fondo blanco detrás.
Si el pedido cambia el texto, cambialo. Si pide otra tipografía o otra plantilla, cargá una pareja nueva de Google Fonts y que se note que no es la misma pieza. El logo queda en <img class="logo" src="{{logo}}" alt="">, sin fondo ni caja.
No uses script. No bajes imágenes de internet, ni de series, ni caras de personas. El logo queda en {{logo}}, no lo redibujes.
Tiene que parecer hecha por un diseñador: otro margen, otra escala, otro tipo. No una plantilla de catálogo.
Si hay un div con class="tn-zocalo" o un src {{banner}}, no lo borres y no escribas encima: son los últimos 420px, el zócalo de Tienda Naranja.
Prohibido repetir la composición anterior. Cambiá el eje, el tamaño del título y el color de campo.

HTML actual:
${html}`;
  let last = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const extra = attempt
      ? '\n\nLa respuesta anterior tenía blanco detrás del producto o le faltaba {{product1}}. Hacela de nuevo, sin superficie blanca, con el producto flotando.'
      : '';
    try {
      const text = await askClaudeText(`${base}${extra}`, { timeout: 70000, maxTokens: 8000 });
      const next = extractHtml(text);
      last = next;
      if (!next || /<script/i.test(next) || next.length > 80000) continue;
      if (list.length && !next.includes('{{product1}}')) continue;
      if (!/<style|style\s*=/.test(next)) continue;
      if (hasWhitePlate(next)) continue;
      return next;
    } catch (error) {
      console.error('[community ai] html', error.message || error);
      if (error.statusCode) throw error;
      if (timedOut(error)) break;
    }
  }
  if (last && hasWhitePlate(last)) return '';
  return '';
}

module.exports = {
  scoutMarket,
  chooseCatalogDay,
  designPieceHtml,
  directPiece,
  steerTemplate,
  interpretRevision,
  revisePieceHtml,
  askDayOps,
  askDayChat,
  askGeminiText,
  askClaudeText,
  parseJson,
  communityAiReady,
  claudeReady
};

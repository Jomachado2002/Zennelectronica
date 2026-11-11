const STORAGE_KEY = 'zenn_shipping_intent';

/**
 * Intención de envío solo cuando el visitante llega por una landing SEO (?envio=slug).
 * No adivina ciudad: si no hay landing, el cliente la dice por WhatsApp o al comprar.
 */
export function setShippingIntent(place) {
  if (typeof window === 'undefined' || !place?.slug || !place?.name) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        slug: place.slug,
        name: place.name,
        departmentName: place.departmentName || ''
      })
    );
  } catch {
    /* ignore */
  }
}

export function getShippingIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearShippingIntent() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function shippingPlaceLabel(intent = getShippingIntent()) {
  if (!intent?.name) return '';
  if (intent.departmentName && intent.departmentName !== intent.name) {
    return `${intent.name}, ${intent.departmentName}`;
  }
  return intent.name;
}

export function buildWhatsAppHref(baseText, { appendShipping = true } = {}) {
  const intent = getShippingIntent();
  const place = shippingPlaceLabel(intent);
  let text = String(baseText || 'Hola, quiero consultar por un producto de Zenn.').trim();
  if (appendShipping) {
    if (place) {
      if (!text.toLowerCase().includes('envío a') && !text.toLowerCase().includes('envio a')) {
        text += `\n\nQuiero envío a ${place}.`;
      }
    } else if (!/todo paraguay/i.test(text)) {
      text += `\n\n¿Hacen envío a mi ciudad? (envían a todo Paraguay)`;
    }
  }
  return `https://wa.me/595973345284?text=${encodeURIComponent(text)}`;
}

import SummaryApi from '../common';

const VISITOR_KEY = 'zenn_visitor_id';
const EMAIL_KEY = 'zenn_visitor_email';
const QUEUE_KEY = 'zenn_event_queue';
const MAX_QUEUE = 25;
const COOKIE_ID = 'zenn_vid';
const COOKIE_MAIL = 'zenn_correo';

function readCookie(name) {
    try {
        const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
        return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
    } catch (error) {
        return '';
    }
}

function writeCookie(name, value) {
    try {
        document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=34560000; Path=/; SameSite=Lax`;
    } catch (error) {
        // Sin cookies el identificador queda en el almacenamiento local.
    }
}

function visitorId() {
    try {
        let id = localStorage.getItem(VISITOR_KEY) || readCookie(COOKIE_ID);
        if (!id) {
            id = (crypto.randomUUID && crypto.randomUUID()) || `v-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
        localStorage.setItem(VISITOR_KEY, id);
        writeCookie(COOKIE_ID, id);
        return id;
    } catch (error) {
        return readCookie(COOKIE_ID);
    }
}

function readQueue() {
    try {
        const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        return Array.isArray(raw) ? raw.slice(-MAX_QUEUE) : [];
    } catch (error) {
        return [];
    }
}

function writeQueue(events) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
    } catch (error) {
        // El navegador puede bloquear el almacenamiento. La tanda en memoria sigue.
    }
}

let timer = null;

export function getVisitorId() {
    return visitorId();
}

export function getStoredVisitorEmail() {
    try {
        return localStorage.getItem(EMAIL_KEY) || '';
    } catch (error) {
        return '';
    }
}

export function rememberVisitorEmail(email) {
    try {
        localStorage.setItem(EMAIL_KEY, email);
    } catch (error) {
        // Sin almacenamiento local el correo igual queda en el servidor.
    }
    writeCookie(COOKIE_MAIL, '1');
}

export function forgetVisitorEmail() {
    try {
        localStorage.removeItem(EMAIL_KEY);
    } catch (error) {
        // Sin almacenamiento local alcanza con borrar la cookie.
    }
    try {
        document.cookie = `${COOKIE_MAIL}=; Max-Age=0; Path=/; SameSite=Lax`;
    } catch (error) {
        // La próxima consulta al servidor vuelve a decidir.
    }
}

export function hasVisitorEmail() {
    return Boolean(getStoredVisitorEmail() || readCookie(COOKIE_MAIL) === '1');
}

export async function syncEmailCapture() {
    const id = visitorId();
    if (!id) return hasVisitorEmail();
    try {
        const response = await fetch(`${SummaryApi.baseURL}/api/analitica/correo?visitorId=${encodeURIComponent(id)}`);
        const data = await response.json();
        if (data?.captured) {
            writeCookie(COOKIE_MAIL, '1');
            try {
                if (!localStorage.getItem(EMAIL_KEY)) localStorage.setItem(EMAIL_KEY, 'guardado');
            } catch (error) {
                // La cookie alcanza para no volver a preguntar.
            }
            return true;
        }
        forgetVisitorEmail();
        return false;
    } catch (error) {
        return hasVisitorEmail();
    }
}

export function trackEvent(event) {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.includes('/panel-admin')) return;
    const id = visitorId();
    if (!id) return;
    const queue = readQueue();
    queue.push({ ...event, at: Date.now() });
    writeQueue(queue);
    if (queue.length >= 15) {
        flushEvents();
        return;
    }
    clearTimeout(timer);
    timer = setTimeout(flushEvents, 15000);
}

export function trackProduct(type, product, extra = {}) {
    if (!product?._id && !product?.productId) return;
    const source = product.productId && typeof product.productId === 'object' ? product.productId : product;
    trackEvent({
        type,
        productId: source._id || product.productId,
        name: source.productName || source.name || '',
        category: source.category || '',
        brand: source.brandName || source.brand || '',
        price: source.sellingPrice || source.price || 0,
        ...extra
    });
}

export function syncCart(items) {
    const compact = (Array.isArray(items) ? items : []).slice(0, 15).map((item) => {
        const source = item.productId && typeof item.productId === 'object' ? item.productId : item;
        return {
            productId: source._id || item.productId,
            name: source.productName || '',
            category: source.category || '',
            price: source.sellingPrice || 0,
            quantity: item.quantity || 1
        };
    }).filter((item) => item.productId);
    trackEvent({ type: 'cart_sync', items: compact });
    flushEvents();
}

export async function captureVisitorEmail(email, source) {
    const id = visitorId();
    const response = await fetch(`${SummaryApi.baseURL}/api/analitica/correo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: id, email, source })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo guardar el correo');
    }
    rememberVisitorEmail(email);
    return data;
}

export function flushEvents() {
    const id = visitorId();
    const events = readQueue();
    if (!id || !events.length) return;
    writeQueue([]);
    const body = JSON.stringify({ visitorId: id, events });
    const url = `${SummaryApi.baseURL}/api/analitica/eventos`;
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            const queued = navigator.sendBeacon(url, blob);
            if (queued) return;
        }
    } catch (error) {
        // Sigue el envío normal.
    }
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
    }).catch(() => {
        const pending = readQueue();
        writeQueue([...events, ...pending].slice(-MAX_QUEUE));
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushEvents);
}

const {
    recordEvents,
    captureEmail,
    emailAlreadyCaptured,
    adminOverview,
    suggestionsForVisitor,
    homeRowForVisitor,
    preferredCategoryForVisitor,
    cartRestorePayload,
    productCartPayload
} = require('../../services/analyticsService');
const { processPendingEmails } = require('../../services/analyticsMailer');

const hits = new Map();

function clientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return (forwarded || req.ip || '').replace(/^::ffff:/, '').slice(0, 64);
}

function allow(ip) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const current = hits.get(ip) || [];
    const recent = current.filter((time) => now - time < windowMs);
    if (recent.length >= 80) return false;
    recent.push(now);
    hits.set(ip, recent);
    return true;
}

const ingestEventsController = async (req, res) => {
    try {
        const ip = clientIp(req);
        if (!allow(ip || 'local')) {
            return res.status(429).json({ success: false, message: 'Demasiados eventos' });
        }
        const result = await recordEvents(req.body?.visitorId, req.body?.events, ip);
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudieron guardar los eventos' });
    }
};

const emailStatusController = async (req, res) => {
    try {
        const captured = await emailAlreadyCaptured(req.query.visitorId);
        return res.json({ success: true, captured });
    } catch (error) {
        return res.status(500).json({ success: false, captured: false });
    }
};

const captureEmailController = async (req, res) => {
    try {
        const result = await captureEmail(req.body || {});
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error });
        }
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudo guardar el correo' });
    }
};

const adminOverviewController = async (req, res) => {
    try {
        const data = await adminOverview();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudo cargar el análisis' });
    }
};

const suggestionsController = async (req, res) => {
    try {
        const cartIds = String(req.query.cart || '')
            .split(',')
            .map((value) => value.trim())
            .filter((value) => /^[a-f\d]{24}$/i.test(value))
            .slice(0, 15);
        const products = await suggestionsForVisitor(req.query.visitorId, clientIp(req), cartIds);
        return res.json({ success: true, data: products });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudieron armar las sugerencias' });
    }
};

const homeRowController = async (req, res) => {
    try {
        const products = await homeRowForVisitor(req.query.visitorId, clientIp(req));
        return res.json({ success: true, data: products });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudo armar la fila' });
    }
};

const preferredCategoryController = async (req, res) => {
    try {
        const category = await preferredCategoryForVisitor(req.query.visitorId, clientIp(req));
        return res.json({ success: true, data: { category } });
    } catch (error) {
        return res.status(500).json({ success: false, data: { category: '' } });
    }
};

function storeUrl() {
    return (process.env.FRONTEND_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
}

function cartRestoreHtml(items) {
    const store = storeUrl();
    const next = `${store}/carrito`;
    if (!items) {
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Carrito</title></head><body style="font-family:Arial,sans-serif;padding:40px;text-align:center;"><p>No encontramos los productos de este carrito.</p><p><a href="${next}">Ir a la tienda</a></p></body></html>`;
    }
    if (!items.length) {
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Carrito</title></head><body style="font-family:Arial,sans-serif;padding:40px;text-align:center;"><p>Este carrito ya no tiene productos.</p><p><a href="${next}">Ir a la tienda</a></p></body></html>`;
    }
    const literal = JSON.stringify(items).replace(/</g, '\\u003c');
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cargando carrito</title></head><body style="font-family:Arial,sans-serif;padding:40px;text-align:center;"><p>Estamos armando su carrito…</p><script>try{localStorage.setItem('cartItems',JSON.stringify(${literal}));}catch(e){}location.replace(${JSON.stringify(next)});</script></body></html>`;
}

const restoreCartController = async (req, res) => {
    try {
        const ip = clientIp(req);
        if (!allow(ip || 'local')) {
            return res.status(429).json({ success: false, message: 'Demasiadas consultas' });
        }
        const items = await cartRestorePayload(req.params.token);
        if (req.query.formato === 'json') {
            return res.json({ success: !!items, data: { items: items || [] } });
        }
        res.set('Cache-Control', 'no-store');
        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.status(items ? 200 : 404).send(cartRestoreHtml(items));
    } catch (error) {
        return res.status(500).json({ success: false, data: { items: [] } });
    }
};

const buyProductController = async (req, res) => {
    try {
        const ip = clientIp(req);
        if (!allow(ip || 'local')) {
            return res.status(429).json({ success: false, message: 'Demasiadas consultas' });
        }
        const items = await productCartPayload(req.params.productId);
        if (req.query.formato === 'json') {
            return res.json({ success: !!items, data: { items: items || [] } });
        }
        res.set('Cache-Control', 'no-store');
        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.status(items && items.length ? 200 : 404).send(cartRestoreHtml(items && items.length ? items : []));
    } catch (error) {
        return res.status(500).json({ success: false, data: { items: [] } });
    }
};

const sendPendingEmailsController = async (req, res) => {
    try {
        const sent = await processPendingEmails();
        return res.json({ success: true, data: sent });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'No se pudieron enviar los correos' });
    }
};

module.exports = {
    ingestEventsController,
    captureEmailController,
    emailStatusController,
    adminOverviewController,
    suggestionsController,
    homeRowController,
    preferredCategoryController,
    restoreCartController,
    buyProductController,
    sendPendingEmailsController
};

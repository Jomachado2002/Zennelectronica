const fs = require('fs');
const path = require('path');
const Product = require('../models/productModel');
const VisitorProfile = require('../models/visitorProfile');
const BancardTransaction = require('../models/bancardTransactionModel');
const { sendSimpleEmail, formatToPYG } = require('./brevoService');
const { ensureCartRestoreToken } = require('./analyticsService');

const DAY_MS = 24 * 60 * 60 * 1000;
const CART_WAIT_MS = DAY_MS;
const CART_WINDOW_MS = 4 * DAY_MS;
const CART_GAP_MS = DAY_MS;
const SUGGESTION_WAIT_MS = 2 * 60 * 60 * 1000;
const DWELL_MS = 60 * 1000;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH = 15;

const CART_NOTES = [
    'Guardamos este producto en su carrito. Sigue disponible. Puede completar la compra desde este correo.',
    'Su producto sigue disponible. Puede volver a su carrito y pagarlo hoy.',
    'Este es el último aviso. El producto sigue disponible y puede pagarlo desde aquí.'
];
const CART_SUBJECTS = [
    'Su producto sigue disponible',
    'Puede terminar su compra hoy',
    'Último aviso: su producto sigue disponible'
];

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function productCard({ name, image, price, url, quantity }) {
    return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e0e0e0; margin: 0 0 12px 0;">
            <tr>
                <td width="128" style="padding: 16px; vertical-align: middle;">
                    <a href="${escapeHtml(url)}" style="text-decoration: none;">
                        <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="96" style="display: block; width: 96px; height: auto; border: 0;">
                    </a>
                </td>
                <td style="padding: 16px 16px 16px 0; vertical-align: middle;">
                    <a href="${escapeHtml(url)}" style="font-size: 15px; color: #222222; font-weight: 600; text-decoration: none;">${escapeHtml(name)}</a>
                    <p style="font-size: 13px; color: #777777; margin: 8px 0 0 0;">Cantidad: ${escapeHtml(quantity || 1)}</p>
                    <p style="font-size: 16px; color: #373592; font-weight: 600; margin: 6px 0 0 0;">${escapeHtml(formatToPYG(Number(price) || 0))}</p>
                </td>
            </tr>
        </table>`;
}

function storeUrl() {
    return (process.env.FRONTEND_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
}

function productUrl(product) {
    if (product?.slug) return `${storeUrl()}/producto/${product.slug}`;
    return `${storeUrl()}/producto/${product?._id || ''}`;
}

function cartRestoreUrl(token) {
    return `${storeUrl()}/api/analitica/carrito/${token}`;
}

function imageOf(product) {
    const image = Array.isArray(product?.productImage) ? product.productImage[0] : product?.image;
    return image || 'https://www.zenn.com.py/logozenn.png';
}

async function loadProducts(ids) {
    const valid = ids.filter((id) => /^[a-f\d]{24}$/i.test(String(id)));
    if (!valid.length) return [];
    const products = await Product.find({ _id: { $in: valid }, stock: { $gt: 0 } })
        .select('productName productImage sellingPrice category slug')
        .lean();
    const byId = new Map(products.map((product) => [String(product._id), product]));
    return valid.map((id) => byId.get(String(id))).filter(Boolean);
}

async function relatedProducts(category, excludeIds) {
    if (!category) return [];
    return Product.find({
        category,
        stock: { $gt: 0 },
        _id: { $nin: excludeIds }
    })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select('productName productImage sellingPrice category slug')
        .lean();
}

function fillTemplate(file, replacements) {
    let html = fs.readFileSync(path.join(__dirname, '../email-templates', file), 'utf8');
    Object.entries(replacements).forEach(([key, value]) => {
        html = html.replaceAll(key, value);
    });
    return html;
}

async function sendCartEmail(profile) {
    const token = await ensureCartRestoreToken(profile);
    if (!token) return false;
    const ids = profile.cartItems.map((item) => item.productId);
    const products = await loadProducts(ids);
    if (!products.length) return false;
    const first = products[0];
    const extra = products.slice(1).map((product) => productCard({
        name: product.productName,
        image: imageOf(product),
        price: product.sellingPrice,
        url: productUrl(product),
        quantity: profile.cartItems.find((item) => String(item.productId) === String(product._id))?.quantity || 1
    })).join('');
    const qty = profile.cartItems.find((item) => String(item.productId) === String(first._id))?.quantity || 1;
    const html = fillTemplate('carrito-abandonado.html', {
        '{{ params.clientName }}': 'Cliente',
        '{{ params.productName }}': escapeHtml(first.productName),
        '{{ params.productImage }}': escapeHtml(imageOf(first)),
        '{{ params.productPrice }}': escapeHtml(formatToPYG(first.sellingPrice || 0)),
        '{{ params.productQuantity }}': escapeHtml(qty),
        '{{ params.productUrl }}': escapeHtml(productUrl(first)),
        '{{ params.cartUrl }}': escapeHtml(cartRestoreUrl(token)),
        '{{ params.extraItemsHtml }}': extra,
        '{{ params.reminderNote }}': escapeHtml(CART_NOTES[Math.min(profile.cartEmailCount || 0, 2)])
    });
    const result = await sendSimpleEmail({
        to: [{ email: profile.email, name: 'Cliente' }],
        sender: { email: 'hola@zenn.com.py', name: 'ZENN' },
        replyTo: { email: 'hola@zenn.com.py', name: 'ZENN' },
        subject: CART_SUBJECTS[Math.min(profile.cartEmailCount || 0, 2)],
        htmlContent: html
    });
    return !!result.success;
}

async function sendSuggestionEmail(profile) {
    const watched = [...(profile.recentProducts || [])]
        .filter((item) => (item.durationMs || 0) >= DWELL_MS)
        .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))[0];
    if (!watched?.productId) return false;
    const [main] = await loadProducts([watched.productId]);
    if (!main) return false;
    const related = await relatedProducts(main.category, [main._id]);
    const extra = related.map((product) => productCard({
        name: product.productName,
        image: imageOf(product),
        price: product.sellingPrice,
        url: productUrl(product)
    })).join('');
    const html = fillTemplate('sugerencias-producto.html', {
        '{{ params.clientName }}': 'Cliente',
        '{{ params.productName }}': escapeHtml(main.productName),
        '{{ params.productImage }}': escapeHtml(imageOf(main)),
        '{{ params.productPrice }}': escapeHtml(formatToPYG(main.sellingPrice || 0)),
        '{{ params.productUrl }}': escapeHtml(productUrl(main)),
        '{{ params.extraItemsHtml }}': extra
    });
    const result = await sendSimpleEmail({
        to: [{ email: profile.email, name: 'Cliente' }],
        sender: { email: 'hola@zenn.com.py', name: 'ZENN' },
        replyTo: { email: 'hola@zenn.com.py', name: 'ZENN' },
        subject: `${main.productName} sigue disponible`,
        htmlContent: html
    });
    return !!result.success;
}

async function alreadyBought(profile) {
    const ids = (profile.cartItems || []).map((item) => String(item.productId || '')).filter(Boolean);
    if (!ids.length || !profile.email) return false;
    const since = new Date((profile.cartUpdatedAt ? new Date(profile.cartUpdatedAt).getTime() : Date.now()) - 60 * 60 * 1000);
    const orders = await BancardTransaction.find({
        status: 'approved',
        createdAt: { $gte: since },
        'customer_info.email': profile.email,
        'items.product_id': { $in: ids }
    }).select('items.product_id').limit(8).lean();
    const bought = new Set();
    orders.forEach((order) => {
        (order.items || []).forEach((item) => bought.add(String(item.product_id || '')));
    });
    return ids.every((id) => bought.has(id));
}

async function processPendingEmails() {
    const now = Date.now();
    const cartBefore = new Date(now - CART_WAIT_MS);
    const cartAfter = new Date(now - CART_WINDOW_MS);
    const gap = new Date(now - CART_GAP_MS);
    const cooldown = new Date(now - COOLDOWN_MS);
    const sent = { cart: 0, suggestions: 0, failed: 0 };

    const carts = await VisitorProfile.find({
        email: { $nin: ['', null] },
        'cartItems.0': { $exists: true },
        cartUpdatedAt: { $lte: cartBefore, $gte: cartAfter },
        $and: [
            {
                $or: [
                    { cartEmailCount: { $lt: 3 } },
                    { cartEmailCount: { $exists: false } },
                    { cartEmailCount: null }
                ]
            },
            {
                $or: [
                    { lastCartEmailAt: null },
                    { lastCartEmailAt: { $exists: false } },
                    { lastCartEmailAt: { $lte: gap } }
                ]
            }
        ]
    }).limit(BATCH);

    for (const profile of carts) {
        try {
            if (await alreadyBought(profile)) {
                profile.cartEmailCount = 3;
                await profile.save();
                continue;
            }
            const ok = await sendCartEmail(profile);
            if (!ok) {
                sent.failed += 1;
                continue;
            }
            profile.lastCartEmailAt = new Date();
            profile.cartEmailCount = Math.min(3, (profile.cartEmailCount || 0) + 1);
            await profile.save();
            sent.cart += 1;
        } catch (error) {
            sent.failed += 1;
        }
    }

    const watchers = await VisitorProfile.find({
        email: { $nin: ['', null] },
        cartItems: { $size: 0 },
        lastSeenAt: { $lte: new Date(now - SUGGESTION_WAIT_MS) },
        recentProducts: { $elemMatch: { durationMs: { $gte: DWELL_MS } } },
        $or: [{ lastSuggestionEmailAt: null }, { lastSuggestionEmailAt: { $exists: false } }, { lastSuggestionEmailAt: { $lte: cooldown } }]
    }).limit(BATCH);

    for (const profile of watchers) {
        try {
            const ok = await sendSuggestionEmail(profile);
            if (!ok) {
                sent.failed += 1;
                continue;
            }
            profile.lastSuggestionEmailAt = new Date();
            await profile.save();
            sent.suggestions += 1;
        } catch (error) {
            sent.failed += 1;
        }
    }

    return sent;
}

module.exports = { processPendingEmails, sendCartEmail };

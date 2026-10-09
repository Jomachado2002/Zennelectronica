'use strict';

const { formatToPYG, escapeHtml } = require('./brevoService');

const IG_URL = 'https://www.instagram.com/zennelectronicos/';
const BRAND = '#2A3190';
const ACCENT = '#7B2CBF';

function storeUrl() {
    return (process.env.FRONTEND_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
}

function money(value) {
    return escapeHtml(formatToPYG(Number(value) || 0));
}

function productHref(product) {
    if (product?.slug) return `${storeUrl()}/producto/${product.slug}`;
    return `${storeUrl()}/producto/${product?._id || ''}`;
}

function imageOf(product) {
    const image = Array.isArray(product?.productImage) ? product.productImage[0] : '';
    if (!image) return `${storeUrl()}/logo.png`;
    if (/^https?:\/\//i.test(image)) return image;
    return `${storeUrl()}${image.startsWith('/') ? '' : '/'}${image}`;
}

function productRow(product) {
    const href = escapeHtml(productHref(product));
    const name = escapeHtml(product.productName);
    const brand = product.brandName
        ? `<p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;letter-spacing:.04em;">${escapeHtml(product.brandName)}</p>`
        : '';
    const percent = Math.max(1, Math.round(Number(product.discountPercent) || 0));
    return `
        <tr>
            <td style="padding:0 0 14px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e8f0;border-radius:12px;">
                    <tr>
                        <td width="132" style="padding:14px;vertical-align:middle;">
                            <a href="${href}" style="text-decoration:none;">
                                <img src="${escapeHtml(imageOf(product))}" alt="${name}" width="104" style="display:block;width:104px;height:auto;border:0;">
                            </a>
                        </td>
                        <td style="padding:14px 14px 14px 0;vertical-align:middle;">
                            <p style="margin:0 0 6px 0;">
                                <span style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:12px;font-weight:700;padding:3px 8px;border-radius:999px;">-${percent}%</span>
                            </p>
                            <a href="${href}" style="font-size:15px;line-height:1.35;color:#111827;font-weight:700;text-decoration:none;">${name}</a>
                            ${brand}
                            <p style="margin:8px 0 0 0;font-size:13px;color:#9ca3af;text-decoration:line-through;">${money(product.price)}</p>
                            <p style="margin:2px 0 12px 0;font-size:18px;color:${BRAND};font-weight:800;">${money(product.sellingPrice)}</p>
                            <a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:8px;">Comprar producto</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`;
}

function categoryCells(categories) {
    const items = (categories || []).slice(0, 8);
    if (!items.length) {
        return `<a href="${escapeHtml(`${storeUrl()}/categoria-producto`)}" style="color:${BRAND};font-weight:700;text-decoration:none;">Ver el catálogo</a>`;
    }
    return items.map((category) => {
        const href = `${storeUrl()}/categoria-producto?category=${encodeURIComponent(category.value || category.name || '')}`;
        const label = escapeHtml(category.label || category.name || 'Catálogo');
        return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border:1px solid #d9dced;border-radius:999px;color:${BRAND};font-size:13px;font-weight:700;text-decoration:none;">${label}</a>`;
    }).join('');
}

function button(href, label, background) {
    return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${background};color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 22px;border-radius:10px;">${escapeHtml(label)}</a>`;
}

function buildNewsletterHtml({ copy, products, categories, preview }) {
    const unsubscribe = preview ? `${storeUrl()}/promociones` : '{{ params.unsubscribeUrl }}';
    const rows = (products || []).map(productRow).join('');
    const preheader = escapeHtml(copy.preheader || '');
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(copy.subject || 'Zenn Electrónicos')}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5fb;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr>
<td style="background:${BRAND};padding:22px 24px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.14em;color:#c7d2fe;font-weight:700;">ZENN ELECTRÓNICOS</p>
<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.2;color:#ffffff;font-weight:800;">${escapeHtml(copy.headline || 'Las promos que más bajan de precio')}</p>
</td>
</tr>
<tr>
<td style="padding:22px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1f2937;">
${escapeHtml(copy.intro || '')}
</td>
</tr>
<tr>
<td align="center" style="padding:8px 24px 22px 24px;font-family:Arial,Helvetica,sans-serif;">
${button(IG_URL, 'Seguir en Instagram', ACCENT)}
<p style="margin:10px 0 0 0;font-size:13px;color:#6b7280;">${escapeHtml(copy.instagramLine || 'Novedades y promos primero en @zennelectronicos.')}</p>
</td>
</tr>
<tr>
<td style="padding:0 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 12px 0;font-size:18px;font-weight:800;color:#111827;">Promos con mayor descuento</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows || `<tr><td style="padding:0 0 16px 0;font-size:14px;color:#4b5563;">Mirá las promos activas en la tienda.</td></tr>`}
</table>
</td>
</tr>
<tr>
<td align="center" style="padding:4px 24px 22px 24px;">
${button(`${storeUrl()}/promociones`, 'Ver todas las promociones', BRAND)}
</td>
</tr>
<tr>
<td style="padding:0 24px 22px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 8px 0;font-size:16px;font-weight:800;color:#111827;">También vendemos</p>
<p style="margin:0 0 12px 0;font-size:14px;line-height:1.45;color:#4b5563;">${escapeHtml(copy.categoryIntro || 'Informática, celulares, gamer, periféricos y electrodomésticos, con entrega en Asunción.')}</p>
${categoryCells(categories)}
</td>
</tr>
<tr>
<td style="padding:8px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;">
${escapeHtml(copy.closing || 'El precio del correo es el de la ficha. Si le sirve, puede comprarlo hoy.')}
</td>
</tr>
<tr>
<td style="background:#f8f8fc;padding:18px 24px 22px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
<p style="margin:0 0 8px 0;">Zenn Electrónicos · Asunción, Paraguay · ventas@zenn.com.py · +595 973 345284</p>
<p style="margin:0;">Recibió este correo porque su dirección está en la lista comercial de Zenn. <a href="${unsubscribe}" style="color:${BRAND};">Dejar de recibir estos correos</a>.</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = {
    IG_URL,
    storeUrl,
    productHref,
    buildNewsletterHtml
};

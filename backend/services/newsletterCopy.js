'use strict';

const { askGeminiText, askClaudeText, parseJson, communityAiReady, claudeReady } = require('./communityAi');
const { formatToPYG } = require('./brevoService');

function fallbackCopy(products, categories) {
    const top = products[0];
    const percent = top ? Math.round(Number(top.discountPercent) || 0) : 0;
    const name = top?.productName || 'una promo de la tienda';
    const price = top ? formatToPYG(Number(top.sellingPrice) || 0) : '';
    const rubros = (categories || []).slice(0, 4).map((item) => item.label || item.name).filter(Boolean);
    return {
        subject: percent ? `${name.slice(0, 32)} con ${percent}% menos` : 'Promos de hoy en Zenn',
        preheader: price ? `${name} queda en ${price}. También puede seguirnos en Instagram.` : 'Las promos con más descuento, hoy en la web.',
        headline: percent ? `Hoy ${name} está ${percent}% abajo` : 'Las promos que más bajan de precio',
        intro: price
            ? `En la tienda, ${name} quedó en ${price}. Abajo están las promos con mayor porcentaje y el acceso para comprar cada una.`
            : 'Estas son las promos con mayor porcentaje de la tienda. Cada una tiene el botón para comprarla en la web.',
        instagramLine: 'Si quiere ver el producto en la mano y las promos del día, síganos en Instagram.',
        categoryIntro: rubros.length
            ? `Además de estas promos vendemos ${rubros.join(', ')} y el resto del catálogo.`
            : 'Vendemos informática, celulares, gamer, periféricos y electrodomésticos.',
        closing: 'El precio de este correo es el de la ficha. Si le sirve, puede comprarlo hoy desde el botón.',
        angle: ''
    };
}

function clip(value, max) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return text.slice(0, max).trim();
}

async function marketAngle(dateLabel) {
    if (!communityAiReady()) return { angle: '', note: 'sin clave de Google' };
    const prompt = `Sos el planner de marketing de Zenn Electrónicos, tienda en Asunción (zenn.com.py). Hoy es ${dateLabel}.
Buscá qué se está mirando esta semana en electrónica en Paraguay: notebooks, celulares, gamer, hogar.
No inventes precios ni descuentos de Zenn. No nombres a la competencia en el texto final.
Devolvé solo JSON:
{"angle":"una frase de qué le importa hoy a quien abre un correo de una tienda de electrónicos","hook":"gancho de hasta 8 palabras, sin precio"}`;
    try {
        const parsed = parseJson(await askGeminiText(prompt, true));
        return {
            angle: clip(parsed?.angle, 240),
            hook: clip(parsed?.hook, 80),
            note: parsed?.angle ? 'ok' : 'sin ángulo'
        };
    } catch (error) {
        return { angle: '', note: error.message || 'Google no respondió' };
    }
}

async function writeCopy({ dateLabel, angle, products, categories }) {
    const base = fallbackCopy(products, categories);
    if (angle) base.angle = angle;
    if (!claudeReady()) {
        return { copy: base, note: 'sin clave de Claude' };
    }
    const productLines = products.map((product, index) => {
        const percent = Math.round(Number(product.discountPercent) || 0);
        return `${index + 1}. ${product.productName} · -${percent}% · ahora ${formatToPYG(Number(product.sellingPrice) || 0)} · antes ${formatToPYG(Number(product.price) || 0)}`;
    }).join('\n');
    const rubros = categories.map((item) => item.label || item.name).filter(Boolean).join(', ');
    const prompt = `Escribí el texto de un correo comercial de Zenn Electrónicos, en Asunción.
El correo tiene que hacer dos cosas: que la persona entre a zenn.com.py y compre una promo, y que siga a @zennelectronicos en Instagram.
Trato de usted. Español de Paraguay. Sin hashtags. Un emoji como máximo en todo el texto.
No inventes productos, precios ni porcentajes. Usá solo esta lista.
Ángulo de hoy: ${angle || 'las promos con mayor porcentaje de descuento'}.
Fecha: ${dateLabel}.
Productos reales:
${productLines || 'No hay productos. Hablá de la tienda sin inventar una oferta.'}
Rubros que vendemos: ${rubros || 'informática, celulares, gamer, periféricos y electrodomésticos'}.
Devolvé solo JSON:
{"subject":"máximo 55 caracteres","preheader":"máximo 90 caracteres","headline":"máximo 70 caracteres","intro":"dos frases","instagramLine":"una frase para acompañar el botón de seguir","categoryIntro":"una frase sobre el resto del catálogo","closing":"una frase para cerrar"}`;
    try {
        const parsed = parseJson(await askClaudeText(prompt));
        if (!parsed?.subject || !parsed?.headline) {
            return { copy: base, note: 'Claude no devolvió el texto' };
        }
        return {
            copy: {
                subject: clip(parsed.subject, 80),
                preheader: clip(parsed.preheader, 120),
                headline: clip(parsed.headline, 90),
                intro: clip(parsed.intro, 400),
                instagramLine: clip(parsed.instagramLine, 180),
                categoryIntro: clip(parsed.categoryIntro, 240),
                closing: clip(parsed.closing, 220),
                angle
            },
            note: 'ok'
        };
    } catch (error) {
        return { copy: base, note: error.message || 'Claude no respondió' };
    }
}

module.exports = { fallbackCopy, marketAngle, writeCopy };

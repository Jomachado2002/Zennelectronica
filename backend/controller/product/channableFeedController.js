// Feed XML para Meta Catalog y Google Merchant Center.
// Un solo archivo con todos los productos que tienen foto. Meta filtra por
// categoría y subcategoría con product_type, custom_label e internal_label.

const ProductModel = require('../../models/productModel');
const CategoryModel = require('../../models/categoryModel');
const { toMerchantJpegUrl } = require('./merchantJpegController');

const XML_CONFIG = {
    STORE_NAME: 'Zenn Electronicos',
    STORE_URL: 'https://www.zenn.com.py',
    STORE_DESCRIPTION: 'Tienda de informática y electrónica en Paraguay. Notebooks, PCs, componentes, periféricos y más.',
    CURRENCY: 'PYG',
    // El precio publicado ya incluye los 30.000 Gs de envío. Si acá va 30000,
    // Google lo suma otra vez y la ficha sale más cara que la tienda.
    SHIPPING_COST: 0,
    SHIPPING_SERVICE: 'Envío incluido',
    COUNTRY: 'PY',
    LANGUAGE: 'es',
    MIN_PRICE: 1000,
    MAX_TITLE_LENGTH: 150,
    MAX_DESCRIPTION_LENGTH: 5000,
    DEFAULT_BRAND: 'Zenn',
    MAX_IMAGES: 10
};

const CATEGORY_LABELS = {
    perifericos: 'Periféricos',
    electronicos: 'Electrónicos',
    almacenamiento: 'Almacenamiento',
    apple: 'Apple',
    celulares_y_tablets: 'Celulares y Tablets',
    cooler: 'Cooler',
    gabinetes: 'Gabinetes',
    impresoras_y_suministros: 'Impresoras y Suministros',
    monitores: 'Monitores',
    notebook_y_computadoras: 'Notebook y Computadoras',
    procesadores: 'Procesadores',
    red_y_internet: 'Red y Internet',
    tarjetas_graficas: 'Tarjetas Gráficas',
    fuentes_de_alimentacion: 'Fuentes de Alimentación',
    placas_madre: 'Placas Madre',
    informatica: 'Informática',
    telefonia: 'Telefonía',
    gaming: 'Gaming'
};

const CATEGORY_FALLBACK = {
    perifericos: 'Electronics > Computer Accessories',
    electronicos: 'Electronics',
    almacenamiento: 'Electronics > Data Storage',
    apple: 'Electronics',
    celulares_y_tablets: 'Electronics > Communications > Telephony',
    cooler: 'Electronics > Electronics Accessories > Computer Accessories > Computer Cooling',
    gabinetes: 'Electronics > Electronics Accessories > Computer Components > Computer Cases',
    impresoras_y_suministros: 'Electronics > Print, Copy, Scan & Fax',
    monitores: 'Electronics > Computers > Computer Monitors',
    notebook_y_computadoras: 'Electronics > Computers',
    procesadores: 'Electronics > Electronics Accessories > Computer Components > Computer Processors',
    red_y_internet: 'Electronics > Networking',
    tarjetas_graficas: 'Electronics > Electronics Accessories > Computer Components > Graphics Cards',
    fuentes_de_alimentacion: 'Electronics > Electronics Accessories > Computer Components > Power Supply Units',
    placas_madre: 'Electronics > Electronics Accessories > Computer Components > Motherboards',
    informatica: 'Electronics > Computers',
    telefonia: 'Electronics > Communications > Telephony',
    gaming: 'Electronics > Video Game Console Accessories'
};

// Más específico primero. Se evalúa contra categoría + subcategoría + título.
const GOOGLE_CATEGORY_RULES = [
    [/iphone|smartphone|celular|telefono movil|telefonos_moviles/, 'Electronics > Communications > Telephony > Mobile Phones'],
    [/airpods|auricular|headphone/, 'Electronics > Audio > Audio Components > Headphones & Headsets'],
    [/ipad|tablet/, 'Electronics > Computers > Tablet Computers'],
    [/macbook|notebook|laptop/, 'Electronics > Computers > Laptops'],
    [/imac|mini.?pc|pc montado|computadora ensamblad|desktop|computadoras__/, 'Electronics > Computers > Desktop Computers'],
    [/smartwatch|reloj inteligente/, 'Electronics > Electronics Accessories > Wearable Technology > Smartwatches'],
    [/monitor/, 'Electronics > Computers > Computer Monitors'],
    [/\btv\b|televisor/, 'Electronics > Video > Televisions'],
    [/placa madre|motherboard/, 'Electronics > Electronics Accessories > Computer Components > Motherboards'],
    [/tarjeta grafica|vga_|video card|gpu/, 'Electronics > Electronics Accessories > Computer Components > Graphics Cards'],
    [/procesador|cpu_amd|cpu_intel|cpu_oem/, 'Electronics > Electronics Accessories > Computer Components > Computer Processors'],
    [/memoria ram|ram notebook|ram pc/, 'Electronics > Electronics Accessories > Computer Components > Computer Memory'],
    [/\bssd\b|disco duro|almacenamiento|pendrive|tarjeta.?sd|micro.?sd/, 'Electronics > Data Storage'],
    [/fuente de aliment|power supply/, 'Electronics > Electronics Accessories > Computer Components > Power Supply Units'],
    [/gabinete|pc case/, 'Electronics > Electronics Accessories > Computer Components > Computer Cases'],
    [/water cooler|cooler para|pasta termica/, 'Electronics > Electronics Accessories > Computer Accessories > Computer Cooling'],
    [/impresora 3d/, 'Hardware > Printing & Lamination > 3D Printers'],
    [/impresora|escaner|cartucho|toner/, 'Electronics > Print, Copy, Scan & Fax > Printers'],
    [/teclado/, 'Electronics > Electronics Accessories > Computer Accessories > Input Devices > Computer Keyboards'],
    [/mousepad/, 'Electronics > Electronics Accessories > Computer Accessories > Mouse Pads'],
    [/mouse|trackpad/, 'Electronics > Electronics Accessories > Computer Accessories > Input Devices > Computer Mice'],
    [/webcam/, 'Electronics > Cameras & Optics > Cameras > Webcams'],
    [/microfono/, 'Electronics > Audio > Audio Components > Microphones'],
    [/parlante|subwoofer|equipo de sonido/, 'Electronics > Audio > Audio Players & Recorders > Speakers'],
    [/router|repetidor|wifi|hub__|cable.?de.?red/, 'Electronics > Networking'],
    [/silla gamer/, 'Furniture > Chairs > Office Chairs'],
    [/consola|videojuego/, 'Electronics > Video Game Consoles'],
    [/camara de vigilancia|cctv|dvr/, 'Cameras & Optics > Surveillance Cameras'],
    [/camara fotograf|camara de accion|filmadora/, 'Cameras & Optics > Cameras'],
    [/drone/, 'Cameras & Optics > Cameras']
];

const PRODUCT_SELECT = [
    '_id',
    'productName',
    'brandName',
    'category',
    'subcategory',
    'productImage',
    'description',
    'price',
    'sellingPrice',
    'codigo',
    'stock',
    'stockStatus',
    'slug',
    'model',
    'processor',
    'processorModel',
    'processorCores',
    'processorThreads',
    'processorBaseFreq',
    'processorTurboFreq',
    'processorSocket',
    'memory',
    'storage',
    'disk',
    'diskType',
    'hddCapacity',
    'ramText',
    'ramCapacity',
    'ramType',
    'ramSpeed',
    'graphicsCard',
    'graphicCardModel',
    'notebookScreen',
    'phoneRAM',
    'phoneStorage',
    'phoneProcessor',
    'phoneScreenSize',
    'tabletRAM',
    'tabletStorage',
    'tabletProcessor',
    'tabletScreenSize',
    'monitorSize',
    'monitorResolution',
    'monitorRefreshRate',
    'motherboardSocket',
    'motherboardChipset',
    'motherboardFormFactor',
    'psuFormFactor',
    'psuWattage',
    'psuEfficiency',
    'specifications',
    'technicalSpecifications'
].join(' ');

function escapeXML(text) {
    if (typeof text !== 'string') text = String(text || '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .trim();
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const urlObj = new URL(url.trim());
        if (urlObj.protocol !== 'https:') return false;

        const host = urlObj.hostname.toLowerCase();
        let pathname = urlObj.pathname.toLowerCase();
        let decoded = url.toLowerCase();
        try {
            pathname = decodeURIComponent(urlObj.pathname).toLowerCase();
            decoded = decodeURIComponent(url).toLowerCase();
        } catch (_) {
            /* usar original */
        }

        if (host === 'cdn.zenn.com.py' || host.endsWith('.zenn.com.py')) {
            return pathname.length > 1;
        }

        const hasMediaExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(
            (ext) => pathname.endsWith(ext) || decoded.includes(ext)
        );

        if (host.includes('firebasestorage.googleapis.com') || host.includes('firebasestorage.app')) {
            return hasMediaExt;
        }

        return hasMediaExt;
    } catch (_) {
        return false;
    }
}

function getValidImages(productImages) {
    if (!Array.isArray(productImages)) return [];
    const seen = new Set();
    const valid = [];
    for (const img of productImages) {
        if (!isValidImageUrl(img) || seen.has(img)) continue;
        seen.add(img);
        valid.push(toMerchantJpegUrl(img));
        if (valid.length >= XML_CONFIG.MAX_IMAGES) break;
    }
    return valid;
}

function formatPrice(priceInGuaranis) {
    return Math.round(Number(priceInGuaranis)).toString();
}

function generateCleanId(product) {
    const raw = String(product.codigo || product._id || '').trim();
    const clean = raw.replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 50);
    return clean || String(product._id);
}

function humanizeSlug(value) {
    if (!value) return '';
    const key = String(value).trim();
    if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
    return key
        .replace(/__[\d_]+$/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferGoogleCategory(category, subcategory, title) {
    const hay = normalizeText(`${category} ${subcategory} ${title}`);
    for (const [pattern, google] of GOOGLE_CATEGORY_RULES) {
        if (pattern.test(hay)) return google;
    }
    const catKey = String(category || '').toLowerCase().trim();
    return CATEGORY_FALLBACK[catKey] || 'Electronics';
}

function getDiscountInfo(product) {
    const originalPrice = Number(product.price) || 0;
    const finalPrice = Number(product.sellingPrice) || 0;

    if (originalPrice > finalPrice && finalPrice >= XML_CONFIG.MIN_PRICE) {
        return { hasDiscount: true, finalPrice, originalPrice };
    }

    const priceToUse = finalPrice > 0 ? finalPrice : originalPrice;
    return { hasDiscount: false, finalPrice: priceToUse, originalPrice: priceToUse };
}

function getAvailability(product) {
    const stock = Number(product.stock) || 0;
    if (stock >= 1 || product.stockStatus === 'in_stock' || (product.stockStatus === 'low_stock' && stock > 0)) {
        return 'in_stock';
    }
    return 'out_of_stock';
}

const SPEC_FIELDS = [
    ['Procesador', ['processor', 'phoneProcessor', 'tabletProcessor', 'processorModel']],
    ['Núcleos', ['processorCores']],
    ['Hilos', ['processorThreads']],
    ['Frecuencia', ['processorBaseFreq']],
    ['Turbo', ['processorTurboFreq']],
    ['RAM', ['memory', 'phoneRAM', 'tabletRAM', 'ramText', 'ramCapacity']],
    ['Tipo de RAM', ['ramType']],
    ['Velocidad RAM', ['ramSpeed']],
    ['Almacenamiento', ['storage', 'phoneStorage', 'tabletStorage', 'disk', 'hddCapacity']],
    ['Tipo de disco', ['diskType']],
    ['GPU', ['graphicsCard', 'graphicCardModel']],
    ['Pantalla', ['notebookScreen', 'phoneScreenSize', 'tabletScreenSize', 'monitorSize']],
    ['Resolución', ['monitorResolution']],
    ['Tasa de refresco', ['monitorRefreshRate']],
    ['Modelo', ['model']],
    ['Socket', ['motherboardSocket', 'processorSocket']],
    ['Chipset', ['motherboardChipset']],
    ['Factor de forma', ['motherboardFormFactor', 'psuFormFactor']],
    ['Potencia', ['psuWattage']],
    ['Eficiencia', ['psuEfficiency']]
];

function specText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const text = String(value).trim();
        if (!text || text === 'undefined' || text === 'null') return '';
        return text;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return specText(value.value || value.label || value.name || '');
    }
    return '';
}

function collectSpecParts(product) {
    const parts = [];
    const seen = new Set();
    const push = (label, value) => {
        const text = specText(value);
        const name = String(label || '').trim();
        if (!text || !name) return;
        const key = normalizeText(`${name}:${text}`);
        if (seen.has(key)) return;
        seen.add(key);
        parts.push(`${name}: ${text}`);
    };

    for (const [label, keys] of SPEC_FIELDS) {
        const value = keys.map((key) => product[key]).find((item) => specText(item));
        push(label, value);
    }

    const specMaps = [product.technicalSpecifications, product.specifications];
    for (const map of specMaps) {
        if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
        for (const [key, value] of Object.entries(map)) {
            if (parts.length >= 30) break;
            push(humanizeSlug(key), value);
        }
    }

    return parts;
}

async function loadTaxonomy() {
    const docs = await CategoryModel.find()
        .select('value label name subcategories.value subcategories.label subcategories.name')
        .lean();
    const categories = new Map();
    const subcategories = new Map();
    for (const doc of docs) {
        const label = doc.label || doc.name || humanizeSlug(doc.value);
        if (doc.value && label) categories.set(doc.value, label);
        for (const sub of doc.subcategories || []) {
            const subLabel = sub.label || sub.name || humanizeSlug(sub.value);
            if (sub.value && subLabel) subcategories.set(sub.value, subLabel);
        }
    }
    return { categories, subcategories };
}

function taxonomyLabels(product, taxonomy) {
    const categoryLabel = taxonomy.categories.get(product.category) || humanizeSlug(product.category) || 'Electrónica';
    const subcategoryLabel = taxonomy.subcategories.get(product.subcategory) || humanizeSlug(product.subcategory) || categoryLabel;
    return { categoryLabel, subcategoryLabel };
}

function generateTitle(product) {
    const brand = String(product.brandName || '').trim();
    let title = String(product.productName || '').replace(/\s+/g, ' ').trim();

    if (brand && !normalizeText(title).includes(normalizeText(brand))) {
        title = `${brand} ${title}`.trim();
    }

    const specs = collectSpecParts(product)
        .map((part) => part.replace(/^[^:]+:\s*/, ''))
        .filter(Boolean)
        .slice(0, 3);

    for (const spec of specs) {
        if (normalizeText(title).includes(normalizeText(spec))) continue;
        const next = `${title} ${spec}`.trim();
        if (next.length <= XML_CONFIG.MAX_TITLE_LENGTH) title = next;
        else break;
    }

    if (title.length > XML_CONFIG.MAX_TITLE_LENGTH) {
        title = title.slice(0, XML_CONFIG.MAX_TITLE_LENGTH - 1).trim();
    }
    return title;
}

function generateDescription(product, specParts, categoryLabel, subcategoryLabel) {
    const chunks = [];
    chunks.push(`Categoría: ${categoryLabel}. Subcategoría: ${subcategoryLabel}.`);
    if (specParts.length) chunks.push(`${specParts.join('. ')}.`);
    const base = String(product.description || '').replace(/\s+/g, ' ').trim();
    if (base) chunks.push(base);
    chunks.push('Venta en Zenn Electronicos, Asunción, Paraguay. Stock, garantía y envío a todo el país.');
    return chunks.join(' ').slice(0, XML_CONFIG.MAX_DESCRIPTION_LENGTH);
}

function generateProductURL(slug) {
    return `${XML_CONFIG.STORE_URL}/producto/${slug}`;
}

function buildItemXml(product, taxonomy, forMeta) {
    const validImages = getValidImages(product.productImage);
    if (!product.productName || !product.slug || validImages.length === 0) return '';

    const discountInfo = getDiscountInfo(product);
    if (!discountInfo.finalPrice || discountInfo.finalPrice < XML_CONFIG.MIN_PRICE) return '';

    const specParts = collectSpecParts(product);
    const title = generateTitle(product);
    const { categoryLabel, subcategoryLabel } = taxonomyLabels(product, taxonomy);
    const description = generateDescription(product, specParts, categoryLabel, subcategoryLabel);
    const brand = String(product.brandName || XML_CONFIG.DEFAULT_BRAND).trim() || XML_CONFIG.DEFAULT_BRAND;
    const googleCategory = inferGoogleCategory(product.category, product.subcategory, title);
    const productType = `${categoryLabel} > ${subcategoryLabel}`;
    const availability = getAvailability(product);
    const mpn = String(product.codigo || '').trim();
    const price = formatPrice(discountInfo.hasDiscount ? discountInfo.originalPrice : discountInfo.finalPrice);
    const salePrice = discountInfo.hasDiscount ? formatPrice(discountInfo.finalPrice) : null;
    const mainImage = validImages[0];
    const additionalImages = validImages.slice(1, 10);
    const stock = Math.max(0, Math.round(Number(product.stock) || 0));

    let xml = `        <item>
            <g:id>${escapeXML(generateCleanId(product))}</g:id>
            <g:title>${escapeXML(title)}</g:title>
            <g:description>${escapeXML(description)}</g:description>
            <g:link>${escapeXML(generateProductURL(product.slug))}</g:link>
            <link>${escapeXML(generateProductURL(product.slug))}</link>
            <g:image_link>${escapeXML(mainImage)}</g:image_link>\n`;

    additionalImages.forEach((img) => {
        xml += `            <g:additional_image_link>${escapeXML(img)}</g:additional_image_link>\n`;
    });

    xml += `            <g:condition>new</g:condition>
            <g:availability>${availability}</g:availability>
            <g:price>${price} ${XML_CONFIG.CURRENCY}</g:price>\n`;

    if (salePrice) {
        xml += `            <g:sale_price>${salePrice} ${XML_CONFIG.CURRENCY}</g:sale_price>\n`;
    }

    xml += `            <g:brand>${escapeXML(brand)}</g:brand>
            <g:identifier_exists>${mpn ? 'yes' : 'no'}</g:identifier_exists>\n`;

    if (mpn) {
        xml += `            <g:mpn>${escapeXML(mpn.substring(0, 70))}</g:mpn>\n`;
    }

    xml += `            <g:google_product_category>${escapeXML(googleCategory)}</g:google_product_category>
            <g:product_type>${escapeXML(productType)}</g:product_type>
            <g:custom_label_0>${escapeXML(categoryLabel)}</g:custom_label_0>
            <g:custom_label_1>${escapeXML(subcategoryLabel)}</g:custom_label_1>
            <g:custom_label_2>${escapeXML(brand)}</g:custom_label_2>
            <g:custom_label_3>${availability}</g:custom_label_3>\n`;

    if (forMeta) {
        xml += `            <g:internal_label>${escapeXML(categoryLabel)}</g:internal_label>
            <g:internal_label>${escapeXML(subcategoryLabel)}</g:internal_label>
            <g:internal_label>${escapeXML(productType)}</g:internal_label>
            <g:quantity_to_sell_on_facebook>${stock}</g:quantity_to_sell_on_facebook>\n`;
    }

    xml += `            <g:shipping>
                <g:country>${XML_CONFIG.COUNTRY}</g:country>
                <g:service>${escapeXML(XML_CONFIG.SHIPPING_SERVICE)}</g:service>
                <g:price>${XML_CONFIG.SHIPPING_COST} ${XML_CONFIG.CURRENCY}</g:price>
            </g:shipping>
        </item>\n`;

    return xml;
}

const channableFeedController = async (req, res) => {
    try {
        const forMeta = /\/meta\/catalog\.xml|\/channable\/feed\.xml/.test(req.path || '');
        const query = {
            productName: { $exists: true, $nin: [null, ''] },
            slug: { $exists: true, $nin: [null, ''] },
            productImage: { $exists: true, $ne: [], $not: { $size: 0 } },
            $or: [
                { sellingPrice: { $gte: XML_CONFIG.MIN_PRICE } },
                { price: { $gte: XML_CONFIG.MIN_PRICE } }
            ]
        };

        const taxonomy = await loadTaxonomy();

        res.status(200);
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=1800',
            'Last-Modified': new Date().toUTCString(),
            'Access-Control-Allow-Origin': '*'
        });

        const title = forMeta
            ? `${XML_CONFIG.STORE_NAME} - Catálogo Meta`
            : `${XML_CONFIG.STORE_NAME} - Catálogo Google Merchant Center`;
        const header = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
    <channel>
        <title>${escapeXML(title)}</title>
        <link>${XML_CONFIG.STORE_URL}</link>
        <description>${escapeXML(XML_CONFIG.STORE_DESCRIPTION)}</description>
        <language>${XML_CONFIG.LANGUAGE}</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>Zenn Catalog Feed v7.0</generator>\n`;

        res.write(header);

        const cursor = ProductModel
            .find(query)
            .select(PRODUCT_SELECT)
            .sort({ category: 1, subcategory: 1, productName: 1 })
            .lean()
            .cursor();

        for await (const product of cursor) {
            const itemXml = buildItemXml(product, taxonomy, forMeta);
            if (itemXml) res.write(itemXml);
        }

        res.write(`    </channel>
</rss>`);
        res.end();
    } catch (error) {
        if (res.headersSent) {
            res.end();
            return;
        }
        res.status(500).json({
            message: 'Error generando feed XML para Google Merchant Center',
            error: true,
            success: false,
            details: error.message
        });
    }
};

module.exports = channableFeedController;

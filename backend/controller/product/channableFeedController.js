// backend/controller/product/channableFeedController.js - VERSIÓN OPTIMIZADA PARA META/FACEBOOK CON FILTRO DE STOCK
const ProductModel = require('../../models/productModel');

// ===== CONFIGURACIÓN OPTIMIZADA PARA META/FACEBOOK =====
const XML_CONFIG = {
    STORE_NAME: 'Zenn',
    STORE_URL: 'https://www.zenn.com.py',
    STORE_DESCRIPTION: 'Tienda especializada en tecnología e informática',
    CURRENCY: 'PYG',
    SHIPPING_COST: 30000,
    COUNTRY: 'PY',
    LANGUAGE: 'es',
    MIN_PRICE: 1000,
    MAX_TITLE_LENGTH: 60,
    DEFAULT_BRAND: 'Zenn',
    MIN_STOCK: 1  // ✅ NUEVO: Stock mínimo requerido
};

// ===== MAPEO DE CATEGORÍAS PARA GOOGLE =====
const CATEGORY_MAPPING = {
    'informatica': {
        label: 'Informática',
        googleCategory: 'Electronics > Computers',
        subcategories: {
            'notebooks': { label: 'Notebooks', google: 'Electronics > Computers > Laptops' },
            'computadoras_ensambladas': { label: 'PCs Ensambladas', google: 'Electronics > Computers > Desktop Computers' },
            'placas_madre': { label: 'Placas Madre', google: 'Electronics > Computer Components > Motherboards' },
            'tarjeta_grafica': { label: 'Tarjetas Gráficas', google: 'Electronics > Computer Components > Video Cards' },
            'memorias_ram': { label: 'Memorias RAM', google: 'Electronics > Computer Components > Computer Memory' },
            'discos_duros': { label: 'Discos Duros', google: 'Electronics > Computer Components > Storage Devices' },
            'procesador': { label: 'Procesadores', google: 'Electronics > Computer Components > Computer Processors' },
            'fuentes_alimentacion': { label: 'Fuentes de Poder', google: 'Electronics > Computer Components > Power Supplies' },
            'gabinetes': { label: 'Gabinetes', google: 'Electronics > Computer Components > Computer Cases' },
            'impresoras': { label: 'Impresoras', google: 'Electronics > Print, Copy, Scan & Fax > Printers' },
            'cartuchos_toners': { label: 'Cartuchos y Toners', google: 'Electronics > Print, Copy, Scan & Fax > Printer Ink & Toner' }
        }
    },
    'perifericos': {
        label: 'Periféricos',
        googleCategory: 'Electronics > Computer Accessories',
        subcategories: {
            'monitores': { label: 'Monitores', google: 'Electronics > Computers > Monitors' },
            'teclados': { label: 'Teclados', google: 'Electronics > Computer Accessories > Input Devices > Computer Keyboards' },
            'mouses': { label: 'Mouses', google: 'Electronics > Computer Accessories > Input Devices > Computer Mice' },
            'auriculares': { label: 'Auriculares', google: 'Electronics > Audio > Headphones' },
            'parlantes': { label: 'Parlantes', google: 'Electronics > Audio > Audio Players & Recorders > Speakers' },
            'webcam': { label: 'Webcams', google: 'Electronics > Cameras & Optics > Cameras > Webcams' }
        }
    },
    'telefonia': {
        label: 'Telefonía',
        googleCategory: 'Electronics > Communications > Telephony',
        subcategories: {
            'telefonos_moviles': { label: 'Teléfonos Móviles', google: 'Electronics > Communications > Telephony > Mobile Phones' },
            'tablets': { label: 'Tablets', google: 'Electronics > Computers > Tablet Computers' },
            'smartwatch': { label: 'Smartwatches', google: 'Electronics > Electronics Accessories > Wearable Technology > Smartwatches' }
        }
    },
    'electronicos': {
        label: 'Electrónicos',
        googleCategory: 'Electronics',
        subcategories: {
            'camaras_fotografia': { label: 'Cámaras de Fotografía', google: 'Electronics > Cameras & Optics > Cameras > Digital Cameras' },
            'televisores': { label: 'Televisores', google: 'Electronics > Electronics Accessories > Audio & Video Accessories > Televisions' },
            'consolas': { label: 'Consolas', google: 'Electronics > Video Game Console Accessories' }
        }
    },
    'gaming': {
        label: 'Gaming',
        googleCategory: 'Electronics > Computer Accessories',
        subcategories: {
            'sillas': { label: 'Sillas Gaming', google: 'Furniture > Chairs > Office Chairs' },
            'teclados_gaming': { label: 'Teclados Gaming', google: 'Electronics > Computer Accessories > Input Devices > Computer Keyboards' },
            'mouse_gaming': { label: 'Mouse Gaming', google: 'Electronics > Computer Accessories > Input Devices > Computer Mice' }
        }
    }
};

// ===== FUNCIONES AUXILIARES =====
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

// ✅ FUNCIÓN OPTIMIZADA PARA META - SOLO JPG Y PNG
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
        const urlObj = new URL(url);
        
        // Solo HTTPS
        if (urlObj.protocol !== 'https:') return false;
        
        // ✅ SOLO FORMATOS COMPATIBLES CON META
        const validExtensions = ['.jpg', '.jpeg', '.png'];
        const urlLower = url.toLowerCase();
        
        // Decodificar URL para manejar caracteres codificados (%2F, etc.)
        let decodedUrl = url;
        let decodedPathname = urlObj.pathname.toLowerCase();
        
        try {
            decodedUrl = decodeURIComponent(url);
            decodedPathname = decodeURIComponent(urlObj.pathname).toLowerCase();
        } catch (decodeError) {
            // Si falla la decodificación, usar la URL original
            decodedUrl = url;
            decodedPathname = urlObj.pathname.toLowerCase();
        }
        
        // Verificar extensión en pathname decodificado
        const hasValidExtension = validExtensions.some(ext => decodedPathname.endsWith(ext));
        
        // Verificar extensión en URL completa decodificada
        const hasValidExtensionInUrl = validExtensions.some(ext => decodedUrl.toLowerCase().includes(ext));
        
        if (url.includes('firebasestorage.googleapis.com')) {
            if (!url.includes('?alt=media&token=')) return false;
            
            // Patrones problemáticos conocidos (excluir %2F%2F pero permitir %2F solo)
            const problematicPatterns = [
                'FONTE_ATX', 'FONTE-TP-LINK', '%2B', '%2F%2F', 'REAL_1.jpg', '%20_%20',
                '.webp', '.gif', '.svg', '.bmp' // ✅ EXCLUIR FORMATOS NO COMPATIBLES
            ];
            
            if (problematicPatterns.some(pattern => urlLower.includes(pattern.toLowerCase()))) {
                return false;
            }
            
            // ✅ VALIDACIÓN ESPECÍFICA PARA META - verificar en URL decodificada
            return hasValidExtension || 
                   hasValidExtensionInUrl ||
                   urlLower.includes('.jpg') || 
                   urlLower.includes('.jpeg') || 
                   urlLower.includes('.png');
        }
        
        return hasValidExtension || hasValidExtensionInUrl;
        
    } catch (error) {
        return false;
    }
}

// ✅ VALIDACIÓN MEJORADA PARA META (máximo 5 imágenes)
function getValidImages(productImages) {
    if (!Array.isArray(productImages)) return [];
    return productImages.filter(img => isValidImageUrl(img)).slice(0, 5); // Meta recomienda máximo 5
}

function formatPrice(priceInGuaranis) {
    return Math.round(Number(priceInGuaranis)).toString();
}

// Función para formatear precio con puntos (ej: 1200000 -> "1.200.000")
function formatPriceWithDots(priceInGuaranis) {
    const price = Math.round(Number(priceInGuaranis) || 0);
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function generateCleanId(product) {
    const id = product._id.toString();
    const brand = (product.brandName || 'prod').substring(0, 3).toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${brand}_${id}`.substring(0, 50);
}

function generateOptimizedTitle(product) {
    let title = product.productName || '';
    
    title = title
        .replace(/[^\w\s\-().]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (title.length > XML_CONFIG.MAX_TITLE_LENGTH) {
        const words = title.split(' ');
        let shortTitle = '';
        let i = 0;
        
        while (i < words.length && (shortTitle + words[i]).length <= XML_CONFIG.MAX_TITLE_LENGTH) {
            shortTitle += (shortTitle ? ' ' : '') + words[i];
            i++;
        }
        
        title = shortTitle || title.substring(0, XML_CONFIG.MAX_TITLE_LENGTH);
    }
    
    return title;
}

function getCategoryInfo(category, subcategory) {
    const categoryData = CATEGORY_MAPPING[category];
    if (!categoryData) {
        return {
            categoryLabel: category,
            subcategoryLabel: subcategory,
            googleCategory: 'Electronics'
        };
    }
    
    const subcategoryData = categoryData.subcategories[subcategory];
    
    return {
        categoryLabel: categoryData.label,
        subcategoryLabel: subcategoryData ? subcategoryData.label : subcategory,
        googleCategory: subcategoryData ? subcategoryData.google : categoryData.googleCategory
    };
}

// ✅ FUNCIÓN MEJORADA PARA VALIDAR STOCK
function hasValidStock(product) {
    const stock = Number(product.stock) || 0;
    
    // Verificar stock numérico
    if (stock >= XML_CONFIG.MIN_STOCK) {
        return true;
    }
    
    // Verificar stockStatus si existe
    if (product.stockStatus === 'in_stock') {
        return true;
    }
    
    // Si no hay stock o es 0, no incluir
    return false;
}

// ✅ FUNCIÓN ACTUALIZADA PARA AVAILABILITY
function getAvailability(product) {
    const stock = Number(product.stock) || 0;
    
    if (stock >= XML_CONFIG.MIN_STOCK || product.stockStatus === 'in_stock') {
        return 'in stock';
    } else if (product.stockStatus === 'low_stock' && stock > 0) {
        return 'limited availability';
    } else {
        return 'out of stock';
    }
}

function generateProductURL(slug) {
    return `${XML_CONFIG.STORE_URL}/producto/${slug}`;
}

function getDiscountInfo(product) {
    const originalPrice = Number(product.price) || 0;
    const finalPrice = Number(product.sellingPrice) || 0;
    
    if (!originalPrice && finalPrice > 0) {
        return { hasDiscount: false, finalPrice: finalPrice, originalPrice: finalPrice };
    }
    
    if (originalPrice > 0 && !finalPrice) {
        return { hasDiscount: false, finalPrice: originalPrice, originalPrice: originalPrice };
    }
    
    if (originalPrice > finalPrice && finalPrice > 0) {
        const discountPercentage = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
        return { hasDiscount: true, finalPrice: finalPrice, originalPrice: originalPrice, discountPercentage: discountPercentage };
    }
    
    const priceToUse = finalPrice > 0 ? finalPrice : originalPrice;
    return { hasDiscount: false, finalPrice: priceToUse, originalPrice: priceToUse };
}

function extractProductSpecs(product) {
    const specs = [];
    
    // Memoria/RAM
    if (product.memory || product.phoneRAM || product.tabletRAM) {
        specs.push(`RAM: ${product.memory || product.phoneRAM || product.tabletRAM}`);
    }
    
    // Procesador
    if (product.processor || product.phoneProcessor || product.tabletProcessor) {
        specs.push(`Procesador: ${product.processor || product.phoneProcessor || product.tabletProcessor}`);
    }
    
    // Almacenamiento
    if (product.storage || product.phoneStorage || product.tabletStorage) {
        specs.push(`Almacenamiento: ${product.storage || product.phoneStorage || product.tabletStorage}`);
    }
    
    // Tarjeta gráfica
    if (product.graphicsCard || product.graphicCardModel) {
        specs.push(`GPU: ${product.graphicsCard || product.graphicCardModel}`);
    }
    
    // Tamaño de pantalla
    if (product.notebookScreen || product.phoneScreenSize || product.tabletScreenSize || product.monitorSize) {
        specs.push(`Pantalla: ${product.notebookScreen || product.phoneScreenSize || product.tabletScreenSize || product.monitorSize}`);
    }
    
    // Resolución
    if (product.monitorResolution || product.tabletScreenResolution) {
        specs.push(`Resolución: ${product.monitorResolution || product.tabletScreenResolution}`);
    }
    
    // Tasa de refresco
    if (product.monitorRefreshRate) {
        specs.push(`Refresh Rate: ${product.monitorRefreshRate}`);
    }
    
    return specs.join(' | ');
}

// Función auxiliar para validar que un campo tenga valor válido
function hasValidValue(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}

// Función para generar campos específicos de Meta según el tipo de producto
function generateMetaSpecificFields(product, categoryInfo) {
    let fields = '';
    const category = product.category?.toLowerCase() || '';
    const subcategory = product.subcategory?.toLowerCase() || '';
    
    // Campos para productos de informática (notebooks, computadoras, etc.)
    if (category === 'informatica') {
        // Procesador
        if (hasValidValue(product.processor) || hasValidValue(product.phoneProcessor) || hasValidValue(product.tabletProcessor)) {
            const processor = product.processor || product.phoneProcessor || product.tabletProcessor;
            if (hasValidValue(processor)) {
                fields += `
            <processor_type>${escapeXML(String(processor).trim())}</processor_type>`;
            }
        }
        
        // RAM (solo si no se duplica)
        if (hasValidValue(product.memory) || hasValidValue(product.phoneRAM) || hasValidValue(product.tabletRAM) || hasValidValue(product.ramCapacity)) {
            const ram = product.memory || product.phoneRAM || product.tabletRAM || product.ramCapacity;
            if (hasValidValue(ram)) {
                fields += `
            <ram_memory>${escapeXML(String(ram).trim())}</ram_memory>`;
            }
        }
        
        // Almacenamiento
        if (hasValidValue(product.storage) || hasValidValue(product.phoneStorage) || hasValidValue(product.tabletStorage) || hasValidValue(product.hddCapacity)) {
            const storage = product.storage || product.phoneStorage || product.tabletStorage || product.hddCapacity;
            if (hasValidValue(storage)) {
                fields += `
            <storage_capacity>${escapeXML(String(storage).trim())}</storage_capacity>`;
            }
        }
        
        // Tarjeta gráfica
        if (hasValidValue(product.graphicsCard) || hasValidValue(product.graphicCardModel)) {
            const gpu = product.graphicsCard || product.graphicCardModel;
            if (hasValidValue(gpu)) {
                fields += `
            <graphics_card_model>${escapeXML(String(gpu).trim())}</graphics_card_model>`;
            }
        }
        
        // Tamaño de pantalla (para notebooks, tablets, monitores)
        if (hasValidValue(product.notebookScreen) || hasValidValue(product.tabletScreenSize) || hasValidValue(product.monitorSize) || hasValidValue(product.phoneScreenSize)) {
            const screenSize = product.notebookScreen || product.tabletScreenSize || product.monitorSize || product.phoneScreenSize;
            if (hasValidValue(screenSize)) {
                fields += `
            <screen_size>${escapeXML(String(screenSize).trim())}</screen_size>`;
            }
        }
        
        // Resolución (para monitores y tablets)
        if (hasValidValue(product.monitorResolution) || hasValidValue(product.tabletScreenResolution)) {
            const resolution = product.monitorResolution || product.tabletScreenResolution;
            if (hasValidValue(resolution)) {
                fields += `
            <resolution>${escapeXML(String(resolution).trim())}</resolution>`;
            }
        }
        
        // Refresh rate (para monitores)
        if (hasValidValue(product.monitorRefreshRate)) {
            fields += `
            <refresh_rate>${escapeXML(String(product.monitorRefreshRate).trim())}</refresh_rate>`;
        }
        
        // Tipo de disco
        if (hasValidValue(product.diskType) || hasValidValue(product.hddInterface)) {
            const diskType = product.diskType || product.hddInterface;
            if (hasValidValue(diskType)) {
                fields += `
            <hard_drive_type>${escapeXML(String(diskType).trim())}</hard_drive_type>`;
            }
        }
    }
    
    // Campos para telefonía
    if (category === 'telefonia') {
        // Tamaño de pantalla
        if (hasValidValue(product.phoneScreenSize) || hasValidValue(product.tabletScreenSize)) {
            const screenSize = product.phoneScreenSize || product.tabletScreenSize;
            if (hasValidValue(screenSize)) {
                fields += `
            <screen_size>${escapeXML(String(screenSize).trim())}</screen_size>`;
            }
        }
        
        // Resolución de cámara frontal
        if (hasValidValue(product.phoneFrontCamera) || hasValidValue(product.tabletFrontCamera)) {
            const frontCamera = product.phoneFrontCamera || product.tabletFrontCamera;
            if (hasValidValue(frontCamera)) {
                fields += `
            <front_facing_camera_resolution>${escapeXML(String(frontCamera).trim())}</front_facing_camera_resolution>`;
            }
        }
        
        // Resolución de cámara trasera
        if (hasValidValue(product.phoneRearCamera) || hasValidValue(product.tabletRearCamera)) {
            const rearCamera = product.phoneRearCamera || product.tabletRearCamera;
            if (hasValidValue(rearCamera)) {
                fields += `
            <rear_facing_camera_resolution>${escapeXML(String(rearCamera).trim())}</rear_facing_camera_resolution>`;
            }
        }
        
        // Almacenamiento
        if (hasValidValue(product.phoneStorage) || hasValidValue(product.tabletStorage)) {
            const storage = product.phoneStorage || product.tabletStorage;
            if (hasValidValue(storage)) {
                fields += `
            <storage_capacity>${escapeXML(String(storage).trim())}</storage_capacity>`;
            }
        }
        
        // RAM
        if (hasValidValue(product.phoneRAM) || hasValidValue(product.tabletRAM)) {
            const ram = product.phoneRAM || product.tabletRAM;
            if (hasValidValue(ram)) {
                fields += `
            <ram_memory>${escapeXML(String(ram).trim())}</ram_memory>`;
            }
        }
        
        // Procesador
        if (hasValidValue(product.phoneProcessor) || hasValidValue(product.tabletProcessor)) {
            const processor = product.phoneProcessor || product.tabletProcessor;
            if (hasValidValue(processor)) {
                fields += `
            <processor_type>${escapeXML(String(processor).trim())}</processor_type>`;
            }
        }
    }
    
    // Campos para periféricos (monitores)
    if (category === 'perifericos' && subcategory === 'monitores') {
        if (hasValidValue(product.monitorSize)) {
            fields += `
            <screen_size>${escapeXML(String(product.monitorSize).trim())}</screen_size>`;
        }
        if (hasValidValue(product.monitorResolution)) {
            fields += `
            <resolution>${escapeXML(String(product.monitorResolution).trim())}</resolution>`;
        }
        if (hasValidValue(product.monitorRefreshRate)) {
            fields += `
            <refresh_rate>${escapeXML(String(product.monitorRefreshRate).trim())}</refresh_rate>`;
        }
    }
    
    // Modelo del producto (si está disponible y tiene valor válido)
    if (hasValidValue(product.model)) {
        fields += `
            <model>${escapeXML(String(product.model).trim())}</model>`;
    }
    
    return fields;
}

// ===== CONTROLADOR PRINCIPAL OPTIMIZADO PARA META =====
const channableFeedController = async (req, res) => {
    try {
        
        
        // ✅ QUERY MEJORADO CON FILTRO DE STOCK Y VALIDACIÓN DE IMÁGENES PARA META
        const query = {
            productImage: { $exists: true, $ne: [], $not: { $size: 0 } },
            productName: { $exists: true, $ne: '' },
            $or: [
                { price: { $gte: XML_CONFIG.MIN_PRICE } },
                { sellingPrice: { $gte: XML_CONFIG.MIN_PRICE } }
            ],
            slug: { $exists: true, $ne: '' },
            // ✅ SOLO IMÁGENES FIREBASE (Meta requiere URLs estables)
            'productImage.0': { $regex: /firebasestorage\.googleapis\.com/, $options: 'i' },
            // ✅ FILTROS DE STOCK AGREGADOS AL QUERY
            $and: [
                {
                    $or: [
                        { stock: { $gte: XML_CONFIG.MIN_STOCK } },  // Stock numérico >= 1
                        { stockStatus: 'in_stock' },               // O stockStatus = 'in_stock'
                        { stockStatus: 'low_stock', stock: { $gt: 0 } } // O low_stock con stock > 0
                    ]
                }
            ]
        };
        
        const products = await ProductModel
            .find(query)
            .sort({ updatedAt: -1 })
            .lean();
        
        
        
        // Generar XML optimizado para Meta
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
    <channel>
        <title>${escapeXML(XML_CONFIG.STORE_NAME)} - Catálogo para Meta (Solo con Stock)</title>
        <link>${XML_CONFIG.STORE_URL}</link>
        <description>${escapeXML(XML_CONFIG.STORE_DESCRIPTION)} - Solo productos con stock disponible</description>
        <language>${XML_CONFIG.LANGUAGE}</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>Zenn Meta Feed v5.1 - Stock Filter</generator>\n`;

        let includedCount = 0;
        let skippedCount = 0;
        let noStockSkipped = 0; // ✅ CONTADOR ESPECÍFICO PARA PRODUCTOS SIN STOCK

        products.forEach(product => {
            try {
                // ✅ VALIDACIÓN ADICIONAL DE STOCK (doble verificación)
                if (!hasValidStock(product)) {
                    noStockSkipped++;
                    skippedCount++;
                    
                    return;
                }
                
                // Validaciones básicas
                if (!product.productName || !product.productImage || product.productImage.length === 0) {
                    skippedCount++;
                    
                    return;
                }
                
                const validImages = getValidImages(product.productImage);
                if (validImages.length === 0) {
                    skippedCount++;
                    
                    
                    return;
                }
                
                const discountInfo = getDiscountInfo(product);
                
                if (!discountInfo.finalPrice || discountInfo.finalPrice < XML_CONFIG.MIN_PRICE) {
                    skippedCount++;
                    
                    return;
                }
                
                includedCount++;
                
                // Datos del producto
                const id = generateCleanId(product);
                const title = escapeXML(generateOptimizedTitle(product));
                const description = escapeXML((product.description || product.productName || '').substring(0, 500));
                const brand = escapeXML(product.brandName || XML_CONFIG.DEFAULT_BRAND);
                const categoryInfo = getCategoryInfo(product.category, product.subcategory);
                const availability = getAvailability(product);
                const productUrl = generateProductURL(product.slug);
                const specifications = extractProductSpecs(product);
                
                const mainImage = validImages[0];
                const additionalImages = validImages.slice(1, 4); // ✅ Máximo 3 adicionales para Meta (total 4)
                
                // Precios para Meta (solo números)
                const price = formatPrice(discountInfo.hasDiscount ? discountInfo.originalPrice : discountInfo.finalPrice);
                const salePrice = discountInfo.hasDiscount ? formatPrice(discountInfo.finalPrice) : null;

                // Obtener el mapeo de Google para la subcategoría (no la categoría principal)
                // Esto es lo que Channable usa para categorizar correctamente
                let fbProductCategory = 'Electronics'; // Valor por defecto
                const categoryData = CATEGORY_MAPPING[product.category?.toLowerCase()];
                if (categoryData && product.subcategory) {
                    const subcategoryData = categoryData.subcategories[product.subcategory.toLowerCase()];
                    if (subcategoryData && subcategoryData.google) {
                        fbProductCategory = subcategoryData.google;
                    } else {
                        // Si no hay mapeo específico, usar la categoría de Google de la subcategoría
                        fbProductCategory = categoryInfo.googleCategory || 'Electronics';
                    }
                } else {
                    fbProductCategory = categoryInfo.googleCategory || 'Electronics';
                }
                
                // Product type para subcatálogos (formato: Categoría > Subcategoría)
                const productType = `${categoryInfo.categoryLabel} > ${categoryInfo.subcategoryLabel}`;
                
                xml += `        <item>
            <g:id>${escapeXML(id)}</g:id>
            <g:title>${title}</g:title>
            <g:description>${description}</g:description>
            <fb_product_category>${escapeXML(fbProductCategory)}</fb_product_category>
            <g:product_type>${escapeXML(productType)}</g:product_type>
            <link>${productUrl}</link>
            <g:image_link>${escapeXML(mainImage)}</g:image_link>`;

                // Imágenes adicionales
                if (additionalImages.length > 0) {
                    additionalImages.forEach(img => {
                        xml += `
            <g:additional_image_link>${escapeXML(img)}</g:additional_image_link>`;
                    });
                }

                xml += `
            <g:condition>new</g:condition>
            <g:availability>${availability}</g:availability>
            <g:price>${price} ${XML_CONFIG.CURRENCY}</g:price>`;

                // Precio de oferta si hay descuento
                if (discountInfo.hasDiscount && salePrice) {
                    xml += `
            <g:sale_price>${salePrice} ${XML_CONFIG.CURRENCY}</g:sale_price>
            <g:sale_price_effective_date>${new Date().toISOString().split('T')[0]}/${new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]}</g:sale_price_effective_date>`;
                }

                xml += `
            <g:brand>${brand}</g:brand>
            <g:mpn>${escapeXML(id)}</g:mpn>
            <g:age_group>adult</g:age_group>
            <g:gender>unisex</g:gender>`;

                // Información de envío
                xml += `
            <g:shipping>
                <g:country>${XML_CONFIG.COUNTRY}</g:country>
                <g:service>Standard</g:service>
                <g:price>${formatPrice(XML_CONFIG.SHIPPING_COST)} ${XML_CONFIG.CURRENCY}</g:price>
            </g:shipping>`;

                // Campos específicos de Meta según el tipo de producto
                const metaSpecificFields = generateMetaSpecificFields(product, categoryInfo);
                if (metaSpecificFields) {
                    xml += metaSpecificFields;
                }

                // Labels personalizados para Meta
                xml += `
            <g:custom_label_0>${escapeXML(categoryInfo.categoryLabel)}</g:custom_label_0>
            <g:custom_label_1>${escapeXML(categoryInfo.subcategoryLabel)}</g:custom_label_1>
            <g:custom_label_2>${escapeXML(brand)}</g:custom_label_2>`;
                
                if (discountInfo.hasDiscount) {
                    xml += `
            <g:custom_label_3>OFERTA ${discountInfo.discountPercentage}%</g:custom_label_3>`;
                } else {
                    xml += `
            <g:custom_label_3>PRECIO REGULAR</g:custom_label_3>`;
                }

                // Especificaciones del producto (solo si hay especificaciones válidas)
                if (specifications && specifications.trim().length > 0) {
                    xml += `
            <g:custom_label_4>${escapeXML(specifications.substring(0, 100))}</g:custom_label_4>`;
                }

                // Campos adicionales para Meta
                xml += `
            <!-- DATOS DEL PRODUCTO PARA META -->
            <titulo>${title}</titulo>
            <precio_gs>${formatPrice(discountInfo.finalPrice)}</precio_gs>
            <precio_original_gs>${formatPrice(discountInfo.originalPrice)}</precio_original_gs>
            <categoria>${escapeXML(categoryInfo.categoryLabel)}</categoria>
            <subcategoria>${escapeXML(categoryInfo.subcategoryLabel)}</subcategoria>
            <marca>${brand}</marca>
            <especificaciones>${escapeXML(specifications)}</especificaciones>
            <tiene_descuento>${discountInfo.hasDiscount ? 'true' : 'false'}</tiene_descuento>`;
            
                if (discountInfo.hasDiscount) {
                    xml += `
            <descuento_porcentaje>${discountInfo.discountPercentage}</descuento_porcentaje>`;
                }

                // Campos de precio formateados con puntos para imágenes
                const sellingPrice = discountInfo.finalPrice;
                const priceImagen = formatPriceWithDots(sellingPrice);
                const price10Image = formatPriceWithDots(sellingPrice / 10);
                
                xml += `
            <price_imagen>${priceImagen}</price_imagen>
            <price10_image>${price10Image}</price10_image>`;

                // ✅ INFORMACIÓN DE STOCK MEJORADA
                const stockValue = Number(product.stock) || 1;
                xml += `
            <stock>${stockValue}</stock>
            <stock_status>${product.stockStatus || 'in_stock'}</stock_status>
            <fecha_actualizacion>${new Date().toISOString()}</fecha_actualizacion>
        </item>\n`;
                
            } catch (itemError) {
                // console.error removed for production
                skippedCount++;
            }
        });

        xml += `    </channel>
</rss>`;

                
        
        
        
        
        
        
        
        
        
        
        
        // Headers optimizados para Meta
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=1800',
            'Last-Modified': new Date().toUTCString(),
            'Access-Control-Allow-Origin': '*'
        });
        
        res.send(xml);
        
    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: 'Error generando feed XML para Meta',
            error: true,
            success: false,
            details: error.message
        });
    }
};

module.exports = channableFeedController;
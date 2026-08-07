// backend/controller/product/getProduct.js - VERSIÓN OPTIMIZADA COMPLETA
const productModel = require("../../models/productModel")
const { HOME_SLOT_DEFS } = require("../../config/homeFeaturedSlots")
const { getActiveHomeSections } = require("../../services/homeSectionService")
const { buildHomeShowcaseWithPreviews } = require("../../services/homeShowcaseService")

const getProductController = async(req, res)=>{
    try{
        // ✅ PARÁMETROS DE PAGINACIÓN INTELIGENTE
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Solo 20 productos por página
        const category = req.query.category;
        const subcategory = req.query.subcategory;
        const featured = req.query.featured === 'true';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        
        // ✅ CALCULAR SKIP PARA PAGINACIÓN
        const skip = (page - 1) * limit;
        
        // ✅ CONSTRUIR FILTROS DINÁMICOS
        let query = {};
        
        // Filtrar productos con stock (importante para rendimiento)
        query.$or = [
            { stock: { $exists: false } },
            { stock: null },
            { stock: { $gt: 0 } }
        ];
        
        // Filtros adicionales
        if (category) {
            query.category = category;
        }
        
        if (subcategory) {
            query.subcategory = subcategory;
        }
        
        if (featured) {
            query.isVipOffer = true;
        }
        
        // ✅ PROYECCIÓN OPTIMIZADA - Solo campos necesarios para la lista
        const projection = {
            productName: 1,
            brandName: 1,
            category: 1,
            subcategory: 1,
            productImage: { $slice: 2 }, // Solo primeras 2 imágenes
            price: 1,
            sellingPrice: 1,
            stock: 1,
            isVipOffer: 1,
            slug: 1,
            createdAt: 1
        };
        
        // ✅ CONSULTA OPTIMIZADA CON ÍNDICES
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder;
        
        // ✅ EJECUTAR CONSULTA PAGINADA
        const [products, totalProducts] = await Promise.all([
            productModel
                .find(query, projection)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(), // ✅ lean() para mejor rendimiento
            productModel.countDocuments(query)
        ]);
        
        // ✅ METADATA DE PAGINACIÓN
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        res.json({
            message: "Productos obtenidos exitosamente",
            success: true,
            error: false,
            data: products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage,
                hasPrevPage,
                limit,
                productsInPage: products.length
            }
        });

    }catch(err){
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/** Listados generales: stock disponible. */
const STOCK_OR = [
    { stock: { $exists: false } },
    { stock: null },
    { stock: { $gt: 0 } }
];

/**
 * Home / vitrinas: solo con stock (>= 1).
 * Visão marca disponibles casi siempre con stock=1; stock>1 dejaría el home vacío.
 */
const HOME_STOCK_OR = [
    { stock: { $gte: 1 } }
];

function queryForPairs(pairs, stockClause = STOCK_OR, extraFilters = {}) {
    const pairOr = pairs.map(({ category, subcategory }) => ({ category, subcategory }));
    const and = [
        { $or: pairOr },
        { $or: stockClause }
    ];

    const brands = (extraFilters.brandNames || []).filter(Boolean);
    if (brands.length) {
        and.push({ brandName: { $in: brands } });
    }

    const specs = extraFilters.specifications || {};
    const specEntries =
        specs instanceof Map ? [...specs.entries()] : Object.entries(specs || {});
    for (const [key, values] of specEntries) {
        if (Array.isArray(values) && values.length > 0) {
            and.push({ [key]: { $in: values } });
        }
    }

    const priceMin = extraFilters.priceMin;
    const priceMax = extraFilters.priceMax;
    if (priceMin != null && Number.isFinite(Number(priceMin))) {
        and.push({ sellingPrice: { $gte: Number(priceMin) } });
    }
    if (priceMax != null && Number.isFinite(Number(priceMax))) {
        and.push({ sellingPrice: { $lte: Number(priceMax) } });
    }

    return { $and: and };
}

function stockClauseForMin(minStock = 1) {
    const min = Math.max(0, Number(minStock) || 0);
    if (min <= 0) {
        return [{ stock: { $exists: false } }, { stock: null }, { stock: { $gte: 0 } }];
    }
    return [{ stock: { $gte: min } }];
}

async function fetchSlot(pairs, limit, projection, filters = {}) {
    if (!pairs.length) return [];
    const stockClause = stockClauseForMin(filters.minStock ?? 1);
    return productModel
        .find(queryForPairs(pairs, stockClause, filters), projection)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const getHomeProductsController = async(req, res) => {
    try {
        const homeProjection = {
            productName: 1,
            brandName: 1,
            category: 1,
            subcategory: 1,
            // 1 imagen en home: menos payload + menos contención de red en móvil
            productImage: { $slice: 1 },
            price: 1,
            sellingPrice: 1,
            slug: 1,
            stock: 1,
            createdAt: 1
        };

        let sections = [];
        try {
            sections = await getActiveHomeSections();
        } catch (e) {
            sections = HOME_SLOT_DEFS.map((def, index) => ({
                key: def.key,
                title: def.key,
                subtitle: '',
                layout: 'grid',
                enabled: true,
                order: (index + 1) * 10,
                limit: def.limit,
                pairs: def.pairs,
                verMas: def.pairs[0],
                filters: { brandNames: [], priceMin: null, priceMax: null, minStock: 1 }
            }));
        }

        const slotPromises = sections.map((section) =>
            fetchSlot(
                section.pairs,
                section.limit,
                homeProjection,
                section.filters || {}
            ).then((products) => ({ key: section.key, products }))
        );

        const recentPool = await productModel
            .find({ $or: HOME_STOCK_OR }, homeProjection)
            .sort({ createdAt: -1 })
            .limit(150)
            .lean();

        const recientes = shuffleInPlace([...recentPool]).slice(0, 20);

        // Showcase de subcategorías listo en el mismo payload que las vitrinas
        // (categorías + label + image por slide → pinta al abrir, sin esperar el menú).
        const [slotResults, showcaseBundle] = await Promise.all([
            Promise.all(slotPromises),
            buildHomeShowcaseWithPreviews(buildShowcasePreviewsByCategory).catch(() => ({
                showcasePreviewsByCategory: {},
                homeShowcase: { categories: [], carousels: {} }
            }))
        ]);

        const slots = { recientes };
        slotResults.forEach(({ key, products }) => {
            slots[key] = products;
        });

        const {
            showcasePreviewsByCategory = {},
            homeShowcase = { categories: [], carousels: {} }
        } = showcaseBundle || {};

        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        res.json({
            message: "Productos para home obtenidos",
            success: true,
            error: false,
            data: {
                slots,
                sections: sections.map((s) => ({
                    key: s.key,
                    title: s.title,
                    subtitle: s.subtitle,
                    layout: s.layout,
                    order: s.order,
                    limit: s.limit,
                    verMas: s.verMas,
                    pairs: s.pairs
                })),
                showcasePreviewsByCategory,
                homeShowcase
            }
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

/**
 * Mapa subcategoryValue -> URL primera imagen de producto (más reciente con stock).
 */
async function buildSubcategoryPreviewMap(values) {
    const list = [...new Set((values || []).map(String).filter(Boolean))].slice(0, 150);
    if (!list.length) return {};

    const rows = await productModel.aggregate([
        {
            $match: {
                subcategory: { $in: list },
                $or: HOME_STOCK_OR,
                productImage: { $exists: true, $ne: [] }
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$subcategory',
                img: { $first: { $arrayElemAt: ['$productImage', 0] } }
            }
        }
    ]);

    const data = {};
    rows.forEach((r) => {
        if (r._id && r.img) data[r._id] = r.img;
    });
    return data;
}

/** Previews de todas las subcategorías con stock para una o más categorías (home showcase). */
async function buildShowcasePreviewsByCategory(categoryValues) {
    const cats = [...new Set((categoryValues || []).map(String).filter(Boolean))];
    if (!cats.length) return {};

    const rows = await productModel.aggregate([
        {
            $match: {
                category: { $in: cats },
                $or: HOME_STOCK_OR,
                productImage: { $exists: true, $ne: [] }
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: { category: '$category', subcategory: '$subcategory' },
                img: { $first: { $arrayElemAt: ['$productImage', 0] } }
            }
        }
    ]);

    const byCat = {};
    rows.forEach((r) => {
        const cat = r._id?.category;
        const sub = r._id?.subcategory;
        if (!cat || !sub || !r.img) return;
        if (!byCat[cat]) byCat[cat] = {};
        byCat[cat][sub] = r.img;
    });
    return byCat;
}

const getSubcategoryPreviewImagesController = async (req, res) => {
    try {
        const raw = req.query.values || '';
        const values = String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 150);

        const data = await buildSubcategoryPreviewMap(values);

        res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        res.json({
            message: "Previews obtenidos",
            success: true,
            error: false,
            data
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

module.exports = {
    getProductController,
    getHomeProductsController,
    getSubcategoryPreviewImagesController
};

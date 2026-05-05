// backend/controller/product/getProduct.js - VERSIÓN OPTIMIZADA COMPLETA
const productModel = require("../../models/productModel")

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

const STOCK_OR = [
    { stock: { $exists: false } },
    { stock: null },
    { stock: { $gt: 0 } }
];

/** Home / vitrinas: incluye catálogo con stock 0 (sync Visão suele llegar así hasta actualizar margen/stock real). */
const HOME_STOCK_OR = [
    ...STOCK_OR,
    { stock: 0 }
];

function queryForPairs(pairs, stockClause = STOCK_OR) {
    const pairOr = pairs.map(({ category, subcategory }) => ({ category, subcategory }));
    return {
        $and: [
            { $or: pairOr },
            { $or: stockClause }
        ]
    };
}

async function fetchSlot(pairs, limit, projection) {
    if (!pairs.length) return [];
    return productModel
        .find(queryForPairs(pairs, HOME_STOCK_OR), projection)
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

/** Slots alineados a taxonomía Visão + legacy donde aplica */
const HOME_SLOT_DEFS = [
    {
        key: 'notebooks',
        limit: 20,
        pairs: [{ category: 'notebook_y_computadoras', subcategory: 'notebook_y_computadoras__notebook__20' }]
    },
    {
        key: 'celulares',
        limit: 20,
        pairs: [{ category: 'celulares_y_tablets', subcategory: 'celulares_y_tablets__celulares__32' }]
    },
    {
        key: 'placas_madre',
        limit: 20,
        pairs: [
            { category: 'placas_madres', subcategory: 'placas_madres__mb_amd__22' },
            { category: 'placas_madres', subcategory: 'placas_madres__mb_intel__22' }
        ]
    },
    {
        key: 'mouses',
        limit: 12,
        pairs: [{ category: 'perifericos', subcategory: 'perifericos__mouse__30' }]
    },
    {
        key: 'monitores',
        limit: 20,
        pairs: [
            { category: 'apple', subcategory: 'apple__monitor__19' },
            { category: 'electronicos', subcategory: 'electronicos__tv_y_video__33' }
        ]
    },
    {
        key: 'memorias_ram',
        limit: 20,
        pairs: [{ category: 'almacenamiento', subcategory: 'almacenamiento__memorias__21' }]
    },
    {
        key: 'discos',
        limit: 20,
        pairs: [
            { category: 'almacenamiento', subcategory: 'almacenamiento__hd__21' },
            { category: 'almacenamiento', subcategory: 'almacenamiento__ssd__21' },
            { category: 'almacenamiento', subcategory: 'almacenamiento__pendrive__21' }
        ]
    },
    {
        key: 'tarjetas_graficas',
        limit: 20,
        pairs: [
            { category: 'tarjetas_graficas', subcategory: 'tarjetas_graficas__vga_nvidia__23' },
            { category: 'tarjetas_graficas', subcategory: 'tarjetas_graficas__vga_radeon__23' },
            { category: 'tarjetas_graficas', subcategory: 'tarjetas_graficas__vga_intel__23' }
        ]
    },
    {
        key: 'apple',
        limit: 20,
        pairs: [
            { category: 'apple', subcategory: 'apple__iphone__19' },
            { category: 'apple', subcategory: 'apple__macbook__19' },
            { category: 'apple', subcategory: 'apple__ipad__19' },
            { category: 'apple', subcategory: 'apple__accesorios__19' }
        ]
    },
    {
        key: 'procesadores',
        limit: 20,
        pairs: [
            { category: 'procesadores', subcategory: 'procesadores__cpu_amd__24' },
            { category: 'procesadores', subcategory: 'procesadores__cpu_intel__24' },
            { category: 'procesadores', subcategory: 'procesadores__cpu_oem__24' }
        ]
    },
    {
        key: 'teclados',
        limit: 12,
        pairs: [{ category: 'perifericos', subcategory: 'perifericos__teclados__30' }]
    }
];

const getHomeProductsController = async(req, res) => {
    try {
        const homeProjection = {
            productName: 1,
            brandName: 1,
            category: 1,
            subcategory: 1,
            productImage: { $slice: 2 },
            price: 1,
            sellingPrice: 1,
            slug: 1,
            stock: 1,
            createdAt: 1
        };

        const slotPromises = HOME_SLOT_DEFS.map(({ key, pairs, limit }) =>
            fetchSlot(pairs, limit, homeProjection).then((products) => ({ key, products }))
        );

        const recentPool = await productModel
            .find({ $or: HOME_STOCK_OR }, homeProjection)
            .sort({ createdAt: -1 })
            .limit(150)
            .lean();

        const recientes = shuffleInPlace([...recentPool]).slice(0, 20);

        const slotResults = await Promise.all(slotPromises);
        const slots = { recientes };
        slotResults.forEach(({ key, products }) => {
            slots[key] = products;
        });

        res.json({
            message: "Productos para home obtenidos",
            success: true,
            error: false,
            data: { slots }
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
const getSubcategoryPreviewImagesController = async (req, res) => {
    try {
        const raw = req.query.values || '';
        const values = String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 150);

        if (!values.length) {
            return res.json({
                message: "OK",
                success: true,
                error: false,
                data: {}
            });
        }

        const pipeline = [
            {
                $match: {
                    subcategory: { $in: values },
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
        ];

        const rows = await productModel.aggregate(pipeline);
        const data = {};
        rows.forEach((r) => {
            if (r._id && r.img) data[r._id] = r.img;
        });

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

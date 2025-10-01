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

// ✅ NUEVO CONTROLADOR PARA HOME OPTIMIZADO
const getHomeProductsController = async(req, res) => {
    try {
        // ✅ PRODUCTOS ESPECÍFICOS PARA HOME CON LÍMITES
        const categories = [
            { category: 'informatica', subcategory: 'notebooks', limit: 20 },
            { category: 'informatica', subcategory: 'placas_madre', limit: 20 },
            { category: 'perifericos', subcategory: 'monitores', limit: 20 },
            { category: 'informatica', subcategory: 'memorias_ram', limit: 20 },
            { category: 'informatica', subcategory: 'discos_duros', limit: 20 },
            { category: 'informatica', subcategory: 'tarjeta_grafica', limit: 20 },
            { category: 'informatica', subcategory: 'gabinetes', limit: 20 },
            { category: 'informatica', subcategory: 'procesador', limit: 20 },
            { category: 'perifericos', subcategory: 'mouses', limit: 12 },
            { category: 'perifericos', subcategory: 'teclados', limit: 12 },
            { category: 'telefonia', subcategory: 'telefonos_moviles', limit: 20 },
        ];
        
        // ✅ PROYECCIÓN MÍNIMA PARA HOME
        const homeProjection = {
            productName: 1,
            brandName: 1,
            category: 1,
            subcategory: 1,
            productImage: { $slice: 2 }, // Solo 2 imágenes
            price: 1,
            sellingPrice: 1,
            slug: 1,
            stock: 1
        };
        
        // ✅ CONSULTAS PARALELAS
        const productPromises = categories.map(async ({ category, subcategory, limit }) => {
            const products = await productModel
                .find({ 
                    category, 
                    subcategory,
                    $or: [
                        { stock: { $exists: false } },
                        { stock: null },
                        { stock: { $gt: 0 } }
                    ]
                }, homeProjection)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
                
            return {
                category,
                subcategory,
                products
            };
        });
        
        const results = await Promise.all(productPromises);
        
        // ✅ ORGANIZAR RESPUESTA
        const homeData = {};
        results.forEach(({ category, subcategory, products }) => {
            if (!homeData[category]) homeData[category] = {};
            homeData[category][subcategory] = products;
        });
        
        res.json({
            message: "Productos para home obtenidos",
            success: true,
            error: false,
            data: homeData
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
    getHomeProductsController
};
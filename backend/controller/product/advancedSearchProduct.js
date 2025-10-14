const productModel = require("../../models/productModel");

const advancedSearchProduct = async (req, res) => {
    try {
        const {
            q, // término de búsqueda
            categories, // array de categorías
            subcategories, // array de subcategorías
            brands, // array de marcas
            minPrice, // precio mínimo
            maxPrice, // precio máximo
            sortBy, // campo de ordenamiento
            sortOrder, // orden (asc/desc)
            page = 1, // página
            limit = 20, // límite por página
            ...specFilters // filtros de especificaciones
        } = req.query;

        // Construir el objeto de filtro principal
        let filter = {};

        // ✅ BÚSQUEDA POR TÉRMINO DE TEXTO
        if (q && q.trim()) {
            const searchTerms = q.trim().split(/\s+/).filter(term => term.length > 0);
            const searchConditions = searchTerms.map(term => {
                const regex = new RegExp(term, 'i');
                return {
                    "$or": [
                        { productName: regex },
                        { category: regex },
                        { subcategory: regex },
                        { brandName: regex },
                        { processor: regex },
                        { memory: regex },
                        { storage: regex },
                        { disk: regex },
                        { graphicsCard: regex },
                        { monitorSize: regex },
                        { monitorRefreshRate: regex },
                        { cameraResolution: regex },
                        { dvrChannels: regex },
                        { nasCapacity: regex },
                        { printerType: regex },
                        { printerFunctions: regex },
                        { psuWattage: regex },
                        { upsCapacity: regex },
                        { airpodsModel: regex },
                        { softwareLicenseType: regex },
                        { phoneType: regex },
                        { phoneStorage: regex }
                    ]
                };
            });

            if (searchConditions.length > 0) {
                filter.$and = searchConditions;
            }
        }

        // ✅ FILTRO POR CATEGORÍAS
        if (categories) {
            const categoryArray = Array.isArray(categories) ? categories : categories.split(',');
            filter.category = { $in: categoryArray };
        }

        // ✅ FILTRO POR SUBCATEGORÍAS
        if (subcategories) {
            const subcategoryArray = Array.isArray(subcategories) ? subcategories : subcategories.split(',');
            filter.subcategory = { $in: subcategoryArray };
        }

        // ✅ FILTRO POR MARCAS
        if (brands) {
            const brandArray = Array.isArray(brands) ? brands : brands.split(',');
            filter.brandName = { $in: brandArray };
        }

        // ✅ FILTRO POR RANGO DE PRECIOS
        if (minPrice || maxPrice) {
            filter.sellingPrice = {};
            if (minPrice) {
                filter.sellingPrice.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                filter.sellingPrice.$lte = parseFloat(maxPrice);
            }
        }

        // ✅ FILTROS DE ESPECIFICACIONES DINÁMICAS
        Object.keys(specFilters).forEach(key => {
            if (key.startsWith('spec_') && specFilters[key]) {
                const specKey = key.replace('spec_', '');
                const specValues = Array.isArray(specFilters[key]) ? specFilters[key] : specFilters[key].split(',');
                
                // Crear regex para cada valor de especificación
                const regexArray = specValues.map(value => new RegExp(value, 'i'));
                filter[specKey] = { $in: regexArray };
            }
        });

        // ✅ FILTRO DE PRODUCTOS CON STOCK
        filter.$or = [
            { stock: { $exists: false } },
            { stock: null },
            { stock: { $gt: 0 } }
        ];

        // ✅ CONFIGURACIÓN DE ORDENAMIENTO
        const sortOptions = {};
        if (sortBy) {
            switch (sortBy) {
                case 'price_asc':
                    sortOptions.sellingPrice = 1;
                    break;
                case 'price_desc':
                    sortOptions.sellingPrice = -1;
                    break;
                case 'name_asc':
                    sortOptions.productName = 1;
                    break;
                case 'name_desc':
                    sortOptions.productName = -1;
                    break;
                case 'relevance':
                    // Para relevancia, ordenar por fecha de creación (más recientes primero)
                    sortOptions.createdAt = -1;
                    break;
                default:
                    sortOptions.createdAt = -1;
            }
        } else {
            sortOptions.createdAt = -1;
        }

        // ✅ PAGINACIÓN
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // ✅ PROYECCIÓN OPTIMIZADA
        const projection = {
            productName: 1,
            brandName: 1,
            category: 1,
            subcategory: 1,
            productImage: { $slice: 2 },
            price: 1,
            sellingPrice: 1,
            stock: 1,
            isVipOffer: 1,
            slug: 1,
            createdAt: 1,
            // Incluir campos de especificaciones comunes
            processor: 1,
            memory: 1,
            storage: 1,
            disk: 1,
            graphicsCard: 1,
            monitorSize: 1,
            monitorRefreshRate: 1
        };

        // ✅ EJECUTAR CONSULTA OPTIMIZADA
        const [products, totalProducts] = await Promise.all([
            productModel.find(filter, projection)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean()
                .maxTimeMS(5000), // Timeout de 5 segundos
            productModel.countDocuments(filter).maxTimeMS(3000)
        ]);

        // ✅ OBTENER FILTROS DISPONIBLES PARA LOS RESULTADOS
        const availableFilters = await getAvailableFilters(filter);

        res.json({
            success: true,
            data: products,
            total: totalProducts,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            filters: availableFilters,
            message: `${totalProducts} productos encontrados`
        });

    } catch (error) {
        console.error('Error in advanced search:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ✅ FUNCIÓN PARA OBTENER FILTROS DISPONIBLES
const getAvailableFilters = async (baseFilter) => {
    try {
        // Obtener marcas únicas
        const brands = await productModel.distinct('brandName', baseFilter);
        
        // Obtener especificaciones disponibles
        const specifications = {};
        
        // Campos de especificaciones comunes
        const specFields = [
            'processor', 'memory', 'storage', 'disk', 'graphicsCard', 
            'monitorSize', 'monitorRefreshRate', 'cameraResolution',
            'dvrChannels', 'nasCapacity', 'printerType', 'printerFunctions',
            'psuWattage', 'upsCapacity', 'airpodsModel', 'softwareLicenseType',
            'phoneType', 'phoneStorage'
        ];

        for (const field of specFields) {
            const values = await productModel.distinct(field, {
                ...baseFilter,
                [field]: { $exists: true, $ne: null, $ne: '' }
            });
            
            if (values.length > 0) {
                specifications[field] = values.filter(val => val && val.toString().trim());
            }
        }

        return {
            brands: brands.filter(brand => brand && brand.toString().trim()),
            specifications
        };
    } catch (error) {
        console.error('Error getting available filters:', error);
        return {
            brands: [],
            specifications: {}
        };
    }
};

module.exports = advancedSearchProduct;

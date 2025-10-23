const uploadProductPermission = require("../../helpers/permission");
const productModel = require("../../models/productModel");
const { generateSlug, generateUniqueSlug } = require('../../helpers/slugGenerator');
const { calculatePrices } = require('../../utils/priceCalculator');

async function UploadProductController(req, res) {
    try {
        // console.log removed for production
        const sessionUserId = req.userId;

        const hasPermission = await uploadProductPermission(sessionUserId);
        if (!hasPermission) {
            throw new Error("Permiso Denegado");
        }

        // Generar slug para el producto
        const productData = req.body;
        
        // 🔍 DEBUG: Mostrar datos recibidos
        console.log('🔍 UploadProduct - Datos recibidos:', {
            productName: productData.productName,
            purchasePriceUSD: productData.purchasePriceUSD,
            exchangeRate: productData.exchangeRate,
            deliveryCost: productData.deliveryCost,
            profitMargin: productData.profitMargin,
            price: productData.price,
            sellingPrice: productData.sellingPrice
        });
        
        const baseSlug = generateSlug(productData.productName);
        
        // Función para verificar si un slug ya existe
        const checkExistingSlug = async (slug) => {
            const existingProduct = await productModel.findOne({ slug });
            return !!existingProduct;
        };
        
        // Generar slug único
        productData.slug = await generateUniqueSlug(baseSlug, checkExistingSlug);

        // ✅ VALIDAR Y PROCESAR CÓDIGO DEL PRODUCTO
        if (!productData.codigo) {
            throw new Error("El código del producto es requerido");
        }
        
        // Convertir código a mayúsculas y limpiar espacios
        productData.codigo = productData.codigo.toString().toUpperCase().trim();
        
        // Verificar si el código ya existe
        const existingCode = await productModel.findOne({ codigo: productData.codigo });
        if (existingCode) {
            throw new Error(`El código "${productData.codigo}" ya existe. Por favor usa un código diferente.`);
        }

        // ✅ VALIDAR Y PROCESAR CAMPOS DE PRECIO
        // Validar campo price (precio anterior)
        if (productData.price === undefined || productData.price === null) {
            productData.price = 0; // Default a 0 si no se proporciona
        }

        // Validar que price no sea negativo
        if (productData.price < 0) {
            throw new Error("El precio anterior no puede ser negativo");
        }

        // ✅ CALCULAR PRECIOS AUTOMÁTICAMENTE SI SE PROPORCIONA PRECIO USD
        if (productData.purchasePriceUSD && productData.purchasePriceUSD > 0) {
            console.log('💰 Calculando precios automáticamente...');
            
            // Valores por defecto
            const exchangeRate = productData.exchangeRate || 7300;
            const deliveryCost = productData.deliveryCost || 30000;
            const profitMargin = productData.profitMargin || 20;

            console.log('📊 Parámetros de cálculo:', {
                purchasePriceUSD: productData.purchasePriceUSD,
                exchangeRate,
                deliveryCost,
                profitMargin
            });

            // Calcular precios automáticamente
            const calculatedPrices = calculatePrices(
                productData.purchasePriceUSD,
                exchangeRate,
                deliveryCost,
                profitMargin
            );

            console.log('✅ Precios calculados:', calculatedPrices);

            // Actualizar los campos calculados
            productData.purchasePrice = calculatedPrices.purchasePrice;
            productData.deliveryCost = calculatedPrices.deliveryCost;
            productData.profitMargin = calculatedPrices.profitMargin;
            productData.profitAmount = calculatedPrices.profitAmount;
            productData.exchangeRate = calculatedPrices.exchangeRate;

            // Siempre actualizar sellingPrice con el valor calculado
            console.log('🔄 Actualizando sellingPrice calculado:', calculatedPrices.sellingPrice);
            productData.sellingPrice = calculatedPrices.sellingPrice;
        } else {
            console.log('❌ No se calculan precios automáticamente - purchasePriceUSD:', productData.purchasePriceUSD);
        }

        // Validar que sellingPrice sea positivo
        if (!productData.sellingPrice || productData.sellingPrice <= 0) {
            throw new Error("El precio de venta debe ser mayor a 0");
        }

        // IMPORTANTE: No sobrescribir price con sellingPrice
        // El campo price debe mantenerse como precio anterior (para descuentos)
        // El campo sellingPrice es el precio actual de venta

        console.log('💾 Datos finales a guardar:', {
            productName: productData.productName,
            price: productData.price,
            sellingPrice: productData.sellingPrice,
            purchasePriceUSD: productData.purchasePriceUSD,
            purchasePrice: productData.purchasePrice,
            exchangeRate: productData.exchangeRate,
            deliveryCost: productData.deliveryCost,
            profitMargin: productData.profitMargin,
            profitAmount: productData.profitAmount
        });

        const uploadProduct = new productModel(productData);
        const saveProduct = await uploadProduct.save();

        res.status(201).json({
            message: "Producto Cargado Sastifactoriamente",
            error: false,
            success: true,
            data: saveProduct
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = UploadProductController;
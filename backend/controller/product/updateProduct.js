const uploadProductPermission = require('../../helpers/permission');
const ProductModel = require('../../models/productModel');
const { generateSlug, generateUniqueSlug } = require('../../helpers/slugGenerator');

async function updateProductController(req, res) {
    try {
        // Verificar permisos de manera asíncrona
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado. Se requieren permisos de administrador.",
                error: true,
                success: false
            });
        }

        const { _id, ...resBody } = req.body;

        // Logs detallados para debugging
        console.log('🔍 Backend - updateProductController iniciado');
        console.log('🔍 Backend - Headers recibidos:', req.headers);
        console.log('🔍 Backend - Body completo recibido:', JSON.stringify(req.body, null, 2));
        console.log('🔍 Backend - _id extraído:', _id);
        console.log('🔍 Backend - resBody extraído:', JSON.stringify(resBody, null, 2));

        // Verificar si el producto existe
        console.log('🔍 Backend - Buscando producto con _id:', _id);
        const existingProduct = await ProductModel.findById(_id);
        if (!existingProduct) {
            console.log('❌ Backend - Producto no encontrado con _id:', _id);
            throw new Error("El producto no existe o ya ha sido eliminado");
        }
        console.log('✅ Backend - Producto encontrado:', {
            _id: existingProduct._id,
            productName: existingProduct.productName,
            sellingPrice: existingProduct.sellingPrice
        });

        // Si el nombre del producto ha cambiado, actualizar el slug
        if (resBody.productName && resBody.productName !== existingProduct.productName) {
            const baseSlug = generateSlug(resBody.productName);
            
            // Función para verificar si un slug ya existe
            const checkExistingSlug = async (slug) => {
                const existingProductWithSlug = await ProductModel.findOne({
                    slug,
                    _id: { $ne: _id }
                });
                return !!existingProductWithSlug;
            };
            
            // Generar slug único
            resBody.slug = await generateUniqueSlug(baseSlug, checkExistingSlug);
        }

        // ✅ VALIDAR Y PROCESAR CÓDIGO DEL PRODUCTO SI SE ACTUALIZA
        if (resBody.codigo) {
            // Convertir código a mayúsculas y limpiar espacios
            resBody.codigo = resBody.codigo.toString().toUpperCase().trim();
            
            // Verificar si el código ya existe en otro producto
            const existingCode = await ProductModel.findOne({ 
                codigo: resBody.codigo,
                _id: { $ne: _id }
            });
            if (existingCode) {
                throw new Error(`El código "${resBody.codigo}" ya existe en otro producto. Por favor usa un código diferente.`);
            }
        }

        // ✅ MAPEAR CAMPOS DE PRECIO CORRECTAMENTE
        // price = precio anterior (para descuentos)
        // sellingPrice = precio actual de venta
        // No sobrescribir price con sellingPrice
        console.log('🔍 Backend - Mapeo de precios:', {
            price: resBody.price,
            sellingPrice: resBody.sellingPrice
        });

        // Actualizar el producto y devolver el documento actualizado
        console.log('🔍 Backend - Actualizando producto con datos:', JSON.stringify(resBody, null, 2));
        const updatedProduct = await ProductModel.findByIdAndUpdate(_id, resBody, { new: true });
        console.log('✅ Backend - Producto actualizado exitosamente:', {
            _id: updatedProduct._id,
            productName: updatedProduct.productName,
            sellingPrice: updatedProduct.sellingPrice,
            price: updatedProduct.price
        });

        res.json({
            message: "Producto actualizado correctamente",
            data: updatedProduct,
            success: true,
            error: false
        });

    } catch (err) {
        console.error('💥 Backend - Error en updateProductController:', err);
        console.error('💥 Backend - Error details:', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = {
    updateProductController,
};
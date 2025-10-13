const uploadProductPermission = require('../../helpers/permission');
const ProductModel = require('../../models/productModel');
const { generateSlug, generateUniqueSlug } = require('../../helpers/slugGenerator');

async function updateProductController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { _id, ...resBody } = req.body;

        console.log('🔍 Backend - Datos recibidos para actualizar producto:', {
            _id,
            resBody: JSON.stringify(resBody, null, 2)
        });

        // Verificar si el producto existe
        const existingProduct = await ProductModel.findById(_id);
        if (!existingProduct) {
            throw new Error("El producto no existe o ya ha sido eliminado");
        }

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

        // Actualizar el producto y devolver el documento actualizado
        const updatedProduct = await ProductModel.findByIdAndUpdate(_id, resBody, { new: true });

        res.json({
            message: "Producto actualizado correctamente",
            data: updatedProduct,
            success: true,
            error: false
        });

    } catch (err) {
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
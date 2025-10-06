require('dotenv').config({ path: '../.env' }); // Sube un nivel para encontrar .env en la raíz de backend
const mongoose = require('mongoose');
const ProductModel = require('../models/productModel'); // Sube un nivel para la carpeta models
const { generateSlug, generateUniqueSlug } = require('../helpers/slugGenerator'); // Sube un nivel para la carpeta helpers

async function connectDB() {
  try {
    
    await mongoose.connect(process.env.MONGODB_URI);
    
  } catch (err) {
    console.error('Error de conexión a MongoDB:', err);
    process.exit(1);
  }
}

async function generateSlugsForProducts() {
  try {
    // Verificar si el modelo tiene campo slug
    const modelFields = Object.keys(ProductModel.schema.paths);
    if (!modelFields.includes('slug')) {
      
      
      // Actualizar el esquema programáticamente
      ProductModel.schema.add({
        slug: { 
          type: String, 
          unique: true,
          sparse: true
        }
      });
      
      
    }
    
    // Obtener todos los productos sin slug
    const products = await ProductModel.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });

    

    let updated = 0;

    for (const product of products) {
      const baseSlug = generateSlug(product.productName);

      // Función para verificar si un slug ya existe
      const checkExistingSlug = async (slug) => {
        const existingProduct = await ProductModel.findOne({
          slug,
          _id: { $ne: product._id }
        });
        return !!existingProduct;
      };

      // Generar slug único
      const uniqueSlug = await generateUniqueSlug(baseSlug, checkExistingSlug);

      // Actualizar producto
      await ProductModel.updateOne(
        { _id: product._id },
        { $set: { slug: uniqueSlug } }
      );

      updated++;
      
    }

    

  } catch (error) {
    console.error('Error al generar slugs:', error);
  } finally {
    mongoose.disconnect();
    
  }
}

// Ejecutar la migración

connectDB()
  .then(() => generateSlugsForProducts())
  .catch(err => console.error('Error en el script:', err));
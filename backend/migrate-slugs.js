const mongoose = require('mongoose');
const slugify = require('slugify');
const productModel = require('./models/productModel');

// URI de conexión correcta
const MONGO_URI = 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function migrateProductSlugs() {
  try {
    // Conectar directamente a MongoDB
    await mongoose.connect(MONGO_URI);
    
    // Encontrar todos los productos
    const products = await productModel.find({});
    
    let updated = 0;
    
    for (const product of products) {
      try {
        // Generar slug a partir del nombre del producto
        const baseSlug = slugify(product.productName || 'producto', {
          lower: true,
          strict: true,
          trim: true
        });
        
        // Añadir un identificador único para evitar duplicados
        const uniqueSlug = `${baseSlug}-${product._id.toString().slice(-6)}`;
        
        // Actualizar el producto directamente en la base de datos para evitar validación
        await productModel.updateOne(
          { _id: product._id },
          { $set: { slug: uniqueSlug } },
          { validateBeforeSave: false }
        );
        
        updated++;
      } catch (itemError) {
        console.error(`Error en producto ${product._id}:`, itemError.message);
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error en la migración:', error);
    mongoose.disconnect();
  }
}

migrateProductSlugs();
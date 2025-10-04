const mongoose = require('mongoose');
const slugify = require('slugify');
const productModel = require('./models/productModel');

// URI de conexión correcta
const MONGO_URI = 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function fixProductSlug() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(MONGO_URI);
   
    
    // Encontrar el producto específico
    const product = await productModel.findById('67b343ea45a2c1e4df25849d');
    
    if (!product) {
      
      mongoose.disconnect();
      return;
    }
    
    
    
    // Generar slug
    const baseSlug = slugify(product.productName || 'producto', {
      lower: true,
      strict: true,
      trim: true
    });
    
    // Añadir ID al final para hacerlo único
    const uniqueSlug = `${baseSlug}-${product._id.toString().slice(-6)}`;
    
    // Actualizar el producto
    product.slug = uniqueSlug;
    await product.save();

    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

fixProductSlug();
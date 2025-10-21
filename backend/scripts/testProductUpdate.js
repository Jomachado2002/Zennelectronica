const mongoose = require('mongoose');
const ProductModel = require('../models/productModel');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zenn_electronica', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testProductUpdate() {
  try {
    // console.log removed for production
    
    // Buscar un producto para probar
    const product = await ProductModel.findOne({});
    if (!product) {
      // console.log removed for production
      return;
    }
    
    console.log('📦 Producto encontrado:', {
      _id: product._id,
      productName: product.productName,
      sellingPrice: product.sellingPrice,
      price: product.price,
      purchasePriceUSD: product.purchasePriceUSD,
      exchangeRate: product.exchangeRate,
      profitMargin: product.profitMargin
    });
    
    // Simular datos de actualización
    const updateData = {
      _id: product._id,
      productName: product.productName,
      sellingPrice: product.sellingPrice + 1000, // Aumentar precio
      price: product.price + 1000,
      purchasePriceUSD: product.purchasePriceUSD || 10,
      exchangeRate: product.exchangeRate || 7300,
      profitMargin: product.profitMargin || 30,
      loanInterest: product.loanInterest || 5,
      deliveryCost: product.deliveryCost || 5000
    };
    
    // console.log removed for production
    
    // Probar la actualización
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      product._id, 
      updateData, 
      { new: true }
    );
    
    if (updatedProduct) {
      console.log('✅ Producto actualizado exitosamente:', {
        _id: updatedProduct._id,
        productName: updatedProduct.productName,
        sellingPrice: updatedProduct.sellingPrice,
        price: updatedProduct.price
      });
    } else {
      // console.log removed for production
    }
    
  } catch (error) {
    // console.error removed for production
  } finally {
    mongoose.connection.close();
  }
}

testProductUpdate();

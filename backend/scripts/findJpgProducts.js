const mongoose = require('mongoose');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function findJpgProducts() {
    try {
        // console.log removed for production
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        // console.log removed for production

        // Buscar productos con imágenes JPG
        const products = await productModel.find({
            productImage: { 
                $exists: true, 
                $ne: [],
                $regex: /\.jpg|\.jpeg/i
            }
        }).limit(20);

        if (products.length === 0) {
            // console.log removed for production
            return;
        }

        // console.log removed for production

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const jpgImages = product.productImage.filter(img => img.includes('.jpg') || img.includes('.jpeg'));
            const webpImages = product.productImage.filter(img => img.includes('.webp'));
            
            // console.log removed for production
            // console.log removed for production
            // console.log removed for production
            // console.log removed for production
            // console.log removed for production
        }

        // console.log removed for production

    } catch (error) {
        // console.error removed for production
    } finally {
        await mongoose.disconnect();
        // console.log removed for production
    }
}

// Ejecutar la búsqueda
findJpgProducts();





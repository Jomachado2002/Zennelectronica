const mongoose = require('mongoose');

const getCategoriesFromDB = async (req, res) => {
  try {
    // Usar directamente la conexión de MongoDB
    const db = mongoose.connection.db;
    
    // Primero vamos a ver qué colecciones hay
    const collections = await db.listCollections().toArray();
    console.log('🔍 Colecciones disponibles:', collections.map(c => c.name));
    
    // Intentar con diferentes nombres de colección
    const possibleCollections = ['categories', 'Categories', 'category', 'Category'];
    let categories = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        // console.log removed for production
        
        if (count > 0) {
          categories = await collection.find({}).sort({ order: 1 }).toArray();
          // console.log removed for production
          break;
        }
      } catch (e) {
        // console.log removed for production
      }
    }
    
    res.json({
      message: "Categorías obtenidas exitosamente",
      data: categories,
      success: true,
      error: false
    });
  } catch (err) {
    // console.error removed for production
    res.status(500).json({
      message: err.message || "Error interno del servidor",
      error: true,
      success: false
    });
  }
};

module.exports = getCategoriesFromDB;

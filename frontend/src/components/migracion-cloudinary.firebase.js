const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');

// Configuración de MongoDB
const MONGODB_URI = 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// Configuración de Firebase directamente en el código
const firebaseConfig = {
  apiKey: "AIzaSyBizDZqVCrTnU1-D5ajvaNCx0ZrRM_uLUo",
  authDomain: "eccomerce-jmcomputer.firebaseapp.com",
  projectId: "eccomerce-jmcomputer",
  storageBucket: "eccomerce-jmcomputer.firebasestorage.app",
  messagingSenderId: "283552064252",
  appId: "1:283552064252:web:04049ae8f8c2cfa1906d79",
  measurementId: "G-CZMQK251CP"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Crear carpeta temporal para almacenar imágenes
const carpetaTemporal = path.join(__dirname, 'temp_imagenes');
if (!fs.existsSync(carpetaTemporal)) {
  fs.mkdirSync(carpetaTemporal);
}

// Esquema del Producto
const ProductSchema = new mongoose.Schema({
  productName: String,
  brandName: String,
  category: String,
  subcategory: String,
  productImage: [String],
  description: String,
  price: Number,
  sellingPrice: Number,
  documentationLink: String,
  processor: String,
  disk: String,
  graphicsCard: String,
  memory: String,
  storage: String,
  battery: String,
  connectivity: String,
  display: String,
  graphics: String,
  operatingSystem: String,
  ports: String,
  weight: String,
  screenSize: String,
  notebookScreen: String,
  slug: String
}, { timestamps: true });

// Función para descargar imagen
async function descargarImagen(url, nombreArchivo) {
  const rutaArchivo = path.join(carpetaTemporal, nombreArchivo);
  
  try {
    const respuesta = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const escritor = fs.createWriteStream(rutaArchivo);
    respuesta.data.pipe(escritor);
    
    return new Promise((resolve, reject) => {
      escritor.on('finish', () => resolve(rutaArchivo));
      escritor.on('error', reject);
    });
  } catch (error) {
    console.error(`Error al descargar ${url}:`, error.message);
    throw error;
  }
}

// Función para subir a Firebase
async function subirAFirebase(rutaArchivo, urlOriginal) {
  try {
    const nombreArchivo = path.basename(rutaArchivo);
    const idUnico = uuidv4();
    const nuevoNombreArchivo = `${idUnico}_${nombreArchivo}`;
    
    // Leer archivo
    const archivoBuffer = fs.readFileSync(rutaArchivo);
    
    // Subir a Firebase
    const rutaAlmacenamiento = 'products';
    const rutaCompleta = `${rutaAlmacenamiento}/${nuevoNombreArchivo}`;
    const referenciaAlmacenamiento = ref(storage, rutaCompleta);
    
    const snapshot = await uploadBytes(referenciaAlmacenamiento, archivoBuffer);
    const urlDescarga = await getDownloadURL(snapshot.ref);
    
    console.log(`Migrado: ${urlOriginal} -> ${urlDescarga}`);
    return urlDescarga;
  } catch (error) {
    console.error('Error al subir a Firebase:', error);
    throw error;
  }
}

// Extraer nombre de archivo de URL
function extraerNombreArchivoDeUrl(url) {
  try {
    const partes = url.split('/');
    const ultimaParte = partes[partes.length - 1];
    
    const nombreArchivoConParametros = ultimaParte.split('?')[0];
    
    if (!nombreArchivoConParametros.includes('.')) {
      return `${nombreArchivoConParametros}.jpg`;
    }
    
    return nombreArchivoConParametros;
  } catch (error) {
    return `imagen_${Date.now()}.jpg`;
  }
}

// Guardar mapa de URLs
function guardarMapeoUrl(mapaUrl) {
  const rutaMapeo = path.join(__dirname, 'mapeo_url.json');
  fs.writeFileSync(rutaMapeo, JSON.stringify(mapaUrl, null, 2));
  console.log(`Mapeo de URL guardado en ${rutaMapeo}`);
}

// Función principal
async function migrarImagenes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Registrar modelo
    let Producto;
    try {
      Producto = mongoose.model('Product');
    } catch (e) {
      Producto = mongoose.model('Product', ProductSchema);
    }
    
    // Obtener productos con imágenes
    const productos = await Producto.find({ productImage: { $exists: true, $ne: [] } });
    console.log(`Encontrados ${productos.length} productos con imágenes para migrar`);
    
    const mapaUrl = {};
    let productosActualizados = 0;
    let errores = 0;
    
    // Procesar cada producto
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      console.log(`Procesando producto ${i+1}/${productos.length}: ${producto.productName}`);
      
      const urlsImagenesActualizadas = [];
      let productoActualizado = false;
      
      // Procesar cada imagen
      for (let j = 0; j < producto.productImage.length; j++) {
        const urlImagen = producto.productImage[j];
        
        // Omitir si ya está migrada
        if (urlImagen.includes('firebase') || !urlImagen.includes('cloudinary') || mapaUrl[urlImagen]) {
          urlsImagenesActualizadas.push(mapaUrl[urlImagen] || urlImagen);
          continue;
        }
        
        try {
          // Descargar imagen
          const nombreArchivo = extraerNombreArchivoDeUrl(urlImagen);
          const rutaArchivo = await descargarImagen(urlImagen, nombreArchivo);
          
          // Subir a Firebase
          const nuevaUrl = await subirAFirebase(rutaArchivo, urlImagen);
          mapaUrl[urlImagen] = nuevaUrl;
          urlsImagenesActualizadas.push(nuevaUrl);
          productoActualizado = true;
          
          // Eliminar archivo temporal
          fs.unlinkSync(rutaArchivo);
        } catch (error) {
          console.error(`Error procesando imagen ${j+1} para producto ${producto.productName}:`, error);
          urlsImagenesActualizadas.push(urlImagen);
          errores++;
        }
      }
      
      if (productoActualizado) {
        // Actualizar producto
        await Producto.findByIdAndUpdate(producto._id, { productImage: urlsImagenesActualizadas });
        console.log(`Producto actualizado: ${producto.productName}`);
        productosActualizados++;
      }
    }
    
    // Guardar mapeo
    guardarMapeoUrl(mapaUrl);
    
    console.log(`¡Migración completada con éxito!`);
    console.log(`Productos actualizados: ${productosActualizados}`);
    console.log(`Errores encontrados: ${errores}`);
  } catch (error) {
    console.error('La migración falló:', error);
  } finally {
    // Limpiar carpeta temporal
    if (fs.existsSync(carpetaTemporal)) {
      fs.readdirSync(carpetaTemporal).forEach(archivo => {
        try {
          fs.unlinkSync(path.join(carpetaTemporal, archivo));
        } catch (e) {}
      });
      try {
        fs.rmdirSync(carpetaTemporal);
      } catch (e) {}
    }
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

// Ejecutar la migración
migrarImagenes().catch(console.error);
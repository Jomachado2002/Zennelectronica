#!/usr/bin/env node

/**
 * Script para poblar categorías y subcategorías en la base de datos
 * 
 * Este script:
 * 1. Lee las categorías hardcodeadas
 * 2. Las inserta en la base de datos usando el modelo Category
 * 3. Verifica si ya existen para evitar duplicados
 * 
 * Uso: node backend/scripts/populate-categories.js
 */

const mongoose = require('mongoose');
const Category = require('../models/categoryModel');

// Configuración de base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// ============================================
// CATEGORÍAS Y SUBCATEGORÍAS HARDCODEADAS
// ============================================

const categoriesData = [
  {
    name: "informatica",
    label: "Informática",
    value: "informatica",
    order: 1,
    color: "#3B82F6",
    icon: "FaLaptop",
    subcategories: [
      {
        name: "notebooks",
        label: "Notebooks",
        value: "notebooks",
        order: 1,
        specifications: [
          { name: "processor", label: "Procesador", type: "text", placeholder: "Ej: Intel Core i5-11400H", required: true, order: 1 },
          { name: "memory", label: "Memoria RAM", type: "text", placeholder: "Ej: 8GB DDR4", required: true, order: 2 },
          { name: "storage", label: "Almacenamiento", type: "text", placeholder: "Ej: 512GB SSD", required: true, order: 3 },
          { name: "disk", label: "Disco", type: "text", placeholder: "Ej: SSD NVMe", required: false, order: 4 },
          { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", placeholder: "Ej: NVIDIA GTX 1650", required: false, order: 5 },
          { name: "notebookScreen", label: "Pantalla", type: "text", placeholder: "Ej: 15.6\" Full HD", required: true, order: 6 },
          { name: "notebookBattery", label: "Batería", type: "text", placeholder: "Ej: 56Wh", required: false, order: 7 }
        ]
      },
      {
        name: "computadoras_ensambladas",
        label: "Computadoras Ensambladas",
        value: "computadoras_ensambladas",
        order: 2,
        specifications: [
          { name: "processor", label: "Procesador", type: "text", placeholder: "Ej: AMD Ryzen 5 5600X", required: true, order: 1 },
          { name: "memory", label: "Memoria RAM", type: "text", placeholder: "Ej: 16GB DDR4", required: true, order: 2 },
          { name: "storage", label: "Almacenamiento", type: "text", placeholder: "Ej: 1TB SSD", required: true, order: 3 },
          { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", placeholder: "Ej: NVIDIA RTX 3060", required: false, order: 4 },
          { name: "pcCase", label: "Gabinete", type: "text", placeholder: "Ej: NZXT H510", required: true, order: 5 },
          { name: "pcPowerSupply", label: "Fuente de Poder", type: "text", placeholder: "Ej: 650W 80+ Bronze", required: true, order: 6 },
          { name: "pcCooling", label: "Refrigeración", type: "text", placeholder: "Ej: Cooler Master Hyper 212", required: false, order: 7 }
        ]
      },
      {
        name: "placas_madre",
        label: "Placas Madre",
        value: "placas_madre",
        order: 3,
        specifications: [
          { name: "motherboardSocket", label: "Socket", type: "text", placeholder: "Ej: AM4", required: true, order: 1 },
          { name: "motherboardChipset", label: "Chipset", type: "text", placeholder: "Ej: B550", required: true, order: 2 },
          { name: "motherboardFormFactor", label: "Factor de Forma", type: "text", placeholder: "Ej: ATX", required: true, order: 3 },
          { name: "expansionSlots", label: "Slots de Expansión", type: "text", placeholder: "Ej: 2x PCIe x16", required: false, order: 4 },
          { name: "ramType", label: "Tipo de RAM", type: "text", placeholder: "Ej: DDR4", required: false, order: 5 }
        ]
      },
      {
        name: "tarjeta_grafica",
        label: "Tarjetas Gráficas",
        value: "tarjeta_grafica",
        order: 4,
        specifications: [
          { name: "graphicCardModel", label: "Modelo", type: "text", placeholder: "Ej: RTX 3070", required: true, order: 1 },
          { name: "graphicCardMemory", label: "Memoria", type: "text", placeholder: "Ej: 8GB GDDR6", required: true, order: 2 },
          { name: "graphicCardMemoryType", label: "Tipo de Memoria", type: "text", placeholder: "Ej: GDDR6", required: false, order: 3 },
          { name: "graphicCardBaseFrequency", label: "Frecuencia Base", type: "text", placeholder: "Ej: 1500 MHz", required: false, order: 4 },
          { name: "graphicfabricate", label: "Fabricante", type: "text", placeholder: "Ej: ASUS", required: false, order: 5 },
          { name: "graphicCardTDP", label: "TDP", type: "text", placeholder: "Ej: 220W", required: false, order: 6 }
        ]
      },
      {
        name: "gabinetes",
        label: "Gabinetes",
        value: "gabinetes",
        order: 5,
        specifications: [
          { name: "caseFormFactor", label: "Factor de Forma", type: "text", placeholder: "Ej: ATX", required: true, order: 1 },
          { name: "caseMaterial", label: "Material", type: "text", placeholder: "Ej: Acero templado", required: false, order: 2 },
          { name: "caseExpansionBays", label: "Bahías de Expansión", type: "text", placeholder: "Ej: 2x 3.5\", 2x 2.5\"", required: false, order: 3 },
          { name: "caseIncludedFans", label: "Ventiladores Incluidos", type: "text", placeholder: "Ej: 2x 120mm", required: false, order: 4 },
          { name: "caseCoolingSupport", label: "Soporte de Refrigeración", type: "text", placeholder: "Ej: 280mm radiador", required: false, order: 5 },
          { name: "caseBacklight", label: "Iluminación", type: "boolean", placeholder: "", required: false, order: 6 }
        ]
      },
      {
        name: "memorias_ram",
        label: "Memorias RAM",
        value: "memorias_ram",
        order: 6,
        specifications: [
          { name: "ramText", label: "Descripción", type: "text", placeholder: "Descripción adicional", required: false, order: 1 },
          { name: "ramType", label: "Tipo", type: "text", placeholder: "Ej: DDR4", required: true, order: 2 },
          { name: "ramSpeed", label: "Velocidad", type: "text", placeholder: "Ej: 3200 MHz", required: true, order: 3 },
          { name: "ramCapacity", label: "Capacidad", type: "text", placeholder: "Ej: 16GB (2x8GB)", required: true, order: 4 },
          { name: "ramLatency", label: "Latencia", type: "text", placeholder: "Ej: CL16", required: false, order: 5 }
        ]
      },
      {
        name: "discos_duros",
        label: "Discos Duros",
        value: "discos_duros",
        order: 7,
        specifications: [
          { name: "hddCapacity", label: "Capacidad", type: "text", placeholder: "Ej: 1TB", required: true, order: 1 },
          { name: "diskType", label: "Tipo", type: "text", placeholder: "Ej: SSD / HDD", required: true, order: 2 },
          { name: "hddInterface", label: "Interfaz", type: "text", placeholder: "Ej: SATA III / NVMe", required: true, order: 3 },
          { name: "hddRPM", label: "RPM", type: "text", placeholder: "Ej: 7200 RPM", required: false, order: 4 },
          { name: "diskReadSpeed", label: "Velocidad de Lectura", type: "text", placeholder: "Ej: 3500 MB/s", required: false, order: 5 },
          { name: "diskWriteSpeed", label: "Velocidad de Escritura", type: "text", placeholder: "Ej: 3000 MB/s", required: false, order: 6 }
        ]
      },
      {
        name: "procesador",
        label: "Procesadores",
        value: "procesador",
        order: 8,
        specifications: [
          { name: "model", label: "Modelo", type: "text", placeholder: "Ej: Ryzen 7 5800X", required: true, order: 1 },
          { name: "processorSocket", label: "Socket", type: "text", placeholder: "Ej: AM4", required: true, order: 2 },
          { name: "processorCores", label: "Núcleos", type: "number", placeholder: "Ej: 8", required: true, order: 3 },
          { name: "processorThreads", label: "Hilos", type: "number", placeholder: "Ej: 16", required: true, order: 4 },
          { name: "processorBaseFreq", label: "Frecuencia Base", type: "text", placeholder: "Ej: 3.8 GHz", required: true, order: 5 },
          { name: "processorTurboFreq", label: "Frecuencia Turbo", type: "text", placeholder: "Ej: 4.7 GHz", required: false, order: 6 }
        ]
      }
    ]
  },
  {
    name: "perifericos",
    label: "Periféricos",
    value: "perifericos",
    order: 2,
    color: "#10B981",
    icon: "FaKeyboard",
    subcategories: [
      {
        name: "monitores",
        label: "Monitores",
        value: "monitores",
        order: 1,
        specifications: [
          { name: "monitorSize", label: "Tamaño", type: "text", placeholder: "Ej: 27\"", required: true, order: 1 },
          { name: "monitorResolution", label: "Resolución", type: "text", placeholder: "Ej: 2560x1440 (QHD)", required: true, order: 2 },
          { name: "monitorRefreshRate", label: "Tasa de Refresco", type: "text", placeholder: "Ej: 144Hz", required: false, order: 3 },
          { name: "monitorPanel", label: "Tipo de Panel", type: "text", placeholder: "Ej: IPS", required: false, order: 4 },
          { name: "monitorConnectivity", label: "Conectividad", type: "text", placeholder: "Ej: HDMI, DisplayPort", required: false, order: 5 }
        ]
      },
      {
        name: "teclados",
        label: "Teclados",
        value: "teclados",
        order: 2,
        specifications: [
          { name: "keyboardType", label: "Tipo", type: "text", placeholder: "Ej: Gaming, Oficina", required: true, order: 1 },
          { name: "keyboardConnection", label: "Conexión", type: "text", placeholder: "Ej: USB, Bluetooth", required: true, order: 2 },
          { name: "keyboardMechanical", label: "Mecánico", type: "boolean", placeholder: "", required: false, order: 3 },
          { name: "keyboardBacklight", label: "Retroiluminado", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      },
      {
        name: "mouses",
        label: "Mouses",
        value: "mouses",
        order: 3,
        specifications: [
          { name: "mouseType", label: "Tipo", type: "text", placeholder: "Ej: Gaming, Oficina", required: true, order: 1 },
          { name: "mouseConnection", label: "Conexión", type: "text", placeholder: "Ej: USB, Bluetooth", required: true, order: 2 },
          { name: "mouseDPI", label: "DPI", type: "number", placeholder: "Ej: 16000", required: false, order: 3 },
          { name: "mouseWireless", label: "Inalámbrico", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      },
      {
        name: "auriculares",
        label: "Auriculares",
        value: "auriculares",
        order: 4,
        specifications: [
          { name: "headphoneType", label: "Tipo", type: "text", placeholder: "Ej: Gaming, Studio", required: true, order: 1 },
          { name: "headphoneConnection", label: "Conexión", type: "text", placeholder: "Ej: USB, 3.5mm, Bluetooth", required: true, order: 2 },
          { name: "headphoneWireless", label: "Inalámbrico", type: "boolean", placeholder: "", required: false, order: 3 },
          { name: "headphoneNoiseCancelling", label: "Cancelación de Ruido", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      },
      {
        name: "parlantes",
        label: "Parlantes",
        value: "parlantes",
        order: 5,
        specifications: [
          { name: "speakerType", label: "Tipo", type: "text", placeholder: "Ej: 2.0, 2.1, 5.1", required: true, order: 1 },
          { name: "speakerPower", label: "Potencia", type: "text", placeholder: "Ej: 50W RMS", required: false, order: 2 },
          { name: "speakerConnection", label: "Conexión", type: "text", placeholder: "Ej: USB, 3.5mm, Bluetooth", required: true, order: 3 },
          { name: "speakerWireless", label: "Inalámbrico", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      },
      {
        name: "webcam",
        label: "Webcams",
        value: "webcam",
        order: 6,
        specifications: [
          { name: "webcamResolution", label: "Resolución", type: "text", placeholder: "Ej: 1080p Full HD", required: true, order: 1 },
          { name: "webcamFPS", label: "FPS", type: "text", placeholder: "Ej: 30fps, 60fps", required: false, order: 2 },
          { name: "webcamConnection", label: "Conexión", type: "text", placeholder: "Ej: USB 2.0, USB 3.0", required: true, order: 3 },
          { name: "webcamMicrophone", label: "Micrófono Integrado", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      }
    ]
  },
  {
    name: "telefonia",
    label: "Telefonía",
    value: "telefonia",
    order: 3,
    color: "#8B5CF6",
    icon: "FaMobile",
    subcategories: [
      {
        name: "telefonos_moviles",
        label: "Teléfonos Móviles",
        value: "telefonos_moviles",
        order: 1,
        specifications: [
          { name: "phoneBrand", label: "Marca", type: "text", placeholder: "Ej: Samsung, iPhone", required: true, order: 1 },
          { name: "phoneModel", label: "Modelo", type: "text", placeholder: "Ej: Galaxy S23", required: true, order: 2 },
          { name: "phoneStorage", label: "Almacenamiento", type: "text", placeholder: "Ej: 256GB", required: true, order: 3 },
          { name: "phoneRAM", label: "RAM", type: "text", placeholder: "Ej: 8GB", required: false, order: 4 },
          { name: "phoneScreen", label: "Pantalla", type: "text", placeholder: "Ej: 6.1\" AMOLED", required: false, order: 5 },
          { name: "phoneCamera", label: "Cámara", type: "text", placeholder: "Ej: 50MP + 12MP + 10MP", required: false, order: 6 }
        ]
      },
      {
        name: "tablets",
        label: "Tablets",
        value: "tablets",
        order: 2,
        specifications: [
          { name: "tabletBrand", label: "Marca", type: "text", placeholder: "Ej: iPad, Samsung", required: true, order: 1 },
          { name: "tabletModel", label: "Modelo", type: "text", placeholder: "Ej: iPad Pro", required: true, order: 2 },
          { name: "tabletStorage", label: "Almacenamiento", type: "text", placeholder: "Ej: 128GB", required: true, order: 3 },
          { name: "tabletScreen", label: "Pantalla", type: "text", placeholder: "Ej: 11\" Liquid Retina", required: true, order: 4 },
          { name: "tabletOS", label: "Sistema Operativo", type: "text", placeholder: "Ej: iPadOS, Android", required: false, order: 5 }
        ]
      },
      {
        name: "smartwatch",
        label: "Smartwatches",
        value: "smartwatch",
        order: 3,
        specifications: [
          { name: "smartwatchBrand", label: "Marca", type: "text", placeholder: "Ej: Apple, Samsung", required: true, order: 1 },
          { name: "smartwatchModel", label: "Modelo", type: "text", placeholder: "Ej: Apple Watch Series 9", required: true, order: 2 },
          { name: "smartwatchDisplay", label: "Pantalla", type: "text", placeholder: "Ej: OLED 1.9\"", required: false, order: 3 },
          { name: "smartwatchBattery", label: "Batería", type: "text", placeholder: "Ej: Hasta 18 horas", required: false, order: 4 },
          { name: "smartwatchWaterResistant", label: "Resistente al Agua", type: "boolean", placeholder: "", required: false, order: 5 }
        ]
      }
    ]
  },
  {
    name: "gaming",
    label: "Gaming",
    value: "gaming",
    order: 4,
    color: "#EF4444",
    icon: "FaGamepad",
    subcategories: [
      {
        name: "consolas",
        label: "Consolas",
        value: "consolas",
        order: 1,
        specifications: [
          { name: "consoleBrand", label: "Marca", type: "text", placeholder: "Ej: PlayStation, Xbox, Nintendo", required: true, order: 1 },
          { name: "consoleModel", label: "Modelo", type: "text", placeholder: "Ej: PlayStation 5", required: true, order: 2 },
          { name: "consoleStorage", label: "Almacenamiento", type: "text", placeholder: "Ej: 825GB SSD", required: false, order: 3 },
          { name: "consoleResolution", label: "Resolución", type: "text", placeholder: "Ej: 4K", required: false, order: 4 }
        ]
      },
      {
        name: "mandos_controles",
        label: "Mandos y Controles",
        value: "mandos_controles",
        order: 2,
        specifications: [
          { name: "controllerType", label: "Tipo", type: "text", placeholder: "Ej: Inalámbrico, Con cable", required: true, order: 1 },
          { name: "controllerCompatibility", label: "Compatibilidad", type: "text", placeholder: "Ej: PS5, Xbox, PC", required: true, order: 2 },
          { name: "controllerBattery", label: "Batería", type: "text", placeholder: "Ej: Hasta 12 horas", required: false, order: 3 }
        ]
      },
      {
        name: "sillas_gaming",
        label: "Sillas Gaming",
        value: "sillas_gaming",
        order: 3,
        specifications: [
          { name: "chairMaterial", label: "Material", type: "text", placeholder: "Ej: Cuero PU, Tela mesh", required: true, order: 1 },
          { name: "chairMaxWeight", label: "Peso Máximo", type: "text", placeholder: "Ej: 150kg", required: false, order: 2 },
          { name: "chairRecline", label: "Reclinable", type: "boolean", placeholder: "", required: false, order: 3 },
          { name: "chairArmrests", label: "Apoyabrazos Ajustables", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      }
    ]
  },
  {
    name: "audio_video",
    label: "Audio y Video",
    value: "audio_video",
    order: 5,
    color: "#F59E0B",
    icon: "FaVideo",
    subcategories: [
      {
        name: "camaras_fotografia",
        label: "Cámaras de Fotografía",
        value: "camaras_fotografia",
        order: 1,
        specifications: [
          { name: "cameraType", label: "Tipo", type: "text", placeholder: "Ej: DSLR, Mirrorless", required: true, order: 1 },
          { name: "cameraSensor", label: "Sensor", type: "text", placeholder: "Ej: Full Frame, APS-C", required: false, order: 2 },
          { name: "cameraMegapixels", label: "Megapíxeles", type: "text", placeholder: "Ej: 24.2 MP", required: false, order: 3 },
          { name: "cameraVideoResolution", label: "Resolución de Video", type: "text", placeholder: "Ej: 4K 60fps", required: false, order: 4 }
        ]
      },
      {
        name: "televisores",
        label: "Televisores",
        value: "televisores",
        order: 2,
        specifications: [
          { name: "tvSize", label: "Tamaño", type: "text", placeholder: "Ej: 55\"", required: true, order: 1 },
          { name: "tvResolution", label: "Resolución", type: "text", placeholder: "Ej: 4K Ultra HD", required: true, order: 2 },
          { name: "tvPanelType", label: "Tipo de Panel", type: "text", placeholder: "Ej: OLED, QLED, LED", required: false, order: 3 },
          { name: "tvSmartTV", label: "Smart TV", type: "boolean", placeholder: "", required: false, order: 4 },
          { name: "tvRefreshRate", label: "Tasa de Refresco", type: "text", placeholder: "Ej: 120Hz", required: false, order: 5 }
        ]
      }
    ]
  },
  {
    name: "accesorios",
    label: "Accesorios",
    value: "accesorios",
    order: 6,
    color: "#6366F1",
    icon: "FaPlug",
    subcategories: [
      {
        name: "cables",
        label: "Cables",
        value: "cables",
        order: 1,
        specifications: [
          { name: "cableType", label: "Tipo", type: "text", placeholder: "Ej: HDMI, USB-C, DisplayPort", required: true, order: 1 },
          { name: "cableLength", label: "Longitud", type: "text", placeholder: "Ej: 2m", required: false, order: 2 },
          { name: "cableVersion", label: "Versión", type: "text", placeholder: "Ej: HDMI 2.1, USB 3.2", required: false, order: 3 }
        ]
      },
      {
        name: "cargadores",
        label: "Cargadores",
        value: "cargadores",
        order: 2,
        specifications: [
          { name: "chargerType", label: "Tipo", type: "text", placeholder: "Ej: Pared, Portátil, Carro", required: true, order: 1 },
          { name: "chargerPower", label: "Potencia", type: "text", placeholder: "Ej: 65W", required: false, order: 2 },
          { name: "chargerPorts", label: "Puertos", type: "text", placeholder: "Ej: 2x USB-C, 1x USB-A", required: false, order: 3 },
          { name: "chargerFastCharging", label: "Carga Rápida", type: "boolean", placeholder: "", required: false, order: 4 }
        ]
      },
      {
        name: "fundas_protectores",
        label: "Fundas y Protectores",
        value: "fundas_protectores",
        order: 3,
        specifications: [
          { name: "caseDevice", label: "Dispositivo", type: "text", placeholder: "Ej: iPhone 15 Pro", required: true, order: 1 },
          { name: "caseMaterial", label: "Material", type: "text", placeholder: "Ej: Silicona, TPU, Cuero", required: false, order: 2 },
          { name: "caseProtectionLevel", label: "Nivel de Protección", type: "text", placeholder: "Ej: Militar, Básica", required: false, order: 3 }
        ]
      },
      {
        name: "baterias_powerbanks",
        label: "Baterías y Powerbanks",
        value: "baterias_powerbanks",
        order: 4,
        specifications: [
          { name: "powerBankCapacity", label: "Capacidad", type: "text", placeholder: "Ej: 20000mAh", required: true, order: 1 },
          { name: "powerBankPorts", label: "Puertos", type: "text", placeholder: "Ej: 2x USB-A, 1x USB-C", required: false, order: 2 },
          { name: "powerBankFastCharging", label: "Carga Rápida", type: "boolean", placeholder: "", required: false, order: 3 }
        ]
      }
    ]
  }
];

// ============================================
// FUNCIONES DEL SCRIPT
// ============================================

/**
 * Conectar a la base de datos
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    throw error;
  }
}

/**
 * Poblar categorías en la base de datos
 */
async function populateCategories() {
  try {
    console.log('\n🔄 Iniciando proceso de población de categorías...\n');

    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    let categoriesSkipped = 0;

    for (const categoryData of categoriesData) {
      // Verificar si la categoría ya existe
      const existingCategory = await Category.findOne({ value: categoryData.value });

      if (existingCategory) {
        console.log(`⚠️  Categoría "${categoryData.label}" ya existe. Actualizando...`);
        
        // Actualizar la categoría existente
        existingCategory.name = categoryData.name;
        existingCategory.label = categoryData.label;
        existingCategory.order = categoryData.order;
        existingCategory.color = categoryData.color;
        existingCategory.icon = categoryData.icon;
        
        // Actualizar subcategorías
        for (const subcategoryData of categoryData.subcategories) {
          const existingSubcategory = existingCategory.subcategories.find(
            sub => sub.value === subcategoryData.value
          );

          if (existingSubcategory) {
            // Actualizar subcategoría existente
            existingSubcategory.name = subcategoryData.name;
            existingSubcategory.label = subcategoryData.label;
            existingSubcategory.order = subcategoryData.order;
            existingSubcategory.specifications = subcategoryData.specifications;
          } else {
            // Agregar nueva subcategoría
            existingCategory.subcategories.push(subcategoryData);
            console.log(`   ➕ Subcategoría "${subcategoryData.label}" agregada`);
          }
        }

        await existingCategory.save();
        categoriesUpdated++;
        console.log(`   ✅ Categoría "${categoryData.label}" actualizada con ${categoryData.subcategories.length} subcategorías\n`);
      } else {
        // Crear nueva categoría
        const newCategory = new Category(categoryData);
        await newCategory.save();
        categoriesCreated++;
        console.log(`✅ Categoría "${categoryData.label}" creada con ${categoryData.subcategories.length} subcategorías\n`);
      }
    }

    console.log('\n📊 RESUMEN DEL PROCESO:');
    console.log(`   • Categorías creadas: ${categoriesCreated}`);
    console.log(`   • Categorías actualizadas: ${categoriesUpdated}`);
    console.log(`   • Categorías omitidas: ${categoriesSkipped}`);
    console.log('\n✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error poblando categorías:', error.message);
    throw error;
  }
}

/**
 * Verificar el resultado
 */
async function verifyCategories() {
  try {
    console.log('\n🔍 Verificando categorías en la base de datos...\n');

    const categories = await Category.find({}).sort({ order: 1 });
    
    console.log(`📦 Total de categorías: ${categories.length}\n`);

    categories.forEach(category => {
      console.log(`📁 ${category.label} (${category.value})`);
      console.log(`   • Subcategorías: ${category.subcategories.length}`);
      
      category.subcategories.forEach(subcategory => {
        console.log(`     └─ ${subcategory.label} (${subcategory.value}) - ${subcategory.specifications.length} especificaciones`);
      });
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error verificando categorías:', error.message);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('   SCRIPT DE POBLACIÓN DE CATEGORÍAS');
    console.log('═══════════════════════════════════════════════════\n');

    // Conectar a la base de datos
    await connectToDatabase();

    // Poblar categorías
    await populateCategories();

    // Verificar resultado
    await verifyCategories();

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✨ SCRIPT COMPLETADO EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error ejecutando el script:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar el script
main();


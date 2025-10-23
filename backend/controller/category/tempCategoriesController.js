// Controlador para categorías con especificaciones - Obtiene categorías reales de la base de datos
const productModel = require('../../models/productModel');

const getTempCategoriesWithSpecs = async (req, res) => {
  try {
    // Obtener todas las categorías y subcategorías únicas de la base de datos
    const categories = await productModel.aggregate([
      {
        $group: {
          _id: {
            category: "$category",
            subcategory: "$subcategory"
          }
        }
      },
      {
        $group: {
          _id: "$_id.category",
          subcategories: {
            $push: "$_id.subcategory"
          }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Mapeo de especificaciones por subcategoría (basado en el modelo de producto)
    const specificationMappings = {
      // Informática
      notebooks: [
        { name: "processor", label: "Procesador", type: "text", required: true },
        { name: "memory", label: "Memoria RAM", type: "text", required: true },
        { name: "storage", label: "Almacenamiento", type: "text", required: true },
        { name: "disk", label: "Disco", type: "text", required: false },
        { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", required: false },
        { name: "notebookScreen", label: "Pantalla", type: "text", required: true },
        { name: "notebookBattery", label: "Batería", type: "text", required: false }
      ],
      computadoras_ensambladas: [
        { name: "processor", label: "Procesador", type: "text", required: true },
        { name: "memory", label: "Memoria RAM", type: "text", required: true },
        { name: "storage", label: "Almacenamiento", type: "text", required: true },
        { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", required: false },
        { name: "pcCase", label: "Gabinete", type: "text", required: true },
        { name: "pcPowerSupply", label: "Fuente de Poder", type: "text", required: true },
        { name: "pcCooling", label: "Refrigeración", type: "text", required: false }
      ],
      placas_madre: [
        { name: "motherboardSocket", label: "Socket", type: "text", required: true },
        { name: "motherboardChipset", label: "Chipset", type: "text", required: true },
        { name: "motherboardFormFactor", label: "Factor de Forma", type: "text", required: true },
        { name: "expansionSlots", label: "Slots de Expansión", type: "text", required: false },
        { name: "ramType", label: "Tipo de RAM", type: "text", required: false }
      ],
      tarjeta_grafica: [
        { name: "graphicCardModel", label: "Modelo", type: "text", required: true },
        { name: "graphicCardMemory", label: "Memoria", type: "text", required: true },
        { name: "graphicCardMemoryType", label: "Tipo de Memoria", type: "text", required: false },
        { name: "graphicCardBaseFrequency", label: "Frecuencia Base", type: "text", required: false },
        { name: "graphicfabricate", label: "Fabricante", type: "text", required: false },
        { name: "graphicCardTDP", label: "TDP", type: "text", required: false }
      ],
      gabinetes: [
        { name: "caseFormFactor", label: "Factor de Forma", type: "text", required: true },
        { name: "caseMaterial", label: "Material", type: "text", required: false },
        { name: "caseExpansionBays", label: "Bahías de Expansión", type: "text", required: false },
        { name: "caseIncludedFans", label: "Ventiladores Incluidos", type: "text", required: false },
        { name: "caseCoolingSupport", label: "Soporte de Refrigeración", type: "text", required: false },
        { name: "caseBacklight", label: "Iluminación", type: "boolean", required: false }
      ],
      memorias_ram: [
        { name: "ramText", label: "Descripción", type: "text", required: false },
        { name: "ramType", label: "Tipo", type: "text", required: true },
        { name: "ramSpeed", label: "Velocidad", type: "text", required: true },
        { name: "ramCapacity", label: "Capacidad", type: "text", required: true },
        { name: "ramLatency", label: "Latencia", type: "text", required: false }
      ],
      discos_duros: [
        { name: "hddCapacity", label: "Capacidad", type: "text", required: true },
        { name: "diskType", label: "Tipo", type: "text", required: true },
        { name: "hddInterface", label: "Interfaz", type: "text", required: true },
        { name: "hddRPM", label: "RPM", type: "text", required: false },
        { name: "diskReadSpeed", label: "Velocidad de Lectura", type: "text", required: false },
        { name: "diskWriteSpeed", label: "Velocidad de Escritura", type: "text", required: false }
      ],
      procesador: [
        { name: "model", label: "Modelo", type: "text", required: true },
        { name: "processorSocket", label: "Socket", type: "text", required: true },
        { name: "processorCores", label: "Núcleos", type: "number", required: true },
        { name: "processorThreads", label: "Hilos", type: "number", required: true },
        { name: "processorBaseFreq", label: "Frecuencia Base", type: "text", required: true },
        { name: "processorTurboFreq", label: "Frecuencia Turbo", type: "text", required: false }
      ],
      // Periféricos
      monitores: [
        { name: "monitorSize", label: "Tamaño", type: "text", required: true },
        { name: "monitorResolution", label: "Resolución", type: "text", required: true },
        { name: "monitorRefreshRate", label: "Tasa de Refresco", type: "text", required: false },
        { name: "monitorPanel", label: "Tipo de Panel", type: "text", required: false },
        { name: "monitorConnectivity", label: "Conectividad", type: "text", required: false }
      ],
      teclados: [
        { name: "keyboardType", label: "Tipo", type: "text", required: true },
        { name: "keyboardConnection", label: "Conexión", type: "text", required: true },
        { name: "keyboardMechanical", label: "Mecánico", type: "boolean", required: false },
        { name: "keyboardBacklight", label: "Retroiluminado", type: "boolean", required: false }
      ],
      mouses: [
        { name: "mouseType", label: "Tipo", type: "text", required: true },
        { name: "mouseConnection", label: "Conexión", type: "text", required: true },
        { name: "mouseDPI", label: "DPI", type: "number", required: false },
        { name: "mouseWireless", label: "Inalámbrico", type: "boolean", required: false }
      ],
      auriculares: [
        { name: "headphoneType", label: "Tipo", type: "text", required: true },
        { name: "headphoneConnection", label: "Conexión", type: "text", required: true },
        { name: "headphoneWireless", label: "Inalámbrico", type: "boolean", required: false },
        { name: "headphoneNoiseCancelling", label: "Cancelación de Ruido", type: "boolean", required: false }
      ],
      // Telefonía
      telefonos_moviles: [
        { name: "phoneBrand", label: "Marca", type: "text", required: true },
        { name: "phoneModel", label: "Modelo", type: "text", required: true },
        { name: "phoneStorage", label: "Almacenamiento", type: "text", required: true },
        { name: "phoneRAM", label: "RAM", type: "text", required: false },
        { name: "phoneScreen", label: "Pantalla", type: "text", required: false },
        { name: "phoneCamera", label: "Cámara", type: "text", required: false }
      ],
      tablets: [
        { name: "tabletBrand", label: "Marca", type: "text", required: true },
        { name: "tabletModel", label: "Modelo", type: "text", required: true },
        { name: "tabletStorage", label: "Almacenamiento", type: "text", required: true },
        { name: "tabletScreen", label: "Pantalla", type: "text", required: true },
        { name: "tabletOS", label: "Sistema Operativo", type: "text", required: false }
      ]
    };

    // Mapeo de nombres de categorías
    const categoryLabels = {
      informatica: "Informática",
      perifericos: "Periféricos",
      telefonia: "Telefonía",
      electronicos: "Electrónicos",
      gaming: "Gaming",
      componentes: "Componentes",
      audio: "Audio",
      video: "Video",
      accesorios: "Accesorios"
    };

    // Mapeo de nombres de subcategorías
    const subcategoryLabels = {
      notebooks: "Notebooks",
      computadoras_ensambladas: "Computadoras Ensambladas",
      placas_madre: "Placas Madre",
      tarjeta_grafica: "Tarjetas Gráficas",
      gabinetes: "Gabinetes",
      memorias_ram: "Memorias RAM",
      discos_duros: "Discos Duros",
      procesador: "Procesadores",
      monitores: "Monitores",
      teclados: "Teclados",
      mouses: "Mouses",
      auriculares: "Auriculares",
      parlantes: "Parlantes",
      webcam: "Webcams",
      telefonos_moviles: "Teléfonos Móviles",
      tablets: "Tablets",
      smartwatch: "Smartwatches",
      camaras_fotografia: "Cámaras de Fotografía",
      televisores: "Televisores",
      consolas: "Consolas"
    };

    // Construir la estructura de categorías
    const categoriesWithSpecs = categories.map(category => ({
      value: category._id,
      label: categoryLabels[category._id] || category._id.charAt(0).toUpperCase() + category._id.slice(1),
      name: categoryLabels[category._id] || category._id.charAt(0).toUpperCase() + category._id.slice(1),
      subcategories: category.subcategories.map(subcategory => ({
        value: subcategory,
        label: subcategoryLabels[subcategory] || subcategory.charAt(0).toUpperCase() + subcategory.slice(1),
        name: subcategoryLabels[subcategory] || subcategory.charAt(0).toUpperCase() + subcategory.slice(1),
        specifications: specificationMappings[subcategory] || []
      }))
    }));

    res.status(200).json({
      success: true,
      data: categoriesWithSpecs,
      message: "Categorías con especificaciones cargadas exitosamente desde la base de datos"
    });
  } catch (error) {
    console.error('Error en getTempCategoriesWithSpecs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getTempCategoriesWithSpecs
};

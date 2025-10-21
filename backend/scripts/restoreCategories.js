const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tu_base_de_datos', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    // console.log removed for production
  } catch (error) {
    // console.error removed for production
    process.exit(1);
  }
};

// Datos completos de categorías - EXACTAMENTE como está en el código hardcodeado
const categoriesData = [
  {
    name: "informatica",
    label: "Informática",
    value: "informatica",
    order: 1,
    isActive: true,
    color: "#002060",
    icon: "FaLaptop",
    subcategories: [
      {
        name: "notebooks",
        label: "Notebooks",
        value: "notebooks",
        isActive: true,
        order: 1,
        specifications: [
          { name: "processor", label: "Procesador", type: "text", placeholder: "Ingresa el procesador", required: false, order: 1, options: [] },
          { name: "memory", label: "Memoria RAM", type: "text", placeholder: "Ingresa la cantidad de memoria RAM", required: false, order: 2, options: [] },
          { name: "storage", label: "Almacenamiento", type: "text", placeholder: "Ingresa el tipo y capacidad de almacenamiento", required: false, order: 3, options: [] },
          { name: "disk", label: "Disco", type: "text", placeholder: "Ingresa el tipo de disco (SSD/HDD)", required: false, order: 4, options: [] },
          { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", placeholder: "Ingresa la tarjeta gráfica (opcional)", required: false, order: 5, options: [] },
          { name: "notebookScreen", label: "Pantalla", type: "text", placeholder: "Ingresa el tamaño y resolución de pantalla", required: false, order: 6, options: [] },
          { name: "notebookBattery", label: "Batería", type: "text", placeholder: "Ingresa la capacidad de la batería", required: false, order: 7, options: [] }
        ]
      },
      {
        name: "computadoras_ensambladas",
        label: "Computadoras Ensambladas",
        value: "computadoras_ensambladas",
        isActive: true,
        order: 2,
        specifications: [
          { name: "processor", label: "Procesador", type: "text", placeholder: "Ingresa el procesador", required: false, order: 1, options: [] },
          { name: "memory", label: "Memoria RAM", type: "text", placeholder: "Ingresa la cantidad de memoria RAM", required: false, order: 2, options: [] },
          { name: "storage", label: "Almacenamiento", type: "text", placeholder: "Ingresa el tipo y capacidad de almacenamiento", required: false, order: 3, options: [] },
          { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", placeholder: "Ingresa la tarjeta gráfica", required: false, order: 4, options: [] },
          { name: "pcCase", label: "Gabinete", type: "text", placeholder: "Ingresa el tipo de gabinete", required: false, order: 5, options: [] },
          { name: "pcPowerSupply", label: "Fuente de Poder", type: "text", placeholder: "Ingresa la fuente de poder", required: false, order: 6, options: [] },
          { name: "pcCooling", label: "Sistema de Enfriamiento", type: "text", placeholder: "Ingresa el sistema de enfriamiento", required: false, order: 7, options: [] }
        ]
      },
      {
        name: "placas_madre",
        label: "Placas Madre",
        value: "placas_madre",
        isActive: true,
        order: 3,
        specifications: [
          { name: "motherboardSocket", label: "Socket", type: "text", placeholder: "Ingresa el tipo de socket", required: false, order: 1, options: [] },
          { name: "motherboardChipset", label: "Chipset", type: "text", placeholder: "Ingresa el chipset", required: false, order: 2, options: [] },
          { name: "motherboardFormFactor", label: "Factor de Forma", type: "text", placeholder: "Ingresa el factor de forma (ATX, mATX, etc.)", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "memorias_ram",
        label: "Memorias RAM",
        value: "memorias_ram",
        isActive: true,
        order: 4,
        specifications: [
          { name: "ramCapacity", label: "Capacidad", type: "text", placeholder: "Ingresa la capacidad de la memoria RAM", required: false, order: 1, options: [] },
          { name: "ramSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad de la memoria RAM", required: false, order: 2, options: [] },
          { name: "ramType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de memoria RAM (DDR4, DDR5, etc.)", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "discos_duros",
        label: "Discos Duros",
        value: "discos_duros",
        isActive: true,
        order: 5,
        specifications: [
          { name: "storageCapacity", label: "Capacidad", type: "text", placeholder: "Ingresa la capacidad del disco", required: false, order: 1, options: [] },
          { name: "storageType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de disco (SSD, HDD)", required: false, order: 2, options: [] },
          { name: "storageInterface", label: "Interfaz", type: "text", placeholder: "Ingresa la interfaz del disco (SATA, NVMe, etc.)", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "procesador",
        label: "Procesador",
        value: "procesador",
        isActive: true,
        order: 6,
        specifications: [
          { name: "processorCores", label: "Núcleos", type: "text", placeholder: "Ingresa el número de núcleos", required: false, order: 1, options: [] },
          { name: "processorThreads", label: "Hilos", type: "text", placeholder: "Ingresa el número de hilos", required: false, order: 2, options: [] },
          { name: "processorSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad del procesador", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "tarjeta_grafica",
        label: "Tarjeta Grafica",
        value: "tarjeta_grafica",
        isActive: true,
        order: 7,
        specifications: [
          { name: "gpuMemory", label: "Memoria", type: "text", placeholder: "Ingresa la memoria de la tarjeta gráfica", required: false, order: 1, options: [] },
          { name: "gpuSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad de la tarjeta gráfica", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "gabinetes",
        label: "Gabinetes",
        value: "gabinetes",
        isActive: true,
        order: 8,
        specifications: [
          { name: "caseFormFactor", label: "Factor de Forma", type: "text", placeholder: "Ingresa el factor de forma del gabinete", required: false, order: 1, options: [] },
          { name: "caseMaterial", label: "Material", type: "text", placeholder: "Ingresa el material del gabinete", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "impresoras",
        label: "Impresoras",
        value: "impresoras",
        isActive: true,
        order: 9,
        specifications: [
          { name: "printerType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de impresora", required: false, order: 1, options: [] },
          { name: "printerResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución de impresión", required: false, order: 2, options: [] },
          { name: "printerSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad de impresión", required: false, order: 3, options: [] },
          { name: "printerConnectivity", label: "Conectividad", type: "text", placeholder: "Ingresa el tipo de conectividad", required: false, order: 4, options: [] },
          { name: "printerDuplex", label: "Dúplex", type: "text", placeholder: "Ingresa si tiene impresión a doble cara", required: false, order: 5, options: [] },
          { name: "printerTrayCapacity", label: "Capacidad de Bandeja", type: "text", placeholder: "Ingresa la capacidad de la bandeja", required: false, order: 6, options: [] }
        ]
      },
      {
        name: "cartuchos_toners",
        label: "Cartuchos y Toners",
        value: "cartuchos_toners",
        isActive: true,
        order: 10,
        specifications: [
          { name: "tonerPrinterType", label: "Tipo de Impresora", type: "text", placeholder: "Ingresa el tipo de impresora compatible", required: false, order: 1, options: [] },
          { name: "tonerColor", label: "Color", type: "text", placeholder: "Ingresa el color del cartucho", required: false, order: 2, options: [] },
          { name: "tonerYield", label: "Rendimiento", type: "text", placeholder: "Ingresa el rendimiento del cartucho", required: false, order: 3, options: [] },
          { name: "tonerCartridgeType", label: "Tipo de Cartucho", type: "text", placeholder: "Ingresa el tipo de cartucho", required: false, order: 4, options: [] },
          { name: "tonerCompatibleModel", label: "Modelo Compatible", type: "text", placeholder: "Ingresa los modelos compatibles", required: false, order: 5, options: [] }
        ]
      },
      {
        name: "escaneres",
        label: "Escáneres",
        value: "escaneres",
        isActive: true,
        order: 11,
        specifications: [
          { name: "scannerResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución del escáner", required: false, order: 1, options: [] },
          { name: "scannerType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de escáner", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "perifericos",
    label: "Periféricos",
    value: "perifericos",
    order: 2,
    isActive: true,
    color: "#10B981",
    icon: "FaMouse",
    subcategories: [
      {
        name: "monitores",
        label: "Monitores",
        value: "monitores",
        isActive: true,
        order: 1,
        specifications: [
          { name: "monitorSize", label: "Tamaño", type: "text", placeholder: "Ingresa el tamaño del monitor", required: false, order: 1, options: [] },
          { name: "monitorResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución del monitor", required: false, order: 2, options: [] },
          { name: "monitorRefreshRate", label: "Frecuencia de Actualización", type: "text", placeholder: "Ingresa la frecuencia de actualización", required: false, order: 3, options: [] },
          { name: "monitorPanelType", label: "Tipo de Panel", type: "text", placeholder: "Ingresa el tipo de panel", required: false, order: 4, options: [] }
        ]
      },
      {
        name: "teclados",
        label: "Teclados",
        value: "teclados",
        isActive: true,
        order: 2,
        specifications: [
          { name: "keyboardType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de teclado", required: false, order: 1, options: [] },
          { name: "keyboardConnection", label: "Conexión", type: "text", placeholder: "Ingresa el tipo de conexión", required: false, order: 2, options: [] },
          { name: "keyboardLayout", label: "Distribución", type: "text", placeholder: "Ingresa la distribución del teclado", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "mouses",
        label: "Mouses",
        value: "mouses",
        isActive: true,
        order: 3,
        specifications: [
          { name: "mouseDpi", label: "DPI", type: "text", placeholder: "Ingresa el DPI del mouse", required: false, order: 1, options: [] },
          { name: "mouseConnection", label: "Conexión", type: "text", placeholder: "Ingresa el tipo de conexión", required: false, order: 2, options: [] },
          { name: "mouseButtons", label: "Botones", type: "text", placeholder: "Ingresa el número de botones", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "adaptadores",
        label: "Adaptadores",
        value: "adaptadores",
        isActive: true,
        order: 4,
        specifications: [
          { name: "adapterType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de adaptador", required: false, order: 1, options: [] },
          { name: "adapterCompatibility", label: "Compatibilidad", type: "text", placeholder: "Ingresa la compatibilidad", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "auriculares",
        label: "Auriculares",
        value: "auriculares",
        isActive: true,
        order: 5,
        specifications: [
          { name: "headphoneType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de auricular", required: false, order: 1, options: [] },
          { name: "headphoneConnection", label: "Conexión", type: "text", placeholder: "Ingresa el tipo de conexión", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "microfonos",
        label: "Microfonos",
        value: "microfonos",
        isActive: true,
        order: 6,
        specifications: [
          { name: "microphoneType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de micrófono", required: false, order: 1, options: [] },
          { name: "microphoneConnection", label: "Conexión", type: "text", placeholder: "Ingresa el tipo de conexión", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "cctv",
    label: "CCTV",
    value: "cctv",
    order: 3,
    isActive: true,
    color: "#EF4444",
    icon: "FaVideo",
    subcategories: [
      {
        name: "camaras_seguridad",
        label: "Cámaras de Seguridad",
        value: "camaras_seguridad",
        isActive: true,
        order: 1,
        specifications: [
          { name: "cameraResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución de la cámara", required: false, order: 1, options: [] },
          { name: "cameraType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de cámara", required: false, order: 2, options: [] },
          { name: "cameraNightVision", label: "Visión Nocturna", type: "text", placeholder: "Ingresa si tiene visión nocturna", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "dvr",
        label: "Grabadores DVR",
        value: "dvr",
        isActive: true,
        order: 2,
        specifications: [
          { name: "dvrChannels", label: "Canales", type: "text", placeholder: "Ingresa el número de canales", required: false, order: 1, options: [] },
          { name: "dvrStorage", label: "Almacenamiento", type: "text", placeholder: "Ingresa la capacidad de almacenamiento", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "nas",
        label: "NAS",
        value: "nas",
        isActive: true,
        order: 3,
        specifications: [
          { name: "nasStorage", label: "Almacenamiento", type: "text", placeholder: "Ingresa la capacidad de almacenamiento", required: false, order: 1, options: [] },
          { name: "nasBays", label: "Bahías", type: "text", placeholder: "Ingresa el número de bahías", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "impresoras",
    label: "Impresoras",
    value: "impresoras",
    order: 4,
    isActive: true,
    color: "#8B5CF6",
    icon: "FaPrint",
    subcategories: [
      {
        name: "impresoras_laser",
        label: "Impresoras Láser",
        value: "impresoras_laser",
        isActive: true,
        order: 1,
        specifications: [
          { name: "laserSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad de impresión", required: false, order: 1, options: [] },
          { name: "laserResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución de impresión", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "impresoras_multifuncion",
        label: "Impresoras Multifunción",
        value: "impresoras_multifuncion",
        isActive: true,
        order: 2,
        specifications: [
          { name: "multifunctionFeatures", label: "Funciones", type: "text", placeholder: "Ingresa las funciones disponibles", required: false, order: 1, options: [] },
          { name: "multifunctionConnectivity", label: "Conectividad", type: "text", placeholder: "Ingresa el tipo de conectividad", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "cartuchostoner",
        label: "Cartuchos y toner",
        value: "cartuchostoner",
        isActive: true,
        order: 3,
        specifications: [
          { name: "cartridgeType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de cartucho", required: false, order: 1, options: [] },
          { name: "cartridgeCompatibility", label: "Compatibilidad", type: "text", placeholder: "Ingresa los modelos compatibles", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "energia",
    label: "Energia",
    value: "energia",
    order: 5,
    isActive: true,
    color: "#F59E0B",
    icon: "FaBolt",
    subcategories: [
      {
        name: "fuentes_alimentacion",
        label: "Fuentes de Alimentación",
        value: "fuentes_alimentacion",
        isActive: true,
        order: 1,
        specifications: [
          { name: "psuWattage", label: "Potencia", type: "text", placeholder: "Ingresa la potencia en Watts", required: false, order: 1, options: [] },
          { name: "psuEfficiency", label: "Eficiencia", type: "text", placeholder: "Ingresa la eficiencia", required: false, order: 2, options: [] },
          { name: "psuModular", label: "Modular", type: "text", placeholder: "Ingresa si es modular", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "ups",
        label: "UPS",
        value: "ups",
        isActive: true,
        order: 2,
        specifications: [
          { name: "upsCapacity", label: "Capacidad", type: "text", placeholder: "Ingresa la capacidad del UPS", required: false, order: 1, options: [] },
          { name: "upsAutonomy", label: "Autonomía", type: "text", placeholder: "Ingresa la autonomía en minutos", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "software_licencias",
    label: "Software y Licencias",
    value: "software_licencias",
    order: 6,
    isActive: true,
    color: "#3B82F6",
    icon: "FaCode",
    subcategories: [
      {
        name: "licencias",
        label: "Licencias de Software",
        value: "licencias",
        isActive: true,
        order: 1,
        specifications: [
          { name: "licenseType", label: "Tipo de Licencia", type: "text", placeholder: "Ingresa el tipo de licencia", required: false, order: 1, options: [] },
          { name: "licenseDuration", label: "Duración", type: "text", placeholder: "Ingresa la duración de la licencia", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "telefonia",
    label: "Telefonía",
    value: "telefonia",
    order: 7,
    isActive: true,
    color: "#EC4899",
    icon: "FaMobile",
    subcategories: [
      {
        name: "telefonos_moviles",
        label: "Teléfonos Móviles",
        value: "telefonos_moviles",
        isActive: true,
        order: 1,
        specifications: [
          { name: "phoneScreenSize", label: "Tamaño de Pantalla", type: "text", placeholder: "Ingresa el tamaño de pantalla", required: false, order: 1, options: [] },
          { name: "phoneCamera", label: "Cámara", type: "text", placeholder: "Ingresa las especificaciones de la cámara", required: false, order: 2, options: [] },
          { name: "phoneBattery", label: "Batería", type: "text", placeholder: "Ingresa la capacidad de la batería", required: false, order: 3, options: [] },
          { name: "phoneStorage", label: "Almacenamiento", type: "text", placeholder: "Ingresa la capacidad de almacenamiento", required: false, order: 4, options: [] },
          { name: "phoneRam", label: "RAM", type: "text", placeholder: "Ingresa la cantidad de RAM", required: false, order: 5, options: [] },
          { name: "phoneProcessor", label: "Procesador", type: "text", placeholder: "Ingresa el procesador", required: false, order: 6, options: [] }
        ]
      },
      {
        name: "telefonos_fijos",
        label: "Teléfonos Fijos",
        value: "telefonos_fijos",
        isActive: true,
        order: 2,
        specifications: [
          { name: "landlineType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de teléfono fijo", required: false, order: 1, options: [] },
          { name: "landlineFeatures", label: "Características", type: "text", placeholder: "Ingresa las características", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "tablets",
        label: "Tablets",
        value: "tablets",
        isActive: true,
        order: 3,
        specifications: [
          { name: "tabletScreenSize", label: "Tamaño de Pantalla", type: "text", placeholder: "Ingresa el tamaño de pantalla", required: false, order: 1, options: [] },
          { name: "tabletStorage", label: "Almacenamiento", type: "text", placeholder: "Ingresa la capacidad de almacenamiento", required: false, order: 2, options: [] },
          { name: "tabletConnectivity", label: "Conectividad", type: "text", placeholder: "Ingresa el tipo de conectividad", required: false, order: 3, options: [] }
        ]
      }
    ]
  },
  {
    name: "redes",
    label: "Redes",
    value: "redes",
    order: 8,
    isActive: true,
    color: "#6366F1",
    icon: "FaNetworkWired",
    subcategories: [
      {
        name: "switch",
        label: "Switch",
        value: "switch",
        isActive: true,
        order: 1,
        specifications: [
          { name: "switchPorts", label: "Puertos", type: "text", placeholder: "Ingresa el número de puertos", required: false, order: 1, options: [] },
          { name: "switchSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad por puerto", required: false, order: 2, options: [] },
          { name: "switchManaged", label: "Administrado", type: "text", placeholder: "Ingresa si es managed o unmanaged", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "servidores",
        label: "Servidores",
        value: "servidores",
        isActive: true,
        order: 2,
        specifications: [
          { name: "serverProcessor", label: "Procesador", type: "text", placeholder: "Ingresa el procesador", required: false, order: 1, options: [] },
          { name: "serverRam", label: "RAM", type: "text", placeholder: "Ingresa la cantidad de RAM", required: false, order: 2, options: [] },
          { name: "serverStorage", label: "Almacenamiento", type: "text", placeholder: "Ingresa la capacidad de almacenamiento", required: false, order: 3, options: [] }
        ]
      },
      {
        name: "cablesred",
        label: "Cables de Red y conectores",
        value: "cablesred",
        isActive: true,
        order: 3,
        specifications: [
          { name: "cableType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de cable", required: false, order: 1, options: [] },
          { name: "cableLength", label: "Longitud", type: "text", placeholder: "Ingresa la longitud del cable", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "racks",
        label: "Racks",
        value: "racks",
        isActive: true,
        order: 4,
        specifications: [
          { name: "rackUnits", label: "Unidades", type: "text", placeholder: "Ingresa el número de unidades", required: false, order: 1, options: [] },
          { name: "rackHeight", label: "Altura", type: "text", placeholder: "Ingresa la altura del rack", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "ap",
        label: "Access Point",
        value: "ap",
        isActive: true,
        order: 5,
        specifications: [
          { name: "apSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad del access point", required: false, order: 1, options: [] },
          { name: "apFrequency", label: "Frecuencia", type: "text", placeholder: "Ingresa la frecuencia", required: false, order: 2, options: [] }
        ]
      }
    ]
  },
  {
    name: "electronicos",
    label: "Electrónicos",
    value: "electronicos",
    order: 9,
    isActive: true,
    color: "#06B6D4",
    icon: "FaGamepad",
    subcategories: [
      {
        name: "camaras_fotografia",
        label: "Cámaras de Fotografía",
        value: "camaras_fotografia",
        isActive: true,
        order: 1,
        specifications: [
          { name: "cameraType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de cámara", required: false, order: 1, options: [] },
          { name: "cameraResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución", required: false, order: 2, options: [] },
          { name: "cameraSensor", label: "Sensor", type: "text", placeholder: "Ingresa el tipo de sensor", required: false, order: 3, options: [] },
          { name: "cameraConnectivity", label: "Conectividad", type: "text", placeholder: "Ingresa el tipo de conectividad", required: false, order: 4, options: [] }
        ]
      },
      {
        name: "drones",
        label: "Drones",
        value: "drones",
        isActive: true,
        order: 2,
        specifications: [
          { name: "droneFlightTime", label: "Tiempo de Vuelo", type: "text", placeholder: "Ingresa el tiempo de vuelo", required: false, order: 1, options: [] },
          { name: "droneRange", label: "Alcance", type: "text", placeholder: "Ingresa el alcance", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "televisores",
        label: "Televisores",
        value: "televisores",
        isActive: true,
        order: 3,
        specifications: [
          { name: "tvSize", label: "Tamaño", type: "text", placeholder: "Ingresa el tamaño del televisor", required: false, order: 1, options: [] },
          { name: "tvResolution", label: "Resolución", type: "text", placeholder: "Ingresa la resolución", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "parlantes",
        label: "Parlantes",
        value: "parlantes",
        isActive: true,
        order: 4,
        specifications: [
          { name: "speakerPower", label: "Potencia", type: "text", placeholder: "Ingresa la potencia", required: false, order: 1, options: [] },
          { name: "speakerConnectivity", label: "Conectividad", type: "text", placeholder: "Ingresa el tipo de conectividad", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "relojes_inteligentes",
        label: "Relojes Inteligentes",
        value: "relojes_inteligentes",
        isActive: true,
        order: 5,
        specifications: [
          { name: "watchBattery", label: "Batería", type: "text", placeholder: "Ingresa la duración de la batería", required: false, order: 1, options: [] },
          { name: "watchFeatures", label: "Características", type: "text", placeholder: "Ingresa las características", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "scooters",
        label: "Scooters Eléctricos",
        value: "scooters",
        isActive: true,
        order: 6,
        specifications: [
          { name: "scooterSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad máxima", required: false, order: 1, options: [] },
          { name: "scooterRange", label: "Autonomía", type: "text", placeholder: "Ingresa la autonomía", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "consolas",
        label: "Consolas",
        value: "consolas",
        isActive: true,
        order: 7,
        specifications: [
          { name: "consoleGeneration", label: "Generación", type: "text", placeholder: "Ingresa la generación de consola", required: false, order: 1, options: [] },
          { name: "consoleStorage", label: "Almacenamiento", type: "text", placeholder: "Ingresa la capacidad de almacenamiento", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "monopatines",
        label: "Monopatines Eléctricos",
        value: "monopatines",
        isActive: true,
        order: 8,
        specifications: [
          { name: "skateboardSpeed", label: "Velocidad", type: "text", placeholder: "Ingresa la velocidad máxima", required: false, order: 1, options: [] },
          { name: "skateboardRange", label: "Autonomía", type: "text", placeholder: "Ingresa la autonomía", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "controles_consola",
        label: "Controles de Consola",
        value: "controles_consola",
        isActive: true,
        order: 9,
        specifications: [
          { name: "controllerType", label: "Tipo", type: "text", placeholder: "Ingresa el tipo de control", required: false, order: 1, options: [] },
          { name: "controllerCompatibility", label: "Compatibilidad", type: "text", placeholder: "Ingresa la compatibilidad", required: false, order: 2, options: [] }
        ]
      },
      {
        name: "juegos_consola",
        label: "Juegos de Consola",
        value: "juegos_consola",
        isActive: true,
        order: 10,
        specifications: [
          { name: "gamePlatform", label: "Plataforma", type: "text", placeholder: "Ingresa la plataforma", required: false, order: 1, options: [] },
          { name: "gameGenre", label: "Género", type: "text", placeholder: "Ingresa el género del juego", required: false, order: 2, options: [] }
        ]
      }
    ]
  }
];

// Función para migrar una categoría específica
const migrateCategory = async (categoryData, db) => {
  try {
    const categoriesCollection = db.collection('categories');
    
    // console.log removed for production
    
    // Verificar si la categoría ya existe
    const existingCategory = await categoriesCollection.findOne({ value: categoryData.value });
    
    if (existingCategory) {
      // console.log removed for production
      
      // Actualizar la categoría existente
      await categoriesCollection.updateOne(
        { value: categoryData.value },
        { $set: categoryData }
      );
      
      // console.log removed for production
    } else {
      // Insertar nueva categoría
      await categoriesCollection.insertOne(categoryData);
      // console.log removed for production
    }
    
    // Validar que la categoría se guardó correctamente
    const savedCategory = await categoriesCollection.findOne({ value: categoryData.value });
    if (savedCategory) {
      // console.log removed for production
      
      // Mostrar subcategorías
      if (savedCategory.subcategories) {
        savedCategory.subcategories.forEach(sub => {
          // console.log removed for production
        });
      }
    }
    
    return true;
  } catch (error) {
    // console.error removed for production
    return false;
  }
};

// Función principal
const migrateAllCategories = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    // console.log removed for production
    // console.log removed for production
    
    let successCount = 0;
    let errorCount = 0;
    
    // Migrar categoría por categoría
    for (const categoryData of categoriesData) {
      const success = await migrateCategory(categoryData, db);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Pausa pequeña entre categorías
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    
    // Validación final
    // console.log removed for production
    const categoriesCollection = db.collection('categories');
    const totalCategories = await categoriesCollection.countDocuments();
    // console.log removed for production
    
    const allCategories = await categoriesCollection.find({}).sort({ order: 1 }).toArray();
    allCategories.forEach(category => {
      // console.log removed for production
    });
    
    // console.log removed for production
    
  } catch (error) {
    // console.error removed for production
  } finally {
    await mongoose.disconnect();
    // console.log removed for production
  }
};

// Ejecutar migración
migrateAllCategories();

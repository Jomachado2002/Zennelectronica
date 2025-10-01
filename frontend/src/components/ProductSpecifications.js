import React from 'react';

const ProductSpecifications = ({ 
  subcategory, 
  data, 
  handleOnChange 
}) => {
  // Definimos un mapeo de especificaciones por subcategoría
  const specificationsMap = {
    // Informática
    notebooks: [
      { 
        label: "Procesador", 
        name: "processor", 
        placeholder: "Ingresa el procesador" 
      },
      { 
        label: "Memoria RAM", 
        name: "memory", 
        placeholder: "Ingresa la cantidad de memoria RAM" 
      },
      { 
        label: "Almacenamiento", 
        name: "storage", 
        placeholder: "Ingresa el tipo y capacidad de almacenamiento" 
      },
      { 
        label: "Disco", 
        name: "disk", 
        placeholder: "Ingresa el tipo de disco (SSD/HDD)" 
      },
      { 
        label: "Tarjeta Gráfica", 
        name: "graphicsCard", 
        placeholder: "Ingresa la tarjeta gráfica (opcional)" 
      },
      { 
        label: "Pantalla", 
        name: "notebookScreen", 
        placeholder: "Ingresa el tamaño y resolución de pantalla" 
      },
      { 
        label: "Batería", 
        name: "notebookBattery", 
        placeholder: "Ingresa la capacidad de la batería" 
      }
    ],
    computadoras_ensambladas: [
      { 
        label: "Procesador", 
        name: "processor", 
        placeholder: "Ingresa el procesador" 
      },
      { 
        label: "Memoria RAM", 
        name: "memory", 
        placeholder: "Ingresa la cantidad de memoria RAM" 
      },
      { 
        label: "Almacenamiento", 
        name: "storage", 
        placeholder: "Ingresa el tipo y capacidad de almacenamiento" 
      },
      { 
        label: "Tarjeta Gráfica", 
        name: "graphicsCard", 
        placeholder: "Ingresa la tarjeta gráfica" 
      },
      { 
        label: "Gabinete", 
        name: "pcCase", 
        placeholder: "Ingresa el tipo de gabinete" 
      },
      { 
        label: "Fuente de Poder", 
        name: "pcPowerSupply", 
        placeholder: "Ingresa la fuente de poder" 
      },
      { 
        label: "Sistema de Enfriamiento", 
        name: "pcCooling", 
        placeholder: "Ingresa el sistema de enfriamiento" 
      }
    ],
    placas_madre: [
      { 
        label: "Socket", 
        name: "motherboardSocket", 
        placeholder: "Ingresa el tipo de socket" 
      },
      { 
        label: "Chipset", 
        name: "motherboardChipset", 
        placeholder: "Ingresa el chipset" 
      },
      { 
        label: "Factor de Forma", 
        name: "motherboardFormFactor", 
        placeholder: "Ingresa el factor de forma (ATX, mATX, etc.)" 
      },
      { 
        label: "Soporte de RAM", 
        name: "ramType", 
        placeholder: "Ingresa el tipo de RAM soportada" 
      },
      { 
        label: "Slots de Expansión", 
        name: "expansionSlots", 
        placeholder: "Ingresa los slots de expansión disponibles" 
      }
    ],
    procesador: [
      {
        label: "Modelo",
        name: "modelo",
        placeholder: "Ingresa el modelo Series 11,12,13"
    },
      {
          label: "Socket",
          name: "processorSocket",
          placeholder: "Ingresa el tipo de socket (Ej: LGA1200, AM4)"
      },
      {
          label: "Núcleos",
          name: "processorCores",
          placeholder: "Ingresa el número de núcleos (Ej: 6, 8)"
      },
      {
          label: "Hilos",
          name: "processorThreads",
          placeholder: "Ingresa el número de hilos (Ej: 12, 16)"
      },
      {
          label: "Frecuencia Base",
          name: "processorBaseFreq",
          placeholder: "Ingresa la frecuencia base (Ej: 3.6 GHz)"
      },
      {
          label: "Frecuencia Turbo",
          name: "processorTurboFreq",
          placeholder: "Ingresa la frecuencia turbo (Ej: 4.9 GHz)"
      },
      {
          label: "Caché",
          name: "processorCache",
          placeholder: "Ingresa la cantidad de caché (Ej: 12 MB)"
      },
      {
          label: "TDP",
          name: "processorTDP",
          placeholder: "Ingresa el TDP (Ej: 65W, 95W)"
      },
      {
          label: "Gr�ficos Integrados",
          name: "processorIntegratedGraphics",
          placeholder: "Indica si tiene gráficos integrados (Ej: Sí/No)"
      },
      {
          label: "Tecnología de Fabricación",
          name: "processorManufacturingTech",
          placeholder: "Ingresa la tecnología de fabricación (Ej: 7nm, 14nm)"
      }
  ],
  tarjeta_grafica: [
    {
      label: "Modelo",
      name: "graphicCardModel",
      placeholder: "Ingresa el modelo de la tarjeta gráfica (Ej: RTX 3080, RX 6800 XT)"
    },
    {
      label: "Memoria",
      name: "graphicCardMemory",
      placeholder: "Ingresa la cantidad de memoria gráfica (Ej: 8 GB, 12 GB)"
    },
    {
      label: "Tipo de Memoria",
      name: "graphicCardMemoryType",
      placeholder: "Ingresa el tipo de memoria (Ej: GDDR6, GDDR6X)"
    },
    {
      label: "Fabricante",
      name: "graphicfabricate",  // Aquí estaba el problema, debe coincidir con el modelo
      placeholder: "Ingresa el fabricante (NVIDIA, AMD, Intel)"
    },
    {
      label: "Frecuencia Base",
      name: "graphicCardBaseFrequency",
      placeholder: "Ingresa la frecuencia base de GPU (Ej: 1.5 GHz)"
    },
    {
      label: "Consumo (TDP)",
      name: "graphicCardTDP",
      placeholder: "Ingresa el consumo eléctrico (Ej: 320W, 250W)"
    }
  ],  
  gabinetes: [
    {
      label: "Factor de Forma",
      name: "caseFormFactor",
      placeholder: "Ingresa el factor de forma (ATX, mATX, ITX)"
    },
    {
      label: "Material",
      name: "caseMaterial",
      placeholder: "Ingresa el material principal (Acero, Aluminio)"
    },
    {
      label: "Bahías de Expansión",
      name: "caseExpansionBays",
      placeholder: "Ingresa el número de bahías (Ej: 2x 3.5, 3x 2.5)"
    },
    {
      label: "Ventiladores Incluidos",
      name: "caseIncludedFans",
      placeholder: "Ingresa número y tipo de ventiladores"
    },
    {
      label: "Soporte de Refrigeración",
      name: "caseCoolingSupport",
      placeholder: "Ingresa opciones de refrigeración líquida"
    },
    {
      label: "Iluminación",
      name: "caseBacklight",
      placeholder: "Ingresa el tipo de iluminación (RGB, LED)"
    }
  ],
   impresoras: [
      { label: "Tipo de Impresora", name: "printerType", placeholder: "Ingresa el tipo (Láser, Inkjet, Multifunción)" },
      { label: "Resolución", name: "printerResolution", placeholder: "Ingresa la resolución de impresión" },
      { label: "Velocidad", name: "printerSpeed", placeholder: "Ingresa la velocidad de impresión (ppm)" },
      { label: "Impresión Color", name: "printerColor", placeholder: "Ingresa si imprime en color (Sí/No)" },
      { label: "Impresión Dúplex", name: "printerDuplex", placeholder: "¿Cuenta con impresión dúplex?" },
      { label: "Conectividad", name: "printerConnectivity", placeholder: "Ingresa las opciones de conectividad" },
      { label: "Capacidad de Bandeja", name: "printerTrayCapacity", placeholder: "Ingresa la capacidad de la bandeja" }
    ],
    cartuchos_toners: [
      { label: "Tipo", name: "tonerType", placeholder: "Ingresa el tipo (Cartucho, Tóner)" },
      { label: "Tipo de Impresora", name: "tonerPrinterType", placeholder: "Ingresa el tipo de impresora compatible" },
      { label: "Color", name: "tonerColor", placeholder: "Ingresa el color (Negro, Cyan, Magenta, Amarillo)" },
      { label: "Rendimiento", name: "tonerYield", placeholder: "Ingresa el rendimiento de páginas" },
      { label: "Tipo de Cartucho", name: "tonerCartridgeType", placeholder: "Ingresa el tipo (Original, Compatible, Recargable)" },
      { label: "Modelo Compatible", name: "tonerCompatibleModel", placeholder: "Ingresa los modelos de impresora compatibles" }
    ],
    escaneres: [
      { label: "Tipo de Escáner", name: "scannerType", placeholder: "Ingresa el tipo (Plano, Alimentador, Portátil)" },
      { label: "Resolución", name: "scannerResolution", placeholder: "Ingresa la resolución máxima (dpi)" },
      { label: "Velocidad", name: "scannerSpeed", placeholder: "Ingresa la velocidad de escaneo" },
      { label: "Tamaño Máximo", name: "scannerMaxSize", placeholder: "Ingresa el tamaño máximo de documento" },
      { label: "Conectividad", name: "scannerConnectivity", placeholder: "Ingresa las opciones de conectividad" },
      { label: "Formatos Soportados", name: "scannerFormats", placeholder: "Ingresa los formatos de salida soportados" }
    ],
  // Periféricos
  auriculares: [
    { 
      label: "Tipo de Conexión", 
      name: "headphoneConnectionType", 
      placeholder: "Ingresa el tipo de conexión (Alámbrico, Inalámbrico)" 
    },
    { 
      label: "Tecnología de Conexión", 
      name: "headphoneTechnology", 
      placeholder: "Ingresa la tecnología (Bluetooth, Jack 3.5mm)" 
    },
    { 
      label: "Respuesta de Frecuencia", 
      name: "headphoneFrequencyResponse", 
      placeholder: "Ingresa la respuesta de frecuencia" 
    },
    { 
      label: "Impedancia", 
      name: "headphoneImpedance", 
      placeholder: "Ingresa la impedancia" 
    },
    { 
      label: "Tipo de Cancelación de Ruido", 
      name: "headphoneNoiseCancel", 
      placeholder: "Ingresa el tipo de cancelación de ruido" 
    },
    { 
      label: "Duración de Batería", 
      name: "headphoneBatteryLife", 
      placeholder: "Ingresa la duración de batería" 
    }
  ],
  microfonos: [
    { 
      label: "Tipo de Micrófono", 
      name: "microphoneType", 
      placeholder: "Ingresa el tipo de micrófono (Condensador, Dinámico)" 
    },
    { 
      label: "Patrón Polar", 
      name: "microphonePolarPattern", 
      placeholder: "Ingresa el patrón polar (Cardioide, Omnidireccional)" 
    },
    { 
      label: "Rango de Frecuencia", 
      name: "microphoneFrequencyRange", 
      placeholder: "Ingresa el rango de frecuencia" 
    },
    { 
      label: "Conexión", 
      name: "microphoneConnection", 
      placeholder: "Ingresa el tipo de conexión (USB, XLR, Jack)" 
    },
    { 
      label: "Características Especiales", 
      name: "microphoneSpecialFeatures", 
      placeholder: "Ingresa características especiales" 
    }
  ],
  // CCTV
  nas: [
    { 
      label: "Capacidad Máxima", 
      name: "nasMaxCapacity", 
      placeholder: "Ingresa la capacidad máxima de almacenamiento" 
    },
    { 
      label: "Número de Bahías", 
      name: "nasBaysNumber", 
      placeholder: "Ingresa el número de bahías" 
    },
    { 
      label: "Procesador", 
      name: "nasProcessor", 
      placeholder: "Ingresa el modelo de procesador" 
    },
    { 
      label: "Memoria RAM", 
      name: "nasRAM", 
      placeholder: "Ingresa la cantidad de memoria RAM" 
    },
    { 
      label: "Tipos de RAID Soportados", 
      name: "nasRAIDSupport", 
      placeholder: "Ingresa los niveles de RAID soportados" 
    },
    { 
      label: "Conectividad", 
      name: "nasConnectivity", 
      placeholder: "Ingresa las opciones de conectividad" 
    }
  ],
  // Impresoras
  cartuchostoner: [
    { 
      label: "Tipo de Impresora", 
      name: "tonerPrinterType", 
      placeholder: "Ingresa el tipo de impresora compatible" 
    },
    { 
      label: "Color", 
      name: "tonerColor", 
      placeholder: "Ingresa el color del tóner (Negro, Color)" 
    },
    { 
      label: "Rendimiento", 
      name: "tonerYield", 
      placeholder: "Ingresa el rendimiento de páginas" 
    },
    { 
      label: "Tipo de Cartucho", 
      name: "tonerCartridgeType", 
      placeholder: "Ingresa el tipo de cartucho (Original, Compatible)" 
    },
    { 
      label: "Modelo Compatible", 
      name: "tonerCompatibleModel", 
      placeholder: "Ingresa los modelos de impresora compatibles" 
    }
  ],
  // Telefonía
  tablets: [
    { 
      label: "Tamaño de Pantalla", 
      name: "tabletScreenSize", 
      placeholder: "Ingresa el tamaño de pantalla" 
    },
    { 
      label: "Resolución de Pantalla", 
      name: "tabletScreenResolution", 
      placeholder: "Ingresa la resolución de pantalla" 
    },
    { 
      label: "Procesador", 
      name: "tabletProcessor", 
      placeholder: "Ingresa el modelo de procesador" 
    },
    { 
      label: "Memoria RAM", 
      name: "tabletRAM", 
      placeholder: "Ingresa la cantidad de memoria RAM" 
    },
    { 
      label: "Almacenamiento", 
      name: "tabletStorage", 
      placeholder: "Ingresa la capacidad de almacenamiento" 
    },
    { 
      label: "Sistema Operativo", 
      name: "tabletOS", 
      placeholder: "Ingresa el sistema operativo" 
    },
    { 
      label: "Conectividad", 
      name: "tabletConnectivity", 
      placeholder: "Ingresa las opciones de conectividad" 
    }
  ],
  // Redes
  switch: [
    { 
      label: "Tipo de Switch", 
      name: "switchType", 
      placeholder: "Ingresa el tipo de switch (Administrable, No administrable)" 
    },
    { 
      label: "Número de Puertos", 
      name: "switchPorts", 
      placeholder: "Ingresa el número de puertos" 
    },
    { 
      label: "Velocidad de Puertos", 
      name: "switchPortSpeed", 
      placeholder: "Ingresa la velocidad de los puertos (Ej: 10/100/1000 Mbps)" 
    },
    { 
      label: "Capa de Red", 
      name: "switchNetworkLayer", 
      placeholder: "Ingresa la capa de red (Capa 2, Capa 3)" 
    },
    { 
      label: "Capacidad de Conmutación", 
      name: "switchCapacity", 
      placeholder: "Ingresa la capacidad de conmutación" 
    }
  ],
  servidores: [
    { 
      label: "Tipo de Servidor", 
      name: "serverType", 
      placeholder: "Ingresa el tipo de servidor (Torre, Rack, Blade)" 
    },
    { 
      label: "Procesador", 
      name: "serverProcessor", 
      placeholder: "Ingresa el modelo de procesador" 
    },
    { 
      label: "Número de Procesadores", 
      name: "serverProcessorCount", 
      placeholder: "Ingresa el número de procesadores" 
    },
    { 
      label: "Memoria RAM", 
      name: "serverRAM", 
      placeholder: "Ingresa la cantidad de memoria RAM" 
    },
    { 
      label: "Almacenamiento", 
      name: "serverStorage", 
      placeholder: "Ingresa el tipo y capacidad de almacenamiento" 
    },
    { 
      label: "Sistema Operativo", 
      name: "serverOS", 
      placeholder: "Ingresa el sistema operativo del servidor" 
    }
  ],
  cablesred: [
    { 
      label: "Tipo de Cable", 
      name: "networkCableType", 
      placeholder: "Ingresa el tipo de cable (UTP, STP, Fibra Óptica)" 
    },
    { 
      label: "Categoría", 
      name: "networkCableCategory", 
      placeholder: "Ingresa la categoría (Cat5e, Cat6, Cat6a)" 
    },
    { 
      label: "Longitud", 
      name: "networkCableLength", 
      placeholder: "Ingresa la longitud del cable" 
    },
    { 
      label: "Blindaje", 
      name: "networkCableShielding", 
      placeholder: "Ingresa el tipo de blindaje" 
    },
    { 
      label: "Uso Recomendado", 
      name: "networkCableRecommendedUse", 
      placeholder: "Ingresa el uso recomendado" 
    }
  ],
  racks: [
    { 
      label: "Tipo de Rack", 
      name: "rackType", 
      placeholder: "Ingresa el tipo de rack (Pared, Piso, Abierto, Cerrado)" 
    },
    { 
      label: "Unidades de Rack (U)", 
      name: "rackUnits", 
      placeholder: "Ingresa el número de unidades de rack" 
    },
    { 
      label: "Profundidad", 
      name: "rackDepth", 
      placeholder: "Ingresa la profundidad del rack" 
    },
    { 
      label: "Material", 
      name: "rackMaterial", 
      placeholder: "Ingresa el material principal" 
    },
    { 
      label: "Capacidad de Carga", 
      name: "rackLoadCapacity", 
      placeholder: "Ingresa la capacidad de carga máxima" 
    }
  ],
  ap: [
    { 
      label: "Estándar WiFi", 
      name: "apWiFiStandard", 
      placeholder: "Ingresa el estándar WiFi (802.11ac, WiFi 6)" 
    },
    { 
      label: "Bandas Soportadas", 
      name: "apSupportedBands", 
      placeholder: "Ingresa las bandas soportadas (2.4 GHz, 5 GHz)" 
    },
    { 
      label: "Velocidad Máxima", 
      name: "apMaxSpeed", 
      placeholder: "Ingresa la velocidad máxima" 
    },
    { 
      label: "Puertos", 
      name: "apPorts", 
      placeholder: "Ingresa los puertos disponibles" 
    },
    { 
      label: "Antenas", 
      name: "apAntennas", 
      placeholder: "Ingresa detalles de las antenas" 
    }
  ],
    memorias_ram: [
      { 
        label: "Memoria ram NB/PC", 
        name: "ramText", 
        placeholder: "Memoria Ram PC/NB?" 
      },
      { 
        label: "Tipo de RAM", 
        name: "ramType", 
        placeholder: "Ingresa el tipo de RAM (DDR4, DDR5, etc.)" 
      },
      { 
        label: "Velocidad", 
        name: "ramSpeed", 
        placeholder: "Ingresa la velocidad en MHz" 
      },
      { 
        label: "Capacidad", 
        name: "ramCapacity", 
        placeholder: "Ingresa la capacidad en GB" 
      },
      { 
        label: "Latencia", 
        name: "ramLatency", 
        placeholder: "Ingresa la latencia (CL)" 
      }
    ],
    discos_duros: [
      { 
        label: "Capacidad", 
        name: "hddCapacity", 
        placeholder: "Ingresa la capacidad de almacenamiento" 
      },
      { 
        label: "Tipo", 
        name: "diskType", 
        placeholder: "Ingresa el tipo de disco (SSD/HDD/NVMe)" 
      },
      { 
        label: "Interfaz", 
        name: "hddInterface", 
        placeholder: "Ingresa el tipo de interfaz (SATA/NVMe/etc.)" 
      },
      { 
        label: "RPM (para HDD)", 
        name: "hddRPM", 
        placeholder: "Ingresa las RPM (solo para discos HDD)" 
      },
      { 
        label: "Velocidad de Lectura", 
        name: "diskReadSpeed", 
        placeholder: "Ingresa la velocidad de lectura" 
      },
      { 
        label: "Velocidad de Escritura", 
        name: "diskWriteSpeed", 
        placeholder: "Ingresa la velocidad de escritura" 
      }
    ],
    // Periféricos
    monitores: [
      { 
        label: "Tamaño", 
        name: "monitorSize", 
        placeholder: "Ingresa el tamaño en pulgadas" 
      },
      { 
        label: "Resolución", 
        name: "monitorResolution", 
        placeholder: "Ingresa la resolución (Full HD, 4K, etc.)" 
      },
      { 
        label: "Tasa de Refresco", 
        name: "monitorRefreshRate", 
        placeholder: "Ingresa la tasa de refresco en Hz" 
      },
      { 
        label: "Tipo de Panel", 
        name: "monitorPanel", 
        placeholder: "Ingresa el tipo de panel (IPS, VA, TN, etc.)" 
      },
      { 
        label: "Conectividad", 
        name: "monitorConnectivity", 
        placeholder: "Ingresa los tipos de conexiones" 
      }
    ],
    teclados: [
      { 
        label: "Interfaz", 
        name: "keyboardInterface", 
        placeholder: "Ingresa el tipo de interfaz (USB, Inalámbrico)" 
      },
      { 
        label: "Layout", 
        name: "keyboardLayout", 
        placeholder: "Ingresa el layout (Español, Inglés, etc.)" 
      },
      { 
        label: "Iluminación", 
        name: "keyboardBacklight", 
        placeholder: "Ingresa el tipo de iluminación" 
      },
      { 
        label: "Tipo de Switches", 
        name: "keyboardSwitches", 
        placeholder: "Ingresa el tipo de switches" 
      },
      { 
        label: "Características Adicionales", 
        name: "keyboardFeatures", 
        placeholder: "Ingresa características adicionales" 
      }
    ],
    mouses: [
      { 
        label: "Interfaz", 
        name: "mouseInterface", 
        placeholder: "Ingresa el tipo de interfaz (USB, Inalámbrico)" 
      },
      { 
        label: "Sensor", 
        name: "mouseSensor", 
        placeholder: "Ingresa el tipo de sensor (Óptico, Láser)" 
      },
      { 
        label: "DPI", 
        name: "mouseDPI", 
        placeholder: "Ingresa la resolución en DPI" 
      },
      { 
        label: "Número de Botones", 
        name: "mouseButtons", 
        placeholder: "Ingresa el número de botones" 
      },
      { 
        label: "Iluminación", 
        name: "mouseBacklight", 
        placeholder: "Ingresa el tipo de iluminación" 
      }
    ],
    adaptadores: [
      { 
        label: "Tipo de Adaptador", 
        name: "adapterType", 
        placeholder: "Ingresa el tipo de adaptador" 
      },
      { 
        label: "Interfaz", 
        name: "adapterInterface", 
        placeholder: "Ingresa la interfaz (USB, PCI, etc.)" 
      },
      { 
        label: "Velocidad", 
        name: "adapterSpeed", 
        placeholder: "Ingresa la velocidad de transferencia" 
      },
      { 
        label: "Protocolo", 
        name: "adapterProtocol", 
        placeholder: "Ingresa el protocolo (WiFi, Bluetooth, etc.)" 
      }
    ],
    // CCTV
    camaras_seguridad: [
      { 
        label: "Resolución", 
        name: "cameraResolution", 
        placeholder: "Ingresa la resolución" 
      },
      { 
        label: "Tipo de Lente", 
        name: "cameraLensType", 
        placeholder: "Ingresa el tipo de lente" 
      },
      { 
        label: "Distancia IR", 
        name: "cameraIRDistance", 
        placeholder: "Ingresa la distancia de visión nocturna" 
      },
      { 
        label: "Tipo de Cámara", 
        name: "cameraType", 
        placeholder: "Ingresa el tipo de cámara (Domo, Bullet, etc.)" 
      },
      { 
        label: "Conectividad", 
        name: "cameraConnectivity", 
        placeholder: "Ingresa el tipo de conectividad (IP, Analógica)" 
      },
      { 
        label: "Grado de Protección", 
        name: "cameraProtection", 
        placeholder: "Ingresa el grado de protección (IP66, etc.)" 
      }
    ],
    dvr: [
      { 
        label: "Número de Canales", 
        name: "dvrChannels", 
        placeholder: "Ingresa el número de canales" 
      },
      { 
        label: "Resolución Máxima", 
        name: "dvrResolution", 
        placeholder: "Ingresa la resolución máxima soportada" 
      },
      { 
        label: "Capacidad de Almacenamiento", 
        name: "dvrStorageCapacity", 
        placeholder: "Ingresa la capacidad de almacenamiento" 
      },
      { 
        label: "Conectividad", 
        name: "dvrConnectivity", 
        placeholder: "Ingresa las opciones de conectividad" 
      },
      { 
        label: "Características Inteligentes", 
        name: "dvrSmartFeatures", 
        placeholder: "Ingresa características inteligentes" 
      }
    ],
    nas: [
      { 
        label: "Capacidad", 
        name: "nasCapacity", 
        placeholder: "Ingresa la capacidad total" 
      },
      { 
        label: "Cantidad de Bahías", 
        name: "nasBays", 
        placeholder: "Ingresa la cantidad de bahías" 
      },
      { 
        label: "Soporte RAID", 
        name: "nasRAID", 
        placeholder: "Ingresa los niveles RAID soportados" 
      },
      { 
        label: "Procesador", 
        name: "processor", 
        placeholder: "Ingresa el procesador del NAS" 
      },
      { 
        label: "Memoria RAM", 
        name: "memory", 
        placeholder: "Ingresa la memoria RAM del NAS" 
      },
      { 
        label: "Conectividad", 
        name: "nasConnectivity", 
        placeholder: "Ingresa las opciones de conectividad" 
      }
    ],
    // Impresoras
    impresoras_laser: [
      { 
        label: "Tipo", 
        name: "printerType", 
        placeholder: "Ingresa el tipo de impresora" 
      },
      { 
        label: "Resolución", 
        name: "printerResolution", 
        placeholder: "Ingresa la resolución" 
      },
      { 
        label: "Velocidad", 
        name: "printerSpeed", 
        placeholder: "Ingresa la velocidad de impresión" 
      },
      { 
        label: "Impresión Dúplex", 
        name: "printerDuplex", 
        placeholder: "¿Cuenta con impresión dúplex?" 
      },
      { 
        label: "Conectividad", 
        name: "printerConnectivity", 
        placeholder: "Ingresa las opciones de conectividad" 
      },
      { 
        label: "Capacidad de Bandeja", 
        name: "printerTrayCapacity", 
        placeholder: "Ingresa la capacidad de la bandeja" 
      }
    ],
    impresoras_multifuncion: [
      { 
        label: "Tipo", 
        name: "printerType", 
        placeholder: "Ingresa el tipo de impresora" 
      },
      { 
        label: "Funciones", 
        name: "printerFunctions", 
        placeholder: "Ingresa las funciones (impresión, escaneo, etc.)" 
      },
      { 
        label: "Resolución", 
        name: "printerResolution", 
        placeholder: "Ingresa la resolución" 
      },
      { 
        label: "Velocidad", 
        name: "printerSpeed", 
        placeholder: "Ingresa la velocidad de impresión" 
      },
      { 
        label: "Impresión Dúplex", 
        name: "printerDuplex", 
        placeholder: "¿Cuenta con impresión dúplex?" 
      },
      { 
        label: "Conectividad", 
        name: "printerConnectivity", 
        placeholder: "Ingresa las opciones de conectividad" 
      },
      { 
        label: "Display", 
        name: "printerDisplay", 
        placeholder: "Ingresa el tipo de display" 
      }
    ],
    // Accesorios
    fuentes_alimentacion: [
      { 
        label: "Vataje", 
        name: "psuWattage", 
        placeholder: "Ingresa el vataje" 
      },
      { 
        label: "Eficiencia", 
        name: "psuEfficiency", 
        placeholder: "Ingresa la certificación de eficiencia" 
      },
      { 
        label: "Modular", 
        name: "psuModular", 
        placeholder: "Ingresa si es modular, semi-modular o no-modular" 
      },
      { 
        label: "Factor de Forma", 
        name: "psuFormFactor", 
        placeholder: "Ingresa el factor de forma (ATX, SFX, etc.)" 
      },
      { 
        label: "Protecciones", 
        name: "psuProtections", 
        placeholder: "Ingresa las protecciones que ofrece" 
      }
    ],
    ups: [
      { 
        label: "Capacidad", 
        name: "upsCapacity", 
        placeholder: "Ingresa la capacidad en VA" 
      },
      { 
        label: "Potencia de Salida", 
        name: "upsOutputPower", 
        placeholder: "Ingresa la potencia de salida en W" 
      },
      { 
        label: "Tiempo de Respaldo", 
        name: "upsBackupTime", 
        placeholder: "Ingresa el tiempo de respaldo promedio" 
      },
      { 
        label: "Número de Tomas", 
        name: "upsOutlets", 
        placeholder: "Ingresa el número de tomas" 
      },
      { 
        label: "Tipo de UPS", 
        name: "upsType", 
        placeholder: "Ingresa el tipo de UPS (En línea, Interactivo, etc.)" 
      },
      { 
        label: "Conectividad", 
        name: "upsConnectivity", 
        placeholder: "Ingresa las opciones de conectividad" 
      }
    ],
    airpods: [
      { 
        label: "Modelo", 
        name: "airpodsModel", 
        placeholder: "Ingresa el modelo" 
      },
      { 
        label: "Duración de Batería", 
        name: "airpodsBatteryLife", 
        placeholder: "Ingresa la duración de la batería" 
      },
      { 
        label: "Tipo de Carga", 
        name: "airpodsCharging", 
        placeholder: "Ingresa el tipo de carga" 
      },
      { 
        label: "Resistencia", 
        name: "airpodsResistance", 
        placeholder: "Ingresa el nivel de resistencia (agua, polvo)" 
      },
      { 
        label: "Características Adicionales", 
        name: "airpodsFeatures", 
        placeholder: "Ingresa características adicionales" 
      }
    ],
    // Software y Licencias
    licencias: [
      { 
        label: "Tipo de Licencia", 
        name: "softwareLicenseType", 
        placeholder: "Ingresa el tipo de licencia" 
      },
      { 
        label: "Duración", 
        name: "softwareLicenseDuration", 
        placeholder: "Ingresa la duración de la licencia" 
      },
      { 
        label: "Cantidad de Usuarios", 
        name: "softwareLicenseQuantity", 
        placeholder: "Ingresa la cantidad de usuarios permitidos" 
      },
      { 
        label: "Versión", 
        name: "softwareVersion", 
        placeholder: "Ingresa la versión del software" 
      },
      { 
        label: "Características", 
        name: "softwareFeatures", 
        placeholder: "Ingresa las características principales" 
      }
    ],
    // Telefonía
    telefonos_moviles: [
      { 
        label: "Color ", 
        name: "phoneType", 
        placeholder: "Ingresa el color del teléfono" 
      },
      { 
        label: "Tamaño de Pantalla", 
        name: "phoneScreenSize", 
        placeholder: "Ingresa el tamaño de pantalla" 
      },
      { 
        label: "Sistema Operativo", 
        name: "operatingSystem", 
        placeholder: "Ingresa el sistema operativo" 
      },
      { 
        label: "Memoria RAM", 
        name: "phoneRAM", 
        placeholder: "Ingresa la memoria RAM" 
      },
      { 
        label: "Almacenamiento", 
        name: "phoneStorage", 
        placeholder: "Ingresa la capacidad de almacenamiento" 
      },
      { 
        label: "Procesador", 
        name: "phoneProcessor", 
        placeholder: "Ingresa el procesador" 
      },
      { 
        label: "Cámaras", 
        name: "phoneCameras", 
        placeholder: "Ingresa especificaciones de cámara" 
      },
      { 
        label: "Batería", 
        name: "phoneBattery", 
        placeholder: "Ingresa la capacidad de batería" 
      },
      { 
        label: "Sistema Operativo", 
        name: "phoneOS", 
        placeholder: "Ingresa el sistema operativo y versión" 
      }
    ],
    telefonos_fijos: [
      { 
        label: "Tipo", 
        name: "landlineType", 
        placeholder: "Ingresa el tipo de teléfono" 
      },
      { 
        label: "Tecnología", 
        name: "landlineTechnology", 
        placeholder: "Ingresa la tecnología (Digital, IP, etc.)" 
      },
      { 
        label: "Pantalla", 
        name: "landlineDisplay", 
        placeholder: "Ingresa el tipo de pantalla" 
      },
      { 
        label: "Funciones", 
        name: "landlineFunctions", 
        placeholder: "Ingresa las funciones principales" 
      },
    
    ],
    // NUEVA CATEGORÍA: ELECTRÓNICOS
    camaras_fotografia: [
      { label: "Tipo de Cámara", name: "cameraType", placeholder: "Ingresa el tipo (DSLR, Mirrorless, Compacta)" },
      { label: "Resolución", name: "cameraResolution", placeholder: "Ingresa la resolución en megapíxeles" },
      { label: "Sensor", name: "cameraSensor", placeholder: "Ingresa el tipo de sensor (Full Frame, APS-C, etc.)" },
      { label: "Lente Incluido", name: "cameraLens", placeholder: "Ingresa si incluye lente y especificaciones" },
      { label: "Video", name: "cameraVideo", placeholder: "Ingresa la capacidad de grabación de video" },
      { label: "ISO", name: "cameraISO", placeholder: "Ingresa el rango de ISO" },
      { label: "Conectividad", name: "cameraConnectivity", placeholder: "Ingresa opciones de conectividad (WiFi, Bluetooth)" }
    ],
    drones: [
      { label: "Tipo de Drone", name: "droneType", placeholder: "Ingresa el tipo (Recreativo, Profesional, Racing)" },
      { label: "Tiempo de Vuelo", name: "droneFlightTime", placeholder: "Ingresa el tiempo máximo de vuelo" },
      { label: "Alcance", name: "droneRange", placeholder: "Ingresa el alcance máximo de control" },
      { label: "Cámara", name: "droneCamera", placeholder: "Ingresa las especificaciones de cámara" },
      { label: "Estabilización", name: "droneStabilization", placeholder: "Ingresa el tipo de estabilización (Gimbal, etc.)" },
      { label: "Funciones Inteligentes", name: "droneSmartFeatures", placeholder: "Ingresa funciones automáticas (Follow me, etc.)" },
      { label: "Peso", name: "droneWeight", placeholder: "Ingresa el peso del drone" }
    ],
    televisores: [
      { label: "Tamaño de Pantalla", name: "tvScreenSize", placeholder: "Ingresa el tamaño en pulgadas" },
      { label: "Resolución", name: "tvResolution", placeholder: "Ingresa la resolución (HD, 4K, 8K)" },
      { label: "Tipo de Panel", name: "tvPanelType", placeholder: "Ingresa el tipo (LED, OLED, QLED)" },
      { label: "Smart TV", name: "tvSmartFeatures", placeholder: "Ingresa el sistema operativo y funciones smart" },
      { label: "HDR", name: "tvHDR", placeholder: "Ingresa compatibilidad HDR (HDR10, Dolby Vision)" },
      { label: "Conectividad", name: "tvConnectivity", placeholder: "Ingresa puertos y conectividad (HDMI, USB, WiFi)" },
      { label: "Tasa de Refresco", name: "tvRefreshRate", placeholder: "Ingresa la tasa de refresco en Hz" }
    ],
    parlantes: [
      { label: "Tipo de Parlante", name: "speakerType", placeholder: "Ingresa el tipo (Bluetooth, Wired, Smart Speaker)" },
      { label: "Potencia", name: "speakerPower", placeholder: "Ingresa la potencia en watts" },
      { label: "Conectividad", name: "speakerConnectivity", placeholder: "Ingresa opciones de conectividad" },
      { label: "Duración de Batería", name: "speakerBatteryLife", placeholder: "Ingresa la duración de batería (si aplica)" },
      { label: "Resistencia", name: "speakerResistance", placeholder: "Ingresa resistencia al agua/polvo (IP rating)" },
      { label: "Respuesta de Frecuencia", name: "speakerFrequencyResponse", placeholder: "Ingresa el rango de frecuencia" },
      { label: "Características Especiales", name: "speakerSpecialFeatures", placeholder: "Ingresa funciones especiales (Assistant, etc.)" }
    ],
    relojes_inteligentes: [
      { label: "Compatibilidad", name: "smartwatchCompatibility", placeholder: "Ingresa compatibilidad (iOS, Android, etc.)" },
      { label: "Pantalla", name: "smartwatchDisplay", placeholder: "Ingresa tipo y tamaño de pantalla" },
      { label: "Duración de Batería", name: "smartwatchBatteryLife", placeholder: "Ingresa la duración de batería" },
      { label: "Sensores", name: "smartwatchSensors", placeholder: "Ingresa sensores disponibles (GPS, cardíaco, etc.)" },
      { label: "Resistencia", name: "smartwatchResistance", placeholder: "Ingresa resistencia al agua (ATM, IP)" },
      { label: "Conectividad", name: "smartwatchConnectivity", placeholder: "Ingresa opciones de conectividad (WiFi, Cellular)" },
      { label: "Funciones Deportivas", name: "smartwatchSportsFeatures", placeholder: "Ingresa funciones deportivas y de salud" }
    ],
    scooters: [
      { label: "Velocidad Máxima", name: "scooterMaxSpeed", placeholder: "Ingresa la velocidad máxima (Ej: 25 km/h)" },
      { label: "Autonomía", name: "scooterRange", placeholder: "Ingresa la autonomía (Ej: 30 km)" },
      { label: "Capacidad de Batería", name: "scooterBatteryCapacity", placeholder: "Ingresa la capacidad de batería (Ej: 7.8 Ah)" },
      { label: "Peso", name: "scooterWeight", placeholder: "Ingresa el peso del scooter (Ej: 12 kg)" },
      { label: "Carga Máxima", name: "scooterMaxLoad", placeholder: "Ingresa la carga máxima (Ej: 100 kg)" },
      { label: "Tamaño de Rueda", name: "scooterWheelSize", placeholder: "Ingresa el tamaño de rueda (Ej: 8.5 pulgadas)" },
      { label: "Tiempo de Carga", name: "scooterChargingTime", placeholder: "Ingresa el tiempo de carga (Ej: 4-6 horas)" }
    ],
    consolas: [
      { label: "Generación", name: "consoleGeneration", placeholder: "Ingresa la generación (Ej: PS5, Xbox Series X)" },
      { label: "Almacenamiento", name: "consoleStorage", placeholder: "Ingresa el almacenamiento (Ej: 825GB SSD)" },
      { label: "Tipo", name: "consoleType", placeholder: "Ingresa el tipo (Sobremesa, Portátil, Híbrida)" },
      { label: "Resolución", name: "consoleResolution", placeholder: "Ingresa la resolución máxima (Ej: 4K, 1080p)" },
      { label: "Conectividad", name: "consoleConnectivity", placeholder: "Ingresa opciones de conectividad (WiFi, Ethernet, Bluetooth)" },
      { label: "Juegos Incluidos", name: "consoleIncludedGames", placeholder: "Ingresa juegos incluidos (si aplica)" },
      { label: "Controles Incluidos", name: "consoleControllers", placeholder: "Ingresa número y tipo de controles incluidos" }
    ],
    monopatines: [
      { label: "Velocidad Máxima", name: "monopatinMaxSpeed", placeholder: "Ingresa la velocidad máxima (Ej: 20 km/h)" },
      { label: "Autonomía", name: "monopatinRange", placeholder: "Ingresa la autonomía (Ej: 25 km)" },
      { label: "Duración de Batería", name: "monopatinBatteryLife", placeholder: "Ingresa la duración de batería (Ej: 3-4 horas)" },
      { label: "Peso", name: "monopatinWeight", placeholder: "Ingresa el peso (Ej: 3.5 kg)" },
      { label: "Carga Máxima", name: "monopatinMaxLoad", placeholder: "Ingresa la carga máxima (Ej: 80 kg)" },
      { label: "Tipo de Rueda", name: "monopatinWheelType", placeholder: "Ingresa el tipo de rueda (PU, Neumático, etc.)" },
      { label: "Resistencia al Agua", name: "monopatinWaterResistance", placeholder: "Ingresa nivel de resistencia (IP54, IPX4, etc.)" }
    ],
    controles_consola: [
      { label: "Compatibilidad", name: "controllerCompatibility", placeholder: "Ingresa compatibilidad (PS5, Xbox, PC, Switch)" },
      { label: "Tipo de Conexión", name: "controllerConnectionType", placeholder: "Ingresa tipo de conexión (Inalámbrico, USB, Bluetooth)" },
      { label: "Duración de Batería", name: "controllerBatteryLife", placeholder: "Ingresa duración de batería (Ej: 12 horas)" },
      { label: "Características Especiales", name: "controllerSpecialFeatures", placeholder: "Ingresa características especiales (RGB, triggers adaptativos)" },
      { label: "Vibración", name: "controllerVibration", placeholder: "Ingresa tipo de vibración (Dual, Háptica, etc.)" },
      { label: "Tecnología Inalámbrica", name: "controllerWireless", placeholder: "Ingresa tecnología inalámbrica (Bluetooth 5.0, 2.4GHz)" }
    ],
    juegos_consola: [
      { label: "Género", name: "gameGenre", placeholder: "Ingresa el género (Acción, RPG, Deportes, etc.)" },
      { label: "Plataforma", name: "gamePlatform", placeholder: "Ingresa la plataforma (PS5, Xbox Series, Switch, PC)" },
      { label: "Clasificación de Edad", name: "gameAgeRating", placeholder: "Ingresa clasificación (E, T, M, PEGI 3, 7, 12, 16, 18)" },
      { label: "Multijugador", name: "gameMultiplayer", placeholder: "Ingresa opciones multijugador (Local, Online, Co-op)" },
      { label: "Idioma", name: "gameLanguage", placeholder: "Ingresa idiomas disponibles (Español, Inglés, etc.)" },
      { label: "Año de Lanzamiento", name: "gameReleaseYear", placeholder: "Ingresa el año de lanzamiento (Ej: 2024)" },
      { label: "Formato", name: "gamePhysicalDigital", placeholder: "Ingresa el formato (Físico, Digital, Ambos)" }
    ],
  };

  // Obtener las especificaciones para la subcategoría actual
  const specifications = specificationsMap[subcategory] || [];

  // Si no hay especificaciones para esta subcategoría, no renderizar nada
  if (specifications.length === 0) return null;

  return (
    <>
      {specifications.map((spec) => (
        <React.Fragment key={spec.name}>
          <label htmlFor={spec.name} className="mt-3">{spec.label}:</label>
          <input
            type="text"
            id={spec.name}
            name={spec.name}
            placeholder={spec.placeholder}
            value={data[spec.name] || ""}
            onChange={handleOnChange}
            className="p-2 bg-slate-100 border rounded"
          />
        </React.Fragment>
      ))}
    </>
  );
};

export default ProductSpecifications;
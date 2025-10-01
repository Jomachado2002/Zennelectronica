const productModel = require("../../models/productModel");

const filterProductController = async (req, res) => {
  try {
    const { 
      category = [], 
      subcategory = [], 
      brandName = [],
      specifications = {} 
    } = req.body;

    let query = {};

    // Filtros básicos
    if (category.length > 0) query.category = { $in: category };
    if (subcategory.length > 0) query.subcategory = { $in: subcategory };
    if (brandName.length > 0) query.brandName = { $in: brandName };

    // Mapeo de especificaciones por subcategoría
    const specificationMappings = {
      // Informática
      notebooks: [
        'processor', 'memory', 'storage', 'disk', 
        'graphicsCard', 'notebookScreen', 'notebookBattery'
      ],
      computadoras_ensambladas: [
        'processor', 'memory', 'storage', 'graphicsCard',
        'pcCase', 'pcPowerSupply', 'pcCooling'
      ],
      placas_madre: [
        'motherboardSocket', 'motherboardChipset',
        'motherboardFormFactor', 'expansionSlots', 'ramType'
      ],
      tarjeta_grafica: [
        'graphicCardModel', 'graphicCardMemory', 'graphicCardMemoryType',
        'graphicCardBaseFrequency', 'graphicfabricate' ,'graphicCardTDP'
      ],
      gabinetes: [
        'caseFormFactor', 'caseMaterial', 'caseExpansionBays',
        'caseIncludedFans', 'caseCoolingSupport', 'caseBacklight'
      ],
      memorias_ram: [
        'ramText','ramType', 'ramSpeed', 'ramCapacity', 'ramLatency'
      ],
      discos_duros: [
        'hddCapacity', 'diskType', 'hddInterface',
        'hddRPM', 'diskReadSpeed', 'diskWriteSpeed'
      ],
      procesador: [
        'model','processorSocket', 'processorCores', 'processorThreads',
        'processorBaseFreq', 'processorTurboFreq',
        'processorCache', 'processorTDP'
      ],
      fuentes_alimentacion: [
        'psuWattage', 'psuEfficiency', 'psuModular',
        'psuFormFactor', 'psuProtections'
      ],
      impresoras: [
        'printerType', 'printerResolution', 'printerSpeed', 
        'printerColor', 'printerDuplex', 'printerConnectivity', 'printerTrayCapacity'
      ],
      cartuchos_toners: [
        'tonerType', 'tonerPrinterType', 'tonerColor', 
        'tonerYield', 'tonerCartridgeType', 'tonerCompatibleModel'
      ],
      escaneres: [
        'scannerType', 'scannerResolution', 'scannerSpeed', 
        'scannerMaxSize', 'scannerConnectivity', 'scannerFormats'
      ],
    
      // Periféricos
      monitores: [
        'monitorSize', 'monitorResolution',
        'monitorRefreshRate', 'monitorPanel', 'monitorConnectivity'
      ],
      teclados: [
        'keyboardInterface', 'keyboardLayout',
        'keyboardBacklight', 'keyboardSwitches', 'keyboardFeatures'
      ],
      mouses: [
        'mouseInterface', 'mouseSensor',
        'mouseDPI', 'mouseButtons', 'mouseBacklight'
      ],
      adaptadores: [
        'adapterType', 'adapterInterface',
        'adapterSpeed', 'adapterProtocol'
      ],
      auriculares: [
        'headphoneConnectionType', 'headphoneTechnology', 
        'headphoneFrequencyResponse', 'headphoneImpedance', 
        'headphoneNoiseCancel', 'headphoneBatteryLife'
      ],
      microfonos: [
        'microphoneType', 'microphonePolarPattern', 
        'microphoneFrequencyRange', 'microphoneConnection', 
        'microphoneSpecialFeatures'
      ],
    
      // CCTV
      camaras_seguridad: [
        'cameraResolution', 'cameraLensType',
        'cameraIRDistance', 'cameraType', 'cameraConnectivity',
        'cameraProtection'
      ],
      dvr: [
        'dvrChannels', 'dvrResolution',
        'dvrStorageCapacity', 'dvrConnectivity', 'dvrSmartFeatures'
      ],
      nas: [
        'nasMaxCapacity', 'nasBaysNumber',
        'nasProcessor', 'nasRAM', 'nasRAIDSupport', 'nasConnectivity'
      ],
    
      // Impresoras
      impresoras_laser: [
        'printerType', 'printerResolution',
        'printerSpeed', 'printerDuplex', 'printerConnectivity',
        'printerTrayCapacity'
      ],
      impresoras_multifuncion: [
        'printerType', 'printerFunctions',
        'printerResolution', 'printerSpeed', 'printerDuplex',
        'printerConnectivity', 'printerDisplay'
      ],
      cartuchostoner: [
        'tonerPrinterType', 'tonerColor', 
        'tonerYield', 'tonerCartridgeType', 'tonerCompatibleModel'
      ],
    
      // Accesorios
      ups: [
        'upsCapacity', 'upsOutputPower',
        'upsBackupTime', 'upsOutlets', 'upsType', 'upsConnectivity'
      ],
    
      // Software y Licencias
      licencias: [
        'softwareLicenseType', 'softwareLicenseDuration',
        'softwareLicenseQuantity', 'softwareVersion', 'softwareFeatures'
      ],
    
      // Telefonía
      telefonos_moviles: [
        'phoneType', 'phoneScreenSize',
        'phoneRAM', 'phoneStorage', 'phoneProcessor',
        'phoneCameras', 'phoneBattery', 'phoneOS'
      ],
      telefonos_fijos: [
        'landlineType', 'landlineTechnology',
        'landlineDisplay', 'landlineFunctions', 'landlineHandsets'
      ],
      tablets: [
        'tabletScreenSize', 'tabletScreenResolution',
        'tabletProcessor', 'tabletRAM', 'tabletStorage',
        'tabletOS', 'tabletConnectivity'
      ],
    
      // Redes
      switch: [
        'switchType', 'switchPorts', 'switchPortSpeed',
        'switchNetworkLayer', 'switchCapacity'
      ],
      servidores: [
        'serverType', 'serverProcessor', 'serverProcessorCount',
        'serverRAM', 'serverStorage', 'serverOS'
      ],
      cablesred: [
        'networkCableType', 'networkCableCategory', 
        'networkCableLength', 'networkCableShielding', 
        'networkCableRecommendedUse'
      ],
      racks: [
        'rackType', 'rackUnits', 'rackDepth',
        'rackMaterial', 'rackLoadCapacity'
      ],
      ap: [
        'apWiFiStandard', 'apSupportedBands', 
        'apMaxSpeed', 'apPorts', 'apAntennas'
      ],
        camaras_fotografia: [
        'cameraType', 'cameraResolution', 'cameraSensor', 
        'cameraLens', 'cameraVideo', 'cameraISO', 'cameraConnectivity'
      ],
      drones: [
        'droneType', 'droneFlightTime', 'droneRange', 
        'droneCamera', 'droneStabilization', 'droneSmartFeatures', 'droneWeight'
      ],
      televisores: [
        'tvScreenSize', 'tvResolution', 'tvPanelType', 
        'tvSmartFeatures', 'tvHDR', 'tvConnectivity', 'tvRefreshRate'
      ],
      parlantes: [
        'speakerType', 'speakerPower', 'speakerConnectivity', 
        'speakerBatteryLife', 'speakerResistance', 'speakerFrequencyResponse', 'speakerSpecialFeatures'
      ],
      relojes_inteligentes: [
        'smartwatchCompatibility', 'smartwatchDisplay', 'smartwatchBatteryLife', 
        'smartwatchSensors', 'smartwatchResistance', 'smartwatchConnectivity', 'smartwatchSportsFeatures'
      ],
      scooters: [
  'scooterMaxSpeed', 'scooterRange', 'scooterBatteryCapacity', 'scooterWeight', 
  'scooterMaxLoad', 'scooterWheelSize', 'scooterChargingTime'
],
consolas: [
  'consoleGeneration', 'consoleStorage', 'consoleType', 'consoleResolution', 
  'consoleConnectivity', 'consoleIncludedGames', 'consoleControllers'
],
monopatines: [
  'monopatinMaxSpeed', 'monopatinRange', 'monopatinBatteryLife', 'monopatinWeight', 
  'monopatinMaxLoad', 'monopatinWheelType', 'monopatinWaterResistance'
],
controles_consola: [
  'controllerCompatibility', 'controllerConnectionType', 'controllerBatteryLife', 
  'controllerSpecialFeatures', 'controllerVibration', 'controllerWireless'
],
juegos_consola: [
  'gameGenre', 'gamePlatform', 'gameAgeRating', 'gameMultiplayer', 
  'gameLanguage', 'gameReleaseYear', 'gamePhysicalDigital'
],
  };

    // Filtros por especificaciones
    if (Object.keys(specifications).length > 0) {
      for (const [key, values] of Object.entries(specifications)) {
        if (values.length > 0) {
          query[key] = { $in: values };
        }
      }
    }

    // Buscar productos según el filtro
    const products = await productModel.find(query);

    // Preparar filtros disponibles
    const filters = {
      brands: [],
      specifications: {}
    };

    if (subcategory.length > 0) {
      const subcategoryQuery = { subcategory: { $in: subcategory } };
      
      // Obtener marcas disponibles
      filters.brands = await productModel.distinct("brandName", subcategoryQuery);

      // Obtener especificaciones para la subcategoría
      const currentSubcategory = subcategory[0];
      const relevantSpecs = specificationMappings[currentSubcategory] || [];

      // Recolectar valores únicos para cada especificación
      relevantSpecs.forEach(specKey => {
        const specValues = products
          .map(product => product[specKey])
          .filter(value => value != null && value !== '');

        if (specValues.length > 0) {
          filters.specifications[specKey] = [...new Set(specValues)];
        }
      });
    }

    res.json({
      data: products,
      filters,
      message: "Productos filtrados correctamente",
      success: true,
      error: false
    });

  } catch (err) {
    console.error('Error en filterProductController:', err);
    res.status(500).json({
      message: err.message || err,
      error: true,
      success: false
    });
  }
};

module.exports = filterProductController;
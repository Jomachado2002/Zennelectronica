// Controlador temporal para categorías con especificaciones
const getTempCategoriesWithSpecs = async (req, res) => {
  try {
    const categoriesWithSpecs = [
      {
        value: "informatica",
        label: "Informática",
        name: "Informática",
        subcategories: [
          {
            value: "notebooks",
            label: "Notebooks",
            name: "Notebooks",
            specifications: [
              { name: "processor", label: "Procesador", type: "text", required: true },
              { name: "memory", label: "Memoria RAM", type: "text", required: true },
              { name: "storage", label: "Almacenamiento", type: "text", required: true },
              { name: "disk", label: "Disco", type: "text", required: false },
              { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", required: false },
              { name: "notebookScreen", label: "Pantalla", type: "text", required: true },
              { name: "notebookBattery", label: "Batería", type: "text", required: false }
            ]
          },
          {
            value: "computadoras_ensambladas",
            label: "Computadoras Ensambladas",
            name: "Computadoras Ensambladas",
            specifications: [
              { name: "processor", label: "Procesador", type: "text", required: true },
              { name: "memory", label: "Memoria RAM", type: "text", required: true },
              { name: "storage", label: "Almacenamiento", type: "text", required: true },
              { name: "graphicsCard", label: "Tarjeta Gráfica", type: "text", required: false },
              { name: "motherboard", label: "Placa Madre", type: "text", required: true },
              { name: "powerSupply", label: "Fuente de Poder", type: "text", required: true },
              { name: "case", label: "Gabinete", type: "text", required: false }
            ]
          }
        ]
      },
      {
        value: "perifericos",
        label: "Periféricos",
        name: "Periféricos",
        subcategories: [
          {
            value: "monitores",
            label: "Monitores",
            name: "Monitores",
            specifications: [
              { name: "monitorSize", label: "Tamaño", type: "text", required: true },
              { name: "monitorResolution", label: "Resolución", type: "text", required: true },
              { name: "monitorRefreshRate", label: "Tasa de Refresco", type: "text", required: false },
              { name: "monitorPanel", label: "Tipo de Panel", type: "text", required: false },
              { name: "monitorConnectivity", label: "Conectividad", type: "text", required: false }
            ]
          },
          {
            value: "teclados",
            label: "Teclados",
            name: "Teclados",
            specifications: [
              { name: "keyboardType", label: "Tipo", type: "text", required: true },
              { name: "keyboardConnection", label: "Conexión", type: "text", required: true },
              { name: "keyboardMechanical", label: "Mecánico", type: "boolean", required: false },
              { name: "keyboardBacklight", label: "Retroiluminado", type: "boolean", required: false }
            ]
          },
          {
            value: "mouse",
            label: "Mouse",
            name: "Mouse",
            specifications: [
              { name: "mouseType", label: "Tipo", type: "text", required: true },
              { name: "mouseConnection", label: "Conexión", type: "text", required: true },
              { name: "mouseDPI", label: "DPI", type: "number", required: false },
              { name: "mouseWireless", label: "Inalámbrico", type: "boolean", required: false }
            ]
          }
        ]
      },
      {
        value: "componentes",
        label: "Componentes",
        name: "Componentes",
        subcategories: [
          {
            value: "placas_madre",
            label: "Placas Madre",
            name: "Placas Madre",
            specifications: [
              { name: "motherboardSocket", label: "Socket", type: "text", required: true },
              { name: "motherboardChipset", label: "Chipset", type: "text", required: true },
              { name: "motherboardFormFactor", label: "Factor de Forma", type: "text", required: true },
              { name: "motherboardRAMSlots", label: "Slots de RAM", type: "number", required: false },
              { name: "motherboardPCIeSlots", label: "Slots PCIe", type: "number", required: false }
            ]
          },
          {
            value: "procesadores",
            label: "Procesadores",
            name: "Procesadores",
            specifications: [
              { name: "processorSocket", label: "Socket", type: "text", required: true },
              { name: "processorCores", label: "Núcleos", type: "number", required: true },
              { name: "processorThreads", label: "Hilos", type: "number", required: true },
              { name: "processorBaseClock", label: "Frecuencia Base", type: "text", required: true },
              { name: "processorBoostClock", label: "Frecuencia Turbo", type: "text", required: false }
            ]
          }
        ]
      }
    ];

    res.status(200).json({
      success: true,
      data: categoriesWithSpecs,
      message: "Categorías con especificaciones cargadas exitosamente"
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

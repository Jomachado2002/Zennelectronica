// src/helpers/productCategory.js - CÓDIGO COMPLETO CORREGIDO

// Función para generar títulos de página
export const generatePageTitle = (selectedCategory, selectedSubcategory) => {
    // Array de categorías
    const productCategory = [
      {
        id: 1,
        label: "Informática",
        value: "informatica",
        subcategories: [
          { id: 101, label: "Notebooks", value: "notebooks" },
          { id: 102, label: "Computadoras Ensambladas", value: "computadoras_ensambladas" },
          { id: 103, label: "Placas Madre", value: "placas_madre" },
          { id: 104, label: "Memorias RAM", value: "memorias_ram" },
          { id: 105, label: "Discos Duros", value: "discos_duros" },
          { id: 106, label: "Procesador", value: "procesador" },
          { id: 107, label: "Tarjeta Grafica", value: "tarjeta_grafica" },
          { id: 108, label: "Gabinetes", value: "gabinetes" },
          { id: 109, label: "Impresoras", value: "impresoras" },
          { id: 110, label: "Cartuchos y Toners", value: "cartuchos_toners" },
          { id: 111, label: "Escáneres", value: "escaneres" },
        ]
      },
      {
        id: 2,
        label: "Periféricos",
        value: "perifericos",
        subcategories: [
          { id: 201, label: "Monitores", value: "monitores" },
          { id: 202, label: "Teclados", value: "teclados" },
          { id: 203, label: "Mouses", value: "mouses" },
          { id: 204, label: "Adaptadores", value: "adaptadores" },
          { id: 205, label: "Auriculares", value: "auriculares" },
          { id: 206, label: "Microfonos", value: "microfonos"}
        ]
      },
      {
        id: 3,
        label: "CCTV",
        value: "cctv",
        subcategories: [
          { id: 301, label: "Cámaras de Seguridad", value: "camaras_seguridad" },
          { id: 302, label: "Grabadores DVR", value: "dvr" },
          { id: 303, label: "NAS", value: "nas" }
        ]
      },
      {
        id: 4,
        label: "Impresoras",
        value: "impresoras",
        subcategories: [
          { id: 401, label: "Impresoras Láser", value: "impresoras_laser" },
          { id: 402, label: "Impresoras Multifunción", value: "impresoras_multifuncion" },
          { id: 403, label: "Cartuchos y toner", value: "cartuchostoner" }
        ]
      },
      {
        id: 5,
        label: "Energia",
        value: "energia",
        subcategories: [
          { id: 501, label: "Fuentes de Alimentación", value: "fuentes_alimentacion" },
          { id: 502, label: "UPS", value: "ups" }
        ]
      },
      {
        id: 6,
        label: "Software y Licencias",
        value: "software_licencias",
        subcategories: [
          { id: 601, label: "Licencias de Software", value: "licencias" }
        ]
      },
      {
        id: 7,
        label: "Telefonía",
        value: "telefonia",
        subcategories: [
          { id: 701, label: "Teléfonos Móviles", value: "telefonos_moviles" },
          { id: 702, label: "Teléfonos Fijos", value: "telefonos_fijos" },
          { id: 703, label: "Tablets", value: "tablets" }
        ]
      },
      {
        id: 8,
        label: "Redes",
        value: "redes",
        subcategories: [
          { id: 801, label: "Switch", value: "switch" },
          { id: 802, label: "Servidores", value: "servidores" },
          { id: 803, label: "Cables de Red y conectores", value: "cablesred" },
          { id: 804, label: "Racks", value: "racks" },
          { id: 805, label: "Access Point", value: "ap" }
        ]
      },
      {
        id: 9,
        label: "Electrónicos",
        value: "electronicos",
        subcategories: [
          { id: 901, label: "Cámaras de Fotografía", value: "camaras_fotografia" },
          { id: 902, label: "Drones", value: "drones" },
          { id: 903, label: "Televisores", value: "televisores" },
          { id: 904, label: "Parlantes", value: "parlantes" },
          { id: 905, label: "Relojes Inteligentes", value: "relojes_inteligentes" },
          { id: 906, label: "Scooters Eléctricos", value: "scooters" },
          { id: 907, label: "Consolas", value: "consolas" },
          { id: 908, label: "Monopatines Eléctricos", value: "monopatines" },
          { id: 909, label: "Controles de Consola", value: "controles_consola" },
          { id: 910, label: "Juegos de Consola", value: "juegos_consola" }
        ]
      }
    ];
  
    // Buscar la categoría
    const categoryObj = productCategory.find(cat => cat.value === selectedCategory);
    
    // Si se encuentra la categoría
    if (categoryObj) {
      return `Productos de ${categoryObj.label} al mejor precio en Paraguay`;
    }
    
    // Buscar la subcategoría
    if (selectedSubcategory) {
      for (const category of productCategory) {
        const subcategoryObj = category.subcategories.find(sub => sub.value === selectedSubcategory);
        
        if (subcategoryObj) {
          return `${subcategoryObj.label} con envío gratis y garantía oficial`;
        }
      }
    }
    
    // Título por defecto
    return 'Equipos de tecnología al mejor precio en Paraguay';
  };

// ✅ ARRAY PRINCIPAL COMPLETO CON TODAS LAS CATEGORÍAS Y SUBCATEGORÍAS
const productCategory = [
  {
    id: 1,
    label: "Informática",
    value: "informatica",
    subcategories: [
      { id: 101, label: "Notebooks", value: "notebooks" },
      { id: 102, label: "Computadoras Ensambladas", value: "computadoras_ensambladas" },
      { id: 103, label: "Placas Madre", value: "placas_madre" },
      { id: 104, label: "Memorias RAM", value: "memorias_ram" },
      { id: 105, label: "Discos Duros", value: "discos_duros" },
      { id: 106, label: "Procesador", value: "procesador" },
      { id: 107, label: "Tarjeta Grafica", value: "tarjeta_grafica" },
      { id: 108, label: "Gabinetes", value: "gabinetes" },
      { id: 109, label: "Impresoras", value: "impresoras" },
      { id: 110, label: "Cartuchos y Toners", value: "cartuchos_toners" },
      { id: 111, label: "Escáneres", value: "escaneres" },
    ]
  },
  {
    id: 2,
    label: "Periféricos",
    value: "perifericos",
    subcategories: [
      { id: 201, label: "Monitores", value: "monitores" },
      { id: 202, label: "Teclados", value: "teclados" },
      { id: 203, label: "Mouses", value: "mouses" },
      { id: 204, label: "Adaptadores", value: "adaptadores" },
      { id: 205, label: "Auriculares", value: "auriculares" },
      { id: 206, label: "Microfonos", value: "microfonos"}
    ]
  },
  {
    id: 3,
    label: "CCTV",
    value: "cctv",
    subcategories: [
      { id: 301, label: "Cámaras de Seguridad", value: "camaras_seguridad" },
      { id: 302, label: "Grabadores DVR", value: "dvr" },
      { id: 303, label: "NAS", value: "nas" }
    ]
  },
  {
    id: 4,
    label: "Impresoras",
    value: "impresoras",
    subcategories: [
      { id: 401, label: "Impresoras Láser", value: "impresoras_laser" },
      { id: 402, label: "Impresoras Multifunción", value: "impresoras_multifuncion" },
      { id: 403, label: "Cartuchos y toner", value: "cartuchostoner" }
    ]
  },
  {
    id: 5,
    label: "Energia",
    value: "energia",
    subcategories: [
      { id: 501, label: "Fuentes de Alimentación", value: "fuentes_alimentacion" },
      { id: 502, label: "UPS", value: "ups" }
    ]
  },
  {
    id: 6,
    label: "Software y Licencias",
    value: "software_licencias",
    subcategories: [
      { id: 601, label: "Licencias de Software", value: "licencias" }
    ]
  },
  {
    id: 7,
    label: "Telefonía",
    value: "telefonia",
    subcategories: [
      { id: 701, label: "Teléfonos Móviles", value: "telefonos_moviles" },
      { id: 702, label: "Teléfonos Fijos", value: "telefonos_fijos" },
      { id: 703, label: "Tablets", value: "tablets" }
    ]
  },
  {
    id: 8,
    label: "Redes",
    value: "redes",
    subcategories: [
      { id: 801, label: "Switch", value: "switch" },
      { id: 802, label: "Servidores", value: "servidores" },
      { id: 803, label: "Cables de Red y conectores", value: "cablesred" },
      { id: 804, label: "Racks", value: "racks" },
      { id: 805, label: "Access Point", value: "ap" }
    ]
  },
  {
    id: 9,
    label: "Electrónicos",
    value: "electronicos",
    subcategories: [
      { id: 901, label: "Cámaras de Fotografía", value: "camaras_fotografia" },
      { id: 902, label: "Drones", value: "drones" },
      { id: 903, label: "Televisores", value: "televisores" },
      { id: 904, label: "Parlantes", value: "parlantes" },
      { id: 905, label: "Relojes Inteligentes", value: "relojes_inteligentes" },
      // ✅ NUEVAS SUBCATEGORÍAS AGREGADAS CORRECTAMENTE
      { id: 906, label: "Scooters Eléctricos", value: "scooters" },
      { id: 907, label: "Consolas", value: "consolas" },
      { id: 908, label: "Monopatines Eléctricos", value: "monopatines" },
      { id: 909, label: "Controles de Consola", value: "controles_consola" },
      { id: 910, label: "Juegos de Consola", value: "juegos_consola" }
    ]
  }
];

export default productCategory;
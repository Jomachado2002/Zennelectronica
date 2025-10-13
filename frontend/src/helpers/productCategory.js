// frontend/src/helpers/productCategory.js
// Datos estáticos para CategoryShowcase (mantenido para performance)

const productCategory = [
  {
    id: 1,
    value: "informatica",
    label: "Informática",
    subcategories: [
      { id: 1, value: "notebooks", label: "Notebooks" },
      { id: 2, value: "computadoras_ensambladas", label: "Computadoras Ensambladas" },
      { id: 3, value: "placas_madre", label: "Placas Madre" },
      { id: 4, value: "memorias_ram", label: "Memorias RAM" },
      { id: 5, value: "discos_duros", label: "Discos Duros" },
      { id: 6, value: "procesador", label: "Procesador" },
      { id: 7, value: "tarjeta_grafica", label: "Tarjeta Gráfica" },
      { id: 8, value: "gabinetes", label: "Gabinetes" }
    ]
  },
  {
    id: 2,
    value: "perifericos",
    label: "Periféricos",
    subcategories: [
      { id: 9, value: "monitores", label: "Monitores" },
      { id: 10, value: "teclados", label: "Teclados" },
      { id: 11, value: "mouses", label: "Mouses" }
    ]
  },
  {
    id: 3,
    value: "telefonia",
    label: "Telefonía",
    subcategories: [
      { id: 12, value: "telefonos_moviles", label: "Teléfonos Móviles" },
      { id: 13, value: "tablets", label: "Tablets" }
    ]
  }
];

export default productCategory;

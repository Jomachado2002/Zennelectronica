// src/utils/getSeoTitle.js

const getSeoTitle = (location, categories = []) => {
  const urlSearch = new URLSearchParams(location.search);
  const selectedCategory = urlSearch.get("category") || "";
  const selectedSubcategory = urlSearch.get("subcategory") || "";
  
  // Títulos específicos para casos particulares
  if (selectedSubcategory === "notebooks") 
    return "Las mejores notebooks para estudiantes y profesionales en Paraguay";
  if (selectedSubcategory === "placasMadre") 
    return "Placas madre de alto rendimiento para gaming y diseño";
  if (selectedSubcategory === "procesador")
    return "Procesadores de última generación para tu PC";
  if (selectedSubcategory === "tarjeta_grafica")
    return "Tarjetas gráficas para gaming y diseño profesional";
  if (selectedSubcategory === "computadoras_ensambladas")
    return "Computadoras ensambladas de alto rendimiento";
  
  // Buscar en las categorías dinámicas
  if (categories.length > 0) {
    // Buscar la categoría
    const categoryObj = categories.find(cat => cat.value === selectedCategory);
    if (categoryObj) {
      return `Productos de ${categoryObj.label} al mejor precio en Paraguay`;
    }
    
    // Buscar la subcategoría
    if (selectedSubcategory) {
      for (const category of categories) {
        const subcategoryObj = category.subcategories?.find(sub => sub.value === selectedSubcategory);
        if (subcategoryObj) {
          return `${subcategoryObj.label} con envío gratis y garantía oficial`;
        }
      }
    }
  }
  
  // Título por defecto
  return 'Equipos de tecnología al mejor precio en Paraguay';
};

export default getSeoTitle;
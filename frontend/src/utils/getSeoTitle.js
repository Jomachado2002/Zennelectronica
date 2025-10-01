// src/utils/getSeoTitle.js
import { generatePageTitle } from '../helpers/productCategory';

const getSeoTitle = (location) => {
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
  
  // Usar la función de generación de título
  return generatePageTitle(selectedCategory, selectedSubcategory) || 
         'Equipos de tecnología al mejor precio en Paraguay';
};

export default getSeoTitle;
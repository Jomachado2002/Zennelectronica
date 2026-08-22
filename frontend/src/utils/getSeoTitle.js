// src/utils/getSeoTitle.js
import { leafLabelFromStoredLabel } from '../helpers/visaoNavigationTree';

const getSeoTitle = (location, categories = []) => {
  const urlSearch = new URLSearchParams(location.search);
  const selectedCategory = urlSearch.get('category') || '';
  const selectedSubcategory = urlSearch.get('subcategory') || '';

  // Subcategoría primero (más específica)
  if (selectedSubcategory && categories.length > 0) {
    for (const category of categories) {
      const subcategoryObj = category.subcategories?.find(
        (sub) => sub.value === selectedSubcategory
      );
      if (subcategoryObj) {
        const label = leafLabelFromStoredLabel(subcategoryObj.label || subcategoryObj.name);
        return `${label} al mejor precio en Paraguay`;
      }
      // Hojas Visão viven en el árbol; si el menú plano no tiene el sub, usar value legible
    }
    const human = selectedSubcategory
      .replace(/__/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\d+/g, '')
      .trim();
    if (human.length > 2) {
      return `${human.charAt(0).toUpperCase()}${human.slice(1)} en Paraguay`;
    }
  }

  if (selectedCategory && categories.length > 0) {
    const categoryObj = categories.find((cat) => cat.value === selectedCategory);
    if (categoryObj) {
      const label = categoryObj.label || categoryObj.name;
      if (/notebook/i.test(selectedCategory) || /notebook/i.test(label)) {
        return 'Notebooks para estudio, oficina y gaming en Paraguay';
      }
      return `${label} al mejor precio en Paraguay`;
    }
  }

  // Fallbacks legacy
  if (selectedCategory.includes('notebook') || selectedSubcategory === 'notebooks' || selectedSubcategory.includes('notebook')) {
    return 'Notebooks para estudio, oficina y gaming en Paraguay';
  }
  if (selectedSubcategory.includes('celular') || selectedSubcategory.includes('smartphone')) {
    return 'Celulares y smartphones en Paraguay';
  }

  return 'Equipos de tecnología al mejor precio en Paraguay';
};

export default getSeoTitle;

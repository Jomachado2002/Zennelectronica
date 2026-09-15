const RAM_SUBCATEGORY_MARKERS = ['memoria_ram'];

const STORAGE_SUBCATEGORY_MARKERS = [
  'ssd',
  'disco_duro',
  'pendrive',
  'tarjetas_sd',
  'lector_para_tarjetas',
  'accesorios_para_disco_duro'
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function isRamSubcategory(subcategory) {
  const sub = normalize(subcategory);
  return RAM_SUBCATEGORY_MARKERS.some((marker) => sub.includes(marker));
}

export function isStorageWithoutWarranty({ category, subcategory, productName } = {}) {
  const cat = normalize(category);
  const sub = normalize(subcategory);
  const name = normalize(productName);

  if (isRamSubcategory(sub)) {
    return false;
  }

  if (cat === 'almacenamiento') {
    return true;
  }

  if (STORAGE_SUBCATEGORY_MARKERS.some((marker) => sub.includes(marker))) {
    return true;
  }

  return /\b(ssd|hdd|nvme|pendrive|micro\s*sd)\b|disco\s*duro|\bhds?\b/.test(name);
}

export function categoryListingHasNoWarrantyNotice(filterCategoryList = [], filterSubcategoryList = []) {
  const categories = (filterCategoryList || []).map(normalize);
  const subcategories = (filterSubcategoryList || []).map(normalize);

  if (subcategories.length > 0) {
    return subcategories.every((subcategory) =>
      isStorageWithoutWarranty({
        category: categories[0],
        subcategory
      })
    );
  }

  return categories.includes('almacenamiento');
}

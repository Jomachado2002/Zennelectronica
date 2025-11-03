// Script para verificar URLs de imágenes de productos
// Ejecutar en la consola del navegador en la página de un producto

console.log('🔍 Verificando URLs de imágenes para WhatsApp...');

// 1. Verificar meta tags Open Graph
const ogImage = document.querySelector('meta[property="og:image"]');
const ogTitle = document.querySelector('meta[property="og:title"]');
const ogDescription = document.querySelector('meta[property="og:description"]');
const ogUrl = document.querySelector('meta[property="og:url"]');

console.log('📋 Meta Tags Open Graph:');
console.log('og:image:', ogImage?.content || 'NO ENCONTRADO');
console.log('og:title:', ogTitle?.content || 'NO ENCONTRADO');
console.log('og:description:', ogDescription?.content || 'NO ENCONTRADO');
console.log('og:url:', ogUrl?.content || 'NO ENCONTRADO');

// 2. Verificar si la imagen es accesible
if (ogImage?.content) {
  console.log('🖼️ Verificando accesibilidad de la imagen...');
  
  const img = new Image();
  img.onload = function() {
    console.log('✅ Imagen cargada correctamente:', ogImage.content);
    console.log('📏 Dimensiones:', img.naturalWidth, 'x', img.naturalHeight);
  };
  img.onerror = function() {
    console.log('❌ Error al cargar la imagen:', ogImage.content);
  };
  img.src = ogImage.content;
} else {
  console.log('❌ No se encontró meta tag og:image');
}

// 3. Verificar todas las imágenes del producto
const productImages = document.querySelectorAll('img[src*="product"]');
console.log('🖼️ Todas las imágenes del producto encontradas:');
productImages.forEach((img, index) => {
  console.log(`${index + 1}. ${img.src}`);
});

// 4. Verificar datos del producto en el estado
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  console.log('⚛️ Verificando estado de React...');
  // Esto es más complejo, mejor usar los logs que agregamos al componente
}

console.log('🔍 Debug completado. Revisa los logs arriba para identificar el problema.');




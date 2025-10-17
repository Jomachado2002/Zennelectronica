// backend/utils/slugGenerator.js
// Utilidades para generar slugs de productos

/**
 * Genera un slug a partir del nombre del producto
 * @param {string} productName - Nombre del producto
 * @param {number} maxLength - Longitud máxima del slug (por defecto: 100)
 * @returns {string} Slug generado
 */
function generateSlug(productName, maxLength = 100) {
    try {
        if (!productName || typeof productName !== 'string') {
            throw new Error('El nombre del producto es requerido');
        }

        let slug = productName
            .toLowerCase()                           // Convertir a minúsculas
            .normalize("NFD")                        // Normalizar caracteres Unicode
            .replace(/[\u0300-\u036f]/g, '')        // Quitar acentos
            .replace(/[^a-z0-9\s-]/g, '')           // Solo alfanuméricos, espacios y guiones
            .replace(/\s+/g, '-')                   // Espacios por guiones
            .replace(/-+/g, '-')                    // Múltiples guiones por uno solo
            .trim()                                 // Quitar espacios al inicio y final
            .replace(/^-+|-+$/g, '');               // Quitar guiones al inicio y final

        // Truncar si excede la longitud máxima
        if (slug.length > maxLength) {
            slug = slug.substring(0, maxLength);
            // Asegurar que no termine en guión
            slug = slug.replace(/-+$/, '');
        }

        return slug;

    } catch (error) {
        console.error('Error generando slug:', error.message);
        // Generar slug de emergencia
        return `product-${Date.now()}`;
    }
}

/**
 * Genera un slug único agregando un sufijo numérico si es necesario
 * @param {string} productName - Nombre del producto
 * @param {Function} checkUnique - Función para verificar si el slug es único
 * @param {number} maxLength - Longitud máxima del slug
 * @returns {Promise<string>} Slug único generado
 */
async function generateUniqueSlug(productName, checkUnique, maxLength = 100) {
    try {
        let baseSlug = generateSlug(productName, maxLength - 10); // Dejar espacio para sufijo
        let slug = baseSlug;
        let counter = 1;

        // Verificar si el slug base es único
        let isUnique = await checkUnique(slug);

        // Si no es único, agregar contador
        while (!isUnique && counter < 1000) { // Límite de seguridad
            slug = `${baseSlug}-${counter}`;
            isUnique = await checkUnique(slug);
            counter++;
        }

        if (!isUnique) {
            // Si aún no es único, usar timestamp
            slug = `${baseSlug}-${Date.now()}`;
        }

        return slug;

    } catch (error) {
        console.error('Error generando slug único:', error.message);
        return generateSlug(productName, maxLength);
    }
}

/**
 * Valida si un slug tiene el formato correcto
 * @param {string} slug - Slug a validar
 * @returns {boolean} True si es válido
 */
function isValidSlug(slug) {
    if (!slug || typeof slug !== 'string') return false;
    
    // Debe contener solo letras minúsculas, números y guiones
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && 
           slug.length > 0 && 
           slug.length <= 100 &&
           !slug.startsWith('-') &&
           !slug.endsWith('-');
}

/**
 * Limpia un slug existente
 * @param {string} slug - Slug a limpiar
 * @returns {string} Slug limpio
 */
function cleanSlug(slug) {
    if (!slug) return '';
    
    return slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')  // Solo letras, números y guiones
        .replace(/-+/g, '-')         // Múltiples guiones por uno solo
        .replace(/^-+|-+$/g, '');    // Quitar guiones al inicio y final
}

module.exports = {
    generateSlug,
    generateUniqueSlug,
    isValidSlug,
    cleanSlug
};

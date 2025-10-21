# 🖼️ Conversión Masiva de Imágenes a WebP

Este conjunto de scripts permite convertir todas las imágenes de Firebase Storage al formato WebP para mejorar el rendimiento y reducir el tamaño de los archivos.

## 📋 Características

- ✅ Conversión masiva de todas las imágenes de productos
- ✅ Conversión individual de imágenes específicas
- ✅ Optimización automática de tamaño y calidad
- ✅ Reemplazo automático de imágenes originales
- ✅ Actualización de referencias en la base de datos
- ✅ Modo de prueba (dry-run) para verificar antes de ejecutar
- ✅ Procesamiento por lotes para evitar sobrecarga
- ✅ Logging detallado con colores
- ✅ Verificación de conversión exitosa

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd backend
node scripts/install-webp-dependencies.js
```

### 2. Configurar variables de entorno (opcional)

Las variables de entorno se configuran automáticamente, pero puedes personalizarlas:

```bash
export FIREBASE_API_KEY="tu_api_key"
export FIREBASE_AUTH_DOMAIN="tu_domain"
export FIREBASE_PROJECT_ID="tu_project_id"
export FIREBASE_STORAGE_BUCKET="tu_bucket"
export MONGODB_URI="tu_mongodb_uri"
```

## 📖 Uso

### Conversión Masiva

```bash
# Modo de prueba (recomendado primero)
node scripts/convertImagesToWebP.js --dry-run

# Conversión real
node scripts/convertImagesToWebP.js

# Con opciones personalizadas
node scripts/convertImagesToWebP.js --quality=90 --max-width=2048 --batch-size=5
```

### Conversión Individual

```bash
# Convertir una imagen específica
node scripts/convertSingleImageToWebP.js "https://firebasestorage.googleapis.com/..."

# Convertir todas las imágenes de un producto
node scripts/convertSingleImageToWebP.js --product "507f1f77bcf86cd799439011"
```

### Verificación

```bash
# Verificar estadísticas generales
node scripts/verifyWebPConversion.js

# Verificar producto específico
node scripts/verifyWebPConversion.js --product "507f1f77bcf86cd799439011"
```

## ⚙️ Opciones de Configuración

### Conversión Masiva

| Opción | Descripción | Valor por defecto |
|--------|-------------|-------------------|
| `--dry-run` | Modo de prueba (no actualiza BD) | false |
| `--quality=85` | Calidad WebP (0-100) | 85 |
| `--max-width=1920` | Ancho máximo en píxeles | 1920 |
| `--max-height=1080` | Alto máximo en píxeles | 1080 |
| `--batch-size=10` | Productos por lote | 10 |

### Ejemplos de Uso

```bash
# Prueba con configuración conservadora
node scripts/convertImagesToWebP.js --dry-run --quality=80 --max-width=1600

# Conversión de alta calidad
node scripts/convertImagesToWebP.js --quality=95 --max-width=2560

# Procesamiento rápido con lotes pequeños
node scripts/convertImagesToWebP.js --batch-size=5 --quality=85
```

## 📊 Proceso de Conversión

1. **Conexión**: Se conecta a MongoDB y Firebase Storage
2. **Análisis**: Cuenta productos e imágenes a procesar
3. **Procesamiento por lotes**: 
   - Descarga imagen original
   - Convierte a WebP con optimización
   - Sube nueva imagen WebP a Firebase
   - Elimina imagen original
   - Actualiza referencia en base de datos
4. **Limpieza**: Limpia archivos temporales
5. **Reporte**: Muestra estadísticas finales

## 🔍 Verificación y Monitoreo

### Estadísticas que se muestran:

- Total de productos procesados
- Total de imágenes convertidas
- Imágenes saltadas (ya WebP o no-Firebase)
- Errores encontrados
- Tiempo total de procesamiento
- Porcentaje de conversión

### Verificación de integridad:

- Accesibilidad de imágenes
- Formato correcto (WebP)
- Referencias actualizadas en BD
- Eliminación de originales

## ⚠️ Consideraciones Importantes

### Antes de ejecutar:

1. **Hacer backup de la base de datos**
2. **Ejecutar en modo dry-run primero**
3. **Verificar conectividad a Firebase**
4. **Tener suficiente espacio en disco temporal**

### Durante la ejecución:

- El proceso puede tomar tiempo dependiendo del número de imágenes
- Se procesa por lotes para evitar sobrecarga
- Los errores no interrumpen el proceso completo
- Se mantienen logs detallados

### Después de la ejecución:

- Verificar estadísticas de conversión
- Comprobar que las imágenes se cargan correctamente
- Monitorear el rendimiento de la aplicación

## 🛠️ Solución de Problemas

### Error de conexión a Firebase:
```bash
# Verificar variables de entorno
echo $FIREBASE_API_KEY
echo $FIREBASE_STORAGE_BUCKET
```

### Error de conexión a MongoDB:
```bash
# Verificar URI de MongoDB
echo $MONGODB_URI
```

### Imágenes no se convierten:
```bash
# Verificar que las URLs sean de Firebase
node scripts/verifyWebPConversion.js --product "ID_DEL_PRODUCTO"
```

### Proceso interrumpido:
```bash
# Reanudar desde donde se quedó
node scripts/convertImagesToWebP.js
# El script detecta automáticamente qué falta por procesar
```

## 📈 Beneficios de WebP

- **Tamaño reducido**: 25-35% menor que JPEG
- **Mejor compresión**: Mantiene calidad visual
- **Soporte amplio**: Compatible con navegadores modernos
- **Carga más rápida**: Mejor experiencia de usuario
- **SEO mejorado**: Páginas más rápidas

## 🔧 Personalización

Puedes modificar la configuración en `webp-conversion-config.js`:

```javascript
module.exports = {
  webp: {
    quality: 85,        // Calidad de compresión
    maxWidth: 1920,     // Ancho máximo
    maxHeight: 1080,    // Alto máximo
    effort: 6           // Esfuerzo de compresión
  },
  processing: {
    batchSize: 10,      // Productos por lote
    batchDelay: 2000,   // Delay entre lotes
    timeout: 30000      // Timeout para descargas
  }
};
```

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de error
2. Ejecuta el verificador de conversión
3. Verifica la conectividad a Firebase y MongoDB
4. Revisa los permisos de Firebase Storage

---

**¡Importante!** Siempre ejecuta primero en modo `--dry-run` para verificar que todo funciona correctamente antes de hacer cambios reales en tu base de datos.



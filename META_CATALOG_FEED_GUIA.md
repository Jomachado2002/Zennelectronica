# 📱 Guía de Integración: Feed XML para Meta Ads (Facebook Catalog)

## 🎯 ¿Qué es esto?

Este sistema genera automáticamente un feed XML compatible con Meta Ads (Facebook/Instagram) que contiene todos tus productos con stock disponible. Meta leerá este XML automáticamente para mantener tu catálogo de productos actualizado.

## 🔗 URL del Feed

Tu feed XML está disponible en:

```
https://zenn.com.py/api/channable/feed.xml
```

Esta URL es **pública** y actualizada en tiempo real con todos los productos que tienen stock disponible.

## 📋 Características del Feed

### ✅ Filtros Automáticos

El feed incluye **SOLO** productos que cumplan con:

- ✅ Tienen stock disponible (stock > 0 o stockStatus = 'in_stock')
- ✅ Tienen al menos una imagen válida
- ✅ Tienen nombre y precio válidos
- ✅ Tienen slug para generar URL limpia

### 📊 Información Incluida por Producto

Cada producto en el feed incluye:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **g:id** | ID único del producto | `507f1f77bcf86cd799439011` |
| **g:title** | Nombre + especificaciones clave | `Notebook Lenovo - Intel i5, 8GB RAM, 256GB SSD` |
| **g:description** | Descripción completa del producto | Texto limpio hasta 5000 caracteres |
| **g:link** | URL del producto en tu web | `https://zenn.com.py/producto/notebook-lenovo-...` |
| **g:image_link** | Imagen principal | URL de Firebase Storage |
| **g:additional_image_link** | Imágenes adicionales (hasta 9) | URLs adicionales |
| **g:brand** | Marca del producto | `Lenovo` |
| **g:condition** | Condición (siempre "new") | `new` |
| **g:availability** | Disponibilidad | `in stock` o `out of stock` |
| **g:price** | Precio con moneda | `2500000 PYG` |
| **g:product_type** | Categoría > Subcategoría | `Informática > Notebooks` |
| **g:google_product_category** | Categoría principal | `Informática` |
| **g:mpn** | Código del producto | `NB-LEN-001` |

## 🚀 Cómo Configurar en Meta Business

### Paso 1: Acceder a Meta Commerce Manager

1. Ve a [Meta Business Suite](https://business.facebook.com/)
2. Selecciona tu cuenta de negocio
3. Ve a **Commerce Manager** → **Catálogos**

### Paso 2: Crear un Nuevo Catálogo

1. Clic en **"Crear catálogo"**
2. Selecciona **"Comercio electrónico"**
3. Asigna un nombre a tu catálogo (ej: "Zenn Electrónica - Productos")
4. Completa la configuración inicial

### Paso 3: Agregar Feed de Datos

1. Dentro del catálogo, ve a **"Fuentes de datos"**
2. Clic en **"Agregar artículos"**
3. Selecciona **"Usar feeds de datos"**
4. Escoge **"Programado"** para actualizaciones automáticas

### Paso 4: Configurar el Feed

**Configuración del feed:**

```
Nombre del feed: Zenn - Todos los Productos
URL del feed: https://zenn.com.py/api/channable/feed.xml
Formato: XML
Moneda: PYG (Guaraníes Paraguayos)
```

**Frecuencia de actualización recomendada:**
- **Cada 1 hora** - Para negocios con cambios frecuentes de stock
- **Cada 4 horas** - Para negocios con cambios moderados
- **Cada 12 horas** - Para catálogos más estables

### Paso 5: Mapeo de Campos (Meta lo hace automáticamente)

Meta detectará automáticamente estos campos del XML:

| Campo en XML | Campo en Meta | Requerido |
|--------------|---------------|-----------|
| g:id | id | ✅ Sí |
| g:title | title | ✅ Sí |
| g:description | description | ✅ Sí |
| g:link | link | ✅ Sí |
| g:image_link | image_link | ✅ Sí |
| g:price | price | ✅ Sí |
| g:availability | availability | ✅ Sí |
| g:condition | condition | ✅ Sí |
| g:brand | brand | ⚠️ Recomendado |
| g:product_type | product_type | ⚠️ Recomendado |
| g:additional_image_link | additional_image_link | ⚪ Opcional |
| g:mpn | mpn | ⚪ Opcional |

### Paso 6: Validar y Publicar

1. Meta validará automáticamente el feed
2. Espera a que se procesen los productos (puede tomar 15-30 minutos)
3. Revisa los **errores de diagnóstico** si los hay
4. Una vez validado, los productos estarán disponibles

## 🔄 Actualizaciones Automáticas

### ¿Qué se Actualiza Automáticamente?

- ✅ **Stock**: Productos sin stock se marcan como "out of stock"
- ✅ **Precios**: Cambios en sellingPrice se reflejan automáticamente
- ✅ **Nuevos productos**: Aparecen en el siguiente refresh
- ✅ **Productos eliminados**: Desaparecen si no tienen stock
- ✅ **Imágenes**: Cambios en productImage se actualizan

### Frecuencia de Actualización

El feed se genera **en tiempo real** cada vez que Meta lo consulta, basándose en los datos actuales de tu base de datos.

## 🛠️ Solución de Problemas

### Error: "No se pudieron obtener productos del feed"

**Posibles causas:**
1. La URL no es accesible públicamente
2. El servidor está bloqueando el user-agent de Meta
3. Hay un error en el XML generado

**Solución:**
```bash
# Verificar que el feed sea accesible
curl https://zenn.com.py/api/meta-catalog.xml

# Debería devolver XML válido
```

### Error: "Faltan campos requeridos"

**Verificar que tus productos tengan:**
- ✅ productName
- ✅ sellingPrice > 0
- ✅ productImage (al menos 1)
- ✅ slug válido
- ✅ brandName
- ✅ stock > 0

### Error: "Imágenes no disponibles"

Meta requiere que las imágenes sean:
- Accesibles públicamente (sin autenticación)
- Formato: JPG, PNG, WEBP
- Tamaño mínimo: 500x500 px (recomendado: 1200x1200 px)
- URL HTTPS

**Tus imágenes en Firebase Storage ya cumplen con estos requisitos ✅**

### Productos no aparecen en el catálogo

**Verificar:**
1. ¿Tienen stock > 0?
2. ¿Tienen slug generado?
3. ¿Las imágenes son de Firebase?
4. ¿El precio es mayor a 1 PYG?

## 📊 Monitoreo del Feed

### Ver el XML generado

Accede directamente a:
```
https://zenn.com.py/api/channable/feed.xml
```

### Headers de Respuesta Importantes

```
Content-Type: application/xml; charset=utf-8
X-Total-Products: 245          ← Total de productos incluidos
X-Skipped-Products: 12         ← Productos omitidos (sin stock, etc.)
X-Generated-At: [fecha]        ← Última generación
Cache-Control: public, max-age=3600  ← Cache de 1 hora
```

### Verificar en Meta

1. Ve a **Commerce Manager** → **Catálogos**
2. Selecciona tu catálogo
3. Ve a **"Fuentes de datos"**
4. Revisa **"Diagnósticos"** para ver errores

## 🎨 Optimización para Mejores Resultados

### 1. Títulos Descriptivos

**Malo:**
```
Notebook Lenovo
```

**Bueno:**
```
Notebook Lenovo IdeaPad 3 - Intel i5 11va Gen, 8GB RAM, 256GB SSD, 15.6"
```

El feed **ya incluye especificaciones clave automáticamente** en el título.

### 2. Descripciones Completas

Meta usa la descripción para:
- Búsquedas dentro de Facebook/Instagram
- Mostrar en anuncios dinámicos
- Categorización automática

**Asegúrate de incluir:**
- Características principales
- Casos de uso
- Compatibilidad
- Contenido de la caja

### 3. Imágenes de Alta Calidad

- Fondo blanco o limpio
- Producto centrado
- Múltiples ángulos (usa additional_image_link)
- Resolución alta (1200x1200px mínimo)

### 4. Categorías Correctas

Usa categorías consistentes en tu base de datos:
```
Informática > Notebooks
Informática > Monitores
Periféricos > Teclados
CCTV > Cámaras de Seguridad
```

Meta las usará para categorizar automáticamente tus productos.

## 🔐 Seguridad y Rendimiento

### Cache

El feed tiene cache de **1 hora** para optimizar rendimiento:
- Primera solicitud genera el XML
- Siguientes solicitudes usan cache (si es < 1 hora)
- Meta típicamente consulta cada 4-12 horas

### Acceso Público

El feed es **público** (no requiere autenticación) porque:
- Meta necesita acceso sin login
- Solo muestra productos con stock
- No expone información sensible
- Es estándar en e-commerce

### Monitoreo de Requests

Los logs del servidor mostrarán:
```
🎯 Generando feed XML para Meta Ads...
✅ Encontrados 245 productos con stock para Meta Ads
✅ Feed generado: 245 productos incluidos, 12 omitidos
```

## 📈 Uso en Meta Ads

Una vez configurado el catálogo, puedes:

### 1. Anuncios Dinámicos de Productos

- Mostrar productos automáticamente a personas interesadas
- Remarketing a visitantes de tu sitio
- Cross-selling de productos relacionados

### 2. Tienda en Facebook/Instagram

- Los productos aparecen en tu Shop
- Usuarios pueden comprar directamente
- Checkout nativo o redirección a tu sitio

### 3. Anuncios de Colección

- Mostrar múltiples productos
- Catálogos interactivos
- Experiencia inmersiva

### 4. Etiquetado de Productos

- Etiquetar productos en publicaciones
- Stories con productos
- Reels de compras

## 🆘 Soporte

### Contactos Útiles

**Meta Business Support:**
- [Centro de Ayuda de Commerce Manager](https://www.facebook.com/business/help/2371372636254534)
- [Especificaciones de Feed de Productos](https://www.facebook.com/business/help/120325381656392)

**Soporte Técnico Zenn:**
- Revisar logs en el servidor
- Verificar conectividad de la base de datos
- Validar estructura del XML

### Recursos Adicionales

- [Meta Commerce Manager](https://business.facebook.com/commerce)
- [Validador de XML](https://www.xmlvalidation.com/)
- [Guía de Google Product Feed](https://support.google.com/merchants/answer/7052112) (similar a Meta)

## ✅ Checklist de Implementación

Antes de activar en producción:

- [ ] Feed accesible en `https://zenn.com.py/api/channable/feed.xml`
- [ ] XML válido y bien formado
- [ ] Al menos 10 productos con stock visible
- [ ] Imágenes de Firebase accesibles públicamente
- [ ] Precios correctos en PYG
- [ ] Descripciones completas
- [ ] Categorías bien definidas
- [ ] Probado en Meta Commerce Manager
- [ ] Sin errores en diagnósticos de Meta
- [ ] Actualización automática configurada

## 🎉 ¡Listo!

Tu feed XML para Meta Ads está completamente configurado y listo para usar. Meta actualizará tu catálogo automáticamente según la frecuencia que configures, y siempre mostrará solo productos con stock disponible.

---

**Última actualización:** Noviembre 2025  
**Versión del Feed:** 1.0  
**Formato:** RSS 2.0 con Google Product Namespace


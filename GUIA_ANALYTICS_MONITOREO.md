# 📊 Guía de Analytics y Monitoreo - Zenn

## ✅ Lo que se implementó

He configurado **3 sistemas de analytics** para monitorear a todos los visitantes de tu sitio web:

### 1. **Google Analytics 4 (GA4)** ⭐ Principal
- **ID de Medición:** `G-M2BDLSJF39`
- **Estado:** ✅ Implementado y activo
- **Qué trackea:**
  - Visitas diarias/semanales/mensuales
  - Páginas más visitadas
  - Tiempo en el sitio
  - Dispositivos usados (móvil, tablet, desktop)
  - País y ciudad de visitantes
  - Eventos personalizados:
    - Clics en WhatsApp
    - Visualización de productos
    - Agregar al carrito
    - Búsquedas
    - Compras completadas

### 2. **Vercel Analytics** 
- **Estado:** ✅ Implementado
- **Qué trackea:**
  - Visitas y páginas vistas
  - Métricas de rendimiento (velocidad de carga)
  - Regiones geográficas
  - **Acceso:** Dashboard de Vercel

### 3. **Meta Pixel** (Ya existía)
- **ID:** `1535652171192853`
- **Estado:** ✅ Ya estaba implementado
- **Uso:** Para campañas de Facebook/Meta Ads

---

## 📍 Dónde ver los datos

### Google Analytics 4 (Recomendado para análisis detallado)

1. **Ir a:** https://analytics.google.com
2. **Iniciar sesión** con tu cuenta de Google
3. **Seleccionar:** Tu propiedad "Zenn Web"
4. **Ver dashboard principal** que muestra:
   - Usuarios en tiempo real
   - Usuarios por día/semana/mes
   - Páginas más visitadas
   - Eventos (WhatsApp clicks, productos vistos, etc.)

#### Métricas principales que verás:
- **Reportes > Tiempo real:** Ver visitantes en este momento
- **Reportes > Adquisición:** De dónde vienen tus visitantes
- **Reportes > Participación:** Qué páginas visitan más
- **Reportes > Comercio electrónico:** Productos más vistos, agregados al carrito, comprados

### Vercel Analytics

1. **Ir a:** https://vercel.com
2. **Iniciar sesión** en tu cuenta
3. **Seleccionar** tu proyecto
4. **Ir a la pestaña "Analytics"**
5. Verás métricas de:
   - Visitas diarias
   - Páginas más populares
   - Rendimiento del sitio

---

## 🎯 Eventos que se están trackeando automáticamente

El sistema trackea automáticamente:

### ✅ Navegación
- Cada vez que alguien visita una página
- Cambio de ruta/navegación

### ✅ Productos
- **Visualización de producto:** Cuando alguien ve un producto específico
- **Agregar al carrito:** Cuando alguien agrega un producto
- **Clic en WhatsApp desde producto:** Cuando hacen clic en el botón de WhatsApp

### ✅ Compras
- Inicio de proceso de pago
- Compra completada (si usas Bancard)
- Estado de transacciones

### ✅ Búsquedas
- Términos buscados en tu sitio

---

## 🔧 Archivos modificados

### Nuevos archivos creados:
1. `frontend/src/components/GoogleAnalytics.js` - Componente principal de GA4
2. `GUIA_ANALYTICS_MONITOREO.md` - Esta guía

### Archivos modificados:
1. `frontend/public/index.html` - Agregado código de GA4 en el `<head>`
2. `frontend/src/App.js` - Integrado GoogleAnalytics y Vercel Analytics
3. `frontend/src/pages/ProductDetails.js` - Agregado tracking de eventos de productos
4. `frontend/package.json` - Agregado `@vercel/analytics`

---

## ⏱️ Tiempo para ver datos

- **Google Analytics:** Los datos aparecen en tiempo real (pestaña "Tiempo real"), pero los reportes completos pueden tardar **24-48 horas** en procesarse correctamente
- **Vercel Analytics:** Los datos aparecen casi inmediatamente en el dashboard

---

## 📱 Cómo verificar que funciona

### Verificación rápida (5 minutos):

1. **Abre tu sitio web** en una ventana de incógnito
2. **Navega por algunas páginas**
3. **Ve a Google Analytics:**
   - Reportes > Tiempo real
   - Deberías verte a ti mismo como visitante
4. **Haz clic en un producto y luego en WhatsApp**
5. **Ve a:** Reportes > Tiempo real > Eventos
   - Deberías ver eventos como "view_item", "contact" (WhatsApp), etc.

### Extensión útil para desarrollo:
- Instala la extensión **"Google Analytics Debugger"** en Chrome
- Te mostrará en consola todos los eventos que se están enviando

---

## 🎨 Personalización adicional (Opcional)

Si quieres trackear eventos personalizados adicionales, puedes usar:

```javascript
import { trackGAEvent } from '../components/GoogleAnalytics';

// Ejemplo: Trackear un evento personalizado
trackGAEvent('button_click', {
  button_name: 'descargar_catalogo',
  page: window.location.pathname
});
```

---

## 🐛 Solución de problemas

### "La recogida de datos no está activada" en Google Analytics

**Solución:**
1. Espera 24-48 horas después de la implementación
2. Verifica que el código esté en producción (no solo en desarrollo)
3. Asegúrate de que el ID `G-M2BDLSJF39` esté correcto
4. Usa la herramienta "Preview" de Google Analytics para verificar en tiempo real

### No veo datos en Vercel Analytics

**Solución:**
1. Verifica que hayas hecho deploy a Vercel
2. Asegúrate de que `@vercel/analytics` esté instalado
3. Los datos pueden tardar algunos minutos en aparecer

---

## 📊 Métricas clave a revisar semanalmente

1. **Usuarios únicos por día** - ¿Cuántas personas nuevas vienen?
2. **Páginas más visitadas** - ¿Qué productos/páginas interesan más?
3. **Eventos de WhatsApp** - ¿Cuántos clics en contacto?
4. **Productos más vistos** - ¿Qué está generando más interés?
5. **Dispositivos** - ¿Vienen más desde móvil o desktop?
6. **Origen del tráfico** - ¿De dónde vienen? (Google, Facebook, directo, etc.)

---

## 🚀 Próximos pasos recomendados

1. **Configurar objetivos en GA4:**
   - Ir a: Admin > Eventos
   - Marcar "contact" (WhatsApp) como evento de conversión
   - Marcar "purchase" como evento de conversión

2. **Configurar alertas:**
   - En GA4 puedes configurar alertas si el tráfico cae o sube drásticamente

3. **Crear reportes personalizados:**
   - Reportes > Exploraciones
   - Crear reportes específicos para tu negocio

---

## 📞 Soporte

Si tienes dudas sobre:
- **Google Analytics:** Consulta la documentación oficial: https://support.google.com/analytics
- **Vercel Analytics:** Consulta: https://vercel.com/docs/analytics

---

**✅ ¡Todo está listo! Tu sitio ahora está completamente monitoreado.**

Los datos comenzarán a aparecer en las próximas 24-48 horas. Puedes verificar en tiempo real usando la pestaña "Tiempo real" de Google Analytics.


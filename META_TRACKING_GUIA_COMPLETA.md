# 📊 Guía Completa: Tracking de Meta (Facebook Pixel + Conversions API)

Esta guía te explica cómo configurar y usar el sistema completo de tracking de Meta para tu ecommerce Zenn.

## 🎯 ¿Qué es el Tracking de Meta?

Meta ofrece **dos formas** de trackear eventos en tu sitio web:

### 1. **Meta Pixel (Client-Side)** ✅ Ya implementado
- Se ejecuta en el navegador del usuario
- Rastrea eventos como PageView, AddToCart, Purchase, etc.
- **Limitación**: Puede ser bloqueado por adblockers o navegadores con privacidad estricta

### 2. **Meta Conversions API (Server-Side)** ✅ NUEVO - Implementado
- Se ejecuta desde tu servidor
- Envía eventos directamente a Meta sin pasar por el navegador
- **Ventajas**: 
  - No puede ser bloqueado
  - Mejor precisión de datos
  - Deduplicación de eventos (evita contar dos veces)
  - Mejor matching de usuarios

## 🔧 Configuración Inicial

### Paso 1: Obtener tus credenciales de Meta

1. **Ve a Meta Events Manager**: https://business.facebook.com/events_manager2
2. **Selecciona tu Pixel** (ID: `1535652171192853`)
3. **Ve a Settings → Conversions API**
4. **Genera un Access Token**:
   - Click en "Generate Access Token"
   - Copia el token generado (guárdalo bien, solo se muestra una vez)

### Paso 2: Configurar variables de entorno

Agrega estas variables a tu archivo `.env` del backend:

```env
# Meta Pixel ID (nuevo Pixel ID)
META_PIXEL_ID=1535652171192853

# Meta Conversions API Access Token (NUEVO - obtener desde Events Manager)
META_ACCESS_TOKEN=tu_access_token_aqui

# Versión de la API (opcional, default: v21.0)
META_API_VERSION=v21.0
```

### Paso 3: Configurar en Vercel (si usas Vercel)

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las mismas variables:
   - `META_PIXEL_ID`
   - `META_ACCESS_TOKEN`
   - `META_API_VERSION` (opcional)

## 📋 Eventos que se Trackean Automáticamente

### ✅ Eventos Implementados:

1. **PageView** - Cada vez que un usuario visita una página
2. **ViewContent** - Cuando un usuario ve un producto
3. **AddToCart** - Cuando se agrega un producto al carrito
4. **InitiateCheckout** - Cuando se inicia el proceso de pago
5. **Purchase** - Cuando se completa una compra (✅ con deduplicación)
6. **Lead** - Cuando un usuario genera un lead (descarga PDF, etc.)
7. **Contact** - Cuando un usuario hace contacto por WhatsApp

### 🔄 Deduplicación de Eventos

El sistema usa **event_id** para evitar contar eventos duplicados:
- El frontend genera un `event_id` único
- El mismo `event_id` se envía tanto al Pixel (client-side) como a la API (server-side)
- Meta automáticamente deduplica eventos con el mismo `event_id`

## 🚀 Cómo Funciona

### Flujo de una Compra:

1. **Usuario completa el pago** → Frontend trackea con Pixel
2. **Backend recibe confirmación de Bancard** → Trackea con Conversions API
3. **Meta recibe ambos eventos** → Deduplica usando `event_id`
4. **Resultado**: Un solo evento de Purchase en tus reportes

### Código de Ejemplo:

```javascript
// Frontend (automático en PaymentSuccess.js)
fbq('track', 'Purchase', {
  content_ids: ['product1', 'product2'],
  value: 500000,
  currency: 'PYG',
  transaction_id: '12345',
  eventID: 'purchase_12345_1234567890' // ✅ Para deduplicación
});

// Backend (automático en bancardController.js)
await metaConversionsService.trackPurchase({
  transactionId: '12345',
  value: 500000,
  currency: 'PYG',
  contentIds: ['product1', 'product2'],
  eventId: 'purchase_12345_1234567890' // ✅ Mismo event_id
});
```

## 📡 Endpoints Disponibles

### 1. Trackear Evento Genérico

**POST** `/api/meta/track-event`

```json
{
  "eventName": "ViewContent",
  "eventData": {
    "value": 500000,
    "currency": "PYG",
    "content_ids": ["product1"],
    "content_name": "Notebook Gamer",
    "content_category": "informatica"
  },
  "userData": {
    "email": "usuario@example.com",
    "phone": "+595981234567"
  },
  "eventId": "viewcontent_1234567890",
  "eventSourceUrl": "https://www.zenn.com.py/producto/notebook"
}
```

### 2. Trackear Compra

**POST** `/api/meta/track-purchase`

```json
{
  "transactionId": "12345",
  "value": 500000,
  "currency": "PYG",
  "contentIds": ["product1", "product2"],
  "userData": {
    "email": "usuario@example.com",
    "phone": "+595981234567"
  },
  "eventId": "purchase_12345_1234567890",
  "eventSourceUrl": "https://www.zenn.com.py/pago-exitoso"
}
```

## 🔍 Verificar que Funciona

### 1. Verificar en Meta Events Manager

1. Ve a **Events Manager** → **Test Events**
2. Activa el modo de prueba
3. Realiza una acción en tu sitio (ej: agregar al carrito)
4. Deberías ver el evento aparecer en tiempo real

### 2. Verificar en los Logs del Backend

Busca estos mensajes en los logs:

```
✅ Meta Conversions API: Evento Purchase enviado correctamente
✅ Meta Conversions API: Compra trackeada correctamente
```

### 3. Verificar en el Navegador

Abre la consola del navegador y busca:

```javascript
fbq('track', 'Purchase', {...}) // Debería ejecutarse
```

## 🛠️ Troubleshooting

### Problema: No se trackean eventos

**Solución:**
1. Verifica que `META_PIXEL_ID` y `META_ACCESS_TOKEN` estén configurados
2. Verifica que el Access Token tenga permisos correctos
3. Revisa los logs del backend para errores

### Problema: Eventos duplicados

**Solución:**
- Asegúrate de que el `event_id` sea el mismo en client-side y server-side
- Verifica que el formato del `event_id` sea consistente

### Problema: "API no configurada"

**Solución:**
- Verifica las variables de entorno
- Reinicia el servidor después de agregar las variables

## 📊 Mejores Prácticas

1. **Siempre usa event_id** para eventos importantes (Purchase, Lead)
2. **Envía datos del usuario** cuando sea posible (email, phone) para mejor matching
3. **Mantén consistencia** en los IDs de productos (usa `generateCleanId`)
4. **No trackees eventos sensibles** sin consentimiento del usuario
5. **Monitorea los logs** regularmente para detectar problemas

## 🔐 Privacidad y Seguridad

- Los datos del usuario se **hashean con SHA256** antes de enviarse a Meta
- Solo se envían datos necesarios para el tracking
- Cumple con GDPR y políticas de privacidad

## 📚 Recursos Adicionales

- [Meta Conversions API Documentation](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel)
- [Event Deduplication Guide](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)

## ✅ Checklist de Configuración

- [ ] Obtener Access Token de Meta Events Manager
- [ ] Agregar variables de entorno al backend
- [ ] Agregar variables de entorno a Vercel (si aplica)
- [ ] Verificar que los eventos se trackean en Events Manager
- [ ] Verificar deduplicación de eventos
- [ ] Revisar logs del backend para confirmar tracking

## 🎉 ¡Listo!

Una vez configurado, tu ecommerce tendrá tracking completo de Meta con:
- ✅ Meta Pixel (client-side)
- ✅ Meta Conversions API (server-side)
- ✅ Deduplicación automática
- ✅ Mejor precisión de datos
- ✅ Tracking que no puede ser bloqueado

---

**¿Necesitas ayuda?** Revisa los logs del backend o contacta al equipo de desarrollo.


# 🧪 Guía: Probar Meta Conversions API con Test Event Code

Esta guía te explica cómo probar que tu servidor está enviando eventos correctamente a Meta usando el código de prueba.

## 📋 Requisitos Previos

1. ✅ Meta Pixel configurado (ID: `1535652171192853`)
2. ✅ Access Token de Meta Conversions API configurado
3. ✅ Variables de entorno configuradas en el backend

## 🎯 Paso 1: Obtener el Test Event Code

1. Ve a **Meta Events Manager**: https://business.facebook.com/events_manager2
2. Selecciona tu **Pixel** (ID: `1535652171192853`)
3. Ve a **Test Events** (en el menú lateral)
4. Click en **"Probar eventos"** o **"Test Events"**
5. Copia el **test_event_code** que aparece (ej: `TEST24448`)

⚠️ **IMPORTANTE**: Mantén la página "Probar eventos" abierta durante toda la prueba.

## 🚀 Método 1: Usar el Endpoint de Prueba (Recomendado)

### Opción A: Usar cURL

```bash
curl -X POST https://tu-backend.com/api/meta/test-event \
  -H "Content-Type: application/json" \
  -d '{
    "testEventCode": "TEST24448",
    "eventName": "PageView",
    "eventData": {
      "value": 0,
      "currency": "PYG"
    }
  }'
```

### Opción B: Usar Postman o Insomnia

1. **URL**: `POST https://tu-backend.com/api/meta/test-event`
2. **Headers**:
   ```
   Content-Type: application/json
   ```
3. **Body** (JSON):
   ```json
   {
     "testEventCode": "TEST24448",
     "eventName": "PageView",
     "eventData": {
       "value": 0,
       "currency": "PYG"
     }
   }
   ```

### Opción C: Usar el Frontend (JavaScript)

```javascript
fetch('https://tu-backend.com/api/meta/test-event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testEventCode: 'TEST24448',
    eventName: 'PageView',
    eventData: {
      value: 0,
      currency: 'PYG'
    }
  })
})
.then(response => response.json())
.then(data => console.log('Resultado:', data));
```

## 🛠️ Método 2: Usar el Script de Prueba

### Paso 1: Configurar variable de entorno (opcional)

Agrega a tu `.env`:
```env
META_TEST_EVENT_CODE=TEST24448
```

### Paso 2: Ejecutar el script

```bash
cd backend
node scripts/test-meta-conversions-api.js
```

El script probará automáticamente varios tipos de eventos:
- PageView
- ViewContent
- AddToCart
- Purchase

## 📡 Método 3: Usar Graph API Explorer (Avanzado)

### Paso 1: Abrir Graph API Explorer

1. Ve a: https://developers.facebook.com/tools/explorer/
2. Selecciona tu app de Meta
3. Genera un Access Token con permisos: `ads_management`, `business_management`

### Paso 2: Configurar la petición

1. **Método**: `POST`
2. **Endpoint**: `/{pixel-id}/events`
   - Reemplaza `{pixel-id}` con tu Pixel ID: `1535652171192853`
   - URL completa: `https://graph.facebook.com/v21.0/1535652171192853/events`

3. **Query Parameters**:
   ```
   access_token: [tu-access-token]
   test_event_code: TEST24448
   ```

4. **Body** (JSON):
   ```json
   {
     "data": [
       {
         "event_name": "PageView",
         "event_time": 1234567890,
         "event_id": "test_1234567890",
         "event_source_url": "https://www.zenn.com.py",
         "action_source": "website",
         "user_data": {
           "client_ip_address": "127.0.0.1",
           "client_user_agent": "Mozilla/5.0"
         },
         "custom_data": {
           "currency": "PYG",
           "value": 0
         }
       }
     ]
   }
   ```

5. **Click en "Submit"**

### Paso 3: Verificar en Events Manager

1. Ve a **Meta Events Manager → Test Events**
2. Deberías ver el evento aparecer en tiempo real
3. Si aparece, tu configuración está correcta ✅

## ✅ Verificar que Funciona

### Señales de Éxito:

1. **En el Endpoint/Script**:
   ```
   ✅ Evento de prueba enviado correctamente
   events_received: 1
   ```

2. **En Meta Events Manager**:
   - El evento aparece en la lista de "Test Events"
   - Muestra el nombre del evento (PageView, Purchase, etc.)
   - Muestra la hora del evento
   - Estado: "Received" o "Processed"

3. **En los Logs del Backend**:
   ```
   ✅ Meta Conversions API: Evento PageView enviado correctamente
   ```

## ❌ Troubleshooting

### Problema: "testEventCode es requerido"

**Solución**: Asegúrate de incluir el `testEventCode` en el body de la petición.

### Problema: "API no configurada"

**Solución**: 
1. Verifica que `META_PIXEL_ID` y `META_ACCESS_TOKEN` estén en `.env`
2. Reinicia el servidor después de agregar las variables

### Problema: "Invalid access token"

**Solución**:
1. Verifica que el Access Token sea válido
2. Regenera el Access Token desde Events Manager
3. Asegúrate de que tenga los permisos correctos

### Problema: Evento no aparece en Test Events

**Solución**:
1. Asegúrate de que la página "Probar eventos" esté abierta
2. Verifica que el `test_event_code` sea correcto
3. Espera unos segundos (puede haber delay)
4. Revisa los logs del backend para errores

### Problema: "Invalid test_event_code"

**Solución**:
1. Obtén un nuevo `test_event_code` desde Events Manager
2. Los códigos de prueba expiran después de un tiempo
3. Asegúrate de copiar el código completo

## 📝 Ejemplo Completo de Prueba

### 1. Probar PageView

```bash
curl -X POST http://localhost:8080/api/meta/test-event \
  -H "Content-Type: application/json" \
  -d '{
    "testEventCode": "TEST24448",
    "eventName": "PageView"
  }'
```

### 2. Probar Purchase

```bash
curl -X POST http://localhost:8080/api/meta/test-event \
  -H "Content-Type: application/json" \
  -d '{
    "testEventCode": "TEST24448",
    "eventName": "Purchase",
    "eventData": {
      "value": 1000000,
      "currency": "PYG",
      "content_ids": ["product1", "product2"],
      "transaction_id": "test_12345"
    },
    "userData": {
      "email": "test@example.com",
      "phone": "+595981234567"
    }
  }'
```

## 🎉 Siguiente Paso

Una vez que veas los eventos aparecer en **Test Events**, tu configuración está correcta y puedes:

1. ✅ Remover el `test_event_code` de las peticiones de producción
2. ✅ Los eventos reales se trackearán automáticamente
3. ✅ Verificar los eventos en **Events Manager → Overview** (sin test mode)

---

**¿Necesitas ayuda?** Revisa los logs del backend o contacta al equipo de desarrollo.


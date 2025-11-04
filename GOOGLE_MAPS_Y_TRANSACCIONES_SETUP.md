# 🗺️ Configuración Google Maps + Panel de Transacciones

## 🎯 Problema 1: Google Maps API Key

### ✅ Solución: Obtener y Configurar API Key

#### Paso 1: Obtener API Key de Google Cloud Console

1. **Ve a:** https://console.cloud.google.com/
2. **Crea o selecciona un proyecto:**
   - Click en el selector de proyectos (arriba)
   - Click "Nuevo Proyecto"
   - Nombre: "Zenn Electronica Maps"
   - Click "Crear"

3. **Habilita las APIs necesarias:**
   ```
   - Ve a: APIs y servicios → Biblioteca
   - Busca y habilita estas 3 APIs:
     ✅ Maps JavaScript API
     ✅ Geocoding API
     ✅ Places API
   ```

4. **Crea credenciales:**
   ```
   - Ve a: APIs y servicios → Credenciales
   - Click "Crear credenciales"
   - Selecciona "Clave de API"
   - Copia la clave generada
   ```

5. **Restringir la API Key (Importante):**
   ```
   - Click en la API Key creada
   - En "Restricciones de aplicación":
     - Selecciona "Referentes HTTP (sitios web)"
     - Agrega:
       • http://localhost:3000/*
       • https://zennelectronica.vercel.app/*
       • https://zennelectronica02.vercel.app/*
   
   - En "Restricciones de API":
     - Selecciona "Restringir clave"
     - Marca solo:
       ✅ Maps JavaScript API
       ✅ Geocoding API
       ✅ Places API
   
   - Click "Guardar"
   ```

#### Paso 2: Agregar a Vercel

```bash
# En Vercel → Settings → Environment Variables:

REACT_APP_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
```

Ejemplo:
```
Name: REACT_APP_GOOGLE_MAPS_API_KEY
Value: AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Environments: Production, Preview, Development
```

---

## 🎯 Problema 2: Error 401 en Producción

### Causa:
Las cookies no se están enviando correctamente en Vercel (producción)

### ✅ Solución: Configurar SameSite y Secure

Ve al archivo backend que configura las cookies y verifica que tenga:

```javascript
// En tu userSignin o donde setees cookies:
res.cookie('token', token, {
  httpOnly: true,
  secure: true,              // ✅ IMPORTANTE para HTTPS
  sameSite: 'none',          // ✅ IMPORTANTE para Vercel
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
});
```

#### Variables ENV Adicionales Necesarias:

```bash
# En Vercel Environment Variables:

COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

---

## 🎯 Problema 3: Panel de Transacciones

### Archivo: `frontend/src/pages/BancardTransactions.js`

El componente ya existe pero necesita la ruta correcta.

#### Verificar Rutas en Frontend:

```javascript
// frontend/src/routes/index.js debe tener:

import BancardTransactions from '../pages/BancardTransactions';

{
  path: 'panel-admin/transacciones-bancard',
  element: <BancardTransactions />
}
```

---

## 📧 Sistema de Emails para Estados del Pedido

### Estados Disponibles:

| Estado | Email que se Envía | Cuándo |
|--------|-------------------|--------|
| `payment_confirmed` | ✅ Pago confirmado | Después del pago |
| `preparing_order` | 📦 Preparando pedido | Admin cambia estado |
| `in_transit` | 🚚 Pedido en camino | Admin cambia estado |
| `delivered` | ✅ Pedido entregado | Admin confirma entrega |
| `problem` | ⚠️ Problema con pedido | Admin reporta problema |

### Cómo Actualizar Estados (Admin):

```javascript
// En el panel de admin:
PUT /api/bancard/transactions/:transactionId/delivery-status

Body:
{
  "delivery_status": "preparing_order",
  "delivery_notes": "Pedido siendo empacado",
  "estimated_delivery_date": "2025-11-05",
  "tracking_number": "TRACK123456",
  "notify_customer": true  // ✅ Envía email automáticamente
}

// Respuesta:
{
  "success": true,
  "message": "Estado actualizado a: preparing_order (Email enviado)",
  "data": {
    "email_notifications": {
      "customer_email": {
        "success": true,
        "recipient": "cliente@email.com"
      }
    }
  }
}
```

---

## 🔧 Configuración Completa ENV para Vercel

### Variables que DEBES tener:

```bash
# ============================================
# 🗺️ GOOGLE MAPS (NUEVO)
# ============================================

REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# 🏦 BANCARD
# ============================================

BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
BANCARD_ENVIRONMENT=staging
BANCARD_CONFIRMATION_URL=https://zennelectronica.vercel.app/api/bancard/confirm

# ============================================
# 🌐 URLS
# ============================================

FRONTEND_URL=https://zennelectronica02.vercel.app
BACKEND_URL=https://zennelectronica.vercel.app
REACT_APP_BACKEND_URL=https://zennelectronica.vercel.app

# ============================================
# 🍪 COOKIES (IMPORTANTE PARA PRODUCCIÓN)
# ============================================

COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# ============================================
# 📧 EMAIL
# ============================================

EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=tu-contraseña-app

# ============================================
# 🔐 SEGURIDAD
# ============================================

TOKEN_SECRET_KEY=tu-secret-key
MONGODB_URI=tu-mongodb-uri
NODE_ENV=production

# ============================================
# 🔥 FIREBASE (SI LO USAS)
# ============================================

REACT_APP_FIREBASE_API_KEY=tu-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu-proyecto-id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 🧪 Cómo Probar Google Maps

### Después de configurar `REACT_APP_GOOGLE_MAPS_API_KEY`:

1. **Redesplegar en Vercel**
2. **Ir a:** https://zennelectronica02.vercel.app/carrito
3. **Agregar producto**
4. **Click "Finalizar Compra"**
5. **Scroll hasta "Ubicación en el mapa"**
6. **Click "Marcar ubicación"**
7. **Debe aparecer el mapa de Google** ✅

Si no aparece:
- Abre Console (F12)
- Busca errores de Google Maps
- Verifica que la API Key sea correcta

---

## 🔧 Arreglar Errores 401 en Producción

### El problema:
Las cookies no se envían correctamente entre dominios en Vercel

### Solución:

Necesito modificar tu archivo de configuración de cookies. Dime:

**¿Dónde configuras las cookies en el login?**
```
Probablemente en:
- backend/controller/user/userSignin.js
```

Debe tener algo así:
```javascript
res.cookie('token', tokenData, {
  httpOnly: true,
  secure: true,              // ✅ Debe ser true
  sameSite: 'none',          // ✅ Debe ser 'none' para Vercel
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
});
```

---

## 📊 Panel de Transacciones - Rollback y Estados

### Ruta debe ser:

```javascript
// frontend/src/routes/index.js

{
  path: 'panel-admin',
  element: <AdminPanel />,
  children: [
    {
      path: 'transacciones-bancard',
      element: <BancardTransactions />
    }
  ]
}
```

### Funcionalidades del Panel:

1. **Ver transacciones** ✅
2. **Hacer rollback** ✅
3. **Actualizar estado de entrega:**
   - payment_confirmed → Email: "Pago confirmado"
   - preparing_order → Email: "Preparando pedido"
   - in_transit → Email: "Pedido en camino"
   - delivered → Email: "Pedido entregado"
   - problem → Email: "Problema con pedido"

---

## 🚀 Pasos Inmediatos

### 1. Configurar Google Maps (10 min):

```bash
1. Ir a Google Cloud Console
2. Crear proyecto
3. Habilitar APIs (Maps JS, Geocoding, Places)
4. Crear API Key
5. Restringir dominios
6. Copiar API Key
7. Agregar a Vercel: REACT_APP_GOOGLE_MAPS_API_KEY
8. Redesplegar
```

### 2. Arreglar Autenticación (5 min):

Dime si quieres que revise y actualice tu archivo de signin para cookies correctas en Vercel.

### 3. Verificar Panel de Transacciones:

```bash
# Después de autenticarte como ADMIN:
https://zennelectronica02.vercel.app/panel-admin/transacciones-bancard

# Debe mostrar:
- Lista de transacciones
- Botones de rollback
- Botones de actualizar estado
- Filtros
```

---

## ✅ Resumen de Variables ENV Necesarias

```bash
# ⚠️ FALTA:
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxx...

# ⚠️ VERIFICAR:
COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# ✅ YA TIENES:
BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
```

---

**¿Quieres que te ayude a:**
1. ✅ Obtener paso a paso la Google Maps API Key
2. ✅ Arreglar el problema de cookies/autenticación 401
3. ✅ Verificar que el panel de transacciones cargue

**Dime cuál quieres que arregle primero y procedo inmediatamente.**

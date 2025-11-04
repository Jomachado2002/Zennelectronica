# 🚨 ARREGLO URGENTE - Problemas en Producción

## ❌ Problemas Identificados

1. **Google Maps API Key falta en BACKEND**
2. **Error 401 al catastrar tarjetas** (autenticación)
3. **Error 500 al listar tarjetas**
4. **Invitados no pueden guardar ubicación**

---

## ✅ SOLUCIÓN 1: Google Maps API Key

### El Error:
```
Status is REQUEST_DENIED. You must use an API key to authenticate each request
```

### Causa:
Tu backend usa `process.env.GOOGLE_MAPS_API_KEY` (línea 8 de locationController.js)
pero **NO está configurada** en Vercel.

### ✅ Solución Inmediata:

**Debes agregar DOS variables en Vercel** (una para frontend, otra para backend):

```bash
# Para FRONTEND (ya sabes esta):
REACT_APP_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI

# Para BACKEND (FALTA ESTA):
GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
```

**⚠️ IMPORTANTE:** Es la MISMA clave, pero con dos nombres diferentes:
- Frontend la lee como: `REACT_APP_GOOGLE_MAPS_API_KEY`
- Backend la lee como: `GOOGLE_MAPS_API_KEY`

---

## ✅ SOLUCIÓN 2: Error 401 al Catastrar Tarjeta

### El Error:
```
POST /api/bancard/tarjetas 401 (Unauthorized)
Debes iniciar sesión para registrar tarjetas
```

### Causa:
El middleware `authToken` no encuentra el token en producción porque las cookies no se envían correctamente entre subdominios de Vercel.

### ✅ Solución A: Configurar Variables de Cookies

```bash
# Agregar en Vercel Environment Variables:

COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

### ✅ Solución B: Modificar Frontend

Voy a modificar `CardRegistrationModal.js` para incluir headers adicionales:

```javascript
// Agregar headers de autenticación adicionales
headers: { 
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'  // Para CORS
}
```

---

## ✅ SOLUCIÓN 3: Error 500 al Listar Tarjetas

### El Error:
```
GET /api/bancard/tarjetas/426632 500 (Internal Server Error)
```

### Posibles Causas:
1. Bancard responde con error
2. Las credenciales son inválidas
3. El user_id no está registrado en Bancard

### ✅ Verificar Credenciales:

```bash
# Abre en navegador:
https://zennelectronica.vercel.app/api/bancard/config-check

# Debe mostrar:
{
  "success": true,
  "data": {
    "isValid": true,
    "hasPublicKey": true,
    "hasPrivateKey": true,
    "publicKeyLength": 32,
    "privateKeyLength": 40
  }
}
```

Si muestra `isValid: false`, tus claves están mal configuradas.

---

## ✅ SOLUCIÓN 4: Invitados Guardar Ubicación

### El Error:
```
400 Bad Request
"Los usuarios invitados no pueden guardar ubicación"
```

### Causa:
El código en `locationController.js` línea 155 bloquea a invitados.

### ✅ Fix: Permitir que Invitados Guarden en Checkout

Modificaré el controlador para que invitados puedan guardar ubicación temporal para el checkout.

---

## 🔧 Variables ENV COMPLETAS (Copy-Paste)

```bash
# ============================================
# 🗺️ GOOGLE MAPS (CRITICO - FALTAN ESTAS)
# ============================================

REACT_APP_GOOGLE_MAPS_API_KEY=OBTENER_DE_GOOGLE_CLOUD
GOOGLE_MAPS_API_KEY=MISMA_CLAVE_QUE_ARRIBA

# ============================================
# 🏦 BANCARD (TUS CLAVES)
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
# 🍪 COOKIES (CRITICO PARA ERROR 401)
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
# 🔐 OTRAS
# ============================================

TOKEN_SECRET_KEY=tu-secret-key
MONGODB_URI=tu-mongodb-uri
NODE_ENV=production
```

---

## 🚀 PASOS INMEDIATOS (15 minutos)

### 1. Obtener Google Maps API Key (10 min):

```bash
1. Ve a: https://console.cloud.google.com/
2. Crear proyecto: "Zenn Maps"
3. Habilitar APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Crear Credenciales → API Key
5. COPIAR la clave
   Ejemplo: AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Agregar Variables en Vercel (3 min):

```bash
# CRITICAS - Agregar estas 5:

REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxx... (tu clave)
GOOGLE_MAPS_API_KEY=AIzaSyBxxxxx... (misma clave)
COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

### 3. Redesplegar (2 min):

```bash
Vercel → Deployments → Latest → Redeploy
```

---

## 🧪 Probar Después de Configurar

### Test 1: Google Maps

```bash
1. https://zennelectronica02.vercel.app/finalizar-compra
2. Scroll a "Ubicación en el mapa"
3. Click "Marcar ubicación"
4. ✅ Debe cargar el mapa
5. Click en el mapa
6. ✅ Pin rojo aparece
7. Click "Confirmar ubicación"
8. ✅ Ubicación guardada
```

### Test 2: Catastro de Tarjeta

```bash
1. Inicia sesión: https://zennelectronica02.vercel.app/iniciar-sesion
2. Mi Perfil → Tarjetas
3. Click "Agregar Tarjeta"
4. ✅ Modal se abre
5. Iframe carga
6. Completar datos (cédula 9661000)
7. ✅ Tarjeta guardada SIN error 401
```

### Test 3: Ver Compras del Usuario

```bash
1. Mi Perfil → Compras
2. ✅ Debe mostrar historial de compras
3. Click en una compra
4. ✅ Ver estado del pedido:
   - "Pago confirmado"
   - "Preparando pedido"
   - "En camino"
   - "Entregado"
```

---

## 📊 Panel de Admin - Gestión de Pedidos

### Funcionalidades Disponibles:

```
https://zennelectronica02.vercel.app/panel-admin/transacciones-bancard
```

Como ADMIN puedes:

1. **Ver todas las transacciones**
2. **Hacer rollback** (mismo día)
3. **Actualizar estado del pedido:**
   - payment_confirmed → Cliente recibe: "✅ Pago confirmado"
   - preparing_order → Cliente recibe: "📦 Preparando tu pedido"
   - in_transit → Cliente recibe: "🚚 Pedido en camino"  
   - delivered → Cliente recibe: "✅ Pedido entregado"
   - problem → Cliente recibe: "⚠️ Problema con pedido"

4. **Emails se envían automáticamente** al cambiar estado

---

## 🔍 Verificar Autenticación

### Si sigues viendo 401:

```javascript
// Abre Console (F12) en el navegador y ejecuta:
console.log('Token:', document.cookie);

// Debe mostrar:
// "token=eyJhbGciOiJIUzI1NiIs..."

// Si NO aparece:
// 1. Cierra sesión
// 2. Borra cookies (Ctrl+Shift+Delete)
// 3. Inicia sesión nuevamente
// 4. Verifica de nuevo
```

---

## 📧 Sistema de Emails

### Configurar Email (5 min):

#### Usando Outlook:

```bash
1. Ve a: https://account.microsoft.com/security
2. Seguridad → Contraseñas de aplicación
3. Crear nueva: "Zenn Backend"
4. COPIAR la contraseña generada

Luego en Vercel:
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=la-contraseña-generada
```

#### Usando Gmail:

```bash
1. Activa verificación en 2 pasos en Gmail
2. Ve a: https://myaccount.google.com/apppasswords
3. Genera contraseña para "Correo"
4. COPIAR los 16 caracteres

Luego en Vercel:
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=los-16-caracteres
```

---

## ✅ Checklist de Variables

Marca las que YA tienes configuradas en Vercel:

- [ ] REACT_APP_GOOGLE_MAPS_API_KEY (Frontend)
- [ ] GOOGLE_MAPS_API_KEY (Backend)
- [ ] BANCARD_PUBLIC_KEY
- [ ] BANCARD_PRIVATE_KEY
- [ ] BANCARD_ENVIRONMENT
- [ ] BANCARD_CONFIRMATION_URL
- [ ] FRONTEND_URL
- [ ] BACKEND_URL
- [ ] REACT_APP_BACKEND_URL
- [ ] COOKIE_DOMAIN
- [ ] COOKIE_SECURE
- [ ] COOKIE_SAME_SITE
- [ ] EMAIL_USER
- [ ] EMAIL_PASS
- [ ] TOKEN_SECRET_KEY
- [ ] MONGODB_URI
- [ ] NODE_ENV

---

## 🎯 Resumen Ejecutivo

| Problema | Variable Faltante | Acción |
|----------|-------------------|--------|
| Maps no carga | GOOGLE_MAPS_API_KEY | Obtener de Google Cloud |
| Error 401 catastro | COOKIE_* variables | Agregar 3 variables |
| Emails no envían | EMAIL_USER, EMAIL_PASS | Generar contraseña app |
| Error 500 tarjetas | Verificar claves Bancard | Revisar config-check |

---

## 🚀 Próximo Paso AHORA:

**Opción A:** Dame 10 minutos y te guío pantalla por pantalla para obtener Google Maps API Key

**Opción B:** Si ya tienes la clave, solo agrégala a Vercel:
```
REACT_APP_GOOGLE_MAPS_API_KEY=tu-clave
GOOGLE_MAPS_API_KEY=tu-clave
```

**¿Cuál prefieres?** Dime y lo hacemos inmediatamente.

---

**Estado:** ⚠️ Requiere acción urgente  
**Tiempo estimado:** 15 minutos para arreglar todo  
**Impacto:** Alto - Afecta checkout y gestión de pedidos


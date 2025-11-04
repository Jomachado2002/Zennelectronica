# 🔑 VARIABLES ENV COMPLETAS PARA VERCEL

## ⚠️ CRÍTICO: Estas Son TODAS las Variables Necesarias

Copia y pega CADA UNA en: **Vercel → Settings → Environment Variables**

---

## 📋 Variables Obligatorias

```bash
# ============================================
# 🗺️ GOOGLE MAPS (OBTENER DE GOOGLE CLOUD)
# ============================================

# Para Frontend (React):
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Para Backend (Node Geocoder):
GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ⚠️ USA LA MISMA CLAVE PARA AMBAS

# ============================================
# 🏦 BANCARD (TUS CREDENCIALES)
# ============================================

BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
BANCARD_ENVIRONMENT=staging
BANCARD_CONFIRMATION_URL=https://zennelectronica.vercel.app/api/bancard/confirm

# ============================================
# 🌐 URLS (ACTUALIZAR CON TUS DOMINIOS)
# ============================================

FRONTEND_URL=https://zennelectronica02.vercel.app
BACKEND_URL=https://zennelectronica.vercel.app
REACT_APP_BACKEND_URL=https://zennelectronica.vercel.app

# ============================================
# 🍪 COOKIES (CRÍTICO PARA PRODUCCIÓN)
# ============================================

COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# ============================================
# 📧 EMAIL (PARA NOTIFICACIONES)
# ============================================

EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=tu-contraseña-app-outlook

# ============================================
# 🔐 SEGURIDAD Y BASE DE DATOS
# ============================================

TOKEN_SECRET_KEY=tu-secret-key-actual
MONGODB_URI=tu-mongodb-uri-actual
NODE_ENV=production
```

---

## 🎯 Variables por Problema

### Para arreglar Google Maps:
```bash
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyB...
GOOGLE_MAPS_API_KEY=AIzaSyB...  (misma clave)
```

### Para arreglar Error 401:
```bash
COOKIE_DOMAIN=.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

### Para emails automáticos:
```bash
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=contraseña-app
```

---

## 🗺️ Cómo Obtener Google Maps API Key

### Paso 1: Google Cloud Console
```
https://console.cloud.google.com/
```

### Paso 2: Crear Proyecto
```
1. Click selector de proyectos (arriba izquierda)
2. Click "Nuevo Proyecto"
3. Nombre: "Zenn Maps"
4. Click "Crear"
```

### Paso 3: Habilitar APIs (MUY IMPORTANTE)
```
1. Menu ≡ → APIs y servicios → Biblioteca
2. Buscar "Maps JavaScript API" → HABILITAR
3. Buscar "Geocoding API" → HABILITAR
4. Buscar "Places API" → HABILITAR
```

### Paso 4: Crear API Key
```
1. APIs y servicios → Credenciales
2. + CREAR CREDENCIALES
3. Clave de API
4. COPIAR la clave (ej: AIzaSyBxxxxxxxxxxxxxxxxx)
```

### Paso 5: Restringir (Seguridad)
```
1. Click en la clave
2. Restricciones de aplicación:
   → Referentes HTTP
   → Agregar:
     • http://localhost:3000/*
     • https://zennelectronica.vercel.app/*
     • https://zennelectronica02.vercel.app/*
     • https://*.vercel.app/*

3. Restricciones de API:
   → Restringir clave
   → Marcar:
     ✅ Maps JavaScript API
     ✅ Geocoding API
     ✅ Places API

4. GUARDAR
```

### Paso 6: Agregar a Vercel
```
Name: REACT_APP_GOOGLE_MAPS_API_KEY
Value: AIzaSyBxxxxxxxxxxxxx (tu clave)
Environments: ✅ Production ✅ Preview ✅ Development

Name: GOOGLE_MAPS_API_KEY  
Value: AIzaSyBxxxxxxxxxxxxx (MISMA clave)
Environments: ✅ Production ✅ Preview ✅ Development
```

---

## 📧 Cómo Configurar Email

### Opción 1: Outlook/Hotmail

```bash
1. https://account.microsoft.com/security
2. Opciones de seguridad avanzadas
3. Contraseñas de aplicación
4. Crear nueva: "Zenn Backend"
5. COPIAR la contraseña (ej: abcd efgh ijkl mnop)

Agregar a Vercel:
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=abcdefghijklmnop (sin espacios)
```

### Opción 2: Gmail

```bash
1. Activar verificación en 2 pasos
2. https://myaccount.google.com/apppasswords
3. App: Correo
4. Dispositivo: Otro
5. COPIAR los 16 caracteres

Agregar a Vercel:
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=los16caracteres
```

---

## ✅ Cambios en el Código (Ya Aplicados)

### 1. locationController.js - ARREGLADO

✅ **Ahora permite a invitados guardar ubicación**
✅ **Maneja cuando no hay API Key de Google**
✅ **No falla si geocoding no está disponible**

### Cambios:
- Invitados guardan en `req.session.guest_location`
- Si no hay GOOGLE_MAPS_API_KEY, devuelve coordenadas básicas
- No falla con error 500 si falta la key

---

## 🧪 Prueba Completa

### Test 1: Google Maps (Usuario Invitado)

```bash
1. Abre: https://zennelectronica02.vercel.app (sin iniciar sesión)
2. Carrito → Finalizar Compra
3. Llenar datos
4. Scroll a "Ubicación en el mapa"
5. Click "Marcar ubicación"
6. ✅ Mapa debe cargar
7. Click en el mapa
8. ✅ Pin rojo aparece
9. Click "Confirmar ubicación"
10. ✅ "Ubicación temporal guardada" 
11. Completar pago
12. ✅ Compra exitosa con ubicación
```

### Test 2: Catastro de Tarjeta (Usuario Registrado)

```bash
1. Inicia sesión
2. Mi Perfil → Tarjetas
3. Click "Agregar Tarjeta"
4. Modal se abre
5. Completar:
   - Tarjeta: 4111 1111 1111 1111
   - Fecha: 12/25
   - CVV: 123
   - Cédula: 9661000
6. ✅ SIN error 401
7. ✅ Tarjeta guardada
```

### Test 3: Ver Compras del Usuario

```bash
1. Usuario logueado
2. Mi Perfil → Compras
3. ✅ Lista de compras aparece
4. Click en una compra
5. ✅ Ver detalles:
   - Productos
   - Total
   - Estado del pedido
   - Ubicación de entrega
```

### Test 4: Admin - Actualizar Estado

```bash
1. Login como ROOT
2. Panel Admin → Transacciones Bancard
3. Click en transacción
4. Click "Actualizar Estado"
5. Seleccionar: "preparing_order"
6. Notas: "Empacando productos"
7. Click "Actualizar"
8. ✅ Estado actualizado
9. ✅ Email enviado al cliente
```

---

## 🔍 Verificar que Funcione

### Después de configurar variables y redesplegar:

```bash
# 1. Health Check
https://zennelectronica.vercel.app/api/bancard/health

# 2. Config Check
https://zennelectronica.vercel.app/api/bancard/config-check

# 3. Confirmar que Maps funcione:
https://zennelectronica02.vercel.app/finalizar-compra
→ Debe cargar mapa

# 4. Confirmar panel de transacciones:
https://zennelectronica02.vercel.app/panel-admin/transacciones-bancard
→ Debe mostrar transacciones
```

---

## 🚨 Si Aún Hay Errores

### Error: "API Key de Google Maps no configurado"
```
✅ Verificar que ambas estén en Vercel:
   - REACT_APP_GOOGLE_MAPS_API_KEY
   - GOOGLE_MAPS_API_KEY
✅ Redesplegar
✅ Limpiar caché (Ctrl+Shift+R)
```

### Error: 401 al catastrar tarjeta
```
✅ Agregar variables COOKIE_*
✅ Redesplegar
✅ Cerrar sesión
✅ Iniciar sesión de nuevo
✅ Intentar catastrar
```

### Error: Panel de transacciones no carga
```
✅ Verificar que estés logueado como ROOT
✅ Abrir Console (F12) y ver errores
✅ Ir a: /panel-admin (sin /transacciones-bancard)
✅ Luego click en menú "Transacciones"
```

---

## ✅ Resumen de Archivos Modificados

| Archivo | Cambio | Beneficio |
|---------|--------|-----------|
| locationController.js | ✅ Permite invitados guardar ubicación | Checkout funciona para todos |
| locationController.js | ✅ Maneja falta de API Key | No falla si falta configuración |
| locationController.js | ✅ Mejor logging | Fácil debugging |

---

## 🎯 ACCIÓN INMEDIATA

### 1. Obtener Google Maps API (10 min):
```
https://console.cloud.google.com/
→ Seguir pasos arriba
→ Copiar API Key
```

### 2. Agregar 7 Variables en Vercel (5 min):
```
REACT_APP_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_API_KEY
COOKIE_DOMAIN
COOKIE_SECURE
COOKIE_SAME_SITE
EMAIL_USER
EMAIL_PASS
```

### 3. Redesplegar (2 min):
```
Vercel → Redeploy
```

### 4. Probar (10 min):
```
- Maps funciona ✅
- Catastro sin 401 ✅
- Panel transacciones carga ✅
- Emails se envían ✅
```

---

**Total: 27 minutos para arreglar TODO**

**¿Empezamos con Google Maps API Key ahora?** Te guío paso a paso.


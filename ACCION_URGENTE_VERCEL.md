# 🚨 ACCIÓN URGENTE: Configurar FRONTEND_URL en Vercel

## ❌ Problema Actual:

- **Catastro de tarjeta redirige a:** `https://zennelectronica02.vercel.app/catastro-resultado`
- **Debería redirigir a:** `https://www.zenn.com.py/catastro-resultado`

## 🔍 Causa:

La variable de entorno `FRONTEND_URL` en tu proyecto de Vercel del BACKEND está configurada como:
```
FRONTEND_URL=https://zennelectronica02.vercel.app
```

**Debe ser:**
```
FRONTEND_URL=https://www.zenn.com.py
```

---

## ✅ PASOS PARA ARREGLAR (URGENTE):

### 1. Ir a Vercel Dashboard del BACKEND

1. Ve a: https://vercel.com/dashboard
2. **Selecciona tu proyecto del BACKEND** (probablemente se llama `zenn-backend` o similar)
3. Click en **"Settings"**
4. Click en **"Environment Variables"** en el menú lateral

### 2. Buscar y Editar `FRONTEND_URL`

1. Busca la variable: `FRONTEND_URL`
2. Click en los **3 puntos (···)** al lado derecha
3. Click en **"Edit"**
4. **Cambia el valor a:** `https://www.zenn.com.py`
5. **Asegúrate que aplique a:** Production, Preview, Development
6. Click en **"Save"**

### 3. Redeploy del Backend

**CRÍTICO:** Los cambios de variables de entorno NO se aplican automáticamente.

1. Ve a la tab **"Deployments"**
2. Encuentra el último deployment exitoso
3. Click en los **3 puntos (···)**
4. Click en **"Redeploy"**
5. Espera a que termine (1-2 minutos)

---

## 🧪 Verificar que funcionó:

### Test 1: Verificar variable de entorno

Crea un endpoint temporal en el backend para verificar:

En `backend/routes/index.js`, agrega:
```javascript
router.get('/debug-urls', (req, res) => {
    res.json({
        FRONTEND_URL: process.env.FRONTEND_URL,
        BACKEND_URL: process.env.BACKEND_URL,
        NODE_ENV: process.env.NODE_ENV
    });
});
```

Luego visita: `https://tu-backend.vercel.app/api/debug-urls`

**Debe mostrar:**
```json
{
    "FRONTEND_URL": "https://www.zenn.com.py",
    "BACKEND_URL": "https://tu-backend.vercel.app",
    "NODE_ENV": "production"
}
```

### Test 2: Probar catastro de tarjeta

1. Login con usuario GENERAL
2. Ir a Mi Perfil → Tarjetas
3. Click en "Registrar Nueva Tarjeta"
4. Completar formulario de Bancard
5. **Verificar que redirige a:** `https://www.zenn.com.py/catastro-resultado`

---

## 📋 Resumen de Cambios en Código (Ya Aplicados)

### ✅ Actualizados con `authFetch`:

1. **`balanceService.js`**
   - `getUserBalance()` → usa `authGet`
   - `loadBalance()` → usa `authPost`
   - `getBalanceHistory()` → usa `authGet`

2. **`UserProfilePage.js`**
   - `handleFetchCards()` → usa `authGet`
   - `handleDeleteCard()` → usa `authDelete`

3. **`UserPurchases.js`**
   - `fetchUserPurchases()` → usa `authGet`

4. **`CardRegistrationModal.js`**
   - `startCardRegistration()` → usa `authPost`

5. **`SimpleLocationSelector.js`**
   - `handleSaveLocation()` → usa `authPost`
   - `reverseGeocode()` → usa `authPost`

6. **`UserProfile.js`**
   - `loadUserLocation()` → usa `authGet`

### ✅ Backend CORS actualizado:

```javascript
// backend/index.js
allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'X-Requested-With', 
    'Accept', 
    'x-auth-token',  // ✅ AGREGADO
    'authorization-token'  // ✅ AGREGADO
]
```

---

## 🎯 Checklist Final:

### Antes de configurar Vercel:
- [x] Helper `authFetch.js` creado
- [x] Todos los componentes actualizados
- [x] CORS configurado en backend
- [x] Código listo para deploy

### Configuración en Vercel:
- [ ] `FRONTEND_URL` = `https://www.zenn.com.py` ← **HACER ESTO YA**
- [ ] Backend redeployado
- [ ] Variable verificada con `/debug-urls`

### Deploy de código:
- [ ] Backend desplegado (con CORS fix)
- [ ] Frontend desplegado (con authFetch)

### Testing:
- [ ] Guardar ubicación funciona
- [ ] Ver saldo funciona
- [ ] Ver tarjetas funciona
- [ ] Registrar tarjeta funciona
- [ ] Redirect correcto a `www.zenn.com.py`
- [ ] Historial de compras funciona

---

## 🚨 Si sigue sin funcionar:

### Debug 1: Verificar que el token se envía

En el navegador (DevTools → Console), debería verse:
```
🔐 authFetch: {
    url: "/api/perfil/saldo",
    method: "GET",
    hasToken: true,
    tokenPreview: "eyJhbGciOiJIUzI1NiIs..."
}
```

### Debug 2: Verificar que el backend recibe el token

En los logs de Vercel del backend, debería verse:
```
✅ USUARIO AUTENTICADO EXITOSAMENTE: {
    id: ObjectId("..."),
    name: "Josias",
    email: "tebuscoyselecciono@gmail.com",
    role: "GENERAL",
    tokenSource: "header"  ← ✅ IMPORTANTE
}
```

**NO debe verse:**
```
🔓 CONFIGURADO COMO INVITADO: { guestId: '...', reason: 'no_token' }
```

---

## 📞 Si necesitas ayuda:

1. **Toma screenshot** de la configuración de variables de entorno en Vercel
2. **Copia los logs** del backend cuando hagas una petición
3. **Copia el resultado** de `/api/debug-urls`

---

**Fecha:** 4 de Noviembre, 2024  
**Prioridad:** 🚨 URGENTE  
**Tiempo estimado:** 5 minutos


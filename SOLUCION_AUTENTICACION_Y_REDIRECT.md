# 🔧 Solución Completa: Autenticación y Redirect de Bancard

## 📋 Problemas Identificados y Soluciones

### 1. ❌ Problema: Usuario autenticado detectado como invitado

**Causa:** Las peticiones fetch no incluían el token de autenticación en los headers.

**Solución Implementada:**
- ✅ Creado helper `authFetch` en `/frontend/src/helpers/authFetch.js`
- ✅ Actualizado `SimpleLocationSelector` para usar `authPost`
- ✅ Actualizado `CardRegistrationModal` para usar `authPost`
- ✅ Actualizado `UserProfile` para usar `authGet`

**Cómo funciona:**
```javascript
// El helper authFetch automáticamente:
// 1. Lee el token de localStorage
// 2. Lo incluye en Authorization header como Bearer token
// 3. Lo incluye también en x-auth-token header (compatibilidad iOS/Vercel)
// 4. Incluye credentials: 'include' para cookies

import { authPost, authGet } from '../helpers/authFetch';

// Uso:
const response = await authPost('/api/endpoint', { data });
const response = await authGet('/api/endpoint');
```

### 2. ❌ Problema: URLs de redirect incorrectas (zenn.app.com)

**Causa:** Variable de entorno `FRONTEND_URL` mal configurada en producción.

**Solución:** 

#### En Vercel (Producción):
Configurar la variable de entorno:

```bash
FRONTEND_URL=https://www.zenn.com.py
```

**O si tu dominio es diferente:**
```bash
FRONTEND_URL=https://tu-dominio-correcto.com
```

#### Pasos para configurar en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Busca `FRONTEND_URL`
4. Edita y asegúrate que sea: `https://www.zenn.com.py`
5. Aplica a: Production, Preview, Development
6. Guarda y redeploy

#### En desarrollo local (.env):
```bash
FRONTEND_URL=http://localhost:3000
```

### 3. ❌ Problema: Compras no aparecen en historial del usuario

**Causa:** Las transacciones de Bancard no se guardaban como registros de Sale.

**Solución Implementada:**
- ✅ Modificado `processConfirmationWithEmails` en `bancardController.js`
- ✅ Ahora crea automáticamente un registro en `SaleModel` cuando se aprueba una transacción
- ✅ Vincula la venta al usuario mediante `user_id`
- ✅ Incluye toda la información: items, ubicación, monto, etc.

**Flujo actualizado:**
```
1. Usuario realiza pago → BancardTransaction se crea (status: pending)
2. Bancard confirma pago → processConfirmationWithEmails se ejecuta
3. Transaction se actualiza (status: approved)
4. 🆕 Se crea Sale vinculado al usuario
5. Sale aparece en /mi-perfil?tab=purchases
```

## 🔄 URLs de Redirect Configuradas

### Backend → Frontend (después de pago)

**Pagos exitosos:**
```javascript
// En bancardController.js
return_url: `${process.env.FRONTEND_URL}/pago-exitoso`
```
**Redirige a:** `https://www.zenn.com.py/pago-exitoso?shop_process_id=...&status=success`

**Pagos cancelados:**
```javascript
cancel_url: `${process.env.FRONTEND_URL}/pago-cancelado`
```
**Redirige a:** `https://www.zenn.com.py/pago-cancelado?shop_process_id=...`

**Registro de tarjetas:**
```javascript
return_url: `${process.env.FRONTEND_URL}/catastro-resultado`
```
**Redirige a:** `https://www.zenn.com.py/catastro-resultado?status=...`

### Redirects del Backend (proxy)

En `backend/routes/index.js` líneas 1305-1365:

```javascript
// Bancard redirige primero al backend
router.get("/bancard/redirect/success", (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL; // ✅ DEBE SER zenn.com.py
    const params = new URLSearchParams(req.query).toString();
    const finalUrl = `${frontendUrl}/pago-exitoso?${params}`;
    res.redirect(302, finalUrl);
});

router.get("/bancard/redirect/cancel", (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL; // ✅ DEBE SER zenn.com.py
    const params = new URLSearchParams(req.query).toString();
    const finalUrl = `${frontendUrl}/pago-cancelado?${params}`;
    res.redirect(302, finalUrl);
});
```

## 🧪 Verificación de URLs

### 1. Verificar variable de entorno en producción

**En Vercel CLI:**
```bash
vercel env ls
```

**Debe mostrar:**
```
FRONTEND_URL    Production    https://www.zenn.com.py
```

### 2. Verificar en runtime (backend)

Agregar endpoint temporal para debug:
```javascript
router.get('/api/debug/env', (req, res) => {
    res.json({
        FRONTEND_URL: process.env.FRONTEND_URL,
        BACKEND_URL: process.env.BACKEND_URL,
        BANCARD_ENVIRONMENT: process.env.BANCARD_ENVIRONMENT
    });
});
```

**Llamar:** `https://tu-backend.vercel.app/api/debug/env`

**Debe retornar:**
```json
{
    "FRONTEND_URL": "https://www.zenn.com.py",
    "BACKEND_URL": "https://tu-backend.vercel.app",
    "BANCARD_ENVIRONMENT": "production"
}
```

## 📊 Modelo de Sale para Historial

El modelo `SaleModel` ahora incluye:

```javascript
{
    user_id: ObjectId,                  // Usuario que realizó la compra
    bancard_transaction_id: ObjectId,   // Referencia a BancardTransaction
    shop_process_id: Number,            // ID del proceso de Bancard
    items: Array,                       // Productos comprados
    total_amount: Number,               // Monto total
    currency: String,                   // Moneda (PYG)
    payment_method: String,             // "bancard"
    payment_status: String,             // "paid"
    order_status: String,               // "pending", "processing", "completed"
    delivery_status: String,            // "pending", "shipped", "delivered"
    delivery_location: Object,          // Ubicación de entrega completa
    customer_info: Object,              // Info del cliente
    authorization_number: String,       // Número de autorización Bancard
    ticket_number: String,              // Número de ticket Bancard
    sale_date: Date,                    // Fecha de la venta
    notes: String                       // Notas adicionales
}
```

## 🔍 Cómo se muestra en el historial

### Endpoint para obtener compras del usuario:

```javascript
GET /api/ventas/usuario/:userId
```

**Respuesta:**
```json
{
    "success": true,
    "data": [
        {
            "_id": "...",
            "shop_process_id": 1730743623707,
            "total_amount": "150000",
            "payment_status": "paid",
            "order_status": "pending",
            "delivery_status": "pending",
            "items": [...],
            "delivery_location": {...},
            "sale_date": "2024-11-04T18:30:00.000Z"
        }
    ]
}
```

### Componente en el Frontend:

`UserProfilePage.js` tab "purchases" debe consultar:
```javascript
const fetchPurchases = async () => {
    const response = await authGet(
        `${process.env.REACT_APP_BACKEND_URL}/api/ventas/usuario/${user._id}`
    );
    const data = await response.json();
    setPurchases(data.data);
};
```

## ✅ Checklist de Verificación

### Backend:
- [ ] Variable `FRONTEND_URL` configurada en Vercel
- [ ] Valor correcto: `https://www.zenn.com.py`
- [ ] Backend redeployado después del cambio
- [ ] Endpoint `/api/debug/env` retorna URL correcta

### Frontend:
- [ ] Helper `authFetch` creado
- [ ] Componentes actualizados para usar `authFetch`
- [ ] Token se guarda en localStorage al login
- [ ] Peticiones incluyen Authorization header

### Base de Datos:
- [ ] Modelo `SaleModel` existe y está correcto
- [ ] Las transacciones aprobadas crean Sales
- [ ] Sales se vinculan correctamente al usuario

### Flujo de Usuario:
- [ ] Usuario puede guardar ubicación estando logueado
- [ ] Usuario puede registrar tarjetas estando logueado
- [ ] Después de pago exitoso, redirige a zenn.com.py (no zenn.app.com)
- [ ] La compra aparece en "Mi Perfil → Compras"
- [ ] El estado de la compra se puede actualizar (pendiente → enviado → entregado)

## 🚨 Errores Comunes y Soluciones

### Error: "Debes iniciar sesión para acceder a tu perfil"
**Causa:** Token no se envía en headers
**Solución:** Usar `authFetch` en lugar de `fetch` regular

### Error: Redirige a dominio incorrecto
**Causa:** `FRONTEND_URL` mal configurada
**Solución:** Verificar y corregir en Vercel → Environment Variables

### Error: Compras no aparecen en historial
**Causa:** Sales no se crean al confirmar transacción
**Solución:** Ya implementado en `bancardController.js`, solo redeploy backend

### Error: "guest-..." en logs aunque esté logueado
**Causa:** Middleware `authToken` no encuentra token
**Solución:** Verificar que el frontend envíe token en headers (ya arreglado con authFetch)

## 📝 Archivos Modificados

### Frontend:
1. `/frontend/src/helpers/authFetch.js` (NUEVO)
2. `/frontend/src/components/location/SimpleLocationSelector.js`
3. `/frontend/src/components/CardRegistrationModal.js`
4. `/frontend/src/components/user/UserProfile.js`

### Backend:
1. `/backend/controller/bancard/bancardController.js`
   - Función `processConfirmationWithEmails` actualizada

## 🎯 Próximos Pasos

1. **Desplegar cambios:**
   ```bash
   # Frontend
   cd frontend
   npm run build
   vercel --prod
   
   # Backend  
   cd backend
   vercel --prod
   ```

2. **Verificar variables de entorno en Vercel**

3. **Probar flujo completo:**
   - Login
   - Agregar productos al carrito
   - Realizar pago
   - Verificar redirect correcto
   - Verificar que aparezca en historial

4. **Actualizar componente de historial de compras** si es necesario

## 📞 Soporte

Si los problemas persisten después de implementar estas soluciones:

1. Verificar logs del backend en Vercel
2. Verificar que el token se guarde en localStorage (DevTools → Application → Local Storage)
3. Verificar que las peticiones incluyan Authorization header (DevTools → Network)
4. Verificar que `FRONTEND_URL` sea correcto (llamar a `/api/debug/env`)

---

**Fecha:** 4 de Noviembre, 2024  
**Versión:** 1.0


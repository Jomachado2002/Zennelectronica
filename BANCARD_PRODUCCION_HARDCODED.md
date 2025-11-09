# ✅ Bancard Frontend Hardcodeado a Producción

## 🎯 Cambios Realizados

Se ha **hardcodeado** la configuración de Bancard en el **FRONTEND** para que **SIEMPRE** use producción, sin depender de variables de entorno.

### Frontend: `BancardPayButton.js` ✅ MODIFICADO
```javascript
// ANTES (dependía de variable de entorno):
const environment = process.env.REACT_APP_BANCARD_ENVIRONMENT || 'staging';
const baseUrl = environment === 'production' 
  ? 'https://vpos.infonet.com.py' 
  : 'https://vpos.infonet.com.py:8888';

// AHORA (hardcodeado a producción):
const baseUrl = 'https://vpos.infonet.com.py'; // SIEMPRE PRODUCCIÓN
```

### Backend: `bancardUtils.js` ✅ SIN CAMBIOS
```javascript
// QUEDA COMO ESTABA (usa variable de entorno):
const getBancardBaseUrl = () => {
    const environment = process.env.BANCARD_ENVIRONMENT || 'staging';
    if (environment === 'production') {
        return 'https://vpos.infonet.com.py';
    } else {
        return 'https://vpos.infonet.com.py:8888';
    }
};
```

---

## 📝 Pasos para Desplegar

### 1️⃣ Eliminar Variables en Vercel (Frontend)

Ve a **Vercel → Settings → Environment Variables** y **ELIMINA** estas 2:

❌ **Eliminar:**
- `NODE_ENV` (causa errores de build)
- `REACT_APP_BANCARD_ENVIRONMENT` (ya no se necesita, está hardcodeado)

✅ **Mantener en Backend:**
- `BANCARD_PUBLIC_KEY` ✅
- `BANCARD_PRIVATE_KEY` ✅
- `BANCARD_ENVIRONMENT = production` ✅
- `BANCARD_CONFIRMATION_URL` ✅

✅ **Mantener en Frontend:**
- `REACT_APP_BACKEND_URL` ✅
- Todas las demás variables (Firebase, Brevo, Google Maps, etc.) ✅

### 2️⃣ Hacer Push a Git

```bash
git add .
git commit -m "Hardcodear Bancard a producción - sin variables de entorno"
git push origin main
```

### 3️⃣ Verificar Despliegue

1. Vercel automáticamente hará un nuevo deploy
2. Espera a que termine (Status: Ready ✅)
3. Abre tu sitio: https://www.zenn.com.py
4. Ve a checkout y prueba el pago con Bancard

---

## ✅ Ventajas de Este Cambio

| Antes | Ahora |
|-------|-------|
| ❌ Dependía de `BANCARD_ENVIRONMENT` | ✅ Hardcodeado a producción |
| ❌ Dependía de `REACT_APP_BANCARD_ENVIRONMENT` | ✅ Sin dependencias |
| ❌ Podía usar staging por error | ✅ SIEMPRE usa producción |
| ❌ Requería configurar 2 variables | ✅ Sin configuración extra |

---

## 🔐 Variables de Bancard Necesarias

### ✅ Backend (Vercel - All Environments):

```bash
BANCARD_PUBLIC_KEY = v3qjZLp2RGzrU1GapPPwbCE0EsOaEqdm
BANCARD_PRIVATE_KEY = +H,4x+FipS(AJ4EdK+agV.W.film1JI3c4042EWG
BANCARD_ENVIRONMENT = production
BANCARD_CONFIRMATION_URL = https://zennelectronica.vercel.app/api/bancard/confirm
```

### ❌ Frontend (NO necesitas):

- ❌ `REACT_APP_BANCARD_ENVIRONMENT` (ya está hardcodeado en el código)
- ❌ `NODE_ENV = production` (causa errores de build con warnings de ESLint)

---

## 🚀 Resultado Final

- ✅ Frontend llama a: `https://vpos.infonet.com.py` (producción)
- ✅ Backend llama a: `https://vpos.infonet.com.py` (producción)
- ✅ Credenciales: Producción
- ✅ Formulario de Bancard funcionará correctamente
- ✅ No más errores 404 en process_id

---

## 🔧 Para Volver a Staging (Desarrollo)

Si en el futuro necesitas probar en staging, cambia:

**Frontend - BancardPayButton.js línea 140:**
```javascript
const baseUrl = 'https://vpos.infonet.com.py:8888'; // Staging
```

**Backend - Variable de entorno en Vercel:**
```bash
BANCARD_ENVIRONMENT = staging
```

Y usa las credenciales de staging de Bancard.

---

✅ **Listo para producción** 🎉


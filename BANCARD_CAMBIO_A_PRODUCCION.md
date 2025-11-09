# 🚀 CAMBIO DE BANCARD A PRODUCCIÓN - Guía Completa

## ⚠️ IMPORTANTE: Lee TODO Antes de Cambiar

Bancard te autorizó el ambiente **staging** para usarlo en **producción**. Esto significa que **NO necesitas cambiar las claves**, pero **SÍ debes cambiar la URL**.

---

## 📋 Variables de Entorno que DEBES Cambiar

### ✅ Variables a Modificar

#### 1. **BANCARD_ENVIRONMENT**
```bash
# ANTES (Staging/Desarrollo):
BANCARD_ENVIRONMENT=staging

# DESPUÉS (Producción):
BANCARD_ENVIRONMENT=production
```

**¿Por qué cambiar esto?**
- Cambia la URL base de Bancard
- Staging: `https://vpos.infonet.com.py:8888` (puerto 8888)
- Production: `https://vpos.infonet.com.py` (sin puerto)

---

### ❌ Variables que NO DEBES Cambiar

Estas variables **QUEDAN IGUAL** (ya autorizadas para producción):

```bash
# ✅ MANTENER IGUAL
BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
BANCARD_CONFIRMATION_URL=https://zenn.vercel.app/api/bancard/confirm
```

**Razón:** Bancard te autorizó usar las claves de staging en producción (caso especial).

---

## 🔧 Cómo Cambiar en Vercel (Paso a Paso)

### Método 1: Desde Vercel Dashboard (Recomendado)

#### Paso 1: Ir a Variables de Entorno
```
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto (Zenn)
3. Click en "Settings" (Configuración)
4. Click en "Environment Variables"
```

#### Paso 2: Buscar BANCARD_ENVIRONMENT
```
1. Busca en la lista: BANCARD_ENVIRONMENT
2. Click en los 3 puntos (⋮) al lado derecho
3. Click en "Edit" (Editar)
```

#### Paso 3: Cambiar el Valor
```
1. Cambia el valor de: staging
2. A: production
3. Asegúrate de que está seleccionado:
   ✅ Production
   ✅ Preview
   ✅ Development
4. Click en "Save" (Guardar)
```

#### Paso 4: Redesplegar
```
1. Ve a la pestaña "Deployments"
2. Click en el deployment más reciente
3. Click en los tres puntos (...)
4. Selecciona "Redeploy"
5. ✅ Espera a que termine (2-3 minutos)
```

---

### Método 2: Desde Terminal con Vercel CLI

```bash
# 1. Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# 2. Login
vercel login

# 3. Cambiar la variable
vercel env add BANCARD_ENVIRONMENT production

# Selecciona:
# - Production: Yes
# - Preview: Yes
# - Development: Yes

# 4. Redesplegar
vercel --prod
```

---

## 📊 Diferencias: Staging vs Production

### URLs de Bancard

| Ambiente | URL Base | Puerto | Uso |
|----------|----------|--------|-----|
| **Staging** | `https://vpos.infonet.com.py:8888` | 8888 | Pruebas con datos ficticios |
| **Production** | `https://vpos.infonet.com.py` | 443 (HTTPS) | Cobros reales con dinero real |

### Tarjetas de Prueba

| Ambiente | Tarjetas de Prueba | Cobros Reales |
|----------|-------------------|---------------|
| **Staging** | ✅ Funcionan (cédula 6587520) | ❌ No cobran dinero real |
| **Production** | ❌ No funcionan | ✅ Cobran dinero real |

---

## ⚠️ ADVERTENCIAS CRÍTICAS

### 🔴 Una Vez que Cambies a Production:

1. **Los pagos serán REALES**
   - Se cobrará dinero real de las tarjetas
   - Las transacciones NO son reversibles fácilmente
   - Debes tener todo bien probado

2. **Las tarjetas de prueba NO funcionarán**
   - Cédula 6587520 → No funcionará
   - Debes usar tarjetas reales

3. **Responsabilidad Legal**
   - Debes cumplir con normativas de PCI DSS
   - Proteger datos de tarjetas
   - Tener términos y condiciones claros

---

## ✅ Checklist ANTES de Cambiar a Producción

### Pre-requisitos Obligatorios

- [ ] ✅ Bancard te autorizó oficialmente para producción
- [ ] ✅ Has probado TODOS los flujos en staging:
  - [ ] Pago simple (single_buy)
  - [ ] Catastro de tarjetas (registrar)
  - [ ] Pago con tarjeta guardada (charge)
  - [ ] Eliminación de tarjetas (delete)
  - [ ] Rollback de transacciones
  - [ ] Confirmación por webhook
  - [ ] Emails de confirmación
- [ ] ✅ Tienes configurado SSL/HTTPS en tu dominio
- [ ] ✅ Tu BANCARD_CONFIRMATION_URL es accesible públicamente
- [ ] ✅ Tienes términos y condiciones publicados
- [ ] ✅ Tienes política de privacidad
- [ ] ✅ Has configurado emails de notificación
- [ ] ✅ Tienes soporte al cliente configurado

---

## 🧪 Testing Después del Cambio

### 1. Verificar que el Cambio Funcionó

Accede a este endpoint:
```
https://zenn.vercel.app/api/bancard/config-check
```

**Debe mostrar:**
```json
{
  "success": true,
  "data": {
    "environment": "production",  ← ✅ Debe decir "production"
    "base_url": "https://vpos.infonet.com.py",  ← ✅ SIN puerto 8888
    "configuration_valid": true
  }
}
```

### 2. Hacer una Transacción de Prueba PEQUEÑA

⚠️ **IMPORTANTE:** Usa un monto PEQUEÑO (ej: ₲1,000) para tu primera transacción real.

```
1. Agrega un producto barato al carrito
2. Procede al checkout
3. Usa una tarjeta REAL
4. Completa el pago
5. ✅ Verifica que se cobró
6. ✅ Verifica que recibiste el email
7. ✅ Verifica que la transacción aparece en tu panel
8. ✅ Verifica que el estado es "approved"
```

### 3. Verificar Panel de Bancard

```
1. Entra al portal de Bancard
2. Ve a "Transacciones"
3. ✅ Debe aparecer tu transacción de prueba
4. ✅ Verifica el monto
5. ✅ Verifica el estado (aprobado)
```

---

## 🔄 Plan de Rollback (Por si Algo Sale Mal)

Si algo no funciona después del cambio:

### Volver a Staging Rápidamente

```bash
# Método 1: Vercel Dashboard
1. Settings → Environment Variables
2. Editar BANCARD_ENVIRONMENT
3. Cambiar de "production" a "staging"
4. Redesplegar

# Método 2: Vercel CLI
vercel env add BANCARD_ENVIRONMENT staging
vercel --prod
```

---

## 📧 Notificaciones y Emails

### Variables de Email (Verificar que Estén Configuradas)

```bash
# Para Brevo (recomendado)
BREVO_API_KEY=tu-api-key
BREVO_SENDER_EMAIL=ventas@zenn.com.py
BREVO_SENDER_NAME=Zenn Electrónica

# O para Gmail/Outlook
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=tu-contraseña-de-app
```

**¿Por qué es importante?**
- Los clientes recibirán confirmaciones de pago
- Tú recibirás notificaciones de ventas
- Es obligatorio para una buena experiencia de usuario

---

## 🎯 Configuración Completa de Variables ENV

### Variables Bancard (Solo cambia ENVIRONMENT)

```bash
# ✅ CAMBIAR ESTA
BANCARD_ENVIRONMENT=production

# ✅ MANTENER ESTAS IGUAL
BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
BANCARD_CONFIRMATION_URL=https://zenn.vercel.app/api/bancard/confirm
```

### Variables de URLs

```bash
FRONTEND_URL=https://zenn.vercel.app
BACKEND_URL=https://zenn.vercel.app
REACT_APP_BACKEND_URL=https://zenn.vercel.app
```

### Otras Variables Importantes

```bash
NODE_ENV=production
MONGODB_URI=tu-mongodb-uri
TOKEN_SECRET_KEY=tu-secret-key
SESSION_SECRET=tu-session-secret
```

---

## 🔐 Seguridad en Producción

### Validaciones del Sistema

El código **automáticamente** valida:

```javascript
// En backend/helpers/bancardUtils.js (línea 106-114)
const getBancardBaseUrl = () => {
    const environment = process.env.BANCARD_ENVIRONMENT || 'staging';
    
    if (environment === 'production') {
        return 'https://vpos.infonet.com.py';      // ✅ Producción
    } else {
        return 'https://vpos.infonet.com.py:8888'; // ⚠️ Staging
    }
};
```

### Logs en Producción

```javascript
// El sistema automáticamente loguea:
console.log('🔐 Ambiente Bancard:', process.env.BANCARD_ENVIRONMENT);
console.log('🌐 URL Base:', getBancardBaseUrl());
```

**Ver logs en Vercel:**
```
Vercel Dashboard → Tu proyecto → Logs
Filtrar por: "Ambiente Bancard"
```

---

## 📝 Checklist de Producción (Imprimir y Marcar)

### Antes del Cambio
- [ ] Probé TODOS los flujos en staging
- [ ] Tengo términos y condiciones publicados
- [ ] Tengo política de privacidad
- [ ] Emails funcionan correctamente
- [ ] BANCARD_CONFIRMATION_URL es accesible públicamente
- [ ] SSL/HTTPS funciona en mi dominio
- [ ] Tengo backup de mi base de datos

### Durante el Cambio
- [ ] Cambié BANCARD_ENVIRONMENT a "production"
- [ ] NO cambié las claves (public/private)
- [ ] Redesplegué en Vercel
- [ ] Esperé a que termine el deployment (verde ✅)
- [ ] Verifiqué /api/bancard/config-check

### Después del Cambio
- [ ] Hice transacción de prueba pequeña (₲1,000)
- [ ] Verifiqué que se cobró correctamente
- [ ] Recibí email de confirmación
- [ ] Transacción aparece en panel de Bancard
- [ ] Transacción aparece en mi admin panel
- [ ] Cliente puede ver su compra en "Mis Compras"

### Validaciones Finales
- [ ] Probé pago con tarjeta nueva
- [ ] Probé catastro de tarjeta
- [ ] Probé pago con tarjeta guardada
- [ ] Probé desde móvil
- [ ] Probé desde desktop
- [ ] Emails llegan correctamente
- [ ] Delivery tracking funciona

---

## 🎯 Resumen Ejecutivo

### LO QUE DEBES HACER:

1. **Cambiar UNA variable:**
   ```
   BANCARD_ENVIRONMENT=production
   ```

2. **Redesplegar en Vercel**

3. **Verificar el endpoint:**
   ```
   https://zenn.vercel.app/api/bancard/config-check
   ```

4. **Hacer transacción de prueba pequeña**

### LO QUE NO DEBES HACER:

❌ **NO cambiar:**
- `BANCARD_PUBLIC_KEY`
- `BANCARD_PRIVATE_KEY`
- `BANCARD_CONFIRMATION_URL`

❌ **NO usar:**
- Tarjetas de prueba (cédula 6587520)
- Montos grandes en la primera prueba

---

## 🔄 Código que Cambia Automáticamente

Tu código **ya está preparado** para detectar el ambiente:

```javascript
// backend/helpers/bancardUtils.js
const getBancardBaseUrl = () => {
    const environment = process.env.BANCARD_ENVIRONMENT || 'staging';
    
    if (environment === 'production') {
        return 'https://vpos.infonet.com.py';      // ← ESTA se usará
    } else {
        return 'https://vpos.infonet.com.py:8888'; // ← Esta NO
    }
};
```

**No necesitas tocar el código**, solo cambiar la variable de entorno.

---

## 📱 URLs según Ambiente

### Staging (Actual)
```
Base: https://vpos.infonet.com.py:8888
Script: https://vpos.infonet.com.py:8888/checkout/javascript/dist/bancard-checkout-4.0.0.js
```

### Production (Después del cambio)
```
Base: https://vpos.infonet.com.py
Script: https://vpos.infonet.com.py/checkout/javascript/dist/bancard-checkout-4.0.0.js
```

**El sistema cambia automáticamente** según `BANCARD_ENVIRONMENT`.

---

## 🧪 Plan de Testing Post-Cambio

### Test 1: Pago Simple (Monto Pequeño)
```
Monto: ₲1,000 (mil guaraníes)
Producto: Un producto barato
Tarjeta: Tu tarjeta personal
Esperado: ✅ Cobro real de ₲1,000
```

### Test 2: Catastro de Tarjeta
```
Acción: Registrar nueva tarjeta
Tarjeta: Real (no de prueba)
Esperado: ✅ Tarjeta guardada con alias
```

### Test 3: Pago con Tarjeta Guardada
```
Monto: ₲2,000
Tarjeta: Usar tarjeta guardada en Test 2
Esperado: ✅ Pago sin ingresar datos nuevamente
```

### Test 4: Email de Confirmación
```
Esperado: 
✅ Cliente recibe email
✅ Admin recibe notificación
✅ Email tiene detalles correctos
```

### Test 5: Panel de Admin
```
Ve a: /panel-admin/transacciones-bancard
Esperado:
✅ Transacciones aparecen
✅ Estados correctos
✅ Montos correctos
```

---

## 🚨 Troubleshooting

### Problema: "Error al conectar con Bancard"

**Posibles causas:**
1. No redesplegaste después de cambiar la variable
2. La variable no se guardó correctamente
3. Caché del navegador

**Solución:**
```bash
1. Verificar variable en Vercel Settings
2. Redesplegar completamente
3. Limpiar caché: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
4. Verificar /api/bancard/config-check
```

### Problema: "Token MD5 inválido"

**Causa:** Las claves no coinciden con el ambiente

**Solución:**
```bash
1. Verificar que BANCARD_PRIVATE_KEY no tiene espacios
2. Verificar que tiene exactamente 40 caracteres
3. No cambies las claves (ya están autorizadas)
```

### Problema: "Transacción rechazada"

**Posibles causas:**
1. Tarjeta sin fondos
2. Tarjeta bloqueada
3. Límites de la tarjeta

**Solución:**
```bash
1. Usar otra tarjeta
2. Verificar saldo de la tarjeta
3. Contactar al banco emisor
```

---

## 🔍 Verificación de Configuración

### Endpoint de Verificación

```bash
# Verificar ambiente actual
curl https://zenn.vercel.app/api/bancard/config-check

# Debe responder:
{
  "success": true,
  "data": {
    "environment": "production",  ← ✅ Verificar esto
    "base_url": "https://vpos.infonet.com.py",  ← ✅ Sin :8888
    "configuration_valid": true,
    "has_public_key": true,
    "has_private_key": true,
    "confirmation_url": "https://zenn.vercel.app/api/bancard/confirm"
  }
}
```

### Logs en el Backend

Después de redesplegar, revisa los logs:

```
Vercel → Logs → Buscar:

✅ "🔐 Ambiente Bancard: production"
✅ "🌐 URL Base: https://vpos.infonet.com.py"
❌ NO debe aparecer ":8888"
```

---

## 📞 Contactos de Soporte

### Bancard
- **Portal:** https://www.bancard.com.py
- **Email:** soporte@bancard.com.py
- **Teléfono:** +595 21 XXX XXXX

### Si Tienes Problemas
1. **Revisa logs:** Vercel Dashboard → Logs
2. **Verifica config:** `/api/bancard/config-check`
3. **Contacta Bancard:** Si hay errores con ellos
4. **Rollback:** Vuelve a staging si es necesario

---

## 💰 Comisiones y Costos

### Bancard Cobra:
- **Por transacción:** ~3-4% + IVA
- **Cargo fijo:** Según tu contrato
- **Chargeback:** Penalización si hay reclamos

**Verifica tu contrato con Bancard** para conocer las comisiones exactas.

---

## 🎯 Resumen en 4 Pasos

```
1️⃣ Vercel → Settings → Environment Variables
   
2️⃣ Editar: BANCARD_ENVIRONMENT
   Cambiar a: production
   
3️⃣ Deployments → Redeploy
   
4️⃣ Verificar: /api/bancard/config-check
   Debe decir: "environment": "production"
```

---

## ✅ Configuración Final

```bash
# Solo esta variable cambia:
BANCARD_ENVIRONMENT=production

# Estas se mantienen igual:
BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
BANCARD_CONFIRMATION_URL=https://zenn.vercel.app/api/bancard/confirm
```

---

## 🎉 ¡Listo para Producción!

Una vez que hagas el cambio:
- ✅ Estarás usando Bancard en **modo producción**
- ✅ Los cobros serán **reales**
- ✅ Las URL automáticamente cambiarán
- ✅ Todo funcionará igual pero con dinero real

---

**Última actualización:** Noviembre 7, 2025  
**Estado:** 📋 Guía completa para cambio a producción  
**Responsable:** Verificar con Bancard antes de proceder


# 🔐 Configuración de Variables de Entorno para Bancard en Vercel

## 📋 Variables Requeridas

### 🏦 Credenciales de Bancard

```bash
# Clave Pública (32 caracteres)
BANCARD_PUBLIC_KEY=7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn

# Clave Privada (40 caracteres)
BANCARD_PRIVATE_KEY=Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY

# Ambiente (staging o production)
BANCARD_ENVIRONMENT=staging

# URL de Confirmación (webhook de Bancard)
BANCARD_CONFIRMATION_URL=https://zenn.vercel.app/api/bancard/confirm
```

### 🌐 URLs de la Aplicación

```bash
# URL del Frontend
FRONTEND_URL=https://zenn-electronica.vercel.app

# URL del Backend (puede ser la misma si está en Vercel)
BACKEND_URL=https://zenn.vercel.app
REACT_APP_BACKEND_URL=https://zenn.vercel.app
```

### 📧 Configuración de Email (Opcional pero Recomendado)

```bash
# Para envío de confirmaciones y notificaciones
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=tu-contraseña-de-app
```

### 🔑 Otras Variables Importantes

```bash
# Secret para JWT
TOKEN_SECRET_KEY=tu-secret-key-seguro

# MongoDB Connection
MONGODB_URI=tu-mongodb-uri

# Node Environment
NODE_ENV=production
```

## 📝 Instrucciones para Configurar en Vercel

### 1. Acceder a la Configuración del Proyecto

1. Ve a tu proyecto en Vercel Dashboard
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Environment Variables**

### 2. Agregar Variables de Entorno

Para cada variable listada arriba:

1. **Key (Nombre)**: Copia exactamente el nombre de la variable (ej: `BANCARD_PUBLIC_KEY`)
2. **Value (Valor)**: Pega el valor correspondiente
3. **Environments**: Selecciona todos los ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. Click en **Add** o **Save**

### 3. Variables Específicas para Bancard

#### BANCARD_PUBLIC_KEY
```
Valor: 7Jhp4AqwytbEvCl4pXWNz7wCNzJfYELn
Descripción: Clave pública de Bancard para identificar tu comercio
```

#### BANCARD_PRIVATE_KEY
```
Valor: Dsfnxi(X6oP9OL2H0RYtjX8VV+5Qn(9pAahNf(dY
Descripción: Clave privada para firmar las transacciones (CRÍTICA - NO COMPARTIR)
```

#### BANCARD_ENVIRONMENT
```
Valor: staging (para pruebas) o production (para producción)
Descripción: Define si usas el ambiente de pruebas o producción de Bancard
```

#### BANCARD_CONFIRMATION_URL
```
Valor: https://tu-dominio.vercel.app/api/bancard/confirm
Descripción: URL donde Bancard enviará las confirmaciones de pago
IMPORTANTE: Debe ser HTTPS y accesible públicamente
```

## 🧪 Verificación de Configuración

Después de configurar todas las variables:

### 1. Redesplegar la Aplicación

```bash
# En Vercel Dashboard
1. Ve a la pestaña "Deployments"
2. Click en el último deployment
3. Click en los tres puntos (...)
4. Selecciona "Redeploy"
```

### 2. Verificar que las Variables se Cargaron

Accede a estos endpoints en tu navegador:

```
✅ Verificar configuración general:
https://tu-dominio.vercel.app/api/bancard/health

✅ Verificar configuración de Bancard:
https://tu-dominio.vercel.app/api/bancard/config-check

✅ Verificar certificación de tarjetas:
https://tu-dominio.vercel.app/api/bancard/verificar-certificacion-tarjetas
```

## 📱 URLs de Bancard según Ambiente

### Staging (Pruebas)
```
Base URL: https://vpos.infonet.com.py:8888
Script: https://vpos.infonet.com.py:8888/checkout/javascript/dist/bancard-checkout-4.0.0.js
```

### Production (Producción)
```
Base URL: https://vpos.infonet.com.py
Script: https://vpos.infonet.com.py/checkout/javascript/dist/bancard-checkout-4.0.0.js
```

## 🔒 Datos de Prueba para Staging

### Tarjetas de Prueba

#### Visa/Mastercard
```
Cédula: 6587520
Cualquier número de tarjeta válido
CVV: Cualquier 3 dígitos
Fecha: Cualquier fecha futura
```

#### Bancard Prepaga
```
Cédula: 9661000
Número: Ver documentación de Bancard
```

## ⚠️ Consideraciones de Seguridad

### ❌ NO HACER:
- ❌ Exponer las claves privadas en el código del frontend
- ❌ Commitear las claves en Git
- ❌ Usar claves de producción en ambiente de desarrollo
- ❌ Compartir las claves por email o chat sin encriptación

### ✅ BUENAS PRÁCTICAS:
- ✅ Mantener las claves solo en variables de entorno
- ✅ Usar diferentes claves para staging y production
- ✅ Rotar las claves periódicamente
- ✅ Monitorear los logs de transacciones
- ✅ Implementar límites de monto por transacción

## 🚀 Flujo Completo de Integración

### 1. Configuración Inicial
```bash
1. Agregar todas las variables en Vercel ✅
2. Redesplegar la aplicación ✅
3. Verificar endpoints de salud ✅
```

### 2. Pruebas de Pago Simple
```bash
1. Ir al carrito en tu sitio
2. Agregar productos
3. Click en "Finalizar Compra"
4. Completar formulario
5. Probar pago con tarjeta de prueba
```

### 3. Pruebas de Catastro de Tarjetas
```bash
1. Iniciar sesión como usuario
2. Ir a "Mi Perfil" > "Mis Tarjetas"
3. Click en "Registrar Nueva Tarjeta"
4. Completar formulario de Bancard
5. Verificar que la tarjeta se guardó
```

### 4. Pruebas de Pago con Token
```bash
1. Tener al menos una tarjeta registrada
2. Realizar una compra
3. Seleccionar tarjeta guardada
4. Confirmar pago
5. Verificar transacción exitosa
```

## 📊 Monitoreo y Logs

### Endpoints de Monitoreo

```bash
# Ver todas las transacciones (requiere auth)
GET https://tu-dominio.vercel.app/api/bancard/transactions

# Ver estado de una transacción específica
GET https://tu-dominio.vercel.app/api/bancard/status/:transactionId

# Estadísticas de tarjetas
GET https://tu-dominio.vercel.app/api/bancard/estadisticas-tarjetas
```

### Ver Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Click en "Logs" en el menú superior
3. Filtra por:
   - `bancard` - Para ver logs de Bancard
   - `error` - Para ver errores
   - `transaction` - Para ver transacciones

## 🆘 Troubleshooting

### Error: "BANCARD_PUBLIC_KEY no está configurada"
```
Solución:
1. Verificar que la variable existe en Vercel
2. Redesplegar la aplicación
3. Limpiar caché del navegador
```

### Error: "Token MD5 inválido"
```
Solución:
1. Verificar que BANCARD_PRIVATE_KEY es correcta
2. Verificar que tiene exactamente 40 caracteres
3. No debe tener espacios al inicio o final
```

### Error: "Process ID no válido"
```
Solución:
1. Verificar que el formato del process_id es numérico
2. Verificar que no hay caracteres especiales
3. Revisar logs del backend
```

## 📞 Soporte

### Bancard
- Portal: https://www.bancard.com.py
- Soporte: soporte@bancard.com.py
- Teléfono: +595 21 XXX XXXX

### Tu Equipo
- Email: soporte@zenn.com
- WhatsApp: +595 XXX XXX XXX

---

## ✅ Checklist de Implementación

- [ ] Todas las variables de Bancard configuradas en Vercel
- [ ] FRONTEND_URL apunta al dominio correcto
- [ ] BANCARD_CONFIRMATION_URL es accesible públicamente
- [ ] Aplicación redesplegada después de agregar variables
- [ ] Endpoint /api/bancard/health responde OK
- [ ] Endpoint /api/bancard/config-check muestra configuración válida
- [ ] Pago simple funciona con tarjeta de prueba
- [ ] Catastro de tarjetas funciona
- [ ] Pago con tarjeta guardada funciona
- [ ] Eliminación de tarjetas funciona
- [ ] Rollback de transacciones funciona
- [ ] Emails de confirmación se envían correctamente

---

**Última actualización:** Noviembre 2025
**Versión:** 1.0.0
**Estado:** ✅ Listo para Producción


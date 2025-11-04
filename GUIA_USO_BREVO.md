# 🚀 GUÍA COMPLETA DE USO - BREVO EMAIL SYSTEM

## 📑 ÍNDICE DE PASOS

1. [Instalar dependencias](#paso-1-instalar-dependencias)
2. [Configurar variables de entorno](#paso-2-configurar-variables-de-entorno)
3. [Probar el sistema](#paso-3-probar-el-sistema)
4. [Uso automático en ventas](#paso-4-uso-automático-en-ventas)
5. [Monitorear emails enviados](#paso-5-monitorear-emails-enviados)
6. [Solución de problemas](#paso-6-solución-de-problemas)

---

## **PASO 1: INSTALAR DEPENDENCIAS**

### 1.1 Abrir terminal en la carpeta backend:

```bash
cd /Users/josiasnicolas02gmail.com/Desktop/ZennElectronica/backend
```

### 1.2 Instalar el SDK de Brevo:

```bash
npm install sib-api-v3-sdk
```

### 1.3 Verificar instalación:

```bash
npm list sib-api-v3-sdk
```

Deberías ver algo como:
```
└── sib-api-v3-sdk@8.5.0
```

✅ **Listo!** Dependencia instalada.

---

## **PASO 2: CONFIGURAR VARIABLES DE ENTORNO**

### 2.1 Obtener API Key de Brevo:

1. Ve a [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)
2. Clic en **"Generar una nueva clave API"**
3. Nombre: `ZennElectronica API Key`
4. **Copiar la clave** (se muestra solo una vez)

### 2.2 Obtener ID de la plantilla:

1. Ve a **Campañas** → **Plantillas de Email**
2. Clic en tu plantilla: "Confirmación de Compra - ZennElectronica"
3. En la URL verás: `https://app.brevo.com/templates/[ID]/edit`
4. **Copiar ese número (ID)**

### 2.3 Editar archivo .env:

Abre el archivo `backend/.env` y agrega al final:

```bash
# BREVO EMAIL CONFIGURATION
BREVO_API_KEY=xkeysib-TU_API_KEY_AQUI
BREVO_TEMPLATE_ID_PURCHASE=123
BREVO_SENDER_EMAIL=no-reply@zenn.com.py
BREVO_SENDER_NAME=ZENN ELECTRONICOS
FRONTEND_URL=https://www.zenn.com.py
```

**Reemplaza:**
- `TU_API_KEY_AQUI` → Tu API Key real de Brevo
- `123` → El ID real de tu plantilla

### 2.4 Si usas Vercel:

1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. **Settings** → **Environment Variables**
3. Agrega las mismas variables que pusiste en .env
4. Selecciona: **Production**, **Preview**, **Development**
5. **Save**
6. **Redeploy** tu aplicación

✅ **Variables configuradas!**

---

## **PASO 3: PROBAR EL SISTEMA**

### 3.1 Editar el script de prueba:

Abre el archivo: `backend/test-brevo.js`

Busca esta línea (aprox. línea 29):

```javascript
const TEST_EMAIL = 'tu-email@ejemplo.com'; // 👈 CAMBIAR AQUÍ
```

**Cámbiala por tu email real:**

```javascript
const TEST_EMAIL = 'josiasnicolas02@gmail.com'; // 👈 TU EMAIL
```

### 3.2 Ejecutar la prueba:

```bash
cd backend
npm run test-brevo
```

**O directamente:**

```bash
node test-brevo.js
```

### 3.3 Resultado esperado:

Si todo está bien, verás:

```
================================
🚀 TEST DE BREVO EMAIL SERVICE
================================

✅ API Key configurada
✅ Template ID configurado: 123
✅ Email remitente: no-reply@zenn.com.py

📨 Preparando email de prueba...
   → Destinatario: Cliente de Prueba (josiasnicolas02@gmail.com)
   → Venta: VNT-00001
   → Total: Gs. 110.000

⏳ Enviando email...

✅ ¡EMAIL ENVIADO EXITOSAMENTE!
   📧 Message ID: <xxxxx@smtp-relay.brevo.com>
   📬 Revisa tu bandeja de entrada: josiasnicolas02@gmail.com
   💡 Si no lo ves, revisa la carpeta de SPAM

🔍 Puedes verificar el envío en:
   https://app.brevo.com/email/logs
```

### 3.4 Verificar el email:

1. **Revisa tu bandeja de entrada** (el email que pusiste)
2. Si no está, **revisa SPAM**
3. Verifica en Brevo: [https://app.brevo.com/email/logs](https://app.brevo.com/email/logs)

✅ **Si recibiste el email, todo funciona correctamente!**

---

## **PASO 4: USO AUTOMÁTICO EN VENTAS**

### 4.1 Cómo funciona:

El sistema **ya está configurado** para enviar emails automáticamente cuando:

1. Se **crea una nueva venta** en tu sistema
2. El **cliente tiene email** registrado
3. El email se envía **en segundo plano** (no retrasa la respuesta)

### 4.2 Flujo automático:

```
Usuario crea venta
       ↓
Sistema guarda en BD
       ↓
Sistema responde al usuario (rápido)
       ↓
En paralelo → Envía email al cliente
       ↓
Cliente recibe confirmación
```

### 4.3 Código que lo hace (ya implementado):

En `backend/controller/sales/salesController.js`:

```javascript
// ✅ ENVIAR EMAIL DE CONFIRMACIÓN (sin bloquear la respuesta)
if (client.email) {
    sendPurchaseConfirmationEmail(savedSale, client)
        .then(result => {
            if (result.success) {
                console.log('✅ Email enviado:', result.messageId);
            } else {
                console.warn('⚠️ No se pudo enviar email:', result.error);
            }
        })
        .catch(error => {
            console.error('❌ Error al enviar email:', error);
        });
}
```

### 4.4 Probar con una venta real:

1. **Crea un cliente de prueba** con tu email
2. **Crea una venta** para ese cliente
3. **Revisa tu email** - deberías recibir la confirmación

✅ **El sistema funciona automáticamente!**

---

## **PASO 5: MONITOREAR EMAILS ENVIADOS**

### 5.1 Ver logs en Brevo:

1. Ve a [https://app.brevo.com/email/logs](https://app.brevo.com/email/logs)
2. Verás todos los emails enviados
3. Información disponible:
   - ✅ Enviados
   - 📬 Entregados
   - 👁️ Abiertos
   - 🖱️ Clicks
   - ❌ Rebotes
   - 🚫 Spam

### 5.2 Ver logs en tu servidor:

Los logs del backend mostrarán:

```bash
✅ Email de confirmación enviado: <message-id>
```

O si hay error:

```bash
⚠️ No se pudo enviar email de confirmación: error message
```

### 5.3 Estadísticas en Brevo:

1. **Estadísticas** → **Emails Transaccionales**
2. Verás:
   - Total de emails enviados
   - Tasa de entrega
   - Tasa de apertura
   - Problemas detectados

✅ **Monitoreo configurado!**

---

## **PASO 6: SOLUCIÓN DE PROBLEMAS**

### ❌ Error: "API Key inválida"

**Solución:**
1. Verifica que la API Key esté correctamente copiada en `.env`
2. No debe tener espacios extras
3. Reinicia el servidor backend después de cambiar `.env`

```bash
# Verificar que está cargada
node -e "require('dotenv').config(); console.log(process.env.BREVO_API_KEY)"
```

---

### ❌ Error: "Template ID not found"

**Solución:**
1. Verifica el ID de la plantilla en Brevo
2. Asegúrate de que sea un número
3. La plantilla debe estar **Activada** en Brevo

---

### ❌ Email no se recibe

**Solución:**
1. **Revisa SPAM** primero
2. Verifica en logs de Brevo: [https://app.brevo.com/email/logs](https://app.brevo.com/email/logs)
3. Verifica que el email del destinatario sea válido
4. Verifica límites de tu cuenta (plan gratuito tiene límite diario)

---

### ❌ Email remitente no verificado

**Solución:**
1. Ve a **Configuración** → **Remitentes y IPs** → **Remitentes**
2. Verifica el email `no-reply@zenn.com.py`
3. Si no está verificado, sigue el proceso de verificación
4. Temporalmente puedes usar otro email ya verificado

---

### ❌ Variables no se reemplazan en el email

**Solución:**
1. Verifica la sintaxis en la plantilla HTML: `{{params.variable}}`
2. Verifica que el backend esté enviando todos los parámetros
3. Activa debug mode:

```bash
# En .env
BREVO_DEBUG=true
```

Esto mostrará todos los parámetros enviados en la consola.

---

## 🎯 RESUMEN - CHECKLIST COMPLETO

### ✅ Configuración Inicial:
- [ ] SDK de Brevo instalado (`npm install sib-api-v3-sdk`)
- [ ] Plantilla creada en Brevo
- [ ] API Key obtenida
- [ ] ID de plantilla obtenido
- [ ] Variables agregadas al .env
- [ ] Variables agregadas a Vercel (si aplica)

### ✅ Pruebas:
- [ ] Script de prueba ejecutado (`npm run test-brevo`)
- [ ] Email de prueba recibido
- [ ] Venta de prueba creada
- [ ] Email de confirmación recibido

### ✅ Producción:
- [ ] Sistema funcionando automáticamente
- [ ] Logs monitoreados
- [ ] Sin errores en consola
- [ ] Clientes recibiendo emails

---

## 📞 SOPORTE

Si tienes problemas:

1. **Revisa los logs** del backend
2. **Revisa los logs** de Brevo: [https://app.brevo.com/email/logs](https://app.brevo.com/email/logs)
3. **Verifica las variables** de entorno
4. **Consulta la documentación**: [https://developers.brevo.com/](https://developers.brevo.com/)

---

## 🎉 ¡LISTO!

Tu sistema de emails está **completamente configurado y funcionando**.

Cada vez que se cree una venta, el cliente recibirá automáticamente un email profesional con todos los detalles de su compra.

**¡Felicitaciones!** 🎊


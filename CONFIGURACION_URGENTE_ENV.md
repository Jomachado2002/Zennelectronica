# ⚡ CONFIGURACIÓN URGENTE - VARIABLES DE ENTORNO

## 🚨 ACCIÓN INMEDIATA REQUERIDA

Para que el sistema funcione correctamente, DEBES configurar estas variables de entorno:

---

## 📝 VARIABLES PARA `backend/.env`

Abre el archivo `backend/.env` y agrega estas líneas (reemplaza los valores de ejemplo):

```bash
# ============================================
# BREVO EMAIL - CONFIGURACIÓN OBLIGATORIA
# ============================================

# 1. API Key de Brevo
# Obtener desde: https://app.brevo.com/settings/keys/api
BREVO_API_KEY=xkeysib-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# 2. ID de tu plantilla de email en Brevo
# El número que ves en la URL al editar la plantilla
BREVO_TEMPLATE_ID_PURCHASE=2

# 3. Email remitente (DEBE estar verificado en Brevo)
BREVO_SENDER_EMAIL=no-reply@zenn.com.py
BREVO_SENDER_NAME=ZENN ELECTRONICOS

# 4. URL del frontend
FRONTEND_URL=https://www.zenn.com.py
```

---

## 🌐 VARIABLES PARA VERCEL

Ve a tu proyecto en Vercel → Settings → Environment Variables

Agrega estas variables (una por una):

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `BREVO_API_KEY` | Tu API Key de Brevo | `xkeysib-abc123...` |
| `BREVO_TEMPLATE_ID_PURCHASE` | ID de plantilla | `2` |
| `BREVO_SENDER_EMAIL` | Email remitente | `no-reply@zenn.com.py` |
| `BREVO_SENDER_NAME` | Nombre remitente | `ZENN ELECTRONICOS` |
| `FRONTEND_URL` | URL del frontend | `https://www.zenn.com.py` |

**IMPORTANTE**: 
- Selecciona **Production**, **Preview** y **Development** para cada variable
- Después de agregar las variables, haz **Redeploy** de la aplicación

---

## 🔑 CÓMO OBTENER API KEY DE BREVO

### Opción A: Ya tienes cuenta en Brevo

1. Ve a: https://app.brevo.com/settings/keys/api
2. Clic en **"Generar una nueva clave API"**
3. Nombre sugerido: `ZennElectronica-Production`
4. **COPIAR LA CLAVE** (solo se muestra una vez)
5. Pegar en `.env` y en Vercel

### Opción B: No tienes cuenta en Brevo

1. Crea una cuenta GRATUITA: https://app.brevo.com/account/register
2. Verifica tu email
3. Sigue los pasos de "Opción A"

**NOTA**: El plan gratuito incluye 300 emails/día, suficiente para comenzar.

---

## 📧 CÓMO OBTENER ID DE PLANTILLA

### Si ya creaste la plantilla:

1. Ve a: https://app.brevo.com/camp/lists/template
2. Clic en tu plantilla de "Confirmación de Compra"
3. Mira la URL, verás algo como: `https://app.brevo.com/templates/2/edit`
4. El número (`2` en este ejemplo) es tu `BREVO_TEMPLATE_ID_PURCHASE`

### Si NO has creado la plantilla:

1. Ve a: https://app.brevo.com/camp/lists/template
2. Clic en **"Crear una nueva plantilla"**
3. Nombre: `Confirmación de Compra - Zenn`
4. Tipo: **Plantilla de email**
5. Usa el editor de arrastrar y soltar o HTML personalizado
6. Contenido sugerido:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Confirmación de Compra</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h1 style="color: #2A3190;">¡Gracias por tu compra!</h1>
  
  <p>Hola {{params.clientName}},</p>
  
  <p>Tu pedido <strong>{{params.saleNumber}}</strong> ha sido confirmado exitosamente.</p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Resumen de tu compra:</h3>
    <p><strong>Fecha:</strong> {{params.saleDate}}</p>
    <p><strong>Total:</strong> {{params.totalAmountFormatted}}</p>
    <p><strong>Método de pago:</strong> {{params.paymentMethod}}</p>
    <p><strong>Estado:</strong> {{params.paymentStatus}}</p>
  </div>
  
  <p>Recibirás actualizaciones sobre el estado de tu pedido.</p>
  
  <p style="margin-top: 30px;">Saludos,<br><strong>Equipo ZENN</strong></p>
  
</body>
</html>
```

7. **Guardar y Activar** la plantilla
8. Copiar el ID de la URL

---

## ✅ VERIFICAR CONFIGURACIÓN

### Test rápido (en tu computadora):

```bash
cd backend
node test-brevo.js
```

Deberías ver:
```
✅ API Key configurada
✅ Template ID configurado: 2
✅ Email remitente: no-reply@zenn.com.py
✅ ¡EMAIL ENVIADO EXITOSAMENTE!
```

### Si ves errores:

- **❌ API Key no configurada** → Verifica que copiaste bien la API Key en `.env`
- **❌ Template ID no configurado** → Verifica que pusiste el número correcto
- **❌ Email remitente no verificado** → Ve a Brevo y verifica el email

---

## 🔥 CONFIGURACIÓN MÍNIMA PARA PRODUCCIÓN

Si tienes prisa y quieres que funcione YA, estas son las 3 variables ESENCIALES:

```bash
# Mínimo necesario:
BREVO_API_KEY=tu_api_key_aqui
BREVO_TEMPLATE_ID_PURCHASE=2
BREVO_SENDER_EMAIL=no-reply@zenn.com.py
```

Las demás tienen valores por defecto, pero es mejor configurarlas todas.

---

## 📞 SOPORTE

Si tienes problemas:

1. Verifica que todas las variables estén en `.env` y Vercel
2. Verifica que el email remitente esté verificado en Brevo
3. Ejecuta `node test-brevo.js` para diagnosticar
4. Revisa logs en: https://app.brevo.com/email/logs
5. Revisa logs de Vercel para ver errores específicos

---

## ⏱️ TIEMPO ESTIMADO DE CONFIGURACIÓN

- Obtener API Key: **2 minutos**
- Crear plantilla: **5 minutos**
- Configurar variables: **3 minutos**
- Probar: **2 minutos**

**Total: ~12 minutos** para tener todo funcionando.

---

**SIGUIENTE PASO**: Una vez configuradas estas variables, las compras comenzarán a funcionar correctamente y se enviarán los emails automáticamente.


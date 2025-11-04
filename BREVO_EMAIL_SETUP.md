# 📧 GUÍA COMPLETA: CONFIGURACIÓN DE BREVO PARA EMAILS DE CONFIRMACIÓN

## 📋 ÍNDICE
1. [Configuración Inicial en Brevo](#1-configuración-inicial-en-brevo)
2. [Crear Plantilla Personalizada](#2-crear-plantilla-personalizada)
3. [Variables de Entorno](#3-variables-de-entorno)
4. [Instalación de Dependencias](#4-instalación-de-dependencias)
5. [Pruebas](#5-pruebas)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. CONFIGURACIÓN INICIAL EN BREVO

### 🔑 Paso 1: Crear Cuenta y Obtener API Key

1. **Ir a Brevo**: [https://www.brevo.com](https://www.brevo.com) (anteriormente Sendinblue)
2. **Crear cuenta** o iniciar sesión
3. **Navegar a**: Configuración → SMTP & API → Claves API
4. **Generar nueva clave API**:
   - Clic en "Generar una nueva clave API"
   - Nombre: "ZennElectronica API Key"
   - Copiar y guardar la clave (se muestra solo una vez)

### 🌐 Paso 2: Verificar Dominio de Envío

1. **Ir a**: Configuración → Remitentes y IPs → Dominios
2. **Agregar dominio**: `zennelectronica.com`
3. **Configurar DNS**:
   - Agregar registros SPF, DKIM y DMARC en tu proveedor de DNS
   - Brevo te proporciona los valores exactos
4. **Verificar**: Esperar propagación DNS (puede tomar hasta 48 horas)

### 📧 Paso 3: Configurar Remitente Verificado

1. **Ir a**: Configuración → Remitentes y IPs → Remitentes
2. **Agregar remitente**:
   - Email: `ventas@zennelectronica.com`
   - Nombre: "ZennElectrónica - Ventas"
3. **Verificar email** (revisar bandeja de entrada y hacer clic en enlace)

---

## 2. CREAR PLANTILLA PERSONALIZADA

### 📝 Paso 1: Crear Nueva Plantilla

1. **Ir a**: Campañas → Plantillas de Email → **+ Crear una plantilla**
2. **Nombre**: `Confirmación de Compra - ZennElectronica`
3. **Tipo**: Plantilla de Email Transaccional
4. **Editor**: Elige "Editor HTML" (para pegar el código personalizado)

### 🎨 Paso 2: Diseño de la Plantilla

#### **Opción A: Usar el Editor Visual de Brevo**

1. **Arrastra y suelta elementos**:
   - Encabezado con logo
   - Bloque de texto para saludo
   - Tabla para información del pedido
   - Tabla para productos
   - Bloque para totales
   - Botón CTA
   - Footer

2. **Personalizar colores**:
   - Color primario: `#667eea` (morado/azul)
   - Color secundario: `#764ba2` (morado oscuro)
   - Fondo: `#f4f4f4`

#### **Opción B: Usar HTML Personalizado** (RECOMENDADO)

1. **Cambiar a editor HTML** (botón en la esquina superior derecha)
2. **Pegar el código HTML completo** que te proporcioné anteriormente
3. **Vista previa** para verificar diseño

### 🔧 Paso 3: Configurar Variables

En el editor, asegúrate de usar estas variables (Brevo usa sintaxis Handlebars):

**Variables Principales:**
```handlebars
{{params.clientName}}
{{params.clientCompany}}
{{params.clientEmail}}
{{params.clientPhone}}
{{params.saleNumber}}
{{params.saleDate}}
{{params.paymentMethod}}
{{params.paymentStatus}}
{{params.subtotalFormatted}}
{{params.taxRate}}
{{params.taxAmountFormatted}}
{{params.totalAmountFormatted}}
{{params.notes}}
{{params.dueDate}}
{{params.invoiceUrl}}
```

**Variables de Items (Loop):**
```handlebars
{{#each params.items}}
  {{this.description}}
  {{this.quantity}}
  {{this.unitPriceFormatted}}
  {{this.subtotalFormatted}}
{{/each}}
```

**Condicionales:**
```handlebars
{{#if params.notes}}
  <p>{{params.notes}}</p>
{{/if}}

{{#if params.dueDate}}
  <p>Fecha de vencimiento: {{params.dueDate}}</p>
{{/if}}
```

### ✅ Paso 4: Guardar y Obtener ID

1. **Guardar plantilla** (botón superior derecho)
2. **Copiar el ID de la plantilla**:
   - Está en la URL: `https://app.brevo.com/templates/[ID]/edit`
   - O en la lista de plantillas
3. **Guardar este ID** para usarlo en las variables de entorno

---

## 3. VARIABLES DE ENTORNO

### 📄 Archivo `.env` (Backend)

Agregar estas variables a tu archivo `.env`:

```bash
# ============================================
# BREVO EMAIL CONFIGURATION
# ============================================

# API Key de Brevo (obtener desde panel de Brevo)
BREVO_API_KEY=tu_api_key_aqui_xxxxxxxxxxxxx

# ID de la plantilla de confirmación de compra
BREVO_TEMPLATE_ID_PURCHASE=1

# ID de la plantilla de recordatorio de pago (opcional)
BREVO_TEMPLATE_ID_PAYMENT_REMINDER=2

# Email del remitente (debe estar verificado en Brevo)
BREVO_SENDER_EMAIL=ventas@zennelectronica.com
BREVO_SENDER_NAME=ZennElectrónica

# Email CC para recibir copia de confirmaciones (opcional)
BREVO_CC_EMAIL=admin@zennelectronica.com

# URL del frontend para enlaces en emails
FRONTEND_URL=https://zennelectronica.com
```

### 🚀 Configuración en Vercel

Si usas Vercel, agrega las variables de entorno:

1. **Ir a**: Panel de Vercel → Tu Proyecto → Settings → Environment Variables
2. **Agregar cada variable**:
   - Name: `BREVO_API_KEY`
   - Value: `tu_api_key_aqui`
   - Environment: Production, Preview, Development
3. **Repetir** para cada variable
4. **Redeploy** tu aplicación

---

## 4. INSTALACIÓN DE DEPENDENCIAS

### 📦 Instalar SDK de Brevo

En tu directorio `backend`:

```bash
cd backend
npm install sib-api-v3-sdk --save
```

O si usas yarn:

```bash
cd backend
yarn add sib-api-v3-sdk
```

### 📝 Verificar package.json

Tu `package.json` debe incluir:

```json
{
  "dependencies": {
    "sib-api-v3-sdk": "^8.5.0"
  }
}
```

---

## 5. PRUEBAS

### 🧪 Prueba Manual

#### 1. **Prueba con Script de Node.js**

Crear archivo `backend/test-brevo.js`:

```javascript
require('dotenv').config();
const { sendPurchaseConfirmationEmail } = require('./services/brevoService');

// Datos de prueba
const testSale = {
    _id: '123456',
    saleNumber: 'VNT-00001',
    saleDate: new Date(),
    paymentMethod: 'efectivo',
    paymentStatus: 'pendiente',
    subtotal: 100000,
    tax: 10,
    taxAmount: 10000,
    totalAmount: 110000,
    notes: 'Esta es una venta de prueba',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    items: [
        {
            description: 'Producto de Prueba 1',
            quantity: 2,
            unitPrice: 25000,
            subtotal: 50000
        },
        {
            description: 'Producto de Prueba 2',
            quantity: 1,
            unitPrice: 50000,
            subtotal: 50000
        }
    ]
};

const testClient = {
    name: 'Juan Pérez',
    company: 'Empresa Test S.A.',
    email: 'tu-email@ejemplo.com', // ⚠️ CAMBIAR POR TU EMAIL REAL
    phone: '+595 981 123456'
};

async function testEmail() {
    console.log('🚀 Enviando email de prueba...');
    
    const result = await sendPurchaseConfirmationEmail(testSale, testClient);
    
    if (result.success) {
        console.log('✅ Email enviado exitosamente!');
        console.log('📧 Message ID:', result.messageId);
    } else {
        console.error('❌ Error al enviar email:', result.error);
        console.error('Detalles:', result.details);
    }
}

testEmail();
```

**Ejecutar prueba:**

```bash
cd backend
node test-brevo.js
```

#### 2. **Prueba desde la Aplicación**

1. **Crear una venta de prueba** desde tu aplicación
2. **Verificar en la consola** del backend los logs
3. **Revisar email** en la bandeja de entrada del cliente

### 📊 Monitoreo en Brevo

1. **Ir a**: Estadísticas → Emails Transaccionales
2. **Ver**:
   - Emails enviados
   - Emails entregados
   - Emails abiertos
   - Clicks en enlaces
   - Rebotes y errores

---

## 6. TROUBLESHOOTING

### ❌ Problemas Comunes

#### **Problema 1: "API Key inválida"**

**Solución:**
- Verificar que la API Key esté correctamente copiada en `.env`
- Reiniciar el servidor después de agregar variables de entorno
- Verificar que la API Key no esté deshabilitada en Brevo

```bash
# Verificar variable de entorno
echo $BREVO_API_KEY
```

#### **Problema 2: "Template ID not found"**

**Solución:**
- Verificar el ID de la plantilla en Brevo
- Asegurarse de que el ID sea un número entero
- Verificar que la plantilla esté activada

```javascript
// En brevoService.js, agregar log
console.log('Template ID:', process.env.BREVO_TEMPLATE_ID_PURCHASE);
```

#### **Problema 3: "Email no verificado"**

**Solución:**
- Verificar el email del remitente en Brevo
- Verificar el dominio si usas un dominio personalizado
- Usar un email ya verificado temporalmente

#### **Problema 4: "Email no se recibe"**

**Solución:**
1. **Revisar spam** en el cliente
2. **Ver logs de Brevo**: Panel → Logs → Email Logs
3. **Verificar formato del email del destinatario**
4. **Verificar límites de cuenta** (plan gratuito tiene límite diario)

```javascript
// Agregar logs más detallados
console.log('Enviando a:', clientData.email);
console.log('Plantilla ID:', templateId);
```

#### **Problema 5: "Variables no se reemplazan"**

**Solución:**
- Verificar sintaxis en la plantilla: `{{params.variable}}`
- Asegurarse de pasar `params` en el objeto
- Verificar que los datos existan antes de enviar

```javascript
// En brevoService.js
console.log('Template Params:', JSON.stringify(templateParams, null, 2));
```

### 🐛 Debug Mode

Activar modo debug en `brevoService.js`:

```javascript
// Al inicio del archivo
const DEBUG = process.env.BREVO_DEBUG === 'true';

// En la función de envío
if (DEBUG) {
    console.log('=== BREVO DEBUG ===');
    console.log('Template ID:', templateId);
    console.log('Destinatario:', clientData.email);
    console.log('Parámetros:', JSON.stringify(templateParams, null, 2));
}
```

Agregar a `.env`:
```bash
BREVO_DEBUG=true
```

---

## 📚 RECURSOS ADICIONALES

### 🔗 Enlaces Útiles

- **Documentación Brevo**: https://developers.brevo.com/
- **SDK de Node.js**: https://github.com/sendinblue/APIv3-nodejs-library
- **Panel de Brevo**: https://app.brevo.com
- **Guía de Handlebars**: https://handlebarsjs.com/guide/

### 📞 Soporte

- **Email Brevo**: support@brevo.com
- **Chat en vivo**: Disponible en el panel de Brevo
- **Comunidad**: https://community.brevo.com/

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear cuenta en Brevo
- [ ] Obtener API Key
- [ ] Verificar dominio de envío
- [ ] Verificar email remitente
- [ ] Crear plantilla de confirmación de compra
- [ ] Copiar ID de plantilla
- [ ] Instalar `sib-api-v3-sdk` en backend
- [ ] Agregar variables de entorno en `.env`
- [ ] Agregar variables de entorno en Vercel
- [ ] Ejecutar prueba con script de test
- [ ] Crear venta de prueba desde la aplicación
- [ ] Verificar recepción de email
- [ ] Verificar diseño del email en diferentes clientes
- [ ] Configurar monitoreo en Brevo
- [ ] Documentar proceso para el equipo

---

## 🎉 ¡LISTO!

Una vez completados todos los pasos, tu sistema estará enviando automáticamente emails de confirmación de compra profesionales y personalizados a tus clientes.

### Próximos Pasos Sugeridos:

1. **Crear plantilla de recordatorio de pago**
2. **Crear plantilla de bienvenida para nuevos clientes**
3. **Configurar emails de seguimiento**
4. **Implementar notificaciones de estado de pedido**
5. **Agregar analytics de apertura y clicks**

---

**Documentación creada para ZennElectrónica**  
**Última actualización**: Noviembre 2025


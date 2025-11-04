# 📧 PLANTILLA BREVO - INSTRUCCIONES DE USO

## ⚠️ PROBLEMA IDENTIFICADO

Brevo **NO soporta** la sintaxis `{{#each}}` de Handlebars en algunas cuentas.

## ✅ SOLUCIONES DISPONIBLES

He creado **2 versiones** de la plantilla para ti:

---

## **OPCIÓN 1: PLANTILLA_BREVO_COMPATIBLE.html** ⭐ RECOMENDADA

### Características:
- ✅ Sin loops (100% compatible con Brevo)
- ✅ Muestra productos como texto
- ✅ Diseño limpio y profesional
- ✅ Garantizado que funciona

### Cómo se ven los productos:
```
Detalle de Productos

1. Laptop HP - Cantidad: 2 - Gs. 25.000 c/u = Gs. 50.000
2. Mouse Inalámbrico - Cantidad: 1 - Gs. 50.000 c/u = Gs. 50.000
```

### Usar esta plantilla:
1. Abre: `PLANTILLA_BREVO_COMPATIBLE.html`
2. Copia TODO el contenido
3. Pega en Brevo
4. Guarda

---

## **OPCIÓN 2: Crear manualmente en Brevo**

Si las plantillas HTML no funcionan, usa el **editor visual** de Brevo:

### Paso 1: Crear plantilla nueva
1. Campañas → Plantillas → + Crear plantilla
2. Selecciona: **"Crear con el editor Drag & Drop"**

### Paso 2: Estructura básica
Arrastra estos elementos en orden:

```
┌─────────────────────┐
│ 1. IMAGEN           │ ← Logo (arrastra desde tu PC o URL)
├─────────────────────┤
│ 2. TEXTO            │ ← Saludo
├─────────────────────┤
│ 3. TABLA 2x5        │ ← Info del pedido
├─────────────────────┤
│ 4. TEXTO            │ ← Título "Productos"
├─────────────────────┤
│ 5. TEXTO            │ ← Lista de productos
├─────────────────────┤
│ 6. TABLA 2x3        │ ← Totales
├─────────────────────┤
│ 7. TEXTO            │ ← Info de pago
├─────────────────────┤
│ 8. TEXTO            │ ← Footer
└─────────────────────┘
```

### Paso 3: Contenido de cada sección

#### 1. Logo:
- Sube imagen o usa URL: `https://www.zenn.com.py/logozenn.svg`
- Centra la imagen
- Ancho: 200px

#### 2. Saludo:
```
Estimado/a {{ params.clientName }},

Gracias por su compra. Hemos recibido su pedido correctamente.
```

#### 3. Info del Pedido (tabla 2 columnas):
```
Número de Pedido:  | {{ params.saleNumber }}
Fecha:             | {{ params.saleDate }}
Cliente:           | {{ params.clientName }}
Email:             | {{ params.clientEmail }}
Teléfono:          | {{ params.clientPhone }}
```

#### 4. Título Productos:
```
Detalle de Productos
```

#### 5. Lista de Productos:
```
{{ params.itemsDescription }}
```

#### 6. Totales (tabla 2 columnas):
```
Subtotal:      | {{ params.subtotalFormatted }}
IVA (10%):     | {{ params.taxAmountFormatted }}
TOTAL:         | {{ params.totalAmountFormatted }}
```

#### 7. Info de Pago:
```
Método de Pago: {{ params.paymentMethod }}
```

#### 8. Footer:
```
ZENN Electrónicos
Email: josiasnicolas02@gmail.com
Web: www.zenn.com.py

© 2025 ZENN Electrónicos
```

---

## 📋 VARIABLES QUE DEBES USAR

Estas son las variables que el backend envía:

```
{{ params.clientName }}
{{ params.clientEmail }}
{{ params.clientPhone }}
{{ params.saleNumber }}
{{ params.saleDate }}
{{ params.paymentMethod }}
{{ params.subtotalFormatted }}
{{ params.taxRate }}
{{ params.taxAmountFormatted }}
{{ params.totalAmountFormatted }}
{{ params.itemsDescription }}
{{ params.paymentConfirmed }}
```

**NOTA:** Usa espacios alrededor de las llaves: `{{ variable }}` no `{{variable}}`

---

## 🚀 MÉTODO MÁS RÁPIDO

### Si el HTML no funciona:

1. **Usa el editor visual** de Brevo (Drag & Drop)
2. **Crea la plantilla** con los elementos básicos
3. **Inserta las variables** donde corresponda
4. **Vista previa** para verificar
5. **Guarda y activa**

---

## ✅ VERIFICACIÓN FINAL

Antes de usar en producción:

1. **Envía un email de prueba** desde Brevo
   - Usa "Enviar email de prueba"
   - Llena manualmente los valores de las variables
   - Verifica que se vea correctamente

2. **Prueba desde tu aplicación**
   ```bash
   cd backend
   npm run test-brevo
   ```

---

## 💡 CONSEJO IMPORTANTE

Si Brevo rechaza tu HTML:
- ❌ NO uses `{{#each}}`
- ❌ NO uses `{{#eq}}`
- ❌ NO uses CSS externo
- ✅ USA solo `{{#if}}` simple
- ✅ USA tablas (`<table>`) en lugar de divs
- ✅ USA estilos inline
- ✅ USA espacios en las llaves: `{{ var }}`

---

## 📞 ¿NECESITAS AYUDA?

Si sigues teniendo problemas:

1. **Toma un screenshot** del error exacto
2. **Verifica** que estés usando "Editor HTML" no "Editor de texto"
3. **Intenta** el método visual (Drag & Drop)
4. **Contacta** al soporte de Brevo si el problema persiste

---

## 🎯 RESUMEN EJECUTIVO

**Usa:** `PLANTILLA_BREVO_COMPATIBLE.html`

**Si no funciona:** Crea la plantilla visualmente en Brevo usando el editor Drag & Drop

**Backend ya está listo:** Las variables `itemsDescription` ya se envían correctamente

¡Éxito! 🎉


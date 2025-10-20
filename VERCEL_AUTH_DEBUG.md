# 🔍 DEBUG DE AUTENTICACIÓN EN VERCEL

## 🚨 **Problema Identificado**

Los logs muestran **inconsistencia** en la autenticación:

### ✅ **ENDPOINTS QUE FUNCIONAN:**
```
👥 USUARIO EN BD: { id: new ObjectId('67170f0383e3a34f3ad06ac1'), name: 'Josias', email: 'josiasnicolas02@gmail.com', role: 'ROOT', isActive: true }
```

### ❌ **ENDPOINTS QUE NO FUNCIONAN:**
```
🔓 CONFIGURADO COMO INVITADO: { guestId: 'guest-1760925646207-rzqvw7luj', isIOS: false, reason: 'no_token', tokenSource: 'none' }
```

## 🔧 **Correcciones Implementadas**

### 1. **Controlador de Ubicación Corregido**
**Archivo**: `backend/controller/location/locationController.js`

**Problema**: Intentaba usar guest IDs como ObjectId de MongoDB
**Solución**: Validación de ObjectId antes de consultas a BD

```javascript
// ✅ VERIFICAR QUE EL USERID ES UN OBJECTID VÁLIDO
if (typeof userId === 'string' && userId.startsWith('guest-')) {
    return res.status(400).json({
        message: "Los usuarios invitados no pueden guardar ubicación",
        success: false,
        error: true
    });
}
```

### 2. **Middleware de Debug Agregado**
**Archivo**: `backend/middleware/cookieDebug.js`

**Función**: Logging detallado de cookies y headers para identificar problemas

### 3. **Endpoints de Debug Creados**
- `GET /api/debug/cookies` - Debug de cookies sin autenticación
- `GET /api/debug/auth-test` - Test completo de autenticación

## 🧪 **Endpoints para Probar**

### **Paso 1: Verificar Cookies**
```bash
curl -X GET https://zennelectronica.vercel.app/api/debug/cookies \
     -H "Content-Type: application/json"
```

### **Paso 2: Probar Autenticación**
```bash
curl -X GET https://zennelectronica.vercel.app/api/debug/auth-test \
     -H "Content-Type: application/json" \
     -b cookies.txt
```

### **Paso 3: Probar Endpoints Problemáticos**
```bash
curl -X GET https://zennelectronica.vercel.app/api/obtener-productos-home \
     -H "Content-Type: application/json" \
     -b cookies.txt
```

## 📊 **Análisis de los Logs**

### **Patrón de Inconsistencia:**
1. **Login exitoso**: Usuario autenticado correctamente
2. **Algunos endpoints**: Funcionan correctamente
3. **Otros endpoints**: Aparecen como GUEST

### **Posibles Causas:**
1. **Cookies no se envían** en algunas requests
2. **Middleware inconsistente** entre endpoints
3. **Configuración de CORS** en Vercel
4. **Timing issues** con cookies

## 🚀 **Próximos Pasos**

### **1. Verificar Logs de Debug**
Con los nuevos middlewares de debug, deberíamos ver:
```
🍪 COOKIE DEBUG: {
    endpoint: '/api/obtener-productos-home',
    cookies: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    headers: { cookie: 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
}
```

### **2. Identificar Endpoints Problemáticos**
Los logs mostrarán exactamente qué endpoints no están recibiendo cookies.

### **3. Corregir Configuración**
Una vez identificado el problema, aplicar la corrección específica.

## 🎯 **Resultado Esperado**

Después de las correcciones:
- ✅ **Todos los endpoints** deberían mostrar usuario autenticado
- ✅ **No más errores** de ObjectId con guest users
- ✅ **Admin panel** funcionando al 100%
- ✅ **Usuarios GENERAL** con acceso correcto

## 📝 **Comandos para Probar**

```bash
# 1. Login
curl -X POST https://zennelectronica.vercel.app/api/iniciar-sesion \
     -H "Content-Type: application/json" \
     -d '{"email":"josiasnicolas02@gmail.com","password":"tu_password"}' \
     -c cookies.txt

# 2. Verificar autenticación
curl -X GET https://zennelectronica.vercel.app/api/debug/auth-test \
     -b cookies.txt

# 3. Probar admin panel
curl -X GET https://zennelectronica.vercel.app/api/admin/categories/all \
     -b cookies.txt
```

¡Con estos cambios, el sistema de autenticación debería funcionar consistentemente en todos los endpoints! 🚀

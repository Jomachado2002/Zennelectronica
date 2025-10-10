# 💰 Sistema de Carga de Saldo - Zenn

## 🚀 ¿Cómo probar el sistema de carga de saldo?

### 1. **Verificar que el Backend esté funcionando**
```bash
cd backend
npm run dev
```
- El servidor debe estar corriendo en `http://localhost:8080`
- Verificar que la API responda: `curl http://localhost:8080/api/health`

### 2. **Iniciar el Frontend**
```bash
cd frontend
npm start
```
- El frontend debe estar corriendo en `http://localhost:3000`

### 3. **Acceder a la página de prueba**
Navegar a: `http://localhost:3000/test-saldo`

### 4. **Funcionalidades disponibles para probar:**

#### ✅ **Cargar Saldo:**
1. Hacer clic en "Cargar Saldo"
2. Seleccionar un monto predefinido o ingresar uno personalizado
3. Hacer clic en "Cargar Saldo"
4. Completar el pago en Bancard
5. El saldo se acreditará automáticamente

#### ✅ **Ver Saldo:**
- El saldo actual se muestra en tiempo real
- Se actualiza automáticamente después de cada transacción

#### ✅ **Probar Pago con Saldo:**
1. Asegurarse de tener al menos ₲10.000 de saldo
2. Hacer clic en "Probar Pago (₲10.000)"
3. El pago se procesará automáticamente con el saldo

#### ✅ **Ver Historial:**
- Todas las transacciones se muestran en el historial
- Incluye cargas, pagos, bonificaciones, etc.

---

## 🔧 **Componentes Creados:**

### **Backend:**
- ✅ `balanceModel.js` - Modelo de base de datos para saldo
- ✅ `bancardController.js` - Controladores para carga de saldo
- ✅ `userProfile.js` - Controladores de perfil con saldo
- ✅ Rutas API para manejo de saldo

### **Frontend:**
- ✅ `balanceService.js` - Servicio API para saldo
- ✅ `LoadBalanceModal.js` - Modal para cargar saldo
- ✅ `BalanceWidget.js` - Widget de saldo
- ✅ `TestBalance.js` - Página de prueba

---

## 📋 **Rutas API Disponibles:**

### **Gestión de Saldo:**
```
GET  /api/perfil/saldo - Obtener saldo del usuario
POST /api/perfil/cargar-saldo - Cargar saldo con Bancard
POST /api/perfil/pagar-con-saldo - Pagar con saldo
GET  /api/perfil/historial-saldo - Historial de transacciones
```

### **Rutas de Bancard:**
```
POST /api/bancard/cargar-saldo - Carga directa con Bancard
GET  /api/bancard/mi-saldo - Obtener saldo
POST /api/bancard/pagar-con-saldo - Pago con saldo
```

---

## 🎯 **Flujo de Prueba Completo:**

1. **Registrarse/Iniciar sesión** en la aplicación
2. **Ir a `/test-saldo`** para acceder a la página de prueba
3. **Cargar saldo** usando Bancard (montos de prueba disponibles)
4. **Verificar** que el saldo se actualice correctamente
5. **Probar pago** con saldo (botón de prueba de ₲10.000)
6. **Ver historial** de todas las transacciones

---

## 🔍 **Verificaciones Importantes:**

### **Backend:**
- ✅ Servidor corriendo en puerto 8080
- ✅ Base de datos conectada
- ✅ Configuración de Bancard válida
- ✅ Rutas de saldo funcionando

### **Frontend:**
- ✅ Página de prueba accesible
- ✅ Componentes cargando correctamente
- ✅ Comunicación con API funcionando
- ✅ Modal de Bancard integrado

---

## 🚨 **Solución de Problemas:**

### **Error "Identifier already declared":**
- Ya solucionado ✅ - Se eliminaron importaciones duplicadas

### **Puerto en uso:**
```bash
lsof -ti:8080 | xargs kill -9
```

### **Error de conexión API:**
- Verificar que `REACT_APP_BACKEND_URL` esté configurado
- Verificar que el backend esté corriendo

### **Error de Bancard:**
- Verificar configuración en `.env`
- Usar datos de prueba de Bancard

---

## 🎮 **Próximos Pasos:**

1. **Integrar en el carrito** - Agregar opción de pago con saldo
2. **Crear sistema de ruleta** - Para ganar saldo
3. **Integrar en perfil de usuario** - Widget de saldo permanente
4. **Crear páginas de éxito/error** - Para cargas de saldo

---

## 📞 **Datos de Prueba Bancard:**

Para testing, puedes usar:
- **Tarjeta:** 4111111111111111
- **CVV:** 123
- **Fecha:** Cualquier fecha futura
- **Monto:** Cualquier monto para pruebas

¡El sistema está listo para probar! 🚀

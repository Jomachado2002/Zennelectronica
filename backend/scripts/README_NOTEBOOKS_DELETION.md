# Eliminación de Productos de Notebooks

Este conjunto de scripts permite eliminar de forma segura todos los productos de la subcategoría "notebooks" junto con sus imágenes almacenadas en Firebase Storage.

## ⚠️ ADVERTENCIA IMPORTANTE

**ESTA OPERACIÓN ES IRREVERSIBLE**. Una vez eliminados, los productos y sus imágenes no se pueden recuperar. Siempre ejecuta el respaldo antes de proceder con la eliminación.

## 📁 Archivos Incluidos

- `manageNotebooksProducts.js` - Script maestro para gestionar todo el proceso
- `backupNotebooksProducts.js` - Crea respaldo de productos antes de eliminar
- `deleteNotebooksProducts.js` - Elimina productos y sus imágenes de Firebase
- `verifyNotebooksDeletion.js` - Verifica que la eliminación fue exitosa

## 🚀 Uso Recomendado

### Opción 1: Proceso Completo (Recomendado)
```bash
cd backend/scripts
node manageNotebooksProducts.js full-process
```

Este comando ejecuta automáticamente:
1. ✅ Crear respaldo de todos los productos de notebooks
2. ⏸️ Pausa para confirmación manual
3. 🗑️ Eliminar productos y sus imágenes de Firebase
4. 🔍 Verificar que la eliminación fue exitosa

### Opción 2: Proceso Manual (Paso a Paso)

#### Paso 1: Crear Respaldo
```bash
cd backend/scripts
node manageNotebooksProducts.js backup
```

#### Paso 2: Eliminar Productos
```bash
cd backend/scripts
node manageNotebooksProducts.js delete --confirm
```

#### Paso 3: Verificar Eliminación
```bash
cd backend/scripts
node manageNotebooksProducts.js verify
```

## 📊 Qué Hace Cada Script

### 🔍 backupNotebooksProducts.js
- Busca todos los productos con subcategoría "notebooks"
- Crea un archivo JSON con todos los datos de los productos
- Genera un resumen en texto plano
- Guarda los archivos en `backend/backups/`

### 🗑️ deleteNotebooksProducts.js
- Busca productos de la subcategoría "notebooks"
- Extrae las rutas de Firebase de las URLs de imágenes
- Elimina cada imagen de Firebase Storage
- Elimina los productos de la base de datos MongoDB
- Proporciona estadísticas detalladas del proceso

### 🔍 verifyNotebooksDeletion.js
- Verifica que no queden productos de notebooks en la base de datos
- Busca variaciones como "laptop", "portátil", etc.
- Muestra estadísticas generales de la base de datos
- Confirma que la eliminación fue exitosa

## 📋 Requisitos Previos

1. **Conexión a MongoDB**: El script usa la variable de entorno `MONGODB_URI` o la configuración por defecto
2. **Configuración de Firebase**: El script usa las variables de entorno de Firebase o la configuración por defecto
3. **Permisos de Firebase**: El servicio debe tener permisos para eliminar archivos del Storage
4. **Node.js**: Versión 14 o superior

## 🔧 Variables de Entorno (Opcionales)

```bash
# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database

# Firebase
FIREBASE_API_KEY=tu_api_key
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_proyecto
FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
FIREBASE_APP_ID=tu_app_id
FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

## 📈 Ejemplo de Salida

```
[2024-01-20T10:30:00.000Z] INFO: 🚀 Iniciando eliminación de productos de notebooks...
[2024-01-20T10:30:01.000Z] PROGRESS: Conectando a MongoDB...
[2024-01-20T10:30:02.000Z] SUCCESS: ✅ Conectado a MongoDB
[2024-01-20T10:30:03.000Z] PROGRESS: Buscando productos de la subcategoría "notebooks"...
[2024-01-20T10:30:04.000Z] INFO: 📊 Encontrados 15 productos de notebooks
[2024-01-20T10:30:05.000Z] PROGRESS: 🗑️ Eliminando productos y sus imágenes...
[2024-01-20T10:30:30.000Z] SUCCESS: ✅ Producto eliminado: Dell Inspiron 15
[2024-01-20T10:30:45.000Z] SUCCESS: ✅ Producto eliminado: HP Pavilion 14
...
[2024-01-20T10:31:00.000Z] INFO: 📊 RESUMEN DE ELIMINACIÓN:
[2024-01-20T10:31:01.000Z] SUCCESS: ✅ Productos eliminados: 15/15
[2024-01-20T10:31:02.000Z] SUCCESS: ✅ Imágenes eliminadas: 45
[2024-01-20T10:31:03.000Z] SUCCESS: 🎉 ¡Eliminación completada exitosamente!
```

## 🛡️ Medidas de Seguridad

1. **Respaldo Automático**: Siempre se crea un respaldo antes de eliminar
2. **Confirmación Requerida**: El flag `--confirm` es obligatorio para eliminar
3. **Verificación Post-Eliminación**: Script de verificación para confirmar éxito
4. **Logging Detallado**: Registro completo de todas las operaciones
5. **Manejo de Errores**: Continúa el proceso aunque falle algún elemento individual

## 🔄 Recuperación de Datos

Si necesitas recuperar los datos eliminados:

1. Busca el archivo de respaldo en `backend/backups/`
2. El archivo JSON contiene todos los datos de los productos
3. **NOTA**: Las imágenes de Firebase no se pueden recuperar automáticamente
4. Para restaurar productos, necesitarías recrear las imágenes manualmente

## 🆘 Solución de Problemas

### Error: "No se pudo extraer ruta de Firebase"
- Verifica que las URLs de las imágenes sean válidas de Firebase Storage
- Algunas imágenes pueden estar en otros servicios (Cloudinary, etc.)

### Error: "storage/object-not-found"
- La imagen ya no existe en Firebase (no es un error crítico)
- El script continúa con el siguiente elemento

### Error: "Permiso denegado"
- Verifica la configuración de Firebase
- Asegúrate de que el servicio tenga permisos de eliminación

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs detallados en la consola
2. Verifica la configuración de Firebase y MongoDB
3. Asegúrate de tener los permisos necesarios
4. El respaldo siempre está disponible para recuperación manual

# 🔄 Guía de Sincronización de Categorías

## 📋 Resumen

Tu aplicación usa **DOS fuentes** de categorías:

1. **Base de Datos (MongoDB)** → Para operaciones dinámicas (UploadProduct, EditProduct, filtros)
2. **Archivos Hardcodeados** → Para UI rápida (Header, MenuCategorias, CategoryShowcase)

## ⚠️ **IMPORTANTE: ¿Cuándo sincronizar?**

Debes ejecutar los scripts de sincronización **CADA VEZ** que:

- ✅ Crees una nueva **categoría**
- ✅ Crees una nueva **subcategoría**
- ✅ Crees o modifiques **especificaciones**
- ✅ Cambies nombres, labels u orden
- ✅ Actives o desactives categorías/subcategorías

---

## 🚀 Métodos de Sincronización

### **Método 1: Script Combinado (RECOMENDADO) ⭐**

Este método ejecuta AMBOS scripts automáticamente:

```bash
# Desde el directorio backend
cd backend
npm run sync-categories

# O desde la raíz del proyecto
cd backend && npm run sync-categories
```

**✅ Ventajas:**
- Ejecuta todo en un solo comando
- Genera ambos archivos (backend + frontend)
- Muestra resumen completo

---

### **Método 2: Scripts Individuales**

Si necesitas ejecutar solo uno:

#### Sincronizar solo el Backend
```bash
cd backend
npm run export-categories
```
Genera: `/backend/data/categories-hardcoded.js`

#### Sincronizar solo el Frontend
```bash
cd backend
npm run export-to-frontend
```
Genera: `/frontend/src/helpers/productCategory.js`

---

## 📁 Archivos Generados

### **1. Backend: categories-hardcoded.js**

**Ubicación:** `/backend/data/categories-hardcoded.js`

**Contenido:** Categorías, subcategorías **Y especificaciones** completas

**Estructura:**
```javascript
const categoriesData = [
  {
    name: "informatica",
    label: "Informática",
    value: "informatica",
    order: 1,
    isActive: true,
    color: "#3B82F6",
    icon: "FaLaptop",
    subcategories: [
      {
        name: "notebooks",
        label: "Notebooks",
        value: "notebooks",
        order: 1,
        isActive: true,
        specifications: [
          {
            name: "processor",
            label: "Procesador",
            type: "text",
            placeholder: "Ej: Intel Core i5",
            required: true,
            order: 1
          }
          // ... más especificaciones
        ]
      }
      // ... más subcategorías
    ]
  }
  // ... más categorías
];
```

---

### **2. Frontend: productCategory.js**

**Ubicación:** `/frontend/src/helpers/productCategory.js`

**Contenido:** Solo categorías y subcategorías (**SIN especificaciones**)

**Estructura:**
```javascript
const productCategory = [
  {
    id: 1,
    value: "informatica",
    label: "Informática",
    subcategories: [
      {
        id: 1,
        value: "notebooks",
        label: "Notebooks"
      },
      {
        id: 2,
        value: "computadoras_ensambladas",
        label: "Computadoras Ensambladas"
      }
      // ... más subcategorías
    ]
  }
  // ... más categorías
];
```

**Por qué sin especificaciones:**
- Reduce el tamaño del bundle del frontend
- Mejora la velocidad de carga
- Solo se usa para navegación (menús, header)

---

## 🎯 ¿Quién Usa Cada Archivo?

### **Base de Datos (Dinámica)**

#### **useCategories** (hook)
- 📂 `UploadProduct.js` - Al crear productos
- 📂 `EditProduct.js` - Al editar productos (si existe)
- 📂 `DynamicProductSpecifications.js` - Renderiza especificaciones

#### **usePreloadedCategories** (hook con caché)
- 📂 `ProductDetails.js` - Muestra especificaciones del producto
- 📂 `CategoryProduct.js` - Filtros avanzados

---

### **Archivos Hardcodeados (Estática)**

#### **productCategory.js**
- 📂 `Header.js` → MenuCategorias
- 📂 `MenuCategorias.js` → Menú lateral
- 📂 `CategoryShowcase.js` → Galería de categorías

**Ventaja:** Carga instantánea sin consultas a BD

---

## 🔄 Flujo de Trabajo Completo

### **Escenario: Agregar una nueva categoría**

1. **Crear en la base de datos**
   ```javascript
   // Desde tu panel de administración o mediante API
   POST /api/admin/categories
   {
     "name": "electrodomesticos",
     "label": "Electrodomésticos",
     "value": "electrodomesticos",
     "order": 10,
     "isActive": true,
     "subcategories": [...]
   }
   ```

2. **Sincronizar archivos hardcodeados**
   ```bash
   cd backend
   npm run sync-categories
   ```

3. **Reiniciar aplicaciones**
   ```bash
   # Backend (si está corriendo)
   Ctrl+C
   npm run dev
   
   # Frontend (en otra terminal)
   Ctrl+C
   npm start
   ```

4. **Limpiar caché del navegador**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) o `Cmd+Shift+R` (Mac)

---

## 🤖 Automatización (Opcional)

### **Opción A: Hook de Git**

Puedes configurar un hook de Git para sincronizar automáticamente:

```bash
# Crear archivo .git/hooks/post-merge
#!/bin/bash
echo "🔄 Sincronizando categorías..."
cd backend && npm run sync-categories
```

```bash
# Dar permisos de ejecución
chmod +x .git/hooks/post-merge
```

---

### **Opción B: Endpoint en el Backend**

Puedes crear un endpoint protegido que ejecute la sincronización:

```javascript
// backend/routes/admin.js
router.post('/sync-categories', adminAuth, async (req, res) => {
  const { execSync } = require('child_process');
  try {
    execSync('npm run sync-categories', { cwd: __dirname });
    res.json({ success: true, message: 'Categorías sincronizadas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Luego desde el frontend:**
```javascript
// Botón en el panel de administración
const handleSyncCategories = async () => {
  await fetch('/api/admin/sync-categories', { method: 'POST' });
  toast.success('Categorías sincronizadas');
};
```

---

## 📊 Verificación Post-Sincronización

Después de sincronizar, verifica:

### **1. Archivos generados**
```bash
# Verificar que los archivos se actualizaron
ls -lh backend/data/categories-hardcoded.js
ls -lh frontend/src/helpers/productCategory.js

# Verificar fecha de modificación
stat backend/data/categories-hardcoded.js
```

### **2. Contenido correcto**
```bash
# Ver las primeras líneas del archivo
head -20 backend/data/categories-hardcoded.js

# Buscar una categoría específica
grep -A 5 "informatica" frontend/src/helpers/productCategory.js
```

### **3. En la aplicación**
- ✅ El menú del header muestra las nuevas categorías
- ✅ CategoryShowcase muestra las nuevas subcategorías
- ✅ UploadProduct carga las especificaciones correctas
- ✅ Los filtros funcionan con las nuevas categorías

---

## ⚠️ Problemas Comunes

### **Error: "Cannot connect to MongoDB"**

**Causa:** MongoDB no está corriendo o credenciales incorrectas

**Solución:**
```bash
# Verificar que MongoDB esté corriendo
# Si usas MongoDB Atlas, verifica tu conexión a internet
# Si es local:
sudo systemctl status mongodb
# O
brew services list | grep mongodb
```

---

### **Error: "Module not found"**

**Causa:** Dependencias no instaladas

**Solución:**
```bash
cd backend
npm install
```

---

### **Los cambios no se reflejan en el frontend**

**Causa:** Caché del navegador o del servidor de desarrollo

**Solución:**
```bash
# 1. Limpiar caché del navegador (Ctrl+Shift+R)

# 2. Reiniciar el servidor de desarrollo
cd frontend
npm start

# 3. Si sigue sin funcionar, limpiar caché de build
rm -rf frontend/build
rm -rf frontend/node_modules/.cache
npm start
```

---

### **Las especificaciones no aparecen en UploadProduct**

**Causa:** El hook `useCategories` está usando datos en caché

**Solución:**
```bash
# 1. Verificar que la BD tiene las especificaciones
mongosh
use Eccomercejm
db.categories.findOne({ value: "informatica" })

# 2. Reiniciar el backend
cd backend
npm run dev

# 3. Limpiar caché del hook (si existe)
# En useCategories.js, verificar que refreshCategories() funcione
```

---

## 📝 Resumen de Comandos

```bash
# ✅ COMANDO PRINCIPAL (usar siempre)
cd backend && npm run sync-categories

# Comandos individuales (solo si es necesario)
cd backend && npm run export-categories      # Solo backend
cd backend && npm run export-to-frontend     # Solo frontend

# Verificación
cd backend && npm run test-db                # Probar conexión a BD

# Población inicial (solo una vez)
cd backend && npm run populate-categories    # Poblar BD con categorías iniciales
```

---

## 🎯 Mejores Prácticas

1. **Siempre sincronizar después de cambios**
   - Crea un recordatorio en tu flujo de trabajo
   - Agrega al README del proyecto
   - Documenta en tu wiki interna

2. **Hacer backup antes de cambios grandes**
   ```bash
   # Backup de archivos hardcodeados
   cp backend/data/categories-hardcoded.js backend/data/categories-hardcoded.backup.js
   cp frontend/src/helpers/productCategory.js frontend/src/helpers/productCategory.backup.js
   ```

3. **Verificar cambios en Git**
   ```bash
   git diff backend/data/categories-hardcoded.js
   git diff frontend/src/helpers/productCategory.js
   ```

4. **Sincronizar en desarrollo, NO en producción**
   - Los archivos hardcodeados deben sincronizarse en desarrollo
   - Luego subir los cambios a Git
   - El servidor de producción usa los archivos del repositorio

5. **Documentar cambios importantes**
   - Si agregas una categoría nueva, documenta por qué
   - Si cambias especificaciones, avisa al equipo

---

## 🆘 Contacto y Soporte

Si tienes problemas con la sincronización:

1. Verifica que MongoDB esté corriendo
2. Revisa los logs de los scripts
3. Comprueba que los archivos se hayan generado
4. Reinicia backend y frontend
5. Limpia caché del navegador

---

## 📚 Archivos Relacionados

- 📂 `backend/models/categoryModel.js` - Modelo de MongoDB
- 📂 `backend/controller/category/categoryController.js` - API de categorías
- 📂 `backend/scripts/sync-categories.js` - Script maestro
- 📂 `backend/scripts/export-categories-to-code.js` - Exportar a backend
- 📂 `backend/scripts/export-categories-to-frontend.js` - Exportar a frontend
- 📂 `frontend/src/hooks/useCategories.js` - Hook de BD
- 📂 `frontend/src/hooks/usePreloadedCategories.js` - Hook con caché
- 📂 `frontend/src/helpers/productCategory.js` - Categorías hardcodeadas frontend

---

**Última actualización:** 2025-11-03  
**Versión:** 1.0



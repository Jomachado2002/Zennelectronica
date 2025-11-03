# 📦 Scripts de Gestión de Categorías - Resumen Completo

## 🎯 ¿Qué se ha creado?

He creado un sistema completo para poblar y gestionar las categorías en tu base de datos de forma automatizada.

### Archivos Creados

1. **`backend/scripts/populate-categories.js`** - Script principal para poblar categorías
2. **`backend/scripts/clear-categories.js`** - Script para limpiar/resetear categorías
3. **`backend/scripts/README_POPULATE_CATEGORIES.md`** - Documentación detallada

## 📊 Categorías Incluidas

El script incluye **6 categorías principales** con **27 subcategorías** y más de **150 especificaciones**:

### 1. 🖥️ Informática (9 subcategorías)
- Notebooks (7 especificaciones)
- Computadoras Ensambladas (7 especificaciones)
- Placas Madre (5 especificaciones)
- Tarjetas Gráficas (6 especificaciones)
- Gabinetes (6 especificaciones)
- Memorias RAM (5 especificaciones)
- Discos Duros (6 especificaciones)
- Procesadores (6 especificaciones)

### 2. ⌨️ Periféricos (6 subcategorías)
- Monitores (5 especificaciones)
- Teclados (4 especificaciones)
- Mouses (4 especificaciones)
- Auriculares (4 especificaciones)
- Parlantes (4 especificaciones)
- Webcams (4 especificaciones)

### 3. 📱 Telefonía (3 subcategorías)
- Teléfonos Móviles (6 especificaciones)
- Tablets (5 especificaciones)
- Smartwatches (5 especificaciones)

### 4. 🎮 Gaming (3 subcategorías)
- Consolas (4 especificaciones)
- Mandos y Controles (3 especificaciones)
- Sillas Gaming (4 especificaciones)

### 5. 📹 Audio y Video (2 subcategorías)
- Cámaras de Fotografía (4 especificaciones)
- Televisores (5 especificaciones)

### 6. 🔌 Accesorios (4 subcategorías)
- Cables (3 especificaciones)
- Cargadores (4 especificaciones)
- Fundas y Protectores (3 especificaciones)
- Baterías y Powerbanks (3 especificaciones)

## 🚀 Cómo Usar los Scripts

### ✅ Para POBLAR Categorías

Hay **3 formas** de ejecutar el script:

#### Opción 1: Usando npm (Recomendado)
```bash
cd backend
npm run populate-categories
```

#### Opción 2: Usando node directamente desde la raíz
```bash
node backend/scripts/populate-categories.js
```

#### Opción 3: Con una URI de MongoDB específica
```bash
MONGODB_URI="mongodb://localhost:27017/tu_base_de_datos" npm run populate-categories
```

### 🗑️ Para LIMPIAR Categorías

```bash
cd backend
npm run clear-categories
```

⚠️ **ADVERTENCIA**: Este script te pedirá confirmación antes de eliminar todas las categorías.

## 📋 Ejemplo de Ejecución Completa

```bash
# 1. Navegar al directorio backend
cd /Users/josiasnicolas02gmail.com/Desktop/ZennElectronica/backend

# 2. Poblar las categorías
npm run populate-categories

# Salida esperada:
# ═══════════════════════════════════════════════════
#    SCRIPT DE POBLACIÓN DE CATEGORÍAS
# ═══════════════════════════════════════════════════
# 
# ✅ Conectado a MongoDB exitosamente
# 
# 🔄 Iniciando proceso de población de categorías...
# 
# ✅ Categoría "Informática" creada con 9 subcategorías
# ✅ Categoría "Periféricos" creada con 6 subcategorías
# ✅ Categoría "Telefonía" creada con 3 subcategorías
# ✅ Categoría "Gaming" creada con 3 subcategorías
# ✅ Categoría "Audio y Video" creada con 2 subcategorías
# ✅ Categoría "Accesorios" creada con 4 subcategorías
# 
# 📊 RESUMEN DEL PROCESO:
#    • Categorías creadas: 6
#    • Categorías actualizadas: 0
#    • Categorías omitidas: 0
# 
# 🔍 Verificando categorías en la base de datos...
# 
# 📦 Total de categorías: 6
# 
# ═══════════════════════════════════════════════════
#    ✨ SCRIPT COMPLETADO EXITOSAMENTE ✨
# ═══════════════════════════════════════════════════
```

## 🔄 Características del Script

### ✅ Idempotente
Puedes ejecutar el script múltiples veces sin problemas:
- **Primera vez**: Crea todas las categorías
- **Veces siguientes**: Actualiza las categorías existentes

### ✅ Inteligente
- Detecta automáticamente si una categoría ya existe
- No duplica categorías
- Preserva datos existentes
- Actualiza solo lo necesario

### ✅ Seguro
- No elimina categorías existentes
- No afecta productos asociados
- Muestra un resumen detallado de lo que hace
- Tiene validaciones integradas

## 🎨 Estructura de una Categoría

```javascript
{
  name: "informatica",              // Nombre interno (único)
  label: "Informática",             // Nombre visible
  value: "informatica",             // Valor para referencias (único)
  order: 1,                         // Orden de visualización
  color: "#3B82F6",                 // Color en hex
  icon: "FaLaptop",                 // Icono de React Icons
  subcategories: [
    {
      name: "notebooks",            // Nombre interno
      label: "Notebooks",           // Nombre visible
      value: "notebooks",           // Valor para referencias
      order: 1,                     // Orden dentro de la categoría
      specifications: [
        {
          name: "processor",        // Campo en el modelo de producto
          label: "Procesador",      // Label del formulario
          type: "text",             // Tipo: text, number, boolean, select
          placeholder: "Ej: Intel Core i5",
          required: true,           // Si es obligatorio
          order: 1                  // Orden en el formulario
        }
      ]
    }
  ]
}
```

## 🛠️ Modificar las Categorías

Para agregar o modificar categorías:

1. Abre el archivo: `backend/scripts/populate-categories.js`
2. Busca el array `categoriesData`
3. Agrega o modifica las categorías según la estructura mostrada arriba
4. Ejecuta el script nuevamente: `npm run populate-categories`

### Ejemplo: Agregar una nueva categoría

```javascript
const categoriesData = [
  // ... categorías existentes ...
  {
    name: "hogar",
    label: "Hogar y Oficina",
    value: "hogar",
    order: 7,
    color: "#14B8A6",
    icon: "FaHome",
    subcategories: [
      {
        name: "electrodomesticos",
        label: "Electrodomésticos",
        value: "electrodomesticos",
        order: 1,
        specifications: [
          { 
            name: "power", 
            label: "Potencia", 
            type: "text", 
            placeholder: "Ej: 1200W",
            required: true, 
            order: 1 
          },
          { 
            name: "voltage", 
            label: "Voltaje", 
            type: "text", 
            placeholder: "Ej: 220V",
            required: true, 
            order: 2 
          }
        ]
      }
    ]
  }
];
```

## 🧪 Verificar en MongoDB

Para verificar que las categorías se crearon correctamente:

```bash
# 1. Conectarse a MongoDB
mongosh

# 2. Seleccionar la base de datos
use zennelectronica

# 3. Ver todas las categorías
db.categories.find().pretty()

# 4. Contar categorías
db.categories.countDocuments()

# 5. Ver solo los nombres de las categorías
db.categories.find({}, {label: 1, _id: 0})

# 6. Ver una categoría específica con sus subcategorías
db.categories.findOne({value: "informatica"})
```

## 🔍 Troubleshooting

### ❌ Error: "Cannot connect to MongoDB"

**Solución:**
```bash
# Verificar que MongoDB esté corriendo
brew services list | grep mongodb

# Si no está corriendo, iniciarlo
brew services start mongodb-community

# O usando mongod directamente
mongod --config /usr/local/etc/mongod.conf
```

### ❌ Error: "E11000 duplicate key error"

**Problema:** Hay valores duplicados en name o value.

**Solución:**
```bash
# Limpiar categorías duplicadas
npm run clear-categories

# Volver a poblar
npm run populate-categories
```

### ❌ Las categorías no aparecen en el frontend

**Soluciones:**
1. Verifica que el backend esté corriendo
2. Limpia la caché del navegador (Cmd + Shift + R)
3. Reinicia el servidor backend
4. Verifica la conexión a MongoDB en el backend

### ❌ El script no actualiza las categorías existentes

**Solución:**
El script busca por el campo `value`. Asegúrate de que:
- Los `value` en el script coincidan con los de la BD
- No hayas modificado manualmente los valores en la BD

## 📊 Flujo de Trabajo Recomendado

### Desarrollo (Primera vez)
```bash
# 1. Limpiar base de datos
npm run clear-categories

# 2. Poblar categorías
npm run populate-categories

# 3. Verificar en MongoDB
mongosh
use zennelectronica
db.categories.find().count()
```

### Agregar Nuevas Categorías
```bash
# 1. Modificar backend/scripts/populate-categories.js
# 2. Ejecutar el script (actualizará automáticamente)
npm run populate-categories
```

### Producción
```bash
# Solo ejecutar una vez
MONGODB_URI="mongodb://tu-uri-produccion" npm run populate-categories
```

## 📝 Notas Importantes

1. **Backup**: Siempre haz un backup de la base de datos antes de ejecutar scripts en producción.

2. **Variables de Entorno**: El script usa la variable `MONGODB_URI` del archivo `.env` o del entorno.

3. **No Elimina**: El script de población NO elimina categorías existentes que no estén en el array.

4. **Productos**: Los productos existentes NO se ven afectados por estos scripts.

5. **Especificaciones**: Las especificaciones se usan para generar campos dinámicos en el formulario de creación de productos.

## 🎯 Próximos Pasos

Después de ejecutar el script:

1. ✅ Verifica en MongoDB que las categorías se crearon
2. ✅ Inicia tu aplicación backend
3. ✅ Prueba crear un producto con las nuevas categorías
4. ✅ Verifica que las especificaciones aparezcan en el formulario

## 💡 Tips Útiles

- **Colores sugeridos para categorías:**
  - Azul: `#3B82F6` (Informática)
  - Verde: `#10B981` (Periféricos)
  - Púrpura: `#8B5CF6` (Telefonía)
  - Rojo: `#EF4444` (Gaming)
  - Naranja: `#F59E0B` (Audio/Video)
  - Índigo: `#6366F1` (Accesorios)

- **Iconos disponibles:** Usa los iconos de React Icons (https://react-icons.github.io/react-icons/)
  - FaLaptop, FaKeyboard, FaMobile, FaGamepad, FaVideo, FaPlug, etc.

- **Tipos de especificaciones:**
  - `text`: Campos de texto libre
  - `number`: Solo números
  - `boolean`: Sí/No (checkbox)
  - `select`: Lista desplegable (requiere campo `options`)

## 📚 Recursos Relacionados

- **Modelo de Categorías**: `backend/models/categoryModel.js`
- **Controlador de Categorías**: `backend/controller/category/categoryController.js`
- **Rutas de Categorías**: `backend/routes/categoryRoutes.js`
- **Modelo de Productos**: `backend/models/productModel.js`

---

✨ **¡Todo listo para usar!** Ejecuta `npm run populate-categories` y tendrás tu base de datos poblada con todas las categorías y especificaciones.


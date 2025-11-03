# Script de Población de Categorías

Este script pobla la base de datos con categorías, subcategorías y especificaciones predefinidas para el sistema de productos.

## 📋 ¿Qué hace el script?

El script `populate-categories.js` realiza las siguientes acciones:

1. **Lee categorías hardcodeadas**: Contiene una estructura completa de categorías con sus subcategorías y especificaciones.
2. **Conecta a MongoDB**: Se conecta a tu base de datos MongoDB.
3. **Inserta o actualiza**: 
   - Si una categoría NO existe, la crea.
   - Si una categoría YA existe, la actualiza con los nuevos datos.
4. **Verifica el resultado**: Muestra un resumen de las categorías creadas/actualizadas.

## 🏗️ Estructura de Categorías Incluidas

### 1. **Informática** 🖥️
- Notebooks
- Computadoras Ensambladas
- Placas Madre
- Tarjetas Gráficas
- Gabinetes
- Memorias RAM
- Discos Duros
- Procesadores

### 2. **Periféricos** ⌨️
- Monitores
- Teclados
- Mouses
- Auriculares
- Parlantes
- Webcams

### 3. **Telefonía** 📱
- Teléfonos Móviles
- Tablets
- Smartwatches

### 4. **Gaming** 🎮
- Consolas
- Mandos y Controles
- Sillas Gaming

### 5. **Audio y Video** 📹
- Cámaras de Fotografía
- Televisores

### 6. **Accesorios** 🔌
- Cables
- Cargadores
- Fundas y Protectores
- Baterías y Powerbanks

## 🚀 Cómo usar el script

### Opción 1: Desde la raíz del proyecto

```bash
node backend/scripts/populate-categories.js
```

### Opción 2: Desde el directorio backend

```bash
cd backend
node scripts/populate-categories.js
```

### Opción 3: Con una URI de MongoDB específica

```bash
MONGODB_URI="mongodb://localhost:27017/tu_base_de_datos" node backend/scripts/populate-categories.js
```

## 📊 Salida del Script

El script mostrará información detallada durante su ejecución:

```
═══════════════════════════════════════════════════
   SCRIPT DE POBLACIÓN DE CATEGORÍAS
═══════════════════════════════════════════════════

✅ Conectado a MongoDB exitosamente

🔄 Iniciando proceso de población de categorías...

✅ Categoría "Informática" creada con 9 subcategorías
✅ Categoría "Periféricos" creada con 6 subcategorías
...

📊 RESUMEN DEL PROCESO:
   • Categorías creadas: 6
   • Categorías actualizadas: 0
   • Categorías omitidas: 0

🔍 Verificando categorías en la base de datos...

📦 Total de categorías: 6

📁 Informática (informatica)
   • Subcategorías: 9
     └─ Notebooks (notebooks) - 7 especificaciones
     └─ Computadoras Ensambladas (computadoras_ensambladas) - 7 especificaciones
     ...

═══════════════════════════════════════════════════
   ✨ SCRIPT COMPLETADO EXITOSAMENTE ✨
═══════════════════════════════════════════════════
```

## ⚙️ Configuración

### Variables de Entorno

El script utiliza la siguiente variable de entorno:

- `MONGODB_URI`: URI de conexión a MongoDB (por defecto: `mongodb://localhost:27017/zennelectronica`)

### Modificar las Categorías

Si necesitas agregar o modificar categorías, edita el array `categoriesData` en el archivo `populate-categories.js`:

```javascript
const categoriesData = [
  {
    name: "nombre_interno",
    label: "Nombre Visible",
    value: "valor_unico",
    order: 1,
    color: "#3B82F6",
    icon: "FaIcon",
    subcategories: [
      {
        name: "subcategoria_interna",
        label: "Subcategoría Visible",
        value: "subcategoria_valor",
        order: 1,
        specifications: [
          { 
            name: "campo_interno", 
            label: "Campo Visible", 
            type: "text", // text, number, boolean, select
            placeholder: "Texto de ayuda",
            required: true,
            order: 1 
          }
        ]
      }
    ]
  }
];
```

## 🔄 Actualización de Categorías Existentes

El script es **idempotente**, lo que significa que puedes ejecutarlo múltiples veces sin problemas:

- **Primera ejecución**: Crea todas las categorías.
- **Ejecuciones posteriores**: Actualiza las categorías existentes con los nuevos datos.

Esto es útil para:
- Agregar nuevas especificaciones a subcategorías existentes
- Modificar labels o nombres
- Agregar nuevas subcategorías a categorías existentes

## ⚠️ Notas Importantes

1. **No elimina categorías**: El script NO elimina categorías existentes que no estén en el array `categoriesData`.
2. **Respeta los productos**: Las categorías y subcategorías asociadas a productos existentes se mantienen intactas.
3. **Backup recomendado**: Aunque el script es seguro, se recomienda hacer un backup de la base de datos antes de ejecutarlo en producción.

## 🛠️ Troubleshooting

### Error: "Cannot connect to MongoDB"

Verifica que:
- MongoDB esté corriendo
- La URI de conexión sea correcta
- Tengas permisos de acceso a la base de datos

### Error: "E11000 duplicate key error"

Esto significa que hay un conflicto de valores únicos. Verifica:
- Que no haya valores duplicados en `name` o `value` de categorías/subcategorías
- Que la base de datos no tenga datos corruptos

### El script no actualiza las categorías

Si el script indica que actualizó categorías pero no ves los cambios:
- Verifica que estés conectado a la base de datos correcta
- Limpia la caché de la aplicación
- Reinicia el servidor backend

## 📝 Ejemplo de Uso Completo

```bash
# 1. Asegúrate de estar en el directorio correcto
cd /ruta/a/ZennElectronica

# 2. Verifica que MongoDB esté corriendo
# (En otra terminal)
mongosh

# 3. Ejecuta el script
node backend/scripts/populate-categories.js

# 4. Verifica en MongoDB que las categorías se crearon
mongosh
use zennelectronica
db.categories.find().pretty()
```

## 🎯 Próximos Pasos

Después de ejecutar el script:

1. Verifica en tu panel de administración que las categorías aparezcan correctamente
2. Prueba crear un producto con las nuevas categorías y especificaciones
3. Si necesitas más categorías, modifica el archivo y vuelve a ejecutar el script

## 📚 Recursos Adicionales

- Modelo de Categorías: `backend/models/categoryModel.js`
- Controlador de Categorías: `backend/controller/category/categoryController.js`
- Modelo de Productos: `backend/models/productModel.js`


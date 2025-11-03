# 🚀 Guía Rápida - Scripts de Categorías

## ⚡ Comandos Rápidos

```bash
# Ir al directorio backend
cd backend

# 1. Verificar conexión a MongoDB
npm run test-db

# 2. Poblar categorías (crea o actualiza)
npm run populate-categories

# 3. Limpiar categorías (elimina todas - pide confirmación)
npm run clear-categories
```

## 📋 Uso Típico

### Primera vez (Base de datos vacía)
```bash
cd backend
npm run populate-categories
```

### Agregar nuevas categorías
1. Edita: `backend/scripts/populate-categories.js`
2. Modifica el array `categoriesData`
3. Ejecuta: `npm run populate-categories`

### Resetear todo
```bash
cd backend
npm run clear-categories    # Escribir "SI" para confirmar
npm run populate-categories # Poblar de nuevo
```

## 📦 ¿Qué Incluye?

- **6 categorías** principales
- **27 subcategorías** 
- **150+ especificaciones** detalladas

### Categorías:
1. 🖥️ Informática (9 subcategorías)
2. ⌨️ Periféricos (6 subcategorías)
3. 📱 Telefonía (3 subcategorías)
4. 🎮 Gaming (3 subcategorías)
5. 📹 Audio y Video (2 subcategorías)
6. 🔌 Accesorios (4 subcategorías)

## 🔧 Variables de Entorno

Por defecto usa: `mongodb://localhost:27017/zennelectronica`

Para usar otra:
```bash
MONGODB_URI="tu-uri-aqui" npm run populate-categories
```

## ✅ Verificar en MongoDB

```bash
mongosh
use zennelectronica
db.categories.find().count()       # Ver total
db.categories.find().pretty()      # Ver todas
```

## ⚠️ Importante

- El script **NO elimina** categorías existentes
- Es **seguro** ejecutarlo múltiples veces
- **Actualiza** categorías si ya existen
- **NO afecta** productos existentes

## 🐛 Problemas Comunes

### MongoDB no conecta
```bash
# Iniciar MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Categorías duplicadas
```bash
npm run clear-categories
npm run populate-categories
```

## 📚 Documentación Completa

Ver: `SCRIPTS_CATEGORIAS_RESUMEN.md` (raíz del proyecto)
Ver: `README_POPULATE_CATEGORIES.md` (backend/scripts/)

---

**¿Listo?** → `cd backend && npm run populate-categories` 🚀


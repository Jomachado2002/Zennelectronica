# 🚀 Guía Rápida de Sincronización

## ¿Cuándo sincronizar?

**Ejecuta este comando CADA VEZ que:**
- ✅ Crees/modifiques una categoría
- ✅ Crees/modifiques una subcategoría
- ✅ Crees/modifiques especificaciones

---

## 💻 Comando Principal

```bash
cd backend && npm run sync-categories
```

---

## 📊 ¿Qué hace?

```
┌─────────────────────────────────────────┐
│  1. Lee categorías desde MongoDB       │
└─────────────────┬───────────────────────┘
                  │
                  ├─► Genera: backend/data/categories-hardcoded.js
                  │   (Con especificaciones completas)
                  │
                  └─► Genera: frontend/src/helpers/productCategory.js
                      (Solo categorías y subcategorías)
```

---

## 🔄 Flujo Completo

```bash
# 1. Hacer cambios en la BD (desde tu panel admin o API)
# ...

# 2. Sincronizar
cd backend
npm run sync-categories

# 3. Reiniciar servidores (si están corriendo)
# Backend: Ctrl+C → npm run dev
# Frontend: Ctrl+C → npm start

# 4. Limpiar caché del navegador
# Chrome/Edge: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
```

---

## 📋 Verificación Rápida

✅ **Verifica que funcionó:**
- Archivos actualizados (revisa fecha de modificación)
- Menú del header muestra cambios
- UploadProduct carga especificaciones correctas
- Filtros funcionan con nuevas categorías

❌ **Si no funciona:**
1. Verifica que MongoDB esté corriendo
2. Reinicia backend y frontend
3. Limpia caché del navegador (Ctrl+Shift+R)
4. Revisa la consola por errores

---

## 🎯 Arquitectura del Sistema

### HARDCODED (Archivos estáticos - Rápido)
```
📄 productCategory.js
   └─► Header (Menú principal)
   └─► MenuCategorias (Menú lateral)
   └─► CategoryShowcase (Galería)
```

### BASE DE DATOS (Consultas dinámicas - Flexible)
```
🗄️  MongoDB (categorías con especificaciones)
   └─► UploadProduct (Crear productos)
   └─► EditProduct (Editar productos)
   └─► ProductDetails (Mostrar especificaciones)
   └─► Filtros (CategoryProduct)
```

---

## 💡 Scripts Adicionales

```bash
# Solo backend (categories-hardcoded.js)
npm run export-categories

# Solo frontend (productCategory.js)
npm run export-to-frontend

# Poblar BD con categorías iniciales (solo una vez)
npm run populate-categories

# Limpiar todas las categorías de la BD
npm run clear-categories
```

---

## 📚 Documentación Completa

Ver: `GUIA_SINCRONIZACION_CATEGORIAS.md`

---

**⚡ Tip:** Crea un alias en tu terminal para sincronizar más rápido:

```bash
# En tu ~/.bashrc o ~/.zshrc
alias sync-cat="cd ~/Desktop/ZennElectronica/backend && npm run sync-categories"

# Luego solo ejecuta:
sync-cat
```



# 🔐 SISTEMA DE PERMISOS GRANULAR IMPLEMENTADO

## 📋 Descripción del Sistema

Se ha implementado un sistema de permisos granular con 3 tipos de usuarios y permisos específicos configurables para cada módulo y acción.

### 🎯 **Tipos de Usuario:**

1. **ROOT** - Acceso completo a todo el sistema
2. **ADMIN** - Con permisos específicos configurables
3. **GENERAL** - Usuario normal sin acceso administrativo

## 🏗️ **Arquitectura del Sistema**

### 1. **Modelo de Usuario Actualizado**
**Archivo**: `backend/models/userModel.js`

```javascript
role: {
    type: String,
    enum: ['ROOT', 'ADMIN', 'GENERAL'],
    default: 'GENERAL'
},

permissions: {
    // Panel de administración
    adminPanel: { type: Boolean, default: false },
    
    // Gestión de productos
    products: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        upload: { type: Boolean, default: false }
    },
    
    // Gestión de categorías
    categories: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión de inventario
    inventory: {
        view: { type: Boolean, default: false },
        sync: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        import: { type: Boolean, default: false }
    },
    
    // Gestión de usuarios
    users: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión financiera
    finances: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        reports: { type: Boolean, default: false }
    },
    
    // Gestión de ventas
    sales: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión de compras
    purchases: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión de clientes
    clients: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión de proveedores
    suppliers: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión de presupuestos
    budgets: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Gestión de transacciones Bancard
    bancard: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
    },
    
    // Configuración del sistema
    settings: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false }
    }
}
```

### 2. **Permisos por Defecto**

#### **ROOT** - Acceso Completo:
```javascript
{
    adminPanel: true,
    products: { view: true, create: true, edit: true, delete: true, upload: true },
    categories: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, sync: true, update: true, import: true },
    users: { view: true, create: true, edit: true, delete: true },
    finances: { view: true, create: true, edit: true, reports: true },
    sales: { view: true, create: true, edit: true, delete: true },
    purchases: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    suppliers: { view: true, create: true, edit: true, delete: true },
    budgets: { view: true, create: true, edit: true, delete: true },
    bancard: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, edit: true }
}
```

#### **ADMIN** - Solo Visualización por Defecto:
```javascript
{
    adminPanel: true,
    products: { view: true, create: false, edit: false, delete: false, upload: false },
    categories: { view: true, create: false, edit: false, delete: false },
    inventory: { view: true, sync: false, update: false, import: false },
    users: { view: true, create: false, edit: false, delete: false },
    finances: { view: true, create: false, edit: false, reports: false },
    sales: { view: true, create: false, edit: false, delete: false },
    purchases: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    suppliers: { view: true, create: false, edit: false, delete: false },
    budgets: { view: true, create: false, edit: false, delete: false },
    bancard: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, edit: false }
}
```

#### **GENERAL** - Sin Acceso Administrativo:
```javascript
{
    adminPanel: false,
    // Todos los permisos en false
}
```

### 3. **Helper de Permisos Granular**
**Archivo**: `backend/helpers/granularPermission.js`

**Funciones principales:**
- `checkPermission(userId, module, action)` - Verificar permiso específico
- `hasAdminPanelAccess(userId)` - Verificar acceso al admin panel
- `getUserPermissions(userId)` - Obtener todos los permisos del usuario
- `requirePermission(module, action)` - Middleware para rutas

### 4. **Controlador de Permisos**
**Archivo**: `backend/controller/user/userPermissionsController.js`

**Endpoints disponibles:**
- `GET /api/permissions/me` - Obtener permisos del usuario actual
- `GET /api/permissions/check?module=X&action=Y` - Verificar permiso específico
- `GET /api/admin/users-with-permissions` - Ver todos los usuarios (solo ROOT)
- `POST /api/admin/users` - Crear usuario con permisos (solo ROOT)
- `PUT /api/admin/users/:userId/permissions` - Actualizar permisos (solo ROOT)

## 🚀 **Cómo Usar el Sistema**

### 1. **Migrar Usuarios Existentes**
```bash
cd backend
node scripts/migratePermissions.js
```

### 2. **Verificar Permisos en el Frontend**
```javascript
// Obtener permisos del usuario
const response = await fetch('/api/permissions/me', {
    headers: { 'Cookie': `token=${userToken}` }
});
const { data } = await response.json();

// Verificar si puede ver productos
if (data.permissions.products.view) {
    // Mostrar sección de productos
}

// Verificar si puede crear productos
if (data.permissions.products.create) {
    // Mostrar botón de crear producto
}
```

### 3. **Configurar Permisos desde ROOT**
```javascript
// Actualizar permisos de un usuario ADMIN
const response = await fetch(`/api/admin/users/${userId}/permissions`, {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${rootToken}`
    },
    body: JSON.stringify({
        permissions: {
            adminPanel: true,
            products: {
                view: true,
                create: true,
                edit: true,
                delete: false,
                upload: true
            },
            categories: {
                view: true,
                create: false,
                edit: false,
                delete: false
            }
            // ... otros permisos
        }
    })
});
```

### 4. **Proteger Rutas en el Backend**
```javascript
// Ejemplo de ruta protegida
router.post('/cargar-producto', 
    authToken, 
    requirePermission('products', 'upload'), 
    UploadProductController
);

// Ejemplo de middleware personalizado
router.get('/admin/products', 
    authToken, 
    requirePermission('products', 'view'), 
    getProductsController
);
```

## 📊 **Ventajas del Sistema**

1. **Granularidad**: Control específico por módulo y acción
2. **Flexibilidad**: Permisos configurables por usuario
3. **Seguridad**: ROOT tiene control total, otros roles limitados
4. **Escalabilidad**: Fácil agregar nuevos módulos y permisos
5. **Auditoría**: Logs detallados de verificaciones de permisos

## 🔧 **Implementación en el Frontend**

### 1. **Hook para Permisos**
```javascript
const usePermissions = () => {
    const [permissions, setPermissions] = useState(null);
    
    useEffect(() => {
        fetchPermissions();
    }, []);
    
    const fetchPermissions = async () => {
        const response = await fetch('/api/permissions/me');
        const { data } = await response.json();
        setPermissions(data.permissions);
    };
    
    const hasPermission = (module, action) => {
        if (!permissions) return false;
        return permissions[module]?.[action] || false;
    };
    
    return { permissions, hasPermission };
};
```

### 2. **Componente Condicional**
```javascript
const ConditionalComponent = ({ module, action, children }) => {
    const { hasPermission } = usePermissions();
    
    if (!hasPermission(module, action)) {
        return null;
    }
    
    return children;
};

// Uso
<ConditionalComponent module="products" action="create">
    <CreateProductButton />
</ConditionalComponent>
```

## 🎯 **Próximos Pasos**

1. **Ejecutar migración**: `node scripts/migratePermissions.js`
2. **Configurar permisos**: Desde el panel ROOT asignar permisos específicos
3. **Implementar en frontend**: Usar hooks y componentes condicionales
4. **Probar sistema**: Verificar que cada usuario ve solo lo permitido

¡El sistema de permisos granular está listo para usar! 🎉

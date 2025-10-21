// backend/helpers/granularPermission.js - SISTEMA DE PERMISOS GRANULAR

const userModel = require("../models/userModel");

/**
 * Verifica si un usuario tiene un permiso específico
 * @param {string} userId - ID del usuario
 * @param {string} module - Módulo (products, categories, inventory, etc.)
 * @param {string} action - Acción (view, create, edit, delete, etc.)
 * @returns {boolean} - true si tiene permiso, false si no
 */
const checkPermission = async (userId, module, action) => {
    try {
        // console.log removed for production
        
        // Verificar que el userId existe
        if (!userId) {
            // console.log removed for production
            return false;
        }

        // Rechazar usuarios invitados
        if (typeof userId === 'string' && userId.startsWith('guest-')) {
            // console.log removed for production
            return false;
        }

        // Buscar usuario en la base de datos
        const user = await userModel.findById(userId).select('role permissions');
        
        if (!user) {
            // console.log removed for production
            return false;
        }

        // Verificar que el usuario esté activo
        if (user.isActive === false) {
            // console.log removed for production
            return false;
        }

        console.log('👤 Usuario encontrado:', {
            id: user._id,
            role: user.role,
            permissions: user.permissions
        });

        // ROOT tiene acceso completo a todo
        if (user.role === 'ROOT') {
            // console.log removed for production
            return true;
        }

        // Verificar permisos específicos
        if (user.permissions && user.permissions[module]) {
            const modulePermissions = user.permissions[module];
            
            // Si es un objeto (como products.view), verificar la acción específica
            if (typeof modulePermissions === 'object' && action) {
                const hasPermission = modulePermissions[action] === true;
                // console.log removed for production
                return hasPermission;
            }
            
            // Si es un boolean (como adminPanel), devolver directamente
            if (typeof modulePermissions === 'boolean') {
                // console.log removed for production
                return modulePermissions;
            }
        }

        // console.log removed for production
        return false;
        
    } catch (error) {
        // console.error removed for production
        return false;
    }
};

/**
 * Verifica múltiples permisos de una vez
 * @param {string} userId - ID del usuario
 * @param {Array} permissions - Array de permisos a verificar [{module, action}, ...]
 * @returns {Object} - Objeto con el resultado de cada permiso
 */
const checkMultiplePermissions = async (userId, permissions) => {
    const results = {};
    
    for (const permission of permissions) {
        const { module, action } = permission;
        results[`${module}.${action || 'module'}`] = await checkPermission(userId, module, action);
    }
    
    return results;
};

/**
 * Verifica si el usuario tiene acceso al panel de administración
 * @param {string} userId - ID del usuario
 * @returns {boolean}
 */
const hasAdminPanelAccess = async (userId) => {
    return await checkPermission(userId, 'adminPanel');
};

/**
 * Verifica si el usuario puede realizar una acción específica en un módulo
 * @param {string} userId - ID del usuario
 * @param {string} module - Módulo
 * @param {string} action - Acción
 * @returns {boolean}
 */
const canPerformAction = async (userId, module, action) => {
    return await checkPermission(userId, module, action);
};

/**
 * Obtiene todos los permisos del usuario
 * @param {string} userId - ID del usuario
 * @returns {Object} - Objeto con todos los permisos del usuario
 */
const getUserPermissions = async (userId) => {
    try {
        if (!userId || (typeof userId === 'string' && userId.startsWith('guest-'))) {
            return null;
        }

        const user = await userModel.findById(userId).select('role permissions');
        
        if (!user) {
            return null;
        }

        // ROOT tiene todos los permisos
        if (user.role === 'ROOT') {
            return {
                role: 'ROOT',
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
            };
        }

        return {
            role: user.role,
            ...user.permissions
        };
        
    } catch (error) {
        // console.error removed for production
        return null;
    }
};

/**
 * Middleware para verificar permisos en rutas
 * @param {string} module - Módulo
 * @param {string} action - Acción
 * @returns {Function} - Middleware function
 */
const requirePermission = (module, action) => {
    return async (req, res, next) => {
        try {
            const hasPermission = await checkPermission(req.userId, module, action);
            
            if (!hasPermission) {
                // console.log removed for production
                return res.status(403).json({
                    message: `No tienes permisos para realizar esta acción`,
                    error: true,
                    success: false,
                    requiredPermission: `${module}.${action || 'module'}`
                });
            }
            
            // console.log removed for production
            next();
            
        } catch (error) {
            // console.error removed for production
            return res.status(500).json({
                message: 'Error verificando permisos',
                error: true,
                success: false
            });
        }
    };
};

/**
 * Middleware para verificar acceso al panel de administración
 * @returns {Function} - Middleware function
 */
const requireAdminPanel = () => {
    return requirePermission('adminPanel');
};

module.exports = {
    checkPermission,
    checkMultiplePermissions,
    hasAdminPanelAccess,
    canPerformAction,
    getUserPermissions,
    requirePermission,
    requireAdminPanel
};

// backend/helpers/permission.js - VERSIÓN CON SISTEMA GRANULAR
const userModel = require("../models/userModel");
const { hasAdminPanelAccess } = require('./granularPermission');

const uploadProductPermission = async (userId) => {
    try {
        console.log('🔐 Verificando permisos de administración para usuario:', userId);
        
        // Verificar acceso al panel de administración usando el sistema granular
        const hasAccess = await hasAdminPanelAccess(userId);
        
        console.log('✅ Resultado verificación permisos:', hasAccess);
        return hasAccess;
        
    } catch (error) {
        console.error("❌ Error verificando permisos:", error);
        return false;
    }
}

// ✅ NUEVA FUNCIÓN: Verificar si usuario puede realizar compras
const canUserMakePurchase = async (userId) => {
    try {
        
        
        
        // ✅ PERMITIR USUARIOS INVITADOS PARA COMPRAS
        if (!userId) {
            
            return true;
        }

        // ✅ PERMITIR USUARIOS INVITADOS (guest-xxxx)
        if (typeof userId === 'string' && userId.startsWith('guest-')) {
            
            return true;
        }

        // ✅ VERIFICAR USUARIOS REGISTRADOS
        const user = await userModel.findById(userId);
        
        if (!user) {
            
            return true; // ✅ Si no se encuentra, permitir como invitado
        }
        
        // ✅ VERIFICAR QUE EL USUARIO ESTÉ ACTIVO
        if (user.isActive === false) {
            
            return false;
        }
        
        // ✅ USUARIOS REGISTRADOS ACTIVOS PUEDEN COMPRAR
        
        return true;
        
    } catch (error) {
        console.error("❌ Error verificando permisos de compra:", error);
        return true; // ✅ En caso de error, permitir compra para no bloquear el negocio
    }
};

// ✅ NUEVA FUNCIÓN: Verificar si usuario puede ver sus propias transacciones
const canUserViewOwnTransactions = async (userId) => {
    try {
        // ✅ USUARIOS REGISTRADOS PUEDEN VER SUS TRANSACCIONES
        if (userId && !userId.toString().startsWith('guest-')) {
            const user = await userModel.findById(userId);
            return user && user.isActive !== false;
        }
        
        // ✅ USUARIOS INVITADOS NO PUEDEN VER HISTORIAL
        return false;
        
    } catch (error) {
        console.error("❌ Error verificando permisos de visualización:", error);
        return false;
    }
};

module.exports = uploadProductPermission;

// ✅ EXPORTAR FUNCIONES ADICIONALES
module.exports.canUserMakePurchase = canUserMakePurchase;
module.exports.canUserViewOwnTransactions = canUserViewOwnTransactions;
module.exports.uploadProductPermission = uploadProductPermission;
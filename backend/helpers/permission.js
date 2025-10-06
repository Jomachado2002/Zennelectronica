// backend/helpers/permission.js - VERSIÓN CORREGIDA
const userModel = require("../models/userModel");

const uploadProductPermission = async (userId) => {
    try {
        
        
        
        // ✅ PERMITIR USUARIOS INVITADOS PARA OPERACIONES BÁSICAS
        if (!userId) {
            
            return false; // ✅ CAMBIAR A false - sin userId no hay permisos admin
        }

        // ✅ RECHAZAR USUARIOS INVITADOS PARA FUNCIONES ADMIN
        if (typeof userId === 'string' && userId.startsWith('guest-')) {
            
            return false; // ✅ CAMBIAR A false - guests no tienen permisos admin
        }

        // ✅ VERIFICAR USUARIOS REGISTRADOS EN BD
        const user = await userModel.findById(userId);
        
        if (!user) {
            
            return false; // ✅ Usuario no existe = sin permisos
        }
        
        console.log("👤 Usuario encontrado:", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
        
        // ✅ VERIFICAR QUE EL USUARIO ESTÉ ACTIVO
        if (user.isActive === false) {
            
            return false;
        }
        
        // ✅ ADMIN tiene acceso completo
        if (user.role === 'ADMIN') {
            
            return true;
        }
        
                    // ✅ GENERAL puede acceder a su perfil (compatibilidad con iPhone)
            if (user.role === 'GENERAL') {
                
                return true; // ✅ PERMITIR acceso a perfil para GENERAL
            }
        
        
        return false; // ✅ CAMBIAR: sin rol específico = sin permisos
        
    } catch (error) {
        console.error("❌ Error verificando permisos:", error);
        return false; // ✅ CAMBIAR: en caso de error = sin permisos por seguridad
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
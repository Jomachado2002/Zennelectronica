// backend/controller/user/userDetails.js - VERSIÓN CORREGIDA
const userModel = require("../../models/userModel")

async function userDetailsController(req, res) {
    try {
        
        
        
        

        // ✅ VERIFICAR SI ES UN USUARIO INVITADO
        // ✅ VERIFICAR SI ES UN USUARIO INVITADO (MEJORADO PARA GENERAL)
            if (!req.userId || (typeof req.userId === 'string' && req.userId.startsWith('guest-'))) {
                
                return res.status(401).json({
                    message: "Debes iniciar sesión para acceder a los detalles del usuario",
                    error: true,
                    success: false,
                    isGuest: true
                });
            }

            // ✅ AGREGAR LOG ESPECÍFICO PARA DEBUGGING EN DISPOSITIVOS MÓVILES
            console.log("📱 Información de dispositivo:", {
                userAgent: req.headers['user-agent'] || 'No disponible',
                userId: req.userId,
                isAuthenticated: req.isAuthenticated,
                userRole: req.userRole
            });

        // ✅ VERIFICAR SI EL USUARIO ESTÁ AUTENTICADO
        // ✅ VERIFICAR SI EL USUARIO ESTÁ AUTENTICADO (MEJORADO)
        if (!req.isAuthenticated) {
            console.log("❌ Usuario no autenticado - Detalles:", {
                userId: req.userId,
                isAuthenticated: req.isAuthenticated,
                userRole: req.userRole,
                cookieExists: !!req.cookies?.token
            });
            return res.status(401).json({
                message: "Usuario no autenticado. Por favor, inicia sesión nuevamente.",
                error: true,
                success: false,
                isGuest: true,
                debug: process.env.NODE_ENV === 'development' ? {
                    userId: req.userId,
                    hasToken: !!req.cookies?.token
                } : undefined
            });
        }

        // ✅ BUSCAR EL USUARIO EN LA BASE DE DATOS
        const user = await userModel.findById(req.userId).select('-password -resetPasswordToken -resetPasswordExpires');

        if (!user) {
            
            return res.status(404).json({
                message: "Usuario no encontrado",
                error: true,
                success: false
            });
        }

        console.log("✅ Usuario encontrado:", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        });
        // ✅ LOG ESPECÍFICO PARA DEBUGGING MÓVIL
        
        
        
        
        
        
        
        console.log("👥 USUARIO EN BD:", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
        

        // ✅ RESPUESTA EXITOSA
        res.status(200).json({
            data: user,
            error: false,
            success: true,
            message: "Detalles del usuario obtenidos correctamente"
        });

    } catch (err) {
        console.error("❌ Error en userDetailsController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

module.exports = userDetailsController
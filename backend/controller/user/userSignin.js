// backend/controller/user/userSignin.js - VERSIÓN CORREGIDA PARA DEBUGGING
const bcrypt = require('bcryptjs');
const userModel = require('../../models/userModel');
const addToCartModel = require('../../models/cartProduct');
const jwt = require('jsonwebtoken');

async function userSignInController(req, res) {
    try {
        
        const { email, password } = req.body;

        // ✅ VALIDACIONES BÁSICAS
        if (!email || !password) {
            
            return res.status(400).json({
                message: "Por favor ingresa tu correo y contraseña.",
                error: true,
                success: false
            });
        }

        

        // ✅ BUSCAR USUARIO
        const user = await userModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            
            return res.status(404).json({
                message: "Usuario no encontrado.",
                error: true,
                success: false
            });
        }

        console.log("✅ Usuario encontrado:", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });

        // ✅ VERIFICAR CONTRASEÑA
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            
            return res.status(401).json({
                message: "Contraseña incorrecta.",
                error: true,
                success: false
            });
        }

        

        // ✅ CREAR TOKEN JWT
        const tokenData = {
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        

        const token = jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, { 
            expiresIn: '24h' 
        });

        

        // ✅ CONFIGURAR COOKIE CON CONFIGURACIÓN ESPECÍFICA PARA VERCEL
        // ✅ CONFIGURACIÓN ESPECÍFICA PARA iOS/SAFARI
            const cookieOptions = {
                httpOnly: true,
                secure: true, // ✅ SIEMPRE true para HTTPS (requerido por iOS)
                sameSite: 'none', // ✅ SIEMPRE 'none' para cross-site (requerido por iOS)
                maxAge: 24 * 60 * 60 * 1000, // 24 horas
                path: '/' // ✅ PATH explícito
            };

            // ✅ NO configurar domain - dejar que el navegador lo maneje
            

        

        res.cookie('token', token, cookieOptions);
        
                // ✅ LOG ESPECÍFICO PARA iOS
        
        
        // ✅ TRANSFERIR CARRITO DE INVITADO (si existe)
        try {
            if (req.session && req.session.guestId) {
                
                await transferGuestCart(req.session.guestId, user._id);
                
            }
        } catch (cartError) {
            console.error('⚠️ Error al transferir carrito (no crítico):', cartError);
            // No interrumpimos el login si falla la transferencia del carrito
        }

        // ✅ ACTUALIZAR ÚLTIMO LOGIN
        try {
            await userModel.findByIdAndUpdate(user._id, { 
                lastLogin: new Date() 
            });
        } catch (updateError) {
            console.error('⚠️ Error actualizando último login:', updateError);
            // No es crítico
        }

        

        // ✅ RESPUESTA EXITOSA
        return res.status(200).json({
            message: "Inicio de sesión exitoso",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic || ''
            },
            success: true,
            error: false
        });

    } catch (err) {
        console.error('❌ Error crítico en signin:', err);
        return res.status(500).json({
            message: "Error en el servidor durante el inicio de sesión",
            error: true,
            success: false,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

// ✅ FUNCIÓN PARA TRANSFERIR CARRITO DE INVITADO
async function transferGuestCart(guestId, userId) {
    try {
        
        
        const guestCart = await addToCartModel.find({ userId: guestId });
        
        
        for (const item of guestCart) {
            // Verificar si ya existe el producto en el carrito del usuario
            const existingItem = await addToCartModel.findOne({
                productId: item.productId,
                userId: userId
            });

            if (existingItem) {
                // Si existe, actualizar cantidad
                existingItem.quantity += item.quantity;
                await existingItem.save();
                
            } else {
                // Si no existe, crear nuevo item
                await addToCartModel.create({
                    productId: item.productId,
                    quantity: item.quantity,
                    userId: userId,
                    sessionId: `user-${userId}`,
                    isGuest: false
                });
                
            }
        }
        
        // Eliminar carrito de invitado
        const deleteResult = await addToCartModel.deleteMany({ userId: guestId });
        
        
        return true;
    } catch (error) {
        console.error('❌ Error en transferGuestCart:', error);
        throw error;
    }
}

module.exports = userSignInController;
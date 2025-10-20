// backend/middleware/strictAuth.js - MIDDLEWARE ESTRICTO PARA USUARIOS AUTENTICADOS

const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function strictAuth(req, res, next) {
    try {
        console.log('🔐 STRICT AUTH - Verificando autenticación estricta');
        
        // ✅ BUSCAR TOKEN EN MÚLTIPLES LUGARES
        let token = null;
        let source = 'none';

        // 1. Cookie principal
        if (req.cookies?.token) {
            token = req.cookies.token;
            source = 'cookie';
        }
        // 2. Parsing manual de cookies
        else if (req.headers.cookie) {
            const cookies = req.headers.cookie.split(';');
            for (const cookie of cookies) {
                const [key, value] = cookie.trim().split('=');
                if (key === 'token' && value) {
                    token = decodeURIComponent(value);
                    source = 'manual_cookie';
                    break;
                }
            }
        }
        // 3. Authorization header
        else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
            source = 'header';
        }
        // 4. Headers personalizados
        else if (req.headers['x-auth-token']) {
            token = req.headers['x-auth-token'];
            source = 'x-auth-token';
        }

        console.log('🎫 Strict Token Status:', {
            found: !!token,
            source,
            length: token ? token.length : 0,
            preview: token ? token.substring(0, 20) + '...' : 'NO TOKEN'
        });

        if (!token) {
            console.log('❌ STRICT AUTH FAILED - No token found');
            return res.status(401).json({
                message: "Token de autenticación requerido",
                error: true,
                success: false,
                code: 'NO_TOKEN'
            });
        }

        try {
            // ✅ VERIFICAR TOKEN JWT
            const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
            console.log('✅ Token JWT válido:', {
                userId: decoded._id,
                email: decoded.email,
                role: decoded.role
            });

            // ✅ VERIFICAR USUARIO EN BASE DE DATOS
            const user = await userModel.findById(decoded._id).select('-password');
            
            if (!user) {
                console.log('❌ STRICT AUTH FAILED - User not found in database');
                return res.status(401).json({
                    message: "Usuario no encontrado en la base de datos",
                    error: true,
                    success: false,
                    code: 'USER_NOT_FOUND'
                });
            }

            if (user.isActive === false) {
                console.log('❌ STRICT AUTH FAILED - User inactive');
                return res.status(401).json({
                    message: "Usuario desactivado",
                    error: true,
                    success: false,
                    code: 'USER_INACTIVE'
                });
            }

            // ✅ USUARIO COMPLETAMENTE AUTENTICADO
            req.userId = user._id;
            req.user = user;
            req.isAuthenticated = true;
            req.userRole = user.role;
            req.bancardUserId = user.bancardUserId;
            req.userType = 'REGISTERED';
            
            console.log('✅ USUARIO AUTENTICADO EXITOSAMENTE:', {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                bancardUserId: user.bancardUserId,
                tokenSource: source
            });
            
            return next();

        } catch (jwtError) {
            console.log('❌ STRICT AUTH FAILED - Invalid token:', jwtError.message);
            return res.status(401).json({
                message: "Token de autenticación inválido",
                error: true,
                success: false,
                code: 'INVALID_TOKEN',
                details: jwtError.message
            });
        }

    } catch (err) {
        console.error('❌ ERROR CRÍTICO EN STRICT AUTH MIDDLEWARE:', err);
        
        return res.status(500).json({
            message: "Error interno del servidor en autenticación",
            error: true,
            success: false,
            code: 'SERVER_ERROR'
        });
    }
}

module.exports = strictAuth;

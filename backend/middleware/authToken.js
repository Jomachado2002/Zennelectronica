// backend/middleware/authToken.js - FIX FINAL PARA iOS COMPATIBLE CON TU PERMISSION

const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function authToken(req, res, next) {
    try {
        console.log('🔐 === MIDDLEWARE AUTHTOKEN ===');
        
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        console.log('📱 Dispositivo:', isIOS ? 'iOS' : 'Other');
        console.log('🍪 Cookie header:', req.headers.cookie ? 'PRESENTE' : 'AUSENTE');

        // ✅ BUSCAR TOKEN EN MÚLTIPLES LUGARES (ESPECIAL PARA iOS)
        let token = null;
        let source = 'none';

        // 1. Cookie principal
        if (req.cookies?.token) {
            token = req.cookies.token;
            source = 'cookie';
        }
        // 2. Parsing manual de cookies (para iOS problemático)
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
        // 4. Headers personalizados (para iOS)
        else if (req.headers['x-auth-token']) {
            token = req.headers['x-auth-token'];
            source = 'x-auth-token';
        }

        console.log('🎫 Token Status:', {
            found: !!token,
            source,
            length: token ? token.length : 0,
            preview: token ? token.substring(0, 20) + '...' : 'NO TOKEN'
        });

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
                console.log('✅ Token JWT válido:', {
                    userId: decoded._id,
                    email: decoded.email,
                    role: decoded.role
                });

                const user = await userModel.findById(decoded._id).select('-password');
                
                if (user && user.isActive !== false) {
                    // ✅ USUARIO COMPLETAMENTE AUTENTICADO
                    req.userId = decoded._id;
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
                        device: isIOS ? 'iOS' : 'Other',
                        tokenSource: source
                    });
                    
                    return next();
                } else {
                    console.log('❌ Usuario no encontrado o inactivo');
                }
            } catch (jwtError) {
                console.log('❌ Token JWT inválido:', jwtError.message);
            }
        }

        // ✅ USUARIO INVITADO
        const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        req.userId = guestId;
        req.isAuthenticated = false;
        req.userRole = 'GUEST';
        req.user = null;
        req.bancardUserId = null;
        req.userType = 'GUEST';
        req.sessionId = req.session?.id || `session-${Date.now()}`;
        
        console.log('🔓 CONFIGURADO COMO INVITADO:', {
            guestId,
            isIOS,
            reason: token ? 'invalid_token' : 'no_token',
            tokenSource: source
        });
        
        next();

    } catch (err) {
        console.error('❌ ERROR CRÍTICO EN MIDDLEWARE:', err);
        
        // Fallback seguro
        req.userId = `guest-fallback-${Date.now()}`;
        req.isAuthenticated = false;
        req.userRole = 'GUEST';
        req.user = null;
        req.bancardUserId = null;
        req.userType = 'GUEST';
        
        next();
    }
}

module.exports = authToken;
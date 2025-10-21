// backend/middleware/authToken.js - FIX FINAL PARA iOS COMPATIBLE CON TU PERMISSION

const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function authToken(req, res, next) {
    try {
        
        
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        
        

        // ✅ BUSCAR TOKEN EN MÚLTIPLES LUGARES (ESPECIAL PARA iOS)
        let token = null;
        let source = 'none';

        // 1. Cookie principal
        if (req.cookies?.token) {
            token = req.cookies.token;
            source = 'cookie';
        }
        // 2. Parsing manual de cookies (para Vercel y iOS)
        else if (req.headers.cookie) {
            // console.log removed for production
            const cookies = req.headers.cookie.split(';');
            for (const cookie of cookies) {
                const trimmedCookie = cookie.trim();
                const [key, value] = trimmedCookie.split('=');
                if (key === 'token' && value && value !== 'undefined') {
                    token = decodeURIComponent(value);
                    source = 'manual_cookie';
                    console.log('✅ Token encontrado en parsing manual:', token.substring(0, 20) + '...');
                    break;
                }
            }
        }
        // 3. Authorization header
        else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
            source = 'header';
        }
        // 4. Headers personalizados (para iOS y Vercel)
        else if (req.headers['x-auth-token']) {
            token = req.headers['x-auth-token'];
            source = 'x-auth-token';
        }
        // 5. Headers adicionales para Vercel
        else if (req.headers['authorization-token']) {
            token = req.headers['authorization-token'];
            source = 'auth-token-header';
        }
        // 6. Query parameter como fallback (para testing)
        else if (req.query.token) {
            token = req.query.token;
            source = 'query-param';
        }

        console.log('🎫 Token Status:', {
            found: !!token,
            source,
            length: token ? token.length : 0,
            preview: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
            endpoint: req.path,
            method: req.method
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
                    
                }
            } catch (jwtError) {
                
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
        // console.error removed for production
        
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
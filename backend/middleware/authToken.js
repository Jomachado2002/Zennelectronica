// backend/middleware/authToken.js - FIX FINAL PARA iOS COMPATIBLE CON TU PERMISSION

const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { pickAuthToken } = require('./pickAuthToken');

const AUTH_DEBUG = process.env.NODE_ENV !== 'production';

async function authToken(req, res, next) {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const picked = pickAuthToken(req);
        const candidates = picked.candidates && picked.candidates.length
            ? picked.candidates
            : (picked.token ? [{ token: picked.token, source: picked.source }] : []);

        if (AUTH_DEBUG) {
            console.log('🎫 Token Status:', {
                found: candidates.length > 0,
                source: picked.source,
                length: picked.token ? picked.token.length : 0,
                preview: picked.token ? picked.token.substring(0, 20) + '...' : 'NO TOKEN',
                endpoint: req.path,
                method: req.method
            });
        }

        for (const { token, source } of candidates) {
            try {
                const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
                const user = await userModel.findById(decoded._id).select('-password');
                if (!user || user.isActive === false) continue;

                req.userId = decoded._id;
                req.user = user;
                req.isAuthenticated = true;
                req.userRole = user.role;
                req.bancardUserId = user.bancardUserId;
                req.userType = 'REGISTERED';
                if (AUTH_DEBUG) {
                    console.log('✅ USUARIO AUTENTICADO EXITOSAMENTE:', {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        bancardUserId: user.bancardUserId,
                        device: isIOS ? 'iOS' : 'Other',
                        tokenSource: source
                    });
                }
                return next();
            } catch {
                continue;
            }
        }

        const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        req.userId = guestId;
        req.isAuthenticated = false;
        req.userRole = 'GUEST';
        req.user = null;
        req.bancardUserId = null;
        req.userType = 'GUEST';
        req.sessionId = req.session?.id || `session-${Date.now()}`;

        if (AUTH_DEBUG) {
            console.log('🔓 CONFIGURADO COMO INVITADO:', {
                guestId,
                isIOS,
                reason: candidates.length ? 'invalid_token' : 'no_token',
                tokenSource: picked.source
            });
        }

        next();
    } catch (err) {
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
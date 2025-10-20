// backend/routes/authTest.js - ENDPOINTS DE PRUEBA PARA AUTENTICACIÓN EN VERCEL

const express = require('express');
const router = express.Router();
const authToken = require('../middleware/authToken');

// ✅ ENDPOINT PARA PROBAR COOKIES SIN AUTENTICACIÓN
router.get('/cookies', async (req, res) => {
    try {
        console.log('🍪 Debug de cookies - Headers recibidos:', req.headers);
        console.log('🍪 Debug de cookies - Cookies parseadas:', req.cookies);
        
        res.json({
            message: "Debug de cookies",
            success: true,
            data: {
                cookies: req.cookies,
                headers: {
                    cookie: req.headers.cookie || 'No cookie header',
                    authorization: req.headers.authorization || 'No auth header',
                    'user-agent': req.headers['user-agent'] || 'No user-agent'
                },
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    isProduction: process.env.NODE_ENV === 'production'
                }
            }
        });
    } catch (error) {
        console.error('❌ Error en debug de cookies:', error);
        res.status(500).json({
            message: "Error en debug de cookies",
            error: true,
            details: error.message
        });
    }
});

// ✅ ENDPOINT PARA PROBAR AUTENTICACIÓN
router.get('/auth-status', authToken, async (req, res) => {
    try {
        console.log('🔐 Debug de autenticación - Usuario:', req.userId, 'Autenticado:', req.isAuthenticated);
        
        res.json({
            message: "Estado de autenticación",
            success: true,
            data: {
                auth: {
                    userId: req.userId,
                    isAuthenticated: req.isAuthenticated,
                    userRole: req.userRole,
                    userType: req.userType,
                    bancardUserId: req.bancardUserId,
                    user: req.user ? {
                        id: req.user._id,
                        name: req.user.name,
                        email: req.user.email,
                        role: req.user.role
                    } : null
                },
                headers: {
                    cookies: req.headers.cookie ? 'present' : 'missing',
                    authorization: req.headers.authorization ? 'present' : 'missing'
                }
            }
        });
    } catch (error) {
        console.error('❌ Error en debug de autenticación:', error);
        res.status(500).json({
            message: "Error en debug de autenticación",
            error: true,
            details: error.message
        });
    }
});

// ✅ ENDPOINT PARA PROBAR LOGIN SIMULADO
router.post('/test-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                message: "Email y contraseña requeridos",
                success: false,
                error: true
            });
        }
        
        // Simular login exitoso
        const mockToken = 'test-token-' + Date.now();
        
        // Configurar cookie para Vercel
        const cookieOptions = {
            httpOnly: true,
            secure: true, // Siempre true para Vercel
            sameSite: 'none', // Siempre 'none' para Vercel
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
        };
        
        console.log('🍪 Configurando cookie de prueba:', cookieOptions);
        
        res.cookie('token', mockToken, cookieOptions);
        
        res.json({
            message: "Login de prueba exitoso",
            success: true,
            data: {
                token: mockToken,
                cookieOptions: cookieOptions,
                environment: process.env.NODE_ENV
            }
        });
    } catch (error) {
        console.error('❌ Error en test login:', error);
        res.status(500).json({
            message: "Error en test login",
            error: true,
            details: error.message
        });
    }
});

module.exports = router;

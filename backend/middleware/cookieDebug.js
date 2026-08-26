// backend/middleware/cookieDebug.js - MIDDLEWARE PARA DEBUG DE COOKIES

const cookieDebug = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('🍪 COOKIE DEBUG:', {
            endpoint: req.path,
            method: req.method,
            cookies: req.cookies,
            headers: {
                cookie: req.headers.cookie || 'NO COOKIE HEADER',
                authorization: req.headers.authorization || 'NO AUTH HEADER',
                'user-agent': req.headers['user-agent']?.substring(0, 50) + '...' || 'NO USER AGENT'
            },
            timestamp: new Date().toISOString()
        });
    }

    next();
};

module.exports = cookieDebug;

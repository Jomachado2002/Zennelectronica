// backend/controller/location/locationController.js
const NodeGeocoder = require('node-geocoder');
const userModel = require('../../models/userModel');

// Configurar geocoder
const geocoder = NodeGeocoder({
    provider: 'google',
    apiKey: process.env.GOOGLE_MAPS_API_KEY, // ✅ Sin REACT_APP_
    formatter: null
});

/**
 * ✅ GEOCODIFICACIÓN INVERSA - Coordenadas a dirección
 */
const reverseGeocodeController = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({
                message: "Latitud y longitud son requeridas",
                success: false,
                error: true
            });
        }

        const results = await geocoder.reverse({ lat, lon: lng });
        
        if (results && results.length > 0) {
            const location = results[0];
            
            res.json({
                message: "Dirección obtenida exitosamente",
                success: true,
                error: false,
                data: {
                    formatted_address: location.formattedAddress,
                    street: location.streetName,
                    number: location.streetNumber,
                    city: location.city,
                    state: location.administrativeLevels?.level1long,
                    country: location.country,
                    zipcode: location.zipcode
                }
            });
        } else {
            res.status(404).json({
                message: "No se encontró dirección para estas coordenadas",
                success: false,
                error: true
            });
        }
    } catch (error) {
        console.error('❌ Error en geocodificación:', error);
        res.status(500).json({
            message: "Error en geocodificación",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ GEOCODIFICACIÓN DIRECTA - Dirección a coordenadas
 */
const geocodeAddressController = async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({
                message: "La dirección es requerida",
                success: false,
                error: true
            });
        }

        const results = await geocoder.geocode(address);
        
        if (results && results.length > 0) {
            const location = results[0];
            
            res.json({
                message: "Coordenadas obtenidas exitosamente",
                success: true,
                error: false,
                data: {
                    lat: location.latitude,
                    lng: location.longitude,
                    formatted_address: location.formattedAddress,
                    city: location.city,
                    state: location.administrativeLevels?.level1long,
                    country: location.country
                }
            });
        } else {
            res.status(404).json({
                message: "No se encontraron coordenadas para esta dirección",
                success: false,
                error: true
            });
        }
    } catch (error) {
        console.error('❌ Error en geocodificación:', error);
        res.status(500).json({
            message: "Error en geocodificación",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ GUARDAR UBICACIÓN DE USUARIO
 */
const saveUserLocationController = async (req, res) => {
    try {
        const userId = req.userId;
        const { lat, lng, save_address = true } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({
                message: "Coordenadas son requeridas",
                success: false,
                error: true
            });
        }

        let locationData = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            timestamp: new Date()
        };

        // Obtener dirección si se solicita
        if (save_address) {
            try {
                const results = await geocoder.reverse({ lat, lon: lng });
                if (results && results.length > 0) {
                    locationData.address = results[0].formattedAddress;
                    locationData.city = results[0].city;
                    locationData.state = results[0].administrativeLevels?.level1long;
                    locationData.country = results[0].country;
                }
            } catch (geocodeError) {
                console.warn('⚠️ Error en geocodificación (no crítico):', geocodeError);
            }
        }

        locationData.googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { location: locationData },
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires');

        res.json({
            message: "Ubicación guardada exitosamente",
            success: true,
            error: false,
            data: updatedUser.location
        });

    } catch (error) {
        console.error('❌ Error guardando ubicación:', error);
        res.status(500).json({
            message: "Error al guardar ubicación",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ OBTENER UBICACIÓN DE USUARIO
 */
const getUserLocationController = async (req, res) => {
    try {
        const userId = req.userId;
        
        const user = await userModel.findById(userId).select('location');
        
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                success: false,
                error: true
            });
        }

        res.json({
            message: "Ubicación obtenida exitosamente",
            success: true,
            error: false,
            data: user.location || null
        });

    } catch (error) {
        console.error('❌ Error obteniendo ubicación:', error);
        res.status(500).json({
            message: "Error al obtener ubicación",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ GUARDAR UBICACIÓN TEMPORAL (Para invitados en checkout)
 */
const saveGuestLocationController = async (req, res) => {
    try {
        const { lat, lng, session_id, guest_id } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({
                message: "Coordenadas son requeridas",
                success: false,
                error: true
            });
        }

        let locationData = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            timestamp: new Date(),
            is_guest: true,
            session_id: session_id || req.sessionID,
            guest_id: guest_id || req.userId
        };

        // Geocodificación
        try {
            const results = await geocoder.reverse({ lat, lon: lng });
            if (results && results.length > 0) {
                locationData.address = results[0].formattedAddress;
                locationData.city = results[0].city;
                locationData.state = results[0].administrativeLevels?.level1long;
                locationData.country = results[0].country;
            }
        } catch (geocodeError) {
            console.warn('⚠️ Error en geocodificación:', geocodeError);
        }

        locationData.googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        // Guardar en sesión (temporal para checkout)
        req.session.guest_location = locationData;

        res.json({
            message: "Ubicación temporal guardada exitosamente",
            success: true,
            error: false,
            data: locationData
        });

    } catch (error) {
        console.error('❌ Error guardando ubicación temporal:', error);
        res.status(500).json({
            message: "Error al guardar ubicación temporal",
            success: false,
            error: true,
            details: error.message
        });
    }
};

module.exports = {
    reverseGeocodeController,
    geocodeAddressController,
    saveUserLocationController,
    getUserLocationController,
    saveGuestLocationController
};
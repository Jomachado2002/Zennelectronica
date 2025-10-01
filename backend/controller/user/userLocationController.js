const userModel = require("../../models/userModel");

const updateUserLocation = async (req, res) => {
    try {
        console.log("🗺️ === ACTUALIZANDO UBICACIÓN DE USUARIO ===");
        console.log("👤 Usuario:", req.userId);
        console.log("📍 Datos recibidos:", req.body);

        const userId = req.userId;
        const { lat, lng, address, googleMapsUrl } = req.body;

        // Validaciones
        if (!lat || !lng) {
            return res.status(400).json({
                message: "Coordenadas (lat, lng) son requeridas",
                success: false,
                error: true
            });
        }

        if (lat < -90 || lat > 90) {
            return res.status(400).json({
                message: "Latitud debe estar entre -90 y 90",
                success: false,
                error: true
            });
        }

        if (lng < -180 || lng > 180) {
            return res.status(400).json({
                message: "Longitud debe estar entre -180 y 180",
                success: false,
                error: true
            });
        }

        // Actualizar ubicación del usuario
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            {
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    address: address || '',
                    googleMapsUrl: googleMapsUrl || `https://www.google.com/maps?q=${lat},${lng}`,
                    timestamp: new Date()
                }
            },
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires');

        if (!updatedUser) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                success: false,
                error: true
            });
        }

        console.log("✅ Ubicación actualizada exitosamente:", updatedUser.location);

        res.json({
            message: "Ubicación actualizada exitosamente",
            data: updatedUser.location,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("❌ Error actualizando ubicación:", err);
        res.status(500).json({
            message: err.message || "Error al actualizar ubicación",
            error: true,
            success: false
        });
    }
};

const getUserLocation = async (req, res) => {
    try {
        console.log("🗺️ === OBTENIENDO UBICACIÓN DE USUARIO ===");
        console.log("👤 Usuario:", req.userId);

        const user = await userModel.findById(req.userId).select('location');
        
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                success: false,
                error: true
            });
        }

        res.json({
            message: "Ubicación obtenida exitosamente",
            data: user.location || null,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("❌ Error obteniendo ubicación:", err);
        res.status(500).json({
            message: err.message || "Error al obtener ubicación",
            error: true,
            success: false
        });
    }
};

module.exports = { 
    updateUserLocation,
    getUserLocation 
};
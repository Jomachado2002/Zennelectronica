// backend/controller/user/userProfile.js
const userModel = require("../../models/userModel");
const uploadProductPermission = require('../../helpers/permission');

/**
 * Obtener perfil del usuario
 */
async function getUserProfileController(req, res) {
    try {
        
        
        const user = await userModel.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                error: true,
                success: false
            });
        }

        res.status(200).json({
            data: user,
            error: false,
            success: true,
            message: "Perfil de usuario obtenido exitosamente"
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Actualizar perfil del usuario
 */
async function updateUserProfileController(req, res) {
    try {
        const userId = req.userId;
        const { 
            name, 
            phone, 
            address,
            dateOfBirth,
            profilePic
        } = req.body;

        // Validaciones básicas
        if (!name || name.trim() === '') {
            return res.status(400).json({
                message: "El nombre es requerido",
                error: true,
                success: false
            });
        }

        // Verificar que el usuario existe
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                error: true,
                success: false
            });
        }

        // Preparar datos de actualización
        const updateData = {
            name: name.trim(),
            ...(phone && { phone }),
            ...(address && { address }),
            ...(dateOfBirth && { dateOfBirth }),
            ...(profilePic && { profilePic })
        };

        // Actualizar usuario
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: "Perfil actualizado correctamente",
            data: updatedUser,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error al actualizar perfil:", err);
        res.status(400).json({
            message: err.message || "Error al actualizar perfil",
            error: true,
            success: false
        });
    }
}

/**
 * Subir imagen de perfil
 */
async function uploadProfileImageController(req, res) {
    try {
        // Aquí implementarías la lógica para subir imagen
        // Por ahora, simulamos que se sube exitosamente
        
        if (!req.file) {
            return res.status(400).json({
                message: "No se proporcionó ninguna imagen",
                error: true,
                success: false
            });
        }

        // Simular URL de imagen subida
        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        
        // Actualizar la imagen en el perfil del usuario
        const updatedUser = await userModel.findByIdAndUpdate(
            req.userId,
            { profilePic: imageUrl },
            { new: true }
        ).select('-password');

        res.json({
            message: "Imagen de perfil subida exitosamente",
            data: {
                profilePic: imageUrl,
                user: updatedUser
            },
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error al subir imagen:", err);
        res.status(400).json({
            message: err.message || "Error al subir imagen",
            error: true,
            success: false
        });
    }
}

/**
 * Cambiar contraseña
 */
async function changePasswordController(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Contraseña actual y nueva contraseña son requeridas",
                error: true,
                success: false
            });
        }

        const user = await userModel.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                error: true,
                success: false
            });
        }

        // Verificar contraseña actual
        const bcrypt = require('bcryptjs');
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                message: "La contraseña actual es incorrecta",
                error: true,
                success: false
            });
        }

        // Validar nueva contraseña
        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "La nueva contraseña debe tener al menos 8 caracteres",
                error: true,
                success: false
            });
        }

        // Encriptar nueva contraseña
        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(newPassword, salt);

        // Actualizar contraseña
        await userModel.findByIdAndUpdate(req.userId, {
            password: hashPassword
        });

        res.json({
            message: "Contraseña cambiada exitosamente",
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error al cambiar contraseña:", err);
        res.status(400).json({
            message: err.message || "Error al cambiar contraseña",
            error: true,
            success: false
        });
    }
}

module.exports = {
    getUserProfileController,
    updateUserProfileController,
    uploadProfileImageController,
    changePasswordController
};
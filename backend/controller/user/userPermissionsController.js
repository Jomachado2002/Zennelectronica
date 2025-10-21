// backend/controller/user/userPermissionsController.js - GESTIÓN DE PERMISOS GRANULAR

const userModel = require('../../models/userModel');
const { checkPermission, getUserPermissions, hasAdminPanelAccess } = require('../../helpers/granularPermission');

/**
 * Obtener todos los permisos del usuario actual
 */
const getUserPermissionsController = async (req, res) => {
    try {
        // console.log removed for production
        
        const permissions = await getUserPermissions(req.userId);
        
        if (!permissions) {
            return res.status(404).json({
                message: 'Usuario no encontrado',
                success: false,
                error: true
            });
        }
        
        res.json({
            message: 'Permisos obtenidos exitosamente',
            success: true,
            error: false,
            data: {
                userId: req.userId,
                permissions: permissions
            }
        });
        
    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: 'Error interno del servidor',
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * Actualizar permisos de un usuario (solo ROOT puede hacer esto)
 */
const updateUserPermissionsController = async (req, res) => {
    try {
        // console.log removed for production
        
        // Verificar que el usuario actual sea ROOT
        const currentUser = await userModel.findById(req.userId);
        if (!currentUser || currentUser.role !== 'ROOT') {
            return res.status(403).json({
                message: 'Solo usuarios ROOT pueden modificar permisos',
                success: false,
                error: true
            });
        }
        
        const { userId } = req.params;
        const { permissions } = req.body;
        
        // Verificar que el usuario objetivo existe
        const targetUser = await userModel.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                message: 'Usuario no encontrado',
                success: false,
                error: true
            });
        }
        
        // No permitir modificar permisos de ROOT
        if (targetUser.role === 'ROOT') {
            return res.status(403).json({
                message: 'No se pueden modificar los permisos de un usuario ROOT',
                success: false,
                error: true
            });
        }
        
        // Actualizar permisos
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { permissions: permissions },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({
            message: 'Permisos actualizados exitosamente',
            success: true,
            error: false,
            data: {
                user: updatedUser
            }
        });
        
    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: 'Error interno del servidor',
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * Verificar un permiso específico
 */
const checkUserPermissionController = async (req, res) => {
    try {
        const { module, action } = req.query;
        
        if (!module) {
            return res.status(400).json({
                message: 'Módulo es requerido',
                success: false,
                error: true
            });
        }
        
        const hasPermission = await checkPermission(req.userId, module, action);
        
        res.json({
            message: 'Verificación de permiso completada',
            success: true,
            error: false,
            data: {
                userId: req.userId,
                module: module,
                action: action,
                hasPermission: hasPermission
            }
        });
        
    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: 'Error interno del servidor',
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * Obtener todos los usuarios con sus permisos (solo ROOT)
 */
const getAllUsersWithPermissionsController = async (req, res) => {
    try {
        // Verificar que el usuario actual sea ROOT
        const currentUser = await userModel.findById(req.userId);
        if (!currentUser || currentUser.role !== 'ROOT') {
            return res.status(403).json({
                message: 'Solo usuarios ROOT pueden ver todos los usuarios',
                success: false,
                error: true
            });
        }
        
        const users = await userModel.find({})
            .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken')
            .sort({ createdAt: -1 });
        
        // Agregar permisos calculados para cada usuario
        const usersWithPermissions = await Promise.all(
            users.map(async (user) => {
                const permissions = await getUserPermissions(user._id);
                return {
                    ...user.toObject(),
                    permissions: permissions
                };
            })
        );
        
        res.json({
            message: 'Usuarios obtenidos exitosamente',
            success: true,
            error: false,
            data: {
                users: usersWithPermissions,
                count: usersWithPermissions.length
            }
        });
        
    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: 'Error interno del servidor',
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * Crear un nuevo usuario con permisos específicos
 */
const createUserWithPermissionsController = async (req, res) => {
    try {
        // Verificar que el usuario actual sea ROOT
        const currentUser = await userModel.findById(req.userId);
        if (!currentUser || currentUser.role !== 'ROOT') {
            return res.status(403).json({
                message: 'Solo usuarios ROOT pueden crear usuarios',
                success: false,
                error: true
            });
        }
        
        const { name, email, password, role, permissions } = req.body;
        
        // Validaciones básicas
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: 'Nombre, email, contraseña y rol son requeridos',
                success: false,
                error: true
            });
        }
        
        // Verificar que el email no exista
        const existingUser = await userModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                message: 'El email ya está registrado',
                success: false,
                error: true
            });
        }
        
        // Crear nuevo usuario
        const newUser = new userModel({
            name,
            email: email.toLowerCase(),
            password,
            role,
            permissions: permissions || userModel.getDefaultPermissions(role)
        });
        
        await newUser.save();
        
        // Obtener usuario creado sin password
        const createdUser = await userModel.findById(newUser._id).select('-password');
        
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            success: true,
            error: false,
            data: {
                user: createdUser
            }
        });
        
    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: 'Error interno del servidor',
            success: false,
            error: true,
            details: error.message
        });
    }
};

module.exports = {
    getUserPermissionsController,
    updateUserPermissionsController,
    checkUserPermissionController,
    getAllUsersWithPermissionsController,
    createUserWithPermissionsController
};

// backend/controller/user/userProfile.js
const userModel = require("../../models/userModel");
const BalanceModel = require("../../models/balanceModel");
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

/**
 * ✅ OBTENER SALDO DEL USUARIO
 */
async function getUserBalanceController(req, res) {
    try {
        const userId = req.userId;
        
        // ✅ VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
        if (!req.isAuthenticated || req.userType === 'GUEST') {
            return res.status(401).json({
                message: "Debes iniciar sesión para acceder a tu saldo",
                success: false,
                error: true
            });
        }
        
        const userBalance = await BalanceModel.getOrCreateUserBalance(userId);
        
        // Obtener últimas transacciones
        const recentTransactions = userBalance.transactions
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
            .slice(0, 10);

        res.json({
            message: "Saldo obtenido exitosamente",
            data: {
                user_id: userId,
                current_balance: userBalance.current_balance,
                total_loaded: userBalance.total_loaded,
                total_spent: userBalance.total_spent,
                last_transaction_date: userBalance.last_transaction_date,
                recent_transactions: recentTransactions,
                is_active: userBalance.is_active
            },
            success: true,
            error: false
        });

    } catch (error) {
        console.error("❌ Error obteniendo saldo del usuario:", error);
        res.status(500).json({
            message: "Error al obtener el saldo",
            success: false,
            error: true,
            details: error.message
        });
    }
}

/**
 * ✅ CARGAR SALDO CON BANCARD
 */
async function loadBalanceController(req, res) {
    try {
        const userId = req.userId;
        const { amount, currency = 'PYG', description = 'Carga de saldo' } = req.body;

        // ✅ VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
        if (!req.isAuthenticated || req.userType === 'GUEST') {
            return res.status(401).json({
                message: "Debes iniciar sesión para cargar saldo",
                success: false,
                error: true
            });
        }

        // Validaciones
        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "El monto debe ser mayor a 0",
                success: false,
                error: true
            });
        }

        // Verificar que el usuario existe
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                success: false,
                error: true
            });
        }

        // Llamar al controlador de Bancard para carga de saldo
        const { loadBalanceController: bancardLoadBalance } = require('../bancard/bancardController');
        
        // Modificar req.body para incluir user_id
        req.body.user_id = userId;
        req.body.customer_info = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address
        };

        return await bancardLoadBalance(req, res);

    } catch (error) {
        console.error("❌ Error cargando saldo:", error);
        res.status(500).json({
            message: "Error al cargar saldo",
            success: false,
            error: true,
            details: error.message
        });
    }
}

/**
 * ✅ PROCESAR PAGO CON SALDO
 */
async function payWithBalanceController(req, res) {
    try {
        const userId = req.userId;
        const { amount, description, items = [], customer_info = {}, sale_id = null, reference = null } = req.body;

        // ✅ VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
        if (!req.isAuthenticated || req.userType === 'GUEST') {
            return res.status(401).json({
                message: "Debes iniciar sesión para pagar con saldo",
                success: false,
                error: true
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "El monto debe ser mayor a 0",
                success: false,
                error: true
            });
        }

        // Obtener balance del usuario
        const userBalance = await BalanceModel.getOrCreateUserBalance(userId);
        
        // Verificar saldo suficiente
        if (!userBalance.hasEnoughBalance(amount)) {
            return res.status(400).json({
                message: "Saldo insuficiente",
                success: false,
                error: true,
                data: {
                    current_balance: userBalance.current_balance,
                    required_amount: amount,
                    deficit: amount - userBalance.current_balance
                }
            });
        }

        // Procesar pago con saldo
        await userBalance.addTransaction({
            type: 'spend',
            amount: parseFloat(amount),
            description: description || 'Compra con saldo',
            reference: reference || sale_id || `PAY-${Date.now()}`,
            transaction_date: new Date(),
            status: 'completed',
            metadata: {
                items: items,
                customer_info: customer_info,
                payment_method: 'balance'
            }
        });

        console.log("✅ Pago con saldo procesado:", {
            user_id: userId,
            amount: amount,
            new_balance: userBalance.current_balance
        });

        res.json({
            message: "Pago procesado exitosamente con saldo",
            success: true,
            error: false,
            data: {
                user_id: userId,
                amount_paid: amount,
                remaining_balance: userBalance.current_balance,
                transaction_id: reference || sale_id || `PAY-${Date.now()}`
            }
        });

    } catch (error) {
        console.error("❌ Error procesando pago con saldo:", error);
        res.status(500).json({
            message: "Error al procesar el pago",
            success: false,
            error: true,
            details: error.message
        });
    }
}

/**
 * ✅ OBTENER HISTORIAL DE TRANSACCIONES DE SALDO
 */
async function getBalanceHistoryController(req, res) {
    try {
        const userId = req.userId;
        const { limit = 20, offset = 0, type = null } = req.query;

        // ✅ VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
        if (!req.isAuthenticated || req.userType === 'GUEST') {
            return res.status(401).json({
                message: "Debes iniciar sesión para acceder al historial de saldo",
                success: false,
                error: true
            });
        }

        const userBalance = await BalanceModel.getOrCreateUserBalance(userId);
        
        // Filtrar transacciones por tipo si se especifica
        let transactions = userBalance.transactions;
        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }

        // Ordenar por fecha descendente
        transactions = transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        // Paginación
        const paginatedTransactions = transactions.slice(
            parseInt(offset), 
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            message: "Historial de saldo obtenido exitosamente",
            data: {
                user_id: userId,
                current_balance: userBalance.current_balance,
                transactions: paginatedTransactions,
                pagination: {
                    total: transactions.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + parseInt(limit)) < transactions.length
                }
            },
            success: true,
            error: false
        });

    } catch (error) {
        console.error("❌ Error obteniendo historial de saldo:", error);
        res.status(500).json({
            message: "Error al obtener historial de saldo",
            success: false,
            error: true,
            details: error.message
        });
    }
}

module.exports = {
    getUserProfileController,
    updateUserProfileController,
    uploadProfileImageController,
    changePasswordController,
    getUserBalanceController,
    loadBalanceController,
    payWithBalanceController,
    getBalanceHistoryController
};
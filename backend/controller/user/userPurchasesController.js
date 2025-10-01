// backend/controller/user/userPurchasesController.js - NUEVO CONTROLADOR PARA COMPRAS DE USUARIOS

const BancardTransactionModel = require('../../models/bancardTransactionModel');
const SaleModel = require('../../models/saleModel');
const userModel = require('../../models/userModel');

/**
 * ✅ OBTENER COMPRAS DE UN USUARIO ESPECÍFICO
 */
const getUserPurchasesController = async (req, res) => {
    try {
        console.log("🛒 === OBTENIENDO COMPRAS DEL USUARIO ===");
        console.log("👤 Usuario autenticado:", req.userId);
        console.log("🔍 Es admin:", req.userRole === 'ADMIN');

        // ✅ VERIFICAR AUTENTICACIÓN
        if (!req.isAuthenticated || !req.userId) {
            return res.status(401).json({
                message: "Debes iniciar sesión para ver tus compras",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR QUE NO ES USUARIO INVITADO
        if (typeof req.userId === 'string' && req.userId.startsWith('guest-')) {
            return res.status(401).json({
                message: "Los usuarios invitados no tienen historial de compras",
                success: false,
                error: true,
                redirectTo: "/iniciar-sesion"
            });
        }

        const {
            page = 1,
            limit = 10,
            status,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // ✅ CONSTRUIR QUERY PARA TRANSACCIONES DEL USUARIO
        const query = {
            created_by: req.userId,
            // ✅ SOLO TRANSACCIONES CONFIRMADAS O APROBADAS
            $or: [
                { status: 'approved' },
                { bancard_confirmed: true },
                { response: 'S', response_code: '00' }
            ]
        };

        // ✅ FILTROS ADICIONALES
        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // ✅ CONFIGURAR ORDENAMIENTO
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // ✅ CONFIGURAR PAGINACIÓN
        const skip = (page - 1) * limit;

        console.log("📋 Query construida:", {
            query,
            sort,
            skip,
            limit: Number(limit)
        });

        // ✅ OBTENER TRANSACCIONES CON POPULATE
        const transactions = await BancardTransactionModel
            .find(query)
            .populate('sale_id', 'total items paymentStatus notes createdAt')
            .populate('created_by', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // ✅ CONTAR TOTAL PARA PAGINACIÓN
        const totalTransactions = await BancardTransactionModel.countDocuments(query);

        // ✅ PROCESAR DATOS PARA RESPUESTA
        const processedPurchases = transactions.map(transaction => {
            return {
                id: transaction._id,
                shop_process_id: transaction.shop_process_id,
                bancard_process_id: transaction.bancard_process_id,
                amount: transaction.amount,
                currency: transaction.currency,
                description: transaction.description,
                status: transaction.status,
                payment_method: transaction.payment_method || (transaction.is_token_payment ? 'saved_card' : 'new_card'),
                is_token_payment: transaction.is_token_payment,
                
                // ✅ INFORMACIÓN DE LA TRANSACCIÓN
                authorization_number: transaction.authorization_number,
                ticket_number: transaction.ticket_number,
                response_description: transaction.response_description,
                
                // ✅ INFORMACIÓN DEL CLIENTE
                customer_info: transaction.customer_info,
                
                // ✅ ITEMS COMPRADOS
                items: transaction.items || [],
                
                // ✅ FECHAS
                purchase_date: transaction.createdAt,
                confirmation_date: transaction.confirmation_date,
                
                // ✅ INFORMACIÓN DE SEGURIDAD (SOLO ALGUNOS CAMPOS)
                security_info: {
                    card_source: transaction.security_information?.card_source,
                    card_country: transaction.security_information?.card_country,
                    risk_index: transaction.security_information?.risk_index
                },
                
                // ✅ TRACKING INFO
                user_type: transaction.user_type,
                device_type: transaction.device_type,
                cart_total_items: transaction.cart_total_items,
                
                // ✅ INFORMACIÓN DE VENTA RELACIONADA (SI EXISTE)
                sale_info: transaction.sale_id ? {
                    id: transaction.sale_id._id,
                    total: transaction.sale_id.total,
                    payment_status: transaction.sale_id.paymentStatus,
                    sale_date: transaction.sale_id.createdAt,
                    notes: transaction.sale_id.notes
                } : null
            };
        });

        // ✅ CALCULAR ESTADÍSTICAS DEL USUARIO
        const userStats = await calculateUserPurchaseStats(req.userId);

        console.log(`✅ Encontradas ${processedPurchases.length} compras para el usuario`);

        res.json({
            message: "Compras obtenidas exitosamente",
            success: true,
            error: false,
            data: {
                purchases: processedPurchases,
                pagination: {
                    current_page: Number(page),
                    total_pages: Math.ceil(totalTransactions / limit),
                    total_items: totalTransactions,
                    items_per_page: Number(limit),
                    has_next: page * limit < totalTransactions,
                    has_prev: page > 1
                },
                user_statistics: userStats
            }
        });

    } catch (error) {
        console.error("❌ Error obteniendo compras del usuario:", error);
        res.status(500).json({
            message: "Error al obtener historial de compras",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ OBTENER DETALLES DE UNA COMPRA ESPECÍFICA
 */
const getPurchaseDetailsController = async (req, res) => {
    try {
        const { purchaseId } = req.params;
        
        console.log("🔍 === OBTENIENDO DETALLES DE COMPRA ===");
        console.log("🆔 Purchase ID:", purchaseId);
        console.log("👤 Usuario:", req.userId);

        if (!req.isAuthenticated || !req.userId) {
            return res.status(401).json({
                message: "Debes iniciar sesión para ver detalles de compras",
                success: false,
                error: true
            });
        }

        // ✅ BUSCAR TRANSACCIÓN
        const transaction = await BancardTransactionModel
            .findOne({
                _id: purchaseId,
                created_by: req.userId // ✅ SOLO PUEDE VER SUS PROPIAS COMPRAS
            })
            .populate('sale_id')
            .populate('created_by', 'name email')
            .lean();

        if (!transaction) {
            return res.status(404).json({
                message: "Compra no encontrada o no tienes permisos para verla",
                success: false,
                error: true
            });
        }

        // ✅ PROCESAR DETALLES COMPLETOS
        const purchaseDetails = {
            // ✅ INFORMACIÓN BÁSICA
            id: transaction._id,
            shop_process_id: transaction.shop_process_id,
            bancard_process_id: transaction.bancard_process_id,
            
            // ✅ INFORMACIÓN FINANCIERA
            amount: transaction.amount,
            currency: transaction.currency,
            tax_amount: transaction.tax_amount || 0,
            
            // ✅ ESTADO Y RESPUESTAS
            status: transaction.status,
            response: transaction.response,
            response_code: transaction.response_code,
            response_description: transaction.response_description,
            extended_response_description: transaction.extended_response_description,
            
            // ✅ INFORMACIÓN DE AUTORIZACIÓN
            authorization_number: transaction.authorization_number,
            ticket_number: transaction.ticket_number,
            
            // ✅ INFORMACIÓN DEL CLIENTE
            customer_info: transaction.customer_info,
            
            // ✅ PRODUCTOS/ITEMS
            items: transaction.items || [],
            cart_total_items: transaction.cart_total_items,
            
            // ✅ MÉTODO DE PAGO
            payment_method: transaction.payment_method,
            is_token_payment: transaction.is_token_payment,
            number_of_payments: transaction.number_of_payments || 1,
            
            // ✅ FECHAS IMPORTANTES
            purchase_date: transaction.createdAt,
            confirmation_date: transaction.confirmation_date,
            transaction_date: transaction.transaction_date,
            
            // ✅ INFORMACIÓN DE SEGURIDAD
            security_information: transaction.security_information,
            
            // ✅ TRACKING Y ANÁLISIS
            user_type: transaction.user_type,
            device_type: transaction.device_type,
            ip_address: transaction.ip_address,
            user_agent: transaction.user_agent,
            referrer_url: transaction.referrer_url,
            
            // ✅ INFORMACIÓN DE ENTREGA
            delivery_method: transaction.delivery_method,
            order_notes: transaction.order_notes,
            
            // ✅ MARKETING
            utm_source: transaction.utm_source,
            utm_medium: transaction.utm_medium,
            utm_campaign: transaction.utm_campaign,
            
            // ✅ ESTADO DE ROLLBACK
            is_rolled_back: transaction.is_rolled_back,
            rollback_date: transaction.rollback_date,
            rollback_reason: transaction.rollback_reason,
            
            // ✅ INFORMACIÓN DE ENTORNO
            environment: transaction.environment,
            
            // ✅ VENTA RELACIONADA
            sale_info: transaction.sale_id ? {
                id: transaction.sale_id._id,
                total: transaction.sale_id.total,
                payment_status: transaction.sale_id.paymentStatus,
                items: transaction.sale_id.items,
                notes: transaction.sale_id.notes,
                created_at: transaction.sale_id.createdAt
            } : null
        };

        console.log("✅ Detalles de compra obtenidos exitosamente");

        res.json({
            message: "Detalles de compra obtenidos exitosamente",
            success: true,
            error: false,
            data: purchaseDetails
        });

    } catch (error) {
        console.error("❌ Error obteniendo detalles de compra:", error);
        res.status(500).json({
            message: "Error al obtener detalles de la compra",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ OBTENER ESTADÍSTICAS DE COMPRAS DEL USUARIO
 */
const getUserPurchaseStatsController = async (req, res) => {
    try {
        console.log("📊 === OBTENIENDO ESTADÍSTICAS DE COMPRAS ===");
        console.log("👤 Usuario:", req.userId);

        if (!req.isAuthenticated || !req.userId) {
            return res.status(401).json({
                message: "Debes iniciar sesión para ver estadísticas",
                success: false,
                error: true
            });
        }

        const stats = await calculateUserPurchaseStats(req.userId);

        res.json({
            message: "Estadísticas obtenidas exitosamente",
            success: true,
            error: false,
            data: stats
        });

    } catch (error) {
        console.error("❌ Error obteniendo estadísticas:", error);
        res.status(500).json({
            message: "Error al obtener estadísticas de compras",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ FUNCIÓN AUXILIAR PARA CALCULAR ESTADÍSTICAS
 */
const calculateUserPurchaseStats = async (userId) => {
    try {
        console.log("📊 Calculando estadísticas para usuario:", userId);

        const baseQuery = {
            created_by: userId,
            $or: [
                { status: 'approved' },
                { bancard_confirmed: true },
                { response: 'S', response_code: '00' }
            ]
        };

        // ✅ ESTADÍSTICAS GENERALES
        const totalPurchases = await BancardTransactionModel.countDocuments(baseQuery);
        
        const totalSpentResult = await BancardTransactionModel.aggregate([
            { $match: baseQuery },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;

        // ✅ COMPRA PROMEDIO
        const averagePurchase = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

        // ✅ MÉTODOS DE PAGO PREFERIDOS
        const paymentMethodsStats = await BancardTransactionModel.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$payment_method', count: { $sum: 1 }, total_amount: { $sum: '$amount' } } },
            { $sort: { count: -1 } }
        ]);

        // ✅ COMPRAS POR MES (ÚLTIMOS 12 MESES)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyPurchases = await BancardTransactionModel.aggregate([
            { 
                $match: { 
                    ...baseQuery,
                    createdAt: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // ✅ ÚLTIMA COMPRA
        const lastPurchase = await BancardTransactionModel
            .findOne(baseQuery)
            .sort({ createdAt: -1 })
            .select('createdAt amount description')
            .lean();

        // ✅ PRODUCTOS MÁS COMPRADOS
        const topProducts = await BancardTransactionModel.aggregate([
            { $match: baseQuery },
            { $unwind: '$items' },
            { 
                $group: { 
                    _id: '$items.name', 
                    quantity: { $sum: '$items.quantity' },
                    total_spent: { $sum: '$items.total' }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 }
        ]);

        const stats = {
            summary: {
                total_purchases: totalPurchases,
                total_spent: totalSpent,
                average_purchase: Math.round(averagePurchase * 100) / 100,
                currency: 'PYG'
            },
            last_purchase: lastPurchase ? {
                date: lastPurchase.createdAt,
                amount: lastPurchase.amount,
                description: lastPurchase.description
            } : null,
            payment_methods: paymentMethodsStats.map(method => ({
                method: method._id || 'no_especificado',
                count: method.count,
                total_amount: method.total_amount,
                percentage: Math.round((method.count / totalPurchases) * 100)
            })),
            monthly_trend: monthlyPurchases.map(month => ({
                year: month._id.year,
                month: month._id.month,
                purchases: month.count,
                amount: month.total_amount
            })),
            top_products: topProducts.map(product => ({
                name: product._id,
                quantity: product.quantity,
                total_spent: product.total_spent
            }))
        };

        console.log("✅ Estadísticas calculadas exitosamente");
        return stats;

    } catch (error) {
        console.error("❌ Error calculando estadísticas:", error);
        return {
            summary: {
                total_purchases: 0,
                total_spent: 0,
                average_purchase: 0,
                currency: 'PYG'
            },
            last_purchase: null,
            payment_methods: [],
            monthly_trend: [],
            top_products: []
        };
    }
};

/**
 * ✅ PARA ADMINS: OBTENER TODAS LAS COMPRAS DE TODOS LOS USUARIOS
 */
const getAllUserPurchasesController = async (req, res) => {
    try {
        console.log("🛒 === ADMIN: OBTENIENDO TODAS LAS COMPRAS ===");
        console.log("👤 Usuario:", req.userId, "Role:", req.userRole);

        // ✅ VERIFICAR QUE ES ADMIN
        if (req.userRole !== 'ADMIN') {
            return res.status(403).json({
                message: "No tienes permisos para acceder a esta información",
                success: false,
                error: true
            });
        }

        const {
            page = 1,
            limit = 20,
            user_id,
            status,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // ✅ CONSTRUIR QUERY
        const query = {
            $or: [
                { status: 'approved' },
                { bancard_confirmed: true },
                { response: 'S', response_code: '00' }
            ]
        };

        if (user_id) {
            query.created_by = user_id;
        }

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        
        const skip = (page - 1) * limit;

        // ✅ OBTENER COMPRAS CON INFORMACIÓN DE USUARIO
        const purchases = await BancardTransactionModel
            .find(query)
            .populate('created_by', 'name email role')
            .populate('sale_id', 'total paymentStatus')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const totalPurchases = await BancardTransactionModel.countDocuments(query);

        res.json({
            message: "Todas las compras obtenidas exitosamente",
            success: true,
            error: false,
            data: {
                purchases: purchases.map(purchase => ({
                    id: purchase._id,
                    shop_process_id: purchase.shop_process_id,
                    amount: purchase.amount,
                    currency: purchase.currency,
                    description: purchase.description,
                    status: purchase.status,
                    payment_method: purchase.payment_method,
                    purchase_date: purchase.createdAt,
                    user: purchase.created_by ? {
                        id: purchase.created_by._id,
                        name: purchase.created_by.name,
                        email: purchase.created_by.email,
                        role: purchase.created_by.role
                    } : null,
                    items_count: purchase.items?.length || 0,
                    authorization_number: purchase.authorization_number,
                    ticket_number: purchase.ticket_number
                })),
                pagination: {
                    current_page: Number(page),
                    total_pages: Math.ceil(totalPurchases / limit),
                    total_items: totalPurchases,
                    items_per_page: Number(limit)
                }
            }
        });

    } catch (error) {
        console.error("❌ Error obteniendo todas las compras:", error);
        res.status(500).json({
            message: "Error al obtener compras",
            success: false,
            error: true,
            details: error.message
        });
    }
};

module.exports = {
    getUserPurchasesController,
    getPurchaseDetailsController,
    getUserPurchaseStatsController,
    getAllUserPurchasesController
};
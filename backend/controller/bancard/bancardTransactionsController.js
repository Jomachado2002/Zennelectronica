// backend/controller/bancard/bancardTransactionsController.js - VERSIÓN MEJORADA CON POPULATE DE PRODUCTOS

const BancardTransactionModel = require('../../models/bancardTransactionModel');
const ProductModel = require('../../models/productModel');
const crypto = require('crypto');
const axios = require('axios');
const uploadProductPermission = require('../../helpers/permission');
const { 
    validateBancardConfig,
    getBancardBaseUrl
} = require('../../helpers/bancardUtils');

/**
 * ✅ OBTENER TODAS LAS TRANSACCIONES CON DATOS COMPLETOS DE PRODUCTOS
 */
const getAllBancardTransactionsController = async (req, res) => {
    try {
        const hasAdminPermission = await uploadProductPermission(req.userId);
        
        
        console.log("👤 Usuario:", {
            userId: req.userId,
            isAuthenticated: req.isAuthenticated,
            userRole: req.userRole,
            hasAdminPermission,
            bancardUserId: req.bancardUserId
        });

        const { 
            status, 
            delivery_status,  // ✅ NUEVO FILTRO
            startDate, 
            endDate, 
            search, 
            limit = 50, 
            page = 1, 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            user_bancard_id,
            payment_method,
            created_by
        } = req.query;

        // ✅ CONSTRUIR QUERY MEJORADA
        let query = {};

        // ✅ FILTROS DE PERMISOS
        if (!hasAdminPermission && req.isAuthenticated) {
            
            query.$or = [
                { created_by: req.userId },
                { user_bancard_id: req.bancardUserId || req.user?.bancardUserId }
            ];
        } else if (!hasAdminPermission && !req.isAuthenticated) {
            
            return res.json({
                message: "Acceso denegado para usuarios no autenticados",
                data: {
                    transactions: [],
                    pagination: { total: 0, page: Number(page), limit: Number(limit), pages: 0 }
                },
                success: true,
                error: false
            });
        }

        // ✅ FILTROS ADICIONALES
        if (status) query.status = status;
        if (delivery_status) query.delivery_status = delivery_status; // ✅ NUEVO
        
        if (startDate || endDate) {
            query.transaction_date = {};
            if (startDate) query.transaction_date.$gte = new Date(startDate);
            if (endDate) query.transaction_date.$lte = new Date(endDate);
        }
        
        if (user_bancard_id) {
            if (query.$or) {
                query = { ...query };
                delete query.$or;
            }
            query.$or = [
                { user_bancard_id: parseInt(user_bancard_id) },
                { user_bancard_id: user_bancard_id },
                { created_by: user_bancard_id }
            ];
        }

        if (created_by) {
            if (query.$or) delete query.$or;
            query.created_by = created_by;
        }
        
        if (payment_method) query.payment_method = payment_method;
        
    

        if (search) {
            const searchQuery = {
                $or: [
                    // ✅ CORREGIDO: Para shop_process_id (Number) - solo coincidencia exacta
                    ...(isNaN(search) ? [] : [{ shop_process_id: parseInt(search) }]),
                    
                    // ✅ Para campos de texto - usar regex normal
                    { bancard_process_id: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { 'customer_info.name': { $regex: search, $options: 'i' } },
                    { 'customer_info.email': { $regex: search, $options: 'i' } },
                    { invoice_number: { $regex: search, $options: 'i' } },
                    { authorization_number: { $regex: search, $options: 'i' } },
                    { tracking_number: { $regex: search, $options: 'i' } }
                ]
            };
            
            if (query.$or) {
                query = {
                    $and: [
                        { $or: query.$or },
                        searchQuery
                    ],
                    ...Object.fromEntries(Object.entries(query).filter(([key]) => key !== '$or'))
                };
            } else {
                query = { ...query, ...searchQuery };
            }
        }

        // ✅ ORDENAMIENTO
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // ✅ PAGINACIÓN
        const skip = (page - 1) * limit;

        console.log("📋 Query de búsqueda:", {
            query: JSON.stringify(query, null, 2),
            sort,
            skip,
            limit: Number(limit)
        });

        // ✅ EJECUTAR CONSULTA CON POPULATE
        const transactions = await BancardTransactionModel
            .find(query)
            .populate('rollback_by', 'name email')
            .populate('created_by', 'name email')
            .populate('delivery_updated_by', 'name email') // ✅ NUEVO
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // ✅ ENRIQUECER CON DATOS DE PRODUCTOS
        const enrichedTransactions = await Promise.all(
            transactions.map(async (transaction) => {
                try {
                    // ✅ BUSCAR PRODUCTOS REALES PARA CADA ITEM
                    const enrichedItems = await Promise.all(
                        (transaction.items || []).map(async (item) => {
                            try {
                                if (item.product_id) {
                                    const product = await ProductModel.findById(item.product_id)
                                        .select('productName brandName category subcategory productImage price sellingPrice stock slug')
                                        .lean();
                                    
                                    if (product) {
                                        return {
                                            ...item,
                                            product_details: {
                                                _id: product._id,
                                                productName: product.productName,
                                                brandName: product.brandName,
                                                category: product.category,
                                                subcategory: product.subcategory,
                                                productImage: product.productImage?.[0] || null, // Solo primera imagen
                                                price: product.price,
                                                sellingPrice: product.sellingPrice,
                                                stock: product.stock,
                                                slug: product.slug
                                            }
                                        };
                                    }
                                }
                                
                                // ✅ Si no se encuentra el producto, usar datos del item
                                return {
                                    ...item,
                                    product_details: {
                                        productName: item.name,
                                        brandName: item.brand || 'N/A',
                                        category: item.category || 'N/A',
                                        productImage: null
                                    }
                                };
                            } catch (productError) {
                                // console.error removed for production
                                return {
                                    ...item,
                                    product_details: {
                                        productName: item.name,
                                        productImage: null
                                    }
                                };
                            }
                        })
                    );

                    // ✅ CALCULAR PROGRESO DE DELIVERY
                    const deliveryProgress = calculateDeliveryProgress(transaction.delivery_status);

                    return {
                        ...transaction,
                        items: enrichedItems,
                        delivery_progress: deliveryProgress,
                        // ✅ RESUMEN ÚTIL PARA LA TABLA
                        summary: {
                            total_products: enrichedItems.length,
                            has_images: enrichedItems.some(item => item.product_details?.productImage),
                            product_names: enrichedItems.slice(0, 2).map(item => item.product_details?.productName || item.name),
                            has_delivery_location: !!(transaction.delivery_location?.lat && transaction.delivery_location?.lng),
                            delivery_address_short: transaction.delivery_location?.address || transaction.delivery_location?.manual_address || 'Sin dirección',
                            customer_name: transaction.customer_info?.name || 'N/A',
                            customer_email: transaction.customer_info?.email || 'N/A',
                            is_tracked: !!transaction.tracking_number
                        }
                    };
                } catch (enrichError) {
                    // console.error removed for production
                    return {
                        ...transaction,
                        items: transaction.items || [],
                        delivery_progress: calculateDeliveryProgress(transaction.delivery_status),
                        summary: {
                            total_products: (transaction.items || []).length,
                            has_images: false,
                            product_names: (transaction.items || []).slice(0, 2).map(item => item.name),
                            has_delivery_location: false,
                            delivery_address_short: 'Error cargando datos',
                            customer_name: transaction.customer_info?.name || 'N/A',
                            customer_email: transaction.customer_info?.email || 'N/A',
                            is_tracked: false
                        }
                    };
                }
            })
        );

        const total = await BancardTransactionModel.countDocuments(query);

        console.log("📊 Resultados enriquecidos:", {
            transactionsFound: enrichedTransactions.length,
            totalCount: total,
            withProducts: enrichedTransactions.filter(t => t.items?.length > 0).length,
            withImages: enrichedTransactions.filter(t => t.summary?.has_images).length
        });

        res.json({
            message: `Transacciones Bancard con datos completos${!hasAdminPermission ? ' (filtradas por usuario)' : ''}`,
            data: {
                transactions: enrichedTransactions,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / limit)
                },
                query_info: {
                    filters_applied: Object.keys(query).length,
                    is_admin_view: hasAdminPermission,
                    user_filtered: !hasAdminPermission && req.isAuthenticated,
                    products_enriched: true
                }
            },
            success: true,
            error: false
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: "Error al obtener transacciones",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ OBTENER DETALLES COMPLETOS DE UNA TRANSACCIÓN
 */
const getBancardTransactionByIdController = async (req, res) => {
    try {
        const hasAdminPermission = await uploadProductPermission(req.userId);
        const { transactionId } = req.params;

        console.log("🔍 Obteniendo transacción completa:", {
            transactionId,
            userId: req.userId,
            hasAdminPermission
        });

        // ✅ BUSCAR TRANSACCIÓN CON TODOS LOS POPULATES
        const transaction = await BancardTransactionModel
            .findById(transactionId)
            .populate('rollback_by', 'name email')
            .populate('created_by', 'name email phone')
            .populate('delivery_updated_by', 'name email')
            .lean();

        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                error: true,
                success: false
            });
        }

        // ✅ VERIFICAR PERMISOS DE ACCESO
        if (!hasAdminPermission) {
            const userCanAccess = req.isAuthenticated && (
                transaction.created_by?._id?.toString() === req.userId ||
                transaction.user_bancard_id === req.bancardUserId ||
                transaction.user_bancard_id === req.user?.bancardUserId
            );

            if (!userCanAccess) {
                return res.status(403).json({
                    message: "No tienes permisos para ver esta transacción",
                    error: true,
                    success: false
                });
            }
        }

        // ✅ ENRIQUECER CON DATOS COMPLETOS DE PRODUCTOS
        const enrichedItems = await Promise.all(
            (transaction.items || []).map(async (item) => {
                try {
                    if (item.product_id) {
                        const product = await ProductModel.findById(item.product_id).lean();
                        
                        if (product) {
                            return {
                                ...item,
                                product_details: {
                                    ...product,
                                    // ✅ CALCULAR DATOS FINANCIEROS
                                    profit_margin: product.sellingPrice > 0 ? 
                                        (((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100).toFixed(2) : 0,
                                    purchase_price_usd: product.purchasePriceUSD,
                                    exchange_rate: product.exchangeRate
                                }
                            };
                        }
                    }
                    
                    return {
                        ...item,
                        product_details: {
                            productName: item.name,
                            brandName: item.brand || 'N/A',
                            category: item.category || 'N/A',
                            productImage: [],
                            price: item.unit_price || item.unitPrice,
                            sellingPrice: item.unit_price || item.unitPrice
                        }
                    };
                } catch (productError) {
                    // console.error removed for production
                    return {
                        ...item,
                        product_details: null
                    };
                }
            })
        );

        // ✅ CALCULAR MÉTRICAS ADICIONALES
        const deliveryProgress = calculateDeliveryProgress(transaction.delivery_status);
        
        // ✅ FORMATEAR DIRECCIÓN DE ENTREGA
        const formattedDeliveryLocation = formatDeliveryLocation(transaction.delivery_location);
        
        // ✅ ANÁLISIS DE DISPOSITIVO
        const deviceAnalysis = analyzeDeviceInfo(transaction.user_agent, transaction.device_type);

        const enrichedTransaction = {
            ...transaction,
            items: enrichedItems,
            delivery_progress: deliveryProgress,
            formatted_delivery_location: formattedDeliveryLocation,
            device_analysis: deviceAnalysis,
            financial_summary: {
                subtotal: enrichedItems.reduce((sum, item) => sum + (item.total || 0), 0),
                tax_amount: transaction.tax_amount || 0,
                total_amount: transaction.amount,
                currency: transaction.currency,
                payment_method_display: getPaymentMethodDisplay(transaction.payment_method),
                has_promotion: transaction.has_promotion || !!transaction.promotion_code
            },
            analytics: {
                utm_data: {
                    source: transaction.utm_source,
                    medium: transaction.utm_medium,
                    campaign: transaction.utm_campaign
                },
                session_info: {
                    ip_address: transaction.ip_address,
                    referrer: transaction.referrer_url,
                    device_type: transaction.device_type,
                    user_agent: transaction.user_agent
                }
            }
        };

        res.json({
            message: "Detalles completos de la transacción",
            data: enrichedTransaction,
            success: true,
            error: false
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: "Error al obtener transacción",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ FUNCIONES AUXILIARES
 */

// Calcular progreso de delivery
function calculateDeliveryProgress(deliveryStatus) {
    const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(deliveryStatus);
    
    const statusInfo = {
        payment_confirmed: { icon: '✅', title: 'Pago Confirmado', color: '#28a745' },
        preparing_order: { icon: '📦', title: 'Preparando Pedido', color: '#ffc107' },
        in_transit: { icon: '🚚', title: 'En Camino', color: '#007bff' },
        delivered: { icon: '📍', title: 'Entregado', color: '#28a745' },
        problem: { icon: '⚠️', title: 'Requiere Atención', color: '#dc3545' }
    };

    return {
        current_status: deliveryStatus,
        current_index: currentIndex,
        progress_percentage: currentIndex >= 0 ? Math.round(((currentIndex + 1) / statuses.length) * 100) : 0,
        status_info: statusInfo[deliveryStatus] || statusInfo.payment_confirmed,
        all_statuses: statuses.map((status, index) => ({
            status,
            ...statusInfo[status],
            completed: index <= currentIndex,
            is_current: index === currentIndex
        }))
    };
}

// Formatear ubicación de entrega
function formatDeliveryLocation(deliveryLocation) {
    if (!deliveryLocation) {
        return {
            has_location: false,
            display_address: 'Sin dirección de entrega',
            google_maps_available: false
        };
    }

    const hasCoordinates = !!(deliveryLocation.lat && deliveryLocation.lng);
    const address = deliveryLocation.address || deliveryLocation.manual_address || '';
    const fullAddress = [
        address,
        deliveryLocation.city,
        deliveryLocation.house_number ? `Casa/Dpto: ${deliveryLocation.house_number}` : '',
        deliveryLocation.reference ? `Ref: ${deliveryLocation.reference}` : ''
    ].filter(Boolean).join(', ');

    return {
        has_location: true,
        has_coordinates: hasCoordinates,
        display_address: fullAddress || 'Dirección no especificada',
        google_maps_url: deliveryLocation.google_maps_url || 
            (hasCoordinates ? `https://maps.google.com/?q=${deliveryLocation.lat},${deliveryLocation.lng}` : null),
        navigation_url: deliveryLocation.navigation_url ||
            (hasCoordinates ? `https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation.lat},${deliveryLocation.lng}` : null),
        coordinates: hasCoordinates ? {
            lat: deliveryLocation.lat,
            lng: deliveryLocation.lng
        } : null,
        delivery_instructions: deliveryLocation.delivery_instructions,
        google_maps_available: hasCoordinates || !!deliveryLocation.google_maps_url
    };
}

// Analizar información del dispositivo
function analyzeDeviceInfo(userAgent, deviceType) {
    const analysis = {
        device_type: deviceType || 'unknown',
        browser: 'Unknown',
        os: 'Unknown',
        is_mobile: false,
        is_tablet: false,
        is_desktop: false
    };

    if (userAgent) {
        // Detectar browser
        if (userAgent.includes('Chrome')) analysis.browser = 'Chrome';
        else if (userAgent.includes('Firefox')) analysis.browser = 'Firefox';
        else if (userAgent.includes('Safari')) analysis.browser = 'Safari';
        else if (userAgent.includes('Edge')) analysis.browser = 'Edge';

        // Detectar OS
        if (userAgent.includes('Windows')) analysis.os = 'Windows';
        else if (userAgent.includes('Mac')) analysis.os = 'macOS';
        else if (userAgent.includes('Linux')) analysis.os = 'Linux';
        else if (userAgent.includes('Android')) analysis.os = 'Android';
        else if (userAgent.includes('iOS')) analysis.os = 'iOS';

        // Detectar tipo de dispositivo
        analysis.is_mobile = /Mobile|Android|iPhone/i.test(userAgent);
        analysis.is_tablet = /iPad|Tablet/i.test(userAgent);
        analysis.is_desktop = !analysis.is_mobile && !analysis.is_tablet;
    }

    return analysis;
}

// Obtener display de método de pago
function getPaymentMethodDisplay(paymentMethod) {
    const methods = {
        'new_card': '🆕 Nueva Tarjeta',
        'saved_card': '💳 Tarjeta Guardada',
        'zimple': '📱 Zimple',
        'cash': '💵 Efectivo',
        'transfer': '🏦 Transferencia'
    };

    return methods[paymentMethod] || paymentMethod;
}

/**
 * ✅ RESTO DE CONTROLADORES EXISTENTES (mantener sin cambios)
 */

const rollbackBancardTransactionController = async (req, res) => {
    try {
        // Validar que el usuario esté autenticado (no guest)
        if (!req.userId || req.userId.toString().startsWith('guest-')) {
            return res.status(401).json({
                message: "Debe estar autenticado para realizar esta acción",
                error: true,
                success: false
            });
        }

        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { transactionId } = req.params;
        const { reason } = req.body;

        // Validar transactionId
        if (!transactionId) {
            return res.status(400).json({
                message: "ID de transacción es requerido",
                error: true,
                success: false
            });
        }

        // Validar formato de ObjectId
        if (!transactionId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message: "ID de transacción inválido",
                error: true,
                success: false
            });
        }

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                error: true,
                success: false
            });
        }

        // Validar que shop_process_id exista
        if (!transaction.shop_process_id) {
            return res.status(400).json({
                message: "La transacción no tiene un shop_process_id válido",
                error: true,
                success: false
            });
        }

        // ✅ LÓGICA MEJORADA: Permitir rollback si:
        // 1. Status es 'approved' (normal)
        // 2. O si está en 'pending' pero tiene authorization_number y ticket_number (dinero ya debitado)
        // 3. O si tiene response_code='00' (aprobado por Bancard aunque no confirmado)
        const hasAuthorization = transaction.authorization_number && transaction.ticket_number;
        const hasApprovalCode = transaction.response_code === '00';
        const isApprovedStatus = transaction.status === 'approved';
        
        // ✅ Verificar si realmente se puede hacer rollback
        const canPerformRollback = isApprovedStatus || 
                                   (transaction.status === 'pending' && (hasAuthorization || hasApprovalCode)) ||
                                   (transaction.status === 'pending' && transaction.bancard_confirmed === true);
        
        if (!canPerformRollback) {
            let reason = "Solo se pueden reversar transacciones aprobadas";
            
            if (transaction.status === 'pending') {
                if (!hasAuthorization && !hasApprovalCode) {
                    reason = "Esta transacción está pendiente y no tiene confirmación de pago. No se puede reversar hasta que se confirme el pago.";
                } else {
                    reason = "Esta transacción está pendiente de confirmación. Intente nuevamente después de que se confirme el pago.";
                }
            } else if (transaction.status === 'rejected') {
                reason = "No se puede reversar una transacción rechazada. Solo se pueden reversar transacciones aprobadas.";
            } else if (transaction.status === 'rolled_back') {
                reason = "Esta transacción ya fue reversada anteriormente.";
            }
            
            return res.status(400).json({
                message: reason,
                error: true,
                success: false,
                error_code: 'CannotRollback',
                details: {
                    status: transaction.status,
                    has_authorization: hasAuthorization,
                    has_approval_code: hasApprovalCode,
                    authorization_number: transaction.authorization_number,
                    ticket_number: transaction.ticket_number,
                    response_code: transaction.response_code,
                    bancard_confirmed: transaction.bancard_confirmed
                }
            });
        }

        if (transaction.is_rolled_back) {
            // ✅ RETORNAR INFORMACIÓN DETALLADA SOBRE EL ROLLBACK PREVIO
            return res.status(400).json({
                message: "Esta transacción ya fue reversada",
                error: true,
                success: false,
                error_code: 'AlreadyRollbackedError',
                details: {
                    rollback_date: transaction.rollback_date,
                    rollback_reason: transaction.rollback_reason,
                    rollback_by: transaction.rollback_by,
                    transaction_id: transactionId,
                    shop_process_id: transaction.shop_process_id
                }
            });
        }
        
        // ✅ VERIFICAR SI HAY INTENTOS PREVIOS FALLIDOS
        if (transaction.rollback_attempted && transaction.rollback_result === 'failed') {
            return res.status(400).json({
                message: transaction.rollback_error_reason || "No se puede reversar esta transacción",
                error: true,
                success: false,
                error_code: transaction.rollback_error_code || 'UnknownError',
                requiresManualReversal: transaction.needs_rollback_check || false,
                can_rollback: transaction.can_rollback !== false,
                details: {
                    previous_attempt_date: transaction.rollback_attempt_date,
                    previous_error: transaction.rollback_error,
                    transaction_id: transactionId,
                    shop_process_id: transaction.shop_process_id
                }
            });
        }

        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            return res.status(500).json({
                message: "Error de configuración de Bancard",
                error: true,
                success: false,
                details: configValidation.error
            });
        }

        // Validar que las variables de entorno estén definidas
        if (!process.env.BANCARD_PRIVATE_KEY || !process.env.BANCARD_PUBLIC_KEY) {
            return res.status(500).json({
                message: "Configuración de Bancard incompleta",
                error: true,
                success: false
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${transaction.shop_process_id}rollback0.00`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: transaction.shop_process_id
            }
        };

        

        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/single_buy/rollback`;
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Zenn-eCommerce/1.0'
            },
            timeout: 30000
        });

        

        if (response.status === 200 && response.data.status === 'success') {
            await BancardTransactionModel.findByIdAndUpdate(transactionId, {
                is_rolled_back: true,
                rollback_date: new Date(),
                rollback_reason: reason || 'Reversado desde panel administrativo',
                rollback_by: req.userId,
                status: 'rolled_back',
                rollback_attempted: true,
                rollback_attempt_date: new Date(),
                rollback_result: 'success',
                rollback_error: null,
                rollback_error_code: null,
                rollback_error_reason: null,
                can_rollback: false,
                needs_rollback_check: false
            });

            

            res.json({
                message: "Transacción reversada exitosamente",
                success: true,
                error: false,
                data: {
                    transaction_id: transactionId,
                    shop_process_id: transaction.shop_process_id,
                    bancard_response: response.data
                }
            });

        } else {
            // ✅ PROCESAR ERRORES DE BANCARD Y GUARDAR INFORMACIÓN DETALLADA
            const messages = response.data?.messages || [];
            const errorMessage = messages.find(msg => msg.level === 'error') || messages[0];
            const errorKey = errorMessage?.key || 'UnknownError';
            const errorDescription = errorMessage?.dsc || errorMessage?.dsc || 'Error desconocido';
            
            // ✅ DETERMINAR TIPO DE ERROR Y MOTIVO
            let rollbackErrorCode = 'UnknownError';
            let rollbackErrorReason = errorDescription;
            let canRollback = false;
            let requiresManualReversal = false;
            
            switch (errorKey) {
                case 'TransactionAlreadyConfirmed':
                    rollbackErrorCode = 'TransactionAlreadyConfirmed';
                    rollbackErrorReason = 'La transacción ya fue confirmada (cuponada) y no puede ser reversada automáticamente. Debe realizar el proceso manual de reversión a través del portal de comercios de Bancard.';
                    requiresManualReversal = true;
                    break;
                case 'AlreadyRollbackedError':
                    rollbackErrorCode = 'AlreadyRollbackedError';
                    rollbackErrorReason = 'Esta transacción ya tiene un rollback previo. No se puede realizar otro rollback.';
                    break;
                case 'PaymentNotFoundError':
                    rollbackErrorCode = 'PaymentNotFoundError';
                    rollbackErrorReason = 'No existe un pedido de pago para esta transacción. El cliente no completó el pago.';
                    break;
                case 'BuyNotFoundError':
                    rollbackErrorCode = 'BuyNotFoundError';
                    rollbackErrorReason = 'No existe el proceso de compra seleccionado.';
                    break;
                case 'InvalidTokenError':
                    rollbackErrorCode = 'InvalidTokenError';
                    rollbackErrorReason = 'El token generado es inválido. Verifique la configuración de Bancard.';
                    break;
                default:
                    rollbackErrorCode = 'UnknownError';
                    rollbackErrorReason = errorDescription || 'Error desconocido al intentar reversar la transacción.';
            }
            
            // ✅ GUARDAR INFORMACIÓN DEL ERROR EN LA TRANSACCIÓN
            await BancardTransactionModel.findByIdAndUpdate(transactionId, {
                rollback_attempted: true,
                rollback_attempt_date: new Date(),
                rollback_error: JSON.stringify(response.data),
                rollback_error_code: rollbackErrorCode,
                rollback_error_reason: rollbackErrorReason,
                rollback_result: 'failed',
                can_rollback: canRollback,
                needs_rollback_check: requiresManualReversal
            });
            
            console.error('❌ Error al reversar transacción:', {
                transaction_id: transactionId,
                shop_process_id: transaction.shop_process_id,
                error_code: rollbackErrorCode,
                error_reason: rollbackErrorReason,
                bancard_response: response.data
            });
            
            // ✅ RETORNAR RESPUESTA DETALLADA
            return res.status(400).json({
                message: rollbackErrorReason,
                error: true,
                success: false,
                error_code: rollbackErrorCode,
                requiresManualReversal: requiresManualReversal,
                can_rollback: canRollback,
                details: {
                    bancard_response: response.data,
                    transaction_id: transactionId,
                    shop_process_id: transaction.shop_process_id
                }
            });
        }

    } catch (error) {
        console.error('❌ Error en rollbackBancardTransactionController:', {
            error: error.message,
            stack: error.stack,
            transactionId: req.params?.transactionId,
            userId: req.userId
        });
        
        let errorMessage = "Error al procesar rollback";
        let errorDetails = error.message;
        let errorCode = 'UnknownError';
        let requiresManualReversal = false;
        
        // Manejar errores de axios
        if (error.response) {
            errorDetails = JSON.stringify(error.response.data || error.response.statusText);
            const messages = error.response.data?.messages || [];
            const errorMsg = messages.find(msg => msg.level === 'error') || messages[0];
            
            if (errorMsg?.key === 'TransactionAlreadyConfirmed') {
                errorCode = 'TransactionAlreadyConfirmed';
                errorMessage = "La transacción ya fue confirmada (cuponada) y no puede ser reversada automáticamente. Debe realizar el proceso manual de reversión a través del portal de comercios de Bancard.";
                requiresManualReversal = true;
            } else if (errorMsg?.key) {
                errorCode = errorMsg.key;
                errorMessage = errorMsg.dsc || errorMessage;
            }
        } else if (error.request) {
            errorCode = 'NetworkError';
            errorMessage = "No se pudo conectar con el servidor de Bancard. Verifique su conexión a internet.";
            errorDetails = "Timeout o error de red";
        }
        
        // Manejar errores de validación de Mongoose
        if (error.name === 'CastError') {
            errorCode = 'InvalidTransactionId';
            errorMessage = "ID de transacción inválido";
            errorDetails = "El formato del ID no es válido";
        }
        
        // ✅ GUARDAR INFORMACIÓN DEL ERROR EN LA TRANSACCIÓN SI EXISTE
        if (req.params?.transactionId) {
            try {
                await BancardTransactionModel.findByIdAndUpdate(req.params.transactionId, {
                    rollback_attempted: true,
                    rollback_attempt_date: new Date(),
                    rollback_error: errorDetails,
                    rollback_error_code: errorCode,
                    rollback_error_reason: errorMessage,
                    rollback_result: 'error',
                    needs_rollback_check: requiresManualReversal
                });
            } catch (dbError) {
                console.error('❌ Error al guardar información de rollback en BD:', dbError.message);
            }
        }
        
        res.status(500).json({
            message: errorMessage,
            success: false,
            error: true,
            error_code: errorCode,
            requiresManualReversal: requiresManualReversal,
            details: errorDetails
        });
    }
};

const checkBancardTransactionStatusController = async (req, res) => {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { transactionId } = req.params;

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                error: true,
                success: false
            });
        }

        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            return res.status(500).json({
                message: "Error de configuración de Bancard",
                error: true,
                success: false
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${transaction.shop_process_id}get_confirmation`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: transaction.shop_process_id
            }
        };

        

        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/single_buy/confirmations`;
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Zenn-eCommerce/1.0'
            },
            timeout: 30000
        });

        

        res.json({
            message: "Estado de transacción consultado",
            success: true,
            error: false,
            data: {
                local_transaction: transaction,
                bancard_status: response.data
            }
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: "Error al consultar estado de la transacción",
            success: false,
            error: true,
            details: error.response?.data || error.message
        });
    }
};

const createBancardTransactionController = async (req, res) => {
    try {
        const {
            shop_process_id,
            bancard_process_id,
            amount,
            currency = 'PYG',
            description,
            customer_info,
            items,
            return_url,
            cancel_url,
            sale_id
        } = req.body;

        // ✅ NORMALIZAR CUSTOMER_INFO
        const normalizedCustomerInfo = {
            name: customer_info?.name || '',
            email: customer_info?.email || '',
            phone: customer_info?.phone || '',
            city: customer_info?.city || '',
            address: customer_info?.address || customer_info?.fullAddress || '',
            houseNumber: customer_info?.houseNumber || '',
            reference: customer_info?.reference || '',
            fullAddress: customer_info?.fullAddress || '',
            document_type: customer_info?.document_type || 'CI',
            document_number: customer_info?.document_number || '',
            invoiceData: customer_info?.invoiceData || { needsInvoice: false },
            location: customer_info?.location || null
        };

        // ✅ NORMALIZAR ITEMS
        const normalizedItems = (items || []).map(item => ({
            product_id: item.product_id || item._id || '',
            name: item.name || item.productName || 'Producto',
            quantity: parseInt(item.quantity) || 1,
            unit_price: parseFloat(item.unitPrice || item.unit_price || 0),
            unitPrice: parseFloat(item.unitPrice || item.unit_price || 0),
            total: parseFloat(item.total || ((item.quantity || 1) * (item.unitPrice || item.unit_price || 0))),
            category: item.category || '',
            brand: item.brand || '',
            sku: item.sku || ''
        }));

        const newTransaction = new BancardTransactionModel({
            shop_process_id,
            bancard_process_id,
            amount,
            currency,
            description,
            customer_info: normalizedCustomerInfo,
            items: normalizedItems,
            return_url,
            cancel_url,
            sale_id,
            environment: process.env.BANCARD_ENVIRONMENT || 'staging',
            created_by: req.userId
        });

        const savedTransaction = await newTransaction.save();

        res.status(201).json({
            message: "Transacción Bancard creada",
            data: savedTransaction,
            success: true,
            error: false
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: "Error al crear transacción",
            success: false,
            error: true,
            details: error.message
        });
    }
};

module.exports = {
    getAllBancardTransactionsController,
    getBancardTransactionByIdController,
    rollbackBancardTransactionController,
    checkBancardTransactionStatusController,
    createBancardTransactionController
};
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
                                console.error(`⚠️ Error obteniendo producto ${item.product_id}:`, productError);
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
                    console.error(`⚠️ Error enriqueciendo transacción ${transaction._id}:`, enrichError);
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
        console.error("❌ Error obteniendo transacciones enriquecidas:", error);
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
                    console.error(`⚠️ Error obteniendo producto ${item.product_id}:`, productError);
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
        console.error("❌ Error obteniendo transacción completa:", error);
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

        
        
        

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                error: true,
                success: false
            });
        }

        if (transaction.status !== 'approved') {
            return res.status(400).json({
                message: "Solo se pueden reversar transacciones aprobadas",
                error: true,
                success: false
            });
        }

        if (transaction.is_rolled_back) {
            return res.status(400).json({
                message: "Esta transacción ya fue reversada",
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
                status: 'rolled_back'
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
            console.error("❌ Error en rollback de Bancard:", response.data);
            
            const isAlreadyConfirmed = response.data.messages?.some(msg => 
                msg.key === 'TransactionAlreadyConfirmed'
            );

            if (isAlreadyConfirmed) {
                return res.status(400).json({
                    message: "La transacción ya fue confirmada y no puede ser reversada automáticamente",
                    error: true,
                    success: false,
                    requiresManualReversal: true,
                    data: response.data
                });
            }

            res.status(400).json({
                message: "Error al reversar transacción en Bancard",
                success: false,
                error: true,
                data: response.data
            });
        }

    } catch (error) {
        console.error("❌ Error en rollback:", error);
        
        let errorMessage = "Error al procesar rollback";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            if (error.response.data?.messages?.[0]?.key === 'TransactionAlreadyConfirmed') {
                errorMessage = "La transacción ya fue confirmada y no puede ser cancelada";
            }
        }
        
        res.status(500).json({
            message: errorMessage,
            success: false,
            error: true,
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
        console.error("❌ Error consultando estado:", error);
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
        console.error("❌ Error creando transacción:", error);
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
// backend/controller/bancard/bancardController.js - VERSIÓN CORREGIDA

const crypto = require('crypto');
const axios = require('axios');
const BancardTransactionModel = require('../../models/bancardTransactionModel');
const SaleModel = require('../../models/saleModel');
const BalanceModel = require('../../models/balanceModel');
const UserModel = require('../../models/userModel');
const ClientModel = require('../../models/clientModel');
const emailService = require('../../services/emailService');
const { sendPurchaseConfirmationEmail } = require('../../services/brevoService');
const metaConversionsService = require('../../services/metaConversionsService');
const { 
    verifyConfirmationToken, 
    validateBancardConfig,
    parseAmount,
    generateSingleBuyToken,
    generateShopProcessId,
    getBancardBaseUrl,
    formatAmount,
    generateRollbackToken
} = require('../../helpers/bancardUtils');

/**
 * ✅ CONTROLADOR MEJORADO PARA CONFIRMACIÓN - CON EMAILS
 */
const bancardConfirmController = async (req, res) => {
    const startTime = Date.now();
    
    try {
        
        
        
        
        
        
        
        

        // ✅ RESPONDER INMEDIATAMENTE A BANCARD
        const responseData = {
            status: "success"
        };

        
        res.status(200).json(responseData);

        // ✅ PROCESAR EN BACKGROUND CON EMAILS
        setImmediate(() => {
            processConfirmationWithEmails(req.body, req.query, req.headers, req.ip);
        });

    } catch (error) {
        // console.error removed for production
        
        res.status(200).json({
            status: "success", 
            message: "Confirmación recibida",
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * ✅ PROCESAMIENTO EN BACKGROUND CON EMAILS
 */
const processConfirmationWithEmails = async (body, query, headers, clientIp) => {
    try {
        
        
        const queryParams = query || {};
        const { operation } = body || {};
        
        const transactionData = {
            token: operation?.token || queryParams.token || '',
            shop_process_id: operation?.shop_process_id || queryParams.shop_process_id || '',
            response: operation?.response || queryParams.response || (queryParams.status === 'success' ? 'S' : 'N'),
            response_details: operation?.response_details || queryParams.response_details || '',
            amount: operation?.amount || queryParams.amount || '',
            currency: operation?.currency || queryParams.currency || 'PYG',
            authorization_number: operation?.authorization_number || queryParams.authorization_number || '',
            ticket_number: operation?.ticket_number || queryParams.ticket_number || '',
            response_code: operation?.response_code || queryParams.response_code || '',
            response_description: operation?.response_description || queryParams.response_description || '',
            extended_response_description: operation?.extended_response_description || queryParams.extended_response_description || '',
            security_information: operation?.security_information || {
                customer_ip: queryParams.customer_ip || '',
                card_source: queryParams.card_source || '',
                card_country: queryParams.card_country || '',
                version: queryParams.version || '0.3',
                risk_index: queryParams.risk_index || '0'
            },
        };

        

        // ✅ VERIFICACIÓN MEJORADA: Según documentación Bancard
        // Un pago es exitoso cuando:
        // 1. response='S' y response_code='00' (según documentación)
        // 2. O cuando hay authorization_number y ticket_number (dinero debitado = exitoso, aunque response_code pueda faltar)
        // 3. O cuando response_code='00' (código de aprobación)
        const hasAuthorization = transactionData.authorization_number && transactionData.ticket_number;
        const hasResponseAndCode = transactionData.response === 'S' && transactionData.response_code === '00';
        const hasApprovalCode = transactionData.response_code === '00';
        
        const isSuccessful = hasResponseAndCode ||
                           queryParams.status === 'success' ||
                           hasAuthorization ||  // ✅ Si hay autorización y ticket, dinero fue debitado = exitoso
                           hasApprovalCode;     // ✅ Si response_code='00', fue aprobado
        
        console.log('🔍 Verificación de éxito del pago:', {
            shop_process_id: transactionData.shop_process_id,
            response: transactionData.response,
            response_code: transactionData.response_code,
            has_authorization: hasAuthorization,
            has_response_and_code: hasResponseAndCode,
            has_approval_code: hasApprovalCode,
            is_successful: isSuccessful
        });

        

        // ✅ BUSCAR Y ACTUALIZAR TRANSACCIÓN
        if (transactionData.shop_process_id) {
            try {
                const transaction = await BancardTransactionModel.findOne({ 
                    shop_process_id: parseInt(transactionData.shop_process_id) 
                });
                
                console.log(`🔍 Buscando transacción: ${transactionData.shop_process_id}`, {
                    found: !!transaction,
                    currentStatus: transaction?.status
                });

                if (transaction) {
                    let shouldSendEmail = false;
                    let emailSent = false;

                    if (isSuccessful) {
                        // ✅ PREPARAR DATOS DE ACTUALIZACIÓN
                        const updateData = {
                            status: 'approved',
                            response: transactionData.response,
                            response_code: transactionData.response_code,
                            response_description: transactionData.response_description,
                            authorization_number: transactionData.authorization_number,
                            ticket_number: transactionData.ticket_number,
                            security_information: transactionData.security_information || {},
                            confirmation_date: new Date(),
                            extended_response_description: transactionData.extended_response_description,
                            bancard_confirmed: true,
                            // ✅ MARCAR COMO VISIBLE EN HISTORIAL DE COMPRAS
                            show_in_user_purchases: true,
                            visible_to_user: true
                        };

                        // ✅ ACTUALIZAR USER_ID SI ERA GUEST PERO TENEMOS UN USUARIO REAL
                        // Esto puede pasar si el usuario inició sesión después de crear el pago
                        const currentUserId = transaction.created_by || transaction.user_id;
                        if (currentUserId && typeof currentUserId === 'string' && currentUserId.startsWith('guest-')) {
                            // La transacción se creó como invitado, intentar encontrar el usuario real
                            const customerEmail = transaction.customer_info?.email;
                            if (customerEmail) {
                                try {
                                    const realUser = await UserModel.findOne({ email: customerEmail }).select('_id bancardUserId');
                                    if (realUser) {
                                        updateData.created_by = realUser._id;
                                        updateData.user_bancard_id = realUser.bancardUserId;
                                        updateData.user_type = 'REGISTERED';
                                        console.log('✅ Transacción actualizada: usuario guest → usuario real', {
                                            guest_id: currentUserId,
                                            real_user_id: realUser._id,
                                            email: customerEmail
                                        });
                                    }
                                } catch (userLookupError) {
                                    console.warn('⚠️ No se pudo buscar usuario real:', userLookupError.message);
                                }
                            }
                        }

                        // ✅ ACTUALIZAR TRANSACCIÓN
                        await BancardTransactionModel.findByIdAndUpdate(transaction._id, updateData);

                        console.log('✅ Transacción aprobada y marcada para historial del usuario:', {
                            transaction_id: transaction._id,
                            user_id: updateData.created_by || transaction.created_by || transaction.user_id,
                            shop_process_id: transaction.shop_process_id,
                            will_show_in_purchases: true,
                            was_guest: typeof currentUserId === 'string' && currentUserId.startsWith('guest-'),
                            now_registered: !!updateData.created_by
                        });
                        
                        shouldSendEmail = true;

                        // ✅ NOTA: LA VENTA SE CREARÁ AUTOMÁTICAMENTE CUANDO EL PEDIDO SEA MARCADO COMO "DELIVERED"
                        // La creación de venta ahora se maneja en bancardDeliveryController cuando delivery_status = 'delivered'
                        console.log('ℹ️ Pago aprobado. La venta se creará cuando el pedido sea marcado como entregado.');

                        // ✅ ENVIAR EMAIL DE COMPRA APROBADA (sistema antiguo)
                        try {
                            const updatedTransaction = await BancardTransactionModel.findById(transaction._id);
                            
                            
                            const emailResult = await emailService.sendPurchaseConfirmationEmail(updatedTransaction, true);
                            
                            if (emailResult.success) {
                                
                                emailSent = true;
                            } else {
                                // console.error removed for production
                            }

                            // ✅ ENVIAR NOTIFICACIÓN A ADMINS
                            const adminEmailResult = await emailService.sendAdminNotificationEmail(updatedTransaction, 'pago_aprobado');
                            if (adminEmailResult.success) {
                                
                            }

                            // ✅ TRACKEAR COMPRA EN META CONVERSIONS API (server-side)
                            try {
                                const transactionAmount = parseFloat(updatedTransaction.amount || transactionData.amount || 0);
                                const contentIds = (updatedTransaction.items || []).map(item => {
                                    // Generar ID consistente con el formato del frontend
                                    if (item.productId && item.productId._id) {
                                        const product = item.productId;
                                        const brand = (product.brandName || 'prod').substring(0, 3).toLowerCase().replace(/[^a-z0-9]/g, '');
                                        const category = (product.subcategory || product.category || 'item').substring(0, 3).toLowerCase().replace(/[^a-z0-9]/g, '');
                                        return `${brand}${category}${product._id}`.substring(0, 50);
                                    }
                                    return null;
                                }).filter(Boolean);

                                const userData = {
                                    email: updatedTransaction.customer_info?.email,
                                    phone: updatedTransaction.customer_info?.phone,
                                    firstName: updatedTransaction.customer_info?.name?.split(' ')[0],
                                    lastName: updatedTransaction.customer_info?.name?.split(' ').slice(1).join(' ')
                                };

                                await metaConversionsService.trackPurchase({
                                    transactionId: String(updatedTransaction.shop_process_id),
                                    value: transactionAmount,
                                    currency: updatedTransaction.currency || 'PYG',
                                    contentIds: contentIds,
                                    userData: userData,
                                    eventSourceUrl: 'https://www.zenn.com.py',
                                    userAgent: headers?.['user-agent'],
                                    clientIp: clientIp,
                                    eventId: `purchase_${updatedTransaction.shop_process_id}_${Date.now()}`
                                });

                                console.log('✅ Meta Conversions API: Compra trackeada correctamente', {
                                    transaction_id: updatedTransaction.shop_process_id,
                                    amount: transactionAmount
                                });
                            } catch (metaTrackingError) {
                                // No bloquear el flujo si falla el tracking
                                console.warn('⚠️ Error al trackear compra en Meta:', metaTrackingError.message);
                            }

                        } catch (emailError) {
                            // console.error removed for production
                        }

                    } else {
                        // ✅ ACTUALIZAR COMO RECHAZADA Y VERIFICAR SI SE NECESITA ROLLBACK
                        const updateRejectedData = {
                            status: 'rejected',
                            response: transactionData.response,
                            response_code: transactionData.response_code,
                            response_description: transactionData.response_description,
                            extended_response_description: transactionData.extended_response_description,
                            confirmation_date: new Date(),
                            bancard_confirmed: true
                        };

                        // ✅ VERIFICAR SI EL DINERO SE DESCONTÓ PERO HAY ERROR
                        // Si hay authorization_number o ticket_number pero el response_code no es '00',
                        // puede que el dinero se haya debitado pero la transacción fue rechazada
                        const hasAuthorization = transactionData.authorization_number || transactionData.ticket_number;
                        const isErrorCode = transactionData.response_code && transactionData.response_code !== '00';
                        
                        if (hasAuthorization && isErrorCode) {
                            console.warn('⚠️ Posible débito con error detectado. Se requiere verificación de rollback.', {
                                shop_process_id: transactionData.shop_process_id,
                                response_code: transactionData.response_code,
                                authorization_number: transactionData.authorization_number,
                                ticket_number: transactionData.ticket_number
                            });
                            updateRejectedData.needs_rollback_check = true;
                            updateRejectedData.rollback_attempted = false;
                            
                            // ✅ INTENTAR ROLLBACK AUTOMÁTICO EN BACKGROUND
                            setImmediate(() => {
                                attemptAutomaticRollback(transactionData.shop_process_id, transaction._id.toString());
                            });
                        }

                        await BancardTransactionModel.findByIdAndUpdate(transaction._id, updateRejectedData);

                        
                        shouldSendEmail = true;

                        // ✅ ENVIAR EMAIL DE COMPRA RECHAZADA
                        try {
                            const updatedTransaction = await BancardTransactionModel.findById(transaction._id);
                            
                            
                            const emailResult = await emailService.sendPurchaseConfirmationEmail(updatedTransaction, false);
                            
                            if (emailResult.success) {
                                
                                emailSent = true;
                            } else {
                                // console.error removed for production
                            }

                            // ✅ ENVIAR NOTIFICACIÓN A ADMINS
                            const adminEmailResult = await emailService.sendAdminNotificationEmail(updatedTransaction, 'pago_rechazado');
                            if (adminEmailResult.success) {
                                
                            }

                        } catch (emailError) {
                            // console.error removed for production
                        }
                    }

                    
                }

                // ✅ PROCESAR CARGA DE SALDO SI ES UNA TRANSACCIÓN DE CARGA
                if (transaction && transaction.balance_load) {
                    await processBalanceLoadConfirmation(transactionData);
                }
            } catch (dbError) {
                // console.error removed for production
            }
        }

        

    } catch (error) {
        // console.error removed for production
    }
};

const bancardConfirmGetController = (req, res) => {
    try {
        
        
        
        
        res.status(200).json({
            status: "success",
            message: "Endpoint de confirmación activo",
            timestamp: new Date().toISOString(),
            service: "bancard-confirmation",
            method: "GET",
            ready: true,
            environment: process.env.BANCARD_ENVIRONMENT || 'staging'
        });
        
    } catch (error) {
        // console.error removed for production
        res.status(200).json({
            status: "success",
            message: "Endpoint funcionando",
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * ✅ CONTROLADOR PARA CREAR PAGOS OCASIONALES - CON EMAILS
 */
const createPaymentController = async (req, res) => {
    try {
        
        
        
        
        
        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            // console.error removed for production
            return res.status(500).json({
                message: "Error de configuración del sistema de pagos",
                success: false,
                error: true,
                details: configValidation.errors
            });
        }

        

        const {
            amount,
            currency = 'PYG',
            description,
            return_url,
            cancel_url,
            customer_info,
            items,
            sale_id,
            delivery_location,
            promotion_code = "",
            user_type = 'GUEST',
            payment_method = 'new_card',
            user_bancard_id = null,
            user_agent = '',
            payment_session_id = '',
            device_type = 'unknown',
            cart_total_items = 0,
            referrer_url = '',
            order_notes = '',
            delivery_method = 'pickup',
            invoice_number = '',
            tax_amount = 0,
            utm_source = '',
            utm_medium = '',
            utm_campaign = ''
        } = req.body;

        const finalUserType = req.isAuthenticated === true ? 'REGISTERED' : 'GUEST';
        const finalUserBancardId = req.isAuthenticated === true ? (req.bancardUserId || req.user?.bancardUserId) : null;
        const clientIpAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        console.log("🔍 Variables de tracking declaradas:", {
            finalUserType,
            finalUserBancardId,
            clientIpAddress,
            isAuthenticated: req.isAuthenticated,
            userId: req.userId
        });

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "El monto debe ser mayor a 0",
                success: false,
                error: true
            });
        }

        if (!description) {
            return res.status(400).json({
                message: "La descripción es requerida",
                success: false,
                error: true
            });
        }

        const confirmationUrl = process.env.BANCARD_CONFIRMATION_URL;
        
        if (!confirmationUrl) {
            // console.error removed for production
            return res.status(500).json({
                message: "Error de configuración: URL de confirmación no configurada",
                success: false,
                error: true
            });
        }

        

        const shopProcessId = generateShopProcessId();
        
        
        const formattedAmount = formatAmount(amount);
        
        console.log("💰 Montos formateados:", {
            amount: formattedAmount,
        });
        
        const token = generateSingleBuyToken(shopProcessId, formattedAmount, currency);

        const backendUrl = process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'https://zenn.vercel.app';
        

        // ✅ PAYLOAD PARA PAGO OCASIONAL
        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: shopProcessId,
                amount: formattedAmount,
                currency: currency,
                description: description.substring(0, 20),
                return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
                cancel_url: `${process.env.FRONTEND_URL}/pago-cancelado`
            }
        };

        // ✅ AGREGAR PROMOCIÓN SI ES VÁLIDA
        if (promotion_code && promotion_code.trim() !== "") {
            const promotionRegex = /^\d{3}[A-Z]{2}\s[A-Z]{3}\d{6}$/;
            const cleanPromotionCode = promotion_code.trim();
            
            if (promotionRegex.test(cleanPromotionCode)) {
                payload.operation.additional_data = cleanPromotionCode;
                console.log("🎟️ Promoción válida aplicada al pago ocasional:", {
                    promotion_code: promotion_code,
                    additional_data: payload.operation.additional_data
                });
            } else {
                
                
            }
        }

        console.log("📤 Payload para Bancard (PAGO OCASIONAL):", {
            ...JSON.parse(JSON.stringify(payload, null, 2)),
            operation: {
                ...payload.operation,
                token: "***OCULTO***"
            }
        });

        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/single_buy`;
        
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'zenn-eCommerce/1.0',
                'Cache-Control': 'no-cache'
            },
            timeout: 30000,
            validateStatus: function (status) {
                return status < 500;
            }
        });

        
        

        if (response.status === 200 && response.data) {
            if (response.data.status === 'success') {
                
                
                const processId = response.data.process_id;
                const iframeUrl = `${getBancardBaseUrl()}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;

                // ✅ GUARDAR TRANSACCIÓN EN BD
                try {
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
                        invoiceData: customer_info?.invoiceData || {
                            needsInvoice: false
                        },
                        location: customer_info?.location || null
                    };

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

                    console.log("📋 Datos normalizados:", {
                        customer_info: normalizedCustomerInfo,
                        items: normalizedItems.length,
                        user_type: finalUserType,
                        has_promotion: !!payload.operation.additional_data
                    });

                    const newTransaction = new BancardTransactionModel({
                        shop_process_id: parseInt(shopProcessId),
                        bancard_process_id: processId,
                        amount: parseFloat(formattedAmount),
                        currency: currency,
                        description: description,
                        customer_info: normalizedCustomerInfo,
                        items: normalizedItems,
                        return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
                        cancel_url: `${process.env.FRONTEND_URL}/pago-cancelado`,
                        status: 'pending',
                        environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                        sale_id: sale_id || null,
                        created_by: req.userId || null,
                        is_certification_test: false,
                        
                        delivery_location: delivery_location ? {
                            lat: parseFloat(delivery_location.lat) || null,
                            lng: parseFloat(delivery_location.lng) || null,
                            address: delivery_location.address || delivery_location.google_address || '',
                            manual_address: delivery_location.manual_address || '',
                            full_address: delivery_location.full_address || 
                                `${delivery_location.manual_address || delivery_location.address || ''}, ${delivery_location.city || ''}`,
                            city: delivery_location.city || '',
                            house_number: delivery_location.house_number || '',
                            reference: delivery_location.reference || '',
                            source: delivery_location.source || 'user_selected',
                            timestamp: new Date(),
                            google_maps_url: delivery_location.google_maps_url || 
                                (delivery_location.lat && delivery_location.lng ? 
                                    `https://maps.app.goo.gl/?link=https://www.google.com/maps?q=${delivery_location.lat},${delivery_location.lng}&z=18&t=m` :
                                    null),
                            google_maps_alternative_url: delivery_location.google_maps_alternative_url ||
                                (delivery_location.lat && delivery_location.lng ? 
                                    `https://www.google.com/maps/place/${delivery_location.lat},${delivery_location.lng}/@${delivery_location.lat},${delivery_location.lng},17z` :
                                    null),
                            navigation_url: delivery_location.lat && delivery_location.lng ? 
                                `https://www.google.com/maps/dir/?api=1&destination=${delivery_location.lat},${delivery_location.lng}` :
                                delivery_location.navigation_url || null,
                            coordinates_string: delivery_location.coordinates_string ||
                                (delivery_location.lat && delivery_location.lng ? 
                                    `${delivery_location.lat},${delivery_location.lng}` : null),
                            delivery_instructions: delivery_location.delivery_instructions || 
                                `📍 UBICACIÓN DE ENTREGA:
                        🏠 Dirección: ${delivery_location.address || delivery_location.manual_address || 'No especificada'}
                        🏘️ Ciudad: ${delivery_location.city || 'No especificada'}
                        🏡 Casa/Edificio: ${delivery_location.house_number || 'No especificado'}
                        📝 Referencia: ${delivery_location.reference || 'Sin referencia adicional'}

                        🗺️ VER UBICACIÓN EN GOOGLE MAPS:
                        ${delivery_location.google_maps_url || 
                        (delivery_location.lat && delivery_location.lng ? 
                            `https://maps.app.goo.gl/?link=https://www.google.com/maps?q=${delivery_location.lat},${delivery_location.lng}&z=18&t=m` :
                            'No disponible')}

                        🧭 COORDENADAS EXACTAS: ${delivery_location.lat || 'N/A'}, ${delivery_location.lng || 'N/A'}

                        📱 Para navegación: ${delivery_location.lat && delivery_location.lng ? 
                            `https://www.google.com/maps/dir/?api=1&destination=${delivery_location.lat},${delivery_location.lng}` :
                            'No disponible'}`,

                        } : {
                            lat: null,
                            lng: null,
                            google_maps_url: null,
                            google_maps_alternative_url: null,
                            navigation_url: null,
                            coordinates_string: null,
                            address: '',
                            manual_address: '',
                            full_address: '',
                            city: '',
                            house_number: '',
                            reference: '',
                            source: 'not_provided',
                            timestamp: new Date(),
                            delivery_instructions: '⚠️ UBICACIÓN NO PROPORCIONADA\n\n📞 IMPORTANTE: Contactar al cliente para coordinar la entrega\n\nDatos de contacto en customer_info'
                        },

                        user_type: finalUserType,
                        payment_method: payment_method,
                        user_bancard_id: finalUserBancardId,
                        ip_address: clientIpAddress,
                        user_agent: user_agent || req.headers['user-agent'] || '',
                        payment_session_id: payment_session_id,
                        device_type: device_type,
                        cart_total_items: cart_total_items || normalizedItems.length,
                        referrer_url: referrer_url || req.headers.referer || '',
                        order_notes: typeof order_notes === 'object' ? JSON.stringify(order_notes) : String(order_notes || ''),
                        delivery_method: delivery_method,
                        invoice_number: invoice_number || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        tax_amount: parseFloat(tax_amount) || 0,
                        utm_source: utm_source,
                        utm_medium: utm_medium,
                        utm_campaign: utm_campaign,
                        is_token_payment: false,
                        alias_token: null,
                        promotion_code: promotion_code || null,
                        has_promotion: !!payload.operation.additional_data
                    });

                    const savedTransaction = await newTransaction.save();
                    console.log("✅ Transacción de pago ocasional guardada en BD:", {
                        id: savedTransaction._id,
                        shop_process_id: savedTransaction.shop_process_id,
                        has_promotion: savedTransaction.has_promotion,
                        delivery_location_saved: !!savedTransaction.delivery_location,
                        google_maps_url: savedTransaction.delivery_location?.google_maps_url || 'No disponible',
                        navigation_url: savedTransaction.delivery_location?.navigation_url || 'No disponible',
                        delivery_address: savedTransaction.delivery_location?.full_address || 'Sin dirección',
                        delivery_coordinates: savedTransaction.delivery_location ? {
                            lat: savedTransaction.delivery_location.lat,
                            lng: savedTransaction.delivery_location.lng,
                            hasCoords: !!(savedTransaction.delivery_location.lat && savedTransaction.delivery_location.lng)
                        } : null
                    });

                    // ✅ ENVIAR NOTIFICACIÓN A ADMINS DE NUEVA COMPRA INICIADA
                    try {
                        
                        const adminEmailResult = await emailService.sendAdminNotificationEmail(savedTransaction, 'nueva_compra');
                        if (adminEmailResult.success) {
                            
                        } else {
                            // console.error removed for production
                        }
                    } catch (emailError) {
                        // console.error removed for production
                    }

                } catch (dbError) {
                    // console.error removed for production
                    
                }
                
                console.log("🔗 URLs generadas:", {
                    process_id: processId,
                    iframe_script_url: iframeUrl
                });
                
                return res.json({
                    message: "Pago ocasional creado exitosamente",
                    success: true,
                    error: false,
                    data: {
                        shop_process_id: shopProcessId,
                        process_id: processId,
                        amount: formattedAmount,
                        currency: currency,
                        description: description,
                        has_promotion: !!payload.operation.additional_data,
                        promotion_applied: payload.operation.additional_data || null,
                        
                        iframe_config: {
                            script_url: iframeUrl,
                            process_id: processId,
                            container_id: 'bancard-iframe-container',
                            initialization_code: `
                                window.onload = function() {
                                    if (window.Bancard && window.Bancard.Checkout) {
                                        Bancard.Checkout.createForm('bancard-iframe-container', '${processId}', {
                                            'form-background-color': '#ffffff',
                                            'button-background-color': '#2A3190',
                                            'button-text-color': '#ffffff',
                                            'button-border-color': '#2A3190',
                                            'input-background-color': '#ffffff',
                                            'input-text-color': '#555555',
                                            'input-placeholder-color': '#999999'
                                        });
                                    }
                                };
                            `
                        },
                        
                        return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
                        cancel_url: `${process.env.FRONTEND_URL}/pago-cancelado`,
                        
                        bancard_config: {
                            environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                            base_url: getBancardBaseUrl(),
                            certification_mode: false
                        }
                    }
                });
            } else {
                // console.error removed for production
                return res.status(400).json({
                    message: "Error al crear el pago en Bancard",
                    success: false,
                    error: true,
                    details: response.data
                });
            }
        } else {
            // console.error removed for production
            return res.status(500).json({
                message: "Respuesta inesperada de Bancard",
                success: false,
                error: true,
                details: { status: response.status, data: response.data }
            });
        }

    } catch (error) {
        // console.error removed for production
        return res.status(500).json({
            message: "Error interno del servidor",
            success: false,
            error: true,
            details: error.message
        });
    }
};

const getTransactionStatusController = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        
        
        
        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            return res.status(500).json({
                message: "Error de configuración del sistema",
                success: false,
                error: true
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${transactionId}get_confirmation`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: parseInt(transactionId)
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
            message: "Estado obtenido exitosamente",
            success: true,
            error: false,
            data: response.data
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

const rollbackPaymentController = async (req, res) => {
    try {
        const { shop_process_id } = req.body;
        
        if (!shop_process_id) {
            return res.status(400).json({
                message: "shop_process_id es requerido",
                success: false,
                error: true
            });
        }

        // Validar que shop_process_id sea un número válido
        const shopProcessId = parseInt(shop_process_id);
        if (isNaN(shopProcessId) || shopProcessId <= 0) {
            return res.status(400).json({
                message: "shop_process_id debe ser un número válido",
                success: false,
                error: true
            });
        }

        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            return res.status(500).json({
                message: "Error de configuración del sistema",
                success: false,
                error: true,
                details: configValidation.error
            });
        }

        // Validar que las variables de entorno estén definidas
        if (!process.env.BANCARD_PRIVATE_KEY || !process.env.BANCARD_PUBLIC_KEY) {
            return res.status(500).json({
                message: "Configuración de Bancard incompleta",
                success: false,
                error: true
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${shopProcessId}rollback0.00`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: shopProcessId
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

        // Verificar si el rollback fue exitoso
        if (response.status === 200 && response.data.status === 'success') {
            try {
                await BancardTransactionModel.findOneAndUpdate(
                    { shop_process_id: shopProcessId },
                    {
                        is_rolled_back: true,
                        rollback_date: new Date(),
                        rollback_reason: req.body.reason || 'Rollback solicitado',
                        status: 'rolled_back'
                    },
                    { new: true }
                );
            } catch (dbError) {
                console.error('❌ Error al actualizar transacción en BD:', dbError.message);
                // Continuar aunque falle la actualización en BD
            }

            return res.json({
                message: "Rollback procesado exitosamente",
                success: true,
                error: false,
                data: response.data
            });
        } else {
            // Manejar respuestas de error de Bancard
            const messages = response.data?.messages || [];
            const errorKey = messages.find(msg => msg.level === 'error')?.key || messages[0]?.key;

            // Verificar diferentes tipos de errores según la documentación de Bancard
            if (errorKey === 'TransactionAlreadyConfirmed') {
                return res.status(409).json({
                    message: "La transacción ya fue confirmada (cuponada) y no puede ser reversada automáticamente. Debe realizar el proceso manual de reversión a través del portal de comercios de Bancard.",
                    success: false,
                    error: true,
                    errorCode: 'TransactionAlreadyConfirmed',
                    requiresManualReversal: true,
                    data: response.data
                });
            }

            if (errorKey === 'AlreadyRollbackedError') {
                return res.status(409).json({
                    message: "Esta transacción ya tiene un rollback previo. No se puede realizar otro rollback.",
                    success: false,
                    error: true,
                    errorCode: 'AlreadyRollbackedError',
                    data: response.data
                });
            }

            if (errorKey === 'PaymentNotFoundError') {
                return res.status(404).json({
                    message: "No existe un pedido de pago para esta transacción. El cliente no completó el pago.",
                    success: false,
                    error: true,
                    errorCode: 'PaymentNotFoundError',
                    data: response.data
                });
            }

            if (errorKey === 'BuyNotFoundError') {
                return res.status(404).json({
                    message: "No existe el proceso de compra seleccionado.",
                    success: false,
                    error: true,
                    errorCode: 'BuyNotFoundError',
                    data: response.data
                });
            }

            // Error genérico de Bancard
            const errorDescription = messages.find(msg => msg.dsc)?.dsc || 'Error desconocido en rollback';
            return res.status(response.status || 400).json({
                message: errorDescription,
                success: false,
                error: true,
                errorCode: errorKey || 'UnknownError',
                data: response.data
            });
        }

    } catch (error) {
        console.error('❌ Error en rollbackPaymentController:', {
            error: error.message,
            stack: error.stack,
            shop_process_id: req.body?.shop_process_id,
            responseStatus: error.response?.status,
            responseData: error.response?.data
        });
        
        let errorMessage = "Error al procesar rollback";
        let errorDetails = error.message;
        let statusCode = 500;
        let errorCode = 'UnknownError';
        
        // Manejar errores de axios (respuestas HTTP con error)
        if (error.response) {
            statusCode = error.response.status;
            const responseData = error.response.data || {};
            const messages = responseData.messages || [];
            
            // Buscar el mensaje de error específico
            const errorMsg = messages.find(msg => msg.level === 'error') || messages[0];
            
            if (errorMsg) {
                errorCode = errorMsg.key || 'UnknownError';
                errorDetails = errorMsg.dsc || errorMessage;
                
                // Mensajes específicos según el código de error de Bancard
                switch (errorCode) {
                    case 'TransactionAlreadyConfirmed':
                        errorMessage = "La transacción ya fue confirmada (cuponada) y no puede ser reversada automáticamente. Debe realizar el proceso manual de reversión a través del portal de comercios de Bancard.";
                        statusCode = 409;
                        break;
                    case 'AlreadyRollbackedError':
                        errorMessage = "Esta transacción ya tiene un rollback previo. No se puede realizar otro rollback.";
                        statusCode = 409;
                        break;
                    case 'PaymentNotFoundError':
                        errorMessage = "No existe un pedido de pago para esta transacción. El cliente no completó el pago.";
                        statusCode = 404;
                        break;
                    case 'BuyNotFoundError':
                        errorMessage = "No existe el proceso de compra seleccionado.";
                        statusCode = 404;
                        break;
                    case 'InvalidTokenError':
                        errorMessage = "El token generado es inválido. Verifique la configuración de Bancard.";
                        statusCode = 400;
                        break;
                    case 'InvalidPublicKeyError':
                        errorMessage = "La clave pública es inválida. Verifique la configuración de Bancard.";
                        statusCode = 400;
                        break;
                    case 'PosCommunicationError':
                        errorMessage = "Error de comunicación con el sistema de Bancard. Intente nuevamente más tarde.";
                        statusCode = 503;
                        break;
                    default:
                        errorMessage = errorDetails || errorMessage;
                }
            } else {
                errorDetails = JSON.stringify(responseData);
            }
        } else if (error.request) {
            // Error de red (sin respuesta del servidor)
            errorMessage = "No se pudo conectar con el servidor de Bancard. Verifique su conexión a internet.";
            errorDetails = "Timeout o error de red";
            statusCode = 503;
            errorCode = 'NetworkError';
        }
        
        res.status(statusCode).json({
            message: errorMessage,
            success: false,
            error: true,
            errorCode: errorCode,
            details: errorDetails,
            requiresManualReversal: errorCode === 'TransactionAlreadyConfirmed'
        });
    }
};

const bancardHealthController = (req, res) => {
    
    
    const configValidation = validateBancardConfig();
    
    res.status(200).json({
        status: "healthy",
        message: "Servicio de Bancard funcionando",
        timestamp: new Date().toISOString(),
        service: "bancard-integration",
        version: "2.0.0",
        environment: process.env.BANCARD_ENVIRONMENT || 'staging',
        base_url: getBancardBaseUrl(),
        config_valid: configValidation.isValid,
        config_errors: configValidation.errors || [],
        config_details: configValidation.config
    });
};

/**
 * ✅ CONTROLADOR PARA CARGAR SALDO CON BANCARD
 */
const loadBalanceController = async (req, res) => {
    try {
        // console.log removed for production
        
        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            // console.error removed for production
            return res.status(500).json({
                message: "Error de configuración del sistema de pagos",
                success: false,
                error: true,
                details: configValidation.errors
            });
        }

        const {
            amount,
            currency = 'PYG',
            description = 'Carga de saldo Zenn',
            user_id,
            customer_info = {}
        } = req.body;

        // Validaciones
        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "El monto debe ser mayor a 0",
                success: false,
                error: true
            });
        }

        if (!user_id) {
            return res.status(400).json({
                message: "ID de usuario es requerido",
                success: false,
                error: true
            });
        }

        // Verificar que el usuario existe
        const user = await UserModel.findById(user_id);
        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado",
                success: false,
                error: true
            });
        }

        // Generar IDs únicos para la transacción
        const shopProcessId = generateShopProcessId();
        const formattedAmount = formatAmount(amount);
        const token = generateSingleBuyToken(shopProcessId, formattedAmount, currency);

        // Payload para Bancard
        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: shopProcessId,
                amount: formattedAmount,
                currency: currency,
                description: `Carga de saldo - ${user.name}`,
                return_url: `${process.env.FRONTEND_URL}/carga-saldo-exitosa`,
                cancel_url: `${process.env.FRONTEND_URL}/carga-saldo-cancelada`
            }
        };

        console.log("📤 Payload para carga de saldo:", {
            ...JSON.parse(JSON.stringify(payload, null, 2)),
            operation: {
                ...payload.operation,
                token: "***OCULTO***"
            }
        });

        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/single_buy`;
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'zenn-eCommerce/1.0',
                'Cache-Control': 'no-cache'
            },
            timeout: 30000,
            validateStatus: function (status) {
                return status < 500;
            }
        });

        if (response.status === 200 && response.data) {
            if (response.data.status === 'success') {
                const processId = response.data.process_id;
                const iframeUrl = `${getBancardBaseUrl()}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;

                // Guardar transacción de carga de saldo en BD
                try {
                    const newTransaction = new BancardTransactionModel({
                        shop_process_id: parseInt(shopProcessId),
                        bancard_process_id: processId,
                        amount: parseFloat(formattedAmount),
                        currency: currency,
                        description: `Carga de saldo - ${user.name}`,
                        customer_info: {
                            name: user.name || customer_info.name || '',
                            email: user.email || customer_info.email || '',
                            phone: user.phone || customer_info.phone || '',
                            city: customer_info.city || '',
                            address: customer_info.address || user.address || '',
                            document_type: 'CI',
                            document_number: customer_info.document_number || ''
                        },
                        items: [{
                            product_id: 'balance_load',
                            name: 'Carga de saldo',
                            quantity: 1,
                            unit_price: parseFloat(formattedAmount),
                            total: parseFloat(formattedAmount),
                            category: 'balance',
                            brand: 'Zenn'
                        }],
                        return_url: `${process.env.FRONTEND_URL}/carga-saldo-exitosa`,
                        cancel_url: `${process.env.FRONTEND_URL}/carga-saldo-cancelada`,
                        status: 'pending',
                        environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                        sale_id: null,
                        created_by: user_id,
                        is_certification_test: false,
                        user_type: 'REGISTERED',
                        payment_method: 'balance_load',
                        user_bancard_id: user.bancardUserId || null,
                        ip_address: req.ip || req.headers['x-forwarded-for'] || '',
                        user_agent: req.headers['user-agent'] || '',
                        payment_session_id: `balance-${Date.now()}`,
                        device_type: 'web',
                        cart_total_items: 1,
                        referrer_url: req.headers.referer || '',
                        order_notes: 'Carga de saldo desde perfil de usuario',
                        delivery_method: 'none',
                        invoice_number: `BAL-${Date.now()}`,
                        tax_amount: 0,
                        utm_source: '',
                        utm_medium: '',
                        utm_campaign: '',
                        is_token_payment: false,
                        alias_token: null,
                        promotion_code: null,
                        has_promotion: false,
                        balance_load: true // Marcar como carga de saldo
                    });

                    const savedTransaction = await newTransaction.save();
                    console.log("✅ Transacción de carga de saldo guardada:", {
                        id: savedTransaction._id,
                        shop_process_id: savedTransaction.shop_process_id,
                        amount: savedTransaction.amount
                    });

                } catch (dbError) {
                    // console.error removed for production
                }
                
                return res.json({
                    message: "Carga de saldo iniciada exitosamente",
                    success: true,
                    error: false,
                    data: {
                        shop_process_id: shopProcessId,
                        process_id: processId,
                        amount: formattedAmount,
                        currency: currency,
                        description: description,
                        
                        iframe_config: {
                            script_url: iframeUrl,
                            process_id: processId,
                            container_id: 'bancard-balance-container',
                            initialization_code: `
                                window.onload = function() {
                                    if (window.Bancard && window.Bancard.Checkout) {
                                        Bancard.Checkout.createForm('bancard-balance-container', '${processId}', {
                                            'form-background-color': '#ffffff',
                                            'button-background-color': '#2A3190',
                                            'button-text-color': '#ffffff',
                                            'button-border-color': '#2A3190',
                                            'input-background-color': '#ffffff',
                                            'input-text-color': '#555555',
                                            'input-placeholder-color': '#999999'
                                        });
                                    }
                                };
                            `
                        },
                        
                        return_url: `${process.env.FRONTEND_URL}/carga-saldo-exitosa`,
                        cancel_url: `${process.env.FRONTEND_URL}/carga-saldo-cancelada`,
                        
                        bancard_config: {
                            environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                            base_url: getBancardBaseUrl(),
                            certification_mode: false
                        }
                    }
                });
            } else {
                // console.error removed for production
                return res.status(400).json({
                    message: "Error al crear la carga de saldo en Bancard",
                    success: false,
                    error: true,
                    details: response.data
                });
            }
        } else {
            // console.error removed for production
            return res.status(500).json({
                message: "Respuesta inesperada de Bancard",
                success: false,
                error: true,
                details: { status: response.status, data: response.data }
            });
        }

    } catch (error) {
        // console.error removed for production
        return res.status(500).json({
            message: "Error interno del servidor",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ CONTROLADOR PARA PROCESAR CONFIRMACIÓN DE CARGA DE SALDO
 */
const processBalanceLoadConfirmation = async (transactionData) => {
    try {
        // console.log removed for production
        
        const { shop_process_id, amount, response, response_code } = transactionData;
        
        // Buscar la transacción de carga de saldo
        const transaction = await BancardTransactionModel.findOne({ 
            shop_process_id: parseInt(shop_process_id),
            balance_load: true
        });
        
        if (!transaction) {
            // console.log removed for production
            return;
        }

        const isSuccessful = (response === 'S' && response_code === '00');

        if (isSuccessful) {
            // Actualizar transacción como aprobada
            await BancardTransactionModel.findByIdAndUpdate(transaction._id, {
                status: 'approved',
                response: response,
                response_code: response_code,
                authorization_number: transactionData.authorization_number,
                ticket_number: transactionData.ticket_number,
                confirmation_date: new Date(),
                bancard_confirmed: true
            });

            // Obtener o crear balance del usuario
            const userBalance = await BalanceModel.getOrCreateUserBalance(transaction.created_by);
            
            // Agregar transacción de carga al balance
            await userBalance.addTransaction({
                type: 'load',
                amount: parseFloat(amount),
                description: `Carga de saldo desde Bancard - Transacción ${shop_process_id}`,
                reference: shop_process_id.toString(),
                transaction_date: new Date(),
                status: 'completed',
                metadata: {
                    bancard_transaction_id: transaction._id,
                    authorization_number: transactionData.authorization_number,
                    ticket_number: transactionData.ticket_number
                }
            });

            console.log("✅ Saldo cargado exitosamente:", {
                user_id: transaction.created_by,
                amount: amount,
                new_balance: userBalance.current_balance
            });

            // Enviar email de confirmación
            try {
                const user = await UserModel.findById(transaction.created_by);
                if (user && user.email) {
                    // Aquí puedes implementar el envío de email de confirmación
                    // console.log removed for production
                }
            } catch (emailError) {
                // console.error removed for production
            }

        } else {
            // Actualizar transacción como rechazada
            await BancardTransactionModel.findByIdAndUpdate(transaction._id, {
                status: 'rejected',
                response: response,
                response_code: response_code,
                response_description: transactionData.response_description,
                confirmation_date: new Date(),
                bancard_confirmed: true
            });

            console.log("❌ Carga de saldo rechazada:", {
                shop_process_id,
                response,
                response_code,
                response_description: transactionData.response_description
            });
        }

    } catch (error) {
        // console.error removed for production
    }
};

/**
 * ✅ CONTROLADOR PARA OBTENER SALDO DEL USUARIO
 */
const getUserBalanceController = async (req, res) => {
    try {
        const userId = req.userId || req.params.userId;
        
        if (!userId) {
            return res.status(400).json({
                message: "ID de usuario es requerido",
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
            success: true,
            error: false,
            data: {
                user_id: userId,
                current_balance: userBalance.current_balance,
                total_loaded: userBalance.total_loaded,
                total_spent: userBalance.total_spent,
                last_transaction_date: userBalance.last_transaction_date,
                recent_transactions: recentTransactions,
                is_active: userBalance.is_active
            }
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: "Error al obtener el saldo",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ FUNCIÓN HELPER: Intentar rollback automático cuando se detecta error pero dinero debitado
 */
const attemptAutomaticRollback = async (shopProcessId, transactionId) => {
    try {
        console.log('🔄 Intentando rollback automático para transacción:', {
            shop_process_id: shopProcessId,
            transaction_id: transactionId
        });

        // Validar configuración
        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            console.error('❌ Configuración de Bancard inválida para rollback automático');
            return { success: false, error: 'Configuración inválida' };
        }

        // Verificar que la transacción no haya sido ya revertida
        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction || transaction.is_rolled_back) {
            console.log('ℹ️ Transacción ya revertida o no existe');
            return { success: false, error: 'Ya revertida o no existe' };
        }

        // Generar token de rollback
        const token = generateRollbackToken(shopProcessId);

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: parseInt(shopProcessId)
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
            // Actualizar transacción como revertida
            await BancardTransactionModel.findByIdAndUpdate(transactionId, {
                is_rolled_back: true,
                rollback_date: new Date(),
                rollback_reason: 'Rollback automático por error después de débito',
                status: 'rolled_back',
                rollback_attempted: true,
                needs_rollback_check: false
            });

            console.log('✅ Rollback automático exitoso:', {
                shop_process_id: shopProcessId,
                transaction_id: transactionId
            });

            return { success: true, data: response.data };
        } else {
            // Verificar si la transacción ya fue confirmada (cuponada)
            const messages = response.data?.messages || [];
            const isAlreadyConfirmed = messages.some(msg => msg.key === 'TransactionAlreadyConfirmed');

            await BancardTransactionModel.findByIdAndUpdate(transactionId, {
                rollback_attempted: true,
                rollback_attempt_date: new Date(),
                rollback_result: isAlreadyConfirmed ? 'already_confirmed' : 'failed',
                rollback_error: JSON.stringify(response.data)
            });

            if (isAlreadyConfirmed) {
                console.warn('⚠️ Rollback automático fallido: Transacción ya confirmada (cuponada)', {
                    shop_process_id: shopProcessId
                });
            } else {
                console.error('❌ Rollback automático fallido:', {
                    shop_process_id: shopProcessId,
                    response: response.data
                });
            }

            return { success: false, error: isAlreadyConfirmed ? 'already_confirmed' : 'rollback_failed', data: response.data };
        }

    } catch (error) {
        console.error('❌ Error en rollback automático:', {
            shop_process_id: shopProcessId,
            error: error.message,
            stack: error.stack
        });

        // Marcar que se intentó pero falló
        try {
            await BancardTransactionModel.findByIdAndUpdate(transactionId, {
                rollback_attempted: true,
                rollback_attempt_date: new Date(),
                rollback_result: 'error',
                rollback_error: error.message
            });
        } catch (dbError) {
            console.error('❌ Error al actualizar estado de rollback en BD:', dbError.message);
        }

        return { success: false, error: error.message };
    }
};

/**
 * ✅ CONTROLADOR PARA PROCESAR PAGO CON SALDO
 */
const payWithBalanceController = async (req, res) => {
    try {
        const {
            user_id,
            amount,
            description,
            items = [],
            customer_info = {},
            sale_id = null,
            reference = null
        } = req.body;

        if (!user_id || !amount || amount <= 0) {
            return res.status(400).json({
                message: "Datos de pago inválidos",
                success: false,
                error: true
            });
        }

        // Obtener balance del usuario
        const userBalance = await BalanceModel.getOrCreateUserBalance(user_id);
        
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
            user_id,
            amount,
            new_balance: userBalance.current_balance
        });

        res.json({
            message: "Pago procesado exitosamente con saldo",
            success: true,
            error: false,
            data: {
                user_id: user_id,
                amount_paid: amount,
                remaining_balance: userBalance.current_balance,
                transaction_id: reference || sale_id || `PAY-${Date.now()}`
            }
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            message: "Error al procesar el pago",
            success: false,
            error: true,
            details: error.message
        });
    }
};

module.exports = {
    bancardConfirmGetController, 
    bancardConfirmController,
    createPaymentController,
    getTransactionStatusController,
    bancardHealthController,
    rollbackPaymentController,
    loadBalanceController,
    processBalanceLoadConfirmation,
    getUserBalanceController,
    payWithBalanceController
};
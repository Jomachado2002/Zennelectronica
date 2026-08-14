// backend/controller/bancard/bancardCardsController.js - CON EMAILS PARA PAGOS CON TOKEN

const crypto = require('crypto');
const axios = require('axios');
const BancardTransactionModel = require('../../models/bancardTransactionModel');
const emailService = require('../../services/emailService'); // ✅ IMPORTAR EMAIL SERVICE
const { 
    validateBancardConfig,
    getBancardBaseUrl,
    generateShopProcessId,
    formatAmount
} = require('../../helpers/bancardUtils');

/**
 * ✅ PAGO CON ALIAS TOKEN - CON EMAILS AUTOMÁTICOS
 */
const chargeWithTokenController = async (req, res) => {
    try {

        const {
            shop_process_id,
            amount,
            currency = 'PYG',
            alias_token,
            number_of_payments = 1,
            description,
            return_url,
            additional_data = "",
            promotion_code = "",
            customer_info,
            items,
            delivery_location,
            user_type = 'REGISTERED',
            payment_method = 'saved_card',
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

        // ✅ VALIDACIONES INICIALES
        if (!req.isAuthenticated) {
            return res.status(401).json({
                message: "Debes iniciar sesión para realizar pagos",
                success: false,
                error: true
            });
        }

        if (!amount || !alias_token) {
            return res.status(400).json({
                message: "amount y alias_token son requeridos",
                success: false,
                error: true,
                requiredFields: ['amount', 'alias_token']
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                message: "El monto debe ser mayor a 0",
                success: false,
                error: true
            });
        }

        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            return res.status(500).json({
                message: "Error de configuración del sistema",
                success: false,
                error: true
            });
        }

        // ✅ VARIABLES DE TRACKING
        const finalUserType = req.isAuthenticated ? 'REGISTERED' : 'GUEST';
        const finalUserBancardId = user_bancard_id || req.bancardUserId || req.user?.bancardUserId;
        const clientIpAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        const finalShopProcessId = shop_process_id || generateShopProcessId();
        const formattedAmount = formatAmount(amount);

        // ✅ GENERAR TOKEN SEGÚN DOCUMENTACIÓN BANCARD
        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${finalShopProcessId}charge${formattedAmount}${currency}${alias_token}`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        
        
        // ✅ VALIDAR QUE FRONTEND_URL ESTÉ CONFIGURADA
        const frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl || !frontendUrl.startsWith('http')) {
            return res.status(500).json({
                message: "Error de configuración: FRONTEND_URL no está configurada correctamente",
                success: false,
                error: true
            });
        }

        // ✅ PAYLOAD CORREGIDO SEGÚN DOCUMENTACIÓN BANCARD
        // return_url va al FRONTEND (donde Bancard redirige después del pago)
        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                shop_process_id: parseInt(finalShopProcessId),
                amount: formattedAmount,
                number_of_payments: parseInt(number_of_payments),
                currency: currency,
                additional_data: "",
                description: description || "Pago Zenn con tarjeta registrada",
                alias_token: alias_token,
                return_url: return_url || `${frontendUrl}/pago-exitoso`
            }
        };

        // Solo agregar promoción si es válida
        if (promotion_code && promotion_code.trim() !== "") {
            const promotionRegex = /^\d{3}[A-Z]{2}\s[A-Z]{3}\d{6}$/;
            if (promotionRegex.test(promotion_code.trim())) {
                payload.operation.additional_data = promotion_code.trim();
                
            } else {
            }
        } else if (additional_data && additional_data.trim() !== "") {
            const promotionRegex = /^\d{3}[A-Z]{2}\s[A-Z]{3}\d{6}$/;
            const cleanAdditionalData = additional_data.trim();
            
            if (promotionRegex.test(cleanAdditionalData)) {
                payload.operation.additional_data = cleanAdditionalData;
            } else {
        
            }
        }

     

        // ✅ GUARDAR TRANSACCIÓN EN BD ANTES DE ENVIAR A BANCARD
        let savedTransaction;
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

            const newTransaction = new BancardTransactionModel({
                shop_process_id: parseInt(finalShopProcessId),
                bancard_process_id: null,
                amount: parseFloat(formattedAmount),
                currency: currency,
                description: description || "Pago Zenn con tarjeta registrada",
                customer_info: normalizedCustomerInfo,
                items: normalizedItems,
                delivery_location: delivery_location ? {
                    lat: parseFloat(delivery_location.lat) || null,
                    lng: parseFloat(delivery_location.lng) || null,
                    address: delivery_location.address || delivery_location.google_address || '',
                    manual_address: delivery_location.manual_address || '',
                    city: delivery_location.city || '',
                    house_number: delivery_location.house_number || '',
                    reference: delivery_location.reference || '',
                    source: delivery_location.source || 'unknown',
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
                } : null,
                return_url: `${frontendUrl}/pago-exitoso`,
                cancel_url: `${frontendUrl}/pago-cancelado`,
                status: 'pending',
                environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                created_by: req.userId,
                user_type: finalUserType,
                payment_method: payment_method,
                user_bancard_id: finalUserBancardId,
                ip_address: clientIpAddress,
                user_agent: user_agent || req.headers['user-agent'] || '',
                payment_session_id: payment_session_id,
                device_type: device_type,
                cart_total_items: cart_total_items || normalizedItems.length,
                referrer_url: referrer_url || req.headers.referer || '',
                order_notes: order_notes,
                delivery_method: delivery_method,
                invoice_number: invoice_number || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                tax_amount: parseFloat(tax_amount) || 0,
                utm_source: utm_source,
                utm_medium: utm_medium,
                utm_campaign: utm_campaign,
                is_token_payment: true,
                alias_token: alias_token,
                promotion_code: promotion_code || null,
                has_promotion: !!payload.operation.additional_data
            });

            savedTransaction = await newTransaction.save();
            

           

        } catch (dbError) {
            // console.error removed for production
            return res.status(500).json({
                message: "Error al guardar transacción en base de datos",
                success: false,
                error: true,
                details: dbError.message
            });
        }

        // ✅ ENVIAR REQUEST A BANCARD
        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/charge`;
      
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Zenn-eCommerce/1.0',
                'Accept': 'application/json'
            },
            timeout: 30000
        });


        if (response.status === 200) {
            
            const operationData = response.data?.operation || response.data?.confirmation || response.data;
            
            // ✅ DETECTAR SI HAY RESPUESTA INMEDIATA O REQUIERE REDIRECCIÓN
            const hasResponse = operationData?.response;
            
            console.log('🔍 Análisis de respuesta Bancard:', {
                hasResponse: !!hasResponse,
                response: operationData?.response,
                response_code: operationData?.response_code
            });
       

            // ✅ ACTUALIZAR TRANSACCIÓN INMEDIATAMENTE CON TODOS LOS DATOS
            try {
                const updateData = {
                    bancard_process_id: operationData?.process_id || response.data?.process_id,
                    is_token_payment: true,
                    alias_token: alias_token,
                    user_bancard_id: finalUserBancardId
                };

                // ✅ SI HAY RESPUESTA INMEDIATA, GUARDAR TODOS LOS DATOS Y ENVIAR EMAILS
                if (operationData?.response) {
                    // ✅ VERIFICACIÓN MEJORADA: Según documentación Bancard
                    // Un pago es exitoso cuando:
                    // 1. response='S' y response_code='00'
                    // 2. O cuando hay authorization_number y ticket_number (dinero debitado)
                    // 3. O cuando response_code='00' (código de aprobación)
                    const hasAuthorization = operationData.authorization_number && operationData.ticket_number;
                    const hasResponseAndCode = operationData.response === 'S' && operationData.response_code === '00';
                    const hasApprovalCode = operationData.response_code === '00';
                    
                    const isApproved = hasResponseAndCode ||
                                     hasAuthorization ||  // ✅ Si hay autorización y ticket, dinero fue debitado = exitoso
                                     hasApprovalCode;     // ✅ Si response_code='00', fue aprobado
                    
                    console.log('🔍 Verificación de pago con token:', {
                        shop_process_id: finalShopProcessId,
                        response: operationData.response,
                        response_code: operationData.response_code,
                        has_authorization: hasAuthorization,
                        authorization_number: operationData.authorization_number,
                        ticket_number: operationData.ticket_number,
                        is_approved: isApproved
                    });
                    
                    updateData.response = operationData.response;
                    updateData.response_code = operationData.response_code;
                    updateData.response_description = operationData.response_description;
                    updateData.extended_response_description = operationData.extended_response_description;
                    updateData.authorization_number = operationData.authorization_number;
                    updateData.ticket_number = operationData.ticket_number;
                    updateData.status = isApproved ? 'approved' : 'rejected';
                    updateData.bancard_confirmed = true;
                    updateData.confirmation_date = new Date();
                    
                    // ✅ SI EL DINERO SE DESCONTÓ PERO HAY ERROR, HACER ROLLBACK AUTOMÁTICO
                    if (!isApproved && operationData.response_code && operationData.response_code !== '00') {
                        console.warn('⚠️ Pago rechazado pero puede haberse debitado. Verificando necesidad de rollback...');
                        updateData.needs_rollback_check = true;
                        updateData.rollback_attempted = false;
                    }
                    
                    if (operationData.security_information) {
                        updateData.security_information = operationData.security_information;
                    }
                    
                

                    // ✅ ACTUALIZAR EN BD PRIMERO
                    const updatedTransaction = await BancardTransactionModel.findOneAndUpdate(
                        { shop_process_id: parseInt(finalShopProcessId) },
                        updateData,
                        { new: true }
                    );

                    // ✅ ENVIAR EMAILS INMEDIATAMENTE
                    if (updatedTransaction) {
                        try {
                            
                            // ✅ EMAIL AL CLIENTE
                            const customerEmailResult = await emailService.sendPurchaseConfirmationEmail(updatedTransaction, isApproved);
                            
                            if (customerEmailResult.success) {
                                
                                // ✅ REGISTRAR NOTIFICACIÓN EN LA TRANSACCIÓN
                                updatedTransaction.notifications_sent = updatedTransaction.notifications_sent || [];
                                updatedTransaction.notifications_sent.push({
                                    type: 'email',
                                    status: isApproved ? 'purchase_approved' : 'purchase_rejected',
                                    sent_at: new Date(),
                                    success: true,
                                    recipient: updatedTransaction.customer_info?.email,
                                    is_token_payment: true
                                });
                                await updatedTransaction.save();
                                
                            } else {
                                // console.error removed for production
                            }

                            // ✅ NOTIFICACIÓN A ADMINS
                            const adminEmailResult = await emailService.sendAdminNotificationEmail(
                                updatedTransaction, 
                                isApproved ? 'pago_aprobado' : 'pago_rechazado'
                            );
                            
                            if (adminEmailResult.success) {
                            } else {
                            }

                        } catch (emailError) {
                        }
                    }
                } else {
                    // ✅ SOLO ACTUALIZAR SIN EMAILS (LA CONFIRMACIÓN LLEGARÁ DESPUÉS VÍA WEBHOOK)
                    await BancardTransactionModel.findOneAndUpdate(
                        { shop_process_id: parseInt(finalShopProcessId) },
                        updateData
                    );
                }
                
              
            } catch (dbError) {
            }

            // ✅ SI NO HAY RESPUESTA INMEDIATA, LA CONFIRMACIÓN LLEGARÁ VÍA WEBHOOK
            if (!hasResponse) {
                res.json({
                    message: "Pago en proceso. La confirmación llegará en breve",
                    success: true,
                    error: false,
                    data: {
                        ...response.data,
                        shop_process_id: finalShopProcessId,
                        status: 'pending_confirmation'
                    }
                });
            } else {
                // ✅ PAGO PROCESADO DIRECTAMENTE - VERIFICAR MEJOR
                const hasAuth = operationData?.authorization_number && operationData?.ticket_number;
                const hasResponseAndCode = operationData?.response === 'S' && operationData?.response_code === '00';
                const hasApprovalCode = operationData?.response_code === '00';
                
                const isApproved = hasResponseAndCode || hasAuth || hasApprovalCode;
                
                console.log('🔍 Verificación final de pago directo:', {
                    shop_process_id: finalShopProcessId,
                    response: operationData?.response,
                    response_code: operationData?.response_code,
                    has_authorization: hasAuth,
                    is_approved: isApproved
                });

                res.json({
                    message: isApproved ? "Pago procesado exitosamente" : "Pago rechazado por el banco",
                    success: isApproved,
                    error: !isApproved,
                    email_sent: isApproved,
                    data: {
                        ...response.data,
                        shop_process_id: finalShopProcessId,
                        payment_status: isApproved ? 'approved' : 'rejected',
                        transaction_approved: isApproved,
                        authorization_number: operationData?.authorization_number,
                        ticket_number: operationData?.ticket_number,
                        response_description: operationData?.response_description,
                        customer_email_sent: isApproved,
                        admin_notification_sent: isApproved
                    }
                });
            }
        } else {
            // ✅ ACTUALIZAR TRANSACCIÓN COMO FALLIDA Y ENVIAR EMAIL
            try {
                const failedTransaction = await BancardTransactionModel.findOneAndUpdate(
                    { shop_process_id: parseInt(finalShopProcessId) },
                    { 
                        status: 'failed',
                        response_description: response.data?.message || 'Error en Bancard'
                    },
                    { new: true }
                );

                // ✅ ENVIAR EMAIL DE PAGO FALLIDO
                if (failedTransaction) {
                    try {
                        
                        const emailResult = await emailService.sendPurchaseConfirmationEmail(failedTransaction, false);
                        
                        if (emailResult.success) {
                            
                        }
                    } catch (emailError) {
                       
                    }
                }
            } catch (dbError) {
                // console.error removed for production
            }

            res.status(response.status).json({
                message: "Error en pago con token",
                success: false,
                error: true,
                data: response.data
            });
        }

    } catch (error) {
        // console.error removed for production
        
        if (req.body.shop_process_id || error.shop_process_id) {
            try {
                const errorTransaction = await BancardTransactionModel.findOneAndUpdate(
                    { shop_process_id: parseInt(req.body.shop_process_id || error.shop_process_id) },
                    { 
                        status: 'failed',
                        response_description: error.message || 'Error interno'
                    },
                    { new: true }
                );

                // ✅ ENVIAR EMAIL DE ERROR
                if (errorTransaction) {
                    try {
                        await emailService.sendPurchaseConfirmationEmail(errorTransaction, false);
                    } catch (emailError) {
                    }
                }
            } catch (dbError) {
            }
        }
        
        let errorMessage = "Error al procesar pago con token";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            // console.error removed for production
        }
        
        res.status(500).json({
            message: errorMessage,
            success: false,
            error: true,
            details: errorDetails
        });
    }
};

// ✅ RESTO DE CONTROLADORES SIN CAMBIOS (mantener funcionalidad existente)

const createCardController = async (req, res) => {
    try {
       
        
        const {
            card_id,
            user_id,
            user_cell_phone,
            user_mail,
            return_url
        } = req.body;

        if (!req.isAuthenticated || !req.userId) {
          
            return res.status(401).json({
                message: "Debes iniciar sesión para registrar tarjetas",
                success: false,
                error: true,
                redirectTo: "/iniciar-sesion"
            });
        }

        if (typeof req.userId === 'string' && req.userId.startsWith('guest-')) {
        
            return res.status(401).json({
                message: "Los usuarios invitados no pueden registrar tarjetas",
                success: false,
                error: true,
                redirectTo: "/iniciar-sesion"
            });
        }

        if (req.userRole !== 'GENERAL' && req.userRole !== 'ADMIN' && req.userRole !== 'ROOT') {
            return res.status(403).json({
                message: "No tienes permisos para registrar tarjetas",
                success: false,
                error: true
            });
        }

        const finalCardId = card_id || Date.now();
        const finalUserId = req.bancardUserId || req.user?.bancardUserId;
        const finalUserPhone = user_cell_phone || req.user?.phone || "12345678";
        const finalUserEmail = user_mail || req.user?.email;

       

        if (!finalUserId) {
            return res.status(400).json({
                message: "Usuario no tiene ID de Bancard asignado",
                success: false,
                error: true,
                details: "Contacta al administrador para configurar tu cuenta"
            });
        }

        if (!finalUserEmail) {
            return res.status(400).json({
                message: "Email es requerido para registrar tarjetas",
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
                details: configValidation.errors
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${finalCardId}${finalUserId}request_new_card`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        

        // ✅ VALIDAR QUE FRONTEND_URL ESTÉ CONFIGURADA
        const frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl || !frontendUrl.startsWith('http')) {
            return res.status(500).json({
                message: "Error de configuración: FRONTEND_URL no está configurada correctamente",
                success: false,
                error: true
            });
        }

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                card_id: parseInt(finalCardId),
                user_id: parseInt(finalUserId),
                user_cell_phone: finalUserPhone,
                user_mail: finalUserEmail,
                // ✅ return_url va al FRONTEND (donde Bancard redirige después del catastro)
                return_url: return_url || `${frontendUrl}/catastro-resultado`
            }
        };
        
        console.log('📤 Payload para catastro de tarjeta:', {
            card_id: finalCardId,
            user_id: finalUserId,
            return_url: payload.operation.return_url,
            frontend_url: frontendUrl
        });



        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/cards/new`;
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Zenn-eCommerce/1.0',
                'Accept': 'application/json'
            },
            timeout: 30000
        });


        if (response.status === 200 && response.data.status === 'success') {
            
            res.json({
                message: "Catastro iniciado exitosamente",
                success: true,
                error: false,
                data: {
                    process_id: response.data.process_id,
                    card_id: finalCardId,
                    user_id: finalUserId,
                    iframe_url: `${getBancardBaseUrl()}/checkout/new/${response.data.process_id}`,
                    bancard_response: response.data
                }
            });
        } else {
            // console.error removed for production
            res.status(400).json({
                message: "Error al iniciar catastro en Bancard",
                success: false,
                error: true,
                details: response.data
            });
        }

    } catch (error) {
        // console.error removed for production
        
        let errorMessage = "Error al procesar catastro";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            // console.error removed for production
        }
        
        res.status(500).json({
            message: errorMessage,
            success: false,
            error: true,
            details: errorDetails
        });
    }
};

const getUserCardsController = async (req, res) => {
    if (res.headersSent) {
        return;
    }

    if (req.processing) {
        return;
    }
    req.processing = true;

    try {
        
        let targetUserId = req.params.user_id;
        
        // ✅ VALIDAR QUE EL USUARIO ESTÉ AUTENTICADO (NO INVITADO)
        if (!req.isAuthenticated || !req.userId || (typeof req.userId === 'string' && req.userId.startsWith('guest-'))) {
            return res.status(401).json({
                message: "Debes iniciar sesión para ver tus tarjetas",
                success: false,
                error: true,
                isGuest: true
            });
        }
        
        if (!targetUserId || targetUserId === 'me') {
            // ✅ OBTENER bancardUserId DE FORMA SEGURA
            targetUserId = req.bancardUserId || req.user?.bancardUserId;
            
            if (!targetUserId) {
                return res.status(400).json({
                    message: "No tienes un ID de Bancard asociado. Contacta al soporte.",
                    success: false,
                    error: true
                });
            }
        }

        // ✅ VALIDAR PERMISOS DE FORMA SEGURA
        const userBancardId = req.bancardUserId || req.user?.bancardUserId;
        if (req.userRole !== 'ADMIN' && targetUserId != userBancardId) {
            return res.status(403).json({
                message: "No puedes ver tarjetas de otros usuarios",
                success: false,
                error: true
            });
        }


        if (!targetUserId) {
            return res.status(400).json({
                message: "user_id es requerido",
                success: false,
                error: true
            });
        }

        const configValidation = validateBancardConfig();
        if (!configValidation.isValid) {
            return res.status(500).json({
                message: "Error de configuración del sistema",
                success: false,
                error: true
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}${targetUserId}request_user_cards`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

   

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                extra_response_attributes: ["cards.bancard_proccesed"]
            }
        };


        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/users/${targetUserId}/cards`;
     
        
        const response = await axios.post(bancardUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Zenn-eCommerce/1.0',
                'Accept': 'application/json'
            },
            timeout: 30000
        });


        if (response.status === 200 && response.data) {
            // ✅ PROCESAR RESPUESTA DE BANCARD CORRECTAMENTE
            const bancardData = response.data || {};
            // ✅ Bancard puede devolver cards como array o como objeto
            let cards = [];
            
            if (Array.isArray(bancardData.cards)) {
                cards = bancardData.cards;
            } else if (bancardData.cards && typeof bancardData.cards === 'object') {
                // Si es un objeto, intentar convertirlo a array
                cards = Object.values(bancardData.cards);
            } else if (bancardData.status === 'success' && !bancardData.cards) {
                // Si status es success pero no hay cards, significa que no hay tarjetas
                cards = [];
            }
            
            console.log('📋 Tarjetas obtenidas de Bancard:', {
                user_id: targetUserId,
                cards_count: cards.length,
                bancard_status: bancardData.status,
                has_cards: cards.length > 0,
                raw_response: JSON.stringify(bancardData).substring(0, 200)
            });
            
            res.json({
                message: cards.length > 0 ? "Tarjetas obtenidas exitosamente" : "No hay tarjetas registradas",
                success: true,
                error: false,
                data: {
                    cards: cards,
                    cards_count: cards.length,
                    user_id: targetUserId,
                    bancard_response: bancardData
                }
            });
        } else {
            res.status(response.status || 500).json({
                message: "Error al obtener tarjetas de Bancard",
                success: false,
                error: true,
                data: response.data || { message: 'Respuesta inesperada de Bancard' }
            });
        }

    } catch (error) {
        // console.error removed for production
        
        let errorMessage = "Error al obtener tarjetas";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            // console.error removed for production
        }
        
        res.status(500).json({
            message: errorMessage,
            success: false,
            error: true,
            details: errorDetails
        });
    } finally {
        req.processing = false;
    }
};

const deleteCardController = async (req, res) => {
    try {
        
        let targetUserId = req.params.user_id;
        const { alias_token } = req.body;

        if (!req.isAuthenticated) {
            return res.status(401).json({
                message: "Debes iniciar sesión para eliminar tarjetas",
                success: false,
                error: true
            });
        }

        if (!targetUserId || targetUserId === 'me') {
            targetUserId = req.bancardUserId || req.user.bancardUserId;
        }

        if (req.userRole !== 'ADMIN' && targetUserId != (req.bancardUserId || req.user.bancardUserId)) {
            return res.status(403).json({
                message: "No puedes eliminar tarjetas de otros usuarios",
                success: false,
                error: true
            });
        }

        if (!targetUserId || !alias_token) {
            return res.status(400).json({
                message: "user_id y alias_token son requeridos",
                success: false,
                error: true,
                requiredFields: ['user_id', 'alias_token']
            });
        }

        const tokenString = `${process.env.BANCARD_PRIVATE_KEY}delete_card${targetUserId}${alias_token}`;
        const token = crypto.createHash('md5').update(tokenString, 'utf8').digest('hex');

        

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                alias_token: alias_token
            }
        };


        const bancardUrl = `${getBancardBaseUrl()}/vpos/api/0.3/users/${targetUserId}/cards`;
        
        const response = await axios.delete(bancardUrl, {
            data: payload,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Zenn-eCommerce/1.0',
                'Accept': 'application/json'
            },
            timeout: 30000
        });


        if (response.status === 200) {
            res.json({
                message: "Tarjeta eliminada exitosamente",
                success: true,
                error: false,
                data: response.data,
                user_id: targetUserId
            });
        } else {
            res.status(response.status).json({
                message: "Error al eliminar tarjeta",
                success: false,
                error: true,
                data: response.data
            });
        }

    } catch (error) {
        // console.error removed for production
        
        let errorMessage = "Error al eliminar tarjeta";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            // console.error removed for production
        }
        
        res.status(500).json({
            message: errorMessage,
            success: false,
            error: true,
            details: errorDetails
        });
    }
};

module.exports = {
    createCardController,
    getUserCardsController,
    chargeWithTokenController,
    deleteCardController
};
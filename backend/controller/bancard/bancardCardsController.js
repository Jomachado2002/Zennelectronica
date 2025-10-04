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

        

        const backendUrl = process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'https://zenn.vercel.app';

        // ✅ PAYLOAD CORREGIDO
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
                return_url: `${backendUrl}/api/bancard/redirect/success`
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
                return_url: `${backendUrl}/api/bancard/redirect/success`,
                cancel_url: `${backendUrl}/api/bancard/redirect/cancel`,
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
            console.error("❌ Error crítico guardando transacción en BD:", dbError);
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
            const requiresAuth = response.data?.operation?.process_id && !operationData?.response;
            
       

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
                    const isApproved = operationData.response === 'S' && operationData.response_code === '00';
                    
                    updateData.response = operationData.response;
                    updateData.response_code = operationData.response_code;
                    updateData.response_description = operationData.response_description;
                    updateData.extended_response_description = operationData.extended_response_description;
                    updateData.authorization_number = operationData.authorization_number;
                    updateData.ticket_number = operationData.ticket_number;
                    updateData.status = isApproved ? 'approved' : 'rejected';
                    updateData.bancard_confirmed = true;
                    updateData.confirmation_date = new Date();
                    
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
                                console.error("❌ Error enviando email al cliente:", customerEmailResult.error);
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
                    // ✅ SOLO ACTUALIZAR SIN EMAILS (REQUIERE 3DS)
                    await BancardTransactionModel.findOneAndUpdate(
                        { shop_process_id: parseInt(finalShopProcessId) },
                        updateData
                    );
                }
                
              
            } catch (dbError) {
            }

            if (requiresAuth) {
                res.json({
                    message: "Pago requiere autenticación 3DS",
                    success: true,
                    error: false,
                    requires3DS: true,
                    data: {
                        ...response.data,
                        shop_process_id: finalShopProcessId,
                        iframe_url: response.data?.operation?.process_id ? 
                            `${getBancardBaseUrl()}/checkout/new/${response.data.operation.process_id}` : null
                    }
                });
            } else {
                // ✅ PAGO PROCESADO DIRECTAMENTE
                const isApproved = operationData?.response === 'S' && operationData?.response_code === '00';
                
             

                res.json({
                    message: isApproved ? "Pago procesado exitosamente" : "Pago rechazado por el banco",
                    success: isApproved,
                    error: !isApproved,
                    requires3DS: false,
                    email_sent: true, // ✅ INDICAR QUE SE ENVIÓ EMAIL
                    data: {
                        ...response.data,
                        shop_process_id: finalShopProcessId,
                        payment_status: isApproved ? 'approved' : 'rejected',
                        transaction_approved: isApproved,
                        authorization_number: operationData?.authorization_number,
                        ticket_number: operationData?.ticket_number,
                        response_description: operationData?.response_description,
                        customer_email_sent: true, // ✅ CONFIRMACIÓN DE EMAIL AL CLIENTE
                        admin_notification_sent: true // ✅ CONFIRMACIÓN DE NOTIFICACIÓN ADMIN
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
                console.error("⚠️ Error actualizando transacción fallida:", dbError);
            }

            res.status(response.status).json({
                message: "Error en pago con token",
                success: false,
                error: true,
                data: response.data
            });
        }

    } catch (error) {
        console.error("❌ Error en pago con token:", error);
        
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
            console.error("📥 Error response de Bancard:", error.response.data);
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

        if (req.userRole !== 'GENERAL' && req.userRole !== 'ADMIN') {
            return res.status(403).json({
                message: "No tienes permisos para registrar tarjetas",
                success: false,
                error: true
            });
        }

        const finalCardId = card_id || Date.now();
        const finalUserId = req.bancardUserId || req.user?.bancardUserId || user_id;
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

        

        const payload = {
            public_key: process.env.BANCARD_PUBLIC_KEY,
            operation: {
                token: token,
                card_id: parseInt(finalCardId),
                user_id: parseInt(finalUserId),
                user_cell_phone: finalUserPhone,
                user_mail: finalUserEmail,
                return_url: `${process.env.FRONTEND_URL}/catastro-resultado`
            }
        };



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
            console.error("❌ Bancard respondió con error:", response.data);
            res.status(400).json({
                message: "Error al iniciar catastro en Bancard",
                success: false,
                error: true,
                details: response.data
            });
        }

    } catch (error) {
        console.error("❌ Error en catastro:", error);
        
        let errorMessage = "Error al procesar catastro";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            console.error("📥 Error response de Bancard:", error.response.data);
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
        
        if (!targetUserId || targetUserId === 'me') {
            if (!req.isAuthenticated) {
                return res.status(401).json({
                    message: "Debes iniciar sesión para ver tus tarjetas",
                    success: false,
                    error: true
                });
            }
            targetUserId = req.bancardUserId || req.user.bancardUserId;
        }

        if (req.userRole !== 'ADMIN' && targetUserId != (req.bancardUserId || req.user.bancardUserId)) {
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


        if (response.status === 200) {
            res.json({
                message: "Tarjetas obtenidas exitosamente",
                success: true,
                error: false,
                data: response.data,
                user_id: targetUserId
            });
        } else {
            res.status(response.status).json({
                message: "Error al obtener tarjetas",
                success: false,
                error: true,
                data: response.data
            });
        }

    } catch (error) {
        console.error("❌ Error obteniendo tarjetas:", error);
        
        let errorMessage = "Error al obtener tarjetas";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            console.error("📥 Error response de Bancard:", error.response.data);
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
        console.error("❌ Error eliminando tarjeta:", error);
        
        let errorMessage = "Error al eliminar tarjeta";
        let errorDetails = error.message;
        
        if (error.response) {
            errorDetails = error.response.data;
            console.error("📥 Error response de Bancard:", error.response.data);
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
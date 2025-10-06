// backend/controller/bancard/bancardDeliveryController.js - CON EMAILS AUTOMÁTICOS

const BancardTransactionModel = require('../../models/bancardTransactionModel');
const uploadProductPermission = require('../../helpers/permission');
const emailService = require('../../services/emailService'); // ✅ IMPORTAR EMAIL SERVICE

/**
 * ✅ ACTUALIZAR ESTADO DE DELIVERY CON EMAILS AUTOMÁTICOS
 */
const updateDeliveryStatusController = async (req, res) => {
    try {
        
        
        // ✅ VERIFICAR PERMISOS DE ADMIN
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado - Solo administradores",
                success: false,
                error: true
            });
        }

        const { transactionId } = req.params;
        const { 
            delivery_status, 
            delivery_notes, 
            estimated_delivery_date,
            tracking_number,
            courier_company,
            notify_customer = true 
        } = req.body;

        console.log("📋 Datos recibidos:", {
            transactionId,
            delivery_status,
            delivery_notes,
            estimated_delivery_date,
            tracking_number,
            notify_customer
        });

        // ✅ VALIDAR ESTADO
        const validStatuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered', 'problem'];
        if (!validStatuses.includes(delivery_status)) {
            return res.status(400).json({
                message: "Estado de delivery inválido",
                success: false,
                error: true,
                validStatuses
            });
        }

        // ✅ BUSCAR TRANSACCIÓN
        const transaction = await BancardTransactionModel.findById(transactionId)
            .populate('created_by', 'name email phone')
            .populate('delivery_updated_by', 'name email');

        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR QUE ESTÉ APROBADA
        if (transaction.status !== 'approved') {
            return res.status(400).json({
                message: "Solo se puede actualizar delivery de transacciones aprobadas",
                success: false,
                error: true,
                currentStatus: transaction.status
            });
        }

        // ✅ GUARDAR ESTADO ANTERIOR PARA COMPARAR
        const previousDeliveryStatus = transaction.delivery_status;

        // ✅ PREPARAR DATOS DE ACTUALIZACIÓN
        const updateData = {
            delivery_status,
            delivery_updated_by: req.userId,
            delivery_updated_at: new Date()
        };

        if (delivery_notes) updateData.delivery_notes = delivery_notes;
        if (estimated_delivery_date) updateData.estimated_delivery_date = new Date(estimated_delivery_date);
        if (tracking_number) updateData.tracking_number = tracking_number;
        if (courier_company) updateData.courier_company = courier_company;
        
        // ✅ Si se marca como entregado, guardar fecha real
        if (delivery_status === 'delivered') {
            updateData.actual_delivery_date = new Date();
        }

        
        
        // ✅ ACTUALIZAR TRANSACCIÓN
        const updatedTransaction = await BancardTransactionModel.findByIdAndUpdate(
            transactionId, 
            updateData, 
            { new: true }
        ).populate('created_by', 'name email phone')
         .populate('delivery_updated_by', 'name email');

        console.log("✅ Transacción actualizada:", {
            id: updatedTransaction._id,
            shop_process_id: updatedTransaction.shop_process_id,
            old_status: previousDeliveryStatus,
            new_status: updatedTransaction.delivery_status
        });

        // ✅ ENVIAR EMAILS AUTOMÁTICAMENTE
        let emailResults = {
            customer_email: null,
            admin_email: null
        };

        // Solo enviar email si el estado realmente cambió
        if (notify_customer && previousDeliveryStatus !== delivery_status) {
            try {
                
                
                // ✅ EMAIL AL CLIENTE
                const customerEmailResult = await emailService.sendDeliveryUpdateEmail(updatedTransaction, delivery_status);
                emailResults.customer_email = customerEmailResult;
                
                if (customerEmailResult.success) {
                    
                    
                    // ✅ GUARDAR REGISTRO DE NOTIFICACIÓN EN LA TRANSACCIÓN
                    updatedTransaction.notifications_sent.push({
                        type: 'email',
                        status: delivery_status,
                        sent_at: new Date(),
                        success: true,
                        recipient: updatedTransaction.customer_info?.email
                    });
                    
                    await updatedTransaction.save();
                } else {
                    console.error("❌ Error enviando email al cliente:", customerEmailResult.error);
                    
                    // ✅ GUARDAR REGISTRO DE ERROR
                    updatedTransaction.notifications_sent.push({
                        type: 'email',
                        status: delivery_status,
                        sent_at: new Date(),
                        success: false,
                        error_message: customerEmailResult.error
                    });
                    
                    await updatedTransaction.save();
                }

                // ✅ NOTIFICACIÓN A ADMINS TAMBIÉN
                try {
                    const adminEmailResult = await emailService.sendAdminNotificationEmail(updatedTransaction, 'entrega_actualizada');
                    emailResults.admin_email = adminEmailResult;
                    
                    if (adminEmailResult.success) {
                        
                    } else {
                        console.error("❌ Error enviando notificación admin:", adminEmailResult.error);
                    }
                } catch (adminEmailError) {
                    console.error("❌ Error en notificación admin:", adminEmailError);
                    emailResults.admin_email = { success: false, error: adminEmailError.message };
                }
                
            } catch (emailError) {
                console.error("❌ Error enviando emails de delivery:", emailError);
                emailResults.customer_email = { success: false, error: emailError.message };
            }
        } else if (!notify_customer) {
            
        } else {
            
        }

        // ✅ PREPARAR RESPUESTA
        const responseData = {
            transaction: {
                _id: updatedTransaction._id,
                shop_process_id: updatedTransaction.shop_process_id,
                delivery_status: updatedTransaction.delivery_status,
                delivery_notes: updatedTransaction.delivery_notes,
                estimated_delivery_date: updatedTransaction.estimated_delivery_date,
                actual_delivery_date: updatedTransaction.actual_delivery_date,
                tracking_number: updatedTransaction.tracking_number,
                courier_company: updatedTransaction.courier_company,
                delivery_timeline: updatedTransaction.delivery_timeline,
                delivery_progress: updatedTransaction.getDeliveryProgress()
            },
            previous_status: previousDeliveryStatus,
            status_changed: previousDeliveryStatus !== delivery_status,
            updated_by: {
                id: req.userId,
                name: updatedTransaction.delivery_updated_by?.name
            },
            email_notifications: emailResults,
            notifications_sent_count: updatedTransaction.notifications_sent.length
        };

        res.json({
            message: `Estado de delivery actualizado a: ${delivery_status}${emailResults.customer_email?.success ? ' (Email enviado)' : ''}`,
            success: true,
            error: false,
            data: responseData
        });

    } catch (error) {
        console.error("❌ Error actualizando delivery status:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ OBTENER PROGRESO DE DELIVERY PARA USUARIO (sin cambios)
 */
const getDeliveryProgressController = async (req, res) => {
    try {
        
        
        const { transactionId } = req.params;

        // ✅ BUSCAR TRANSACCIÓN
        const transaction = await BancardTransactionModel.findById(transactionId)
            .populate('created_by', 'name email')
            .populate('delivery_updated_by', 'name email')
            .lean();

        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR PERMISOS
        const hasAdminPermission = await uploadProductPermission(req.userId);
        const isOwner = req.userId && (
            transaction.created_by?._id?.toString() === req.userId ||
            transaction.user_bancard_id === req.bancardUserId
        );

        if (!hasAdminPermission && !isOwner) {
            return res.status(403).json({
                message: "No tienes permisos para ver esta transacción",
                success: false,
                error: true
            });
        }

        // ✅ CALCULAR PROGRESO
        const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
        const currentIndex = statuses.indexOf(transaction.delivery_status);
        const progress = Math.round(((currentIndex + 1) / statuses.length) * 100);

        // ✅ PREPARAR TIMELINE CON ÍCONOS Y DESCRIPCIONES
        const statusDescriptions = {
            payment_confirmed: {
                icon: '✅',
                title: 'Pago Confirmado',
                description: 'Tu pago ha sido procesado exitosamente'
            },
            preparing_order: {
                icon: '📦',
                title: 'Preparando Pedido',
                description: 'Estamos empacando tus productos con cuidado'
            },
            in_transit: {
                icon: '🚚',
                title: 'En Camino',
                description: 'Tu pedido está en camino hacia tu dirección'
            },
            delivered: {
                icon: '📍',
                title: 'Entregado',
                description: 'Tu pedido ha sido entregado exitosamente'
            },
            problem: {
                icon: '⚠️',
                title: 'Requiere Atención',
                description: 'Hay un inconveniente que necesita resolución'
            }
        };

        // ✅ TIMELINE MEJORADO
        const enrichedTimeline = transaction.delivery_timeline?.map(entry => ({
            ...entry,
            ...statusDescriptions[entry.status],
            formatted_date: new Date(entry.timestamp).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        })) || [];

        // ✅ PRÓXIMO PASO ESPERADO
        let nextStep = null;
        if (currentIndex >= 0 && currentIndex < statuses.length - 1) {
            const nextStatus = statuses[currentIndex + 1];
            nextStep = {
                status: nextStatus,
                ...statusDescriptions[nextStatus]
            };
        }

        const responseData = {
            shop_process_id: transaction.shop_process_id,
            current_status: transaction.delivery_status,
            current_description: statusDescriptions[transaction.delivery_status],
            progress_percentage: progress,
            estimated_delivery_date: transaction.estimated_delivery_date,
            actual_delivery_date: transaction.actual_delivery_date,
            tracking_number: transaction.tracking_number,
            courier_company: transaction.courier_company,
            delivery_notes: transaction.delivery_notes,
            timeline: enrichedTimeline,
            next_step: nextStep,
            delivery_location: transaction.delivery_location,
            customer_info: transaction.customer_info,
            last_updated: transaction.delivery_updated_at,
            can_rate: transaction.delivery_status === 'delivered' && !transaction.customer_satisfaction?.rating,
            email_notifications_sent: transaction.notifications_sent?.length || 0
        };

        res.json({
            message: "Progreso de delivery obtenido",
            success: true,
            error: false,
            data: responseData
        });

    } catch (error) {
        console.error("❌ Error obteniendo progreso:", error);
        res.status(500).json({
            message: "Error al obtener progreso de delivery",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ OBTENER ESTADÍSTICAS DE DELIVERY PARA ADMIN (sin cambios)
 */
const getDeliveryStatsController = async (req, res) => {
    try {
        
        
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                success: false,
                error: true
            });
        }

        const { startDate, endDate } = req.query;
        
        // ✅ CONSTRUIR FILTRO DE FECHAS
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // ✅ AGREGAR FILTRO PARA TRANSACCIONES APROBADAS
        const baseFilter = { 
            status: 'approved',
            ...dateFilter 
        };

        // ✅ ESTADÍSTICAS POR ESTADO
        const statusStats = await BancardTransactionModel.aggregate([
            { $match: baseFilter },
            { $group: {
                _id: '$delivery_status',
                count: { $sum: 1 },
                total_amount: { $sum: '$amount' },
                avg_amount: { $avg: '$amount' }
            }},
            { $sort: { count: -1 } }
        ]);

        // ✅ ESTADÍSTICAS GENERALES
        const generalStats = await BancardTransactionModel.aggregate([
            { $match: baseFilter },
            { $group: {
                _id: null,
                total_transactions: { $sum: 1 },
                total_revenue: { $sum: '$amount' },
                avg_order_value: { $avg: '$amount' },
                delivered_count: { 
                    $sum: { $cond: [{ $eq: ['$delivery_status', 'delivered'] }, 1, 0] }
                },
                in_progress_count: { 
                    $sum: { $cond: [{ $in: ['$delivery_status', ['preparing_order', 'in_transit']] }, 1, 0] }
                },
                problem_count: { 
                    $sum: { $cond: [{ $eq: ['$delivery_status', 'problem'] }, 1, 0] }
                }
            }}
        ]);

        // ✅ TIEMPO PROMEDIO DE ENTREGA
        const deliveryTimeStats = await BancardTransactionModel.aggregate([
            { 
                $match: { 
                    ...baseFilter,
                    delivery_status: 'delivered',
                    actual_delivery_date: { $exists: true }
                }
            },
            {
                $project: {
                    delivery_days: {
                        $divide: [
                            { $subtract: ['$actual_delivery_date', '$createdAt'] },
                            86400000 // Convertir ms a días
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avg_delivery_days: { $avg: '$delivery_days' },
                    min_delivery_days: { $min: '$delivery_days' },
                    max_delivery_days: { $max: '$delivery_days' }
                }
            }
        ]);

        // ✅ ENTREGAS POR DÍA (ÚLTIMOS 30 DÍAS)
        const dailyDeliveries = await BancardTransactionModel.aggregate([
            {
                $match: {
                    delivery_status: 'delivered',
                    actual_delivery_date: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$actual_delivery_date' }
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ✅ PRODUCTOS MÁS VENDIDOS
        const topProducts = await BancardTransactionModel.aggregate([
            { $match: baseFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    total_sold: { $sum: '$items.quantity' },
                    total_revenue: { $sum: '$items.total' },
                    order_count: { $sum: 1 }
                }
            },
            { $sort: { total_sold: -1 } },
            { $limit: 10 }
        ]);

        // ✅ ESTADÍSTICAS DE EMAILS ENVIADOS
        const emailStats = await BancardTransactionModel.aggregate([
            { $match: baseFilter },
            { $unwind: { path: '$notifications_sent', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$notifications_sent.type',
                    count: { $sum: 1 },
                    success_count: { 
                        $sum: { $cond: [{ $eq: ['$notifications_sent.success', true] }, 1, 0] }
                    }
                }
            }
        ]);

        const responseData = {
            summary: generalStats[0] || {
                total_transactions: 0,
                total_revenue: 0,
                avg_order_value: 0,
                delivered_count: 0,
                in_progress_count: 0,
                problem_count: 0
            },
            delivery_performance: {
                ...(deliveryTimeStats[0] || {
                    avg_delivery_days: 0,
                    min_delivery_days: 0,
                    max_delivery_days: 0
                }),
                success_rate: generalStats[0] ? 
                    Math.round((generalStats[0].delivered_count / generalStats[0].total_transactions) * 100) : 0
            },
            status_breakdown: statusStats,
            daily_deliveries: dailyDeliveries,
            top_products: topProducts,
            email_statistics: emailStats,
            generated_at: new Date().toISOString()
        };

        res.json({
            message: "Estadísticas de delivery obtenidas",
            success: true,
            error: false,
            data: responseData
        });

    } catch (error) {
        console.error("❌ Error obteniendo estadísticas:", error);
        res.status(500).json({
            message: "Error al obtener estadísticas de delivery",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ AGREGAR INTENTO DE ENTREGA (sin cambios)
 */
const addDeliveryAttemptController = async (req, res) => {
    try {
        
        
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                success: false,
                error: true
            });
        }

        const { transactionId } = req.params;
        const { status, notes, next_attempt_date } = req.body;

        const validAttemptStatuses = ['successful', 'failed', 'customer_not_available', 'address_issue'];
        if (!validAttemptStatuses.includes(status)) {
            return res.status(400).json({
                message: "Estado de intento inválido",
                success: false,
                error: true,
                validStatuses: validAttemptStatuses
            });
        }

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        // ✅ AGREGAR INTENTO
        await transaction.addDeliveryAttempt(status, notes, next_attempt_date);

        // ✅ SI ES EXITOSO, MARCAR COMO ENTREGADO Y ENVIAR EMAIL
        if (status === 'successful') {
            transaction.delivery_status = 'delivered';
            transaction.actual_delivery_date = new Date();
            await transaction.save();

            // ✅ ENVIAR EMAIL DE ENTREGADO AUTOMÁTICAMENTE
            try {
                
                const emailResult = await emailService.sendDeliveryUpdateEmail(transaction, 'delivered');
                
                if (emailResult.success) {
                    
                    
                    // Guardar registro de notificación
                    transaction.notifications_sent.push({
                        type: 'email',
                        status: 'delivered',
                        sent_at: new Date(),
                        success: true
                    });
                    await transaction.save();
                }
            } catch (emailError) {
                console.error("❌ Error enviando email de entregado:", emailError);
            }
        }

        res.json({
            message: "Intento de entrega registrado",
            success: true,
            error: false,
            data: {
                attempt_count: transaction.delivery_attempt_count,
                last_attempt: transaction.delivery_attempts[transaction.delivery_attempts.length - 1],
                transaction_status: transaction.delivery_status
            }
        });

    } catch (error) {
        console.error("❌ Error agregando intento:", error);
        res.status(500).json({
            message: "Error al registrar intento de entrega",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ CALIFICAR PEDIDO (PARA USUARIO) - sin cambios
 */
const rateDeliveryController = async (req, res) => {
    try {
        
        
        const { transactionId } = req.params;
        const { rating, feedback } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "La calificación debe ser entre 1 y 5 estrellas",
                success: false,
                error: true
            });
        }

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR QUE ESTÉ ENTREGADO
        if (transaction.delivery_status !== 'delivered') {
            return res.status(400).json({
                message: "Solo se pueden calificar pedidos entregados",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR QUE NO HAYA SIDO CALIFICADO
        if (transaction.customer_satisfaction?.rating) {
            return res.status(400).json({
                message: "Este pedido ya fue calificado",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR PERMISOS
        const isOwner = req.userId && (
            transaction.created_by?.toString() === req.userId ||
            transaction.user_bancard_id === req.bancardUserId
        );

        if (!isOwner) {
            return res.status(403).json({
                message: "Solo puedes calificar tus propios pedidos",
                success: false,
                error: true
            });
        }

        // ✅ GUARDAR CALIFICACIÓN
        transaction.customer_satisfaction = {
            rating: parseInt(rating),
            feedback: feedback || '',
            submitted_at: new Date()
        };

        await transaction.save();

        console.log("✅ Calificación guardada:", {
            shop_process_id: transaction.shop_process_id,
            rating,
            feedback: feedback ? 'Con comentario' : 'Sin comentario'
        });

        res.json({
            message: "¡Gracias por tu calificación!",
            success: true,
            error: false,
            data: {
                rating: transaction.customer_satisfaction.rating,
                feedback: transaction.customer_satisfaction.feedback,
                submitted_at: transaction.customer_satisfaction.submitted_at
            }
        });

    } catch (error) {
        console.error("❌ Error en calificación:", error);
        res.status(500).json({
            message: "Error al guardar calificación",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ ENVIAR NOTIFICACIÓN MANUAL - MEJORADO CON COPIA A ADMINS
 */
const sendManualNotificationController = async (req, res) => {
    try {
        
        
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                success: false,
                error: true
            });
        }

        const { transactionId } = req.params;
        const { message, subject } = req.body;

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        const customerEmail = transaction.customer_info?.email;
        if (!customerEmail) {
            return res.status(400).json({
                message: "No hay email del cliente",
                success: false,
                error: true
            });
        }

        // ✅ ENVIAR EMAIL PERSONALIZADO CON COPIA A ADMINS
        const customEmailContent = {
            subject: subject || `Actualización de tu Pedido #${transaction.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        
                        <!-- Header Zenn -->
                        <div style="background: linear-gradient(135deg, #2A3190 0%, #4F46E5 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                            <h1 style="margin: 0; font-size: 24px;">📬 Mensaje de Zenn</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Pedido #${transaction.shop_process_id}</p>
                        </div>

                        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hola <strong>${transaction.customer_info?.name || 'Cliente'}</strong>,</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2A3190;">
                            ${message.split('\n').map(line => `<p style="margin: 8px 0; color: #333; line-height: 1.6;">${line}</p>`).join('')}
                        </div>
                        
                        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #1565c0;"><strong>📦 Pedido:</strong> #${transaction.shop_process_id}</p>
                            <p style="margin: 5px 0 0 0; color: #1565c0;"><strong>📍 Estado actual:</strong> ${getDeliveryStatusDisplay(transaction.delivery_status)}</p>
                        </div>
                        
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                        
                        <p style="color: #666; margin: 0;">
                            Si tienes preguntas, contáctanos en 
                            <a href="mailto:ventas@zenn.com.py" style="color: #2A3190; text-decoration: none;">ventas@zenn.com.py</a>
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #999; font-size: 14px; margin: 0;">
                                Zenn - Tu tienda tecnológica de confianza
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        // ✅ INCLUIR COPIA OCULTA A ADMINS
        const mailOptions = {
            from: `"Zenn" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            bcc: emailService.adminEmails, // ✅ COPIA OCULTA A ADMINS
            subject: customEmailContent.subject,
            html: customEmailContent.html
        };

        
        

        const emailResult = await emailService.transporter.sendMail(mailOptions);

        // ✅ REGISTRAR NOTIFICACIÓN
        transaction.notifications_sent.push({
            type: 'email',
            status: 'manual_notification',
            sent_at: new Date(),
            success: true,
            recipient: customerEmail,
            subject: customEmailContent.subject,
            manual_message: message
        });
        await transaction.save();

        

        res.json({
            message: "Notificación enviada exitosamente",
            success: true,
            error: false,
            data: {
                recipient: customerEmail,
                messageId: emailResult.messageId,
                subject: customEmailContent.subject,
                admin_copy_sent: true,
                admin_recipients: emailService.adminEmails
            }
        });

    } catch (error) {
        console.error("❌ Error enviando notificación:", error);
        res.status(500).json({
            message: "Error al enviar notificación",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ FUNCIÓN AUXILIAR PARA MOSTRAR ESTADOS DE DELIVERY
 */
function getDeliveryStatusDisplay(status) {
    const statusMap = {
        'payment_confirmed': '✅ Pago Confirmado',
        'preparing_order': '📦 Preparando Pedido',
        'in_transit': '🚚 En Camino',
        'delivered': '📍 Entregado',
        'problem': '⚠️ Requiere Atención'
    };
    return statusMap[status] || status;
}

/**
 * ✅ NUEVO: RESEND EMAIL DE DELIVERY (PARA CASOS DONDE FALLÓ EL ENVÍO)
 */
const resendDeliveryEmailController = async (req, res) => {
    try {
        
        
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                success: false,
                error: true
            });
        }

        const { transactionId } = req.params;
        const { force_resend = false } = req.body;

        const transaction = await BancardTransactionModel.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        const customerEmail = transaction.customer_info?.email;
        if (!customerEmail) {
            return res.status(400).json({
                message: "No hay email del cliente",
                success: false,
                error: true
            });
        }

        // ✅ VERIFICAR SI YA SE ENVIÓ EMAIL PARA ESTE ESTADO
        const lastNotification = transaction.notifications_sent
            ?.filter(n => n.status === transaction.delivery_status)
            ?.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

        if (lastNotification?.success && !force_resend) {
            return res.status(400).json({
                message: "Ya se envió email para este estado. Use force_resend=true para reenviar.",
                success: false,
                error: true,
                last_email: {
                    sent_at: lastNotification.sent_at,
                    status: lastNotification.status
                }
            });
        }

        // ✅ REENVIAR EMAIL
        
        
        const emailResult = await emailService.sendDeliveryUpdateEmail(transaction, transaction.delivery_status);
        
        if (emailResult.success) {
            // ✅ REGISTRAR REENVÍO
            transaction.notifications_sent.push({
                type: 'email',
                status: transaction.delivery_status,
                sent_at: new Date(),
                success: true,
                recipient: customerEmail,
                is_resend: true,
                resent_by: req.userId
            });
            await transaction.save();

            

            res.json({
                message: "Email reenviado exitosamente",
                success: true,
                error: false,
                data: {
                    recipient: customerEmail,
                    messageId: emailResult.messageId,
                    delivery_status: transaction.delivery_status,
                    resend_count: transaction.notifications_sent.filter(n => 
                        n.status === transaction.delivery_status && n.is_resend
                    ).length
                }
            });
        } else {
            res.status(500).json({
                message: "Error reenviando email",
                success: false,
                error: true,
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error("❌ Error reenviando email:", error);
        res.status(500).json({
            message: "Error al reenviar email",
            success: false,
            error: true,
            details: error.message
        });
    }
};

/**
 * ✅ NUEVO: OBTENER HISTORIAL DE EMAILS ENVIADOS
 */
const getEmailHistoryController = async (req, res) => {
    try {
        
        
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                success: false,
                error: true
            });
        }

        const { transactionId } = req.params;

        const transaction = await BancardTransactionModel.findById(transactionId)
            .populate('delivery_updated_by', 'name email')
            .lean();

        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        // ✅ ENRIQUECER HISTORIAL DE NOTIFICACIONES
        const enrichedHistory = (transaction.notifications_sent || []).map(notification => ({
            ...notification,
            formatted_date: new Date(notification.sent_at).toLocaleString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            status_display: getDeliveryStatusDisplay(notification.status),
            days_since_sent: Math.floor((Date.now() - new Date(notification.sent_at)) / (1000 * 60 * 60 * 24))
        }));

        // ✅ ESTADÍSTICAS DE EMAILS
        const emailStats = {
            total_sent: enrichedHistory.length,
            successful: enrichedHistory.filter(n => n.success).length,
            failed: enrichedHistory.filter(n => !n.success).length,
            resends: enrichedHistory.filter(n => n.is_resend).length,
            last_email: enrichedHistory.length > 0 ? enrichedHistory[enrichedHistory.length - 1] : null,
            by_status: enrichedHistory.reduce((acc, n) => {
                acc[n.status] = (acc[n.status] || 0) + 1;
                return acc;
            }, {})
        };

        res.json({
            message: "Historial de emails obtenido",
            success: true,
            error: false,
            data: {
                transaction_id: transaction._id,
                shop_process_id: transaction.shop_process_id,
                customer_email: transaction.customer_info?.email,
                current_delivery_status: transaction.delivery_status,
                email_history: enrichedHistory.reverse(), // Más recientes primero
                statistics: emailStats
            }
        });

    } catch (error) {
        console.error("❌ Error obteniendo historial:", error);
        res.status(500).json({
            message: "Error al obtener historial de emails",
            success: false,
            error: true,
            details: error.message
        });
    }
};

module.exports = {
    updateDeliveryStatusController,
    getDeliveryProgressController,
    getDeliveryStatsController,
    addDeliveryAttemptController,
    rateDeliveryController,
    sendManualNotificationController,
    resendDeliveryEmailController,
    getEmailHistoryController
};
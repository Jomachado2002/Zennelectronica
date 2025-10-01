// backend/services/emailService.js - SISTEMA COMPLETO DE EMAILS PARA 

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = this.createTransport();
        // ✅ EMAILS DE ADMINISTRADORES PARA COPIA OCULTA
        this.adminEmails = [
            'jmachado@zenn.com.py',
        ];
    }

    createTransport() {
        return nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false, // TLS
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  // knccsnxcdnjkpthv
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    // ✅ FUNCIÓN PRINCIPAL: EMAIL TRAS COMPRA (ÉXITO O RECHAZO)
    async sendPurchaseConfirmationEmail(transactionData, isApproved = true) {
        try {
            const customerEmail = transactionData.customer_info?.email;
            
            if (!customerEmail) {
                console.log(`❌ No hay email del cliente para transacción ${transactionData.shop_process_id}`);
                return { success: false, error: 'No customer email provided' };
            }

            const emailContent = isApproved 
                ? this.getApprovedPurchaseTemplate(transactionData)
                : this.getRejectedPurchaseTemplate(transactionData);
            
            const mailOptions = {
                from: `"Zenn" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                bcc: this.adminEmails, // ✅ COPIA OCULTA A ADMINS
                subject: emailContent.subject,
                html: emailContent.html
            };

            console.log(`📧 Enviando email de compra ${isApproved ? 'APROBADA' : 'RECHAZADA'} a ${customerEmail}`);
            console.log(`📧 Con copia oculta a: ${this.adminEmails.join(', ')}`);
            
            const result = await this.transporter.sendMail(mailOptions);
            
            console.log(`✅ Email de compra enviado: ${result.messageId}`);
            
            return { 
                success: true, 
                messageId: result.messageId,
                recipient: customerEmail,
                adminNotified: true
            };

        } catch (error) {
            console.error(`❌ Error enviando email de compra:`, error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ✅ PLANTILLA PARA COMPRA APROBADA
    getApprovedPurchaseTemplate(data) {
        const total = this.displayPYGCurrency(data.amount);
        const orderDate = new Date(data.transaction_date || data.createdAt).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            subject: `🎉 ¡Compra Confirmada! Pedido #${data.shop_process_id} - Zenn`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
                    <!-- Header Zenn -->
                    <div style="background: linear-gradient(135deg, #2A3190 0%, #4F46E5 100%); color: white; padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 ¡Compra Confirmada!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">¡Gracias por elegi Zenn!</p>
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin-top: 20px;">
                            <div style="font-size: 14px; opacity: 0.8;">Pedido</div>
                            <div style="font-size: 24px; font-weight: bold;">#${data.shop_process_id}</div>
                        </div>
                    </div>

                    <div style="background-color: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        
                        <!-- Estado de Éxito -->
                        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; color: white;">
                            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                            <h2 style="margin: 0; font-size: 24px;">¡Pago Procesado Exitosamente!</h2>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                                Tu compra ha sido confirmada y estamos preparando tu pedido
                            </p>
                        </div>

                        <!-- Resumen del Pedido -->
                        <div style="margin: 25px 0;">
                            <h3 style="color: #2A3190; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                                📦 Resumen de tu Pedido
                            </h3>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">👤 Cliente:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.customer_info?.name || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">📧 Email:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.customer_info?.email || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">📅 Fecha de Compra:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${orderDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">💳 Método de Pago:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">
                                            ${data.payment_method === 'saved_card' ? '💳 Tarjeta Guardada' : '🆕 Nueva Tarjeta'}
                                        </td>
                                    </tr>
                                    ${data.authorization_number ? `
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">🔐 Autorización:</td>
                                            <td style="padding: 8px 0; font-weight: bold; color: #10B981;">${data.authorization_number}</td>
                                        </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; font-size: 18px;">💰 <strong>Total Pagado:</strong></td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #10B981; font-size: 20px;">${total}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <!-- Productos Comprados -->
                        ${data.items && data.items.length > 0 ? `
                            <div style="margin: 25px 0;">
                                <h3 style="color: #2A3190; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                                    🛍️ Productos Comprados
                                </h3>
                                
                                ${data.items.map((item, index) => `
                                    <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 15px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);">
                                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                                            <div style="flex: 1; min-width: 200px;">
                                                <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
                                                    ${item.name || 'Producto'}
                                                </h4>
                                                ${item.category ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📂 ${item.category}</p>` : ''}
                                                ${item.brand ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">🏢 ${item.brand}</p>` : ''}
                                                <div style="background-color: #e0f2fe; padding: 8px 12px; border-radius: 8px; display: inline-block;">
                                                    <span style="color: #0277bd; font-weight: 600; font-size: 14px;">
                                                        Cantidad: ${item.quantity || 1} unidad${(item.quantity || 1) > 1 ? 'es' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style="text-align: right; min-width: 120px; margin-top: 10px;">
                                                <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                                                    ${item.quantity || 1} × ${this.displayPYGCurrency(item.unitPrice || item.unit_price || 0)}
                                                </div>
                                                <div style="font-size: 18px; font-weight: bold; color: #2A3190;">
                                                    ${this.displayPYGCurrency(item.total || ((item.quantity || 1) * (item.unitPrice || item.unit_price || 0)))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- Información de Entrega -->
                        ${data.delivery_location ? `
                            <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; border-left: 4px solid #3b82f6;">
                                <h3 style="color: #1e40af; margin-bottom: 15px; font-size: 18px;">📍 Información de Entrega</h3>
                                <div style="color: #1e40af;">
                                    ${data.delivery_location.address || data.delivery_location.manual_address ? `
                                        <p style="margin: 8px 0; font-weight: 600;">
                                            <strong>📍 Dirección:</strong> ${data.delivery_location.address || data.delivery_location.manual_address}
                                        </p>
                                    ` : ''}
                                    ${data.delivery_location.city ? `
                                        <p style="margin: 8px 0; font-weight: 600;">
                                            <strong>🏘️ Ciudad:</strong> ${data.delivery_location.city}
                                        </p>
                                    ` : ''}
                                    ${data.delivery_location.house_number ? `
                                        <p style="margin: 8px 0; font-weight: 600;">
                                            <strong>🏠 Casa/Edificio:</strong> ${data.delivery_location.house_number}
                                        </p>
                                    ` : ''}
                                    ${data.delivery_location.reference ? `
                                        <p style="margin: 8px 0; font-weight: 600;">
                                            <strong>📝 Referencia:</strong> ${data.delivery_location.reference}
                                        </p>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Próximos Pasos -->
                        <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border-left: 4px solid #f59e0b;">
                            <h3 style="color: #92400e; margin-bottom: 15px; font-size: 18px;">📋 ¿Qué sigue ahora?</h3>
                            <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li style="margin-bottom: 8px;"><strong>✅ Pago confirmado:</strong> Tu transacción fue procesada exitosamente</li>
                                <li style="margin-bottom: 8px;"><strong>📦 Preparando pedido:</strong> Estamos empacando tus productos con cuidado</li>
                                <li style="margin-bottom: 8px;"><strong>📧 Te mantendremos informado:</strong> Recibirás emails con el progreso de tu pedido</li>
                                <li style="margin-bottom: 8px;"><strong>🚚 Envío en camino:</strong> Te notificaremos cuando tu pedido salga de nuestro almacén</li>
                            </ul>
                        </div>

                        <!-- Contacto y Soporte -->
                        <div style="margin: 25px 0; padding: 20px; background-color: #f3f4f6; border-radius: 12px; text-align: center;">
                            <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📞 ¿Necesitas Ayuda?</h3>
                            <p style="color: #6b7280; margin-bottom: 15px; line-height: 1.6;">
                                Si tienes alguna pregunta sobre tu pedido o necesitas asistencia, 
                                nuestro equipo está aquí para ayudarte.
                            </p>
                            <div style="margin-top: 15px;">
                                <a href="mailto:ventas@zenn.com.py" 
                                   style="display: inline-block; background: linear-gradient(135deg, #2A3190 0%, #4F46E5 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 5px;">
                                    📧 Escribir Email
                                </a>
                                <a href="https://wa.me/595123456789" 
                                   style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 5px;">
                                    📱 WhatsApp
                                </a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                            <div style="margin-bottom: 15px;">
                                <img src="https://zenn.vercel.app/logo.png" alt="Zenn" style="height: 40px;" />
                            </div>
                            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                                ¡Gracias por confiar en Zenn! 🙏
                            </p>
                            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                Tu tienda tecnológica de confianza • 
                                <a href="mailto:ventas@zenn.com.py" style="color: #2A3190;">ventas@zenn.com.py</a>
                            </p>
                            <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                                Este email fue enviado automáticamente. Por favor no respondas a este email.
                            </div>
                        </div>
                    </div>
                </div>
            `
        };
    }

    // ✅ PLANTILLA PARA COMPRA RECHAZADA
    getRejectedPurchaseTemplate(data) {
        const total = this.displayPYGCurrency(data.amount);
        const orderDate = new Date(data.transaction_date || data.createdAt).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            subject: `❌ Problema con tu Compra - Pedido #${data.shop_process_id} - Zenn`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
                    <!-- Header Zenn -->
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">❌ Problema con tu Compra</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">No te preocupes, podemos solucionarlo</p>
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin-top: 20px;">
                            <div style="font-size: 14px; opacity: 0.8;">Pedido</div>
                            <div style="font-size: 24px; font-weight: bold;">#${data.shop_process_id}</div>
                        </div>
                    </div>

                    <div style="background-color: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        
                        <!-- Estado de Rechazo -->
                        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border: 2px solid #f87171; border-radius: 12px;">
                            <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                            <h2 style="margin: 0; font-size: 24px; color: #dc2626;">Pago No Procesado</h2>
                            <p style="margin: 10px 0 0 0; font-size: 16px; color: #991b1b;">
                                ${data.response_description || 'Tu pago no pudo ser procesado en este momento'}
                            </p>
                        </div>

                        <!-- Información del Intento -->
                        <div style="margin: 25px 0;">
                            <h3 style="color: #dc2626; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 10px;">
                                📋 Detalles del Intento de Compra
                            </h3>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">👤 Cliente:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${data.customer_info?.name || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">📅 Fecha del Intento:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${orderDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">💳 Método de Pago:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">
                                            ${data.payment_method === 'saved_card' ? '💳 Tarjeta Guardada' : '🆕 Nueva Tarjeta'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; font-size: 18px;">💰 <strong>Monto:</strong></td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #dc2626; font-size: 20px;">${total}</td>
                                    </tr>
                                    ${data.response_code ? `
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">🔍 Código de Error:</td>
                                            <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${data.response_code}</td>
                                        </tr>
                                    ` : ''}
                                </table>
                            </div>
                        </div>

                        <!-- Productos que Intentaste Comprar -->
                        ${data.items && data.items.length > 0 ? `
                            <div style="margin: 25px 0;">
                                <h3 style="color: #dc2626; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 10px;">
                                    🛍️ Productos en tu Carrito
                                </h3>
                                <p style="color: #6b7280; margin-bottom: 15px;">Estos productos siguen disponibles para que los compres:</p>
                                
                                ${data.items.slice(0, 3).map((item, index) => `
                                    <div style="border: 1px solid #fecaca; border-radius: 10px; padding: 20px; margin-bottom: 15px; background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);">
                                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                                            <div style="flex: 1; min-width: 200px;">
                                                <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
                                                    ${item.name || 'Producto'}
                                                </h4>
                                                <div style="background-color: #dbeafe; padding: 8px 12px; border-radius: 8px; display: inline-block;">
                                                    <span style="color: #1e40af; font-weight: 600; font-size: 14px;">
                                                        Cantidad: ${item.quantity || 1}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style="text-align: right; min-width: 120px; margin-top: 10px;">
                                                <div style="font-size: 18px; font-weight: bold; color: #2A3190;">
                                                    ${this.displayPYGCurrency(item.total || ((item.quantity || 1) * (item.unitPrice || item.unit_price || 0)))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                
                                ${data.items.length > 3 ? `
                                    <div style="text-align: center; color: #6b7280; font-style: italic;">
                                        ... y ${data.items.length - 3} producto(s) más
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        <!-- Qué Hacer Ahora -->
                        <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; border-left: 4px solid #3b82f6;">
                            <h3 style="color: #1e40af; margin-bottom: 15px; font-size: 18px;">💡 ¿Qué puedes hacer?</h3>
                            <ul style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li style="margin-bottom: 8px;"><strong>🔄 Intentar de nuevo:</strong> Verifica los datos de tu tarjeta e intenta nuevamente</li>
                                <li style="margin-bottom: 8px;"><strong>💳 Usar otra tarjeta:</strong> Prueba con una tarjeta diferente</li>
                                <li style="margin-bottom: 8px;"><strong>🏧 Verificar fondos:</strong> Asegúrate de tener fondos suficientes</li>
                                <li style="margin-bottom: 8px;"><strong>📞 Contactar al banco:</strong> Tu banco podría haber bloqueado la transacción</li>
                                <li style="margin-bottom: 8px;"><strong>💬 Escribirnos:</strong> Podemos ayudarte a completar tu compra</li>
                            </ul>
                        </div>

                        <!-- Botones de Acción -->
                        <div style="text-align: center; margin: 25px 0; padding: 20px; background-color: #f3f4f6; border-radius: 12px;">
                            <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">🛒 ¡Completa tu Compra!</h3>
                            <p style="color: #6b7280; margin-bottom: 20px;">
                                Tus productos siguen esperándote. No pierdas esta oportunidad.
                            </p>
                            <div style="margin-top: 15px;">
                                <a href="${process.env.FRONTEND_URL || 'https://zenn.vercel.app'}/carrito" 
                                   style="display: inline-block; background: linear-gradient(135deg, #2A3190 0%, #4F46E5 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 5px; font-size: 16px;">
                                    🛒 Intentar de Nuevo
                                </a>
                                <a href="mailto:ventas@zenn.com.py?subject=Ayuda con Compra ${data.shop_process_id}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 5px; font-size: 16px;">
                                    💬 Solicitar Ayuda
                                </a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                            <div style="margin-bottom: 15px;">
                                <img src="https://zenn.vercel.app/logo.png" alt="Zenn" style="height: 40px;" />
                            </div>
                            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                                Estamos aquí para ayudarte 🤝
                            </p>
                            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                Zenn - Tu tienda tecnológica de confianza • 
                                <a href="mailto:ventas@zenn.com.py" style="color: #2A3190;">ventas@zenn.com.py</a>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
    }

    // ✅ FUNCIÓN PARA EMAILS DE ACTUALIZACIÓN DE DELIVERY (YA EXISTENTE - MEJORADA)
    async sendDeliveryUpdateEmail(transactionData, newStatus) {
        try {
            const customerEmail = transactionData.customer_info?.email;
            
            if (!customerEmail) {
                console.log(`❌ No hay email para transacción ${transactionData.shop_process_id}`);
                return { success: false, error: 'No email provided' };
            }

            const emailContent = this.getEmailTemplate(newStatus, transactionData);
            
            const mailOptions = {
                from: `"Zenn" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                bcc: this.adminEmails, // ✅ COPIA OCULTA A ADMINS TAMBIÉN
                subject: emailContent.subject,
                html: emailContent.html
            };

            console.log(`📧 Enviando email de delivery ${newStatus} a ${customerEmail}`);
            console.log(`📧 Con copia oculta a: ${this.adminEmails.join(', ')}`);
            
            const result = await this.transporter.sendMail(mailOptions);
            
            console.log(`✅ Email de delivery enviado: ${result.messageId}`);
            
            return { 
                success: true, 
                messageId: result.messageId,
                recipient: customerEmail,
                adminNotified: true 
            };

        } catch (error) {
            console.error(`❌ Error enviando email de delivery:`, error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ✅ FUNCIÓN PARA NOTIFICAR SOLO A ADMINS (NUEVA COMPRA)
    async sendAdminNotificationEmail(transactionData, eventType = 'nueva_compra') {
        try {
            const emailContent = this.getAdminNotificationTemplate(transactionData, eventType);
            
            const mailOptions = {
                from: `"Zenn Sistema" <${process.env.EMAIL_USER}>`,
                to: this.adminEmails, // Solo a admins
                subject: emailContent.subject,
                html: emailContent.html
            };

            console.log(`📧 Enviando notificación admin (${eventType}) a: ${this.adminEmails.join(', ')}`);
            
            const result = await this.transporter.sendMail(mailOptions);
            
            console.log(`✅ Notificación admin enviada: ${result.messageId}`);
            
            return { 
                success: true, 
                messageId: result.messageId,
                recipients: this.adminEmails 
            };

        } catch (error) {
            console.error(`❌ Error enviando notificación admin:`, error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ✅ PLANTILLA PARA NOTIFICACIONES A ADMINISTRADORES
    getAdminNotificationTemplate(data, eventType) {
        const total = this.displayPYGCurrency(data.amount);
        const orderDate = new Date(data.transaction_date || data.createdAt).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const eventTitles = {
            'nueva_compra': '🛒 Nueva Compra Recibida',
            'pago_aprobado': '✅ Pago Aprobado',
            'pago_rechazado': '❌ Pago Rechazado',
            'entrega_actualizada': '🚚 Estado de Entrega Actualizado'
        };

        const eventColors = {
            'nueva_compra': '#2A3190',
            'pago_aprobado': '#10B981',
            'pago_rechazado': '#dc2626',
            'entrega_actualizada': '#f59e0b'
        };

        return {
            subject: `${eventTitles[eventType] || '🔔 Notificación'} - Pedido #${data.shop_process_id}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
                    <!-- Header Admin -->
                    <div style="background: linear-gradient(135deg, ${eventColors[eventType]} 0%, #4F46E5 100%); color: white; padding: 25px; border-radius: 15px 15px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${eventTitles[eventType]}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Notificación Administrativa - Zenn</p>
                        <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; margin-top: 15px; display: inline-block;">
                            <div style="font-size: 12px; opacity: 0.8;">Pedido</div>
                            <div style="font-size: 20px; font-weight: bold;">#${data.shop_process_id}</div>
                        </div>
                    </div>

                    <div style="background-color: white; padding: 25px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        
                        <!-- Resumen Rápido -->
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                            <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">📊 Resumen de la Transacción</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 30%;">ID Transacción:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">#${data.shop_process_id}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Cliente:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">${data.customer_info?.name || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Email:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">${data.customer_info?.email || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Teléfono:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">${data.customer_info?.phone || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Fecha:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">${orderDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Estado:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: ${data.status === 'approved' ? '#10B981' : '#dc2626'};">
                                        ${data.status === 'approved' ? '✅ APROBADO' : '❌ RECHAZADO'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Tipo Usuario:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">
                                        ${data.user_type === 'REGISTERED' ? '👤 Registrado' : '👥 Invitado'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Método Pago:</td>
                                    <td style="padding: 6px 0; font-weight: bold; color: #1f2937;">
                                        ${data.payment_method === 'saved_card' ? '💳 Tarjeta Guardada' : '🆕 Nueva Tarjeta'}
                                    </td>
                                </tr>
                                <tr style="border-top: 2px solid #e5e7eb;">
                                    <td style="padding: 12px 0 6px 0; color: #6b7280; font-weight: 500; font-size: 16px;"><strong>💰 TOTAL:</strong></td>
                                    <td style="padding: 12px 0 6px 0; font-weight: bold; color: #10B981; font-size: 18px;">${total}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Productos -->
                        ${data.items && data.items.length > 0 ? `
                            <div style="margin: 20px 0;">
                                <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">🛍️ Productos (${data.items.length})</h3>
                                
                                ${data.items.map((item, index) => `
                                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background-color: #fafafa;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <strong style="color: #1f2937; font-size: 14px;">${item.name || 'Producto'}</strong>
                                                <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">
                                                    Cantidad: ${item.quantity || 1} • 
                                                    Precio unitario: ${this.displayPYGCurrency(item.unitPrice || item.unit_price || 0)}
                                                </div>
                                            </div>
                                            <div style="text-align: right;">
                                                <strong style="color: #2A3190; font-size: 14px;">
                                                    ${this.displayPYGCurrency(item.total || ((item.quantity || 1) * (item.unitPrice || item.unit_price || 0)))}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- Información de Entrega -->
                        ${data.delivery_location ? `
                            <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 10px;">
                                <h3 style="color: #1e40af; margin-bottom: 10px; font-size: 16px;">📍 Información de Entrega</h3>
                                <div style="color: #1e40af; font-size: 14px;">
                                    ${data.delivery_location.address || data.delivery_location.manual_address ? `
                                        <p style="margin: 4px 0;"><strong>Dirección:</strong> ${data.delivery_location.address || data.delivery_location.manual_address}</p>
                                    ` : ''}
                                    ${data.delivery_location.city ? `<p style="margin: 4px 0;"><strong>Ciudad:</strong> ${data.delivery_location.city}</p>` : ''}
                                    ${data.delivery_location.house_number ? `<p style="margin: 4px 0;"><strong>Casa/Edificio:</strong> ${data.delivery_location.house_number}</p>` : ''}
                                    ${data.delivery_location.reference ? `<p style="margin: 4px 0;"><strong>Referencia:</strong> ${data.delivery_location.reference}</p>` : ''}
                                    ${data.delivery_location.google_maps_url ? `
                                        <p style="margin: 8px 0 0 0;">
                                            <a href="${data.delivery_location.google_maps_url}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                                                🗺️ Ver en Google Maps
                                            </a>
                                        </p>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Información Técnica -->
                        <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
                            <h3 style="color: #374151; margin-bottom: 10px; font-size: 16px;">🔧 Información Técnica</h3>
                            <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                                <p style="margin: 2px 0;"><strong>Bancard Process ID:</strong> ${data.bancard_process_id || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>Autorización:</strong> ${data.authorization_number || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>Ticket:</strong> ${data.ticket_number || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>Ambiente:</strong> ${data.environment || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>IP Cliente:</strong> ${data.ip_address || 'N/A'}</p>
                                <p style="margin: 2px 0;"><strong>Dispositivo:</strong> ${data.device_type || 'N/A'}</p>
                            </div>
                        </div>

                        <!-- Enlaces Rápidos -->
                        <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">🔗 Acciones Rápidas</h3>
                            <div>
                                <a href="${process.env.FRONTEND_URL || 'https://zenn.vercel.app'}/panel-admin/transacciones-bancard" 
                                   style="display: inline-block; background: linear-gradient(135deg, #2A3190 0%, #4F46E5 100%); color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin: 3px; font-size: 12px;">
                                    👀 Ver en Admin Panel
                                </a>
                                ${data.status === 'approved' ? `
                                    <a href="${process.env.FRONTEND_URL || 'https://zenn.vercel.app'}/panel-admin/transacciones-bancard?search=${data.shop_process_id}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin: 3px; font-size: 12px;">
                                        🚚 Gestionar Entrega
                                    </a>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Footer Admin -->
                        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                Notificación automática del Sistema Zenn • ${new Date().toLocaleString('es-ES')}
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
    }

    // ✅ PLANTILLAS DE DELIVERY EXISTENTES (mantener las que ya tienes)
    getEmailTemplate(status, data) {
        const templates = {
            payment_confirmed: this.paymentConfirmedTemplate(data),
            preparing_order: this.preparingOrderTemplate(data),
            in_transit: this.inTransitTemplate(data),
            delivered: this.deliveredTemplate(data),
            problem: this.problemTemplate(data)
        };

        return templates[status] || this.defaultTemplate(data);
    }

    // ✅ FUNCIONES AUXILIARES
    displayPYGCurrency(num) {
        const formatter = new Intl.NumberFormat('es-PY', {
            style: "currency",
            currency: 'PYG',
            minimumFractionDigits: 0
        });
        return formatter.format(num);
    }

    // ✅ VERIFICAR CONFIGURACIÓN DE EMAIL
    async verifyEmailConfig() {
        try {
            await this.transporter.verify();
            console.log('✅ Configuración de email verificada correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error en configuración de email:', error);
            return false;
        }
    }

    // ✅ RESTO DE PLANTILLAS EXISTENTES (mantener las que ya tienes)
    paymentConfirmedTemplate(data) {
        return {
            subject: `✅ Pago Confirmado - Pedido #${data.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #2A3190;">✅ Pago Confirmado</h1>
                        <p>Hola ${data.customer_info?.name || 'Cliente'},</p>
                        <p>Tu pago por ${this.displayPYGCurrency(data.amount)} ha sido confirmado.</p>
                        <p>Pedido: #${data.shop_process_id}</p>
                        <p>Estamos preparando tu pedido y te notificaremos cuando esté listo para envío.</p>
                        <p>¡Gracias por elegir Zenn!</p>
                    </div>
                </div>
            `
        };
    }

    preparingOrderTemplate(data) {
        return {
            subject: `📦 Preparando tu Pedido #${data.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #2A3190;">📦 Preparando tu Pedido</h1>
                        <p>Hola ${data.customer_info?.name || 'Cliente'},</p>
                        <p>Estamos empacando cuidadosamente tu pedido #${data.shop_process_id}.</p>
                        <p>Te notificaremos cuando esté listo para envío.</p>
                        <p>¡Gracias por tu paciencia!</p>
                    </div>
                </div>
            `
        };
    }

    inTransitTemplate(data) {
        return {
            subject: `🚚 Tu Pedido está En Camino #${data.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #2A3190;">🚚 Tu Pedido está En Camino</h1>
                        <p>Hola ${data.customer_info?.name || 'Cliente'},</p>
                        <p>Tu pedido #${data.shop_process_id} está en camino hacia tu dirección.</p>
                        ${data.tracking_number ? `<p>Número de seguimiento: <strong>${data.tracking_number}</strong></p>` : ''}
                        <p>Pronto recibirás tus productos.</p>
                        <p>¡Gracias por elegir Zenn!</p>
                    </div>
                </div>
            `
        };
    }

    deliveredTemplate(data) {
        return {
            subject: `📍 ¡Pedido Entregado! #${data.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #28a745;">📍 ¡Pedido Entregado!</h1>
                        <p>Hola ${data.customer_info?.name || 'Cliente'},</p>
                        <p>Tu pedido #${data.shop_process_id} ha sido entregado exitosamente.</p>
                        <p>Esperamos que disfrutes tus productos.</p>
                        <p>¡Gracias por elegir Zenn!</p>
                    </div>
                </div>
            `
        };
    }

    problemTemplate(data) {
        return {
            subject: `⚠️ Atención Requerida - Pedido #${data.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #dc3545;">⚠️ Atención Requerida</h1>
                        <p>Hola ${data.customer_info?.name || 'Cliente'},</p>
                        <p>Hay un inconveniente con tu pedido #${data.shop_process_id}.</p>
                        <p>Por favor contáctanos para resolverlo.</p>
                        <p>Email: ventas@zenn.com.py</p>
                    </div>
                </div>
            `
        };
    }

    defaultTemplate(data) {
        return {
            subject: `Actualización de Pedido #${data.shop_process_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2A3190;">Actualización de tu Pedido</h1>
                    <p>Hola ${data.customer_info?.name || 'Cliente'},</p>
                    <p>Tu pedido #${data.shop_process_id} ha sido actualizado.</p>
                    <p>¡Gracias por elegir Zenn!</p>
                </div>
            `
        };
    }
}

module.exports = new EmailService();
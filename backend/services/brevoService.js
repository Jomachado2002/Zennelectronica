// backend/services/brevoService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configurar Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

/**
 * Formatear número a guaraníes
 */
function formatToPYG(amount) {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Formatear fecha
 */
function formatDate(date) {
    return new Intl.DateTimeFormat('es-PY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

/**
 * Traducir método de pago
 */
function translatePaymentMethod(method) {
    const translations = {
        'efectivo': 'Efectivo',
        'transferencia': 'Transferencia Bancaria',
        'cheque': 'Cheque',
        'tarjeta': 'Tarjeta de Crédito/Débito',
        'credito': 'Crédito'
    };
    return translations[method] || method;
}

/**
 * Traducir estado de pago
 */
function translatePaymentStatus(status) {
    const translations = {
        'pendiente': '⏳ Pendiente',
        'parcial': '🔸 Parcial',
        'pagado': '✅ Pagado',
        'vencido': '❌ Vencido'
    };
    return translations[status] || status;
}

/**
 * Enviar email de confirmación de compra
 * @param {Object} saleData - Datos de la venta
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object>} - Respuesta de Brevo
 */
async function sendPurchaseConfirmationEmail(saleData, clientData) {
    try {
        // Validar que tenemos email del cliente
        if (!clientData.email) {
            throw new Error('El cliente no tiene email registrado');
        }

        // Preparar items formateados
        const formattedItems = saleData.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitPriceFormatted: formatToPYG(item.unitPrice),
            subtotal: item.subtotal,
            subtotalFormatted: formatToPYG(item.subtotal)
        }));

        // Crear descripción de items como texto HTML (para compatibilidad con Brevo)
        const itemsDescription = saleData.items.map((item, index) => 
            `${index + 1}. ${item.description} - Cantidad: ${item.quantity} - ${formatToPYG(item.unitPrice)} c/u = ${formatToPYG(item.subtotal)}`
        ).join('<br>');

        // Preparar parámetros para la plantilla
        const templateParams = {
            // Datos del cliente
            clientName: clientData.name || 'Cliente',
            clientCompany: clientData.company || 'N/A',
            clientEmail: clientData.email,
            clientPhone: clientData.phone || 'N/A',
            
            // Datos de la venta
            saleNumber: saleData.saleNumber || 'N/A',
            saleDate: formatDate(saleData.saleDate || new Date()),
            paymentMethod: translatePaymentMethod(saleData.paymentMethod),
            paymentStatus: translatePaymentStatus(saleData.paymentStatus),
            paymentConfirmed: saleData.paymentStatus === 'pagado',
            
            // Montos
            subtotal: saleData.subtotal,
            subtotalFormatted: formatToPYG(saleData.subtotal),
            taxRate: saleData.tax || 10,
            taxAmount: saleData.taxAmount,
            taxAmountFormatted: formatToPYG(saleData.taxAmount),
            totalAmount: saleData.totalAmount,
            totalAmountFormatted: formatToPYG(saleData.totalAmount),
            
            // Items
            items: formattedItems,
            itemsDescription: itemsDescription,
            
            // Información adicional
            notes: saleData.notes || '',
            dueDate: saleData.dueDate ? formatDate(saleData.dueDate) : null
        };

        // Configurar API de envío transaccional
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        
        // Preparar el email
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        
        // IMPORTANTE: Aquí debes poner el ID de tu plantilla de Brevo
        // Lo obtienes desde la interfaz de Brevo después de crear la plantilla
        sendSmtpEmail.templateId = parseInt(process.env.BREVO_TEMPLATE_ID_PURCHASE);
        
        // Destinatario
        sendSmtpEmail.to = [{
            email: clientData.email,
            name: clientData.name
        }];
        
        // Remitente (debe estar verificado en Brevo)
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL || 'ventas@zennelectronica.com',
            name: process.env.BREVO_SENDER_NAME || 'ZennElectrónica'
        };
        
        // Parámetros de la plantilla
        sendSmtpEmail.params = templateParams;
        
        // Asunto del email (puede ser sobrescrito por la plantilla)
        sendSmtpEmail.subject = `Confirmación de Compra - ${saleData.saleNumber}`;
        
        // CC (opcional) - copia al admin
        if (process.env.BREVO_CC_EMAIL) {
            sendSmtpEmail.cc = [{
                email: process.env.BREVO_CC_EMAIL
            }];
        }

        // Enviar email
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log('✅ Email de confirmación enviado:', result);
        
        return {
            success: true,
            messageId: result.messageId,
            data: result
        };

    } catch (error) {
        console.error('❌ Error al enviar email de confirmación:', error);
        
        return {
            success: false,
            error: error.message,
            details: error.response?.body || error
        };
    }
}

/**
 * Enviar email de recordatorio de pago
 * @param {Object} saleData - Datos de la venta
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object>} - Respuesta de Brevo
 */
async function sendPaymentReminderEmail(saleData, clientData) {
    try {
        if (!clientData.email) {
            throw new Error('El cliente no tiene email registrado');
        }

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        
        // Plantilla para recordatorio de pago (deberás crear esta plantilla también)
        sendSmtpEmail.templateId = parseInt(process.env.BREVO_TEMPLATE_ID_PAYMENT_REMINDER);
        
        sendSmtpEmail.to = [{
            email: clientData.email,
            name: clientData.name
        }];
        
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL || 'ventas@zennelectronica.com',
            name: process.env.BREVO_SENDER_NAME || 'ZennElectrónica'
        };
        
        sendSmtpEmail.params = {
            clientName: clientData.name,
            saleNumber: saleData.saleNumber,
            totalAmountFormatted: formatToPYG(saleData.totalAmount),
            dueDate: saleData.dueDate ? formatDate(saleData.dueDate) : 'No especificado'
        };

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        return {
            success: true,
            messageId: result.messageId,
            data: result
        };

    } catch (error) {
        console.error('❌ Error al enviar recordatorio de pago:', error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enviar email simple (sin plantilla)
 * @param {Object} emailData - Datos del email
 * @returns {Promise<Object>}
 */
async function sendSimpleEmail(emailData) {
    try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        
        sendSmtpEmail.to = emailData.to;
        sendSmtpEmail.sender = emailData.sender;
        sendSmtpEmail.subject = emailData.subject;
        sendSmtpEmail.htmlContent = emailData.htmlContent;
        
        if (emailData.cc) sendSmtpEmail.cc = emailData.cc;
        if (emailData.bcc) sendSmtpEmail.bcc = emailData.bcc;

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        return {
            success: true,
            messageId: result.messageId
        };

    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sendPurchaseConfirmationEmail,
    sendPaymentReminderEmail,
    sendSimpleEmail,
    formatToPYG,
    formatDate
};


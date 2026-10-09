// backend/services/brevoService.js
const fs = require('fs');
const path = require('path');
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

function getSender() {
    return {
        email: process.env.BREVO_SENDER_EMAIL || 'no-reply@zenn.com.py',
        name: process.env.BREVO_SENDER_NAME || 'ZENN ELECTRONICOS'
    };
}

function getReplyTo() {
    return {
        email: process.env.BREVO_REPLY_TO || 'ventas@zenn.com.py',
        name: 'Zenn Ventas'
    };
}

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
        
        sendSmtpEmail.sender = getSender();
        sendSmtpEmail.replyTo = getReplyTo();
        
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
        
        sendSmtpEmail.sender = getSender();
        sendSmtpEmail.replyTo = getReplyTo();
        
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
        sendSmtpEmail.sender = emailData.sender || getSender();
        sendSmtpEmail.replyTo = emailData.replyTo || getReplyTo();
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

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const PRODUCT_IMAGE_FALLBACK = 'https://www.zenn.com.py/logozenn.png';

function storeUrl() {
    return (process.env.FRONTEND_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
}

function absoluteImage(url) {
    const value = Array.isArray(url) ? url[0] : url;
    if (!value) return PRODUCT_IMAGE_FALLBACK;
    if (String(value).startsWith('http')) return String(value);
    return `${storeUrl()}${String(value).startsWith('/') ? '' : '/'}${value}`;
}

function renderProductCard({ name, image, price, quantity, url }) {
    const safeName = escapeHtml(name || 'Producto');
    const safeImage = escapeHtml(absoluteImage(image));
    const safeUrl = escapeHtml(url || storeUrl());
    const safePrice = escapeHtml(formatToPYG(Number(price) || 0));
    const safeQty = escapeHtml(quantity || 1);

    return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e0e0e0; margin: 0 0 12px 0;">
            <tr>
                <td width="128" style="padding: 16px; vertical-align: middle;">
                    <a href="${safeUrl}" style="text-decoration: none;">
                        <img src="${safeImage}" alt="${safeName}" width="96" style="display: block; width: 96px; max-width: 96px; height: auto; border: 0;">
                    </a>
                </td>
                <td style="padding: 16px 16px 16px 0; vertical-align: middle;">
                    <a href="${safeUrl}" style="font-size: 15px; color: #222222; font-weight: 600; text-decoration: none; line-height: 1.4;">${safeName}</a>
                    <p style="font-size: 13px; color: #777777; margin: 8px 0 0 0;">Cantidad: ${safeQty}</p>
                    <p style="font-size: 16px; color: #373592; font-weight: 600; margin: 6px 0 0 0;">${safePrice}</p>
                </td>
            </tr>
        </table>`;
}

async function resolveOrderItems(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return [];

    const ids = list
        .map((item) => String(item.product_id || item.productId || item._id || ''))
        .filter((id) => /^[a-f\d]{24}$/i.test(id));

    let byId = new Map();
    if (ids.length) {
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const Product = require('../models/productModel');
                const products = await Product.find({ _id: { $in: ids } })
                    .select('productName productImage sellingPrice')
                    .lean();
                byId = new Map(products.map((product) => [String(product._id), product]));
            }
        } catch (error) {
            console.error('No se pudieron cargar las imágenes del pedido:', error.message);
        }
    }

    return list.map((item) => {
        const id = String(item.product_id || item.productId || item._id || '');
        const product = byId.get(id);
        const price = item.unit_price || item.unitPrice || item.price || item.total || product?.sellingPrice || 0;
        return {
            name: item.name || item.productName || product?.productName || 'Producto',
            image: absoluteImage(item.image || item.productImage || product?.productImage),
            price,
            quantity: item.quantity || 1,
            url: id ? `${storeUrl()}/producto/${id}` : storeUrl()
        };
    });
}

/**
 * Correo de recuperación de contraseña.
 * Sale desde no-reply@ y las respuestas van a ventas@.
 */
async function sendPasswordResetEmail({ email, name, resetUrl }) {
    const templatePath = path.join(__dirname, '../email-templates/recuperar-contrasena.html');
    const clientName = escapeHtml(name || 'Cliente');
    const safeUrl = escapeHtml(resetUrl);
    const htmlContent = fs.readFileSync(templatePath, 'utf8')
        .replaceAll('{{ params.clientName }}', clientName)
        .replaceAll('{{ params.resetUrl }}', safeUrl);

    return sendSimpleEmail({
        to: [{ email, name: name || 'Cliente' }],
        subject: 'Restablecé tu contraseña',
        htmlContent
    });
}

const ORDER_STATUS_MAIL = {
    payment_confirmed: {
        file: 'pedido-recibido.html',
        subject: (orderNumber) => `Hemos recibido su pedido #${orderNumber}`
    },
    preparing_order: {
        file: 'pedido-confirmado.html',
        subject: (orderNumber) => `Su pedido #${orderNumber} fue confirmado`
    },
    in_transit: {
        file: 'pedido-en-camino.html',
        subject: (orderNumber) => `Su pedido #${orderNumber} está en camino`
    },
    delivered: {
        file: 'pedido-entregado.html',
        subject: (orderNumber) => `Su pedido #${orderNumber} fue entregado`
    },
    problem: {
        file: 'pedido-problema.html',
        subject: (orderNumber) => `Su pedido #${orderNumber} necesita atención`
    }
};

/**
 * Aviso de estado del pedido. Sale desde no-reply@ y las respuestas van a ventas@.
 */
async function sendOrderStatusEmail({ email, name, orderNumber, orderTotal, status, items }) {
    const mail = ORDER_STATUS_MAIL[status];
    if (!email || !mail) {
        return { success: false, error: !email ? 'No email provided' : 'Estado de pedido no reconocido' };
    }

    const frontendUrl = storeUrl();
    const resolvedItems = await resolveOrderItems(items);
    const first = resolvedItems[0] || {
        name: 'Su pedido',
        image: PRODUCT_IMAGE_FALLBACK,
        price: orderTotal,
        quantity: 1,
        url: `${frontendUrl}/pedido/${encodeURIComponent(orderNumber || '')}`
    };
    const extraItemsHtml = resolvedItems.slice(1).map(renderProductCard).join('');
    const safeOrderNumber = escapeHtml(orderNumber || '');
    const htmlContent = fs.readFileSync(path.join(__dirname, '../email-templates', mail.file), 'utf8')
        .replaceAll('{{ params.clientName }}', escapeHtml(name || 'Cliente'))
        .replaceAll('{{ params.orderNumber }}', safeOrderNumber)
        .replaceAll('{{ params.orderTotal }}', escapeHtml(formatToPYG(Number(orderTotal) || 0)))
        .replaceAll('{{ params.orderUrl }}', escapeHtml(`${frontendUrl}/pedido/${encodeURIComponent(orderNumber || '')}`))
        .replaceAll('{{ params.productName }}', escapeHtml(first.name))
        .replaceAll('{{ params.productImage }}', escapeHtml(first.image))
        .replaceAll('{{ params.productPrice }}', escapeHtml(formatToPYG(Number(first.price) || 0)))
        .replaceAll('{{ params.productQuantity }}', escapeHtml(first.quantity || 1))
        .replaceAll('{{ params.productUrl }}', escapeHtml(first.url))
        .replaceAll('{{ params.extraItemsHtml }}', extraItemsHtml);

    return sendSimpleEmail({
        to: [{ email, name: name || 'Cliente' }],
        subject: mail.subject(orderNumber || ''),
        htmlContent
    });
}

module.exports = {
    sendPurchaseConfirmationEmail,
    sendPaymentReminderEmail,
    sendSimpleEmail,
    sendPasswordResetEmail,
    sendOrderStatusEmail,
    formatToPYG,
    formatDate,
    escapeHtml
};


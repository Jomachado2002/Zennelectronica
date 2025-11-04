// backend/test-brevo.js - Script de prueba para Brevo
require('dotenv').config();
const { sendPurchaseConfirmationEmail } = require('./services/brevoService');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

console.log(`\n${colors.bright}${colors.cyan}================================`);
console.log(`🚀 TEST DE BREVO EMAIL SERVICE`);
console.log(`================================${colors.reset}\n`);

// Verificar variables de entorno
console.log(`${colors.yellow}📋 Verificando configuración...${colors.reset}`);

if (!process.env.BREVO_API_KEY) {
    console.error(`${colors.red}❌ ERROR: BREVO_API_KEY no está configurada en .env${colors.reset}`);
    process.exit(1);
}

if (!process.env.BREVO_TEMPLATE_ID_PURCHASE) {
    console.error(`${colors.red}❌ ERROR: BREVO_TEMPLATE_ID_PURCHASE no está configurada en .env${colors.reset}`);
    process.exit(1);
}

console.log(`${colors.green}✅ API Key configurada${colors.reset}`);
console.log(`${colors.green}✅ Template ID configurado: ${process.env.BREVO_TEMPLATE_ID_PURCHASE}${colors.reset}`);
console.log(`${colors.green}✅ Email remitente: ${process.env.BREVO_SENDER_EMAIL || 'ventas@zennelectronica.com'}${colors.reset}\n`);

// ⚠️ CAMBIAR ESTE EMAIL POR UNO REAL PARA PROBAR
const TEST_EMAIL = 'josiasnicolas02@gmail.com'; // 👈 EMAIL CONFIGURADO

// Datos de prueba
const testSale = {
    _id: '123456789abc',
    saleNumber: 'VNT-00001',
    saleDate: new Date(),
    paymentMethod: 'efectivo',
    paymentStatus: 'pendiente',
    subtotal: 100000,
    tax: 10,
    taxAmount: 10000,
    totalAmount: 110000,
    notes: 'Esta es una venta de prueba. Por favor ignorar.',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    items: [
        {
            description: 'Producto de Prueba 1 - Laptop HP',
            quantity: 2,
            unitPrice: 25000,
            subtotal: 50000
        },
        {
            description: 'Producto de Prueba 2 - Mouse Inalámbrico',
            quantity: 1,
            unitPrice: 50000,
            subtotal: 50000
        }
    ]
};

const testClient = {
    name: 'Cliente de Prueba',
    company: 'Empresa Test S.A.',
    email: TEST_EMAIL, // Email que configuraste arriba
    phone: '+595 981 123456'
};

console.log(`${colors.cyan}📨 Preparando email de prueba...${colors.reset}`);
console.log(`${colors.blue}   → Destinatario: ${testClient.name} (${testClient.email})${colors.reset}`);
console.log(`${colors.blue}   → Venta: ${testSale.saleNumber}${colors.reset}`);
console.log(`${colors.blue}   → Total: Gs. ${testSale.totalAmount.toLocaleString('es-PY')}${colors.reset}\n`);

// Función de prueba
async function testEmail() {
    try {
        console.log(`${colors.yellow}⏳ Enviando email...${colors.reset}`);
        
        const result = await sendPurchaseConfirmationEmail(testSale, testClient);
        
        if (result.success) {
            console.log(`\n${colors.bright}${colors.green}✅ ¡EMAIL ENVIADO EXITOSAMENTE!${colors.reset}`);
            console.log(`${colors.green}   📧 Message ID: ${result.messageId}${colors.reset}`);
            console.log(`${colors.green}   📬 Revisa tu bandeja de entrada: ${testClient.email}${colors.reset}`);
            console.log(`${colors.yellow}   💡 Si no lo ves, revisa la carpeta de SPAM${colors.reset}\n`);
            
            console.log(`${colors.cyan}🔍 Puedes verificar el envío en:${colors.reset}`);
            console.log(`${colors.blue}   https://app.brevo.com/email/logs${colors.reset}\n`);
            
        } else {
            console.error(`\n${colors.bright}${colors.red}❌ ERROR AL ENVIAR EMAIL${colors.reset}`);
            console.error(`${colors.red}   Error: ${result.error}${colors.reset}`);
            
            if (result.details) {
                console.error(`${colors.red}   Detalles:${colors.reset}`);
                console.error(result.details);
            }
            
            console.log(`\n${colors.yellow}💡 Posibles soluciones:${colors.reset}`);
            console.log(`   1. Verificar que la API Key sea correcta`);
            console.log(`   2. Verificar que el Template ID exista en Brevo`);
            console.log(`   3. Verificar que el email remitente esté verificado`);
            console.log(`   4. Revisar los logs en: https://app.brevo.com/email/logs\n`);
        }
        
    } catch (error) {
        console.error(`\n${colors.bright}${colors.red}❌ ERROR INESPERADO${colors.reset}`);
        console.error(`${colors.red}   ${error.message}${colors.reset}`);
        console.error(error);
    }
}

// Ejecutar prueba
testEmail();


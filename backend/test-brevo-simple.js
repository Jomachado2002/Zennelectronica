// Test directo con la API de Brevo
require('dotenv').config();
const axios = require('axios');

const testEmail = async () => {
    console.log('\n🔍 Probando conexión directa con Brevo API...\n');
    
    const apiKey = process.env.BREVO_API_KEY;
    const templateId = process.env.BREVO_TEMPLATE_ID_PURCHASE;
    
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NO ENCONTRADA');
    console.log('Template ID:', templateId);
    console.log('');
    
    try {
        const response = await axios({
            method: 'post',
            url: 'https://api.brevo.com/v3/smtp/email',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            data: {
                sender: {
                    name: process.env.BREVO_SENDER_NAME || "ZENN ELECTRONICOS",
                    email: process.env.BREVO_SENDER_EMAIL || "no-reply@zenn.com.py"
                },
                to: [
                    {
                        email: "josiasnicolas02@gmail.com",
                        name: "Cliente de Prueba"
                    }
                ],
                subject: "Prueba de Email - ZENN",
                templateId: parseInt(templateId),
                params: {
                    clientName: "Cliente de Prueba",
                    clientEmail: "josiasnicolas02@gmail.com",
                    clientPhone: "+595 981 123456",
                    saleNumber: "VNT-00001",
                    saleDate: "4 de noviembre de 2025",
                    paymentMethod: "Efectivo",
                    subtotalFormatted: "Gs. 100.000",
                    taxRate: "10",
                    taxAmountFormatted: "Gs. 10.000",
                    totalAmountFormatted: "Gs. 110.000",
                    itemsDescription: "1. Producto de Prueba 1 - Cantidad: 2 - Gs. 25.000 c/u = Gs. 50.000<br>2. Producto de Prueba 2 - Cantidad: 1 - Gs. 50.000 c/u = Gs. 50.000",
                    paymentConfirmed: false
                }
            }
        });
        
        console.log('✅ RESPUESTA EXITOSA:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        console.log('\n📧 Revisa tu email: josiasnicolas02@gmail.com');
        console.log('📊 Revisa logs: https://app.brevo.com/email/logs\n');
        
    } catch (error) {
        console.error('❌ ERROR:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
};

testEmail();


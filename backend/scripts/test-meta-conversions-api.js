// backend/scripts/test-meta-conversions-api.js
// Script para probar la Meta Conversions API con test_event_code

require('dotenv').config();
const axios = require('axios');

// Configuración
const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || 'TEST24448'; // Código de prueba de Meta
const API_VERSION = process.env.META_API_VERSION || 'v21.0';

if (!PIXEL_ID || !ACCESS_TOKEN) {
  console.error('❌ Error: META_PIXEL_ID y META_ACCESS_TOKEN deben estar configurados en .env');
  process.exit(1);
}

const API_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

/**
 * Función para enviar un evento de prueba
 */
async function sendTestEvent(eventName = 'PageView', eventData = {}) {
  try {
    console.log('\n🧪 Enviando evento de prueba a Meta Conversions API...');
    console.log('📋 Configuración:');
    console.log(`   Pixel ID: ${PIXEL_ID}`);
    console.log(`   Test Event Code: ${TEST_EVENT_CODE}`);
    console.log(`   Event Name: ${eventName}`);
    console.log(`   API Version: ${API_VERSION}\n`);

    const event = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_source_url: 'https://www.zenn.com.py',
      action_source: 'website',
      user_data: {
        client_ip_address: '127.0.0.1',
        client_user_agent: 'Mozilla/5.0 (Test Script)'
      },
      custom_data: {
        currency: eventData.currency || 'PYG',
        value: eventData.value || 0,
        ...(eventData.content_ids && { content_ids: eventData.content_ids }),
        ...(eventData.content_name && { content_name: eventData.content_name })
      }
    };

    const payload = {
      data: [event],
      access_token: ACCESS_TOKEN,
      test_event_code: TEST_EVENT_CODE
    };

    console.log('📤 Payload a enviar:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');

    const response = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.events_received > 0) {
      console.log('✅ ¡Éxito! Evento enviado correctamente a Meta');
      console.log('📊 Respuesta de Meta:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('\n📝 Próximos pasos:');
      console.log('1. Ve a Meta Events Manager → Test Events');
      console.log('2. Asegúrate de que la página "Probar eventos" esté abierta');
      console.log('3. Deberías ver el evento aparecer en tiempo real');
      console.log('4. Si aparece, tu configuración está correcta ✅\n');
      return { success: true, response: response.data };
    } else {
      console.warn('⚠️ Respuesta inesperada de Meta:');
      console.log(JSON.stringify(response.data, null, 2));
      return { success: false, response: response.data };
    }
  } catch (error) {
    console.error('❌ Error al enviar evento de prueba:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando prueba de Meta Conversions API\n');
  console.log('=' .repeat(60));

  // Probar diferentes tipos de eventos
  const testEvents = [
    { name: 'PageView', data: {} },
    { name: 'ViewContent', data: { value: 500000, currency: 'PYG', content_name: 'Producto de Prueba' } },
    { name: 'AddToCart', data: { value: 500000, currency: 'PYG', content_ids: ['test_product_1'] } },
    { name: 'Purchase', data: { value: 1000000, currency: 'PYG', content_ids: ['test_product_1', 'test_product_2'], transaction_id: `test_${Date.now()}` } }
  ];

  const results = [];

  for (const testEvent of testEvents) {
    console.log(`\n📨 Probando evento: ${testEvent.name}`);
    console.log('-'.repeat(60));
    const result = await sendTestEvent(testEvent.name, testEvent.data);
    results.push({ event: testEvent.name, ...result });
    
    // Esperar un poco entre eventos
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS\n');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.event}: ${result.success ? 'Éxito' : 'Error'}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Eventos exitosos: ${successCount}/${results.length}`);

  if (successCount === results.length) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! Tu configuración está correcta.');
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron. Revisa la configuración.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendTestEvent };


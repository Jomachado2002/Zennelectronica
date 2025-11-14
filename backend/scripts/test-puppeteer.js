const puppeteer = require('puppeteer');

async function testPuppeteer() {
  let browser = null;
  try {
    console.log('🧪 Probando Puppeteer...');
    
    // Verificar si Puppeteer puede encontrar Chrome
    try {
      const executablePath = puppeteer.executablePath();
      console.log('✅ Chrome encontrado en:', executablePath);
    } catch (err) {
      console.warn('⚠️ No se pudo obtener la ruta del ejecutable:', err.message);
    }
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
    
    console.log('🚀 Lanzando Puppeteer...');
    browser = await puppeteer.launch(launchOptions);
    console.log('✅ Puppeteer lanzado exitosamente');
    
    const page = await browser.newPage();
    console.log('✅ Nueva página creada');
    
    await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
    console.log('✅ Contenido HTML configurado');
    
    const pdfBuffer = await page.pdf({ format: 'A4' });
    console.log('✅ PDF generado exitosamente, tamaño:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
    
    await browser.close();
    console.log('✅ Navegador cerrado');
    
    console.log('🎉 ¡Puppeteer funciona correctamente!');
    
  } catch (error) {
    console.error('❌ Error en Puppeteer:');
    console.error('   Nombre:', error.name);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError);
      }
    }
    
    process.exit(1);
  }
}

testPuppeteer();


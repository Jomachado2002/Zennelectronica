const puppeteer = require('puppeteer');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');

// Obtener categorías para el catálogo
const getCatalogCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name label value subcategories')
      .sort({ order: 1 })
      .lean();
    
    const formattedCategories = categories.map(cat => ({
      value: cat.value,
      label: cat.label,
      name: cat.name,
      subcategories: cat.subcategories
        .filter(sub => sub.isActive)
        .map(sub => ({
          value: sub.value,
          label: sub.label,
          name: sub.name
        }))
    }));
    
    res.json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías'
    });
  }
};

// Obtener productos para el catálogo
const getCatalogProducts = async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    }
    
    const products = await Product.find(filter)
      .select('productName brandName category subcategory productImage description price sellingPrice codigo stock slug')
      .sort({ category: 1, subcategory: 1, productName: 1 })
      .lean();
    
    if (products.length === 0) {
      return res.json({
        success: true,
        data: [],
        total_categories: 0,
        total_products: 0
      });
    }
    
    const categories = await Category.find({ isActive: true })
      .select('name label value subcategories')
      .sort({ order: 1 })
      .lean();
    
    const catalogData = [];
    
    for (const cat of categories) {
      const categoryProducts = products.filter(p => p.category === cat.value);
      
      if (categoryProducts.length === 0) continue;
      
      const subcategories = [];
      const subcategoryMap = new Map();
      
      for (const sub of cat.subcategories) {
        if (sub.isActive) {
          subcategoryMap.set(sub.value, {
            name: sub.name,
            label: sub.label,
            productos: []
          });
        }
      }
      
      for (const product of categoryProducts) {
        if (subcategoryMap.has(product.subcategory)) {
          const sub = subcategoryMap.get(product.subcategory);
          sub.productos.push({
            id: product._id,
            titulo: product.productName,
            marca: product.brandName,
            descripcion: product.description || `${product.brandName} - ${product.productName}`,
            precio: product.sellingPrice || product.price,
            codigo: product.codigo,
            stock: product.stock,
            imagen_url: product.productImage && product.productImage.length > 0 
              ? product.productImage[0] 
              : null,
            slug: product.slug
          });
        }
      }
      
      for (const sub of subcategoryMap.values()) {
        if (sub.productos.length > 0) {
          subcategories.push(sub);
        }
      }
      
      if (subcategories.length > 0) {
        catalogData.push({
          categoria: cat.name,
          subcategorias: subcategories
        });
      }
    }
    
    res.json({
      success: true,
      data: catalogData,
      total_categories: catalogData.length,
      total_products: products.length
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
};

// Generar catálogo PDF con diseño mejorado
const generateCatalogPDF = async (req, res) => {
  let browser = null;
  
  try {
    const { category, subcategory, title = 'Catálogo de Productos' } = req.body;
    
    // Construir filtro de búsqueda
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    }
    
    // Obtener productos con filtros
    const products = await Product.find(filter)
      .select('productName brandName category subcategory productImage description price sellingPrice codigo stock')
      .sort({ category: 1, subcategory: 1, productName: 1 })
      .lean();
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron productos con los filtros aplicados'
      });
    }
    
    // Obtener todas las categorías
    const categories = await Category.find({ isActive: true })
      .select('name label value subcategories')
      .sort({ order: 1 })
      .lean();
    
    // Agrupar productos por categoría y subcategoría
    const catalogData = [];
    
    for (const cat of categories) {
      const categoryProducts = products.filter(p => p.category === cat.value);
      
      if (categoryProducts.length === 0) continue;
      
      const subcategories = [];
      const subcategoryMap = new Map();
      
      for (const sub of cat.subcategories) {
        if (sub.isActive) {
          subcategoryMap.set(sub.value, {
            name: sub.name,
            label: sub.label,
            productos: []
          });
        }
      }
      
      for (const product of categoryProducts) {
        if (subcategoryMap.has(product.subcategory)) {
          const sub = subcategoryMap.get(product.subcategory);
          sub.productos.push({
            titulo: product.productName,
            marca: product.brandName,
            descripcion: product.description || `${product.brandName} - ${product.productName}`,
            precio: product.sellingPrice || product.price,
            codigo: product.codigo,
            stock: product.stock,
            imagen_url: product.productImage && product.productImage.length > 0 
              ? product.productImage[0] 
              : null
          });
        }
      }
      
      for (const sub of subcategoryMap.values()) {
        if (sub.productos.length > 0) {
          subcategories.push(sub);
        }
      }
      
      if (subcategories.length > 0) {
        catalogData.push({
          categoria: cat.name,
          subcategorias: subcategories
        });
      }
    }
    
    // Generar HTML con estilos mejorados
    console.log('Generando HTML con', catalogData.length, 'categorías');
    const htmlContent = generateHTMLContent(catalogData, title);
    console.log('HTML generado con longitud:', htmlContent.length);
    
    // Iniciar Puppeteer
    console.log('Iniciando Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar el contenido HTML
    console.log('Configurando contenido HTML...');
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    
    // Esperar a que las imágenes se carguen
    console.log('Esperando a que carguen las imágenes...');
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
            setTimeout(() => resolve(), 3000); // Timeout de 3 segundos por imagen
          }))
      );
    });
    
    // Generar PDF con configuración optimizada
    console.log('Generando PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '12mm',
        bottom: '15mm',
        left: '12mm'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 9px; text-align: center; width: 100%; color: #666; padding: 8px 0;">
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `
    });
    
    console.log('PDF generado con tamaño:', pdfBuffer.length, 'bytes');
    
    await browser.close();
    browser = null;
    
    // Configurar headers para descarga
    const fileName = `catalogo-${category || 'todos'}-${Date.now()}.pdf`;
    
    // Enviar el PDF directamente sin JSON
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Enviar el buffer directamente
    res.end(pdfBuffer);
    
    return; // Importante: retornar para no ejecutar más código
    
  } catch (error) {
    console.error('Error generando catálogo PDF:', error);
    console.error('Stack:', error.stack);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError);
      }
    }
    
    // Si la respuesta ya fue enviada, no intentar enviarla de nuevo
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al generar el catálogo PDF',
      error: error.message
    });
  }
};

// Función para generar el HTML con estilos profesionales
function generateHTMLContent(catalogData, title) {
  const currentDate = new Date().toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm 12mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .portada {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            page-break-after: always;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
        }
        
        .portada-logo {
            width: 200px;
            height: 200px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .portada-logo-text {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
        }
        
        .portada h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .portada-subtitle {
            font-size: 24px;
            margin-bottom: 40px;
            opacity: 0.9;
        }
        
        .portada-info {
            margin-top: 60px;
            font-size: 16px;
        }
        
        .portada-info p {
            margin: 10px 0;
        }
        
        .indice {
            page-break-after: always;
            padding: 40px 20px;
        }
        
        .indice h2 {
            font-size: 32px;
            color: #667eea;
            margin-bottom: 30px;
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        
        .indice-item {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .indice-categoria {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .indice-count {
            font-size: 14px;
            color: #666;
        }
        
        .categoria-section {
            page-break-before: always;
            margin-bottom: 40px;
        }
        
        .categoria-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px 20px;
            margin-bottom: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .categoria-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .subcategoria-header {
            background: #f8f9fa;
            padding: 15px;
            margin: 20px 0 15px 0;
            border-left: 5px solid #667eea;
            border-radius: 8px;
        }
        
        .subcategoria-title {
            font-size: 20px;
            font-weight: 600;
            color: #667eea;
        }
        
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .product-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            height: 340px;
        }
        
        .product-image-container {
            width: 100%;
            height: 140px;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 8px;
        }
        
        .product-image-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: #ccc;
        }
        
        .product-content {
            padding: 12px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        
        .product-brand {
            font-size: 10px;
            text-transform: uppercase;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        
        .product-title {
            font-size: 13px;
            font-weight: 600;
            color: #333;
            margin-bottom: 6px;
            line-height: 1.3;
            min-height: 33px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .product-description {
            font-size: 10px;
            color: #666;
            margin-bottom: 8px;
            line-height: 1.4;
            flex-grow: 1;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .product-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
            margin-top: auto;
        }
        
        .product-code {
            font-size: 9px;
            color: #999;
            font-family: 'Courier New', monospace;
        }
        
        .product-price {
            font-size: 16px;
            font-weight: 700;
            color: #667eea;
        }
        
        .product-price-label {
            font-size: 8px;
            color: #999;
            font-weight: normal;
            display: block;
        }
        
        .stock-badge {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 600;
            margin-top: 4px;
        }
        
        .stock-available {
            background: #d4edda;
            color: #155724;
        }
        
        .stock-low {
            background: #fff3cd;
            color: #856404;
        }
        
        .stock-out {
            background: #f8d7da;
            color: #721c24;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .categoria-section {
                page-break-before: always;
            }
            
            .product-card {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <!-- PORTADA -->
    <div class="portada">
        <div class="portada-logo">
            <div class="portada-logo-text">zenn</div>
        </div>
        <h1>${title}</h1>
        <div class="portada-subtitle">Electrónica y Tecnología</div>
        <div class="portada-info">
            <p><strong>Zenn Electrónica</strong></p>
            <p>info@zenn.com.py</p>
            <p>+595 21 123-4567</p>
            <p>Asunción, Paraguay</p>
            <p style="margin-top: 30px;">Generado el ${currentDate}</p>
        </div>
    </div>
    
    <!-- ÍNDICE -->
    <div class="indice">
        <h2>Índice de Productos</h2>
        ${catalogData.map(cat => {
          const totalProducts = cat.subcategorias.reduce((sum, sub) => sum + sub.productos.length, 0);
          return `
            <div class="indice-item">
                <div class="indice-categoria">${cat.categoria}</div>
                <div class="indice-count">${totalProducts} productos</div>
            </div>
          `;
        }).join('')}
    </div>
    
    <!-- CATÁLOGO DE PRODUCTOS -->
    ${catalogData.map(cat => `
        <div class="categoria-section">
            <div class="categoria-header">
                <h1 class="categoria-title">${cat.categoria}</h1>
            </div>
            
            ${cat.subcategorias.map(sub => `
                <div class="subcategoria-header">
                    <h2 class="subcategoria-title">${sub.label}</h2>
                </div>
                
                <div class="products-grid">
                    ${sub.productos.map(producto => {
                      const precio = Number(producto.precio);
                      const stock = producto.stock || 0;
                      const stockClass = stock > 10 ? 'stock-available' : stock > 0 ? 'stock-low' : 'stock-out';
                      const stockText = stock > 10 ? 'Disponible' : stock > 0 ? `Stock: ${stock}` : 'Agotado';
                      
                      return `
                        <div class="product-card">
                            <div class="product-image-container">
                                ${producto.imagen_url ? 
                                  `<img src="${producto.imagen_url}" alt="${producto.titulo}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                  <div class="product-image-placeholder" style="display:none;">📦</div>` :
                                  `<div class="product-image-placeholder">📦</div>`
                                }
                            </div>
                            <div class="product-content">
                                <div class="product-brand">${producto.marca}</div>
                                <h3 class="product-title">${producto.titulo}</h3>
                                <p class="product-description">${producto.descripcion.substring(0, 80)}${producto.descripcion.length > 80 ? '...' : ''}</p>
                                <div class="product-footer">
                                    <div>
                                        <div class="product-code">Código: ${producto.codigo || 'N/A'}</div>
                                        <span class="stock-badge ${stockClass}">${stockText}</span>
                                    </div>
                                    <div class="product-price">
                                        <span class="product-price-label">Precio</span>
                                        Gs. ${precio.toLocaleString('es-PY')}
                                    </div>
                                </div>
                            </div>
                        </div>
                      `;
                    }).join('')}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
  `;
}

module.exports = {
  generateCatalogPDF,
  getCatalogCategories,
  getCatalogProducts
};
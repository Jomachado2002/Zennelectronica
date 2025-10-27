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
    
    let filter = { stock: { $gt: 0 } }; // ✅ SOLO PRODUCTOS CON STOCK
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    }
    
    const products = await Product.find(filter)
      .select('productName brandName category subcategory productImage price sellingPrice codigo stock slug')
      .sort({ sellingPrice: 1, price: 1 }) // ✅ ORDENAR POR PRECIO DE MENOR A MAYOR
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
            precio: product.sellingPrice || product.price,
            codigo: product.codigo,
            stock: product.stock,
            imagen_url: product.productImage && product.productImage.length > 0 
              ? product.productImage[0] 
              : null,
            slug: product.slug,
            url: product.slug ? `https://zenn.com.py/producto/${product.slug}` : '#'
          });
        }
      }
      
      // ✅ ORDENAR PRODUCTOS POR PRECIO DENTRO DE CADA SUBCATEGORÍA
      for (const sub of subcategoryMap.values()) {
        if (sub.productos.length > 0) {
          sub.productos.sort((a, b) => a.precio - b.precio);
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

// Generar catálogo PDF optimizado - 9 productos por página
const generateCatalogPDF = async (req, res) => {
  let browser = null;
  
  try {
    const { category, subcategory, title = 'Catálogo de Productos' } = req.body;
    
    // Construir filtro de búsqueda
    let filter = { stock: { $gt: 0 } }; // ✅ SOLO PRODUCTOS CON STOCK
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    }
    
    // Obtener productos con filtros y SLUG
    const products = await Product.find(filter)
      .select('productName brandName category subcategory productImage price sellingPrice codigo stock slug')
      .sort({ sellingPrice: 1, price: 1 }) // ✅ ORDENAR POR PRECIO DE MENOR A MAYOR
      .lean();
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron productos con stock disponible'
      });
    }
    
    console.log(`✅ Encontrados ${products.length} productos con stock`);
    
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
            precio: product.sellingPrice || product.price,
            codigo: product.codigo,
            stock: product.stock,
            imagen_url: product.productImage && product.productImage.length > 0 
              ? product.productImage[0] 
              : null,
            slug: product.slug,
            url: product.slug ? `https://zenn.com.py/product/${product.slug}` : '#'
          });
        }
      }
      
      // ✅ ORDENAR PRODUCTOS POR PRECIO DENTRO DE CADA SUBCATEGORÍA
      for (const sub of subcategoryMap.values()) {
        if (sub.productos.length > 0) {
          sub.productos.sort((a, b) => a.precio - b.precio);
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
          }))
      );
    });
    
    // Generar PDF con configuración optimizada
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '8mm',
        bottom: '10mm',
        left: '8mm'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false, // Desactivar footer para reducir complejidad
      // Sin scale, usar tamaño normal pero con imágenes pequeñas
    });
    
    await browser.close();
    browser = null;
    
    console.log('✅ PDF generado exitosamente, tamaño:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    
    // Configurar headers para descarga
    const fileName = `catalogo-${category || 'todos'}-${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Enviar el buffer directamente
    res.write(pdfBuffer);
    res.end();
    
  } catch (error) {
    console.error('Error generando catálogo PDF:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError);
      }
    }
    
    // Solo enviar error si la respuesta no se envió aún
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error al generar el catálogo PDF',
        error: error.message
      });
    } else {
      console.error('No se puede enviar error porque la respuesta ya fue enviada');
    }
  }
};

// Función para generar el HTML - ✅ 9 PRODUCTOS POR PÁGINA (3x3)
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
            margin: 12mm 10mm;
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
        
        /* ===== PORTADA ===== */
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
            width: 180px;
            height: 180px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .portada-logo-text {
            font-size: 44px;
            font-weight: bold;
            color: #667eea;
        }
        
        .portada h1 {
            font-size: 44px;
            font-weight: 700;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .portada-subtitle {
            font-size: 22px;
            margin-bottom: 40px;
            opacity: 0.9;
        }
        
        .portada-info {
            margin-top: 60px;
            font-size: 15px;
        }
        
        .portada-info p {
            margin: 8px 0;
        }
        
        /* ===== ÍNDICE ===== */
        .indice {
            page-break-after: always;
            padding: 30px 20px;
        }
        
        .indice h2 {
            font-size: 30px;
            color: #667eea;
            margin-bottom: 25px;
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 12px;
        }
        
        .indice-item {
            background: #f8f9fa;
            padding: 12px;
            margin-bottom: 12px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .indice-categoria {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }
        
        .indice-count {
            font-size: 13px;
            color: #666;
        }
        
        /* ===== SECCIONES DE CATEGORÍA ===== */
        .categoria-section {
            page-break-before: always;
            margin-bottom: 30px;
        }
        
        .categoria-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 15px;
            margin-bottom: 18px;
            border-radius: 10px;
            text-align: center;
        }
        
        .categoria-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        
        .subcategoria-header {
            background: #f8f9fa;
            padding: 12px;
            margin: 15px 0 12px 0;
            border-left: 5px solid #667eea;
            border-radius: 6px;
        }
        
        .subcategoria-title {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
        }
        
        /* ===== GRID DE PRODUCTOS - 3x3 = 9 PRODUCTOS ===== */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }
        
        /* ===== TARJETA DE PRODUCTO - OPTIMIZADA PARA 9 POR PÁGINA ===== */
        .product-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            height: 305px;
            transition: all 0.3s ease;
        }
        
        .product-card:hover {
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        /* ===== IMAGEN DEL PRODUCTO CON LINK ===== */
        .product-image-link {
            display: block;
            width: 100%;
            height: 130px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
            text-decoration: none;
        }
        
        .product-image-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 8px;
            /* ✅ FORZAR IMÁGENES PEQUEÑAS */
            max-width: 150px;
            max-height: 150px;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        }
        
        .product-image-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #ccc;
        }
        
        /* ===== CONTENIDO DEL PRODUCTO ===== */
        .product-content {
            padding: 10px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        
        .product-brand {
            font-size: 9px;
            text-transform: uppercase;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        
        /* ===== TÍTULO CON HIPERVÍNCULO ===== */
        .product-title-link {
            text-decoration: none;
            color: #333;
            display: block;
            margin-bottom: 8px;
        }
        
        .product-title-link:hover {
            color: #667eea;
        }
        
        .product-title {
            font-size: 12px;
            font-weight: 600;
            color: inherit;
            line-height: 1.3;
            min-height: 45px;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        /* ===== FOOTER DEL PRODUCTO ===== */
        .product-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
            margin-top: auto;
        }
        
        .product-code {
            font-size: 8px;
            color: #999;
            font-family: 'Courier New', monospace;
        }
        
        .product-price {
            font-size: 15px;
            font-weight: 700;
            color: #667eea;
        }
        
        .product-price-label {
            font-size: 7px;
            color: #999;
            font-weight: normal;
            display: block;
        }
        
        .stock-badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: 600;
            margin-top: 3px;
            background: #d4edda;
            color: #155724;
        }
        
        /* ===== MEDIA PRINT ===== */
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
            
            a {
                color: inherit;
                text-decoration: none;
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
            <p>📧 info@zenn.com.py</p>
            <p>📱 +595 21 123-4567</p>
            <p>📍 Asunción, Paraguay</p>
            <p style="margin-top: 30px;">📅 ${currentDate}</p>
            <p style="margin-top: 15px; font-size: 13px; opacity: 0.8;">✅ Solo productos con stock disponible</p>
            <p style="font-size: 13px; opacity: 0.8;">💰 Ordenados por precio (menor a mayor)</p>
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
                <div class="indice-count">${totalProducts} productos disponibles</div>
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
                    <h2 class="subcategoria-title">${sub.label} (${sub.productos.length} productos)</h2>
                </div>
                
                <div class="products-grid">
                    ${sub.productos.map(producto => {
                      const precio = Number(producto.precio);
                      const stock = producto.stock || 0;
                      const productUrl = producto.url || '#';
                      
                      return `
                        <div class="product-card">
                            <!-- IMAGEN CON LINK -->
                            <a href="${productUrl}" class="product-image-link" target="_blank">
                                <div class="product-image-container">
                                    ${producto.imagen_url ? 
                                      `<img src="${producto.imagen_url}" alt="${producto.titulo}" class="product-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'>📦</div>';">` :
                                      `<div class="product-image-placeholder">📦</div>`
                                    }
                                </div>
                            </a>
                            
                            <div class="product-content">
                                <div class="product-brand">${producto.marca}</div>
                                
                                <!-- TÍTULO CON LINK -->
                                <a href="${productUrl}" class="product-title-link" target="_blank">
                                    <h3 class="product-title">${producto.titulo}</h3>
                                </a>
                                
                                <div class="product-footer">
                                    <div>
                                        <div class="product-code">Cód: ${producto.codigo || 'N/A'}</div>
                                        <span class="stock-badge">Stock: ${stock}</span>
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
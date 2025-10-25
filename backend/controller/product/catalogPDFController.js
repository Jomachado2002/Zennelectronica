const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const svgToPdfkit = require('svg-to-pdfkit');

// Generar catálogo PDF
const generateCatalogPDF = async (req, res) => {
  try {
    console.log('🚀 Iniciando generación de PDF...');
    console.log('📊 Datos recibidos:', {
      catalogDataLength: req.body.catalogData?.length || 0,
      companyName: req.body.companyName
    });
    const { catalogData, companyName = 'Zenn Electrónica' } = req.body;
    
    if (!catalogData || !Array.isArray(catalogData)) {
      return res.status(400).json({
        success: false,
        message: 'Datos del catálogo requeridos'
      });
    }
    
    // Crear documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Catálogo de Productos',
        Author: companyName,
        Subject: 'Catálogo de productos electrónicos',
        Creator: 'Zenn Electrónica - Sistema de Gestión'
      }
    });
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="catalogo-productos-${new Date().toISOString().split('T')[0]}.pdf"`);
    
    // Pipe del documento a la respuesta
    doc.pipe(res);
    
    // Variables para control de páginas
    let currentPage = 1;
    const pageNumbers = new Map(); // Para el índice
    
    // Función para agregar marca de agua
    const addWatermark = () => {
      doc.save();
      doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.opacity(0.08);
      doc.fontSize(80)
         .fillColor('#e5e7eb')
         .text('ZENN', doc.page.width / 2 - 120, doc.page.height / 2 - 40);
      
      // Agregar texto adicional de marca de agua
      doc.fontSize(24)
         .fillColor('#f3f4f6')
         .text('ELECTRÓNICA', doc.page.width / 2 - 80, doc.page.height / 2 + 20);
      
      doc.restore();
    };
    
    // Función para agregar header de página
    const addPageHeader = (title) => {
      doc.fontSize(8)
         .fillColor('#666666')
         .text(companyName, 50, 20)
         .text(title, doc.page.width / 2 - 50, 20, { align: 'center' })
         .text(`Página ${currentPage}`, doc.page.width - 100, 20, { align: 'right' });
      
      // Línea separadora
      doc.moveTo(50, 35)
         .lineTo(doc.page.width - 50, 35)
         .stroke('#cccccc');
    };
    
    // Función para agregar footer
    const addPageFooter = () => {
      const footerY = doc.page.height - 30;
      doc.fontSize(8)
         .fillColor('#666666')
         .text(`© ${new Date().getFullYear()} ${companyName}`, 50, footerY)
         .text(`Generado el ${new Date().toLocaleDateString('es-PY')}`, doc.page.width / 2 - 50, footerY, { align: 'center' })
         .text(`Página ${currentPage}`, doc.page.width - 100, footerY, { align: 'right' });
    };
    
    // ===== PORTADA =====
    doc.addPage();
    addWatermark();
    
    // Logo PNG (más confiable que SVG)
    const logoPath = path.join(__dirname, '../../../frontend/public/logozenn.png');
    let logoAdded = false;
    
    console.log('🎨 Agregando logo...');
    
    if (fs.existsSync(logoPath)) {
      try {
        // Agregar imagen PNG como logo
        doc.image(logoPath, doc.page.width / 2 - 100, 80, {
          width: 200,
          height: 100,
          align: 'center'
        });
        logoAdded = true;
        console.log('✅ Logo PNG cargado exitosamente');
      } catch (imageError) {
        console.log('⚠️ Error cargando PNG, usando texto como fallback:', imageError.message);
      }
    } else {
      console.log('⚠️ Archivo PNG no encontrado en:', logoPath);
    }
    
    if (!logoAdded) {
      // Fallback: Logo en texto estilizado
      doc.fontSize(48)
         .fillColor('#2563eb')
         .text('ZENN', doc.page.width / 2 - 80, 150, { align: 'center' });

      // Agregar un rectángulo decorativo debajo del texto
      doc.rect(doc.page.width / 2 - 100, 200, 200, 4)
         .fill('#2563eb');
      
      console.log('✅ Logo de texto agregado como fallback');
    }
    
    // Título principal con mejor diseño
    doc.fontSize(42)
       .fillColor('#1f2937')
       .text('Catálogo de Productos', doc.page.width / 2 - 180, 200, { align: 'center' });
    
    // Subtítulo
    doc.fontSize(24)
       .fillColor('#6b7280')
       .text('Electrónica y Tecnología', doc.page.width / 2 - 120, 250, { align: 'center' });
    
    // Línea decorativa más elegante
    doc.moveTo(doc.page.width / 2 - 200, 280)
       .lineTo(doc.page.width / 2 + 200, 280)
       .stroke('#2563eb', 3);
    
    // Fecha de generación con mejor formato
    doc.fontSize(18)
       .fillColor('#9ca3af')
       .text(`Generado el ${new Date().toLocaleDateString('es-PY', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, doc.page.width / 2 - 120, 320, { align: 'center' });
    
    // Información de contacto con mejor diseño
    doc.fontSize(16)
       .fillColor('#374151')
       .text('📧 info@zenn.com.py', doc.page.width / 2 - 80, 400, { align: 'center' })
       .text('📞 +595 21 123-4567', doc.page.width / 2 - 80, 425, { align: 'center' })
       .text('📍 Asunción, Paraguay', doc.page.width / 2 - 80, 450, { align: 'center' });
    
    // Borde decorativo más elegante
    doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
       .stroke('#e5e7eb', 2);
    
    // Esquinas decorativas
    const cornerSize = 20;
    doc.rect(40, 40, cornerSize, cornerSize).fill('#2563eb');
    doc.rect(doc.page.width - 60, 40, cornerSize, cornerSize).fill('#2563eb');
    doc.rect(40, doc.page.height - 60, cornerSize, cornerSize).fill('#2563eb');
    doc.rect(doc.page.width - 60, doc.page.height - 60, cornerSize, cornerSize).fill('#2563eb');
    
    currentPage++;
    
    // ===== ÍNDICE =====
    doc.addPage();
    addWatermark();
    addPageHeader('Índice');
    
    doc.fontSize(24)
       .fillColor('#1f2937')
       .text('Índice', 50, 80);
    
    doc.fontSize(12)
       .fillColor('#374151');
    
    let indexY = 120;
    const lineHeight = 20;
    
    // Generar índice
    for (const category of catalogData) {
      // Guardar número de página para esta categoría
      pageNumbers.set(category.categoria, currentPage);
      
      // Categoría principal
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text(category.categoria, 50, indexY);
      
      // Número de página
      doc.text(`pág. ${currentPage}`, doc.page.width - 100, indexY, { align: 'right' });
      
      indexY += lineHeight;
      
      // Subcategorías
      for (const subcategory of category.subcategorias) {
        doc.fontSize(12)
           .fillColor('#6b7280')
           .text(`  - ${subcategory.name}`, 70, indexY);
        
        // Número de página para subcategoría (misma página que la categoría)
        doc.text(`pág. ${currentPage}`, doc.page.width - 100, indexY, { align: 'right' });
        
        indexY += lineHeight - 5;
        
        // Verificar si necesitamos nueva página
        if (indexY > doc.page.height - 100) {
          doc.addPage();
          addWatermark();
          addPageHeader('Índice (continuación)');
          indexY = 80;
        }
      }
      
      indexY += 10; // Espacio entre categorías
    }
    
    addPageFooter();
    currentPage++;
    
    // ===== CONTENIDO POR CATEGORÍAS =====
    for (const category of catalogData) {
      // Página de categoría
      doc.addPage();
      addWatermark();
      addPageHeader(category.categoria);
      
      // Título de categoría
      doc.fontSize(28)
         .fillColor('#1f2937')
         .text(category.categoria, 50, 80);
      
      // Línea decorativa
      doc.moveTo(50, 120)
         .lineTo(200, 120)
         .stroke('#2563eb', 3);
      
      let contentY = 140;
      
      // Procesar subcategorías
      for (const subcategory of category.subcategorias) {
        // Título de subcategoría
        doc.fontSize(20)
           .fillColor('#374151')
           .text(subcategory.name, 50, contentY);
        
        contentY += 30;
        
        // Procesar productos
        for (let i = 0; i < subcategory.productos.length; i++) {
          const product = subcategory.productos[i];
          
          // Verificar si necesitamos nueva página
          if (contentY > doc.page.height - 200) {
            doc.addPage();
            addWatermark();
            addPageHeader(category.categoria);
            contentY = 80;
          }
          
          // Número de producto
          doc.fontSize(14)
             .fillColor('#2563eb')
             .text(`${i + 1}.`, 50, contentY);
          
          // Nombre del producto
          doc.fontSize(16)
             .fillColor('#1f2937')
             .text(product.titulo, 80, contentY);
          
          contentY += 25;
          
          // Código del producto
          if (product.codigo) {
            doc.fontSize(10)
               .fillColor('#6b7280')
               .text(`Código: ${product.codigo}`, 80, contentY);
            contentY += 15;
          }
          
          // Descripción
          if (product.descripcion) {
            doc.fontSize(12)
               .fillColor('#374151')
               .text(product.descripcion, 80, contentY, {
                 width: doc.page.width - 150,
                 align: 'left'
               });
            contentY += 20;
          }
          
          // Precio destacado
          doc.fontSize(18)
             .fillColor('#059669')
             .text(`Gs. ${product.precio.toLocaleString('es-PY')}`, 80, contentY);
          
          contentY += 30;
          
          // Línea separadora entre productos
          if (i < subcategory.productos.length - 1) {
            doc.moveTo(50, contentY)
               .lineTo(doc.page.width - 50, contentY)
               .stroke('#e5e7eb');
            contentY += 20;
          }
        }
        
        contentY += 20; // Espacio entre subcategorías
      }
      
      addPageFooter();
      currentPage++;
    }
    
    // Finalizar documento
    doc.end();
    
  } catch (error) {
    console.error('❌ Error generando catálogo PDF:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Si la respuesta ya fue enviada, no intentar enviar otra
    if (res.headersSent) {
      console.error('❌ Headers ya enviados, no se puede enviar respuesta de error');
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: true,
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

module.exports = {
  generateCatalogPDF
};

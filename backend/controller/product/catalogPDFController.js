const PDFDocument = require('pdfkit');

// Generar catálogo PDF - Versión simplificada y elegante
const generateCatalogPDF = async (req, res) => {
  try {
    console.log('🚀 Iniciando generación de PDF simplificado...');
    
    const { catalogData, companyName = 'Zenn Electrónica' } = req.body;
    
    if (!catalogData || !Array.isArray(catalogData)) {
      return res.status(400).json({
        success: false,
        message: 'Datos del catálogo requeridos'
      });
    }

    if (catalogData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay productos para generar el catálogo'
      });
    }

    console.log('✅ Validaciones pasadas, creando PDF elegante...');
    
    // Crear documento PDF con configuración optimizada
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Catálogo de Productos - ${companyName}`,
        Author: companyName,
        Subject: 'Catálogo de productos electrónicos',
        Creator: 'Zenn Electrónica - Sistema de Gestión'
      }
    });
    
    // Configurar headers para descarga directa
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="catalogo-${companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf"`);
    
    // Pipe del documento a la respuesta
    doc.pipe(res);
    
    // Variables para control de páginas
    let currentPage = 1;
    const pageNumbers = new Map(); // Para el índice
    
    // Función para agregar header elegante
    const addPageHeader = (title = '') => {
      // Header con fondo elegante
      doc.rect(0, 0, doc.page.width, 50)
         .fill('#2563eb');
      
      // Título de la empresa
      doc.fontSize(16)
         .fillColor('#ffffff')
         .text(companyName, 40, 15);
      
      // Título de la página
      if (title) {
        doc.fontSize(14)
           .fillColor('#ffffff')
           .text(title, doc.page.width / 2 - 100, 15, { align: 'center' });
      }
      
      // Número de página
      doc.fontSize(12)
         .fillColor('#ffffff')
         .text(`Página ${currentPage}`, doc.page.width - 80, 15, { align: 'right' });
    };
    
    // Función para agregar footer elegante
    const addPageFooter = () => {
      const footerY = doc.page.height - 30;
      
      // Línea separadora
      doc.moveTo(40, footerY - 10)
         .lineTo(doc.page.width - 40, footerY - 10)
         .stroke('#e5e7eb');
      
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text(`© ${new Date().getFullYear()} ${companyName}`, 40, footerY)
         .text(`Generado el ${new Date().toLocaleDateString('es-PY')}`, doc.page.width / 2 - 50, footerY, { align: 'center' })
         .text(`Página ${currentPage}`, doc.page.width - 80, footerY, { align: 'right' });
    };
    
    // ===== PORTADA ELEGANTE =====
    console.log('📄 Creando portada elegante...');
    doc.addPage();
    addPageHeader('Catálogo de Productos');
    
    // Título principal elegante
    doc.fontSize(36)
       .fillColor('#1f2937')
       .text('Catálogo de Productos', doc.page.width / 2 - 150, 100, { align: 'center' });
    
    // Subtítulo
    doc.fontSize(20)
       .fillColor('#6b7280')
       .text('Electrónica y Tecnología', doc.page.width / 2 - 100, 140, { align: 'center' });
    
    // Línea decorativa
    doc.moveTo(doc.page.width / 2 - 150, 170)
       .lineTo(doc.page.width / 2 + 150, 170)
       .stroke('#2563eb', 3);
    
    // Fecha de generación
    doc.fontSize(16)
       .fillColor('#9ca3af')
       .text(`Generado el ${new Date().toLocaleDateString('es-PY')}`, doc.page.width / 2 - 80, 200, { align: 'center' });
    
    // Información de contacto
    doc.fontSize(14)
       .fillColor('#374151')
       .text('📧 info@zenn.com.py', doc.page.width / 2 - 60, 250, { align: 'center' })
       .text('📞 +595 21 123-4567', doc.page.width / 2 - 60, 270, { align: 'center' })
       .text('📍 Asunción, Paraguay', doc.page.width / 2 - 60, 290, { align: 'center' });
    
    addPageFooter();
    currentPage++;
    
    // ===== ÍNDICE ELEGANTE =====
    console.log('📚 Creando índice elegante...');
    doc.addPage();
    addPageHeader('Índice');
    
    doc.fontSize(24)
       .fillColor('#1f2937')
       .text('Índice de Categorías', 50, 80);
    
    let indexY = 120;
    const lineHeight = 25;
    
    // Generar índice elegante
    for (const category of catalogData) {
      // Guardar número de página para esta categoría
      pageNumbers.set(category.categoria, currentPage);
      
      // Categoría principal con estilo elegante
      doc.fontSize(16)
         .fillColor('#1f2937')
         .text(category.categoria, 50, indexY);
      
      // Número de página
      doc.fontSize(12)
         .fillColor('#2563eb')
         .text(`Página ${currentPage}`, doc.page.width - 100, indexY, { align: 'right' });
      
      indexY += lineHeight;
      
      // Subcategorías con indentación
      for (const subcategory of category.subcategorias || []) {
        doc.fontSize(14)
           .fillColor('#6b7280')
           .text(`• ${subcategory.name}`, 70, indexY);
        
        indexY += lineHeight - 5;
        
        // Verificar si necesitamos nueva página
        if (indexY > doc.page.height - 100) {
          doc.addPage();
          addPageHeader('Índice (continuación)');
          indexY = 80;
        }
      }
      
      indexY += 15; // Espacio entre categorías
    }
    
    addPageFooter();
    currentPage++;
    
    // ===== CONTENIDO CON TABLAS ELEGANTES =====
    console.log('📚 Creando contenido con tablas elegantes...');
    
    for (const category of catalogData) {
      console.log(`📁 Procesando categoría: ${category.categoria}`);
      
      // Página de categoría
      doc.addPage();
      addPageHeader(category.categoria);
      
      // Título de categoría elegante
      doc.fontSize(24)
         .fillColor('#1f2937')
         .text(category.categoria, 50, 80);
      
      // Línea decorativa
      doc.moveTo(50, 110)
         .lineTo(200, 110)
         .stroke('#2563eb', 3);
      
      let contentY = 130;
      
      // Procesar subcategorías con tablas elegantes
      for (const subcategory of category.subcategorias || []) {
        console.log(`📂 Procesando subcategoría: ${subcategory.name}`);
        
        // Verificar si necesitamos nueva página
        if (contentY > doc.page.height - 200) {
          doc.addPage();
          addPageHeader(category.categoria);
          contentY = 80;
        }
        
        // Título de subcategoría
        doc.fontSize(18)
           .fillColor('#374151')
           .text(subcategory.name, 50, contentY);
        
        contentY += 30;
        
        // Crear tabla elegante para productos
        const products = subcategory.productos || [];
        if (products.length > 0) {
          // Header de la tabla
          const tableY = contentY;
          const colWidths = [60, 200, 100, 80]; // Número, Producto, Código, Precio
          const rowHeight = 25;
          
          // Fondo del header
          doc.rect(50, tableY, doc.page.width - 100, rowHeight)
             .fill('#f8fafc');
          
          // Bordes del header
          doc.rect(50, tableY, doc.page.width - 100, rowHeight)
             .stroke('#e5e7eb');
          
          // Texto del header
          doc.fontSize(12)
             .fillColor('#374151');
          
          let x = 55;
          doc.text('N°', x, tableY + 8);
          x += colWidths[0];
          doc.text('Producto', x, tableY + 8);
          x += colWidths[1];
          doc.text('Código', x, tableY + 8);
          x += colWidths[2];
          doc.text('Precio', x, tableY + 8);
          
          contentY += rowHeight;
          
          // Filas de productos
          for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Verificar si necesitamos nueva página
            if (contentY > doc.page.height - 100) {
              doc.addPage();
              addPageHeader(category.categoria);
              contentY = 80;
              
              // Recrear header de tabla en nueva página
              doc.rect(50, contentY, doc.page.width - 100, rowHeight)
                 .fill('#f8fafc');
              doc.rect(50, contentY, doc.page.width - 100, rowHeight)
                 .stroke('#e5e7eb');
              
              doc.fontSize(12)
                 .fillColor('#374151');
              
              let x = 55;
              doc.text('N°', x, contentY + 8);
              x += colWidths[0];
              doc.text('Producto', x, contentY + 8);
              x += colWidths[1];
              doc.text('Código', x, contentY + 8);
              x += colWidths[2];
              doc.text('Precio', x, contentY + 8);
              
              contentY += rowHeight;
            }
            
            // Fondo alternado para filas
            if (i % 2 === 0) {
              doc.rect(50, contentY, doc.page.width - 100, rowHeight)
                 .fill('#f9fafb');
            }
            
            // Bordes de la fila
            doc.rect(50, contentY, doc.page.width - 100, rowHeight)
               .stroke('#e5e7eb');
            
            // Contenido de la fila
            doc.fontSize(10)
               .fillColor('#1f2937');
            
            let x = 55;
            doc.text(`${i + 1}`, x, contentY + 8);
            x += colWidths[0];
            doc.text(product.titulo || 'Sin título', x, contentY + 8, { width: colWidths[1] - 10 });
            x += colWidths[1];
            doc.text(product.codigo || '-', x, contentY + 8, { width: colWidths[2] - 10 });
            x += colWidths[2];
            doc.text(`Gs. ${(product.precio || 0).toLocaleString('es-PY')}`, x, contentY + 8, { width: colWidths[3] - 10 });
            
            contentY += rowHeight;
          }
          
          contentY += 20; // Espacio después de la tabla
        }
      }
      
      addPageFooter();
      currentPage++;
      console.log(`✅ Categoría ${category.categoria} procesada exitosamente`);
    }
    
    // Finalizar documento
    console.log('🏁 Finalizando documento PDF...');
    doc.end();
    console.log('✅ Documento PDF finalizado exitosamente');
    
  } catch (error) {
    console.error('❌ Error generando catálogo PDF:', error);
    
    // Si la respuesta ya fue enviada, no intentar enviar otra
    if (res.headersSent) {
      console.error('❌ Headers ya enviados, no se puede enviar respuesta de error');
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error generando el catálogo PDF',
      error: true,
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

module.exports = {
  generateCatalogPDF
};

// backend/controller/budget/budgetController.js - VERSIÓN CORREGIDA PARA VERCEL
const BudgetModel = require('../../models/budgetModel');
const ClientModel = require('../../models/clientModel');
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const os = require('os');

/**
 * Crea un nuevo presupuesto
 */
async function createBudgetController(req, res) {
  try {
      // COMENTADO TEMPORALMENTE para permitir acceso
      // if (!uploadProductPermission(req.userId)) {
      //     throw new Error("Permiso denegado");
      // }

      const { 
          clientId,
          items,
          totalAmount,
          discount,
          tax,
          finalAmount,
          notes,
          validUntil,
          paymentTerms,
          deliveryMethod
      } = req.body;

      // Validar cliente
      if (!clientId) {
          throw new Error("ID de cliente no proporcionado");
      }

      const client = await ClientModel.findById(clientId);
      if (!client) {
          throw new Error("Cliente no encontrado");
      }

      // Validar items
      if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error("El presupuesto debe contener al menos un producto");
      }

      // Procesar y validar cada item
      const processedItems = [];
      for (const item of items) {
          if (!item.product && !item.productSnapshot) {
              throw new Error("Cada item debe contener un producto o un snapshot");
          }

          if (item.product) {
              const product = await ProductModel.findById(item.product);
              if (!product) {
                  throw new Error(`Producto no encontrado: ${item.product}`);
              }

              // Calcular subtotal
              const quantity = Number(item.quantity) || 1;
              const unitPrice = Number(item.unitPrice) || product.sellingPrice;
              const itemDiscount = Number(item.discount) || 0;
              const subtotal = quantity * unitPrice * (1 - itemDiscount / 100);

              processedItems.push({
                  product: product._id,
                  productSnapshot: {
                      name: product.productName,
                      price: product.sellingPrice,
                      description: product.description,
                      category: product.category,
                      subcategory: product.subcategory,
                      brandName: product.brandName
                  },
                  quantity,
                  unitPrice,
                  discount: itemDiscount,
                  subtotal
              });
          } else {
              // Si ya viene un snapshot, validamos que tenga lo necesario
              if (!item.productSnapshot.name || !item.quantity || !item.unitPrice) {
                  throw new Error("Los datos del producto personalizado son incompletos");
              }

              const quantity = Number(item.quantity) || 1;
              const unitPrice = Number(item.unitPrice);
              const itemDiscount = Number(item.discount) || 0;
              const subtotal = quantity * unitPrice * (1 - itemDiscount / 100);

              processedItems.push({
                  productSnapshot: item.productSnapshot,
                  quantity,
                  unitPrice,
                  discount: itemDiscount,
                  subtotal
              });
          }
      }

      // Calcular importes totales
      const calculatedTotalAmount = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const calculatedDiscount = Number(discount) || 0;
      const calculatedTax = Number(tax) || 0;
      const calculatedFinalAmount = calculatedTotalAmount * (1 - calculatedDiscount / 100) * (1 + calculatedTax / 100);

      // Generar número de presupuesto temporal que será reemplazado por el hook pre('save')
      const tempBudgetNumber = await generateNextBudgetNumber();

      // Crear nuevo presupuesto
      const newBudget = new BudgetModel({
          budgetNumber: tempBudgetNumber, // Asignamos un número temporal
          client: clientId,
          items: processedItems,
          totalAmount: calculatedTotalAmount,
          discount: calculatedDiscount,
          tax: calculatedTax,
          finalAmount: calculatedFinalAmount,
          notes,
          validUntil: validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días por defecto
          paymentTerms,
          deliveryMethod,
          createdBy: req.userId || 'guest-user' // Permitir usuarios invitados
      });

      const savedBudget = await newBudget.save();

      // Asociar presupuesto al cliente
      await ClientModel.findByIdAndUpdate(
          clientId,
          { $push: { budgets: savedBudget._id } }
      );

      res.status(201).json({
          message: "Presupuesto creado correctamente",
          data: savedBudget,
          success: true,
          error: false
      });

  } catch (err) {
      console.error("Error en createBudgetController:", err);
      res.status(400).json({
          message: err.message || err,
          error: true,
          success: false
      });
  }
}

// Función auxiliar para generar el siguiente número de presupuesto
async function generateNextBudgetNumber() {
  try {
      const lastBudget = await BudgetModel.findOne({}, {}, { sort: { 'createdAt': -1 } });
      
      if (lastBudget && lastBudget.budgetNumber) {
          // Extraer la parte numérica del último presupuesto
          const lastNumber = parseInt(lastBudget.budgetNumber.split('-')[1]);
          return `PRES-${(lastNumber + 1).toString().padStart(5, '0')}`;
      } else {
          // Primer presupuesto
          return 'PRES-00001';
      }
  } catch (error) {
      console.error("Error al generar número de presupuesto:", error);
      // En caso de error, generamos un número basado en timestamp para evitar duplicados
      return `PRES-${Date.now().toString().slice(-5)}`;
  }
}

/**
 * Obtiene todos los presupuestos
 */
async function getAllBudgetsController(req, res) {
    try {
        // COMENTADO TEMPORALMENTE para permitir acceso
        // if (!uploadProductPermission(req.userId)) {
        //     throw new Error("Permiso denegado");
        // }

        const { 
            clientId, 
            status, 
            startDate, 
            endDate, 
            minAmount, 
            maxAmount,
            limit = 50, 
            page = 1, 
            sortBy = 'createdAt', 
            sortOrder = 'desc' 
        } = req.query;
        
        // Construir query
        const query = {};
        
        if (clientId) query.client = clientId;
        if (status) query.status = status;
        
        // Filtro por fecha
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        // Filtro por monto
        if (minAmount || maxAmount) {
            query.finalAmount = {};
            if (minAmount) query.finalAmount.$gte = Number(minAmount);
            if (maxAmount) query.finalAmount.$lte = Number(maxAmount);
        }
        
        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        
        // Paginación
        const skip = (page - 1) * limit;
        
        // Ejecutar la consulta
        const budgets = await BudgetModel.find(query)
            .select('budgetNumber client items totalAmount discount tax finalAmount status validUntil createdAt')
            .populate('client', 'name email phone company')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));
            
        // Contar total de presupuestos para paginación
        const total = await BudgetModel.countDocuments(query);
        
        res.json({
            message: "Lista de presupuestos",
            data: {
                budgets,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / limit)
                }
            },
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getAllBudgetsController:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Obtiene un presupuesto por su ID
 */
async function getBudgetByIdController(req, res) {
    try {
        // COMENTADO TEMPORALMENTE para permitir acceso
        // if (!uploadProductPermission(req.userId)) {
        //     throw new Error("Permiso denegado");
        // }

        const { budgetId } = req.params;

        if (!budgetId) {
            throw new Error("ID de presupuesto no proporcionado");
        }

        const budget = await BudgetModel.findById(budgetId)
            .populate('client', 'name email phone company address taxId')
            .populate('items.product', 'productName brandName category subcategory sellingPrice');

        if (!budget) {
            throw new Error("Presupuesto no encontrado");
        }

        res.json({
            message: "Detalles del presupuesto",
            data: budget,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getBudgetByIdController:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Actualiza el estado de un presupuesto
 */
async function updateBudgetStatusController(req, res) {
  try {
      const { budgetId } = req.params;
      const { status } = req.body;

      if (!budgetId) {
          throw new Error("ID de presupuesto no proporcionado");
      }

      // Verifica que el estado sea válido
      if (!['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].includes(status)) {
          throw new Error("Estado de presupuesto no válido");
      }

      console.log(`Actualizando presupuesto ${budgetId} a estado ${status}`);

      const budget = await BudgetModel.findById(budgetId);
      
      if (!budget) {
          throw new Error("Presupuesto no encontrado");
      }

      budget.status = status;
      
      // Si el estado es expired, pero la fecha de validez aún no ha llegado, actualizarla
      if (status === 'expired' && budget.validUntil > new Date()) {
          budget.validUntil = new Date();
      }

      const updatedBudget = await budget.save();

      res.json({
          message: `Estado del presupuesto actualizado a ${status}`,
          data: updatedBudget,
          success: true,
          error: false
      });

  } catch (err) {
      console.error("Error en updateBudgetStatusController:", err);
      res.status(400).json({
          message: err.message || err,
          error: true,
          success: false
      });
  }
}

/**
 * Elimina un presupuesto
 */
async function deleteBudgetController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { budgetId } = req.params;

        if (!budgetId) {
            throw new Error("ID de presupuesto no proporcionado");
        }

        // Buscar el presupuesto primero para verificar si existe
        const budget = await BudgetModel.findById(budgetId);
        if (!budget) {
            throw new Error("Presupuesto no encontrado");
        }

        // Eliminar la referencia del presupuesto en el cliente
        if (budget.client) {
            await ClientModel.findByIdAndUpdate(
                budget.client,
                { $pull: { budgets: budgetId } }
            );
        }

        // Eliminar el presupuesto
        await BudgetModel.findByIdAndDelete(budgetId);

        res.json({
            message: "Presupuesto eliminado correctamente",
            success: true,
            error: false
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Genera el PDF de un presupuesto en memoria (sin escribir a disco)
 */
async function generateBudgetPDF(budgetId) {
  try {
    const budget = await BudgetModel.findById(budgetId)
      .populate('client', 'name email phone company address taxId')
      .populate('createdBy', 'name email');
    
    if (!budget) {
      throw new Error("Presupuesto no encontrado");
    }

    // Crear un documento PDF en memoria
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const chunks = [];
    
    // Capturar el PDF en memoria
    doc.on('data', chunk => chunks.push(chunk));
    
    // Configuración de fuentes y colores
    const primaryColor = '#0047AB';
    const secondaryColor = '#333333';
    const accentColor = '#4682B4';
    
    // ----- ENCABEZADO DEL DOCUMENTO -----
    
    // Título del documento
    doc.fontSize(22).fillColor(primaryColor).text('PRESUPUESTO', 250, 60, { align: 'right' });
    doc.fontSize(14).fillColor(secondaryColor).text(`Nº ${budget.budgetNumber}`, 250, 85, { align: 'right' });
    
    // Línea divisoria
    doc.strokeColor(accentColor)
       .lineWidth(1)
       .moveTo(50, 120)
       .lineTo(550, 120)
       .stroke();
    
    // ----- INFORMACIÓN DE CABECERA -----
    
    // Información de la empresa - columna izquierda
    doc.fontSize(12).fillColor(primaryColor).text('DATOS DE LA EMPRESA', 50, 140);
    doc.fontSize(9).fillColor(secondaryColor);
    doc.text('Zenn EAS', 50, 160);
    doc.text('Avda Mariscal Lopez casi Libertad Paseo Dylan 2do Piso', 50, 175, { width: 200 });
    doc.text('Teléfono: +595 984 133 733', 50, 200);
    doc.text('Email: ventas@zenn.com.py', 50, 215);
    doc.text('RUC: 80136342-0', 50, 230);
    
    // Información del cliente - columna derecha
    doc.fontSize(12).fillColor(primaryColor).text('CLIENTE', 350, 140);
    doc.fontSize(9).fillColor(secondaryColor);
    
    let clientYPos = 160;
    if (budget.client) {
      doc.text(`${budget.client.name}`, 350, clientYPos, { width: 200 });
      clientYPos += 15;
      
      if (budget.client.company) {
        doc.text(`${budget.client.company}`, 350, clientYPos, { width: 200 });
        clientYPos += 15;
      }
      
      // Manejo seguro de la dirección
      if (budget.client.address) {
        if (typeof budget.client.address === 'object') {
          const { street, city, state, zip, country } = budget.client.address;
          if (street) {
            doc.text(street, 350, clientYPos, { width: 200 });
            clientYPos += 15;
          }
          
          let locationLine = '';
          if (city) locationLine += city;
          if (state) locationLine += locationLine ? `, ${state}` : state;
          if (zip) locationLine += locationLine ? ` ${zip}` : zip;
          
          if (locationLine) {
            doc.text(locationLine, 350, clientYPos, { width: 200 });
            clientYPos += 15;
          }
          
          if (country) {
            doc.text(country, 350, clientYPos, { width: 200 });
            clientYPos += 15;
          }
        } else {
          doc.text(budget.client.address, 350, clientYPos, { width: 200 });
          clientYPos += 15;
        }
      }
      
      if (budget.client.phone) {
        doc.text(`Teléfono: ${budget.client.phone}`, 350, clientYPos, { width: 200 });
        clientYPos += 15;
      }
      
      if (budget.client.email) {
        doc.text(`Email: ${budget.client.email}`, 350, clientYPos, { width: 200 });
        clientYPos += 15;
      }
      
      if (budget.client.taxId) {
        doc.text(`RUC/CI: ${budget.client.taxId}`, 350, clientYPos, { width: 200 });
        clientYPos += 15;
      }
    } else {
      doc.text('Cliente no especificado', 350, clientYPos);
    }
    
    // ----- INFORMACIÓN DEL PRESUPUESTO -----
    
    const infoY = Math.max(clientYPos + 20, 260);
    doc.strokeColor(accentColor)
       .lineWidth(0.5)
       .moveTo(50, infoY)
       .lineTo(550, infoY)
       .stroke();
       
    const infoStartY = infoY + 20;
    
    // Columna 1
    doc.fontSize(9).fillColor(primaryColor).text('Fecha:', 50, infoStartY);
    doc.fontSize(9).fillColor(secondaryColor).text(`${new Date(budget.createdAt).toLocaleDateString()}`, 120, infoStartY);
    
    doc.fontSize(9).fillColor(primaryColor).text('Estado:', 50, infoStartY + 20);
    doc.fontSize(9).fillColor(secondaryColor).text(`${budget.status.toUpperCase()}`, 120, infoStartY + 20);
    
    // Columna 2
    doc.fontSize(9).fillColor(primaryColor).text('Válido hasta:', 300, infoStartY);
    doc.fontSize(9).fillColor(secondaryColor).text(`${new Date(budget.validUntil).toLocaleDateString()}`, 370, infoStartY);
    
    if (budget.paymentTerms) {
      doc.fontSize(9).fillColor(primaryColor).text('Condiciones:', 300, infoStartY + 20);
      doc.fontSize(9).fillColor(secondaryColor).text(`${budget.paymentTerms}`, 370, infoStartY + 20, { width: 180 });
    }
    
    if (budget.deliveryMethod) {
      doc.fontSize(9).fillColor(primaryColor).text('Entrega:', 300, infoStartY + 40);
      doc.fontSize(9).fillColor(secondaryColor).text(`${budget.deliveryMethod}`, 370, infoStartY + 40, { width: 180 });
    }
    
    // ----- TABLA DE PRODUCTOS -----
    
    const tableStartY = infoStartY + 80;
    doc.fontSize(11).fillColor(primaryColor).text('PRODUCTOS Y SERVICIOS', 50, tableStartY);
    
    const tableConfig = {
      headers: [
        { label: 'Descripción', property: 'name', width: 230, align: 'left' },
        { label: 'Cant.', property: 'quantity', width: 50, align: 'center' },
        { label: 'Precio', property: 'unitPrice', width: 85, align: 'right' },
        { label: 'Dto.', property: 'discount', width: 40, align: 'center' },
        { label: 'Importe', property: 'subtotal', width: 95, align: 'right' }
      ],
      rows: []
    };
    
    // Llenar datos de la tabla
    if (budget.items && Array.isArray(budget.items)) {
      budget.items.forEach(item => {
        const name = item.productSnapshot ? item.productSnapshot.name : 'Producto';
        
        const formatCurrency = (value) => {
          return value.toLocaleString('es-ES') + ' PYG';
        };
        
        tableConfig.rows.push({
          name,
          quantity: item.quantity.toString(),
          unitPrice: formatCurrency(item.unitPrice),
          discount: item.discount ? `${item.discount}%` : '0%',
          subtotal: formatCurrency(item.subtotal || (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)))
        });
      });
    }
    
    // Dibujar cabecera de tabla
    const tableHeaderY = tableStartY + 20;
    
    doc.fillColor(primaryColor)
       .rect(50, tableHeaderY, 500, 20)
       .fill();
    
    doc.fontSize(9).fillColor('#FFFFFF');
    
    // Headers
    doc.text(tableConfig.headers[0].label, 55, tableHeaderY + 5, { 
      width: tableConfig.headers[0].width - 10, 
      align: tableConfig.headers[0].align 
    });
    
    doc.text(tableConfig.headers[1].label, 55 + tableConfig.headers[0].width, tableHeaderY + 5, { 
      width: tableConfig.headers[1].width - 10, 
      align: tableConfig.headers[1].align 
    });
    
    doc.text(tableConfig.headers[2].label, 55 + tableConfig.headers[0].width + tableConfig.headers[1].width, tableHeaderY + 5, { 
      width: tableConfig.headers[2].width - 10, 
      align: tableConfig.headers[2].align 
    });
    
    doc.text(tableConfig.headers[3].label, 55 + tableConfig.headers[0].width + tableConfig.headers[1].width + tableConfig.headers[2].width, tableHeaderY + 5, { 
      width: tableConfig.headers[3].width - 10, 
      align: tableConfig.headers[3].align 
    });
    
    doc.text(tableConfig.headers[4].label, 55 + tableConfig.headers[0].width + tableConfig.headers[1].width + tableConfig.headers[2].width + tableConfig.headers[3].width, tableHeaderY + 5, { 
      width: tableConfig.headers[4].width - 10, 
      align: tableConfig.headers[4].align 
    });
    
    // Dibujar filas
    let yPos = tableHeaderY + 25;
    let rowCounter = 0;
    
    tableConfig.rows.forEach((row, rowIndex) => {
      if (yPos > doc.page.height - 150) {
        doc.addPage();
        yPos = 50;
        
        // Redibujar cabecera en nueva página
        doc.fillColor(primaryColor)
           .rect(50, yPos, 500, 20)
           .fill();
        
        doc.fontSize(9).fillColor('#FFFFFF');
        
        doc.text(tableConfig.headers[0].label, 55, yPos + 5, { 
          width: tableConfig.headers[0].width - 10, 
          align: tableConfig.headers[0].align 
        });
        
        doc.text(tableConfig.headers[1].label, 55 + tableConfig.headers[0].width, yPos + 5, { 
          width: tableConfig.headers[1].width - 10, 
          align: tableConfig.headers[1].align 
        });
        
        doc.text(tableConfig.headers[2].label, 55 + tableConfig.headers[0].width + tableConfig.headers[1].width, yPos + 5, { 
          width: tableConfig.headers[2].width - 10, 
          align: tableConfig.headers[2].align 
        });
        
        doc.text(tableConfig.headers[3].label, 55 + tableConfig.headers[0].width + tableConfig.headers[1].width + tableConfig.headers[2].width, yPos + 5, { 
          width: tableConfig.headers[3].width - 10, 
          align: tableConfig.headers[3].align 
        });
        
        doc.text(tableConfig.headers[4].label, 55 + tableConfig.headers[0].width + tableConfig.headers[1].width + tableConfig.headers[2].width + tableConfig.headers[3].width, yPos + 5, { 
          width: tableConfig.headers[4].width - 10, 
          align: tableConfig.headers[4].align 
        });
        
        yPos += 25;
      }
      
      if (rowCounter % 2 === 0) {
        doc.fillColor('#F7F7F7')
           .rect(50, yPos - 5, 500, 25)
           .fill();
      }
      rowCounter++;
      
      doc.fontSize(8).fillColor(secondaryColor);
      
      const col1 = 55;
      const col2 = col1 + tableConfig.headers[0].width;
      const col3 = col2 + tableConfig.headers[1].width;
      const col4 = col3 + tableConfig.headers[2].width;
      const col5 = col4 + tableConfig.headers[3].width;
      
      let displayName = row.name;
      if (displayName && displayName.length > 40) {
        displayName = displayName.substring(0, 37) + '...';
      }
      doc.text(displayName || '', col1, yPos, { 
        width: tableConfig.headers[0].width - 10,
        align: 'left',
        ellipsis: false,
        lineBreak: false
      });
      
      doc.text(row.quantity || '', col2, yPos, { 
        width: tableConfig.headers[1].width - 10,
        align: 'center',
        lineBreak: false
      });
      
      doc.text(row.unitPrice || '', col3, yPos, { 
        width: tableConfig.headers[2].width - 10,
        align: 'right',
        lineBreak: false
      });
      
      doc.text(row.discount || '', col4, yPos, { 
        width: tableConfig.headers[3].width - 10,
        align: 'center',
        lineBreak: false
      });
      
      doc.text(row.subtotal || '', col5, yPos, { 
        width: tableConfig.headers[4].width - 10,
        align: 'right',
        lineBreak: false
      });
      
      yPos += 25;
    });
    
    // ----- RESUMEN DE TOTALES -----
    
    doc.strokeColor('#CCCCCC')
       .lineWidth(1)
       .moveTo(50, yPos - 5)
       .lineTo(550, yPos - 5)
       .stroke();
    
    const totalsBoxX = 380;
    const totalsBoxY = yPos + 10;
    const totalsBoxWidth = 170;
    
    doc.strokeColor('#CCCCCC')
       .lineWidth(0.5)
       .moveTo(totalsBoxX, totalsBoxY)
       .lineTo(totalsBoxX + totalsBoxWidth, totalsBoxY)
       .stroke();
    
    const formatCurrency = (value) => {
      return value.toLocaleString('es-ES') + ' PYG';
    };
    
    yPos = totalsBoxY + 15;
    doc.fontSize(9).fillColor(secondaryColor).text('Subtotal:', totalsBoxX, yPos, { width: 80, align: 'left' });
    doc.fontSize(9).fillColor(secondaryColor).text(
      formatCurrency(budget.totalAmount), 
      totalsBoxX + 90, yPos, { width: 80, align: 'right' }
    );
    
    if (budget.discount > 0) {
      yPos += 20;
      doc.fontSize(9).fillColor(secondaryColor).text(
        `Descuento (${budget.discount}%):`, 
        totalsBoxX, yPos, { width: 80, align: 'left' }
      );
      
      const discountAmount = budget.totalAmount * (budget.discount / 100);
      doc.fontSize(9).fillColor(secondaryColor).text(
        '-' + formatCurrency(discountAmount), 
        totalsBoxX + 90, yPos, { width: 80, align: 'right' }
      );
    }
    
    if (budget.tax > 0) {
      yPos += 20;
      doc.fontSize(9).fillColor(secondaryColor).text(
        `IVA (${budget.tax}%):`, 
        totalsBoxX, yPos, { width: 80, align: 'left' }
      );
      
      const taxAmount = (budget.totalAmount - budget.totalAmount * (budget.discount / 100)) * (budget.tax / 100);
      doc.fontSize(9).fillColor(secondaryColor).text(
        formatCurrency(taxAmount), 
        totalsBoxX + 90, yPos, { width: 80, align: 'right' }
      );
    }
    
    yPos += 20;
    doc.strokeColor('#CCCCCC')
       .lineWidth(1)
       .moveTo(totalsBoxX, yPos)
       .lineTo(totalsBoxX + totalsBoxWidth, yPos)
       .stroke();
    
    // Total final destacado
    yPos += 15;
    doc.fontSize(11).fillColor(primaryColor).text('TOTAL:', totalsBoxX, yPos, { width: 80, align: 'left' });
    doc.fontSize(11).fillColor(primaryColor).text(
      formatCurrency(budget.finalAmount), 
      totalsBoxX + 90, yPos, { width: 80, align: 'right' }
    );
    
    // ----- NOTAS Y CONDICIONES -----
    
    if (budget.notes) {
      const notesY = Math.min(yPos + 60, doc.page.height - 150);
      
      if (notesY > doc.page.height - 120) {
        doc.addPage();
        yPos = 50;
      } else {
        yPos = notesY;
      }
      
      doc.fontSize(11).fillColor(primaryColor).text('NOTAS:', 50, yPos);
      doc.fontSize(9).fillColor(secondaryColor).text(budget.notes, 50, yPos + 20, { width: 500 });
    }
    
    // ----- PIE DE PÁGINA -----
    
    try {
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        const footerLineY = doc.page.height - 50;
        doc.strokeColor('#CCCCCC')
           .lineWidth(0.5)
           .moveTo(50, footerLineY)
           .lineTo(550, footerLineY)
           .stroke();
        
        const footerY = footerLineY + 10;
        doc.fontSize(8).fillColor('#999999').text(
          `Este presupuesto ha sido generado por ${budget.createdBy && budget.createdBy.name ? budget.createdBy.name : 'un administrador'} | Página ${i + 1} de ${pageCount}`,
          50, footerY, { align: 'center', width: 500 }
        );
      }
    } catch (footerError) {
      console.error("Error al generar pie de página:", footerError);
    }

    // Finalizar el PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      
      doc.on('error', (error) => {
        console.error("Error al generar el PDF:", error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('Error generando PDF de presupuesto:', error);
    throw error;
  }
}

/**
 * Descarga el PDF de un presupuesto - VERSIÓN CORREGIDA PARA VERCEL
 */
async function getBudgetPDFController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { budgetId } = req.params;

    if (!budgetId) {
      throw new Error("ID de presupuesto no proporcionado");
    }

    // Buscar el presupuesto
    const budget = await BudgetModel.findById(budgetId);
    if (!budget) {
      throw new Error("Presupuesto no encontrado");
    }

    // Generar el PDF en memoria
    const pdfBuffer = await generateBudgetPDF(budgetId);
    
    // Establecer encabezados para forzar la descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=presupuesto-${budget.budgetNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el buffer directamente
    res.send(pdfBuffer);

  } catch (err) {
    console.error("Error en getBudgetPDFController:", err);
    res.status(400).json({
      message: err.message || err,
      error: true,
      success: false
    });
  }
}

/**
 * Envía un presupuesto por email - VERSIÓN CORREGIDA PARA VERCEL
 */
async function sendBudgetEmailController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { budgetId } = req.params;
    const { emailTo, subject, message } = req.body;

    if (!budgetId) {
      throw new Error("ID de presupuesto no proporcionado");
    }

    let destinationEmail = emailTo;
    
    const budget = await BudgetModel.findById(budgetId)
      .populate('client', 'name email')
      .populate('createdBy', 'name email');

    if (!budget) {
      throw new Error("Presupuesto no encontrado");
    }

    if (!destinationEmail && budget.client && budget.client.email) {
      destinationEmail = budget.client.email;
    }

    if (!destinationEmail) {
      throw new Error("No se ha proporcionado un email de destino y el cliente no tiene email registrado");
    }

    // Generar PDF en memoria
    const pdfBuffer = await generateBudgetPDF(budgetId);

    // Configuración de nodemailer
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailSubject = subject || `Presupuesto ${budget.budgetNumber}`;
    const emailMessage = message || `
Estimado/a ${budget.client?.name || 'Cliente'},

Le hacemos llegar el presupuesto solicitado con número ${budget.budgetNumber}.

DETALLES:
- Total del presupuesto: ${budget.finalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'PYG' })}
- Válido hasta: ${new Date(budget.validUntil).toLocaleDateString()}
- Método de entrega: ${budget.deliveryMethod || 'A convenir'}
- Condiciones de pago: ${budget.paymentTerms || 'Según lo acordado'}

Para cualquier consulta o aclaración, no dude en contactarnos.

Atentamente,
${budget.createdBy?.name || 'El equipo comercial'}
Zenn EAS
`;

    // Enviar el email con el PDF adjunto desde memoria
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: destinationEmail,
      subject: emailSubject,
      text: emailMessage,
      attachments: [
        {
          filename: `presupuesto-${budget.budgetNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    // Actualizar el estado del presupuesto a "enviado" si está en borrador
    if (budget.status === 'draft') {
      budget.status = 'sent';
      await budget.save();
    }

    res.json({
      message: "Presupuesto enviado por email correctamente",
      data: {
        sentTo: destinationEmail,
        budgetNumber: budget.budgetNumber,
        status: budget.status
      },
      success: true,
      error: false
    });

  } catch (err) {
    console.error("Error en sendBudgetEmailController:", err);
    res.status(400).json({
      message: err.message || err,
      error: true,
      success: false
    });
  }
}

module.exports = {
    createBudgetController,
    getAllBudgetsController,
    getBudgetByIdController,
    updateBudgetStatusController,
    getBudgetPDFController,
    deleteBudgetController,
    sendBudgetEmailController
};
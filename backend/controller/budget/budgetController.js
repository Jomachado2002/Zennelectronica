// backend/controller/budget/budgetController.js - VERSIÓN CORREGIDA PARA VERCEL
const BudgetModel = require('../../models/budgetModel');
const ClientModel = require('../../models/clientModel');
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');
const nodemailer = require('nodemailer');
const { generateBudgetPDF, resolvePersonName } = require('../../services/budgetPdf');

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
                      brandName: product.brandName,
                      codigo: product.codigo,
                      image: Array.isArray(product.productImage) ? (product.productImage.find(Boolean) || '') : ''
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
      // console.error removed for production
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
      // console.error removed for production
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
        // console.error removed for production
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
        // console.error removed for production
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
      // console.error removed for production
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
 * Descarga el PDF de un presupuesto
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

    const pdfBuffer = await generateBudgetPDF(budgetId, {
      generatedByName: req.user?.name || req.user?.email || null,
      generatedById: req.user?._id || req.userId || null
    });
    
    // Establecer encabezados para forzar la descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=presupuesto-${budget.budgetNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el buffer directamente
    res.send(pdfBuffer);

  } catch (err) {
    // console.error removed for production
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
      .populate('client', 'name email');

    if (!budget) {
      throw new Error("Presupuesto no encontrado");
    }

    if (!destinationEmail && budget.client && budget.client.email) {
      destinationEmail = budget.client.email;
    }

    if (!destinationEmail) {
      throw new Error("No se ha proporcionado un email de destino y el cliente no tiene email registrado");
    }

    const loggedName = req.user?.name || req.user?.email || null;
    const authorName = loggedName || await resolvePersonName(budget.createdBy) || 'El equipo comercial';
    const pdfBuffer = await generateBudgetPDF(budgetId, {
      generatedByName: loggedName,
      generatedById: req.user?._id || req.userId || null
    });

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
${authorName || 'El equipo comercial'}
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
    // console.error removed for production
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
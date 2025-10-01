// backend/controller/profitability/profitabilityController.js
const ProfitabilityAnalysisModel = require('../../models/profitabilityAnalysisModel');
const BudgetModel = require('../../models/budgetModel');
const ClientModel = require('../../models/clientModel');
const SupplierModel = require('../../models/supplierModel');
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');

// Función auxiliar para generar número de análisis
async function generateNextAnalysisNumber() {
  try {
    const lastAnalysis = await ProfitabilityAnalysisModel.findOne({}, {}, { sort: { 'createdAt': -1 } });
    
    if (lastAnalysis && lastAnalysis.analysisNumber) {
      const lastNumberStr = lastAnalysis.analysisNumber.split('-')[1];
      if (!lastNumberStr || isNaN(parseInt(lastNumberStr))) {
        return 'ANAL-00001';
      } else {
        const lastNumber = parseInt(lastNumberStr);
        return `ANAL-${(lastNumber + 1).toString().padStart(5, '0')}`;
      }
    } else {
      return 'ANAL-00001';
    }
  } catch (error) {
    console.error("Error al generar número de análisis:", error);
    return `ANAL-${Date.now().toString().slice(-5)}`;
  }
}
async function createProfitabilityAnalysisController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { 
      budgetId,
      clientId,
      items,
      notes,
      estimatedDeliveryDate
    } = req.body;

    // Validar presupuesto
    if (!budgetId) {
      throw new Error("ID de presupuesto no proporcionado");
    }

    const budget = await BudgetModel.findById(budgetId);
    if (!budget) {
      throw new Error("Presupuesto no encontrado");
    }

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
      throw new Error("El análisis debe contener al menos un producto");
    }

    // Procesar y validar cada item
    const processedItems = [];
    for (const item of items) {
      if (!item.supplier) {
        throw new Error("Cada item debe tener un proveedor asignado");
      }

      // Validar proveedor
      const supplier = await SupplierModel.findById(item.supplier);
      if (!supplier) {
        throw new Error(`Proveedor no encontrado: ${item.supplier}`);
      }

      // Validar producto si existe
      let product = null;
      if (item.product) {
        product = await ProductModel.findById(item.product);
        if (!product) {
          throw new Error(`Producto no encontrado: ${item.product}`);
        }
      }

      // Calcular costos
      const quantity = Number(item.quantity) || 1;
      const purchasePrice = Number(item.purchasePrice) || 0;
      const exchangeRate = Number(item.exchangeRate) || 7300;
      const shippingCost = Number(item.shippingCost) || 0;
      const customsCost = Number(item.customsCost) || 0;
      const otherCosts = Number(item.otherCosts) || 0;
      const sellingPrice = Number(item.sellingPrice) || 0;

      // Convertir precio de compra a PYG si es necesario
      let purchasePricePYG = purchasePrice;
      if (item.purchaseCurrency === 'USD') {
        purchasePricePYG = purchasePrice * exchangeRate;
      } else if (item.purchaseCurrency === 'EUR') {
        // Asumiendo conversión EUR -> USD -> PYG (puedes ajustar según necesites)
        purchasePricePYG = purchasePrice * 1.1 * exchangeRate; // Factor de conversión aproximado
      }

      // Calcular costo total por unidad
      const totalCostPerUnit = purchasePricePYG + shippingCost + customsCost + otherCosts;
      
      // Calcular utilidad y margen
      const grossProfit = sellingPrice - totalCostPerUnit;
      const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
      const totalGrossProfit = grossProfit * quantity;

      processedItems.push({
        product: product ? product._id : null,
        productSnapshot: {
          name: item.productSnapshot?.name || product?.productName || 'Producto personalizado',
          description: item.productSnapshot?.description || product?.description || '',
          category: item.productSnapshot?.category || product?.category || 'General',
          subcategory: item.productSnapshot?.subcategory || product?.subcategory || 'General',
          brandName: item.productSnapshot?.brandName || product?.brandName || ''
        },
        quantity,
        supplier: supplier._id,
        supplierSnapshot: {
          name: supplier.name,
          contactPerson: supplier.contactPerson?.name || '',
          phone: supplier.phone || '',
          email: supplier.email || ''
        },
        purchasePrice,
        purchaseCurrency: item.purchaseCurrency || 'USD',
        exchangeRate,
        purchasePricePYG,
        shippingCost,
        customsCost,
        otherCosts,
        totalCostPerUnit,
        sellingPrice,
        grossProfit,
        profitMargin,
        totalGrossProfit,
        notes: item.notes || '',
        deliveryTime: item.deliveryTime || supplier.businessInfo?.deliveryTime || ''
      });
    }

    // Crear nuevo análisis
    const newAnalysis = new ProfitabilityAnalysisModel({
      budget: budgetId,
      client: clientId,
      items: processedItems,
      notes,
      estimatedDeliveryDate,
      createdBy: req.userId
    });

    const savedAnalysis = await newAnalysis.save();

    // Asociar análisis al proveedor(es)
    for (const item of processedItems) {
      await SupplierModel.findByIdAndUpdate(
        item.supplier,
        { $push: { profitabilityAnalyses: savedAnalysis._id } }
      );
    }

    res.status(201).json({
      message: "Análisis de rentabilidad creado correctamente",
      data: savedAnalysis,
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
 * Obtener todos los análisis de rentabilidad
 */
async function getAllProfitabilityAnalysesController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { 
      budgetId, 
      clientId, 
      supplierId,
      status, 
      startDate, 
      endDate,
      limit = 50, 
      page = 1, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Construir query
    const query = {};
    
    if (budgetId) query.budget = budgetId;
    if (clientId) query.client = clientId;
    if (status) query.status = status;
    
    // Filtro por proveedor (buscar en los items)
    if (supplierId) {
      query['items.supplier'] = supplierId;
    }
    
    // Filtro por fecha
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Paginación
    const skip = (page - 1) * limit;
    
    // Ejecutar la consulta
    const analyses = await ProfitabilityAnalysisModel.find(query)
      .populate('budget', 'budgetNumber status validUntil')
      .populate('client', 'name email company')
      .populate('items.supplier', 'name company businessInfo.specialty')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));
      
    // Contar total para paginación
    const total = await ProfitabilityAnalysisModel.countDocuments(query);
    
    res.json({
      message: "Lista de análisis de rentabilidad",
      data: {
        analyses,
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
    res.status(400).json({
      message: err.message || err,
      error: true,
      success: false
    });
  }
}

/**
 * Obtener un análisis de rentabilidad por ID
 */
async function getProfitabilityAnalysisByIdController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { analysisId } = req.params;

    if (!analysisId) {
      throw new Error("ID de análisis no proporcionado");
    }

    const analysis = await ProfitabilityAnalysisModel.findById(analysisId)
      .populate('budget', 'budgetNumber status validUntil finalAmount')
      .populate('client', 'name email phone company address')
      .populate('items.supplier', 'name company email phone businessInfo')
      .populate('items.product', 'productName brandName category subcategory sellingPrice')
      .populate('createdBy', 'name email');

    if (!analysis) {
      throw new Error("Análisis de rentabilidad no encontrado");
    }

    res.json({
      message: "Detalles del análisis de rentabilidad",
      data: analysis,
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
 * Comparar precios de proveedores para productos específicos
 */
async function compareSupplierPricesController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { products } = req.body; // Array de productos para comparar

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new Error("Debe proporcionar al menos un producto para comparar");
    }

    const comparisons = [];

    // Para cada producto, buscar análisis de rentabilidad
    for (const productInfo of products) {
      const { productId, productName, quantity = 1 } = productInfo;
      
      // Buscar análisis que contengan este producto
      const analyses = await ProfitabilityAnalysisModel.find({
        $or: [
          { 'items.product': productId },
          { 'items.productSnapshot.name': { $regex: productName, $options: 'i' } }
        ]
      })
      .populate('items.supplier', 'name company businessInfo')
      .sort({ createdAt: -1 })
      .limit(50); // Limitar para performance

      // Extraer información de proveedores para este producto
      const supplierOptions = [];
      
      for (const analysis of analyses) {
        for (const item of analysis.items) {
          // Verificar si es el producto que buscamos
          const isTargetProduct = 
            (productId && item.product && item.product.toString() === productId) ||
            (productName && item.productSnapshot.name.toLowerCase().includes(productName.toLowerCase()));
          
          if (isTargetProduct) {
            // Calcular costos para la cantidad solicitada
            const totalCost = item.totalCostPerUnit * quantity;
            const suggestedSellingPrice = item.sellingPrice * quantity;
            const totalProfit = (item.sellingPrice - item.totalCostPerUnit) * quantity;
            const profitMargin = item.profitMargin;

            supplierOptions.push({
              analysisId: analysis._id,
              analysisNumber: analysis.analysisNumber,
              supplier: item.supplier,
              supplierSnapshot: item.supplierSnapshot,
              purchasePrice: item.purchasePrice,
              purchaseCurrency: item.purchaseCurrency,
              exchangeRate: item.exchangeRate,
              purchasePricePYG: item.purchasePricePYG,
              shippingCost: item.shippingCost,
              customsCost: item.customsCost,
              otherCosts: item.otherCosts,
              totalCostPerUnit: item.totalCostPerUnit,
              totalCost: totalCost,
              sellingPrice: item.sellingPrice,
              suggestedSellingPrice: suggestedSellingPrice,
              profitPerUnit: item.grossProfit,
              totalProfit: totalProfit,
              profitMargin: profitMargin,
              deliveryTime: item.deliveryTime,
              notes: item.notes,
              createdAt: analysis.createdAt
            });
          }
        }
      }

      // Ordenar por mejor margen de ganancia
      supplierOptions.sort((a, b) => b.profitMargin - a.profitMargin);

      comparisons.push({
        product: {
          id: productId,
          name: productName,
          quantity: quantity
        },
        supplierOptions: supplierOptions,
        bestOption: supplierOptions[0] || null,
        optionsCount: supplierOptions.length
      });
    }

    res.json({
      message: "Comparación de precios de proveedores",
      data: {
        comparisons,
        totalProducts: comparisons.length,
        totalOptions: comparisons.reduce((sum, comp) => sum + comp.optionsCount, 0)
      },
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
 * Actualizar estado de un análisis
 */
async function updateAnalysisStatusController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { analysisId } = req.params;
    const { status, actualDeliveryDate, orderPlacedDate } = req.body;

    if (!analysisId) {
      throw new Error("ID de análisis no proporcionado");
    }

    // Verificar que el estado sea válido
    if (!['draft', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      throw new Error("Estado de análisis no válido");
    }

    const analysis = await ProfitabilityAnalysisModel.findById(analysisId);
    
    if (!analysis) {
      throw new Error("Análisis no encontrado");
    }

    // Actualizar campos
    analysis.status = status;
    
    if (actualDeliveryDate) {
      analysis.actualDeliveryDate = new Date(actualDeliveryDate);
    }
    
    if (orderPlacedDate) {
      analysis.orderPlacedDate = new Date(orderPlacedDate);
    }

    const updatedAnalysis = await analysis.save();

    res.json({
      message: `Estado del análisis actualizado a ${status}`,
      data: updatedAnalysis,
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
 * Eliminar análisis de rentabilidad
 */
async function deleteAnalysisController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { analysisId } = req.params;

    if (!analysisId) {
      throw new Error("ID de análisis no proporcionado");
    }

    const analysis = await ProfitabilityAnalysisModel.findById(analysisId);
    if (!analysis) {
      throw new Error("Análisis no encontrado");
    }

    // Remover referencias en proveedores
    for (const item of analysis.items) {
      await SupplierModel.findByIdAndUpdate(
        item.supplier,
        { $pull: { profitabilityAnalyses: analysisId } }
      );
    }

    // Eliminar el análisis
    await ProfitabilityAnalysisModel.findByIdAndDelete(analysisId);

    res.json({
      message: "Análisis eliminado correctamente",
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
 * Obtener resumen de rentabilidad por proveedor
 */
async function getSupplierProfitabilitySummaryController(req, res) {
  try {
    if (!uploadProductPermission(req.userId)) {
      throw new Error("Permiso denegado");
    }

    const { supplierId } = req.params;

    if (!supplierId) {
      throw new Error("ID de proveedor no proporcionado");
    }

    // Buscar todos los análisis que incluyan este proveedor
    const analyses = await ProfitabilityAnalysisModel.find({
      'items.supplier': supplierId
    })
    .populate('budget', 'budgetNumber status')
    .populate('client', 'name company')
    .sort({ createdAt: -1 });

    // Calcular estadísticas
    let totalAnalyses = analyses.length;
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalProfit = 0;
    let averageMargin = 0;
    let totalProducts = 0;

    for (const analysis of analyses) {
      for (const item of analysis.items) {
        if (item.supplier.toString() === supplierId) {
          totalProducts += item.quantity;
          const itemRevenue = item.sellingPrice * item.quantity;
          const itemCost = item.totalCostPerUnit * item.quantity;
          
          totalRevenue += itemRevenue;
          totalCosts += itemCost;
          totalProfit += item.totalGrossProfit;
        }
      }
    }

    averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const summary = {
      supplier: await SupplierModel.findById(supplierId),
      statistics: {
        totalAnalyses,
        totalProducts,
        totalRevenue,
        totalCosts,
        totalProfit,
        averageMargin: averageMargin.toFixed(2)
      },
      recentAnalyses: analyses.slice(0, 10), // Los 10 más recientes
      topProducts: [] // Puedes agregar lógica para productos más rentables
    };

    res.json({
      message: "Resumen de rentabilidad del proveedor",
      data: summary,
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

module.exports = {
  createProfitabilityAnalysisController,
  getAllProfitabilityAnalysesController,
  getProfitabilityAnalysisByIdController,
  compareSupplierPricesController,
  updateAnalysisStatusController,
  deleteAnalysisController,
  getSupplierProfitabilitySummaryController
};
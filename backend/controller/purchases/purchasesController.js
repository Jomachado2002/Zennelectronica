// backend/controller/purchases/purchasesController.js - VERSIÓN CORREGIDA
const PurchaseModel = require('../../models/purchaseModel');
const SupplierModel = require('../../models/supplierModel');
const uploadProductPermission = require('../../helpers/permission');
const { uploadTempFile } = require('../../helpers/uploadTempFile');

/**
 * Crear una nueva compra
 */
async function createPurchaseController(req, res) {
    try {
        // ✅ VERIFICACIÓN DE PERMISOS CORREGIDA
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const {
            purchaseType,
            supplierId,
            supplierInfo,
            items,
            subtotal,
            tax,
            totalAmount,
            paymentMethod,
            paymentStatus,
            dueDate,
            purchaseDate,
            notes
        } = req.body;

        // Validaciones básicas
        if (!purchaseType || !items || items.length === 0) {
            throw new Error("Datos de compra incompletos");
        }

        let supplierSnapshot = null;
        
        // Si se proporciona un supplierId, verificar que existe
        if (supplierId) {
            const supplier = await SupplierModel.findById(supplierId);
            if (!supplier) {
                throw new Error("Proveedor no encontrado");
            }
            supplierSnapshot = {
                name: supplier.name,
                company: supplier.company,
                email: supplier.email,
                phone: supplier.phone
            };
        }

        // Calcular totales
        let calculatedSubtotal = 0;
        const processedItems = items.map(item => {
            // Convertir a guaraníes si es necesario
            let unitPriceInPYG = item.unitPrice;
            if (item.currency === 'USD') {
                unitPriceInPYG = item.unitPrice * (item.exchangeRate || 7300);
            } else if (item.currency === 'EUR') {
                unitPriceInPYG = item.unitPrice * 1.1 * (item.exchangeRate || 7300);
            }

            const itemSubtotal = item.quantity * unitPriceInPYG;
            calculatedSubtotal += itemSubtotal;
            
            return {
                ...item,
                subtotal: itemSubtotal
            };
        });

        const taxAmount = calculatedSubtotal * ((tax || 10) / 100);
        const calculatedTotal = calculatedSubtotal + taxAmount;

        // Crear nueva compra (el número se genera automáticamente en el modelo)
        const newPurchase = new PurchaseModel({
            purchaseType,
            supplier: supplierId || null,
            supplierSnapshot,
            supplierInfo: !supplierId ? supplierInfo : null,
            items: processedItems,
            subtotal: calculatedSubtotal,
            tax: tax || 10,
            taxAmount,
            totalAmount: calculatedTotal,
            paymentMethod: paymentMethod || 'efectivo',
            paymentStatus: paymentStatus || 'pendiente',
            dueDate: dueDate ? new Date(dueDate) : null,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            notes,
            createdBy: req.userId
        });

        const savedPurchase = await newPurchase.save();

        res.status(201).json({
            message: "Compra registrada correctamente",
            data: savedPurchase,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createPurchaseController:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Obtener todas las compras
 */
async function getAllPurchasesController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const {
            purchaseType,
            paymentStatus,
            startDate,
            endDate,
            supplierId,
            limit = 50,
            page = 1,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construir query
        const query = { isActive: true };

        if (purchaseType) query.purchaseType = purchaseType;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (supplierId) query.supplier = supplierId;

        // Filtro por fecha
        if (startDate || endDate) {
            query.purchaseDate = {};
            if (startDate) query.purchaseDate.$gte = new Date(startDate);
            if (endDate) query.purchaseDate.$lte = new Date(endDate);
        }

        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Paginación
        const skip = (page - 1) * limit;

        // Ejecutar consulta
        const purchases = await PurchaseModel.find(query)
            .populate('supplier', 'name company email phone')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await PurchaseModel.countDocuments(query);

        res.json({
            message: "Lista de compras",
            data: {
                purchases,
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
 * Obtener una compra por ID
 */
async function getPurchaseByIdController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { purchaseId } = req.params;

        const purchase = await PurchaseModel.findById(purchaseId)
            .populate('supplier', 'name company email phone address');

        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        res.json({
            message: "Detalles de la compra",
            data: purchase,
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
 * Actualizar estado de pago de una compra
 */
async function updatePurchasePaymentController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { purchaseId } = req.params;
        const { paymentStatus, paymentMethod, notes } = req.body;

        const purchase = await PurchaseModel.findById(purchaseId);
        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        const updateData = {};
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (notes) updateData.notes = notes;

        const updatedPurchase = await PurchaseModel.findByIdAndUpdate(
            purchaseId,
            updateData,
            { new: true }
        ).populate('supplier', 'name company email phone');

        res.json({
            message: "Estado de pago actualizado",
            data: updatedPurchase,
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
 * Subir archivos de factura/recibo
 */
async function uploadPurchaseDocumentsController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { purchaseId } = req.params;
        
        if (!req.files || (!req.files.invoice && !req.files.receipt)) {
            throw new Error("No se ha proporcionado archivo");
        }

        const purchase = await PurchaseModel.findById(purchaseId);
        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        const updateData = {};
        const uploadResults = {};

        // Validar tipos de archivo
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

        // Subir factura si se proporciona
        if (req.files.invoice) {
            const invoiceFile = req.files.invoice;
            if (!allowedTypes.includes(invoiceFile.mimetype)) {
                throw new Error("Tipo de archivo no permitido para factura. Solo se permiten PDF e imágenes.");
            }

            const uploadResult = await uploadTempFile(invoiceFile.data, {
                name: `factura_${purchase.purchaseNumber}_${invoiceFile.name}`,
                size: invoiceFile.size
            });

            updateData.invoiceFile = uploadResult.url;
            uploadResults.invoice = uploadResult.url;
        }

        // Subir recibo si se proporciona
        if (req.files.receipt) {
            const receiptFile = req.files.receipt;
            if (!allowedTypes.includes(receiptFile.mimetype)) {
                throw new Error("Tipo de archivo no permitido para recibo. Solo se permiten PDF e imágenes.");
            }

            const uploadResult = await uploadTempFile(receiptFile.data, {
                name: `recibo_${purchase.purchaseNumber}_${receiptFile.name}`,
                size: receiptFile.size
            });

            updateData.receiptFile = uploadResult.url;
            uploadResults.receipt = uploadResult.url;
        }

        // Actualizar compra con URLs de archivos
        const updatedPurchase = await PurchaseModel.findByIdAndUpdate(
            purchaseId,
            updateData,
            { new: true }
        );

        res.json({
            message: "Documentos subidos correctamente",
            data: {
                purchase: updatedPurchase,
                uploadedFiles: uploadResults
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
 * Obtener resumen de compras por período
 */
async function getPurchasesSummaryController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { startDate, endDate, groupBy = 'month' } = req.query;

        // Fechas por defecto (mes actual)
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        // Agregación para resumen
        const summary = await PurchaseModel.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: start, $lte: end },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: {
                        purchaseType: "$purchaseType",
                        paymentStatus: "$paymentStatus"
                    },
                    totalPurchases: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" },
                    avgAmount: { $avg: "$totalAmount" }
                }
            },
            {
                $sort: { totalAmount: -1 }
            }
        ]);

        // Resumen por tipo de compra
        const purchasesByType = await PurchaseModel.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: start, $lte: end },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: "$purchaseType",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
                }
            }
        ]);

        // Compras pendientes de pago
        const pendingPayments = await PurchaseModel.countDocuments({
            paymentStatus: { $in: ['pendiente', 'parcial'] },
            isActive: true
        });

        // Resumen por categoría de items
        const expensesByCategory = await PurchaseModel.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: start, $lte: end },
                    isActive: true
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.category",
                    totalAmount: { $sum: "$items.subtotal" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.json({
            message: "Resumen de compras",
            data: {
                period: { start, end },
                summary,
                purchasesByType,
                pendingPayments,
                expensesByCategory
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
 * Eliminar una compra
 */
async function deletePurchaseController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { purchaseId } = req.params;

        const purchase = await PurchaseModel.findById(purchaseId);
        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        // Soft delete
        await PurchaseModel.findByIdAndUpdate(purchaseId, { isActive: false });

        res.json({
            message: "Compra eliminada correctamente",
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
    createPurchaseController,
    getAllPurchasesController,
    getPurchaseByIdController,
    updatePurchasePaymentController,
    uploadPurchaseDocumentsController,
    getPurchasesSummaryController,
    deletePurchaseController
};
// backend/controller/purchases/purchasesController.js - VERSIÓN CORREGIDA
const PurchaseModel = require('../../models/purchaseModel');
const SupplierModel = require('../../models/supplierModel');
const BranchModel = require('../../models/branchModel');
const ExchangeRateModel = require('../../models/exchangeRateModel');
let PurchaseTypeModel;
try { PurchaseTypeModel = require('../../models/purchaseTypeModel'); } catch (_) { PurchaseTypeModel = null; }
const uploadProductPermission = require('../../helpers/permission');
const { hasAdminAccessFromRequest } = uploadProductPermission;
const { uploadTempFile } = require('../../helpers/uploadTempFile');
const { uploadBufferToFirebase } = require('../../services/firebase');
const { calculateTax } = require('../../helpers/salesUtils');

function parseLocalDate(value) {
    if (!value) return new Date();
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function resolvePurchaseType(purchaseType) {
    const raw = String(purchaseType || '').trim();
    if (!raw) return 'inventario';
    if (PurchaseTypeModel) {
        let found = null;
        if (/^[a-fA-F0-9]{24}$/.test(raw)) {
            found = await PurchaseTypeModel.findById(raw);
        }
        if (!found) {
            found = await PurchaseTypeModel.findOne({
                $or: [
                    { code: raw },
                    { code: raw.toUpperCase() },
                    { name: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                ]
            });
        }
        if (found) {
            const code = String(found.code || '').trim();
            if (code && !/^\d+$/.test(code)) return code.toLowerCase();
            if (found.name) return String(found.name).trim();
        }
    }
    if (/^\d+$/.test(raw)) return 'inventario';
    return raw.toLowerCase();
}

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
            branchId,
            supplierId,
            supplierInfo,
            items,
            paymentMethod,
            paymentStatus,
            paymentTerms,
            dueDate,
            purchaseDate,
            notes,
            invoiceNumber,
            currency = 'PYG',
            exchangeRate
        } = req.body;

        // Validaciones básicas
        if (!purchaseType || !branchId || !items || !Array.isArray(items) || items.length === 0) {
            throw new Error("Datos de compra incompletos");
        }

        // Validar sucursal
        const branch = await BranchModel.findById(branchId);
        if (!branch) {
            throw new Error("Sucursal no encontrada");
        }
        const branchSnapshot = {
            name: branch.name,
            code: branch.code,
            address: branch.getFullAddress ? branch.getFullAddress() : `${branch.address?.street}, ${branch.address?.city}`
        };

        let supplierSnapshot = null;
        
        // Si se proporciona un supplierId, verificar que existe
        if (supplierId) {
            const supplier = await SupplierModel.findById(supplierId);
            if (!supplier) {
                throw new Error("Proveedor no encontrado");
            }
            if (supplier.isActive === false) {
                throw new Error("Proveedor inactivo");
            }
            supplierSnapshot = {
                name: supplier.name,
                company: supplier.company,
                email: supplier.email,
                phone: supplier.phone,
                ruc: supplier.ruc,
                address: supplier.address?.street || supplier.address
            };
        }

        const resolvedPurchaseType = await resolvePurchaseType(purchaseType);
        const documentRate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 7300;

        // Calcular totales con IVA por ítem
        let calculatedSubtotal = 0; // suma de base imponible
        let totalTaxAmount = 0;
        const processedItems = items.map(item => {
            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            if (quantity <= 0 || unitPrice < 0) {
                throw new Error("Cada item debe tener cantidad > 0 y precio >= 0");
            }

            const itemCurrency = item.currency || currency || 'PYG';
            const itemRate = itemCurrency === 'PYG'
                ? 1
                : (Number(item.exchangeRate) > 0 ? Number(item.exchangeRate) : documentRate);
            let unitPriceInPYG = unitPrice;
            if (itemCurrency !== 'PYG') {
                unitPriceInPYG = unitPrice * itemRate;
            }
            if (isNaN(unitPriceInPYG) || unitPriceInPYG <= 0) {
                throw new Error("Tipo de cambio requerido para moneda extranjera");
            }

            const rawTaxType = item.taxType || 'iva_10';
            const taxType = rawTaxType === 'exempt' ? 'exento' : rawTaxType;
            if (!['iva_10', 'iva_5', 'exento'].includes(taxType)) {
                throw new Error("Tipo de IVA inválido en item");
            }

            const priceIncludesTax = item.priceIncludesTax !== false && item.priceIncludesTax !== 'false';
            const calcTaxType = taxType === 'exento' ? 'exempt' : taxType;
            const taxCalculation = calculateTax(unitPriceInPYG, calcTaxType, priceIncludesTax);
            const baseAmount = taxCalculation.baseAmount;
            const taxAmount = taxCalculation.taxAmount;

            const itemSubtotal = quantity * baseAmount;
            const itemTotalTax = quantity * taxAmount;

            calculatedSubtotal += itemSubtotal;
            totalTaxAmount += itemTotalTax;

            const ACCOUNTING_CATEGORIES = ['producto', 'servicio', 'gasto_fijo', 'gasto_variable', 'inversion'];
            const incomingCategory = String(item.category || 'producto').trim();
            const category = ACCOUNTING_CATEGORIES.includes(incomingCategory) ? incomingCategory : 'producto';
            const productCategory = item.productCategory || (!ACCOUNTING_CATEGORIES.includes(incomingCategory) ? incomingCategory : '');

            return {
                product: item.productId || item.product || null,
                productCode: item.productCode || '',
                description: item.description,
                category,
                productCategory,
                quantity,
                unitPrice,
                currency: itemCurrency,
                exchangeRate: itemCurrency === 'PYG' ? 1 : itemRate,
                unitPricePYG: unitPriceInPYG,
                taxType,
                taxRate: taxCalculation.taxRate,
                priceIncludesTax,
                baseAmount,
                taxAmount,
                subtotal: itemSubtotal
            };
        });

        const calculatedTotal = calculatedSubtotal + totalTaxAmount;

        // Crear nueva compra (el número se genera automáticamente en el modelo)
        const newPurchase = new PurchaseModel({
            purchaseType: resolvedPurchaseType,
            branch: branch._id,
            branchSnapshot,
            supplier: supplierId || null,
            supplierSnapshot,
            supplierInfo: !supplierId ? supplierInfo : null,
            currency,
            exchangeRate: currency === 'PYG' ? 1 : documentRate,
            invoiceNumber,
            paymentTerms: paymentTerms || 'efectivo',
            items: processedItems,
            subtotal: calculatedSubtotal,
            totalTaxAmount,
            totalAmount: calculatedTotal,
            totalAmountPYG: calculatedTotal,
            totalAmountUSD: documentRate > 0 ? calculatedTotal / documentRate : 0,
            paymentMethod: paymentMethod || 'efectivo',
            paymentStatus: paymentStatus || 'pendiente',
            dueDate: dueDate ? parseLocalDate(dueDate) : null,
            purchaseDate: purchaseDate ? parseLocalDate(purchaseDate) : new Date(),
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
        // console.error removed for production
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
            limit = 200,
            page = 1,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construir query
        const query = { isActive: { $ne: false } };

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
            .limit(Number(limit))
            .lean();

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
        const hasPermission = hasAdminAccessFromRequest(req) || await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { purchaseId } = req.params;
        const { paymentStatus, paymentMethod, notes } = req.body;

        const updateData = {};
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (notes !== undefined) updateData.notes = notes;

        const updatedPurchase = await PurchaseModel.findByIdAndUpdate(
            purchaseId,
            updateData,
            { new: true }
        ).lean();

        if (!updatedPurchase) {
            throw new Error("Compra no encontrada");
        }

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

            let uploadResult;
            try {
                uploadResult = await uploadBufferToFirebase('purchases/invoices', `factura_${purchase.purchaseNumber}_${invoiceFile.name}`, invoiceFile.data, invoiceFile.mimetype);
            } catch (e) {
                // Fallback a upload temporal si Firebase no está configurado
                uploadResult = await uploadTempFile(invoiceFile.data, {
                    name: `factura_${purchase.purchaseNumber}_${invoiceFile.name}`,
                    size: invoiceFile.size
                });
            }

            updateData.invoiceFile = uploadResult.url;
            uploadResults.invoice = uploadResult.url;
        }

        // Subir recibo si se proporciona
        if (req.files.receipt) {
            const receiptFile = req.files.receipt;
            if (!allowedTypes.includes(receiptFile.mimetype)) {
                throw new Error("Tipo de archivo no permitido para recibo. Solo se permiten PDF e imágenes.");
            }

            let uploadResult;
            try {
                uploadResult = await uploadBufferToFirebase('purchases/receipts', `recibo_${purchase.purchaseNumber}_${receiptFile.name}`, receiptFile.data, receiptFile.mimetype);
            } catch (e) {
                uploadResult = await uploadTempFile(receiptFile.data, {
                    name: `recibo_${purchase.purchaseNumber}_${receiptFile.name}`,
                    size: receiptFile.size
                });
            }

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

        // Agregación para resumen general
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
                    subtotal: { $sum: "$subtotal" },
                    totalTaxAmount: { $sum: "$totalTaxAmount" },
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
                    subtotal: { $sum: "$items.subtotal" },
                    totalTaxAmount: { $sum: { $multiply: ["$items.taxAmount", "$items.quantity"] } },
                    totalAmount: { $sum: { $add: ["$items.subtotal", { $multiply: ["$items.taxAmount", "$items.quantity"] }] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Desglose de IVA por tipo
        const ivaBreakdown = await PurchaseModel.aggregate([
            { $match: { purchaseDate: { $gte: start, $lte: end }, isActive: true } },
            { $unwind: "$items" },
            { $group: {
                _id: "$items.taxType",
                subtotal: { $sum: "$items.subtotal" },
                totalTaxAmount: { $sum: { $multiply: ["$items.taxAmount", "$items.quantity"] } },
                total: { $sum: { $add: ["$items.subtotal", { $multiply: ["$items.taxAmount", "$items.quantity"] }] } }
            } }
        ]);

        res.json({
            message: "Resumen de compras",
            data: {
                period: { start, end },
                summary,
                purchasesByType,
                pendingPayments,
                expensesByCategory,
                ivaBreakdown
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
 * Actualizar compra completa (PUT)
 */
async function updatePurchaseController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            throw new Error("Permiso denegado");
        }

        const { purchaseId } = req.params;

        // Buscar compra existente
        const purchase = await PurchaseModel.findById(purchaseId);
        if (!purchase) {
            throw new Error("Compra no encontrada");
        }

        // ✅ NO PERMITIR EDICIÓN COMPLETA SI ESTÁ PAGADA
        if (purchase.paymentStatus === 'pagado') {
            return res.status(403).json({
                message: "No se puede editar una compra pagada. Solo se pueden modificar las notas.",
                error: true,
                success: false
            });
        }

        const {
            purchaseType,
            supplierId,
            supplierInfo,
            branchId,
            items,
            purchaseDate,
            dueDate,
            invoiceNumber,
            invoiceDate,
            paymentMethod,
            paymentStatus,
            notes,
            subtotal,
            totalTaxAmount,
            totalAmount
        } = req.body;

        // Preparar datos de actualización
        const updateData = {
            ...(purchaseType && { purchaseType }),
            ...(supplierId && { supplierId }),
            ...(supplierInfo && { supplierInfo }),
            ...(branchId && { branchId }),
            ...(items && { items }),
            ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
            ...(dueDate && { dueDate: new Date(dueDate) }),
            ...(invoiceNumber && { invoiceNumber }),
            ...(invoiceDate && { invoiceDate: new Date(invoiceDate) }),
            ...(paymentMethod && { paymentMethod }),
            ...(paymentStatus && { paymentStatus }),
            ...(notes !== undefined && { notes }),
            ...(subtotal !== undefined && { subtotal }),
            ...(totalTaxAmount !== undefined && { totalTaxAmount }),
            ...(totalAmount !== undefined && { totalAmount }),
            updatedBy: req.userId,
            updatedAt: new Date()
        };

        const updatedPurchase = await PurchaseModel.findByIdAndUpdate(
            purchaseId,
            updateData,
            { new: true, runValidators: true }
        ).populate('supplier', 'name company email phone');

        res.json({
            message: "Compra actualizada completamente",
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
    updatePurchaseController,
    uploadPurchaseDocumentsController,
    getPurchasesSummaryController,
    deletePurchaseController,
    getPurchasesFormDataController
};

const DEFAULT_PURCHASE_TYPES = [
    { code: 'inventario', name: 'Inventario' },
    { code: 'servicios', name: 'Servicios' },
    { code: 'gastos', name: 'Gastos' },
    { code: 'equipos', name: 'Equipos' },
    { code: 'gastos_operativos', name: 'Gastos operativos' },
    { code: 'marketing', name: 'Marketing' },
    { code: 'otros', name: 'Otros' }
];

function mapPurchaseType(type) {
    return {
        _id: type._id ? String(type._id) : type.code,
        code: type.code || String(type._id || ''),
        name: type.name || type.code || 'Tipo'
    };
}

function mapBranch(branch) {
    const address = branch.address;
    const addressText = typeof address === 'string'
        ? address
        : [address?.street, address?.city, address?.state].filter(Boolean).join(', ');
    return {
        _id: String(branch._id),
        name: branch.name,
        code: branch.code,
        isMainBranch: Boolean(branch.isMainBranch),
        address: addressText
    };
}

/**
 * Datos para formulario de Nueva Compra (tipos, sucursales, proveedores, TC)
 */
async function getPurchasesFormDataController(req, res) {
    try {
        let purchaseTypes = [];
        try {
            if (PurchaseTypeModel) {
                const types = await PurchaseTypeModel.find({ isActive: { $ne: false } }).sort({ sortOrder: 1, name: 1 });
                purchaseTypes = types.map(mapPurchaseType);
            }
        } catch (err) {
            purchaseTypes = [];
        }

        if (!purchaseTypes.length) {
            purchaseTypes = DEFAULT_PURCHASE_TYPES.map(mapPurchaseType);
        }

        let branches = [];
        try {
            branches = await BranchModel.getActiveBranches();
            if (!branches.length) {
                branches = await BranchModel.find().sort({ name: 1 });
            }
        } catch (_) {
            try {
                branches = await BranchModel.find({ isActive: { $ne: false } }).sort({ name: 1 });
            } catch (__) {
                branches = [];
            }
        }

        let suppliers = [];
        let usdRate = { toPYG: 7300 };
        let eurRate = { toPYG: 0 };
        try { suppliers = await SupplierModel.find({ isActive: { $ne: false } }).select('name company ruc taxId email phone address').limit(500); } catch (_) { suppliers = []; }
        try { usdRate = await ExchangeRateModel.getCurrentRate('USD'); } catch (_) { usdRate = { toPYG: 7300 }; }
        try { eurRate = await ExchangeRateModel.getCurrentRate('EUR'); } catch (_) { eurRate = { toPYG: 0 }; }

        res.json({
            success: true,
            error: false,
            data: {
                purchaseTypes,
                branches: (branches || []).map(mapBranch),
                suppliers: (suppliers || []).map((s) => ({
                    _id: String(s._id),
                    name: s.name,
                    company: s.company,
                    ruc: s.ruc || s.taxId,
                    taxId: s.taxId || s.ruc,
                    email: s.email,
                    phone: s.phone
                })),
                exchangeRates: {
                    USD: usdRate?.toPYG || 7300,
                    EUR: eurRate?.toPYG || 0
                }
            }
        });
    } catch (err) {
        res.json({
            success: true,
            error: false,
            message: err?.message || 'Error obteniendo datos del formulario',
            data: {
                purchaseTypes: DEFAULT_PURCHASE_TYPES.map(mapPurchaseType),
                branches: [],
                suppliers: [],
                exchangeRates: { USD: 7300, EUR: 0 }
            }
        });
    }
}

module.exports.getPurchasesFormDataController = getPurchasesFormDataController;
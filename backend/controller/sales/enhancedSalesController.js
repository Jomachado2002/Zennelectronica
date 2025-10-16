const SaleModel = require('../../models/saleModel');
const ClientModel = require('../../models/clientModel');
const SalesTypeModel = require('../../models/salesTypeModel');
const BranchModel = require('../../models/branchModel');
const SalespersonModel = require('../../models/salespersonModel');
const ProductModel = require('../../models/productModel');
const ExchangeRateModel = require('../../models/exchangeRateModel');
const uploadProductPermission = require('../../helpers/permission');
const { 
    calculateTax, 
    numberToWords, 
    calculateDueDate, 
    formatCurrency, 
    validateRUC, 
    getDefaultConsumerFinal,
    convertCurrency 
} = require('../../helpers/salesUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../temp/sales-attachments');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

/**
 * Create a new enhanced sale
 */
async function createEnhancedSaleController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const {
            saleTypeId,
            clientId,
            branchId,
            salespersonId,
            items,
            currency = 'PYG',
            exchangeRate,
            paymentMethod = 'efectivo',
            paymentTerms = 'efectivo',
            customPaymentTerms,
            internalNotes,
            customerNotes,
            attachments = []
        } = req.body;

        // Validations
        if (!saleTypeId || !clientId || !branchId || !salespersonId || !items || items.length === 0) {
            return res.status(400).json({
                message: "Datos de venta incompletos",
                error: true,
                success: false
            });
        }

        // Verify all required entities exist
        const [saleType, client, branch, salesperson] = await Promise.all([
            SalesTypeModel.findById(saleTypeId),
            ClientModel.findById(clientId),
            BranchModel.findById(branchId),
            SalespersonModel.findById(salespersonId)
        ]);

        if (!saleType) {
            return res.status(404).json({
                message: "Tipo de venta no encontrado",
                error: true,
                success: false
            });
        }

        if (!client) {
            return res.status(404).json({
                message: "Cliente no encontrado",
                error: true,
                success: false
            });
        }

        if (!branch) {
            return res.status(404).json({
                message: "Sucursal no encontrada",
                error: true,
                success: false
            });
        }

        if (!salesperson) {
            return res.status(404).json({
                message: "Vendedor no encontrado",
                error: true,
                success: false
            });
        }

        // Get current exchange rate if not provided
        let currentExchangeRate = exchangeRate || 1;
        if (currency !== 'PYG' && !exchangeRate) {
            const rate = await ExchangeRateModel.getCurrentRate(currency);
            currentExchangeRate = rate.toPYG;
        }

        // Process items with enhanced calculations
        let totalSubtotal = 0;
        let totalTaxAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const {
                productId,
                description,
                quantity,
                unitPrice,
                taxType = 'iva_10',
                priceIncludesTax = true,
                currency: itemCurrency = currency
            } = item;

            // Get product data if productId provided
            let productData = null;
            if (productId) {
                const product = await ProductModel.findById(productId);
                if (product) {
                    productData = {
                        name: product.productName,
                        code: product.codigo,
                        brand: product.brandName,
                        category: product.category
                    };
                }
            }

            // Convert price to PYG if needed
            let unitPriceInPYG = unitPrice;
            if (itemCurrency !== 'PYG') {
                const conversion = convertCurrency(unitPrice, itemCurrency, 'PYG', currentExchangeRate);
                unitPriceInPYG = conversion.convertedAmount;
            }

            // Calculate tax for this item
            const taxCalculation = calculateTax(unitPriceInPYG, taxType, priceIncludesTax);
            
            // Calculate subtotals
            const itemSubtotal = quantity * taxCalculation.baseAmount;
            const itemTaxAmount = quantity * taxCalculation.taxAmount;
            const itemTotal = quantity * taxCalculation.totalAmount;

            totalSubtotal += itemSubtotal;
            totalTaxAmount += itemTaxAmount;

            processedItems.push({
                product: productId || null,
                productSnapshot: productData,
                description: description || (productData ? productData.name : ''),
                quantity,
                unitPrice: unitPriceInPYG,
                currency: itemCurrency,
                exchangeRate: currentExchangeRate,
                unitPricePYG: unitPriceInPYG,
                taxType,
                taxRate: taxCalculation.taxRate,
                taxAmount: itemTaxAmount,
                subtotal: itemSubtotal,
                subtotalWithTax: itemTotal
            });
        }

        const totalAmount = totalSubtotal + totalTaxAmount;
        const totalAmountPYG = totalAmount;
        const totalAmountUSD = currency === 'USD' ? totalAmount : totalAmount / currentExchangeRate;

        // Calculate due date
        const saleDate = new Date();
        const dueDate = calculateDueDate(saleDate, paymentTerms, customPaymentTerms);

        // Generate amount in words
        const amountInWords = numberToWords(totalAmountPYG, 'PYG');

        // Create new sale
        const newSale = new SaleModel({
            saleType: saleTypeId,
            saleTypeSnapshot: {
                name: saleType.name,
                description: saleType.description
            },
            client: clientId,
            clientSnapshot: {
                name: client.name,
                company: client.company,
                email: client.email,
                phone: client.phone,
                address: client.address,
                taxId: client.taxId
            },
            branch: branchId,
            branchSnapshot: {
                name: branch.name,
                code: branch.code,
                address: branch.address
            },
            salesperson: salespersonId,
            salespersonSnapshot: {
                name: salesperson.name,
                document: salesperson.document,
                phone: salesperson.phone,
                email: salesperson.email
            },
            items: processedItems,
            subtotal: totalSubtotal,
            tax: Math.round((totalTaxAmount / totalSubtotal) * 100) || 0,
            taxAmount: totalTaxAmount,
            totalAmount: totalAmount,
            currency,
            exchangeRate: currentExchangeRate,
            totalAmountPYG,
            totalAmountUSD: currency === 'USD' ? totalAmount : totalAmountUSD,
            paymentMethod,
            paymentTerms,
            customPaymentTerms,
            dueDate,
            amountInWords,
            internalNotes,
            customerNotes,
            attachments,
            createdBy: req.userId
        });

        const savedSale = await newSale.save();

        // Update client with the sale
        await ClientModel.findByIdAndUpdate(
            clientId,
            { $push: { sales: savedSale._id } }
        );

        // Update salesperson performance
        const commissionAmount = totalAmount * (salesperson.commissionRate / 100);
        await salesperson.updatePerformance(totalAmount, commissionAmount);

        res.status(201).json({
            message: "Venta creada correctamente",
            data: savedSale,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createEnhancedSaleController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Search products for sales
 */
async function searchProductsForSalesController(req, res) {
    try {
        const { query, limit = 20 } = req.query;

        if (!query || query.trim() === '') {
            return res.status(400).json({
                message: "Query de búsqueda es requerido",
                error: true,
                success: false
            });
        }

        const searchRegex = new RegExp(query, 'i');
        const products = await ProductModel.find({
            $or: [
                { productName: searchRegex },
                { codigo: searchRegex },
                { brandName: searchRegex },
                { category: searchRegex }
            ],
            isActive: { $ne: false }
        })
        .select('productName codigo brandName category sellingPrice productImage')
        .limit(parseInt(limit))
        .sort({ productName: 1 });

        res.json({
            message: "Productos encontrados",
            data: products,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en searchProductsForSalesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Search customers for sales
 */
async function searchCustomersForSalesController(req, res) {
    try {
        const { query, limit = 20 } = req.query;

        if (!query || query.trim() === '') {
            return res.status(400).json({
                message: "Query de búsqueda es requerido",
                error: true,
                success: false
            });
        }

        const searchRegex = new RegExp(query, 'i');
        const customers = await ClientModel.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { taxId: searchRegex },
                { company: searchRegex }
            ],
            isActive: { $ne: false }
        })
        .select('name email phone taxId company address')
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({
            message: "Clientes encontrados",
            data: customers,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en searchCustomersForSalesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get sales form data (dropdowns and options)
 */
async function getSalesFormDataController(req, res) {
    try {
        const [salesTypes, branches, salespersons, exchangeRates] = await Promise.all([
            SalesTypeModel.getActiveTypes(),
            BranchModel.getActiveBranches(),
            SalespersonModel.getActiveSalespersons(),
            ExchangeRateModel.getCurrentRate('USD')
        ]);

        res.json({
            message: "Datos del formulario de ventas",
            data: {
                salesTypes,
                branches,
                salespersons,
                exchangeRates: {
                    USD: exchangeRates.toPYG,
                    lastUpdated: exchangeRates.effectiveDate
                },
                defaultConsumerFinal: getDefaultConsumerFinal()
            },
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getSalesFormDataController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Calculate tax for an item
 */
async function calculateItemTaxController(req, res) {
    try {
        const { amount, taxType = 'iva_10', priceIncludesTax = true } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Monto inválido",
                error: true,
                success: false
            });
        }

        const taxCalculation = calculateTax(amount, taxType, priceIncludesTax);

        res.json({
            message: "Cálculo de impuestos",
            data: taxCalculation,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en calculateItemTaxController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Convert amount to words
 */
async function convertAmountToWordsController(req, res) {
    try {
        const { amount, currency = 'PYG' } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Monto inválido",
                error: true,
                success: false
            });
        }

        const words = numberToWords(amount, currency);

        res.json({
            message: "Monto en palabras",
            data: { words, amount, currency },
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en convertAmountToWordsController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Validate RUC
 */
async function validateRUCController(req, res) {
    try {
        const { ruc } = req.body;

        if (!ruc) {
            return res.status(400).json({
                message: "RUC es requerido",
                error: true,
                success: false
            });
        }

        const isValid = validateRUC(ruc);

        res.json({
            message: "Validación de RUC",
            data: { ruc, isValid },
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en validateRUCController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Upload attachments for sales
 */
async function uploadSalesAttachmentsController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "No se subieron archivos",
                error: true,
                success: false
            });
        }

        const uploadedFiles = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date()
        }));

        res.json({
            message: "Archivos subidos correctamente",
            data: uploadedFiles,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en uploadSalesAttachmentsController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Download attachment
 */
async function downloadAttachmentController(req, res) {
    try {
        const { attachmentId } = req.params;
        
        // Find the sale that contains this attachment
        const sale = await SaleModel.findOne({
            'attachments._id': attachmentId
        });

        if (!sale) {
            return res.status(404).json({
                message: "Archivo no encontrado",
                error: true,
                success: false
            });
        }

        const attachment = sale.attachments.find(att => att._id.toString() === attachmentId);
        if (!attachment) {
            return res.status(404).json({
                message: "Archivo no encontrado",
                error: true,
                success: false
            });
        }

        const filePath = path.join(__dirname, '../../temp/sales-attachments', attachment.filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Archivo no encontrado en el servidor",
                error: true,
                success: false
            });
        }

        res.download(filePath, attachment.originalName);

    } catch (err) {
        console.error("Error en downloadAttachmentController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

module.exports = {
    createEnhancedSaleController,
    searchProductsForSalesController,
    searchCustomersForSalesController,
    getSalesFormDataController,
    calculateItemTaxController,
    convertAmountToWordsController,
    validateRUCController,
    uploadSalesAttachmentsController,
    downloadAttachmentController,
    upload // Export multer middleware
};

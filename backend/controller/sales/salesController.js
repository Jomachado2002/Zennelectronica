// backend/controller/sales/salesController.js - VERSIÓN CORREGIDA PARA VERCEL
const SaleModel = require('../../models/saleModel');
const ClientModel = require('../../models/clientModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Crear una nueva venta
 */
async function createSaleController(req, res) {
    try {
        // ✅ VERIFICACIÓN DE PERMISOS CORREGIDA
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const {
            saleType,
            clientId,
            items,
            subtotal,
            tax,
            totalAmount,
            paymentMethod,
            paymentStatus,
            dueDate,
            saleDate,
            notes
        } = req.body;

        // Validaciones básicas
        if (!saleType || !clientId || !items || items.length === 0) {
            return res.status(400).json({
                message: "Datos de venta incompletos",
                error: true,
                success: false
            });
        }

        // Verificar que el cliente existe
        const client = await ClientModel.findById(clientId);
        if (!client) {
            return res.status(404).json({
                message: "Cliente no encontrado",
                error: true,
                success: false
            });
        }

        // Calcular totales
        let calculatedSubtotal = 0;
        const processedItems = items.map(item => {
            // Convertir precio a guaraníes si es necesario
            let unitPriceInPYG = item.unitPrice || 0;
            if (item.currency === 'USD') {
                unitPriceInPYG = (item.unitPrice || 0) * (item.exchangeRate || 7300);
            } else if (item.currency === 'EUR') {
                unitPriceInPYG = (item.unitPrice || 0) * 1.1 * (item.exchangeRate || 7300);
            }

            const itemSubtotal = (item.quantity || 1) * unitPriceInPYG;
            calculatedSubtotal += itemSubtotal;
            
            return {
                ...item,
                unitPricePYG: unitPriceInPYG, // Precio convertido a PYG
                subtotal: itemSubtotal
            };
        });

        const taxAmount = calculatedSubtotal * ((tax || 10) / 100);
        const calculatedTotal = calculatedSubtotal + taxAmount;

        // Crear nueva venta
        const newSale = new SaleModel({
            saleType,
            client: clientId,
            clientSnapshot: {
                name: client.name,
                company: client.company,
                email: client.email,
                phone: client.phone
            },
            items: processedItems,
            subtotal: calculatedSubtotal,
            tax: tax || 10,
            taxAmount,
            totalAmount: calculatedTotal,
            paymentMethod: paymentMethod || 'efectivo',
            paymentStatus: paymentStatus || 'pendiente',
            dueDate: dueDate ? new Date(dueDate) : null,
            saleDate: saleDate ? new Date(saleDate) : new Date(),
            notes,
            createdBy: req.userId
        });

        const savedSale = await newSale.save();

        // Actualizar cliente con la venta
        await ClientModel.findByIdAndUpdate(
            clientId,
            { $push: { sales: savedSale._id } }
        );

        res.status(201).json({
            message: "Venta creada correctamente",
            data: savedSale,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createSaleController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Obtener todas las ventas
 */
async function getAllSalesController(req, res) {
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
            saleType,
            paymentStatus,
            startDate,
            endDate,
            clientId,
            limit = 50,
            page = 1,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construir query
        const query = { isActive: true };

        if (saleType) query.saleType = saleType;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (clientId) query.client = clientId;

        // Filtro por fecha
        if (startDate || endDate) {
            query.saleDate = {};
            if (startDate) query.saleDate.$gte = new Date(startDate);
            if (endDate) query.saleDate.$lte = new Date(endDate);
        }

        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Paginación
        const skip = (page - 1) * limit;

        // Ejecutar consulta
        const sales = await SaleModel.find(query)
            .populate('client', 'name company email phone')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await SaleModel.countDocuments(query);

        res.json({
            message: "Lista de ventas",
            data: {
                sales,
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
        console.error("Error en getAllSalesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Obtener una venta por ID
 */
async function getSaleByIdController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { saleId } = req.params;

        const sale = await SaleModel.findById(saleId)
            .populate('client', 'name company email phone address');

        if (!sale) {
            return res.status(404).json({
                message: "Venta no encontrada",
                error: true,
                success: false
            });
        }

        res.json({
            message: "Detalles de la venta",
            data: sale,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getSaleByIdController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Actualizar estado de pago de una venta
 */
async function updateSalePaymentController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { saleId } = req.params;
        const { paymentStatus, paymentMethod, notes } = req.body;

        const sale = await SaleModel.findById(saleId);
        if (!sale) {
            return res.status(404).json({
                message: "Venta no encontrada",
                error: true,
                success: false
            });
        }

        const updateData = {};
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (notes) updateData.notes = notes;

        const updatedSale = await SaleModel.findByIdAndUpdate(
            saleId,
            updateData,
            { new: true }
        ).populate('client', 'name company email phone');

        res.json({
            message: "Estado de pago actualizado",
            data: updatedSale,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en updateSalePaymentController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Eliminar una venta
 */
async function deleteSaleController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { saleId } = req.params;

        const sale = await SaleModel.findById(saleId);
        if (!sale) {
            return res.status(404).json({
                message: "Venta no encontrada",
                error: true,
                success: false
            });
        }

        // Soft delete
        await SaleModel.findByIdAndUpdate(saleId, { isActive: false });

        // Remover de cliente
        if (sale.client) {
            await ClientModel.findByIdAndUpdate(
                sale.client,
                { $pull: { sales: saleId } }
            );
        }

        res.json({
            message: "Venta eliminada correctamente",
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en deleteSaleController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

// Función temporal para subir factura (sin implementación de archivo)
async function uploadSaleInvoiceController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { saleId } = req.params;
        
        const sale = await SaleModel.findById(saleId);
        if (!sale) {
            return res.status(404).json({
                message: "Venta no encontrada",
                error: true,
                success: false
            });
        }

        // Por ahora solo actualizar que se subió factura
        const updatedSale = await SaleModel.findByIdAndUpdate(
            saleId,
            { invoiceFile: `factura_${sale.saleNumber}_${Date.now()}.pdf` },
            { new: true }
        );

        res.json({
            message: "Factura registrada correctamente",
            data: {
                sale: updatedSale,
                fileUrl: updatedSale.invoiceFile
            },
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en uploadSaleInvoiceController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

module.exports = {
    createSaleController,
    getAllSalesController,
    getSaleByIdController,
    updateSalePaymentController,
    uploadSaleInvoiceController,
    deleteSaleController
};
const SalesTypeModel = require('../../models/salesTypeModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Create a new sales type
 */
async function createSalesTypeController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { name, description, metadata } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                message: "El nombre del tipo de venta es requerido",
                error: true,
                success: false
            });
        }

        // Check if sales type already exists
        const existingType = await SalesTypeModel.findOne({ 
            name: name.trim(),
            isActive: true 
        });

        if (existingType) {
            return res.status(400).json({
                message: "Ya existe un tipo de venta con este nombre",
                error: true,
                success: false
            });
        }

        const newSalesType = new SalesTypeModel({
            name: name.trim(),
            description: description?.trim() || '',
            metadata: metadata || {},
            createdBy: req.userId
        });

        const savedSalesType = await newSalesType.save();

        res.status(201).json({
            message: "Tipo de venta creado correctamente",
            data: savedSalesType,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createSalesTypeController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get all sales types
 */
async function getAllSalesTypesController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { includeInactive = false } = req.query;

        let query = {};
        if (!includeInactive) {
            query.isActive = true;
        }

        const salesTypes = await SalesTypeModel.find(query)
            .populate('createdBy', 'name email')
            .sort({ 'metadata.sortOrder': 1, name: 1 });

        res.json({
            message: "Lista de tipos de venta",
            data: salesTypes,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getAllSalesTypesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get sales type by ID
 */
async function getSalesTypeByIdController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salesTypeId } = req.params;

        const salesType = await SalesTypeModel.findById(salesTypeId)
            .populate('createdBy', 'name email');

        if (!salesType) {
            return res.status(404).json({
                message: "Tipo de venta no encontrado",
                error: true,
                success: false
            });
        }

        res.json({
            message: "Detalles del tipo de venta",
            data: salesType,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getSalesTypeByIdController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Update sales type
 */
async function updateSalesTypeController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salesTypeId } = req.params;
        const { name, description, metadata, isActive } = req.body;

        const salesType = await SalesTypeModel.findById(salesTypeId);
        if (!salesType) {
            return res.status(404).json({
                message: "Tipo de venta no encontrado",
                error: true,
                success: false
            });
        }

        // Check if name is being changed and if it already exists
        if (name && name.trim() !== salesType.name) {
            const existingType = await SalesTypeModel.findOne({ 
                name: name.trim(),
                isActive: true,
                _id: { $ne: salesTypeId }
            });

            if (existingType) {
                return res.status(400).json({
                    message: "Ya existe un tipo de venta con este nombre",
                    error: true,
                    success: false
                });
            }
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (metadata) updateData.metadata = { ...salesType.metadata, ...metadata };
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedSalesType = await SalesTypeModel.findByIdAndUpdate(
            salesTypeId,
            updateData,
            { new: true }
        ).populate('createdBy', 'name email');

        res.json({
            message: "Tipo de venta actualizado correctamente",
            data: updatedSalesType,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en updateSalesTypeController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Delete sales type (soft delete)
 */
async function deleteSalesTypeController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salesTypeId } = req.params;

        const salesType = await SalesTypeModel.findById(salesTypeId);
        if (!salesType) {
            return res.status(404).json({
                message: "Tipo de venta no encontrado",
                error: true,
                success: false
            });
        }

        // Check if sales type is being used in any sales
        const SaleModel = require('../../models/saleModel');
        const salesUsingType = await SaleModel.countDocuments({ 
            saleType: salesTypeId,
            isActive: true 
        });

        if (salesUsingType > 0) {
            return res.status(400).json({
                message: `No se puede eliminar este tipo de venta porque está siendo usado en ${salesUsingType} venta(s)`,
                error: true,
                success: false
            });
        }

        await salesType.softDelete();

        res.json({
            message: "Tipo de venta eliminado correctamente",
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en deleteSalesTypeController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get active sales types for dropdowns
 */
async function getActiveSalesTypesController(req, res) {
    try {
        const salesTypes = await SalesTypeModel.getActiveTypes();

        res.json({
            message: "Tipos de venta activos",
            data: salesTypes,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getActiveSalesTypesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

module.exports = {
    createSalesTypeController,
    getAllSalesTypesController,
    getSalesTypeByIdController,
    updateSalesTypeController,
    deleteSalesTypeController,
    getActiveSalesTypesController
};

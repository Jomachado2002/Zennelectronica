const SalespersonModel = require('../../models/salespersonModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Create a new salesperson
 */
async function createSalespersonController(req, res) {
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
            name, 
            document, 
            documentType = 'CI',
            phone, 
            email, 
            address,
            commissionRate = 0,
            metadata,
            isManager = false
        } = req.body;

        if (!name || !document) {
            return res.status(400).json({
                message: "Nombre y documento son requeridos",
                error: true,
                success: false
            });
        }

        // Check if salesperson document already exists
        const existingSalesperson = await SalespersonModel.findOne({ 
            document: document.trim(),
            isActive: true 
        });

        if (existingSalesperson) {
            return res.status(400).json({
                message: "Ya existe un vendedor con este documento",
                error: true,
                success: false
            });
        }

        const newSalesperson = new SalespersonModel({
            name: name.trim(),
            document: document.trim(),
            documentType,
            phone: phone?.trim() || '',
            email: email?.trim() || '',
            address: {
                street: address?.street?.trim() || '',
                city: address?.city?.trim() || '',
                state: address?.state?.trim() || '',
                zip: address?.zip?.trim() || '',
                country: address?.country?.trim() || 'Paraguay'
            },
            commissionRate: Math.max(0, Math.min(100, commissionRate)),
            isManager,
            metadata: metadata || {},
            createdBy: req.userId
        });

        const savedSalesperson = await newSalesperson.save();

        res.status(201).json({
            message: "Vendedor creado correctamente",
            data: savedSalesperson,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createSalespersonController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get all salespersons
 */
async function getAllSalespersonsController(req, res) {
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

        const salespersons = await SalespersonModel.find(query)
            .populate('createdBy', 'name email')
            .sort({ name: 1 });

        res.json({
            message: "Lista de vendedores",
            data: salespersons,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getAllSalespersonsController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get salesperson by ID
 */
async function getSalespersonByIdController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salespersonId } = req.params;

        const salesperson = await SalespersonModel.findById(salespersonId)
            .populate('createdBy', 'name email');

        if (!salesperson) {
            return res.status(404).json({
                message: "Vendedor no encontrado",
                error: true,
                success: false
            });
        }

        res.json({
            message: "Detalles del vendedor",
            data: salesperson,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getSalespersonByIdController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Update salesperson
 */
async function updateSalespersonController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salespersonId } = req.params;
        const { 
            name, 
            document, 
            documentType,
            phone, 
            email, 
            address,
            commissionRate,
            metadata,
            isActive,
            isManager
        } = req.body;

        const salesperson = await SalespersonModel.findById(salespersonId);
        if (!salesperson) {
            return res.status(404).json({
                message: "Vendedor no encontrado",
                error: true,
                success: false
            });
        }

        // Check if document is being changed and if it already exists
        if (document && document.trim() !== salesperson.document) {
            const existingSalesperson = await SalespersonModel.findOne({ 
                document: document.trim(),
                isActive: true,
                _id: { $ne: salespersonId }
            });

            if (existingSalesperson) {
                return res.status(400).json({
                    message: "Ya existe un vendedor con este documento",
                    error: true,
                    success: false
                });
            }
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (document) updateData.document = document.trim();
        if (documentType) updateData.documentType = documentType;
        if (phone !== undefined) updateData.phone = phone.trim();
        if (email !== undefined) updateData.email = email.trim();
        if (address) updateData.address = { ...salesperson.address, ...address };
        if (commissionRate !== undefined) updateData.commissionRate = Math.max(0, Math.min(100, commissionRate));
        if (metadata) updateData.metadata = { ...salesperson.metadata, ...metadata };
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isManager !== undefined) updateData.isManager = isManager;

        const updatedSalesperson = await SalespersonModel.findByIdAndUpdate(
            salespersonId,
            updateData,
            { new: true }
        ).populate('createdBy', 'name email');

        res.json({
            message: "Vendedor actualizado correctamente",
            data: updatedSalesperson,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en updateSalespersonController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Delete salesperson (soft delete)
 */
async function deleteSalespersonController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salespersonId } = req.params;

        const salesperson = await SalespersonModel.findById(salespersonId);
        if (!salesperson) {
            return res.status(404).json({
                message: "Vendedor no encontrado",
                error: true,
                success: false
            });
        }

        // Check if salesperson is being used in any sales
        const SaleModel = require('../../models/saleModel');
        const salesUsingSalesperson = await SaleModel.countDocuments({ 
            salesperson: salespersonId,
            isActive: true 
        });

        if (salesUsingSalesperson > 0) {
            return res.status(400).json({
                message: `No se puede eliminar este vendedor porque está siendo usado en ${salesUsingSalesperson} venta(s)`,
                error: true,
                success: false
            });
        }

        await salesperson.softDelete();

        res.json({
            message: "Vendedor eliminado correctamente",
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en deleteSalespersonController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Search salespersons
 */
async function searchSalespersonsController(req, res) {
    try {
        const { query } = req.query;

        if (!query || query.trim() === '') {
            return res.status(400).json({
                message: "Query de búsqueda es requerido",
                error: true,
                success: false
            });
        }

        const salespersons = await SalespersonModel.searchSalespersons(query.trim());

        res.json({
            message: "Resultados de búsqueda de vendedores",
            data: salespersons,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en searchSalespersonsController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get active salespersons for dropdowns
 */
async function getActiveSalespersonsController(req, res) {
    try {
        const salespersons = await SalespersonModel.getActiveSalespersons();

        res.json({
            message: "Vendedores activos",
            data: salespersons,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getActiveSalespersonsController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Update salesperson performance
 */
async function updateSalespersonPerformanceController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { salespersonId } = req.params;
        const { saleAmount, commissionAmount } = req.body;

        const salesperson = await SalespersonModel.findById(salespersonId);
        if (!salesperson) {
            return res.status(404).json({
                message: "Vendedor no encontrado",
                error: true,
                success: false
            });
        }

        await salesperson.updatePerformance(saleAmount || 0, commissionAmount || 0);

        res.json({
            message: "Rendimiento del vendedor actualizado",
            data: salesperson,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en updateSalespersonPerformanceController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

module.exports = {
    createSalespersonController,
    getAllSalespersonsController,
    getSalespersonByIdController,
    updateSalespersonController,
    deleteSalespersonController,
    searchSalespersonsController,
    getActiveSalespersonsController,
    updateSalespersonPerformanceController
};

const BranchModel = require('../../models/branchModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Create a new branch
 */
async function createBranchController(req, res) {
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
            code, 
            address, 
            contact, 
            metadata,
            isMainBranch = false 
        } = req.body;

        if (!name || !code || !address) {
            return res.status(400).json({
                message: "Nombre, código y dirección son requeridos",
                error: true,
                success: false
            });
        }

        // Check if branch code already exists
        const existingBranch = await BranchModel.findOne({ 
            code: code.trim().toUpperCase(),
            isActive: true 
        });

        if (existingBranch) {
            return res.status(400).json({
                message: "Ya existe una sucursal con este código",
                error: true,
                success: false
            });
        }

        // If setting as main branch, unset others
        if (isMainBranch) {
            await BranchModel.updateMany(
                { isMainBranch: true, isActive: true },
                { isMainBranch: false }
            );
        }

        const newBranch = new BranchModel({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            address: {
                street: address.street?.trim() || '',
                city: address.city?.trim() || '',
                state: address.state?.trim() || '',
                zip: address.zip?.trim() || '',
                country: address.country?.trim() || 'Paraguay'
            },
            contact: {
                phone: contact?.phone?.trim() || '',
                email: contact?.email?.trim() || '',
                manager: contact?.manager?.trim() || ''
            },
            isMainBranch,
            metadata: metadata || {},
            createdBy: req.userId
        });

        const savedBranch = await newBranch.save();

        res.status(201).json({
            message: "Sucursal creada correctamente",
            data: savedBranch,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createBranchController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get all branches
 */
async function getAllBranchesController(req, res) {
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

        const branches = await BranchModel.find(query)
            .populate('createdBy', 'name email')
            .sort({ 'metadata.sortOrder': 1, name: 1 });

        res.json({
            message: "Lista de sucursales",
            data: branches,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getAllBranchesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get branch by ID
 */
async function getBranchByIdController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { branchId } = req.params;

        const branch = await BranchModel.findById(branchId)
            .populate('createdBy', 'name email');

        if (!branch) {
            return res.status(404).json({
                message: "Sucursal no encontrada",
                error: true,
                success: false
            });
        }

        res.json({
            message: "Detalles de la sucursal",
            data: branch,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getBranchByIdController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Update branch
 */
async function updateBranchController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { branchId } = req.params;
        const { 
            name, 
            code, 
            address, 
            contact, 
            metadata, 
            isActive,
            isMainBranch = false 
        } = req.body;

        const branch = await BranchModel.findById(branchId);
        if (!branch) {
            return res.status(404).json({
                message: "Sucursal no encontrada",
                error: true,
                success: false
            });
        }

        // Check if code is being changed and if it already exists
        if (code && code.trim().toUpperCase() !== branch.code) {
            const existingBranch = await BranchModel.findOne({ 
                code: code.trim().toUpperCase(),
                isActive: true,
                _id: { $ne: branchId }
            });

            if (existingBranch) {
                return res.status(400).json({
                    message: "Ya existe una sucursal con este código",
                    error: true,
                    success: false
                });
            }
        }

        // If setting as main branch, unset others
        if (isMainBranch && !branch.isMainBranch) {
            await BranchModel.updateMany(
                { isMainBranch: true, isActive: true, _id: { $ne: branchId } },
                { isMainBranch: false }
            );
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (code) updateData.code = code.trim().toUpperCase();
        if (address) updateData.address = { ...branch.address, ...address };
        if (contact) updateData.contact = { ...branch.contact, ...contact };
        if (metadata) updateData.metadata = { ...branch.metadata, ...metadata };
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isMainBranch !== undefined) updateData.isMainBranch = isMainBranch;

        const updatedBranch = await BranchModel.findByIdAndUpdate(
            branchId,
            updateData,
            { new: true }
        ).populate('createdBy', 'name email');

        res.json({
            message: "Sucursal actualizada correctamente",
            data: updatedBranch,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en updateBranchController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Delete branch (soft delete)
 */
async function deleteBranchController(req, res) {
    try {
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                error: true,
                success: false
            });
        }

        const { branchId } = req.params;

        const branch = await BranchModel.findById(branchId);
        if (!branch) {
            return res.status(404).json({
                message: "Sucursal no encontrada",
                error: true,
                success: false
            });
        }

        // Check if branch is being used in any sales
        const SaleModel = require('../../models/saleModel');
        const salesUsingBranch = await SaleModel.countDocuments({ 
            branch: branchId,
            isActive: true 
        });

        if (salesUsingBranch > 0) {
            return res.status(400).json({
                message: `No se puede eliminar esta sucursal porque está siendo usada en ${salesUsingBranch} venta(s)`,
                error: true,
                success: false
            });
        }

        await branch.softDelete();

        res.json({
            message: "Sucursal eliminada correctamente",
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en deleteBranchController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get active branches for dropdowns
 */
async function getActiveBranchesController(req, res) {
    try {
        const branches = await BranchModel.getActiveBranches();

        res.json({
            message: "Sucursales activas",
            data: branches,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getActiveBranchesController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * Get main branch
 */
async function getMainBranchController(req, res) {
    try {
        const branch = await BranchModel.getMainBranch();

        if (!branch) {
            return res.status(404).json({
                message: "No se encontró sucursal principal",
                error: true,
                success: false
            });
        }

        res.json({
            message: "Sucursal principal",
            data: branch,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getMainBranchController:", err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

module.exports = {
    createBranchController,
    getAllBranchesController,
    getBranchByIdController,
    updateBranchController,
    deleteBranchController,
    getActiveBranchesController,
    getMainBranchController
};

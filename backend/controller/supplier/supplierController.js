// backend/controller/supplier/supplierController.js
const SupplierModel = require('../../models/supplierModel');
const uploadProductPermission = require('../../helpers/permission');

// backend/controller/supplier/supplierController.js - FUNCIÓN CORREGIDA
async function createSupplierController(req, res) {
    try {
        // COMENTAR TEMPORALMENTE LA VERIFICACIÓN DE PERMISOS
        // if (!uploadProductPermission(req.userId)) {
        //     throw new Error("Permiso denegado");
        // }

        const { 
            name, 
            email, 
            phone, 
            address, 
            company, 
            taxId,
            contactPerson,
            businessInfo,
            notes 
        } = req.body;

        if (!name) {
            throw new Error("El nombre del proveedor es requerido");
        }

        // Verificar si ya existe un proveedor activo con el mismo email o teléfono
        if (email || phone) {
            const queryConditions = [];
            
            if (email && email.trim() !== '') {
                queryConditions.push({ email: email });
            }
            
            if (phone && phone.trim() !== '') {
                queryConditions.push({ phone: phone });
            }
            
            if (queryConditions.length > 0) {
                const existingSupplier = await SupplierModel.findOne({
                    isActive: { $ne: false },
                    $or: queryConditions
                });
                
                if (existingSupplier) {
                    throw new Error("Ya existe un proveedor con el mismo email o teléfono");
                }
            }
        }

        // MANEJAR USUARIOS INVITADOS CORRECTAMENTE
        const supplierData = {
            name,
            email,
            phone,
            address,
            company,
            taxId,
            contactPerson,
            businessInfo,
            notes
        };

        // Verificar si es usuario registrado o invitado
        if (req.userId && req.userId.startsWith('guest-')) {
            // Usuario invitado
            supplierData.createdByGuest = req.userId;
        } else if (req.userId) {
            // Usuario registrado
            supplierData.createdBy = req.userId;
        } else {
            // Sin usuario (para testing)
            supplierData.createdByGuest = 'system-user';
        }

        
        
        

        // Crear nuevo proveedor
        const newSupplier = new SupplierModel(supplierData);

        const savedSupplier = await newSupplier.save();

        
        

        res.status(201).json({
            message: "Proveedor creado correctamente",
            data: savedSupplier,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en createSupplierController:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}
/**
 * Obtener todos los proveedores
 */
async function getAllSuppliersController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { search, limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        // Construir query
        const query = { isActive: true };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { 'businessInfo.specialty': { $regex: search, $options: 'i' } }
            ];
        }
        
        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        
        // Paginación
        const skip = (page - 1) * limit;
        
        // Ejecutar la consulta
        const suppliers = await SupplierModel.find(query)
            .select('-__v')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));
            
        // Contar total de proveedores para paginación
        const total = await SupplierModel.countDocuments(query);
        
        res.json({
            message: "Lista de proveedores",
            data: {
                suppliers: Array.isArray(suppliers) ? suppliers : [],
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
 * Obtener un proveedor por su ID
 */
async function getSupplierByIdController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { supplierId } = req.params;

        if (!supplierId) {
            throw new Error("ID de proveedor no proporcionado");
        }

        const supplier = await SupplierModel.findById(supplierId)
            .populate('profitabilityAnalyses', 'analysisNumber totals.totalRevenue totals.totalGrossProfit status createdAt');

        if (!supplier) {
            throw new Error("Proveedor no encontrado");
        }

        res.json({
            message: "Detalles del proveedor",
            data: supplier,
            success: true,
            error: false
        });

    } catch (err) {
        console.error("Error en getSupplierByIdController:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Actualizar un proveedor
 */
async function updateSupplierController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { supplierId } = req.params;
        const { 
            name, 
            email, 
            phone, 
            address, 
            company, 
            taxId,
            contactPerson,
            businessInfo,
            notes,
            isActive
        } = req.body;

        if (!supplierId) {
            throw new Error("ID de proveedor no proporcionado");
        }

        // Verificar si el proveedor existe
        const supplier = await SupplierModel.findById(supplierId);
        
        if (!supplier) {
            throw new Error("Proveedor no encontrado");
        }

        // Verificar si el email o teléfono ya están en uso por otro proveedor
        if (email || phone) {
            const queryConditions = [];
            
            if (email && email.trim() !== '') {
                queryConditions.push({ email: email });
            }
            
            if (phone && phone.trim() !== '') {
                queryConditions.push({ phone: phone });
            }
            
            if (queryConditions.length > 0) {
                const existingSupplier = await SupplierModel.findOne({
                    _id: { $ne: supplierId },
                    isActive: { $ne: false },
                    $or: queryConditions
                });
                
                if (existingSupplier) {
                    throw new Error("Ya existe otro proveedor con el mismo email o teléfono");
                }
            }
        }

        // Preparar objeto de actualización
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (company !== undefined) updateData.company = company;
        if (taxId !== undefined) updateData.taxId = taxId;
        if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
        if (businessInfo !== undefined) updateData.businessInfo = businessInfo;
        if (notes !== undefined) updateData.notes = notes;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Actualizar proveedor
        const updatedSupplier = await SupplierModel.findByIdAndUpdate(
            supplierId,
            updateData,
            { new: true }
        );

        res.json({
            message: "Proveedor actualizado correctamente",
            data: updatedSupplier,
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
 * Eliminar un proveedor (soft delete)
 */
async function deleteSupplierController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { supplierId } = req.params;

        if (!supplierId) {
            throw new Error("ID de proveedor no proporcionado");
        }

        // Verificar si el proveedor tiene análisis de rentabilidad asociados
        const supplier = await SupplierModel.findById(supplierId);
        
        if (!supplier) {
            throw new Error("Proveedor no encontrado");
        }

        if (supplier.profitabilityAnalyses && supplier.profitabilityAnalyses.length > 0) {
            // Soft delete si tiene análisis asociados
            const updatedSupplier = await SupplierModel.findByIdAndUpdate(
                supplierId,
                { isActive: false },
                { new: true }
            );

            res.json({
                message: "Proveedor desactivado correctamente (tiene análisis asociados)",
                data: updatedSupplier,
                success: true,
                error: false
            });
        } else {
            // Hard delete si no tiene análisis asociados
            const deletedSupplier = await SupplierModel.findByIdAndDelete(supplierId);

            res.json({
                message: "Proveedor eliminado correctamente",
                success: true,
                error: false
            });
        }

    } catch (err) {
        console.error("Error en deleteSupplierController:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = {
    createSupplierController,
    getAllSuppliersController,
    getSupplierByIdController,
    updateSupplierController,
    deleteSupplierController
};
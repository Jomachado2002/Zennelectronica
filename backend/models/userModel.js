// backend/models/userModel.js - VERSIÓN CON BANCARD USER ID MEJORADO Y CORREGIDA
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    profilePic: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['ROOT', 'ADMIN', 'GENERAL'],
        default: 'GENERAL'
    },
    
    // ✅ SISTEMA DE PERMISOS GRANULAR
    permissions: {
        // Panel de administración
        adminPanel: {
            type: Boolean,
            default: false
        },
        
        // Gestión de productos
        products: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            upload: { type: Boolean, default: false }
        },
        
        // Gestión de categorías
        categories: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión de inventario
        inventory: {
            view: { type: Boolean, default: false },
            sync: { type: Boolean, default: false },
            update: { type: Boolean, default: false },
            import: { type: Boolean, default: false }
        },
        
        // Gestión de usuarios
        users: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión financiera
        finances: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            reports: { type: Boolean, default: false }
        },
        
        // Gestión de ventas
        sales: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión de compras
        purchases: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión de clientes
        clients: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión de proveedores
        suppliers: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión de presupuestos
        budgets: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Gestión de transacciones Bancard
        bancard: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        
        // Configuración del sistema
        settings: {
            view: { type: Boolean, default: false },
            edit: { type: Boolean, default: false }
        }
    },
    
    // ✅ CAMPOS PARA PERFIL
    address: {
        street: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        zipCode: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            default: 'Paraguay',
            trim: true
        }
    },
    
    dateOfBirth: {
        type: Date
    },
    
    // ✅ CAMPOS PARA RECUPERACIÓN DE CONTRASEÑA
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },
    
    // ✅ CAMPOS PARA BANCARD - MEJORADOS
    bancardUserId: {
        type: Number, // ID único numérico para Bancard
        sparse: true // Permite valores null/undefined únicos
    },
    
    // ✅ INFORMACIÓN ADICIONAL
    isActive: {
        type: Boolean,
        default: true
    },
    
    lastLogin: {
        type: Date
    },
    
    emailVerified: {
        type: Boolean,
        default: false
    },
    
    emailVerificationToken: {
        type: String
    },
    
    // ✅ CAMPO LOCATION CORREGIDO - MOVIDO FUERA DE ADDRESS
    location: {
        lat: { 
            type: Number,
            min: -90,
            max: 90
        },
        lng: { 
            type: Number,
            min: -180,
            max: 180
        },
        address: {
            type: String,
            trim: true
        },
        googleMapsUrl: {
            type: String,
            trim: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }
    
}, {
    timestamps: true
});

// ✅ MIDDLEWARE PARA ASIGNAR PERMISOS POR DEFECTO
userSchema.pre('save', async function(next) {
    // Asignar permisos por defecto según el rol si no existen
    if (this.isNew && !this.permissions) {
        this.permissions = this.constructor.getDefaultPermissions(this.role);
    }

    // Si cambió el rol, alinear permisos con la plantilla del nuevo rol (clon profundo).
    // Importante: antes se "fusionaba" solo lo faltante; un GENERAL ya tenía `products: { view:false,... }`
    // y al subir a ADMIN ese objeto existía → no se pisaba y quedaba todo en false → "permiso denegado".
    if (this.isModified('role')) {
        const defaults = this.constructor.getDefaultPermissions(this.role);
        this.permissions = JSON.parse(JSON.stringify(defaults));
        this.markModified('permissions');
    }

    next();
});

// ✅ MIDDLEWARE MEJORADO PARA GENERAR bancardUserId
userSchema.pre('save', async function(next) {
    // Solo generar bancardUserId si es un nuevo usuario y no tiene uno
    if (this.isNew && !this.bancardUserId) {
        try {
            
            
            let isUnique = false;
            let newBancardUserId;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!isUnique && attempts < maxAttempts) {
                // ✅ GENERAR NÚMERO ENTRE 100000 y 999999 (6 dígitos)
                // Esto es más seguro y evita conflictos
                newBancardUserId = Math.floor(100000 + Math.random() * 900000);
                
                // Verificar que no existe
                const existingUser = await this.constructor.findOne({ 
                    bancardUserId: newBancardUserId 
                });
                
                if (!existingUser) {
                    isUnique = true;
                } else {
                    attempts++;
                    
                }
            }
            
            if (isUnique) {
                this.bancardUserId = newBancardUserId;
                
            } else {
                // console.error removed for production
                // En caso de emergencia, usar timestamp
                this.bancardUserId = parseInt(Date.now().toString().slice(-6));
                
            }
        } catch (error) {
            // console.error removed for production
            // Fallback: usar timestamp truncado
            this.bancardUserId = parseInt(Date.now().toString().slice(-6));
        }
    }
    next();
});

// ✅ PERMISOS POR DEFECTO SEGÚN ROL
userSchema.statics.getDefaultPermissions = function(role) {
    const defaultPermissions = {
        ROOT: {
            adminPanel: true,
            products: { view: true, create: true, edit: true, delete: true, upload: true },
            categories: { view: true, create: true, edit: true, delete: true },
            inventory: { view: true, sync: true, update: true, import: true },
            users: { view: true, create: true, edit: true, delete: true },
            finances: { view: true, create: true, edit: true, reports: true },
            sales: { view: true, create: true, edit: true, delete: true },
            purchases: { view: true, create: true, edit: true, delete: true },
            clients: { view: true, create: true, edit: true, delete: true },
            suppliers: { view: true, create: true, edit: true, delete: true },
            budgets: { view: true, create: true, edit: true, delete: true },
            bancard: { view: true, create: true, edit: true, delete: true },
            settings: { view: true, edit: true }
        },
        ADMIN: {
            adminPanel: true,
            products: { view: true, create: false, edit: false, delete: false, upload: false },
            categories: { view: true, create: false, edit: false, delete: false },
            inventory: { view: true, sync: false, update: false, import: false },
            users: { view: true, create: false, edit: false, delete: false },
            finances: { view: true, create: false, edit: false, reports: false },
            sales: { view: true, create: false, edit: false, delete: false },
            purchases: { view: true, create: false, edit: false, delete: false },
            clients: { view: true, create: false, edit: false, delete: false },
            suppliers: { view: true, create: false, edit: false, delete: false },
            budgets: { view: true, create: false, edit: false, delete: false },
            bancard: { view: true, create: false, edit: false, delete: false },
            settings: { view: false, edit: false }
        },
        GENERAL: {
            adminPanel: false,
            products: { view: false, create: false, edit: false, delete: false, upload: false },
            categories: { view: false, create: false, edit: false, delete: false },
            inventory: { view: false, sync: false, update: false, import: false },
            users: { view: false, create: false, edit: false, delete: false },
            finances: { view: false, create: false, edit: false, reports: false },
            sales: { view: false, create: false, edit: false, delete: false },
            purchases: { view: false, create: false, edit: false, delete: false },
            clients: { view: false, create: false, edit: false, delete: false },
            suppliers: { view: false, create: false, edit: false, delete: false },
            budgets: { view: false, create: false, edit: false, delete: false },
            bancard: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, edit: false }
        }
    };
    
    return defaultPermissions[role] || defaultPermissions.GENERAL;
};

// ✅ MÉTODO ESTÁTICO PARA ASIGNAR bancardUserId A USUARIOS EXISTENTES
userSchema.statics.assignBancardUserIds = async function() {
    try {
        
        
        const usersWithoutBancardId = await this.find({ 
            bancardUserId: { $exists: false } 
        });
        
        
        
        for (const user of usersWithoutBancardId) {
            let isUnique = false;
            let newBancardUserId;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!isUnique && attempts < maxAttempts) {
                newBancardUserId = Math.floor(100000 + Math.random() * 900000);
                
                const existingUser = await this.findOne({ 
                    bancardUserId: newBancardUserId 
                });
                
                if (!existingUser) {
                    isUnique = true;
                } else {
                    attempts++;
                }
            }
            
            if (isUnique) {
                await this.findByIdAndUpdate(user._id, { 
                    bancardUserId: newBancardUserId 
                });
                
            } else {
                const emergencyId = parseInt(Date.now().toString().slice(-6));
                await this.findByIdAndUpdate(user._id, { 
                    bancardUserId: emergencyId 
                });
                
            }
        }
        
        
        return true;
    } catch (error) {
        // console.error removed for production
        return false;
    }
};

// ✅ MÉTODOS VIRTUALES
userSchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    
    const parts = [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.zipCode,
        this.address.country
    ].filter(Boolean);
    
    return parts.join(', ');
});

// ✅ MÉTODOS DE INSTANCIA
userSchema.methods.toPublicJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.resetPasswordToken;
    delete userObject.resetPasswordExpires;
    delete userObject.emailVerificationToken;
    return userObject;
};

// ✅ MÉTODOS ESTÁTICOS
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
    return this.find({ isActive: true });
};

userSchema.statics.findByBancardUserId = function(bancardUserId) {
    return this.findOne({ bancardUserId: parseInt(bancardUserId) });
};

// ✅ ÍNDICES PARA MEJORAR RENDIMIENTO
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ bancardUserId: 1 }, { unique: true, sparse: true });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ createdAt: 1 });

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
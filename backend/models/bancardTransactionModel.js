// backend/models/bancardTransactionModel.js - VERSIÓN COMPLETA CON TODOS LOS CAMPOS EXISTENTES + DELIVERY

const mongoose = require('mongoose');

const bancardTransactionSchema = mongoose.Schema({
    // ===== DATOS PRINCIPALES DE LA TRANSACCIÓN =====
    shop_process_id: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    bancard_process_id: {
        type: String,
        required: false,
        index: true
    },
    
    // ===== INFORMACIÓN FINANCIERA =====
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'PYG',
        enum: ['PYG', 'USD', 'EUR']
    },
    tax_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    number_of_payments: {
        type: Number,
        default: 1,
        min: 1
    },
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    
    // ===== TIPO DE PAGO =====
    is_token_payment: {
        type: Boolean,
        default: false,
        index: true
    },
    alias_token: {
        type: String,
        default: null,
        index: true
    },
    payment_method: {
        type: String,
        enum: ['new_card', 'saved_card', 'zimple', 'cash', 'transfer'],
        default: 'new_card',
        index: true
    },
    
    // ===== ESTADO DE LA TRANSACCIÓN =====
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'rolled_back', 'failed', 'requires_3ds', 'processing', 'cancelled'],
        default: 'pending',
        index: true
    },
    
    // ===== RESPUESTA DE BANCARD =====
    response: {
        type: String,
        enum: ['S', 'N', null],
        default: null
    },
    response_code: {
        type: String,
        default: null
    },
    response_description: {
        type: String,
        default: null
    },
    extended_response_description: {
        type: String,
        default: null
    },
    authorization_number: {
        type: String,
        default: null,
        index: true
    },
    ticket_number: {
        type: String,
        default: null,
        index: true
    },
    
    // ===== INFORMACIÓN DEL CLIENTE - COMPLETA =====
    customer_info: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // ===== ITEMS DEL CARRITO - COMPLETO =====
    items: [{
        product_id: {
            type: String,
            required: false
        },
        name: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            required: false,
            min: 0,
            default: 1
        },
        unit_price: {
            type: Number,
            required: false,
            min: 0,
            default: 0
        },
        unitPrice: {
            type: Number,
            required: false,
            min: 0,
            default: 0
        },
        total: {
            type: Number,
            required: false,
            min: 0,
            default: 0
        },
        category: {
            type: String,
            required: false
        },
        brand: {
            type: String,
            required: false
        },
        sku: {
            type: String,
            required: false
        }
    }],
    
    // ===== INFORMACIÓN DE SEGURIDAD =====
    security_information: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // ===== TRACKING Y ANÁLISIS =====
    user_type: {
        type: String,
        enum: ['GUEST', 'REGISTERED', 'PREMIUM', 'VIP'],
        default: 'GUEST',
        index: true
    },
    user_bancard_id: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        index: true
    },
    ip_address: {
        type: String,
        required: false
    },
    user_agent: {
        type: String,
        required: false,
        maxlength: 1000
    },
    device_type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
    },
    browser_info: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // ===== INFORMACIÓN DE SESIÓN =====
    payment_session_id: {
        type: String,
        required: false,
        index: true
    },
    cart_total_items: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // ===== INFORMACIÓN DE ORIGEN =====
    referrer_url: {
        type: String,
        required: false,
        maxlength: 1000
    },
    landing_page: {
        type: String,
        required: false
    },
    
    // ===== MARKETING Y UTM =====
    utm_source: {
        type: String,
        required: false,
        maxlength: 200
    },
    utm_medium: {
        type: String,
        required: false,
        maxlength: 200
    },
    utm_campaign: {
        type: String,
        required: false,
        maxlength: 200
    },
    utm_term: {
        type: String,
        required: false,
        maxlength: 200
    },
    utm_content: {
        type: String,
        required: false,
        maxlength: 200
    },
    
    // ===== INFORMACIÓN DE ENTREGA =====
    delivery_method: {
        type: String,
        enum: ['pickup', 'delivery', 'shipping', 'digital'],
        default: 'pickup'
    },
    delivery_address: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    estimated_delivery: {
        type: Date,
        required: false
    },
    
    // ===== UBICACIÓN DE ENTREGA CON GOOGLE MAPS =====
    delivery_location: {
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
        manual_address: {
            type: String,
            trim: true
        },
        full_address: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        house_number: {
            type: String,
            trim: true
        },
        reference: {
            type: String,
            trim: true
        },
        source: {
            type: String,
            default: 'user_selected'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        google_maps_url: {
            type: String,
            trim: true
        },
        google_maps_alternative_url: {
            type: String,
            trim: true
        },
        navigation_url: {
            type: String,
            trim: true
        },
        coordinates_string: {
            type: String,
            trim: true
        },
        delivery_instructions: {
            type: String,
            maxlength: 2000
        }
    },
    
    // ===== INFORMACIÓN ADICIONAL =====
    order_notes: {
        type: String,
        required: false,
        maxlength: 1000
    },
    invoice_number: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    receipt_url: {
        type: String,
        required: false
    },
    
    // ===== URLs DE REDIRECCIÓN =====
    return_url: {
        type: String,
        required: false,
        maxlength: 1000
    },
    cancel_url: {
        type: String,
        required: false,
        maxlength: 1000
    },
    
    // ===== INFORMACIÓN DE ROLLBACK =====
    is_rolled_back: {
        type: Boolean,
        default: false,
        index: true
    },
    rollback_date: {
        type: Date,
        default: null
    },
    rollback_reason: {
        type: String,
        required: false,
        maxlength: 500
    },
    rollback_by: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        default: null
    },
    
    // ===== RELACIONES =====
    sale_id: {
        type: mongoose.Schema.ObjectId,
        ref: 'Sale',
        default: null,
        index: true
    },
    created_by: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        index: true
    },
    
    // ===== FECHAS IMPORTANTES =====
    transaction_date: {
        type: Date,
        default: Date.now,
        index: true
    },
    confirmation_date: {
        type: Date,
        default: null
    },
    
    // ===== CONTROL DE CALIDAD =====
    bancard_confirmed: {
        type: Boolean,
        default: false,
        index: true
    },
    
    // ===== CONFIGURACIÓN DE ENTORNO =====
    environment: {
        type: String,
        enum: ['staging', 'production'],
        default: 'staging',
        index: true
    },
    is_certification_test: {
        type: Boolean,
        default: false,
        index: true
    },
    
    // ===== SOPORTE PARA 3DS =====
    requires_3ds: {
        type: Boolean,
        default: false
    },
    iframe_url: {
        type: String,
        default: null
    },
    three_ds_version: {
        type: String,
        enum: ['1.0', '2.0', '2.1', '2.2', null],
        default: null
    },
    
    // ===== ANÁLISIS Y REPORTES =====
    conversion_data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // ===== DATOS ADICIONALES FLEXIBLES =====
    additional_data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // ===== METADATOS DE AUDITORÍA =====
    last_updated_by: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        default: null
    },
    update_history: [{
        updated_by: {
            type: mongoose.Schema.ObjectId,
            ref: 'user'
        },
        updated_at: {
            type: Date,
            default: Date.now
        },
        changes: {
            type: mongoose.Schema.Types.Mixed
        },
        reason: String
    }],
    
    
    // ===== 🚀 NUEVOS CAMPOS PARA SISTEMA DE DELIVERY COMO EBAY =====
    delivery_status: {
        type: String,
        enum: [
            'payment_confirmed',  // ✅ Pago Confirmado (automático)
            'preparing_order',    // 📦 Preparando Pedido
            'in_transit',        // 🚚 En Camino  
            'delivered',         // 📍 Entregado
            'problem'            // ❌ Problema/Devuelto
        ],
        default: 'payment_confirmed',
        index: true
    },
    
    delivery_timeline: [{
        status: {
            type: String,
            enum: ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered', 'problem']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        updated_by: {
            type: mongoose.Schema.ObjectId,
            ref: 'user',
            required: false
        },
        notes: {
            type: String,
            maxlength: 500
        },
        automatic: {
            type: Boolean,
            default: false // true si fue automático (ej: pago confirmado)
        }
    }],
    
    estimated_delivery_date: {
        type: Date,
        required: false
    },
    
    actual_delivery_date: {
        type: Date,
        required: false
    },
    
    tracking_number: {
        type: String,
        required: false,
        trim: true,
        index: true
    },
    
    courier_company: {
        type: String,
        required: false,
        trim: true,
        enum: ['Courier Interno', 'Servientrega', 'DHL', 'FedEx', 'Otro', '']
    },
    
    delivery_notes: {
        type: String,
        maxlength: 1000,
        trim: true
    },
    
    delivery_updated_by: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        required: false
    },
    
    delivery_updated_at: {
        type: Date,
        default: Date.now
    },
    
    // ===== NOTIFICACIONES ENVIADAS =====
    notifications_sent: [{
        type: {
            type: String,
            enum: ['email', 'sms', 'push']
        },
        status: String, // el estado que desencadenó la notificación
        sent_at: {
            type: Date,
            default: Date.now
        },
        success: {
            type: Boolean,
            default: true
        },
        error_message: String
    }],
    
    // ===== INFORMACIÓN DE ENTREGA DETALLADA =====
    delivery_attempt_count: {
        type: Number,
        default: 0,
        min: 0
    },
    
    delivery_attempts: [{
        attempt_date: Date,
        status: {
            type: String,
            enum: ['successful', 'failed', 'customer_not_available', 'address_issue']
        },
        notes: String,
        next_attempt_date: Date
    }],
    
    delivery_photos: [{
        url: String,
        description: String,
        uploaded_at: {
            type: Date,
            default: Date.now
        }
    }],
    
    customer_satisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        submitted_at: Date
    }
    
}, {
    timestamps: true,
    collection: 'bancard_transactions',
    strict: false
});

// ===== ÍNDICES EXISTENTES =====
bancardTransactionSchema.index({ shop_process_id: 1, status: 1 });
bancardTransactionSchema.index({ created_by: 1, status: 1, createdAt: -1 });
bancardTransactionSchema.index({ user_bancard_id: 1, is_token_payment: 1 });
bancardTransactionSchema.index({ authorization_number: 1, ticket_number: 1 });
bancardTransactionSchema.index({ environment: 1, is_certification_test: 1 });
bancardTransactionSchema.index({ payment_method: 1, device_type: 1 });
bancardTransactionSchema.index({ 'customer_info.email': 1, status: 1 });
bancardTransactionSchema.index({ invoice_number: 1 }, { sparse: true });

// ===== NUEVOS ÍNDICES PARA DELIVERY =====
bancardTransactionSchema.index({ delivery_status: 1, createdAt: -1 });
bancardTransactionSchema.index({ estimated_delivery_date: 1 });
bancardTransactionSchema.index({ tracking_number: 1 }, { sparse: true });

// ===== MIDDLEWARE PRE-SAVE MEJORADO =====
bancardTransactionSchema.pre('save', function(next) {
    try {
        // ✅ NORMALIZAR ITEMS PARA COMPATIBILIDAD
        if (this.items && Array.isArray(this.items)) {
            this.items = this.items.map(item => {
                // Normalizar unit_price vs unitPrice
                if (item.unitPrice && !item.unit_price) {
                    item.unit_price = item.unitPrice;
                }
                if (item.unit_price && !item.unitPrice) {
                    item.unitPrice = item.unit_price;
                }
                
                // Asegurar valores por defecto
                return {
                    ...item,
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || item.unitPrice || 0,
                    unitPrice: item.unitPrice || item.unit_price || 0,
                    total: item.total || ((item.quantity || 1) * (item.unit_price || item.unitPrice || 0)),
                    name: item.name || 'Producto'
                };
            });
        }
        
        // ✅ DELIVERY TIMELINE - Si el delivery_status cambió, agregar al timeline
        if (this.isModified('delivery_status') && !this.isNew) {
            const newTimelineEntry = {
                status: this.delivery_status,
                timestamp: new Date(),
                updated_by: this.delivery_updated_by,
                notes: this.delivery_notes || '',
                automatic: false
            };
            
            // Evitar duplicados del mismo estado
            const lastEntry = this.delivery_timeline[this.delivery_timeline.length - 1];
            if (!lastEntry || lastEntry.status !== this.delivery_status) {
                this.delivery_timeline.push(newTimelineEntry);
            }
        }
        
        // ✅ Si es nuevo y está aprobado, crear timeline inicial
        if (this.isNew && this.status === 'approved') {
            this.delivery_timeline = [{
                status: 'payment_confirmed',
                timestamp: new Date(),
                automatic: true,
                notes: 'Pago confirmado por Bancard'
            }];
        }
        
        // Auto-generar invoice_number si no existe
        if (!this.invoice_number && this.status === 'approved') {
            this.invoice_number = `INV-${Date.now()}-${this.shop_process_id}`;
        }
        
        // Actualizar requires_3ds basado en el estado
        if (this.status === 'requires_3ds') {
            this.requires_3ds = true;
        }
        
        // Si hay respuesta de Bancard, marcar como confirmado
        if (this.response && this.response_code && !this.bancard_confirmed) {
            this.bancard_confirmed = true;
            
            if (!this.confirmation_date) {
                this.confirmation_date = new Date();
            }
        }
        
        next();
    } catch (error) {
        console.error('❌ Error en pre-save middleware:', error);
        next(error);
    }
});

// ===== MÉTODOS ESTÁTICOS EXISTENTES =====
bancardTransactionSchema.statics.findByShopProcessId = function(shopProcessId) {
    return this.findOne({ shop_process_id: parseInt(shopProcessId) });
};

bancardTransactionSchema.statics.findByUser = function(userId, options = {}) {
    const query = {};
    
    // ✅ MEJORAR CONSULTA POR USUARIO
    if (typeof userId === 'string' && userId.startsWith('guest-')) {
        query.created_by = userId;
    } else {
        query.$or = [
            { created_by: userId },
            { user_bancard_id: parseInt(userId) },
            { user_bancard_id: userId }
        ];
    }
    
    if (options.status) {
        query.status = options.status;
    }
    
    if (options.onlySuccessful) {
        query.$or = [
            { status: 'approved' },
            { response: 'S', response_code: '00' }
        ];
    }
    
    return this.find(query).sort({ createdAt: -1 });
};

// ===== NUEVOS MÉTODOS ESTÁTICOS PARA DELIVERY =====
bancardTransactionSchema.statics.updateDeliveryStatus = async function(transactionId, newStatus, updatedBy, notes = '', estimatedDate = null) {
    try {
        const updateData = {
            delivery_status: newStatus,
            delivery_updated_by: updatedBy,
            delivery_updated_at: new Date()
        };
        
        if (notes) updateData.delivery_notes = notes;
        if (estimatedDate) updateData.estimated_delivery_date = estimatedDate;
        if (newStatus === 'delivered') updateData.actual_delivery_date = new Date();
        
        const transaction = await this.findByIdAndUpdate(transactionId, updateData, { new: true })
            .populate('created_by', 'name email phone')
            .populate('delivery_updated_by', 'name email');
            
        return transaction;
    } catch (error) {
        throw error;
    }
};

bancardTransactionSchema.statics.getDeliveryStats = async function() {
    try {
        const stats = await this.aggregate([
            { $match: { status: 'approved' } },
            { $group: {
                _id: '$delivery_status',
                count: { $sum: 1 },
                avgDays: { $avg: { $divide: [{ $subtract: ['$actual_delivery_date', '$createdAt'] }, 86400000] } }
            }}
        ]);
        
        return stats;
    } catch (error) {
        throw error;
    }
};

// ===== MÉTODOS DE INSTANCIA =====
bancardTransactionSchema.methods.getDeliveryProgress = function() {
    const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(this.delivery_status);
    
    return {
        current: this.delivery_status,
        currentIndex,
        progress: Math.round(((currentIndex + 1) / statuses.length) * 100),
        isCompleted: this.delivery_status === 'delivered',
        timeline: this.delivery_timeline,
        estimatedDate: this.estimated_delivery_date,
        actualDate: this.actual_delivery_date
    };
};

bancardTransactionSchema.methods.addDeliveryAttempt = function(status, notes, nextAttemptDate = null) {
    this.delivery_attempt_count += 1;
    this.delivery_attempts.push({
        attempt_date: new Date(),
        status,
        notes,
        next_attempt_date: nextAttemptDate
    });
    
    return this.save();
};

const BancardTransactionModel = mongoose.model('BancardTransaction', bancardTransactionSchema);

bancardTransactionSchema.pre('save', function(next) {
    try {
        // Si el delivery_status cambió, agregar al timeline
        if (this.isModified('delivery_status') && !this.isNew) {
            const newTimelineEntry = {
                status: this.delivery_status,
                timestamp: new Date(),
                updated_by: this.delivery_updated_by,
                notes: this.delivery_notes || '',
                automatic: false
            };
            
            // Evitar duplicados del mismo estado
            const lastEntry = this.delivery_timeline[this.delivery_timeline.length - 1];
            if (!lastEntry || lastEntry.status !== this.delivery_status) {
                this.delivery_timeline.push(newTimelineEntry);
            }
        }
        
        // Si es nuevo y está aprobado, crear timeline inicial
        if (this.isNew && this.status === 'approved') {
            this.delivery_timeline = [{
                status: 'payment_confirmed',
                timestamp: new Date(),
                automatic: true,
                notes: 'Pago confirmado por Bancard'
            }];
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// ===== MÉTODOS ESTÁTICOS PARA DELIVERY =====
bancardTransactionSchema.statics.updateDeliveryStatus = async function(transactionId, newStatus, updatedBy, notes = '', estimatedDate = null) {
    try {
        const updateData = {
            delivery_status: newStatus,
            delivery_updated_by: updatedBy,
            delivery_updated_at: new Date()
        };
        
        if (notes) updateData.delivery_notes = notes;
        if (estimatedDate) updateData.estimated_delivery_date = estimatedDate;
        if (newStatus === 'delivered') updateData.actual_delivery_date = new Date();
        
        const transaction = await this.findByIdAndUpdate(transactionId, updateData, { new: true })
            .populate('created_by', 'name email phone')
            .populate('delivery_updated_by', 'name email');
            
        return transaction;
    } catch (error) {
        throw error;
    }
};

bancardTransactionSchema.statics.getDeliveryStats = async function() {
    try {
        const stats = await this.aggregate([
            { $match: { status: 'approved' } },
            { $group: {
                _id: '$delivery_status',
                count: { $sum: 1 },
                avgDays: { $avg: { $divide: [{ $subtract: ['$actual_delivery_date', '$createdAt'] }, 86400000] } }
            }}
        ]);
        
        return stats;
    } catch (error) {
        throw error;
    }
};

// ===== MÉTODOS DE INSTANCIA =====
bancardTransactionSchema.methods.getDeliveryProgress = function() {
    const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(this.delivery_status);
    
    return {
        current: this.delivery_status,
        currentIndex,
        progress: Math.round(((currentIndex + 1) / statuses.length) * 100),
        isCompleted: this.delivery_status === 'delivered',
        timeline: this.delivery_timeline,
        estimatedDate: this.estimated_delivery_date,
        actualDate: this.actual_delivery_date
    };
};

bancardTransactionSchema.methods.addDeliveryAttempt = function(status, notes, nextAttemptDate = null) {
    this.delivery_attempt_count += 1;
    this.delivery_attempts.push({
        attempt_date: new Date(),
        status,
        notes,
        next_attempt_date: nextAttemptDate
    });
    
    return this.save();
};

module.exports = BancardTransactionModel;
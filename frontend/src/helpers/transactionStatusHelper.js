// frontend/src/helpers/transactionStatusHelper.js
import { deliveryStatuses } from './deliveryHelpers';

// ✅ MAPEO CORRECTO DE ESTADOS DE TRANSACCIÓN
export const transactionStatuses = {
    pending: {
        icon: '⏳',
        title: 'Pendiente',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        textColor: 'text-yellow-800',
        description: 'Pago en proceso de verificación'
    },
    approved: {
        icon: '✅',
        title: 'Pago Aprobado',
        color: '#10b981',
        bgColor: '#d1fae5',
        textColor: 'text-green-800',
        description: 'Pago procesado exitosamente'
    },
    rejected: {
        icon: '❌',
        title: 'Pago Rechazado',
        color: '#ef4444',
        bgColor: '#fee2e2',
        textColor: 'text-red-800',
        description: 'Pago no pudo ser procesado'
    },
    rolled_back: {
        icon: '🔄',
        title: 'Pago Revertido',
        color: '#f97316',
        bgColor: '#fed7aa',
        textColor: 'text-orange-800',
        description: 'Transacción reversada'
    },
    failed: {
        icon: '⚠️',
        title: 'Pago Fallido',
        color: '#dc2626',
        bgColor: '#fecaca',
        textColor: 'text-red-800',
        description: 'Error en el procesamiento'
    },
    requires_3ds: {
        icon: '🔐',
        title: 'Verificación 3DS',
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        textColor: 'text-purple-800',
        description: 'Requiere verificación adicional'
    },
    processing: {
        icon: '🔄',
        title: 'Procesando',
        color: '#3b82f6',
        bgColor: '#dbeafe',
        textColor: 'text-blue-800',
        description: 'Transacción en proceso'
    }
};

// ✅ FUNCIÓN PRINCIPAL PARA OBTENER EL ESTADO CORRECTO
export const getTransactionDisplayStatus = (transaction) => {
    // Si el pago no está aprobado, mostrar el estado de pago
    if (transaction.status !== 'approved') {
        return {
            type: 'payment',
            status: transaction.status,
            data: transactionStatuses[transaction.status] || transactionStatuses.pending
        };
    }
    
    // Si está aprobado, mostrar el estado de delivery
    return {
        type: 'delivery',
        status: transaction.delivery_status || 'payment_confirmed',
        data: deliveryStatuses[transaction.delivery_status || 'payment_confirmed']
    };
};

// ✅ FUNCIÓN PARA OBTENER CLASE CSS CORRECTA
export const getStatusBadgeClass = (transaction) => {
    const displayStatus = getTransactionDisplayStatus(transaction);
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
    
    if (displayStatus.type === 'payment') {
        switch (displayStatus.status) {
            case 'approved':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'rejected':
            case 'failed':
                return `${baseClasses} bg-red-100 text-red-800`;
            case 'pending':
            case 'processing':
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            case 'rolled_back':
                return `${baseClasses} bg-orange-100 text-orange-800`;
            case 'requires_3ds':
                return `${baseClasses} bg-purple-100 text-purple-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    } else {
        // Para delivery status, usar los colores del deliveryHelpers
        return `${baseClasses}`;
    }
};

// ✅ FUNCIÓN PARA OBTENER ICONO CORRECTO
export const getStatusIcon = (transaction) => {
    const displayStatus = getTransactionDisplayStatus(transaction);
    return displayStatus.data.icon;
};

// ✅ FUNCIÓN PARA OBTENER TÍTULO CORRECTO
export const getStatusTitle = (transaction) => {
    const displayStatus = getTransactionDisplayStatus(transaction);
    return displayStatus.data.title;
};

// ✅ FUNCIÓN PARA VERIFICAR SI PUEDE GESTIONAR DELIVERY
export const canManageDelivery = (transaction) => {
    return transaction.status === 'approved';
};

// ✅ FUNCIÓN PARA VERIFICAR SI PUEDE HACER ROLLBACK
export const canRollback = (transaction) => {
    return transaction.status === 'approved' && !transaction.is_rolled_back;
};
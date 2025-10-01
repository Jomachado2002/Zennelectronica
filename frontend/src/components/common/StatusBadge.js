// frontend/src/components/common/StatusBadge.js
import React from 'react';
import { getTransactionDisplayStatus, transactionStatuses } from '../../helpers/transactionStatusHelper';
import { deliveryStatuses } from '../../helpers/deliveryHelpers';

const StatusBadge = ({ 
    transaction, 
    showBoth = false, 
    size = 'sm',
    variant = 'default'
}) => {
    const displayStatus = getTransactionDisplayStatus(transaction);
    
    const sizeClasses = {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };
    
    const baseClasses = `inline-flex items-center rounded-full font-medium transition-all duration-200 ${sizeClasses[size]}`;
    
    // Badge para estado de pago
    const PaymentBadge = ({ status, className = '' }) => {
        const statusData = transactionStatuses[status] || transactionStatuses.pending;
        
        return (
            <span 
                className={`${baseClasses} ${className}`}
                style={{ 
                    backgroundColor: statusData.bgColor, 
                    color: statusData.color 
                }}
            >
                <span className="mr-1">{statusData.icon}</span>
                {statusData.title}
            </span>
        );
    };
    
    // Badge para estado de delivery
    const DeliveryBadge = ({ status, className = '' }) => {
        const statusData = deliveryStatuses[status] || deliveryStatuses.payment_confirmed;
        
        return (
            <span 
                className={`${baseClasses} ${className}`}
                style={{ 
                    backgroundColor: statusData.bgColor, 
                    color: statusData.color 
                }}
            >
                <span className="mr-1">{statusData.icon}</span>
                {statusData.title}
            </span>
        );
    };
    
    // Si no está aprobado, solo mostrar estado de pago
    if (transaction.status !== 'approved') {
        return (
            <div className="flex flex-col gap-1">
                <PaymentBadge status={transaction.status} />
                {transaction.status === 'rejected' && transaction.response_description && (
                    <div className="text-xs text-red-600 max-w-48 truncate" title={transaction.response_description}>
                        💬 {transaction.response_description}
                    </div>
                )}
            </div>
        );
    }
    
    // Si está aprobado y showBoth es true, mostrar ambos
    if (showBoth) {
        return (
            <div className="flex flex-col gap-1">
                <PaymentBadge status={transaction.status} />
                <DeliveryBadge status={transaction.delivery_status || 'payment_confirmed'} />
            </div>
        );
    }
    
    // Si está aprobado y showBoth es false, solo mostrar delivery
    return <DeliveryBadge status={transaction.delivery_status || 'payment_confirmed'} />;
};

// Componente específico para mostrar progreso
export const StatusWithProgress = ({ transaction, showProgress = true }) => {
    if (transaction.status !== 'approved') {
        return <StatusBadge transaction={transaction} />;
    }
    
    const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(transaction.delivery_status || 'payment_confirmed');
    const progress = Math.round(((currentIndex + 1) / statuses.length) * 100);
    
    return (
        <div className="flex flex-col gap-2">
            <StatusBadge transaction={transaction} />
            {showProgress && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            <div className="text-xs text-gray-500 text-center">
                {progress}% completado
            </div>
        </div>
    );
};

// Componente para mostrar histórico de estados
export const StatusHistory = ({ transaction }) => {
    const history = [];
    
    // Agregar cambio de pago
    if (transaction.status) {
        history.push({
            status: transaction.status,
            type: 'payment',
            timestamp: transaction.confirmation_date || transaction.createdAt,
            data: transactionStatuses[transaction.status]
        });
    }
    
    // Agregar cambios de delivery si está aprobado
    if (transaction.status === 'approved' && transaction.delivery_timeline) {
        transaction.delivery_timeline.forEach(entry => {
            history.push({
                status: entry.status,
                type: 'delivery',
                timestamp: entry.timestamp,
                notes: entry.notes,
                data: deliveryStatuses[entry.status]
            });
        });
    }
    
    // Ordenar por fecha
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return (
        <div className="space-y-3">
            {history.map((entry, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div 
                        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
                        style={{ backgroundColor: entry.data.bgColor, color: entry.data.color }}
                    >
                        {entry.data.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-800">{entry.data.title}</h4>
                            <span className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        {entry.notes && (
                            <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{entry.data.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatusBadge;
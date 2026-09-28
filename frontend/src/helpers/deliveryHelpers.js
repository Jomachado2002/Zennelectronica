// frontend/src/helpers/deliveryHelpers.js - HELPERS PARA DELIVERY

export const deliveryStatuses = {
    payment_confirmed: {
        icon: '✅',
        title: 'Pedido recibido',
        color: '#28a745',
        bgColor: '#d4edda',
        description: 'Hemos recibido tu pedido. Aguarde, lo confirmamos.'
    },
    preparing_order: {
        icon: '✅',
        title: 'Pedido confirmado',
        color: '#ffc107',
        bgColor: '#fff3cd',
        description: 'Tu pedido ha sido confirmado.'
    },
    in_transit: {
        icon: '🚚',
        title: 'En camino',
        color: '#007bff',
        bgColor: '#cce7ff',
        description: 'Tu pedido está en camino. Llega en aproximadamente 1 día hábil.'
    },
    delivered: {
        icon: '📍',
        title: 'Entregado',
        color: '#28a745',
        bgColor: '#d4edda',
        description: 'Tu pedido fue entregado.'
    },
    problem: {
        icon: '⚠️',
        title: 'Requiere Atención',
        color: '#dc3545',
        bgColor: '#f8d7da',
        description: 'Hay un inconveniente que necesita resolución'
    }
};

export const calculateProgress = (currentStatus) => {
    const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus);
    return Math.round(((currentIndex + 1) / statuses.length) * 100);
};

export const formatDeliveryDate = (dateString) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getNextStatus = (currentStatus) => {
    const flow = {
        payment_confirmed: 'preparing_order',
        preparing_order: 'in_transit',
        in_transit: 'delivered',
        delivered: null
    };
    return flow[currentStatus];
};
export const getDeliveryStatusForTransaction = (transaction) => {
    // Si el pago no está aprobado, no mostrar delivery status
    if (transaction.status !== 'approved') {
        return null;
    }
    
    return {
        current: transaction.delivery_status || 'payment_confirmed',
        data: deliveryStatuses[transaction.delivery_status || 'payment_confirmed'],
        canProgress: true
    };
};

export const formatTransactionDate = (dateString) => {
    if (!dateString) return 'No disponible';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Hace 1 día';
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
};
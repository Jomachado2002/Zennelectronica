import { useEffect } from 'react';

const MERCHANT_ID = 5560755025;

function estimatedDeliveryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 4);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Asuncion',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

/**
 * Muestra el aviso de Reseñas de clientes de Google solo en un pago confirmado.
 * Sin número de pedido y correo reales, Google no cuenta la encuesta.
 */
export default function GoogleCustomerReviewsOptIn({ orderId, email }) {
    useEffect(() => {
        const id = String(orderId || '').trim();
        const customerEmail = String(email || '').trim();
        if (!id || !customerEmail || !customerEmail.includes('@')) return undefined;

        window.renderOptIn = function renderOptIn() {
            if (!window.gapi) return;
            window.gapi.load('surveyoptin', function onSurveyReady() {
                window.gapi.surveyoptin.render({
                    merchant_id: MERCHANT_ID,
                    order_id: id,
                    email: customerEmail,
                    delivery_country: 'PY',
                    estimated_delivery_date: estimatedDeliveryDate()
                });
            });
        };

        const existing = document.querySelector('script[data-zenn-customer-reviews="1"]');
        if (existing && window.gapi) {
            window.renderOptIn();
            return undefined;
        }
        if (existing) return undefined;

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
        script.async = true;
        script.defer = true;
        script.dataset.zennCustomerReviews = '1';
        document.body.appendChild(script);
        return undefined;
    }, [orderId, email]);

    return null;
}

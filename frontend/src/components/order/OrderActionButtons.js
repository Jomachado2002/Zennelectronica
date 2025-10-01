// frontend/src/components/order/OrderActionButtons.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
   FaEye, 
    FaStar, 
    FaComments, 
    FaDownload, 
    FaShare, 
    FaExclamationTriangle,
    FaUndo,
    FaPhone,
    FaCopy,
    FaCheckCircle,
    FaFileInvoiceDollar,
    FaTruck
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { canManageDelivery, canRollback } from '../../helpers/transactionStatusHelper';

const OrderActionButtons = ({ 
    transaction, 
    variant = 'full', // 'full', 'compact', 'minimal'
    showRating = true,
    showSupport = true,
    showShare = true,
    onRatingClick,
    onContactSupport,
    className = ''
}) => {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const url = `${window.location.origin}/pedido/${transaction.shop_process_id}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Pedido #${transaction.shop_process_id}`,
                    text: `Mira el estado de mi pedido en Zenn`,
                    url: url
                });
            } catch (error) {
                // Si se cancela el share, no hacer nada
                if (error.name !== 'AbortError') {
                    handleCopyLink(url);
                }
            }
        } else {
            handleCopyLink(url);
        }
    };

    const handleCopyLink = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('🔗 Enlace copiado al portapapeles');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('No se pudo copiar el enlace');
        }
    };

    const handleDownloadInvoice = () => {
        // Funcionalidad para descargar factura (si está disponible)
        if (transaction.invoice_number) {
            // Aquí iría la lógica para descargar la factura
            toast.info('Descargando factura...');
        } else {
            toast.warn('Factura no disponible');
        }
    };

    const getActionButtons = () => {
        const buttons = [];

        // Botón principal: Ver Pedido
        buttons.push({
            key: 'view',
            component: (
                <Link
                    to={`/pedido/${transaction.shop_process_id}`}
                    className="bg-[#2A3190] text-white px-4 py-2 rounded-lg hover:bg-[#1e236b] transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                    <FaEye className="text-sm" />
                    Ver Pedido Completo
                </Link>
            ),
            priority: 1
        });

        // Botón de calificación (solo si está entregado y no calificado)
        if (showRating && 
            transaction.delivery_status === 'delivered' && 
            !transaction.customer_satisfaction?.rating) {
            buttons.push({
                key: 'rating',
                component: (
                    <button
                        onClick={onRatingClick}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                        <FaStar className="text-sm" />
                        Calificar
                    </button>
                ),
                priority: 2
            });
        }

        // Botón de soporte
        if (showSupport) {
            buttons.push({
                key: 'support',
                component: (
                    <Link
                        to={`/contacto?pedido=${transaction.shop_process_id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                    >
                        <FaComments className="text-sm" />
                        Soporte
                    </Link>
                ),
                priority: 3
            });
        }

        // Botón de compartir
        if (showShare) {
            buttons.push({
                key: 'share',
                component: (
                    <button
                        onClick={handleShare}
                        className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
                        title="Compartir pedido"
                    >
                        {copied ? <FaCheckCircle className="text-green-400" /> : <FaShare className="text-sm" />}
                    </button>
                ),
                priority: 4
            });
        }

        // Botón de factura (si existe)
        if (transaction.invoice_number) {
            buttons.push({
                key: 'invoice',
                component: (
                    <button
                        onClick={handleDownloadInvoice}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                        title="Descargar factura"
                    >
                        <FaDownload className="text-sm" />
                    </button>
                ),
                priority: 5
            });
        }

        // Botón de problema (si hay issues)
        if (transaction.status === 'rejected' || transaction.delivery_status === 'problem') {
            buttons.push({
                key: 'problem',
                component: (
                    <Link
                        to={`/contacto?pedido=${transaction.shop_process_id}&tipo=problema`}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all flex items-center gap-2 font-medium"
                    >
                        <FaExclamationTriangle className="text-sm" />
                        Reportar Problema
                    </Link>
                ),
                priority: 2 // Alta prioridad si hay problemas
            });
        }

        return buttons.sort((a, b) => a.priority - b.priority);
    };

    const buttons = getActionButtons();

    // Renderizado según variante
    if (variant === 'minimal') {
        return (
            <div className={`flex gap-2 ${className}`}>
                {buttons.slice(0, 2).map(button => (
                    <div key={button.key}>{button.component}</div>
                ))}
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className={`flex flex-wrap gap-2 ${className}`}>
                {buttons.slice(0, 3).map(button => (
                    <div key={button.key}>{button.component}</div>
                ))}
            </div>
        );
    }

    // Variante 'full' (por defecto)
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {buttons.map(button => (
                <div key={button.key}>{button.component}</div>
            ))}
        </div>
    );
};

// Componente específico para la tabla de admin
export const AdminOrderActions = ({ transaction, onDeliveryManage, onRollback, onViewDetails, onViewProducts }) => {
    return (
        <div className="flex justify-center space-x-2">
            {/* Ver detalles */}
            <button
                onClick={() => onViewDetails(transaction)}
                className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-md transition-all duration-200"
                title="Ver detalles completos"
            >
                <FaEye />
            </button>

            {/* Gestionar delivery */}
            {canManageDelivery(transaction) && (
                <button
                    onClick={() => onDeliveryManage(transaction)}
                    className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-2 rounded-md transition-all duration-200"
                    title="Gestionar delivery"
                >
                    <FaTruck className="text-sm" />
                </button>
            )}

            {/* Estado disabled para delivery no disponible */}
            {!canManageDelivery(transaction) && (
                <span className="text-gray-400 p-2" title="Delivery no disponible - Pago no aprobado">
                    <FaTruck className="text-sm" />
                </span>
            )}
            
            {/* Ver productos */}
            <button
                onClick={() => onViewProducts(transaction)}
                className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 p-2 rounded-md transition-all duration-200"
                title="Ver productos"
            >
                <FaFileInvoiceDollar />
            </button>
            
            {/* Rollback */}
            {canRollback(transaction) && (
                <button
                    onClick={() => onRollback(transaction)}
                    className="text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 p-2 rounded-md transition-all duration-200"
                    title="Reversar transacción"
                >
                    <FaUndo className="text-sm" />
                </button>
            )}
        </div>
    );
};

// Componente para estado del pedido con acciones rápidas
export const OrderStatusWithActions = ({ transaction, compact = false }) => {
    return (
        <div className="flex flex-col gap-2">
           
            
            {/* Acciones rápidas según estado */}
            <div className="flex gap-1">
                {transaction.status === 'rejected' && (
                    <Link
                        to={`/contacto?pedido=${transaction.shop_process_id}&tipo=pago-rechazado`}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full hover:bg-red-200 transition-colors"
                    >
                        <FaPhone className="inline mr-1" />
                        Contactar
                    </Link>
                )}
                
                {transaction.delivery_status === 'delivered' && !transaction.customer_satisfaction?.rating && (
                    <Link
                        to={`/calificar-pedido/${transaction.shop_process_id}`}
                        className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full hover:bg-yellow-200 transition-colors"
                    >
                        <FaStar className="inline mr-1" />
                        Calificar
                    </Link>
                )}
                
                {transaction.tracking_number && (
                    <Link
                        to={`/pedido/${transaction.shop_process_id}#tracking`}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    >
                        📦 Seguir
                    </Link>
                )}
            </div>
        </div>
    );
};

export default OrderActionButtons;
// frontend/src/components/delivery/DeliveryProgress.js
import React from 'react';
import { deliveryStatuses, calculateProgress, formatDeliveryDate } from '../../helpers/deliveryHelpers';

const DeliveryProgress = ({ 
  deliveryStatus = 'payment_confirmed', 
  timeline = [], 
  estimatedDate = null,
  actualDate = null,
  trackingNumber = null,
  compact = false,
  transaction = null // NUEVA PROP
}) => {
  
  // ✅ Si la transacción no está aprobada, mostrar mensaje
  if (transaction && transaction.status !== 'approved') {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="text-center py-6">
          <div className="mb-4">
            {transaction.status === 'rejected' ? '❌' :
             transaction.status === 'pending' ? '⏳' : '❓'}
          </div>
          <h3 className="font-medium text-gray-800 mb-2">
            {transaction.status === 'rejected' ? 'Pago Rechazado' :
             transaction.status === 'pending' ? 'Esperando Confirmación de Pago' :
             'Pago en Proceso'}
          </h3>
          <p className="text-sm text-gray-600">
            {transaction.status === 'rejected' ? 'No se pudo procesar el pago. Contacta a soporte.' :
             transaction.status === 'pending' ? 'Tu pago está siendo verificado por Bancard.' :
             'El estado del pedido se actualizará una vez confirmado el pago.'}
          </p>
          {transaction.response_description && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {transaction.response_description}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  const statuses = ['payment_confirmed', 'preparing_order', 'in_transit', 'delivered'];
  const currentIndex = statuses.indexOf(deliveryStatus);
  const progress = calculateProgress(deliveryStatus);

  if (compact) {
    return (
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Estado del Pedido</span>
          <span className="text-xs text-gray-500">{progress}% Completado</span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          {statuses.map((status, index) => {
            const statusInfo = deliveryStatuses[status];
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={status} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                    isCompleted 
                      ? 'border-green-500 bg-green-500 text-white' 
                      : isCurrent
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                >
                  {statusInfo.icon}
                </div>
                <span className={`text-xs mt-1 ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                  {statusInfo.title.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {trackingNumber && (
          <div className="mt-2 text-center">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              📦 Tracking: {trackingNumber}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-[#2A3190] mb-6 flex items-center gap-2">
        🚚 Estado de tu Pedido
        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {progress}% Completado
        </span>
      </h3>

      {/* Progress Bar Visual */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {statuses.map((status, index) => {
            const statusInfo = deliveryStatuses[status];
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={status} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg border-4 transition-all duration-300 ${
                    isCompleted 
                      ? 'border-green-500 bg-green-500 text-white shadow-lg' 
                      : isCurrent
                        ? 'border-blue-500 bg-blue-50 text-blue-600 animate-pulse'
                        : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                >
                  {statusInfo.icon}
                </div>
                <div className="text-center mt-2">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                    {statusInfo.title}
                  </p>
                  <p className={`text-xs ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {statusInfo.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 h-3 rounded-full transition-all duration-1000 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {estimatedDate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-1">📅 Fecha Estimada</h4>
            <p className="text-yellow-700">{formatDeliveryDate(estimatedDate)}</p>
          </div>
        )}
        
        {actualDate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-1">📍 Fecha de Entrega</h4>
            <p className="text-green-700">{formatDeliveryDate(actualDate)}</p>
          </div>
        )}
        
        {trackingNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-1">📦 Número de Tracking</h4>
            <p className="text-blue-700 font-mono">{trackingNumber}</p>
          </div>
        )}
      </div>

      {/* Timeline Detallado */}
      {timeline && timeline.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3">📋 Historial de Estados</h4>
          <div className="space-y-3">
            {timeline.map((entry, index) => {
              const statusInfo = deliveryStatuses[entry.status];
              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: statusInfo?.bgColor, color: statusInfo?.color }}
                  >
                    {statusInfo?.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-800">{statusInfo?.title}</h5>
                      <span className="text-xs text-gray-500">
                        {formatDeliveryDate(entry.timestamp)}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                    {entry.automatic && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full mt-1 inline-block">
                        Automático
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


export default DeliveryProgress;
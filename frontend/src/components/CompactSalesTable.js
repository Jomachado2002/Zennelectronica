// frontend/src/components/CompactSalesTable.js - TABLA COMPACTA PARA PANTALLAS PEQUEÑAS
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaFileInvoiceDollar,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave
} from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';
import moment from 'moment';

const CompactSalesTable = ({ 
  sales, 
  selectedSales, 
  onToggleSelection, 
  onSelectAll, 
  onDeleteSale,
  onEditSale 
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pagado':
        return <FaCheck className="w-3 h-3" />;
      case 'pendiente':
        return <FaExclamationTriangle className="w-3 h-3" />;
      case 'vencido':
        return <FaTimes className="w-3 h-3" />;
      default:
        return <FaExclamationTriangle className="w-3 h-3" />;
    }
  };

  const getSaleTypeIcon = (type) => {
    switch (type) {
      case 'terminal':
        return <FaFileInvoiceDollar className="w-4 h-4 text-blue-600" />;
      case 'presupuesto':
        return <FaFileInvoiceDollar className="w-4 h-4 text-green-600" />;
      default:
        return <FaFileInvoiceDollar className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header compacto */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedSales.length === sales.length && sales.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
            />
            <span className="text-sm font-medium text-gray-700">
              {sales.length} ventas
            </span>
          </div>
          {selectedSales.length > 0 && (
            <span className="text-sm text-blue-600 font-medium">
              {selectedSales.length} seleccionadas
            </span>
          )}
        </div>
      </div>

      {/* Lista de ventas compacta */}
      {sales.map((sale) => (
        <div key={sale._id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4">
            {/* Header de la venta */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedSales.includes(sale._id)}
                  onChange={() => onToggleSelection(sale._id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    {getSaleTypeIcon(sale.saleType)}
                    <h3 className="text-sm font-semibold text-gray-900">
                      #{sale.invoiceNumber || 'N/A'}
                    </h3>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <FaCalendarAlt className="w-3 h-3 mr-1" />
                    {moment(sale.saleDate).format('DD/MM/YYYY')}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {displayPYGCurrency(sale.totalAmount || 0)}
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.paymentStatus)}`}>
                  {getStatusIcon(sale.paymentStatus)}
                  <span className="ml-1 capitalize">{sale.paymentStatus}</span>
                </span>
              </div>
            </div>

            {/* Información del cliente */}
            <div className="flex items-center text-sm text-gray-600 mb-3">
              <FaUser className="w-3 h-3 mr-2" />
              <span>{sale.clientInfo?.name || 'Cliente no especificado'}</span>
            </div>

            {/* Items de la venta */}
            <div className="space-y-2 mb-3">
              {sale.items?.slice(0, 2).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate flex-1 mr-2">
                    {item.description}
                  </span>
                  <div className="text-right">
                    <span className="text-gray-900 font-medium">
                      {item.quantity} × {displayPYGCurrency(item.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
              {sale.items?.length > 2 && (
                <div className="text-xs text-gray-500 text-center">
                  +{sale.items.length - 2} artículos más
                </div>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>IVA: {displayPYGCurrency(sale.ivaAmount || 0)}</span>
                <span>•</span>
                <span>{sale.items?.length || 0} items</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Link
                  to={`/panel-admin/ventas/${sale._id}`}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Ver detalles"
                >
                  <FaEye className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => onEditSale(sale)}
                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <FaEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteSale(sale._id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {sales.length === 0 && (
        <div className="text-center py-8">
          <FaFileInvoiceDollar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron ventas que coincidan con los filtros aplicados.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompactSalesTable;

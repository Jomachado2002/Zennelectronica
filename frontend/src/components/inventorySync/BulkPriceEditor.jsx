// frontend/src/components/inventorySync/BulkPriceEditor.jsx
// Componente para edición masiva de precios de productos

import React, { useState } from 'react';
import { FaEdit, FaSave, FaTimes, FaCheck } from 'react-icons/fa';

const BulkPriceEditor = ({ 
    products, 
    onSavePrices, 
    isLoading,
    onClose 
}) => {
    const [editedProducts, setEditedProducts] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    const formatPrice = (price, currency = 'USD') => {
        if (currency === 'USD') {
            return `U$ ${parseFloat(price).toFixed(2)}`;
        } else {
            return `G$ ${parseFloat(price).toLocaleString('es-PY')}`;
        }
    };

    const getPriceChangeColor = (difference) => {
        if (difference > 0) {
            return 'text-red-600'; // Precio aumentó
        } else if (difference < 0) {
            return 'text-green-600'; // Precio bajó
        } else {
            return 'text-gray-600'; // Sin cambio
        }
    };

    const getPriceChangeIcon = (difference) => {
        if (difference > 0) {
            return '📈'; // Precio aumentó
        } else if (difference < 0) {
            return '📉'; // Precio bajó
        } else {
            return '➡️'; // Sin cambio
        }
    };

    const handlePriceChange = (productId, newPrice) => {
        const numericPrice = parseFloat(newPrice) || 0;
        setEditedProducts(prev => ({
            ...prev,
            [productId]: numericPrice
        }));
        setHasChanges(true);
    };

    const handleSaveAll = () => {
        const updates = Object.entries(editedProducts).map(([productId, newPrice]) => ({
            productId,
            newPrice
        }));
        
        onSavePrices(updates);
    };

    const handleResetAll = () => {
        setEditedProducts({});
        setHasChanges(false);
    };

    const getEditedPrice = (productId, originalPrice) => {
        return editedProducts[productId] !== undefined ? editedProducts[productId] : originalPrice;
    };

    const getPriceDifference = (productId, originalPrice) => {
        const editedPrice = getEditedPrice(productId, originalPrice);
        return editedPrice - originalPrice;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Edición Masiva de Precios
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {products.length} productos con cambios de precio detectados
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {hasChanges && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    ⚠️ Cambios pendientes
                                </span>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-700">
                                {Object.keys(editedProducts).length} productos modificados
                            </span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleResetAll}
                                disabled={!hasChanges || isLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FaTimes className="w-4 h-4" />
                                Descartar Cambios
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={!hasChanges || isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FaSave className="w-4 h-4" />
                                Guardar Todos
                            </button>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="overflow-y-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Producto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio Actual
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio Proveedor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nuevo Precio
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Diferencia
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.map((product, index) => {
                                const editedPrice = getEditedPrice(product.productId, product.currentPrice);
                                const priceDifference = getPriceDifference(product.productId, product.currentPrice);
                                const isModified = editedProducts[product.productId] !== undefined;
                                
                                return (
                                    <tr key={`${product.productId}-${index}`} className={isModified ? 'bg-yellow-50' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {product.productCode}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                                {product.productName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatPrice(product.currentPrice, 'USD')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatPrice(product.providerPrice, 'USD')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editedPrice}
                                                    onChange={(e) => handlePriceChange(product.productId, e.target.value)}
                                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <button
                                                    onClick={() => handlePriceChange(product.productId, product.providerPrice)}
                                                    className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                                >
                                                    Usar Proveedor
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center">
                                                <span className="mr-1">
                                                    {getPriceChangeIcon(priceDifference)}
                                                </span>
                                                <span className={getPriceChangeColor(priceDifference)}>
                                                    {priceDifference > 0 ? '+' : ''}{formatPrice(priceDifference, 'USD')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                {isModified && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        <FaEdit className="w-3 h-3 mr-1" />
                                                        Modificado
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handlePriceChange(product.productId, product.currentPrice)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                    title="Restaurar precio original"
                                                >
                                                    <FaTimes className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            <p>💡 <strong>Consejo:</strong> Puedes usar el botón "Usar Proveedor" para aplicar automáticamente el precio del proveedor.</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={!hasChanges || isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <FaSave className="w-4 h-4" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkPriceEditor;
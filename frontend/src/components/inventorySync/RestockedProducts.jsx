// frontend/src/components/inventorySync/RestockedProducts.jsx
// Componente para mostrar productos que reaparecen en el CSV (estaban con stock 0)

import React, { useState } from 'react';
import { FaCheck, FaTimes, FaEdit, FaExternalLinkAlt } from 'react-icons/fa';

const RestockedProducts = ({ 
    products, 
    selectedProducts, 
    onProductSelect, 
    onSelectAll, 
    onRestockSelected, 
    onRestockAll,
    onEditProduct,
    isLoading 
}) => {
    const [filterByPriceChanges, setFilterByPriceChanges] = useState(false);

    const filteredProducts = filterByPriceChanges 
        ? products.filter(product => product.priceChanged)
        : products;

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

    const getStockStatusBadge = (status) => {
        switch (status) {
            case 'out_of_stock':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ❌ Sin Stock
                    </span>
                );
            case 'in_stock':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ En Stock
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        ❓ Desconocido
                    </span>
                );
        }
    };

    const handleSelectAll = () => {
        const allProductIds = filteredProducts.map(product => product.productId);
        onSelectAll('restocked', allProductIds, true);
    };

    const handleDeselectAll = () => {
        onSelectAll('restocked', [], false);
    };

    const handleRestockAll = () => {
        const allProductIds = filteredProducts.map(product => product.productId);
        onSelectAll('restocked', allProductIds, true);
        onRestockAll();
    };

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            🔄 Productos que Reaparecen ({products.length})
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Productos que estaban sin stock pero ahora están disponibles en el proveedor
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Filtro de cambios de precio */}
                        {products.some(p => p.priceChanged) && (
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filterByPriceChanges}
                                    onChange={(e) => setFilterByPriceChanges(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Solo cambios de precio
                                </span>
                            </label>
                        )}

                        {/* Badge de información */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🔄 Reaparecen
                        </span>
                    </div>
                </div>
            </div>

            {/* Acciones masivas */}
            {filteredProducts.length > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleSelectAll}
                                disabled={isLoading}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                Seleccionar Todos ({filteredProducts.length})
                            </button>
                            <button
                                onClick={handleDeselectAll}
                                disabled={isLoading}
                                className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                                Deseleccionar Todos
                            </button>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onRestockSelected}
                                disabled={isLoading || selectedProducts.restocked.length === 0}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FaCheck className="w-4 h-4" />
                                Restockear Seleccionados ({selectedProducts.restocked.length})
                            </button>
                            <button
                                onClick={handleRestockAll}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FaCheck className="w-4 h-4" />
                                Restockear Todos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla de productos */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.restocked.includes(p.productId))}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            handleSelectAll();
                                        } else {
                                            handleDeselectAll();
                                        }
                                    }}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado Actual
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock Actual
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio Actual
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio Proveedor
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
                        {filteredProducts.map((product, index) => (
                            <tr key={`${product.productId}-${index}`} className={product.priceChanged ? 'bg-yellow-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.restocked.includes(product.productId)}
                                        onChange={(e) => onProductSelect('restocked', product.productId, e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.productCode}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                        {product.productName}
                                    </div>
                                    {product.codeMatch === false && (
                                        <div className="text-sm text-orange-600 mt-1">
                                            ⚠️ Código diferente: {product.providerCode}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStockStatusBadge(product.currentStatus)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`font-medium ${product.currentStock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {product.currentStock}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatPrice(product.currentPrice, 'USD')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatPrice(product.providerPrice, 'USD')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center">
                                        <span className="mr-1">
                                            {getPriceChangeIcon(product.priceDifference)}
                                        </span>
                                        <span className={getPriceChangeColor(product.priceDifference)}>
                                            {product.priceDifference > 0 ? '+' : ''}{formatPrice(product.priceDifference, 'USD')}
                                        </span>
                                    </div>
                                    {product.priceChanged && (
                                        <div className="text-xs text-yellow-600 mt-1">
                                            ⚠️ Cambio detectado
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => onEditProduct(product)}
                                            className={`px-3 py-1.5 text-white text-sm rounded-lg flex items-center gap-1 ${
                                                product.priceChanged 
                                                    ? 'bg-orange-600 hover:bg-orange-700' 
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                        >
                                            <FaEdit className="w-3 h-3" />
                                            Editar
                                            {product.priceChanged && (
                                                <span className="ml-1 px-1.5 py-0.5 bg-white text-orange-600 rounded-full text-xs font-bold">
                                                    !
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {filterByPriceChanges 
                            ? 'No se encontraron productos con cambios de precio'
                            : 'No se encontraron productos que reaparezcan'
                        }
                    </p>
                </div>
            )}

            {/* Información adicional */}
            <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            Productos que Reaparecen
                        </h3>
                        <p className="mt-1 text-sm text-blue-700">
                            Estos productos estaban marcados como "sin stock" en tu sistema pero ahora aparecen 
                            nuevamente en el CSV del proveedor. Puedes restockearlos para marcarlos como disponibles 
                            nuevamente. Si hay cambios de precio, también puedes editarlos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestockedProducts;
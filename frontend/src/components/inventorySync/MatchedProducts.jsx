// frontend/src/components/inventorySync/MatchedProducts.jsx
// Componente para mostrar productos que coinciden entre sistema y proveedor

import React, { useState } from 'react';
import { FaEdit, FaExternalLinkAlt } from 'react-icons/fa';

const MatchedProducts = ({ products, method, showPriceChanges, onEditProduct }) => {
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

    // Función para manejar la edición de productos
    const handleEditProduct = async (product) => {
        if (onEditProduct) {
            onEditProduct(product);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            Productos Coincidentes ({products.length})
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Productos que existen tanto en tu sistema como en el proveedor
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Filtro de cambios de precio */}
                        {showPriceChanges && (
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

                        {/* Información del método */}
                        <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                method === 'code' 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {method === 'code' ? '🔢 Por Código' : '📝 Por Nombre'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de productos */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código Sistema
                            </th>
                            {method === 'name' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Código Proveedor
                                </th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio Sistema
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio Proveedor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Diferencia
                            </th>
                            {method === 'name' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado Código
                                </th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product, index) => (
                            <tr key={`${product.productId}-${index}`} className={product.priceChanged ? 'bg-yellow-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.productCode}
                                </td>
                                {method === 'name' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {product.providerCode}
                                    </td>
                                )}
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                        {product.productName}
                                    </div>
                                    {product.warning && (
                                        <div className="text-sm text-red-600 mt-1">
                                            {product.warning}
                                        </div>
                                    )}
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
                                {method === 'name' && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            product.codeMatch 
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {product.codeMatch ? '✅ Coincide' : '❌ No coincide'}
                                        </span>
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => {
                                            console.log('🖱️ Click en botón Editar');
                                            console.log('📦 Producto:', product);
                                            console.log('📦 Product ID:', product.productId);
                                            console.log('💰 Price Changed:', product.priceChanged);
                                            handleEditProduct(product);
                                        }}
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
                            : 'No se encontraron productos coincidentes'
                        }
                    </p>
                </div>
            )}

            {/* Información adicional */}
            {method === 'name' && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Comparación por Nombre
                            </h3>
                            <p className="mt-1 text-sm text-yellow-700">
                                Los productos marcados con "⚠️ Los códigos no coinciden" tienen nombres similares 
                                pero códigos diferentes. Verifica estos productos manualmente para asegurar 
                                que corresponden al mismo producto.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchedProducts;

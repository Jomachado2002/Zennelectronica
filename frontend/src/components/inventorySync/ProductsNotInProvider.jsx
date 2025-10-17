// frontend/src/components/inventorySync/ProductsNotInProvider.jsx
// Componente para mostrar productos que están en el sistema pero no en el proveedor

import React, { useState } from 'react';

const ProductsNotInProvider = ({
    products,
    selectedProducts,
    onProductSelect,
    onSelectAll,
    onUpdateSelected,
    onUpdateAll,
    isLoading
}) => {
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    const filteredProducts = showOnlySelected 
        ? products.filter(product => selectedProducts.includes(product.productId))
        : products;

    const allSelected = products.length > 0 && products.every(product => 
        selectedProducts.includes(product.productId)
    );

    const someSelected = selectedProducts.length > 0 && !allSelected;

    const formatPrice = (price) => {
        return `G$ ${parseFloat(price).toLocaleString('es-PY')}`;
    };

    const getStatusColor = (status) => {
        const colors = {
            'in_stock': 'bg-green-100 text-green-800',
            'low_stock': 'bg-yellow-100 text-yellow-800',
            'out_of_stock': 'bg-red-100 text-red-800'
        };
        return colors[status] || colors['out_of_stock'];
    };

    const getStatusLabel = (status) => {
        const labels = {
            'in_stock': 'En Stock',
            'low_stock': 'Stock Bajo',
            'out_of_stock': 'Sin Stock'
        };
        return labels[status] || 'Sin Stock';
    };

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            Productos Sin Stock en Proveedor ({products.length})
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Productos que están en tu sistema pero no en el proveedor
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Filtro */}
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={showOnlySelected}
                                onChange={(e) => setShowOnlySelected(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Solo seleccionados
                            </span>
                        </label>

                        {/* Botones de acción */}
                        <div className="flex space-x-2">
                            <button
                                onClick={() => onUpdateSelected('mark_out_of_stock')}
                                disabled={selectedProducts.length === 0 || isLoading}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                                    selectedProducts.length > 0 && !isLoading
                                        ? 'text-white bg-red-600 hover:bg-red-700'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Actualizando...
                                    </>
                                ) : (
                                    <>
                                        ❌ Marcar Sin Stock ({selectedProducts.length})
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => onUpdateAll('mark_out_of_stock')}
                                disabled={products.length === 0 || isLoading}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                                    products.length > 0 && !isLoading
                                        ? 'text-white bg-orange-600 hover:bg-orange-700'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                }`}
                            >
                                ❌ Marcar Todos Sin Stock ({products.length})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Selector masivo */}
                <div className="mt-4 flex items-center">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                        }}
                        onChange={(e) => onSelectAll('notInProvider', products.map(p => p.productId), e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                        Seleccionar todos los productos
                    </label>
                </div>
            </div>

            {/* Tabla de productos */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Seleccionar
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock Actual
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio Venta
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => {
                            const isSelected = selectedProducts.includes(product.productId);
                            
                            return (
                                <tr key={product.productId} className={isSelected ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => onProductSelect('notInProvider', product.productId, e.target.checked)}
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
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            product.currentStock > 10 
                                                ? 'bg-green-100 text-green-800'
                                                : product.currentStock > 0
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {product.currentStock}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.currentStatus)}`}>
                                            {getStatusLabel(product.currentStatus)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        {formatPrice(product.sellingPrice)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                onProductSelect('notInProvider', product.productId, true);
                                                // Marcar individualmente
                                                onUpdateSelected('mark_out_of_stock');
                                            }}
                                            disabled={isLoading}
                                            className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                                        >
                                            Marcar Sin Stock
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
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
                        {showOnlySelected 
                            ? 'No hay productos seleccionados para mostrar'
                            : 'Todos los productos del sistema están disponibles en el proveedor'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProductsNotInProvider;

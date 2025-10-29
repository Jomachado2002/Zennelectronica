// frontend/src/components/inventorySync/ProductVisibilityManager.jsx
// Componente para gestionar la visibilidad de productos

import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaFilter, FaSearch } from 'react-icons/fa';

const ProductVisibilityManager = ({ 
    products, 
    onToggleVisibility, 
    onBulkToggleVisibility,
    isLoading 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByVisibility, setFilterByVisibility] = useState('all'); // all, visible, hidden
    const [selectedProducts, setSelectedProducts] = useState([]);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             product.productCode.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesVisibility = filterByVisibility === 'all' || 
                                 (filterByVisibility === 'visible' && product.isVisible !== false) ||
                                 (filterByVisibility === 'hidden' && product.isVisible === false);
        
        return matchesSearch && matchesVisibility;
    });

    const handleProductSelect = (productId, selected) => {
        if (selected) {
            setSelectedProducts(prev => [...prev, productId]);
        } else {
            setSelectedProducts(prev => prev.filter(id => id !== productId));
        }
    };

    const handleSelectAll = () => {
        setSelectedProducts(filteredProducts.map(p => p.productId));
    };

    const handleDeselectAll = () => {
        setSelectedProducts([]);
    };

    const handleBulkToggleVisibility = (makeVisible) => {
        onBulkToggleVisibility(selectedProducts, makeVisible);
        setSelectedProducts([]);
    };

    const getVisibilityBadge = (isVisible) => {
        if (isVisible === false) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <FaEyeSlash className="w-3 h-3 mr-1" />
                    Oculto
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaEye className="w-3 h-3 mr-1" />
                    Visible
                </span>
            );
        }
    };

    const getStockStatusBadge = (status, stock) => {
        if (status === 'out_of_stock' || stock === 0) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ❌ Sin Stock
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ En Stock
                </span>
            );
        }
    };

    return (
        <div className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            Gestión de Visibilidad de Productos
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Controla qué productos son visibles para los clientes
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <FaFilter className="w-3 h-3 mr-1" />
                            {filteredProducts.length} productos
                        </span>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    {/* Visibility Filter */}
                    <select
                        value={filterByVisibility}
                        onChange={(e) => setFilterByVisibility(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">Todos</option>
                        <option value="visible">Solo Visibles</option>
                        <option value="hidden">Solo Ocultos</option>
                    </select>
                </div>
            </div>

            {/* Bulk Actions */}
            {filteredProducts.length > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <input
                                type="checkbox"
                                checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.includes(p.productId))}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        handleSelectAll();
                                    } else {
                                        handleDeselectAll();
                                    }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                {selectedProducts.length > 0 ? `${selectedProducts.length} seleccionados` : 'Seleccionar todos'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-3">
                            {selectedProducts.length > 0 && (
                                <>
                                    <button
                                        onClick={() => handleBulkToggleVisibility(true)}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <FaEye className="w-4 h-4" />
                                        Mostrar ({selectedProducts.length})
                                    </button>
                                    <button
                                        onClick={() => handleBulkToggleVisibility(false)}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <FaEyeSlash className="w-4 h-4" />
                                        Ocultar ({selectedProducts.length})
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.includes(p.productId))}
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
                                Estado Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Visibilidad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product, index) => (
                            <tr key={`${product.productId}-${index}`} className={product.isVisible === false ? 'bg-red-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.includes(product.productId)}
                                        onChange={(e) => handleProductSelect(product.productId, e.target.checked)}
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStockStatusBadge(product.stockStatus, product.stock)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getVisibilityBadge(product.isVisible)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    U$ {parseFloat(product.sellingPrice || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => onToggleVisibility(product.productId, !product.isVisible)}
                                        disabled={isLoading}
                                        className={`px-3 py-1.5 text-white text-sm rounded-lg flex items-center gap-1 ${
                                            product.isVisible === false 
                                                ? 'bg-green-600 hover:bg-green-700' 
                                                : 'bg-red-600 hover:bg-red-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {product.isVisible === false ? (
                                            <>
                                                <FaEye className="w-3 h-3" />
                                                Mostrar
                                            </>
                                        ) : (
                                            <>
                                                <FaEyeSlash className="w-3 h-3" />
                                                Ocultar
                                            </>
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
                        {searchTerm 
                            ? `No se encontraron productos que coincidan con "${searchTerm}"`
                            : 'No se encontraron productos con los filtros aplicados'
                        }
                    </p>
                </div>
            )}

            {/* Information */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            Gestión de Visibilidad
                        </h3>
                        <p className="mt-1 text-sm text-blue-700">
                            Los productos ocultos no serán visibles para los clientes en el catálogo público. 
                            Puedes ocultar productos temporalmente sin eliminarlos del sistema.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductVisibilityManager;
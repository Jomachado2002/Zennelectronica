// frontend/src/components/inventorySync/ProductsNotInSystem.jsx
// Componente para mostrar productos que están en el proveedor pero no en el sistema

import React, { useState } from 'react';
import { FaBox, FaExternalLinkAlt } from 'react-icons/fa';

const ProductsNotInSystem = ({
    products,
    selectedProducts,
    onProductSelect,
    onSelectAll,
    onImportSelected,
    onImportAll,
    onLoadProduct,
    isLoading,
    category,
    subcategory
}) => {
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    const filteredProducts = showOnlySelected 
        ? products.filter(product => selectedProducts.includes(product.providerCode))
        : products;

    const allSelected = products.length > 0 && products.every(product => 
        selectedProducts.includes(product.providerCode)
    );

    const someSelected = selectedProducts.length > 0 && !allSelected;

    const formatPrice = (price) => {
        return `U$ ${parseFloat(price).toFixed(2)}`;
    };

    // Helper para extraer marca del nombre del producto
    const extractBrandFromName = (productName) => {
        const commonBrands = ['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer', 'Samsung', 'LG', 'Sony', 'Apple', 'Microsoft', 'Razer', 'Corsair', 'Logitech', 'MSI', 'Gigabyte'];
        const words = productName.split(' ');
        const foundBrand = words.find(word => commonBrands.includes(word.toUpperCase()));
        return foundBrand || words[1] || '';
    };

    // Función para manejar la apertura del modal de carga de producto
    const handleOpenUploadModal = (product) => {
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        
        const preloadedData = {
            // Información básica
            productName: product.productName,
            productCode: product.providerCode, // ← CRÍTICO
            codigo: product.providerCode, // ← TAMBIÉN AGREGAR
            brandName: extractBrandFromName(product.productName),
            category: category,
            subcategory: subcategory,
            description: product.productName, // Usar nombre como descripción inicial
            
            // URLs del proveedor
            documentationLink: product.productUrl, // URL del producto en sitio del proveedor
            imageUrlFromProvider: product.imageUrl, // URL de la imagen
            
            // Precios y costos (valores fijos)
            purchasePriceUSD: product.priceUSD,
            exchangeRate: 7300,
            deliveryCost: 30000,
            profitMargin: 20, // 20%
            
            // Calcular precio sugerido automáticamente
            // Fórmula: ((purchasePriceUSD * exchangeRate) + deliveryCost) / (1 - (profitMargin / 100))
            sellingPrice: Math.round(
                ((product.priceUSD * 7300) + 30000) / (1 - (20 / 100))
            ),
            
            // Stock inicial
            stock: 1,
            isVipOffer: false,
            
            // Precio anterior (siempre 0 para productos nuevos)
            price: 0,
            
            // Modo importación
            importMode: true
        };
        
        // console.log removed for production
        // console.log removed for production
        
        onLoadProduct(preloadedData);
    };

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            Productos Nuevos ({products.length})
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Productos que están en el proveedor pero no en tu sistema
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
                                onClick={onImportSelected}
                                disabled={selectedProducts.length === 0 || isLoading}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                                    selectedProducts.length > 0 && !isLoading
                                        ? 'text-white bg-green-600 hover:bg-green-700'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        📥 Importar Seleccionados ({selectedProducts.length})
                                    </>
                                )}
                            </button>

                            <button
                                onClick={onImportAll}
                                disabled={products.length === 0 || isLoading}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                                    products.length > 0 && !isLoading
                                        ? 'text-white bg-blue-600 hover:bg-blue-700'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                }`}
                            >
                                📥 Importar Todos ({products.length})
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
                        onChange={(e) => onSelectAll('notInSystem', products.map(p => p.providerCode), e.target.checked)}
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
                                Precio USD
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => {
                            const isSelected = selectedProducts.includes(product.providerCode);
                            
                            return (
                                <tr key={product.providerCode} className={isSelected ? 'bg-blue-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => onProductSelect('notInSystem', product.providerCode, e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {product.providerCode}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 h-12 w-12">
                                                <img
                                                    className="h-12 w-12 rounded-md object-cover"
                                                    src={product.imageUrl}
                                                    alt={product.productName}
                                                    onError={(e) => {
                                                        e.target.src = '/placeholder-image.jpg';
                                                    }}
                                                />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                                    {product.productName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    <a
                                                        href={product.productUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:text-indigo-500"
                                                    >
                                                        Ver en proveedor ↗
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        {formatPrice(product.priceUSD)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenUploadModal(product)}
                                            disabled={isLoading}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FaBox className="w-3 h-3" />
                                            Cargar Producto
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
                            : 'No se encontraron productos nuevos del proveedor'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProductsNotInSystem;

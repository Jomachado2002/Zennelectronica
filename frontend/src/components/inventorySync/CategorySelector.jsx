// frontend/src/components/inventorySync/CategorySelector.jsx
// Componente para seleccionar categoría y subcategoría

import React from 'react';

const CategorySelector = ({
    categories,
    selectedCategory,
    selectedSubcategory,
    onCategoryChange,
    onSubcategoryChange
}) => {
    // Obtener subcategorías de la categoría seleccionada
    const getSubcategories = () => {
        const category = categories.find(cat => cat.value === selectedCategory);
        return category ? category.subcategories : [];
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Categoría
                </label>
                <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => {
                        onCategoryChange(e.target.value);
                        onSubcategoryChange(''); // Reset subcategory when category changes
                    }}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(category => (
                        <option key={category.value} value={category.value}>
                            {category.label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                    Subcategoría
                </label>
                <select
                    id="subcategory"
                    value={selectedSubcategory}
                    onChange={(e) => onSubcategoryChange(e.target.value)}
                    disabled={!selectedCategory}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <option value="">Seleccionar subcategoría</option>
                    {getSubcategories().map(subcategory => (
                        <option key={subcategory.value} value={subcategory.value}>
                            {subcategory.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Información de la selección */}
            {selectedCategory && selectedSubcategory && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-800">
                                Sincronizando: <span className="font-medium">{selectedCategory}</span> → <span className="font-medium">{selectedSubcategory}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategorySelector;

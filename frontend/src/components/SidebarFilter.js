import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';

// Función para obtener etiquetas de especificaciones
const getSpecificationLabel = (specKey) => {
    const labels = {
        processor: "Procesador",
        memory: "Memoria RAM",
        storage: "Almacenamiento",
        disk: "Disco",
        graphicsCard: "Tarjeta Gráfica",
        notebookScreen: "Pantalla",
        notebookBattery: "Batería",
        processorCores: "Núcleos",
        processorThreads: "Hilos",
        // Añade más etiquetas según sea necesario
        landlineHandsets: "Auriculares"
    };
    return labels[specKey] || specKey;
};

const SidebarFilter = ({ 
    productCategory, 
    filterCategoryList, 
    filterSubcategoryList, 
    onCategoryChange, 
    onSubcategoryChange,
    availableFilters,
    filterBrands,
    onBrandChange,
    sortBy,
    onSortChange,
    specFilters,
    onSpecFilterChange
}) => {
    const [expandedCategories, setExpandedCategories] = useState({});
    const [searchBrand, setSearchBrand] = useState('');
    const [searchSpecification, setSearchSpecification] = useState('');

    const toggleCategory = (categoryValue) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryValue]: !prev[categoryValue]
        }));
    };

    const filteredBrands = availableFilters.brands
        ? availableFilters.brands.filter(brand => 
            brand.toLowerCase().includes(searchBrand.toLowerCase())
        )
        : [];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-100">
            {/* Ordenar por */}
            <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Ordenar por
                </h3>
                <div className="space-y-2">
                    {[
                        { label: 'Precio - Bajo a Alto', value: 'asc' },
                        { label: 'Precio - Alto a Bajo', value: 'dsc' }
                    ].map((option) => (
                        <label 
                            key={option.value} 
                            className="flex items-center space-x-3 group cursor-pointer"
                        >
                            <div className="relative">
                                <input
                                    type='radio'
                                    name='sortBy'
                                    checked={sortBy === option.value}
                                    onChange={(e) => onSortChange(e.target.value)}
                                    value={option.value}
                                    className="appearance-none w-5 h-5 border-2 border-gray-300 rounded-full 
                                        checked:border-blue-600 checked:bg-blue-600 
                                        transition duration-200 cursor-pointer
                                        absolute top-0 left-0"
                                />
                                {sortBy === option.value && (
                                    <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full"></div>
                                )}
                            </div>
                            <span className="text-gray-700 group-hover:text-blue-600 transition">
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Categorías */}
            <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Categorías
                </h3>
                <div className="space-y-2">
                    {productCategory.map((category) => (
                        <div key={category.value} className="group">
                            <div 
                                className="flex justify-between items-center 
                                    hover:bg-blue-50 p-2 rounded-md 
                                    transition duration-200 cursor-pointer"
                                onClick={() => toggleCategory(category.value)}
                            >
                                <div className="flex items-center space-x-3">
                                    <input
                                        type='checkbox'
                                        name="category"
                                        checked={filterCategoryList.includes(category.value)}
                                        value={category.value}
                                        onChange={(e) => onCategoryChange(e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="form-checkbox text-blue-600 focus:ring-blue-500 
                                            rounded transition duration-200"
                                    />
                                    <span className="text-gray-700 group-hover:text-blue-600 
                                        transition duration-200">
                                        {category.label}
                                    </span>
                                </div>
                                {category.subcategories && (
                                    <div className="text-gray-400 transition duration-200 
                                        group-hover:text-blue-600">
                                        {expandedCategories[category.value] 
                                            ? <ChevronDown size={20} className="text-blue-600" /> 
                                            : <ChevronRight size={20} />}
                                    </div>
                                )}
                            </div>

                            {category.subcategories && expandedCategories[category.value] && (
                                <div className="pl-6 mt-2 space-y-2">
                                    {category.subcategories.map((subcat) => (
                                        <div 
                                            key={subcat.value}
                                            className="flex items-center space-x-3 
                                                hover:bg-blue-50 p-2 rounded-md 
                                                transition duration-200"
                                        >
                                            <input
                                                type='checkbox'
                                                name="subcategory"
                                                checked={filterSubcategoryList.includes(subcat.value)}
                                                value={subcat.value}
                                                onChange={() => onSubcategoryChange(subcat.value)}
                                                className="form-checkbox text-blue-600 
                                                    focus:ring-blue-500 rounded 
                                                    transition duration-200"
                                            />
                                            <span className="text-gray-600 
                                                hover:text-blue-600 transition">
                                                {subcat.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Marcas */}
            {availableFilters.brands && availableFilters.brands.length > 0 && (
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Marcas
                    </h3>
                    <div className="space-y-3">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Buscar marca..." 
                                className="w-full p-2 pl-8 border rounded-md 
                                    focus:ring-2 focus:ring-blue-500 
                                    focus:border-blue-500 transition duration-200"
                                value={searchBrand}
                                onChange={(e) => setSearchBrand(e.target.value)}
                            />
                            <Search 
                                className="h-5 w-5 absolute left-2 top-3 text-gray-400" 
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-100">
                            {filteredBrands.map((brand) => (
                                <label 
                                    key={brand} 
                                    className="flex items-center space-x-3 
                                        hover:bg-blue-50 p-2 rounded-md 
                                        cursor-pointer transition duration-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filterBrands.includes(brand)}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            onBrandChange(
                                                isChecked 
                                                    ? [...filterBrands, brand]
                                                    : filterBrands.filter(b => b !== brand)
                                            );
                                        }}
                                        className="form-checkbox text-blue-600 
                                            focus:ring-blue-500 rounded 
                                            transition duration-200"
                                    />
                                    <span className="text-gray-700 
                                        hover:text-blue-600 transition">
                                        {brand}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Especificaciones */}
            {availableFilters.specifications && Object.keys(availableFilters.specifications).length > 0 && (
                <div className="pb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Especificaciones
                    </h3>
                    <div className="relative mb-3">
                        <input 
                            type="text" 
                            placeholder="Buscar especificación..." 
                            className="w-full p-2 pl-8 border rounded-md 
                                focus:ring-2 focus:ring-blue-500 
                                focus:border-blue-500 transition duration-200"
                            value={searchSpecification}
                            onChange={(e) => setSearchSpecification(e.target.value)}
                        />
                        <Search 
                            className="h-5 w-5 absolute left-2 top-3 text-gray-400" 
                        />
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-100">
                        {Object.keys(availableFilters.specifications)
                            .filter(specKey => 
                                specKey.toLowerCase().includes(searchSpecification.toLowerCase())
                            )
                            .map(specKey => (
                                <div 
                                    key={specKey} 
                                    className="border-b pb-2 last:border-b-0"
                                >
                                    <div className="font-medium text-gray-700 mb-2">
                                        {getSpecificationLabel(specKey)}
                                    </div>
                                    <div className="space-y-1">
                                        {availableFilters.specifications[specKey].map(specValue => (
                                            <label 
                                                key={specValue}
                                                className="flex items-center space-x-2 
                                                    hover:bg-blue-50 p-2 rounded-md 
                                                    cursor-pointer transition duration-200"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        specFilters[specKey] 
                                                        && specFilters[specKey].includes(specValue)
                                                    }
                                                    onChange={() => onSpecFilterChange(specKey, specValue)}
                                                    className="form-checkbox text-blue-600 
                                                        focus:ring-blue-500 rounded 
                                                        transition duration-200"
                                                />
                                                <span className="text-gray-600 
                                                    hover:text-blue-600 transition">
                                                    {specValue}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default SidebarFilter;
import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const CategoryAccordion = ({ 
    category, 
    isSelected, 
    onSelectCategory, 
    subcategories, 
    selectedSubcategories, 
    onSelectSubcategory,
    isMobile 
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border rounded-lg overflow-hidden mb-2">
            {/* Categoría Principal */}
            <div 
                className={`flex items-center justify-between p-3 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : 'bg-white'
                } hover:bg-blue-50 transition-colors duration-200`}
                onClick={() => {
                    onSelectCategory(category.value);
                    setIsOpen(!isOpen);
                }}
            >
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectCategory(category.value)}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`font-medium ${
                        isSelected ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                        {category.label}
                    </span>
                </div>
                {subcategories && (
                    isOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />)
                }
            </div>

            {/* Subcategorías */}
            {isSelected && subcategories && isOpen && (
                <div className="bg-white border-t">
                    {subcategories.map((subcat) => (
                        <div 
                            key={subcat.value} 
                            className="flex items-center p-3 hover:bg-blue-50 border-b last:border-b-0"
                        >
                            <input
                                type="checkbox"
                                checked={selectedSubcategories.includes(subcat.value)}
                                onChange={() => onSelectSubcategory(subcat.value)}
                                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 mr-3"
                            />
                            <span className={`flex-1 ${
                                selectedSubcategories.includes(subcat.value) 
                                    ? 'text-blue-700 font-semibold' 
                                    : 'text-gray-700'
                            }`}>
                                {subcat.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryAccordion;
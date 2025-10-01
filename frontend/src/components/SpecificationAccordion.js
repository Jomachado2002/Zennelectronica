import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const SpecificationAccordion = ({ title, options = [], selectedValues = [], onChange, isMobile }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!options || options.length === 0) return null;

    return (
        <div className="border rounded-lg overflow-hidden mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-3 text-left ${
                    isOpen ? 'bg-gray-50' : 'bg-white'
                } hover:bg-gray-50 transition-colors duration-200`}
            >
                <span className={`font-medium ${isMobile ? 'text-blue-600' : 'text-gray-700'}`}>
                    {title}
                </span>
                {isOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
            </button>
            
            {isOpen && (
                <div className="border-t bg-white">
                    <div className="max-h-48 overflow-y-auto">
                        {options.map((option) => (
                            <label 
                                key={option} 
                                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option)}
                                    onChange={() => onChange(option)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpecificationAccordion;
// src/components/filters/SpecificationFilter.js
import React, { useState } from 'react';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useFilters } from '../../context/FilterContext';
import FilterCheckbox from './FilterCheckbox';

const SpecificationFilter = ({ title, specKey, options }) => {
  const { specFilters, handleSpecFilterChange, activeAccordions, toggleAccordion } = useFilters();
  const [searchValue, setSearchValue] = useState('');
  
  const filteredOptions = options.filter(option => 
    String(option).toLowerCase().includes(searchValue.toLowerCase())
  );
  
  const selectedValues = specFilters[specKey] || [];
  const isActive = activeAccordions[`spec-${specKey}`];
  
  return (
    <div className="border-b border-gray-200 py-2">
      <button 
        className="w-full flex items-center justify-between py-3 px-2 text-left focus:outline-none hover:bg-gray-50 rounded-md transition-colors"
        onClick={() => toggleAccordion(`spec-${specKey}`)}
        aria-expanded={isActive}
        aria-controls={`spec-content-${specKey}`}
      >
        <div className="flex items-center">
          <span className="font-semibold text-gray-800">{title}</span>
          {selectedValues.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {selectedValues.length}
            </span>
          )}
        </div>
        <span className="text-gray-500">
          {isActive ? <BiChevronUp size={20} /> : <BiChevronDown size={20} />}
        </span>
      </button>
      
      {isActive && (
        <div 
          id={`spec-content-${specKey}`}
          className="py-2 pl-2 pr-1 bg-gray-50 rounded-md mt-1 mb-2"
        >
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <FiSearch className="absolute right-3 top-2.5 text-gray-400" />
          </div>
          
          <div className="max-h-48 overflow-y-auto px-1 border border-gray-200 rounded bg-white">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <FilterCheckbox
                  key={`${specKey}-${option}`}
                  label={option}
                  checked={selectedValues.includes(option)}
                  onChange={() => handleSpecFilterChange(specKey, option)}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 py-3 text-center">No se encontraron resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecificationFilter;
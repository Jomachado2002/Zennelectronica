// src/components/filters/FilterAccordion.js
import React from 'react';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { useFilters } from '../../context/FilterContext';

const FilterAccordion = ({ title, id, icon, children, count }) => {
  const { activeAccordions, toggleAccordion } = useFilters();
  const isActive = activeAccordions[id];
  
  return (
    <div className="border-b border-gray-200 py-2">
      <button 
        className="w-full flex items-center justify-between py-3 px-2 text-left focus:outline-none hover:bg-gray-50 rounded-md transition-colors"
        onClick={() => toggleAccordion(id)}
        aria-expanded={isActive}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2 text-gray-500">{icon}</span>}
          <span className="font-semibold text-gray-800">{title}</span>
          {count > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {count}
            </span>
          )}
        </div>
        <span className="text-gray-500">
          {isActive ? <BiChevronUp size={20} /> : <BiChevronDown size={20} />}
        </span>
      </button>
      
      {isActive && (
        <div 
          id={`accordion-content-${id}`}
          className="py-2 pl-2 pr-1 bg-gray-50 rounded-md mt-1 mb-2"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterAccordion;
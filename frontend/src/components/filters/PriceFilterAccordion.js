// src/components/filters/PriceFilterAccordion.js
import React, { useState, useEffect } from 'react';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { useFilters } from '../../context/FilterContext';

const PriceFilterAccordion = () => {
  const { 
    priceRange, 
    tempPriceRange, 
    handlePriceChange, 
    applyPriceFilter, 
    activeAccordions, 
    toggleAccordion 
  } = useFilters();
  
  const isActive = activeAccordions.price;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
      <button 
        className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
        onClick={() => toggleAccordion('price')}
      >
        <h2 className="text-base font-medium text-gray-800">Rango de precio</h2>
        {isActive ? <BiChevronUp size={20} /> : <BiChevronDown size={20} />}
      </button>
      
      {isActive && (
        <div className="p-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="min-price" className="block text-xs text-gray-600 mb-1">Mínimo</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">Gs.</span>
                </div>
                <input
                  type="text"
                  id="min-price"
                  className="block w-full pl-12 pr-3 py-2 sm:text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  value={tempPriceRange.min}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="max-price" className="block text-xs text-gray-600 mb-1">Máximo</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">Gs.</span>
                </div>
                <input
                  type="text"
                  id="max-price"
                  className="block w-full pl-12 pr-3 py-2 sm:text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sin límite"
                  value={tempPriceRange.max}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <button
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            onClick={applyPriceFilter}
          >
            Aplicar filtro
          </button>
          
          {(priceRange.min || priceRange.max) && (
            <div className="mt-3 bg-blue-50 p-2 rounded-md text-center">
              <p className="text-xs text-blue-700">
                Filtro actual: {priceRange.min ? `Gs. ${Number(priceRange.min).toLocaleString()}` : 'Gs. 0'} - {priceRange.max ? `Gs. ${Number(priceRange.max).toLocaleString()}` : 'Sin límite'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceFilterAccordion;
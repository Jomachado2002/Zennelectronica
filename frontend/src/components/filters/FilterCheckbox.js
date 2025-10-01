// src/components/filters/FilterCheckbox.js
import React from 'react';
import { BiCheck } from 'react-icons/bi';

const FilterCheckbox = ({ label, checked, onChange, count, bold }) => (
  <label className="flex items-center py-2 px-2 rounded hover:bg-gray-100 cursor-pointer group transition-colors">
    <div className="relative flex items-center">
      <input
        type="checkbox"
        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        checked={checked}
        onChange={onChange}
      />
      {checked && (
        <BiCheck className="absolute text-white pointer-events-none" style={{ left: '2px' }} />
      )}
    </div>
    <span className={`ml-2 text-sm ${bold ? 'font-medium text-gray-800' : 'text-gray-700'} group-hover:text-gray-900`}>{label}</span>
    {count !== undefined && (
      <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">{count}</span>
    )}
  </label>
);

export default FilterCheckbox;
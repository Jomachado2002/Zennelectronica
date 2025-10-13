import React from 'react';
import useCategories from '../hooks/useCategories';

const DynamicProductSpecifications = ({ 
  selectedCategory, 
  selectedSubcategory, 
  data, 
  handleOnChange 
}) => {
  const { getSpecificationsBySubcategory, loading } = useCategories();

  // Obtener especificaciones dinámicamente
  const specifications = getSpecificationsBySubcategory(selectedCategory, selectedSubcategory);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Cargando especificaciones...</span>
      </div>
    );
  }

  if (!selectedCategory || !selectedSubcategory) {
    return (
      <div className="text-gray-500 text-center py-4">
        Selecciona una categoría y subcategoría para ver las especificaciones
      </div>
    );
  }

  if (specifications.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No hay especificaciones disponibles para esta subcategoría
      </div>
    );
  }

  const renderInput = (spec) => {
    // Usar el nombre real de la especificación como campo
    const fieldName = spec.name;
    const currentValue = data[fieldName] || '';
    
    switch (spec.type) {
      case 'number':
        return (
          <input
            type="number"
            name={fieldName}
            value={currentValue}
            onChange={handleOnChange}
            placeholder={spec.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={spec.required}
          />
        );
      
      case 'boolean':
        return (
          <select
            name={fieldName}
            value={currentValue}
            onChange={handleOnChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={spec.required}
          >
            <option value="">Seleccionar...</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        );
      
      case 'select':
        return (
          <select
            name={fieldName}
            value={currentValue}
            onChange={handleOnChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={spec.required}
          >
            <option value="">Seleccionar...</option>
            {spec.options?.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default: // text
        return (
          <input
            type="text"
            name={fieldName}
            value={currentValue}
            onChange={handleOnChange}
            placeholder={spec.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={spec.required}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Especificaciones del Producto
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specifications.map((spec, index) => (
          <div key={spec._id || index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {spec.label}
              {spec.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput(spec)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DynamicProductSpecifications;
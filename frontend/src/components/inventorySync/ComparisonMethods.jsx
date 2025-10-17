// frontend/src/components/inventorySync/ComparisonMethods.jsx
// Componente para seleccionar el método de comparación

import React from 'react';

const ComparisonMethods = ({ method, onMethodChange, onCompare, isLoading, canCompare }) => {
    const methods = [
        {
            id: 'code',
            title: 'Comparar por Código',
            description: 'Compara productos usando el código del producto (recomendado)',
            icon: '🔢',
            recommended: true
        },
        {
            id: 'name',
            title: 'Comparar por Nombre',
            description: 'Compara productos usando nombres normalizados (alternativo)',
            icon: '📝',
            recommended: false
        }
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Método de Comparación
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {methods.map((methodOption) => (
                        <div
                            key={methodOption.id}
                            className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                                method === methodOption.id
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onClick={() => onMethodChange(methodOption.id)}
                        >
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">{methodOption.icon}</span>
                                </div>
                                <div className="ml-3 flex-1">
                                    <div className="flex items-center">
                                        <h4 className="text-sm font-medium text-gray-900">
                                            {methodOption.title}
                                        </h4>
                                        {methodOption.recommended && (
                                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Recomendado
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {methodOption.description}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <input
                                        type="radio"
                                        name="comparison-method"
                                        value={methodOption.id}
                                        checked={method === methodOption.id}
                                        onChange={() => onMethodChange(methodOption.id)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botón de Comparación */}
            <div className="flex justify-center">
                <button
                    onClick={onCompare}
                    disabled={!canCompare || isLoading}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        canCompare && !isLoading
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Comparando...
                        </>
                    ) : (
                        <>
                            {method === 'code' ? '🔢' : '📝'} Comparar Productos
                        </>
                    )}
                </button>
            </div>

            {/* Información adicional */}
            {method && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Información del Método
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                {method === 'code' ? (
                                    <p>
                                        La comparación por código es más precisa y rápida. 
                                        Se recomienda cuando el proveedor mantiene códigos consistentes.
                                    </p>
                                ) : (
                                    <p>
                                        La comparación por nombre puede detectar productos similares incluso si los códigos han cambiado, 
                                        pero puede generar coincidencias falsas.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonMethods;

// frontend/src/components/inventorySync/ResultsSummary.jsx
// Componente para mostrar el resumen de resultados de la comparación

import React from 'react';

const ResultsSummary = ({ results, method }) => {
    const { summary } = results;

    const stats = [
        {
            label: 'Total Proveedor',
            value: summary.totalProviderProducts,
            color: 'blue',
            icon: '📦'
        },
        {
            label: 'Total Sistema',
            value: summary.totalSystemProducts,
            color: 'green',
            icon: '🗄️'
        },
        {
            label: 'Coincidencias',
            value: summary.matchedProducts,
            color: 'purple',
            icon: '✅'
        },
        {
            label: 'Nuevos',
            value: summary.notInSystem,
            color: 'orange',
            icon: '🆕'
        },
        {
            label: 'Sin Stock',
            value: summary.notInProvider,
            color: 'red',
            icon: '❌'
        },
        {
            label: 'Cambios Precio',
            value: summary.priceChanges,
            color: 'yellow',
            icon: '💰'
        },
        {
            label: 'Reaparecen',
            value: summary.restockedProducts || 0,
            color: 'indigo',
            icon: '🔄'
        }
    ];

    // Agregar estadística específica para comparación por nombre
    if (method === 'name' && summary.codeMismatches !== undefined) {
        stats.push({
            label: 'Códigos No Coinciden',
            value: summary.codeMismatches,
            color: 'pink',
            icon: '⚠️'
        });
    }

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 border-blue-200 text-blue-800',
            green: 'bg-green-50 border-green-200 text-green-800',
            purple: 'bg-purple-50 border-purple-200 text-purple-800',
            orange: 'bg-orange-50 border-orange-200 text-orange-800',
            red: 'bg-red-50 border-red-200 text-red-800',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            pink: 'bg-pink-50 border-pink-200 text-pink-800',
            indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800'
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">
                        Resumen de Comparación
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Método: <span className="font-medium">{method === 'code' ? 'Por Código' : 'Por Nombre'}</span>
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Completado
                    </span>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`border rounded-lg p-4 ${getColorClasses(stat.color)}`}
                    >
                        <div className="flex items-center">
                            <span className="text-2xl mr-2">{stat.icon}</span>
                            <div>
                                <p className="text-xs font-medium opacity-75">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-bold">
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Información adicional */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Acciones recomendadas */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                        Acciones Recomendadas
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        {summary.notInSystem > 0 && (
                            <li>• Importar {summary.notInSystem} productos nuevos</li>
                        )}
                        {summary.notInProvider > 0 && (
                            <li>• Marcar {summary.notInProvider} productos como sin stock</li>
                        )}
                        {summary.priceChanges > 0 && (
                            <li>• Revisar {summary.priceChanges} cambios de precio</li>
                        )}
                        {(summary.restockedProducts || 0) > 0 && (
                            <li>• Restockear {summary.restockedProducts} productos que reaparecen</li>
                        )}
                        {method === 'name' && summary.codeMismatches > 0 && (
                            <li>• Verificar {summary.codeMismatches} códigos inconsistentes</li>
                        )}
                    </ul>
                </div>

                {/* Métricas de calidad */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-gray-800 mb-2">
                        Métricas de Calidad
                    </h3>
                    <div className="text-sm text-gray-700 space-y-1">
                        <div className="flex justify-between">
                            <span>Coincidencia:</span>
                            <span className="font-medium">
                                {((summary.matchedProducts / summary.totalProviderProducts) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Nuevos productos:</span>
                            <span className="font-medium">
                                {((summary.notInSystem / summary.totalProviderProducts) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Desactualizados:</span>
                            <span className="font-medium">
                                {((summary.notInProvider / summary.totalSystemProducts) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertas importantes */}
            {(summary.restockedProducts || 0) > 0 && (
                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-indigo-800">
                                Productos que Reaparecen
                            </h3>
                            <p className="mt-1 text-sm text-indigo-700">
                                Se encontraron {summary.restockedProducts} productos que estaban sin stock 
                                pero ahora están disponibles en el proveedor. Puedes restockearlos para 
                                marcarlos como disponibles nuevamente.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {summary.priceChanges > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Cambios de Precio Detectados
                            </h3>
                            <p className="mt-1 text-sm text-yellow-700">
                                Se encontraron {summary.priceChanges} productos con cambios de precio. 
                                Revisa la tabla de productos coincidentes para ver los detalles.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsSummary;

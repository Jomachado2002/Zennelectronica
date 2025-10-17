import React, { useState } from 'react';
import { FaExclamationTriangle, FaSyncAlt, FaCheckCircle } from 'react-icons/fa';

const CodeMismatches = ({ codeMismatches, onUpdateCodes, isLoading }) => {
    const [selectedMismatches, setSelectedMismatches] = useState([]);

    if (!codeMismatches || codeMismatches.length === 0) return null;

    const handleSelectMismatch = (productId) => {
        setSelectedMismatches(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectAll = () => {
        if (selectedMismatches.length === codeMismatches.length) {
            setSelectedMismatches([]);
        } else {
            setSelectedMismatches(codeMismatches.map(m => m.productId));
        }
    };

    const handleUpdateSelected = () => {
        const updates = selectedMismatches.map(productId => {
            const mismatch = codeMismatches.find(m => m.productId === productId);
            return {
                productId,
                newCode: mismatch.providerCode
            };
        });

        onUpdateCodes(updates);
        setSelectedMismatches([]);
    };

    const allSelected = selectedMismatches.length === codeMismatches.length;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-semibold text-yellow-700 mb-4 flex items-center">
                <FaExclamationTriangle className="mr-2" /> 
                Productos con Códigos No Coincidentes
            </h2>
            <p className="text-gray-600 mb-4">
                Estos productos tienen nombres similares pero códigos diferentes. 
                Puedes actualizar los códigos del sistema con los del proveedor.
            </p>

            <div className="flex justify-end gap-3 mb-4">
                <button
                    onClick={handleUpdateSelected}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors duration-200 flex items-center"
                    disabled={selectedMismatches.length === 0 || isLoading}
                >
                    {isLoading ? (
                        <>
                            <FaSyncAlt className="animate-spin mr-2" /> Actualizando...
                        </>
                    ) : (
                        <>
                            <FaSyncAlt className="mr-2" />
                            Actualizar Códigos Seleccionados ({selectedMismatches.length})
                        </>
                    )}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                            <th className="py-3 px-4 border-b">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-4 w-4 text-blue-600"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    disabled={isLoading}
                                />
                            </th>
                            <th className="py-3 px-4 border-b">Código Sistema</th>
                            <th className="py-3 px-4 border-b">Código Proveedor</th>
                            <th className="py-3 px-4 border-b">Nombre del Producto</th>
                            <th className="py-3 px-4 border-b">Acción Sugerida</th>
                        </tr>
                    </thead>
                    <tbody>
                        {codeMismatches.map((mismatch) => (
                            <tr key={mismatch.productId} className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-b">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                        checked={selectedMismatches.includes(mismatch.productId)}
                                        onChange={() => handleSelectMismatch(mismatch.productId)}
                                        disabled={isLoading}
                                    />
                                </td>
                                <td className="py-3 px-4 border-b text-sm text-gray-800">
                                    {mismatch.productCode}
                                </td>
                                <td className="py-3 px-4 border-b text-sm text-green-600 font-medium">
                                    {mismatch.providerCode}
                                </td>
                                <td className="py-3 px-4 border-b text-sm text-gray-800">
                                    {mismatch.productName}
                                </td>
                                <td className="py-3 px-4 border-b text-sm">
                                    <span className="flex items-center text-yellow-600">
                                        <FaExclamationTriangle className="mr-1" />
                                        Actualizar código
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Al actualizar los códigos, el sistema utilizará los códigos del proveedor 
                    para futuras comparaciones. Esto ayudará a mantener la sincronización entre tu inventario 
                    y el catálogo del proveedor.
                </p>
            </div>
        </div>
    );
};

export default CodeMismatches;

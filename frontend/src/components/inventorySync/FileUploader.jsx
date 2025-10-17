// frontend/src/components/inventorySync/FileUploader.jsx
// Componente para subir archivos CSV

import React, { useRef } from 'react';

const FileUploader = ({ onFileSelect, selectedFile, csvData }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileSelect(file);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file && file.type === 'text/csv') {
            onFileSelect(file);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo CSV del Proveedor
                </label>
                
                {/* Drop Zone */}
                <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    
                    <div className="mt-2">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer">
                                Haz clic para seleccionar
                            </span>
                            {' '}o arrastra y suelta tu archivo CSV aquí
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Solo archivos CSV, máximo 10MB
                        </p>
                    </div>
                </div>
            </div>

            {/* File Info */}
            {selectedFile && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-green-800">
                                Archivo seleccionado
                            </h3>
                            <div className="mt-2 text-sm text-green-700">
                                <p><strong>Nombre:</strong> {selectedFile.name}</p>
                                <p><strong>Tamaño:</strong> {formatFileSize(selectedFile.size)}</p>
                                <p><strong>Tipo:</strong> {selectedFile.type || 'text/csv'}</p>
                                {csvData && (
                                    <p><strong>Productos detectados:</strong> {csvData.length}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Structure Info */}
            {csvData && csvData.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                                Estructura del CSV detectada
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <p>El archivo contiene {csvData.length} productos del proveedor.</p>
                                <p className="mt-1">
                                    Campos detectados: {Object.keys(csvData[0] || {}).slice(0, 3).join(', ')}
                                    {Object.keys(csvData[0] || {}).length > 3 && '...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploader;

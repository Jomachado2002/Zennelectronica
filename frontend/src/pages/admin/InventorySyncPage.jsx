// frontend/src/pages/admin/InventorySyncPage.jsx
// Página principal para la sincronización de inventario

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../../config/axiosInstance';
import Papa from 'papaparse';
import useCategories from '../../hooks/useCategories';

// Componentes
import CategorySelector from '../../components/inventorySync/CategorySelector';
import FileUploader from '../../components/inventorySync/FileUploader';
import ComparisonMethods from '../../components/inventorySync/ComparisonMethods';
import ResultsSummary from '../../components/inventorySync/ResultsSummary';
import ProductsNotInSystem from '../../components/inventorySync/ProductsNotInSystem';
import ProductsNotInProvider from '../../components/inventorySync/ProductsNotInProvider';
import MatchedProducts from '../../components/inventorySync/MatchedProducts';
import CodeMismatches from '../../components/inventorySync/CodeMismatches';

const InventorySyncPage = () => {
    // Hook para categorías
    const { categories, loading: categoriesLoading } = useCategories();
    
    // Estados principales
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [csvData, setCsvData] = useState(null);
    const [comparisonMethod, setComparisonMethod] = useState('code');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Estados de resultados
    const [comparisonResults, setComparisonResults] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState({
        notInSystem: [],
        notInProvider: []
    });

    // Resetear subcategoría cuando cambie la categoría
    useEffect(() => {
        if (selectedCategory) {
            setSelectedSubcategory('');
        }
    }, [selectedCategory]);

    // Manejar selección de archivo CSV
    const handleFileSelect = (file) => {
        setCsvFile(file);
        setCsvData(null);
        setComparisonResults(null);
        setError('');

        // Parsear CSV inmediatamente para validación
        Papa.parse(file, {
            header: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError('Error parseando CSV: ' + results.errors[0].message);
                    return;
                }
                setCsvData(results.data);
                console.log('CSV parseado:', results.data.length, 'productos');
            },
            error: (error) => {
                setError('Error leyendo archivo CSV: ' + error.message);
            }
        });
    };

    // Ejecutar comparación
    const handleCompare = async () => {
        if (!csvFile || !selectedCategory || !selectedSubcategory) {
            setError('Por favor selecciona un archivo CSV, categoría y subcategoría');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('csvFile', csvFile);
            formData.append('category', selectedCategory);
            formData.append('subcategory', selectedSubcategory);

            const endpoint = comparisonMethod === 'code' 
                ? '/api/admin/inventory-sync/compare-by-code'
                : '/api/admin/inventory-sync/compare-by-name';

            const response = await axiosInstance.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setComparisonResults(response.data);
                console.log('Comparación completada:', response.data.summary);
            } else {
                setError(response.data.error || 'Error en la comparación');
            }

        } catch (error) {
            console.error('Error en comparación:', error);
            setError(error.response?.data?.error || 'Error interno del servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // Manejar selección de productos
    const handleProductSelection = (type, productId, selected) => {
        setSelectedProducts(prev => ({
            ...prev,
            [type]: selected 
                ? [...prev[type], productId]
                : prev[type].filter(id => id !== productId)
        }));
    };

    // Manejar selección masiva
    const handleSelectAll = (type, productIds, selected) => {
        setSelectedProducts(prev => ({
            ...prev,
            [type]: selected ? productIds : []
        }));
    };

    // Importar productos seleccionados
    const handleImportProducts = async () => {
        if (!comparisonResults || selectedProducts.notInSystem.length === 0) {
            setError('No hay productos seleccionados para importar');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const productsToImport = comparisonResults.notInSystem.filter(product => 
                selectedProducts.notInSystem.includes(product.providerCode)
            );

            const response = await axiosInstance.post('/api/admin/inventory-sync/import-products', {
                products: productsToImport.map(product => ({
                    providerCode: product.providerCode,
                    productName: product.productName,
                    imageUrl: product.imageUrl,
                    productUrl: product.productUrl,
                    priceUSD: product.priceUSD,
                    category: selectedCategory,
                    subcategory: selectedSubcategory
                })),
                config: {
                    deliveryCost: 30000,
                    exchangeRate: 7300,
                    profitMargin: 0.25
                }
            });

            if (response.data.success) {
                alert(`Importación exitosa: ${response.data.imported} productos importados, ${response.data.failed} fallaron`);
                // Recargar comparación para actualizar resultados
                handleCompare();
            } else {
                setError(response.data.error || 'Error en la importación');
            }

        } catch (error) {
            console.error('Error importando productos:', error);
            setError(error.response?.data?.error || 'Error interno del servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // Actualizar stock de productos seleccionados
    const handleUpdateStock = async (action = 'mark_out_of_stock') => {
        if (!comparisonResults || selectedProducts.notInProvider.length === 0) {
            setError('No hay productos seleccionados para actualizar');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const productIds = comparisonResults.notInProvider
                .filter(product => selectedProducts.notInProvider.includes(product.productId))
                .map(product => product.productId);

            const response = await axiosInstance.post('/api/admin/inventory-sync/update-stock', {
                action,
                productIds,
                updateAll: false
            });

            if (response.data.success) {
                alert(`Stock actualizado: ${response.data.updatedCount} productos marcados como sin stock`);
                // Recargar comparación para actualizar resultados
                handleCompare();
            } else {
                setError(response.data.error || 'Error actualizando stock');
            }

        } catch (error) {
            console.error('Error actualizando stock:', error);
            setError(error.response?.data?.error || 'Error interno del servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // Actualizar códigos de productos
    const handleUpdateCodes = async (updates) => {
        if (updates.length === 0) {
            setError('No hay códigos seleccionados para actualizar');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await axiosInstance.post('/api/admin/inventory-sync/update-product-codes', {
                updates
            });

            if (response.data.success) {
                alert(`Códigos actualizados: ${response.data.results.success} exitosos, ${response.data.results.failed} fallidos`);
                // Recargar comparación para actualizar resultados
                handleCompare();
            } else {
                setError(response.data.error || 'Error actualizando códigos');
            }

        } catch (error) {
            console.error('Error actualizando códigos:', error);
            setError(error.response?.data?.error || 'Error interno del servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // Limpiar selecciones
    const clearSelections = () => {
        setSelectedProducts({
            notInSystem: [],
            notInProvider: []
        });
    };

    // Resetear todo
    const resetAll = () => {
        setCsvFile(null);
        setCsvData(null);
        setComparisonResults(null);
        setSelectedCategory('');
        setSelectedSubcategory('');
        setComparisonMethod('code');
        clearSelections();
        setError('');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Sincronización de Inventario
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Compara tu inventario con los productos del proveedor usando archivos CSV
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Configuración */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Configuración de Sincronización
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Selector de Categoría */}
                        <CategorySelector
                            categories={categories}
                            selectedCategory={selectedCategory}
                            selectedSubcategory={selectedSubcategory}
                            onCategoryChange={setSelectedCategory}
                            onSubcategoryChange={setSelectedSubcategory}
                        />

                        {/* Upload de CSV */}
                        <FileUploader
                            onFileSelect={handleFileSelect}
                            selectedFile={csvFile}
                            csvData={csvData}
                        />
                    </div>

                    {/* Métodos de Comparación */}
                    <div className="mt-6">
                        <ComparisonMethods
                            method={comparisonMethod}
                            onMethodChange={setComparisonMethod}
                            onCompare={handleCompare}
                            isLoading={isLoading}
                            canCompare={csvFile && selectedCategory && selectedSubcategory}
                        />
                    </div>
                </div>

                {/* Resultados */}
                {comparisonResults && (
                    <div className="space-y-6">
                        {/* Resumen */}
                        <ResultsSummary
                            results={comparisonResults}
                            method={comparisonMethod}
                        />

                        {/* Productos Nuevos (No están en el sistema) */}
                        {comparisonResults.notInSystem.length > 0 && (
                            <ProductsNotInSystem
                                products={comparisonResults.notInSystem}
                                selectedProducts={selectedProducts.notInSystem}
                                onProductSelect={handleProductSelection}
                                onSelectAll={handleSelectAll}
                                onImportSelected={handleImportProducts}
                                onImportAll={() => {
                                    setSelectedProducts(prev => ({
                                        ...prev,
                                        notInSystem: comparisonResults.notInSystem.map(p => p.providerCode)
                                    }));
                                    handleImportProducts();
                                }}
                                isLoading={isLoading}
                            />
                        )}

                        {/* Productos Sin Stock en Proveedor */}
                        {comparisonResults.notInProvider.length > 0 && (
                            <ProductsNotInProvider
                                products={comparisonResults.notInProvider}
                                selectedProducts={selectedProducts.notInProvider}
                                onProductSelect={handleProductSelection}
                                onSelectAll={handleSelectAll}
                                onUpdateSelected={handleUpdateStock}
                                onUpdateAll={() => {
                                    setSelectedProducts(prev => ({
                                        ...prev,
                                        notInProvider: comparisonResults.notInProvider.map(p => p.productId)
                                    }));
                                    handleUpdateStock();
                                }}
                                isLoading={isLoading}
                            />
                        )}

                        {/* Productos Coincidentes */}
                        {comparisonResults.matched.length > 0 && (
                            <MatchedProducts
                                products={comparisonResults.matched}
                                method={comparisonMethod}
                                showPriceChanges={comparisonResults.summary.priceChanges > 0}
                            />
                        )}

                        {/* Códigos No Coincidentes (solo para comparación por nombre) */}
                        {comparisonMethod === 'name' && comparisonResults.codeMismatches && comparisonResults.codeMismatches.length > 0 && (
                            <CodeMismatches
                                codeMismatches={comparisonResults.codeMismatches}
                                onUpdateCodes={handleUpdateCodes}
                                isLoading={isLoading}
                            />
                        )}
                    </div>
                )}

                {/* Botones de Acción */}
                <div className="mt-8 flex justify-between">
                    <button
                        onClick={resetAll}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Reiniciar Todo
                    </button>

                    {comparisonResults && (
                        <div className="flex space-x-4">
                            <button
                                onClick={clearSelections}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Limpiar Selecciones
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventorySyncPage;

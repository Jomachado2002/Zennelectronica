// frontend/src/pages/admin/ExportProductsPage.jsx
// Página para exportar productos con Excel e imágenes

import React, { useState, useEffect } from 'react';
import { 
    FaDownload, 
    FaFileExcel, 
    FaImage, 
    FaCheck, 
    FaTimes, 
    FaSpinner,
    FaFilter,
    FaList,
    FaBox
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

const ExportProductsPage = () => {
    // Estados para categorías
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    
    // Estados principales
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    
    // Estados para exportación
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    // Cargar categorías
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setCategoriesLoading(true);
                const response = await axiosInstance.get('/api/admin/inventory-sync/categories');
                if (response.data.success) {
                    setCategories(response.data.categories);
                } else {
                    console.error('Error cargando categorías:', response.data.error);
                    toast.error('Error cargando categorías');
                }
            } catch (error) {
                console.error('Error cargando categorías:', error);
                toast.error('Error cargando categorías');
            } finally {
                setCategoriesLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Función para cargar productos
    const fetchProducts = async () => {
        try {
            setProductsLoading(true);
            const response = await axiosInstance.get('/api/export-products', {
                params: {
                    category_id: selectedCategory,
                    subcategory_id: selectedSubcategory
                }
            });

            if (response.data.success) {
                setProducts(response.data.data.products);
                setSelectedProducts([]);
                setSelectAll(false);
                toast.success(`${response.data.data.total} productos encontrados`);
            } else {
                toast.error(response.data.error || 'Error cargando productos');
            }
        } catch (error) {
            console.error('Error cargando productos:', error);
            toast.error('Error cargando productos');
        } finally {
            setProductsLoading(false);
        }
    };

    // Cargar productos cuando cambien las categorías
    useEffect(() => {
        if (selectedCategory && selectedSubcategory) {
            fetchProducts();
        } else {
            setProducts([]);
            setSelectedProducts([]);
            setSelectAll(false);
        }
    }, [selectedCategory, selectedSubcategory]);

    // Manejar selección de productos
    const handleProductSelect = (productId) => {
        setSelectedProducts(prev => {
            const newSelection = prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId];
            
            setSelectAll(newSelection.length === products.length);
            return newSelection;
        });
    };

    // Manejar selección masiva
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p.id));
        }
        setSelectAll(!selectAll);
    };

    // Función para exportar productos
    const handleExport = async () => {
        if (selectedProducts.length === 0) {
            toast.error('Por favor selecciona al menos un producto para exportar');
            return;
        }

        try {
            setIsExporting(true);
            setExportProgress(0);

            // Simular progreso
            const progressInterval = setInterval(() => {
                setExportProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await axiosInstance.post('/api/download-product-images', {
                product_ids: selectedProducts,
                category: selectedCategory,
                subcategory: selectedSubcategory
            }, {
                responseType: 'blob'
            });

            clearInterval(progressInterval);
            setExportProgress(100);

            // Crear enlace de descarga
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `productos_${selectedSubcategory.toLowerCase()}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Exportación completada exitosamente');
        } catch (error) {
            console.error('Error en exportación:', error);
            toast.error('Error en la exportación');
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    // Obtener subcategorías de la categoría seleccionada
    const getSubcategories = () => {
        const category = categories.find(cat => cat.value === selectedCategory);
        return category ? category.subcategories : [];
    };

    // Formatear precio
    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <FaDownload className="text-blue-600" />
                        Exportar Productos
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Exporta información detallada de productos con stock > 0 en Excel junto con sus imágenes organizadas. Las descripciones incluyen automáticamente el mensaje de contacto para reventa.
                    </p>
                </div>

                {/* Filtros */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <FaFilter className="text-indigo-600" />
                        Filtros de Selección
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Selector de Categoría */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Categoría
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={categoriesLoading}
                            >
                                <option value="">Seleccionar categoría...</option>
                                {categories.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de Subcategoría */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subcategoría
                            </label>
                            <select
                                value={selectedSubcategory}
                                onChange={(e) => setSelectedSubcategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={!selectedCategory}
                            >
                                <option value="">Seleccionar subcategoría...</option>
                                {getSubcategories().map(subcategory => (
                                    <option key={subcategory.value} value={subcategory.value}>
                                        {subcategory.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Lista de Productos */}
                {products.length > 0 && (
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                <FaList className="text-green-600" />
                                Productos Encontrados ({products.length})
                            </h2>
                            
                            <div className="flex items-center gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Seleccionar todos</span>
                                </label>
                                
                                <button
                                    onClick={handleExport}
                                    disabled={selectedProducts.length === 0 || isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <FaSpinner className="animate-spin" />
                                    ) : (
                                        <FaDownload />
                                    )}
                                    {isExporting ? 'Exportando...' : `Exportar (${selectedProducts.length})`}
                                </button>
                            </div>
                        </div>

                        {/* Barra de progreso */}
                        {isExporting && (
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Progreso de exportación</span>
                                    <span>{exportProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${exportProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Tabla de productos */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Seleccionar
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Imagen
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Título
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Descripción
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Precio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stock
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {products.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleProductSelect(product.id)}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.titulo}
                                                        className="h-12 w-12 object-cover rounded"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center" style={{ display: product.image_url ? 'none' : 'flex' }}>
                                                    <FaImage className="text-gray-400" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {product.titulo}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {product.marca} - {product.codigo}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 max-w-xs">
                                                    {product.descripcion || 'Sin descripción'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatPrice(product.precio_venta)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    product.stock > 10 ? 'bg-green-100 text-green-800' :
                                                    product.stock > 5 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {product.stock || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Estado de carga */}
                {productsLoading && (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                        <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Cargando productos...</p>
                    </div>
                )}

                {/* Mensaje cuando no hay productos */}
                {!productsLoading && products.length === 0 && selectedCategory && selectedSubcategory && (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                        <FaBox className="text-4xl text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No se encontraron productos para la categoría y subcategoría seleccionadas</p>
                    </div>
                )}

                {/* Instrucciones */}
                {!selectedCategory && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-blue-900 mb-2">
                            Instrucciones de Uso
                        </h3>
                        <ol className="list-decimal list-inside text-blue-800 space-y-2">
                            <li>Selecciona una categoría y subcategoría para filtrar los productos</li>
                            <li>Revisa la lista de productos encontrados (solo productos con stock > 0)</li>
                            <li>Selecciona los productos que deseas exportar (o selecciona todos)</li>
                            <li>Haz clic en "Exportar" para descargar el archivo ZIP</li>
                            <li>El archivo incluirá un Excel con los datos y carpetas organizadas con las imágenes</li>
                            <li>Las descripciones incluyen automáticamente el mensaje de contacto para reventa</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportProductsPage;

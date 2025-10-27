import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaFilePdf, 
  FaDownload, 
  FaSpinner, 
  FaFilter, 
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle
} from 'react-icons/fa';
import SummaryApi from '../../common';
import CatalogPDF from '../../components/CatalogPDF';

const AdminCatalogoPDF = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [subcategories, setSubcategories] = useState([]);
  const [catalogData, setCatalogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalSubcategories: 0,
    totalProducts: 0
  });

  // Cargar categorías al montar el componente
  useEffect(() => {
    loadCategories();
  }, []);

  // Cargar subcategorías cuando cambia la categoría seleccionada
  useEffect(() => {
    if (selectedCategory !== 'all') {
      const category = categories.find(cat => cat.value === selectedCategory);
      if (category) {
        setSubcategories(category.subcategories || []);
      } else {
        setSubcategories([]);
      }
    } else {
      setSubcategories([]);
    }
    setSelectedSubcategory('all');
  }, [selectedCategory, categories]);

  // Cargar datos del catálogo cuando cambian los filtros
  useEffect(() => {
    if (categories.length > 0) {
      loadCatalogData();
    }
  }, [selectedCategory, selectedSubcategory, categories]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(SummaryApi.catalog.getCategories.url, {
        method: SummaryApi.catalog.getCategories.method,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
      } else {
        toast.error('Error cargando categorías');
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedSubcategory !== 'all') {
        params.append('subcategory', selectedSubcategory);
      }
      
      const response = await fetch(`${SummaryApi.catalog.getProducts.url}?${params}`, {
        method: SummaryApi.catalog.getProducts.method,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCatalogData(result.data);
        setStats({
          totalCategories: result.total_categories,
          totalSubcategories: result.data.reduce((acc, cat) => acc + cat.subcategorias.length, 0),
          totalProducts: result.total_products
        });
      } else {
        toast.error('Error cargando datos del catálogo');
      }
    } catch (error) {
      console.error('Error cargando datos del catálogo:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // La generación del PDF ahora se maneja directamente en el cliente
  // No necesitamos la función generatePDF ya que React PDF lo maneja

  const getFilterDescription = () => {
    if (selectedCategory === 'all') {
      return 'Todas las categorías';
    }
    
    const category = categories.find(cat => cat.value === selectedCategory);
    if (!category) return 'Categoría no encontrada';
    
    if (selectedSubcategory === 'all') {
      return `Categoría: ${category.label}`;
    }
    
    const subcategory = subcategories.find(sub => sub.value === selectedSubcategory);
    if (!subcategory) return `Categoría: ${category.label}`;
    
    return `${category.label} > ${subcategory.label}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaFilePdf className="mr-3 text-red-600" />
                Catálogo de Productos (PDF)
              </h1>
              <p className="text-gray-600 mt-1">
                Genera un catálogo PDF profesional con productos organizados por categorías
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  previewMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FaEye className="w-4 h-4" />
                <span>{previewMode ? 'Ocultar Vista' : 'Vista Previa'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Filtros */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaFilter className="mr-2 text-blue-600" />
                Filtros
              </h2>
              
              {/* Filtro de Categoría */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id || category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Subcategoría */}
              {selectedCategory !== 'all' && subcategories.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategoría
                  </label>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <option value="all">Todas las subcategorías</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory.id || subcategory.value} value={subcategory.value}>
                        {subcategory.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Estadísticas */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Estadísticas</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Categorías:</span>
                    <span className="font-medium">{stats.totalCategories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subcategorías:</span>
                    <span className="font-medium">{stats.totalSubcategories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Productos:</span>
                    <span className="font-medium">{stats.totalProducts}</span>
                  </div>
                </div>
              </div>

              {/* Botón Generar PDF con Puppeteer del Backend */}
              {catalogData.length > 0 ? (
                <CatalogPDF 
                  catalogData={catalogData} 
                  companyName="Zenn Electrónica"
                  selectedCategory={selectedCategory}
                  selectedSubcategory={selectedSubcategory}
                />
              ) : (
                <button
                  disabled={true}
                  className="w-full bg-gray-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-not-allowed"
                >
                  <FaDownload className="w-4 h-4" />
                  <span>No hay productos para generar PDF</span>
                </button>
              )}

              {/* Información del filtro actual */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <FaInfoCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Filtro actual:</p>
                    <p>{getFilterDescription()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Contenido */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-center">
                  <FaSpinner className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                  <span className="text-gray-600">Cargando datos del catálogo...</span>
                </div>
              </div>
            ) : catalogData.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <FaTimesCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay productos disponibles
                  </h3>
                  <p className="text-gray-600">
                    No se encontraron productos con los filtros seleccionados.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Resumen del Catálogo
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.totalCategories}
                      </div>
                      <div className="text-sm text-blue-800">Categorías</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.totalSubcategories}
                      </div>
                      <div className="text-sm text-green-800">Subcategorías</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.totalProducts}
                      </div>
                      <div className="text-sm text-purple-800">Productos</div>
                    </div>
                  </div>
                </div>

                {/* Vista Previa */}
                {previewMode && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Vista Previa del Catálogo
                    </h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {catalogData.map((category, categoryIndex) => (
                        <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {category.categoria}
                          </h3>
                          <div className="space-y-2">
                            {category.subcategorias.map((subcategory, subIndex) => (
                              <div key={subcategory.id} className="ml-4">
                                <h4 className="font-medium text-gray-700 mb-1">
                                  {subcategory.name} ({subcategory.productos.length} productos)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {subcategory.productos.slice(0, 4).map((product, productIndex) => (
                                    <div key={product.id} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                      <div className="font-medium">{product.titulo}</div>
                                      <div className="text-green-600">
                                        Gs. {product.precio.toLocaleString('es-PY')}
                                      </div>
                                    </div>
                                  ))}
                                  {subcategory.productos.length > 4 && (
                                    <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                      +{subcategory.productos.length - 4} productos más...
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCatalogoPDF;

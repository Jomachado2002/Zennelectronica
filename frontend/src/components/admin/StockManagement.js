import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, FileText, Search,
  CheckCircle, XCircle, AlertCircle, RefreshCw,
  Eye, Plus, Minus, ShoppingCart,
  TrendingUp, BarChart3, Target
} from 'lucide-react';
import SummaryApi from '../../common';
import AdminEditProduct from '../AdminEditProduct';
import UploadProduct from '../UploadProduct';

const EnhancedStockManagement = ({ onClose }) => {
  const [mayoristasData, setMayoristasData] = useState('');
  const [stockAnalysis, setStockAnalysis] = useState({
    inStock: [],
    outOfStock: [],
    newProducts: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('notebooks');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('similarity');

// Estados para modales
const [activeModal, setActiveModal] = useState(null);
const [selectedProduct, setSelectedProduct] = useState(null);
const [prefilledData, setPrefilledData] = useState(null);
const [selectedCategory, setSelectedCategory] = useState('informatica');

// Tipos de modales
const modals = {
  EDIT_PRODUCT: 'edit_product',
  CREATE_PRODUCT: 'create_product'
};

// useEffect para datos prellenados (si es necesario en el futuro)
useEffect(() => {
  // Aquí se puede agregar lógica de inicialización si es necesario
}, []);

  // Subcategorías disponibles (extraídas del sistema existente)
  const categories = [
  {
    value: 'informatica',
    label: 'Informática',
    subcategories: [
      { value: 'notebooks', label: 'Notebooks' },
      { value: 'computadoras_ensambladas', label: 'PCs Ensambladas' },
      { value: 'placas_madre', label: 'Placas Madre' },
      { value: 'tarjeta_grafica', label: 'Tarjetas Gráficas' },
      { value: 'memorias_ram', label: 'Memorias RAM' },
      { value: 'discos_duros', label: 'Discos Duros' },
      { value: 'procesador', label: 'Procesadores' },
      { value: 'gabinetes', label: 'Gabinetes' },
      { value: 'fuentes_alimentacion', label: 'Fuentes de Poder' }
    ]
  },
  {
    value: 'perifericos',
    label: 'Periféricos',
    subcategories: [
      { value: 'monitores', label: 'Monitores' },
      { value: 'teclados', label: 'Teclados' },
      { value: 'mouses', label: 'Mouses' },
      { value: 'auriculares', label: 'Auriculares' },
      { value: 'microfonos', label: 'Micrófonos' }
    ]
  },
  {
    value: 'telefonia',
    label: 'Telefonía',
    subcategories: [
      { value: 'telefonos_moviles', label: 'Teléfonos Móviles' },
      { value: 'tablets', label: 'Tablets' },
      { value: 'telefonos_fijos', label: 'Teléfonos Fijos' }
    ]
  }
];

 const processStockDataImproved = async () => {
  if (!mayoristasData.trim()) {
    alert('Por favor ingresa los datos de mayoristas');
    return;
  }

  setIsProcessing(true);

  try {
    console.log('🔄 Enviando datos al servidor:', {
      category: selectedCategory,
      subcategory: selectedSubcategory,
      dataLength: mayoristasData.length
    });

    const response = await fetch(SummaryApi.stockManagement.analyzeStock.url, {
      method: SummaryApi.stockManagement.analyzeStock.method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        mayoristasData: mayoristasData,
        category: selectedCategory,
        subcategory: selectedSubcategory
      })
    });

    const result = await response.json();
    console.log('📊 Respuesta del servidor:', result);

    if (result.success) {
      setStockAnalysis({
        inStock: result.data.inStock || [],
        outOfStock: result.data.outOfStock || [],
        newProducts: result.data.newProducts || []
      });
      setActiveTab('results');
      console.log('✅ Análisis completado:', result.data.summary);
    } else {
      alert('Error en el análisis: ' + result.message);
    }
  } catch (error) {
    console.error('❌ Error procesando datos:', error);
    alert('Error al procesar los datos: ' + error.message);
  } finally {
    setIsProcessing(false);
  }
};
  // Función para detectar categoría automáticamente
const detectCategoryFromProduct = (productName) => {
  const name = productName.toLowerCase();
  
  const patterns = [
    { regex: /\b(notebook|laptop)\b/i, category: 'informatica', subcategory: 'notebooks' },
    { regex: /\b(pc|computadora|desktop)\b/i, category: 'informatica', subcategory: 'computadoras_ensambladas' },
    { regex: /\b(procesador|processor|cpu)\b/i, category: 'informatica', subcategory: 'procesador' },
    { regex: /\b(memoria|ram)\b/i, category: 'informatica', subcategory: 'memorias_ram' },
    { regex: /\b(disco|ssd|hdd)\b/i, category: 'informatica', subcategory: 'discos_duros' },
    { regex: /\b(tarjeta.*grafica|graphics.*card|rtx|gtx)\b/i, category: 'informatica', subcategory: 'tarjeta_grafica' },
    { regex: /\b(monitor|pantalla)\b/i, category: 'perifericos', subcategory: 'monitores' },
    { regex: /\b(teclado|keyboard)\b/i, category: 'perifericos', subcategory: 'teclados' },
    { regex: /\b(mouse|raton)\b/i, category: 'perifericos', subcategory: 'mouses' },
    { regex: /\b(telefono|celular|smartphone)\b/i, category: 'telefonia', subcategory: 'telefonos_moviles' },
    { regex: /\b(tablet)\b/i, category: 'telefonia', subcategory: 'tablets' }
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(name)) {
      return { category: pattern.category, subcategory: pattern.subcategory };
    }
  }
  
  return { category: 'informatica', subcategory: 'notebooks' };
};

// Función para extraer marca del nombre
const extractBrandFromName = (productName) => {
  const name = productName.toLowerCase();
  const brands = ['hp', 'dell', 'lenovo', 'asus', 'acer', 'msi', 'alienware', 'apple', 'samsung', 'lg'];
  
  for (const brand of brands) {
    if (name.includes(brand)) {
      return brand.toUpperCase();
    }
  }
  return 'Genérica';
};

// Abrir modal de edición
const openEditProductModal = (product) => {
  console.log('🔧 Abriendo modal de edición para:', product.productName);
  setSelectedProduct(product);
  setActiveModal(modals.EDIT_PRODUCT);
};

// Abrir modal de creación con datos prellenados
const openCreateProductModal = (mayoristasProduct) => {
  console.log('➕ Abriendo modal de creación para:', mayoristasProduct.name);
  
  const detectedCategory = detectCategoryFromProduct(mayoristasProduct.name);
  
  const prefilledProductData = {
    productName: mayoristasProduct.name,
    brandName: mayoristasProduct.brand || extractBrandFromName(mayoristasProduct.name),
    category: detectedCategory.category,
    subcategory: detectedCategory.subcategory,
    sellingPrice: mayoristasProduct.price,
    processor: mayoristasProduct.processor,
    memory: mayoristasProduct.ram,
    storage: mayoristasProduct.storage,
    graphicsCard: mayoristasProduct.gpu,
    productImage: [],
    description: `${mayoristasProduct.name} - Importado desde mayorista`
  };
  
  setPrefilledData(prefilledProductData);
  setActiveModal(modals.CREATE_PRODUCT);
};

// Marcar producto como sin stock
const markAsOutOfStock = async (productId) => {
  if (!window.confirm('¿Confirmas marcar este producto como sin stock?')) return;
  
  try {
    const response = await fetch(SummaryApi.stockManagement.updateBulkStock.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'mark_out_of_stock',
        productIds: [productId]
      })
    });

    const result = await response.json();
    if (result.success) {
      alert('✅ Producto marcado como sin stock');
      processStockDataImproved();
    } else {
      alert('❌ Error: ' + result.message);
    }
  } catch (error) {
    alert('Error al actualizar stock: ' + error.message);
  }
};

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(price);
  };

  const exportResults = () => {
    const results = {
      analysis_date: new Date().toISOString(),
      subcategory: selectedSubcategory,
      summary: {
        total_my_products: stockAnalysis.inStock.length + stockAnalysis.outOfStock.length,
        in_stock: stockAnalysis.inStock.length,
        out_of_stock: stockAnalysis.outOfStock.length,
        new_available: stockAnalysis.newProducts.length
      },
      in_stock: stockAnalysis.inStock,
      out_of_stock: stockAnalysis.outOfStock,
      new_products: stockAnalysis.newProducts
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis-stock-${selectedSubcategory}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkStockUpdate = async (action, productIds) => {
    try {
      const response = await fetch('/api/productos/actualizar-stock-masivo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: action,
          productIds: productIds
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        // Refrescar análisis
        processStockDataImproved();
      } else {
        alert('❌ Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error en actualización masiva:', error);
      alert('Error en la actualización: ' + error.message);
    }
  };

  const filteredResults = () => {
    let results = [];
    
    if (filterType === 'all' || filterType === 'inStock') {
      results.push(...stockAnalysis.inStock.map(item => ({ ...item, type: 'inStock' })));
    }
    if (filterType === 'all' || filterType === 'outOfStock') {
      results.push(...stockAnalysis.outOfStock.map(item => ({ myProduct: item, type: 'outOfStock' })));
    }
    if (filterType === 'all' || filterType === 'newProducts') {
      results.push(...stockAnalysis.newProducts.map(item => ({ mayoristasProduct: item, type: 'newProduct' })));
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(item => {
        const productName = item.myProduct?.productName || item.mayoristasProduct?.name || '';
        return productName.toLowerCase().includes(searchLower);
      });
    }

    // Ordenar resultados
    if (sortBy === 'similarity' && filterType !== 'newProducts') {
      results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } else if (sortBy === 'price') {
      results.sort((a, b) => {
        const priceA = a.myProduct?.sellingPrice || a.mayoristasProduct?.price * 7300 || 0;
        const priceB = b.myProduct?.sellingPrice || b.mayoristasProduct?.price * 7300 || 0;
        return priceB - priceA;
      });
    }

    return results;
  };

  // Paginación
  const paginatedResults = () => {
    const results = filteredResults();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return results.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredResults().length / itemsPerPage);

  // Función para renderizar botones según el tipo de producto
const renderProductActions = (item) => {
  switch (item.type) {
    case 'inStock':
      return (
        <div className="flex justify-end mt-3">
          <button
            onClick={() => openEditProductModal(item.myProduct)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                     rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            📝 Editar Producto
          </button>
        </div>
      );

    case 'outOfStock':
      return (
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => markAsOutOfStock(item.myProduct._id)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white 
                     rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            ❌ Cerrar Stock
          </button>
          <button
            onClick={() => openEditProductModal(item.myProduct)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white 
                     rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            📝 Editar Producto
          </button>
        </div>
      );

    case 'newProduct':
      return (
        <div className="flex justify-end mt-3">
          <button
            onClick={() => openCreateProductModal(item.mayoristasProduct)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                     rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            ➕ Cargar Producto
          </button>
        </div>
      );

    default:
      return null;
  }
};

  const tabs = [
    { id: 'upload', label: 'Cargar Datos', icon: Upload },
    { id: 'results', label: 'Resultados', icon: FileText },
    { id: 'actions', label: 'Acciones', icon: ShoppingCart }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      {/* Header mejorado */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              📊 Gestión de Stock con Mayoristas
            </h1>
            <p className="text-gray-600">
              Analiza automáticamente los productos del mayorista vs tu inventario actual
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-blue-600'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Selector de subcategoría */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              🎯 Configuración del Análisis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Categoría:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    const category = categories.find(cat => cat.value === e.target.value);
                    if (category && category.subcategories.length > 0) {
                      setSelectedSubcategory(category.subcategories[0].value);
                    }
                  }}
                  className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Subcategoría:
                  </label>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.find(cat => cat.value === selectedCategory)?.subcategories?.map((sub) => (
                      <option key={sub.value} value={sub.value}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              <div className="flex items-end">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Análisis enfocado:</strong> Solo se compararán productos de la subcategoría seleccionada
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📋 Instrucciones Mejoradas
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
              <li>Selecciona la subcategoría que quieres analizar (ej: notebooks, monitores, etc.)</li>
              <li>Copia y pega los datos completos del mayorista en el área de texto</li>
              <li>El algoritmo mejorado detectará automáticamente los productos</li>
              <li>Comparará marca, procesador, RAM y características técnicas</li>
              <li>Obtendrás resultados más precisos sin límite de productos</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Datos de Mayoristas
            </label>
            <textarea
              value={mayoristasData}
              onChange={(e) => setMayoristasData(e.target.value)}
              placeholder="Pega aquí los datos completos de mayoristas..."
              className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              📦 Analizando subcategoría: <strong>{categories.find(cat => cat.value === selectedCategory)?.subcategories?.find(s => s.value === selectedSubcategory)?.label}</strong>
            </div>
            <button
              onClick={processStockDataImproved}
              disabled={!mayoristasData.trim() || isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Analizar Stock
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Summary Cards Mejoradas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">✅ En Stock</p>
                  <p className="text-2xl font-bold text-green-900">{stockAnalysis.inStock.length}</p>
                  <p className="text-xs text-green-600 mt-1">Productos disponibles</p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">❌ Sin Stock</p>
                  <p className="text-2xl font-bold text-red-900">{stockAnalysis.outOfStock.length}</p>
                  <p className="text-xs text-red-600 mt-1">No disponibles</p>
                </div>
                <XCircle className="text-red-500" size={32} />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">➕ Nuevos</p>
                  <p className="text-2xl font-bold text-blue-900">{stockAnalysis.newProducts.length}</p>
                  <p className="text-xs text-blue-600 mt-1">Oportunidades</p>
                </div>
                <Plus className="text-blue-500" size={32} />
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">📊 Total</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {stockAnalysis.inStock.length + stockAnalysis.outOfStock.length + stockAnalysis.newProducts.length}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Productos analizados</p>
                </div>
                <BarChart3 className="text-purple-500" size={32} />
              </div>
            </div>
          </div>

          {/* Controles de filtro y búsqueda */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los resultados</option>
              <option value="inStock">Solo en stock</option>
              <option value="outOfStock">Solo sin stock</option>
              <option value="newProducts">Solo productos nuevos</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="similarity">Por similitud</option>
              <option value="price">Por precio</option>
            </select>

            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={18} />
              Exportar
            </button>
          </div>

          {/* Lista de resultados con paginación */}
          <div className="space-y-4">
            {paginatedResults().map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* En Stock */}
                {/* En Stock */}
{item.type === 'inStock' && (
  <div>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="text-green-500" size={20} />
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ✅ EN STOCK - {item.similarity}% similitud
          </span>
          {item.threshold && (
            <span className="text-xs text-gray-500">
              (umbral: {item.threshold}%)
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Tu producto:</h4>
            <p className="text-sm text-gray-600 mb-2">{item.myProduct.productName}</p>
            <p className="text-xs text-gray-500">Marca: {item.myProduct.brandName}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">En mayorista:</h4>
            <p className="text-sm text-gray-600 mb-2">{item.mayoristasProduct.name}</p>
            <p className="text-xs text-gray-500">
              {item.mayoristasProduct.brand && `Marca: ${item.mayoristasProduct.brand}`}
            </p>
          </div>
        </div>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm text-gray-500">Precio mayorista:</p>
        <p className="font-semibold text-green-600">
          {item.mayoristasProduct.price ? formatPrice(item.mayoristasProduct.price) : 'N/A'}
        </p>
        <p className="text-sm text-gray-500 mt-1">Tu precio:</p>
        <p className="font-semibold text-gray-600">{formatPrice(item.myProduct.sellingPrice)}</p>
        {item.mayoristasProduct.code && (
          <p className="text-xs text-gray-400 mt-1">Cód: {item.mayoristasProduct.code}</p>
        )}
      </div>
    </div>
    {renderProductActions(item)}
  </div>
)}

                {/* Sin Stock */}
                {item.type === 'outOfStock' && (
  <div>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="text-red-500" size={20} />
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            ❌ SIN STOCK
          </span>
          {item.bestSimilarity && (
            <span className="text-xs text-gray-500">
              (mejor coincidencia: {item.bestSimilarity}%)
            </span>
          )}
        </div>
        <h4 className="font-medium text-gray-900 mb-1">Tu producto:</h4>
        <p className="text-sm text-gray-600 mb-2">{item.myProduct.productName}</p>
        <p className="text-xs text-gray-500">Marca: {item.myProduct.brandName}</p>
        {item.closestMatch && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">
              <strong>Coincidencia más cercana:</strong> {item.closestMatch.name}
            </p>
          </div>
        )}
      </div>
      <div className="text-right ml-4">
        <p className="text-sm text-gray-500">Tu precio:</p>
        <p className="font-semibold text-gray-600">{formatPrice(item.myProduct.sellingPrice)}</p>
      </div>
    </div>
    {renderProductActions(item)}
  </div>
)}

                {/* Nuevo Producto */}
                {item.type === 'newProduct' && (
  <div>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="text-blue-500" size={20} />
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            ➕ NUEVO DISPONIBLE
          </span>
        </div>
        <h4 className="font-medium text-gray-900 mb-1">Producto disponible:</h4>
        <p className="text-sm text-gray-600 mb-2">{item.mayoristasProduct.name}</p>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          {item.mayoristasProduct.brand && <p>Marca: {item.mayoristasProduct.brand}</p>}
          {item.mayoristasProduct.processor && <p>CPU: {item.mayoristasProduct.processor}</p>}
          {item.mayoristasProduct.ram && <p>RAM: {item.mayoristasProduct.ram}</p>}
          {item.mayoristasProduct.storage && <p>Almacenamiento: {item.mayoristasProduct.storage}</p>}
        </div>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm text-gray-500">Precio mayorista:</p>
        <p className="font-semibold text-blue-600">
          {item.mayoristasProduct.price ? formatPrice(item.mayoristasProduct.price) : 'N/A'}
        </p>
        {item.mayoristasProduct.estimatedSellingPrice && (
          <>
            <p className="text-sm text-gray-500 mt-1">Precio sugerido:</p>
            <p className="font-semibold text-green-600">
              {formatPrice(item.mayoristasProduct.estimatedSellingPrice)}
            </p>
          </>
        )}
        {item.mayoristasProduct.code && (
          <p className="text-xs text-gray-400 mt-1">Cód: {item.mayoristasProduct.code}</p>
        )}
      </div>
    </div>
    {renderProductActions(item)}
  </div>
)}
              </div>
            ))}

            {filteredResults().length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No hay resultados para mostrar</p>
                <p className="text-sm">Ajusta los filtros o realiza un nuevo análisis</p>
              </div>
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 py-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              
              <div className="flex space-x-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - 2);
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}

          <div className="text-center text-sm text-gray-500">
            Mostrando {Math.min(itemsPerPage, filteredResults().length)} de {filteredResults().length} resultados
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">
              🚀 Acciones Inteligentes Disponibles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">📦 Gestión de Inventario</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <XCircle className="text-red-500 mr-2" size={16} />
                    Marcar {stockAnalysis.outOfStock.length} productos como "Sin Stock"
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="text-green-500 mr-2" size={16} />
                    Actualizar precios de {stockAnalysis.inStock.length} productos disponibles
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-blue-500 mr-2" size={16} />
                    Revisar márgenes con nuevos precios de mayorista
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">➕ Expansión de Catálogo</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <Plus className="text-blue-500 mr-2" size={16} />
                    Evaluar {stockAnalysis.newProducts.length} productos nuevos disponibles
                  </li>
                  <li className="flex items-center">
                    <Target className="text-purple-500 mr-2" size={16} />
                    Priorizar por margen de ganancia estimado
                  </li>
                  <li className="flex items-center">
                    <BarChart3 className="text-green-500 mr-2" size={16} />
                    Analizar demanda y competencia local
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button 
                onClick={() => {
                  const outOfStockIds = stockAnalysis.outOfStock.map(item => item._id);
                  if (outOfStockIds.length > 0) {
                    handleBulkStockUpdate('mark_out_of_stock', outOfStockIds);
                  }
                }}
                disabled={stockAnalysis.outOfStock.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Minus size={18} />
                Marcar Sin Stock ({stockAnalysis.outOfStock.length})
              </button>
              
              <button 
                onClick={() => {
                  const inStockIds = stockAnalysis.inStock.map(item => item.myProduct._id);
                  if (inStockIds.length > 0) {
                    handleBulkStockUpdate('mark_in_stock', inStockIds);
                  }
                }}
                disabled={stockAnalysis.inStock.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} />
                Confirmar En Stock ({stockAnalysis.inStock.length})
              </button>
              
              <button 
                onClick={() => {
                  alert(`📊 Análisis de ${stockAnalysis.newProducts.length} productos nuevos:\n\n` +
                    `• Productos con mejor margen estimado\n` +
                    `• Ordenados por popularidad de marca\n` +
                    `• Filtrados por competencia local\n\n` +
                    `Esta funcionalidad se implementará en la próxima versión.`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Evaluar Nuevos ({stockAnalysis.newProducts.length})
              </button>
            </div>
          </div>

          {/* Estadísticas del análisis mejoradas */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Estadísticas del Análisis Avanzado
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-green-600">
                  {stockAnalysis.inStock.length + stockAnalysis.outOfStock.length > 0 
                    ? Math.round((stockAnalysis.inStock.length / (stockAnalysis.inStock.length + stockAnalysis.outOfStock.length)) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-gray-600">Disponibilidad</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-blue-600">
                  {stockAnalysis.newProducts.length}
                </p>
                <p className="text-sm text-gray-600">Oportunidades</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-red-600">
                  {stockAnalysis.outOfStock.length}
                </p>
                <p className="text-sm text-gray-600">A Revisar</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-purple-600">
                  {stockAnalysis.inStock.length + stockAnalysis.newProducts.length}
                </p>
                <p className="text-sm text-gray-600">Total Disponibles</p>
              </div>
            </div>

            {/* Métricas de precisión del algoritmo */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">🎯 Precisión del Algoritmo V2.0</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-600">
                    {stockAnalysis.inStock.length > 0 
                      ? Math.round(stockAnalysis.inStock.reduce((sum, item) => sum + (item.similarity || 0), 0) / stockAnalysis.inStock.length)
                      : 0}%
                  </p>
                  <p className="text-gray-600">Similitud Promedio</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">
                    {stockAnalysis.inStock.filter(item => (item.similarity || 0) >= 80).length}
                  </p>
                  <p className="text-gray-600">Matches&gt;80%</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-purple-600">
                    {stockAnalysis.inStock.filter(item => item.matchDetails?.brandMatch).length}
                  </p>
                  <p className="text-gray-600">Coincidencias de Marca</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendaciones inteligentes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              💡 Recomendaciones Inteligentes
            </h3>
            
            <div className="space-y-3">
              {stockAnalysis.outOfStock.length > 0 && (
                <div className="flex items-start space-x-3">
                  <AlertCircle className="text-amber-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">
                      Productos sin stock detectados
                    </p>
                    <p className="text-sm text-gray-600">
                      Se encontraron {stockAnalysis.outOfStock.length} productos en tu inventario que no están disponibles en el mayorista. 
                      Considera marcarlos como "Sin Stock" para evitar ventas de productos no disponibles.
                    </p>
                  </div>
                </div>
              )}
              
              {stockAnalysis.inStock.length > 0 && (
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">
                      Oportunidades de actualización de precios
                    </p>
                    <p className="text-sm text-gray-600">
                      {stockAnalysis.inStock.length} productos tienen coincidencias en el mayorista. 
                      Revisa los precios para mantener márgenes competitivos.
                    </p>
                  </div>
                </div>
              )}
              
              {stockAnalysis.newProducts.length > 0 && (
                <div className="flex items-start space-x-3">
                  <TrendingUp className="text-blue-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">
                      Expansión del catálogo
                    </p>
                    <p className="text-sm text-gray-600">
                      {stockAnalysis.newProducts.length} productos nuevos están disponibles en el mayorista. 
                      Prioriza los de mejor margen y mayor demanda para ampliar tu oferta.
                    </p>
                  </div>
                </div>
              )}

              {stockAnalysis.inStock.length === 0 && stockAnalysis.outOfStock.length === 0 && stockAnalysis.newProducts.length === 0 && (
                <div className="flex items-start space-x-3">
                  <Eye className="text-gray-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">
                      Realizar análisis
                    </p>
                    <p className="text-sm text-gray-600">
                      Carga los datos del mayorista en la pestaña "Cargar Datos" para obtener recomendaciones personalizadas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
       </div>
      )}

      {/* Modales */}
      {activeModal === modals.EDIT_PRODUCT && selectedProduct && (
        <AdminEditProduct
          onClose={() => {
            setActiveModal(null);
            setSelectedProduct(null);
          }}
          productData={selectedProduct}
          fetchdata={processStockDataImproved}
        />
      )}

      {activeModal === modals.CREATE_PRODUCT && prefilledData && (
        <UploadProduct
          onClose={() => {
            setActiveModal(null);
            setPrefilledData(null);
          }}
          fetchData={processStockDataImproved}
          prefilledData={prefilledData}
        />
      )}
    </div>
  );
};

export default EnhancedStockManagement;
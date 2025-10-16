// frontend/src/pages/AllProducts.js - MEJORADO CON INTERFAZ OPTIMIZADA
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadProduct from '../components/UploadProduct'
import SummaryApi from '../common'
import AdminProductCard from '../components/AdminProductCard'
import { 
  FaSearch, 
  FaFilter, 
  FaFileExcel, 
  FaPlus,
  FaDownload,
  FaBox,
  FaTag,
  FaDollarSign,
  FaChartLine,
  FaCheck,
  FaExclamationTriangle,
  FaBars,
  FaTh
} from 'react-icons/fa'
import usePreloadedCategories from '../hooks/usePreloadedCategories'
import * as XLSX from 'xlsx'
// ExchangeRateConfig eliminado - ahora se maneja desde /panel-admin/tipo-cambio
import StockManagement from '../components/admin/StockManagement'
import { toast } from 'react-toastify'
import displayPYGCurrency from '../helpers/displayCurrency'

const AllProducts = () => {
  const navigate = useNavigate()
  const [openUploadProduct, setOpenUploadProduct] = useState(false)
  const [allProduct, setAllProduct] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    brandName: '',
    priceRange: { min: '', max: '' },
    stockStatus: '',
    isVipOffer: '',
    sortBy: 'newest',
    sortOrder: 'desc'
  })

  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' o 'table'
  const [selectedProducts, setSelectedProducts] = useState([])
  
  // Hook para categorías precargadas
  const { getCategories, getSubcategories } = usePreloadedCategories()
  
  const [showStockManagement, setShowStockManagement] = useState(false)
  
  // Tipo de cambio ahora se maneja desde /panel-admin/tipo-cambio

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    vipOffers: 0,
    totalValue: 0
  })

  const fetchAllProduct = async() => {
    try {
      console.log('🔄 Cargando productos...', SummaryApi.allProduct.url);
      const response = await fetch(SummaryApi.allProduct.url, {
        method: SummaryApi.allProduct.method,
        credentials: 'include'
      })
      const dataResponse = await response.json()
      
      console.log('📦 Respuesta de productos:', dataResponse);
      
      let products = [];
      if (dataResponse?.data) {
        if (Array.isArray(dataResponse.data)) {
          products = dataResponse.data;
        } else if (typeof dataResponse.data === 'object') {
          // Convertir objeto organizado a array plano
          products = [];
          Object.values(dataResponse.data).forEach(category => {
            if (typeof category === 'object') {
              Object.values(category).forEach(subcategoryProducts => {
                if (Array.isArray(subcategoryProducts)) {
                  products.push(...subcategoryProducts);
                }
              });
            }
          });
        }
      }
      
      setAllProduct(products)
      applyFiltersAndSort(products)
      calculateStats(products)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const calculateStats = (products) => {
    const total = products.length
    const inStock = products.filter(p => (p.stock || 0) > 0).length
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length
    const vipOffers = products.filter(p => p.isVipOffer).length
    const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.sellingPrice || 0)), 0)

    setStats({ total, inStock, outOfStock, vipOffers, totalValue })
  }

  const sortProducts = (products, option) => {
    const sorted = [...products]
    
    switch (option) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      case 'priceHighToLow':
        return sorted.sort((a, b) => (Number(b.sellingPrice) || 0) - (Number(a.sellingPrice) || 0))
      case 'priceLowToHigh':
        return sorted.sort((a, b) => (Number(a.sellingPrice) || 0) - (Number(b.sellingPrice) || 0))
      case 'nameAZ':
        return sorted.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
      case 'nameZA':
        return sorted.sort((a, b) => (b.productName || '').localeCompare(a.productName || ''))
      case 'stockHighToLow':
        return sorted.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
      case 'profitHighToLow':
        return sorted.sort((a, b) => (Number(b.profitAmount) || 0) - (Number(a.profitAmount) || 0))
      default:
        return sorted
    }
  }

  const applyFiltersAndSort = (products) => {
    let result = [...products]

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(product => 
        (product.productName?.toLowerCase() || '').includes(searchLower) ||
        (product.brandName?.toLowerCase() || '').includes(searchLower) ||
        (product.category?.toLowerCase() || '').includes(searchLower) ||
        (product.subcategory?.toLowerCase() || '').includes(searchLower) ||
        (product.codigo?.toLowerCase() || '').includes(searchLower)
      )
    }

    // Filtro de categoría
    if (filters.category) {
      result = result.filter(product => product.category === filters.category)
    }

    // Filtro de subcategoría
    if (filters.subcategory) {
      result = result.filter(product => product.subcategory === filters.subcategory)
    }

    // Filtro de marca
    if (filters.brandName) {
      result = result.filter(product => product.brandName === filters.brandName)
    }

    // Filtro de rango de precio
    if (filters.priceRange.min) {
      result = result.filter(product => (Number(product.sellingPrice) || 0) >= Number(filters.priceRange.min))
    }
    if (filters.priceRange.max) {
      result = result.filter(product => (Number(product.sellingPrice) || 0) <= Number(filters.priceRange.max))
    }

    // Filtro de estado de stock
    if (filters.stockStatus) {
      switch (filters.stockStatus) {
        case 'inStock':
          result = result.filter(product => (product.stock || 0) > 0)
          break
        case 'outOfStock':
          result = result.filter(product => (product.stock || 0) === 0)
          break
        case 'lowStock':
          result = result.filter(product => (product.stock || 0) > 0 && (product.stock || 0) <= 10)
          break
        default:
          break
      }
    }

    // Filtro de ofertas VIP
    if (filters.isVipOffer) {
      result = result.filter(product => 
        filters.isVipOffer === 'yes' ? product.isVipOffer : !product.isVipOffer
      )
    }

    result = sortProducts(result, filters.sortBy)
    setFilteredProducts(result)
  }

  useEffect(() => {
    fetchAllProduct()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFiltersAndSort(allProduct)
  }, [filters, allProduct]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handlePriceRangeChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: { ...prev.priceRange, [field]: value }
    }))
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      subcategory: '',
      brandName: '',
      priceRange: { min: '', max: '' },
      stockStatus: '',
      isVipOffer: '',
      sortBy: 'newest',
      sortOrder: 'desc'
    })
  }

  const getSubcategoriesForCategory = () => {
    return getSubcategories(filters.category)
  }

  const getUniqueBrands = () => {
    return [...new Set(allProduct.map(p => p.brandName).filter(Boolean))]
  }

  const exportToExcel = () => {
    const excelData = filteredProducts.map(product => ({
      'Código': product.codigo || '',
      'Nombre del Producto': product.productName || '',
      'Marca': product.brandName || '',
      'Categoría': product.category || '',
      'Subcategoría': product.subcategory || '',
      'Precio de Venta': product.sellingPrice || 0,
      'Stock': product.stock || 0,
      'Precio de Compra USD': product.purchasePriceUSD || 0,
      'Tipo de Cambio': product.exchangeRate || 0,
      'Precio de Compra PYG': product.purchasePrice || 0,
      'Interés de Préstamo': product.loanInterest || 0,
      'Costo de Envío': product.deliveryCost || 0,
      'Margen de Ganancia (%)': product.profitMargin || 0,
      'Utilidad': product.profitAmount || 0,
      'Oferta VIP': product.isVipOffer ? 'Sí' : 'No',
      'Fecha de Creación': product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '',
      'Última Actualización': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : ''
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    const columnWidths = [
      { wch: 15 }, // Código
      { wch: 40 }, // Nombre del Producto
      { wch: 20 }, // Marca
      { wch: 15 }, // Categoría
      { wch: 15 }, // Subcategoría
      { wch: 15 }, // Precio de Venta
      { wch: 10 }, // Stock
      { wch: 18 }, // Precio de Compra USD
      { wch: 15 }, // Tipo de Cambio
      { wch: 18 }, // Precio de Compra PYG
      { wch: 18 }, // Interés de Préstamo
      { wch: 15 }, // Costo de Envío
      { wch: 18 }, // Margen de Ganancia
      { wch: 15 }, // Utilidad
      { wch: 12 }, // Oferta VIP
      { wch: 15 }, // Fecha de Creación
      { wch: 15 }  // Última Actualización
    ]
    ws['!cols'] = columnWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, `Productos_${new Date().toLocaleDateString()}.xlsx`)
    toast.success("Productos exportados a Excel")
  }

  const handleBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      toast.error("Selecciona al menos un producto")
      return
    }

    switch (action) {
      case 'export':
        // Exportar solo productos seleccionados
        // Implementar exportación de productos seleccionados
        toast.success(`${selectedProducts.length} productos seleccionados para exportación`)
        break
      case 'delete':
        // Implementar eliminación masiva
        toast.success(`${selectedProducts.length} productos seleccionados para eliminación`)
        break
      default:
        break
    }
  }

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const selectAllProducts = () => {
    setSelectedProducts(filteredProducts.map(p => p._id))
  }

  const clearSelection = () => {
    setSelectedProducts([])
  }

  const getFilterDescription = () => {
    let description = `Mostrando ${filteredProducts.length} de ${allProduct.length} productos`
    
    if (filters.category) {
      const categories = getCategories()
      const category = categories.find(c => c.value === filters.category)
      description += ` • Categoría: "${category?.label || filters.category}"`
    }
    
    if (filters.brandName) {
      description += ` • Marca: "${filters.brandName}"`
    }

    if (filters.search) {
      description += ` • Buscando: "${filters.search}"`
    }

    return description
  }


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-menu')) {
        // Los menús se cerrarán automáticamente al hacer clic fuera
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center text-gray-900">
              <FaBox className="mr-3 text-blue-600" />
              Gestión de Productos
            </h1>
            <p className="text-gray-600 mt-1">
              Administra tu catálogo de productos con herramientas avanzadas
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'grid' ? <FaBars className="w-4 h-4 mr-2" /> : <FaTh className="w-4 h-4 mr-2" />}
              {viewMode === 'grid' ? 'Vista Lista' : 'Vista Cuadrícula'}
            </button>
            
            <button
              onClick={() => navigate('/panel-admin/productos/nuevo')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaBox className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <FaCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">En Stock</p>
              <p className="text-xl font-bold text-gray-900">{stats.inStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-50 rounded-lg">
              <FaExclamationTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Sin Stock</p>
              <p className="text-xl font-bold text-gray-900">{stats.outOfStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FaTag className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">VIP</p>
              <p className="text-xl font-bold text-gray-900">{stats.vipOffers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <FaDollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración del tipo de cambio movida a /panel-admin/tipo-cambio */}

      {/* Filtros y búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FaFilter className="mr-2 text-gray-600" />
            Filtros y Búsqueda
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
            >
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Búsqueda principal */}
        <div className="mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar por nombre, marca, código o categoría..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectField
              label="Categoría"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              options={getCategories()}
            />
            
            <SelectField
              label="Subcategoría"
              name="subcategory"
              value={filters.subcategory}
              onChange={handleFilterChange}
              options={getSubcategoriesForCategory()}
              disabled={!filters.category}
            />

            <SelectField
              label="Marca"
              name="brandName"
              value={filters.brandName}
              onChange={handleFilterChange}
              options={getUniqueBrands().map(brand => ({ value: brand, label: brand }))}
            />

            <SelectField
              label="Estado de Stock"
              name="stockStatus"
              value={filters.stockStatus}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'Todos' },
                { value: 'inStock', label: 'En Stock' },
                { value: 'outOfStock', label: 'Sin Stock' },
                { value: 'lowStock', label: 'Stock Bajo' }
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mínimo</label>
              <input
                type="number"
                value={filters.priceRange.min}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Máximo</label>
              <input
                type="number"
                value={filters.priceRange.max}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                placeholder="999999999"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <SelectField
              label="Ofertas VIP"
              name="isVipOffer"
              value={filters.isVipOffer}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'Todos' },
                { value: 'yes', label: 'Solo VIP' },
                { value: 'no', label: 'Excluir VIP' }
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
              <div className="flex space-x-2">
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                  <option value="nameAZ">Nombre A-Z</option>
                  <option value="nameZA">Nombre Z-A</option>
                  <option value="priceHighToLow">Precio: Mayor a menor</option>
                  <option value="priceLowToHigh">Precio: Menor a mayor</option>
                  <option value="stockHighToLow">Stock: Mayor a menor</option>
                  <option value="profitHighToLow">Ganancia: Mayor a menor</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones masivas */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedProducts.length} productos seleccionados
              </span>
              <button
                onClick={clearSelection}
                className="ml-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Limpiar selección
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('export')}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <FaDownload className="w-3 h-3 mr-1" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información de filtros */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {getFilterDescription()}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 text-sm"
          >
            <FaFileExcel className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={() => setShowStockManagement(true)}
            className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
          >
            <FaChartLine className="w-4 h-4 mr-2" />
            Gestionar Stock
          </button>
        </div>
      </div>

      {/* Lista de productos */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => (
            <div key={product._id || index} className="relative">
              {selectedProducts.includes(product._id) && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    <FaCheck className="w-3 h-3" />
                  </div>
                </div>
              )}
              <div 
                className={`cursor-pointer ${selectedProducts.includes(product._id) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => toggleProductSelection(product._id)}
              >
                <AdminProductCard 
                  data={product} 
                  key={product._id || index+"allProduct"} 
                  fetchdata={fetchAllProduct}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={selectedProducts.length === filteredProducts.length ? clearSelection : selectAllProducts}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ganancia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product, index) => (
                  <tr key={product._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product._id)}
                        onChange={() => toggleProductSelection(product._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {product.productImage && product.productImage.length > 0 ? (
                            <img 
                              src={product.productImage[0]} 
                              alt={product.productName}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <FaBox className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.productName || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.brandName || 'Sin marca'} • {product.codigo || 'Sin código'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{product.category || 'Sin categoría'}</div>
                        <div className="text-xs text-gray-500">{product.subcategory || 'Sin subcategoría'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {displayPYGCurrency(product.sellingPrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (product.stock || 0) > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {displayPYGCurrency(product.profitAmount || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(product.profitMargin || 0).toFixed(1)}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {product.isVipOffer && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            VIP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <FaBox className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
          </p>
        </div>
      )}

      {/* Modales */}
      {openUploadProduct && (
        <UploadProduct 
          onClose={() => setOpenUploadProduct(false)} 
          fetchData={fetchAllProduct}
        />
      )}


      {showStockManagement && (
        <div className="fixed inset-0 bg-black/60 z-[200] overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">Gestión de Stock con Mayoristas</h2>
                <button 
                  onClick={() => setShowStockManagement(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto max-h-[80vh]">
                <StockManagement onClose={() => setShowStockManagement(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente helper para campos de selección
const SelectField = ({ label, name, value, onChange, options = [], disabled = false, className = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">Seleccionar {label.toLowerCase()}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export default AllProducts
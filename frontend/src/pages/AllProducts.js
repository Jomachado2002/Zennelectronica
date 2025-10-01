import React, { useEffect, useState } from 'react'
import UploadProduct from '../components/UploadProduct'
import SummaryApi from '../common'
import AdminProductCard from '../components/AdminProductCard'
import { FaSearch, FaFilter, FaFileExcel, FaCalculator, FaImage } from 'react-icons/fa'
import productCategory from '../helpers/productCategory'
import * as XLSX from 'xlsx'
import ProductFinanceModal from '../components/admin/ProductFinanceModal'
import ExchangeRateConfig from '../components/admin/ExchangeRateConfig'
import StockManagement from '../components/admin/StockManagement'



const AllProducts = () => {
  const [openUploadProduct, setOpenUploadProduct] = useState(false)
  const [allProduct, setAllProduct] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [sortOption, setSortOption] = useState('newest')

  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showSubcategoryMenu, setShowSubcategoryMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  
  // Estado para gestión financiera
  const [selectedProductForFinance, setSelectedProductForFinance] = useState(null)
  const [showStockManagement, setShowStockManagement] = useState(false)
  
  // Estado para el tipo de cambio global
  const [exchangeRate, setExchangeRate] = useState(() => {
    // Intentar cargar el tipo de cambio desde localStorage o usar valor predeterminado
    const savedRate = localStorage.getItem('exchangeRate');
    return savedRate ? Number(savedRate) : 7300;
  });

  const fetchAllProduct = async() => {
    try {
      const response = await fetch(SummaryApi.allProduct.url, {
        method: SummaryApi.allProduct.method,
        credentials: 'include'
      })
      const dataResponse = await response.json()
      console.log('📊 Respuesta del servidor:', dataResponse); // DEBUG
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
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  useEffect(() => {
    fetchAllProduct()
  }, [])

  const sortProducts = (products, option) => {
    const sorted = [...products]
    
    if (option === 'newest') {
      return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }
    
    if (option === 'oldest') {
      return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    }
    
    if (option === 'priceHighToLow') {
      return sorted.sort((a, b) => {
        const priceA = Number(a.sellingPrice) || 0
        const priceB = Number(b.sellingPrice) || 0
        return priceB - priceA
      })
    }
    
    if (option === 'priceLowToHigh') {
      return sorted.sort((a, b) => {
        const priceA = Number(a.sellingPrice) || 0
        const priceB = Number(b.sellingPrice) || 0
        return priceA - priceB
      })
    }
    
    return sorted
  }

  const applyFiltersAndSort = (products) => {
    let result = [...products]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(product => 
        (product.productName?.toLowerCase() || '').includes(searchLower) ||
        (product.brandName?.toLowerCase() || '').includes(searchLower) ||
        (product.category?.toLowerCase() || '').includes(searchLower) ||
        (product.subcategory?.toLowerCase() || '').includes(searchLower)
      )
    }

    if (selectedCategory) {
      result = result.filter(product => product.category === selectedCategory)
    }

    if (selectedSubcategory) {
      result = result.filter(product => product.subcategory === selectedSubcategory)
    }

    result = sortProducts(result, sortOption)
    setFilteredProducts(result)
  }

  useEffect(() => {
    applyFiltersAndSort(allProduct)
  }, [searchTerm, selectedCategory, selectedSubcategory, sortOption])

  const getSubcategories = () => {
    const categoryObj = productCategory.find(cat => cat.value === selectedCategory)
    return categoryObj ? categoryObj.subcategories : []
  }

  const exportToExcel = () => {
    const excelData = filteredProducts.map(product => ({
      'Nombre del Producto': product.productName || '',
      'Marca': product.brandName || '',
      'Categoría': product.category || '',
      'Subcategoría': product.subcategory || '',
      'Precio de Venta': product.sellingPrice || '',
      'Precio de Compra USD': product.purchasePriceUSD || '',
      'Tipo de Cambio': product.exchangeRate || '',
      'Precio de Compra PYG': product.purchasePrice || '',
      'Interés de Préstamo (%)': product.loanInterest || '',
      'Costo de Envío': product.deliveryCost || '',
      'Margen de Ganancia (%)': product.profitMargin || '',
      'Utilidad': product.profitAmount || '',
      'Fecha de Creación': product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '',
      'Última Actualización Financiera': product.lastUpdatedFinance ? new Date(product.lastUpdatedFinance).toLocaleDateString() : ''
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    const columnWidths = [
      { wch: 40 }, // Nombre del Producto
      { wch: 20 }, // Marca
      { wch: 15 }, // Categoría
      { wch: 15 }, // Subcategoría
      { wch: 15 }, // Precio de Venta
      { wch: 15 }, // Precio de Compra USD
      { wch: 15 }, // Tipo de Cambio
      { wch: 15 }, // Precio de Compra PYG
      { wch: 15 }, // Interés de Préstamo
      { wch: 15 }, // Costo de Envío
      { wch: 15 }, // Margen de Ganancia
      { wch: 15 }, // Utilidad
      { wch: 15 }, // Fecha de Creación
      { wch: 15 }  // Última Actualización Financiera
    ]
    ws['!cols'] = columnWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, `Productos_${new Date().toLocaleDateString()}.xlsx`)
  }

  const getFilterDescription = () => {
    let description = `Mostrando ${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}`
    
    if (selectedCategory) {
      description += ` en la categoría "${productCategory.find(c => c.value === selectedCategory)?.label || selectedCategory}"`
    }
    
    if (selectedSubcategory) {
      const subcategoryLabel = getSubcategories().find(s => s.value === selectedSubcategory)?.label
      description += ` y subcategoría "${subcategoryLabel || selectedSubcategory}"`
    }
    
    if (searchTerm) {
      description += ` que coinciden con "${searchTerm}"`
    }

    return description
  }

  // Función para manejar la gestión financiera
  const handleFinanceProduct = (product) => {
    setSelectedProductForFinance(product);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-menu')) {
        setShowCategoryMenu(false)
        setShowSubcategoryMenu(false)
        setShowSortMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div>
      <div className='bg-green-50 py-2 px-4 flex justify-between items-center'>
        <h2 className='font-bold text-lg'>Todos los productos</h2>
        <div className='flex gap-2'>
          
           
          <button
            className='flex items-center gap-2 border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all py-1 px-4 rounded-full'
            onClick={exportToExcel}
          >
            <FaFileExcel />
            Exportar a Excel
          </button>
          <button
            className='flex items-center gap-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all py-1 px-4 rounded-full mr-2'
            onClick={() => setShowStockManagement(true)}
          >
            📊 Gestionar Stock
          </button>
          <button
            className='border border-gray-400 hover:bg-green-200 transition-all py-1 px-4 rounded-full'
            onClick={() => setOpenUploadProduct(true)}
          >
            Cargar Productos
          </button>

        </div>
      </div>
      
      {/* Componente de configuración del tipo de cambio */}
      <div className="px-4 mt-4">
        <ExchangeRateConfig 
          exchangeRate={exchangeRate} 
          setExchangeRate={setExchangeRate} 
        />
      </div>

      <div className='flex flex-col'>
        <div className='flex flex-wrap items-center gap-4 p-4 bg-white shadow-sm'>
          <div className='relative flex-grow'>
            <input
              type='text'
              placeholder='Buscar productos...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full p-2 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500'
            />
            <FaSearch className='absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400' />
          </div>

          <div className='relative filter-menu'>
            <button 
              onClick={() => {
                setShowCategoryMenu(!showCategoryMenu)
                setShowSortMenu(false)
                setShowSubcategoryMenu(false)
              }}
              className='flex items-center bg-green-100 p-2 rounded-lg hover:bg-green-200 transition-colors'
            >
              Categoría: {selectedCategory ? productCategory.find(c => c.value === selectedCategory)?.label : 'Todas'}
            </button>

            {showCategoryMenu && (
              <div className='absolute z-10 mt-2 w-48 bg-white border rounded-lg shadow-lg'>
                <button 
                  onClick={() => {
                    setSelectedCategory('')
                    setSelectedSubcategory('')
                    setShowCategoryMenu(false)
                  }}
                  className='w-full text-left px-4 py-2 hover:bg-gray-100'
                >
                  Todas las Categorías
                </button>
                {productCategory.map(category => (
                  <button 
                    key={category.value}
                    onClick={() => {
                      setSelectedCategory(category.value)
                      setSelectedSubcategory('')
                      setShowCategoryMenu(false)
                    }}
                    className='w-full text-left px-4 py-2 hover:bg-gray-100'
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCategory && (
            <div className='relative filter-menu'>
              <button 
                onClick={() => {
                  setShowSubcategoryMenu(!showSubcategoryMenu)
                  setShowCategoryMenu(false)
                  setShowSortMenu(false)
                }}
                className='flex items-center bg-green-100 p-2 rounded-lg hover:bg-green-200 transition-colors'
              >
                Subcategoría: {selectedSubcategory ? getSubcategories().find(s => s.value === selectedSubcategory)?.label : 'Todas'}
              </button>

              {showSubcategoryMenu && (
                <div className='absolute z-10 mt-2 w-48 bg-white border rounded-lg shadow-lg'>
                  <button 
                    onClick={() => {
                      setSelectedSubcategory('')
                      setShowSubcategoryMenu(false)
                    }}
                    className='w-full text-left px-4 py-2 hover:bg-gray-100'
                  >
                    Todas las Subcategorías
                  </button>
                  {getSubcategories().map(subcategory => (
                    <button 
                      key={subcategory.value}
                      onClick={() => {
                        setSelectedSubcategory(subcategory.value)
                        setShowSubcategoryMenu(false)
                      }}
                      className='w-full text-left px-4 py-2 hover:bg-gray-100'
                    >
                      {subcategory.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className='relative filter-menu'>
            <button 
              onClick={() => {
                setShowSortMenu(!showSortMenu)
                setShowCategoryMenu(false)
                setShowSubcategoryMenu(false)
              }}
              className='flex items-center bg-green-100 p-2 rounded-lg hover:bg-green-200 transition-colors'
            >
              <FaFilter className='mr-2' /> Ordenar
            </button>

            {showSortMenu && (
              <div className='absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10'>
                <button 
                  onClick={() => {
                    setSortOption('newest')
                    setShowSortMenu(false)
                  }}
                  className='w-full text-left px-4 py-2 hover:bg-gray-100'
                >
                  Más recientes
                </button>
                <button 
                  onClick={() => {
                    setSortOption('oldest')
                    setShowSortMenu(false)
                  }}
                  className='w-full text-left px-4 py-2 hover:bg-gray-100'
                >
                  Más antiguos
                </button>
                <button 
                  onClick={() => {
                    setSortOption('priceHighToLow')
                    setShowSortMenu(false)
                  }}
                  className='w-full text-left px-4 py-2 hover:bg-gray-100'
                >
                  Precio: Mayor a menor
                </button>
                <button 
                  onClick={() => {
                    setSortOption('priceLowToHigh')
                    setShowSortMenu(false)
                  }}
                  className='w-full text-left px-4 py-2 hover:bg-gray-100'
                >
                  Precio: Menor a mayor
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='px-4 py-2 bg-gray-100 text-gray-700'>
          {getFilterDescription()}
        </div>
      </div>

      <div className='flex items-center flex-wrap gap-5 p-4 h-[calc(100vh-350px)] overflow-y-auto'>
        {filteredProducts.map((product, index) => (
          <AdminProductCard 
            data={product} 
            key={product._id || index+"allProduct"} 
            fetchdata={fetchAllProduct}
            onFinance={handleFinanceProduct}
          />
        ))}
        
        {filteredProducts.length === 0 && (
          <div className='w-full text-center text-gray-500 py-10'>
            No se encontraron productos
          </div>
        )}
      </div>

      {openUploadProduct && (
        <UploadProduct 
          onClose={() => setOpenUploadProduct(false)} 
          fetchData={fetchAllProduct}
        />
      )}

      {/* Modal para gestión financiera */}
      {selectedProductForFinance && (
        
        <ProductFinanceModal
          product={selectedProductForFinance}
          onClose={() => setSelectedProductForFinance(null)}
          exchangeRate={exchangeRate}
          onUpdate={(updatedProduct) => {
            // Actualizar el producto en la lista local para evitar recargar todo
            const updatedProducts = allProduct.map(p => 
              p._id === updatedProduct._id ? {...p, ...updatedProduct} : p
            );
            setAllProduct(updatedProducts);
            
            // También actualizar los productos filtrados si es necesario
            if (filteredProducts.some(p => p._id === updatedProduct._id)) {
              const updatedFiltered = filteredProducts.map(p => 
                p._id === updatedProduct._id ? {...p, ...updatedProduct} : p
              );
              setFilteredProducts(updatedFiltered);
            }
          }}
        />
      )}
      {/* Modal para gestión de stock */}
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

export default AllProducts
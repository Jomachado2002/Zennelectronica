// frontend/src/pages/SupplierPriceComparison.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSearch, FaPlus, FaTrash, FaCalculator, FaArrowLeft, FaTrophy, FaChartBar } from 'react-icons/fa';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const SupplierPriceComparison = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Cargar productos al iniciar
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtrar productos según término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts([]);
      return;
    }
    
    const filtered = products.filter(product => 
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredProducts(filtered.slice(0, 20)); // Limitar resultados
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    setIsSearching(true);
    try {
      const response = await fetch(SummaryApi.allProduct.url, {
        method: 'GET',
        credentials: 'include'
      });
      
      const result = await response.json();
      if (result.success) {
        setProducts(result.data || []);
      } else {
        toast.error(result.message || "Error al cargar los productos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsSearching(false);
    }
  };

  const addProductToComparison = (product) => {
    // Verificar si el producto ya está en la lista
    const exists = selectedProducts.find(p => p._id === product._id);
    if (exists) {
      toast.info("Este producto ya está en la lista de comparación");
      return;
    }

    const newProduct = {
      _id: product._id,
      productName: product.productName,
      brandName: product.brandName,
      category: product.category,
      subcategory: product.subcategory,
      quantity: 1
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    setSearchTerm(''); // Limpiar búsqueda
  };

  const removeProductFromComparison = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== productId));
    
    // También remover de comparaciones si existe
    setComparisons(prev => prev.filter(comp => comp.product.id !== productId));
  };

  const updateProductQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    
    setSelectedProducts(prev => 
      prev.map(p => 
        p._id === productId ? { ...p, quantity: parseInt(quantity) } : p
      )
    );
  };

  const compareSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Debe seleccionar al menos un producto para comparar");
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar datos para la API
      const productsToCompare = selectedProducts.map(product => ({
        productId: product._id,
        productName: product.productName,
        quantity: product.quantity
      }));

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/comparar-proveedores`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify({ products: productsToCompare })
      });

      const result = await response.json();

      if (result.success) {
        setComparisons(result.data.comparisons || []);
        
        if (result.data.totalOptions === 0) {
          toast.info("No se encontraron análisis de rentabilidad para los productos seleccionados");
        } else {
          toast.success(`Se encontraron ${result.data.totalOptions} opciones de proveedores`);
        }
      } else {
        toast.error(result.message || "Error al comparar precios");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const getBestOption = (supplierOptions) => {
    if (!supplierOptions || supplierOptions.length === 0) return null;
    
    // Ordenar por mejor margen de ganancia
    const sorted = [...supplierOptions].sort((a, b) => b.profitMargin - a.profitMargin);
    return sorted[0];
  };

  const getWorstOption = (supplierOptions) => {
    if (!supplierOptions || supplierOptions.length === 0) return null;
    
    // Ordenar por peor margen de ganancia
    const sorted = [...supplierOptions].sort((a, b) => a.profitMargin - b.profitMargin);
    return sorted[0];
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link 
          to="/panel-admin/proveedores" 
          className="text-blue-600 hover:underline mb-4 inline-flex items-center"
        >
          <FaArrowLeft className="mr-2" /> Volver a Proveedores
        </Link>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <FaCalculator className="mr-2 text-green-600" />
              Comparador de Precios de Proveedores
            </h1>
            <p className="text-gray-600 mt-1">
              Compare márgenes de ganancia entre diferentes proveedores para tomar la mejor decisión comercial
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de búsqueda y selección de productos */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaSearch className="mr-2 text-blue-600" />
              Seleccionar Productos
            </h2>
            
            {/* Búsqueda de productos */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Resultados de búsqueda */}
            {searchTerm.trim() !== '' && (
              <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {isSearching ? (
                  <p className="text-center py-4">Buscando productos...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">No se encontraron productos</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {filteredProducts.map(product => (
                      <li 
                        key={product._id} 
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => addProductToComparison(product)}
                      >
                        <div className="font-medium text-gray-900">{product.productName}</div>
                        <div className="text-sm text-gray-500">
                          {product.brandName} - {product.category}
                        </div>
                        <div className="text-sm text-gray-400">
                          Precio: {displayPYGCurrency(product.sellingPrice)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Productos seleccionados */}
            <div>
              <h3 className="font-medium mb-2">Productos Seleccionados ({selectedProducts.length})</h3>
              
              {selectedProducts.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  Busque y seleccione productos para comparar
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedProducts.map(product => (
                    <div key={product._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{product.productName}</div>
                        <div className="text-xs text-gray-500">{product.brandName}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateProductQuantity(product._id, e.target.value)}
                          className="w-16 p-1 text-xs border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() => removeProductFromComparison(product._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={compareSelectedProducts}
                disabled={selectedProducts.length === 0 || isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Comparando...
                  </>
                ) : (
                  <>
                    <FaCalculator className="mr-2" />
                    Comparar Precios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Panel de resultados de comparación */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaChartBar className="mr-2 text-green-600" />
              Resultados de Comparación
            </h2>

            {comparisons.length === 0 ? (
              <div className="text-center py-12">
                <FaCalculator className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Seleccione productos y haga clic en "Comparar Precios" para ver los resultados
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {comparisons.map((comparison, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{comparison.product.name}</h3>
                        <p className="text-sm text-gray-500">
                          Cantidad: {comparison.product.quantity} unidades
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Opciones encontradas</div>
                        <div className="text-xl font-bold text-blue-600">
                          {comparison.optionsCount}
                        </div>
                      </div>
                    </div>

                    {comparison.supplierOptions.length === 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <p className="text-gray-500">
                          Función de análisis de rentabilidad eliminada según requerimientos
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Mejor opción destacada */}
                        {comparison.bestOption && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center mb-2">
                              <FaTrophy className="text-yellow-500 mr-2" />
                              <span className="font-semibold text-green-800">Mejor Opción (Mayor Margen)</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="font-medium">Proveedor</div>
                                <div>{comparison.bestOption.supplierSnapshot.name}</div>
                              </div>
                              <div>
                                <div className="font-medium">Costo Total</div>
                                <div>{displayPYGCurrency(comparison.bestOption.totalCost)}</div>
                              </div>
                              <div>
                                <div className="font-medium">Ganancia Total</div>
                                <div className="text-green-600 font-semibold">
                                  {displayPYGCurrency(comparison.bestOption.totalProfit)}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Margen</div>
                                <div className="text-green-600 font-semibold">
                                  {comparison.bestOption.profitMargin.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tabla de todas las opciones */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Compra</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Venta</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ganancia</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Margen %</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Entrega</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {comparison.supplierOptions
                                .sort((a, b) => b.profitMargin - a.profitMargin)
                                .map((option, optIndex) => (
                                <tr key={optIndex} className={optIndex === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                                  <td className="px-3 py-2 text-sm">
                                    <div className="font-medium">{option.supplierSnapshot.name}</div>
                                    {option.supplierSnapshot.phone && (
                                      <div className="text-xs text-gray-500">{option.supplierSnapshot.phone}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    <div>{displayPYGCurrency(option.purchasePricePYG * comparison.product.quantity)}</div>
                                    <div className="text-xs text-gray-500">
                                      {option.purchasePrice} {option.purchaseCurrency}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right font-medium">
                                    {displayPYGCurrency(option.totalCost)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    {displayPYGCurrency(option.suggestedSellingPrice)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    <span className={option.totalProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                      {displayPYGCurrency(option.totalProfit)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-center">
                                    <span className={`font-semibold ${option.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {option.profitMargin.toFixed(2)}%
                                    </span>
                                    {optIndex === 0 && (
                                      <FaTrophy className="text-yellow-500 ml-1 inline" />
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-center">
                                    {option.deliveryTime || 'No especificado'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Detalles adicionales */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-blue-800">Mejor Margen</div>
                            <div className="text-blue-600 font-semibold text-lg">
                              {getBestOption(comparison.supplierOptions)?.profitMargin.toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="font-medium text-red-800">Peor Margen</div>
                            <div className="text-red-600 font-semibold text-lg">
                              {getWorstOption(comparison.supplierOptions)?.profitMargin.toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="font-medium text-green-800">Diferencia</div>
                            <div className="text-green-600 font-semibold text-lg">
                              {(getBestOption(comparison.supplierOptions)?.profitMargin - getWorstOption(comparison.supplierOptions)?.profitMargin).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Resumen general */}
                {comparisons.length > 0 && (
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Resumen de Comparación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Productos Comparados</div>
                        <div className="text-lg font-semibold text-blue-600">{comparisons.length}</div>
                      </div>
                      <div>
                        <div className="font-medium">Total de Opciones</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {comparisons.reduce((sum, comp) => sum + comp.optionsCount, 0)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Ganancia Total Estimada</div>
                        <div className="text-lg font-semibold text-green-600">
                          {displayPYGCurrency(
                            comparisons.reduce((sum, comp) => 
                              sum + (comp.bestOption?.totalProfit || 0), 0
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Acciones rápidas */}
                <div className="flex flex-wrap gap-2 mt-4">
                  
                  <Link 
                    to="/panel-admin/presupuestos/nuevo"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
                  >
                    <FaPlus className="mr-1" />
                    Crear Presupuesto
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierPriceComparison;
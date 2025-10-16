// frontend/src/pages/FinancialReports.js - SIMPLIFICADO PARA COSTOS Y GANANCIAS
import React, { useState, useEffect } from 'react';
import { FaDownload, FaFilter, FaUndo, FaFileExcel, FaMoneyBillWave, FaSearch, FaSort } from 'react-icons/fa';
import { toast } from 'react-toastify';
import displayPYGCurrency from '../helpers/displayCurrency';
import SummaryApi from '../common';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';

const FinancialReports = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // Filtros simplificados
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brandName: '',
    minCost: '',
    maxCost: '',
    minProfit: '',
    maxProfit: '',
    sortBy: 'profitAmount',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, filters]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SummaryApi.allProduct.url, {
        method: SummaryApi.allProduct.method,
        credentials: 'include'
      });
      
      const dataResponse = await response.json();
      
      if (dataResponse.success) {
        let productsList = [];
        if (Array.isArray(dataResponse.data)) {
          productsList = dataResponse.data;
        } else if (typeof dataResponse.data === 'object') {
          // Convertir objeto organizado a array plano
          Object.values(dataResponse.data).forEach(category => {
            if (typeof category === 'object') {
              Object.values(category).forEach(subcategoryProducts => {
                if (Array.isArray(subcategoryProducts)) {
                  productsList.push(...subcategoryProducts);
                }
              });
            }
          });
        }
        
        setProducts(productsList);
        
        // Extraer categorías y marcas únicas
        const categories = [...new Set(productsList.map(p => p.category).filter(Boolean))];
        const brands = [...new Set(productsList.map(p => p.brandName).filter(Boolean))];
        
        setAvailableCategories(categories);
        setAvailableBrands(brands);
      } else {
        toast.error("Error al cargar los productos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product => 
        (product.productName?.toLowerCase() || '').includes(searchLower) ||
        (product.brandName?.toLowerCase() || '').includes(searchLower) ||
        (product.category?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Filtro de categoría
    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Filtro de marca
    if (filters.brandName) {
      filtered = filtered.filter(product => product.brandName === filters.brandName);
    }

    // Filtros de costos y ganancias
    if (filters.minCost) {
      filtered = filtered.filter(product => (product.purchasePrice || 0) >= Number(filters.minCost));
    }
    if (filters.maxCost) {
      filtered = filtered.filter(product => (product.purchasePrice || 0) <= Number(filters.maxCost));
    }
    if (filters.minProfit) {
      filtered = filtered.filter(product => (product.profitAmount || 0) >= Number(filters.minProfit));
    }
    if (filters.maxProfit) {
      filtered = filtered.filter(product => (product.profitAmount || 0) <= Number(filters.maxProfit));
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'productName':
          aValue = a.productName || '';
          bValue = b.productName || '';
          break;
        case 'purchasePrice':
          aValue = Number(a.purchasePrice) || 0;
          bValue = Number(b.purchasePrice) || 0;
          break;
        case 'sellingPrice':
          aValue = Number(a.sellingPrice) || 0;
          bValue = Number(b.sellingPrice) || 0;
          break;
        case 'profitAmount':
          aValue = Number(a.profitAmount) || 0;
          bValue = Number(b.profitAmount) || 0;
          break;
        case 'profitMargin':
          aValue = Number(a.profitMargin) || 0;
          bValue = Number(b.profitMargin) || 0;
          break;
        default:
          aValue = Number(a.profitAmount) || 0;
          bValue = Number(b.profitAmount) || 0;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      brandName: '',
      minCost: '',
      maxCost: '',
      minProfit: '',
      maxProfit: '',
      sortBy: 'profitAmount',
      sortOrder: 'desc'
    });
  };

  const exportToExcel = () => {
    const excelData = filteredProducts.map(product => ({
      'Nombre del Producto': product.productName || '',
      'Marca': product.brandName || '',
      'Categoría': product.category || '',
      'Precio de Compra': product.purchasePrice || 0,
      'Precio de Venta': product.sellingPrice || 0,
      'Costo Total': (product.purchasePrice || 0) + (product.loanInterest || 0) + (product.deliveryCost || 0),
      'Ganancia Neta': product.profitAmount || 0,
      'Margen de Ganancia (%)': product.profitMargin || 0,
      'Interés de Préstamo': product.loanInterest || 0,
      'Costo de Envío': product.deliveryCost || 0
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 40 }, // Nombre del Producto
      { wch: 20 }, // Marca
      { wch: 15 }, // Categoría
      { wch: 15 }, // Precio de Compra
      { wch: 15 }, // Precio de Venta
      { wch: 15 }, // Costo Total
      { wch: 15 }, // Ganancia Neta
      { wch: 18 }, // Margen de Ganancia
      { wch: 18 }, // Interés de Préstamo
      { wch: 15 }  // Costo de Envío
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Financiero');
    XLSX.writeFile(wb, `Reporte_Financiero_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Reporte exportado a Excel");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Reporte Financiero - Costos y Ganancias', 14, 22);
    
    // Fecha
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Datos de la tabla
    const tableData = filteredProducts.map(product => [
      product.productName || '',
      product.brandName || '',
      product.category || '',
      displayPYGCurrency(product.purchasePrice || 0),
      displayPYGCurrency(product.sellingPrice || 0),
      displayPYGCurrency(product.profitAmount || 0),
      `${product.profitMargin || 0}%`
    ]);

    doc.autoTable({
      head: [['Producto', 'Marca', 'Categoría', 'Costo', 'Venta', 'Ganancia', 'Margen %']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Reporte_Financiero_${new Date().toLocaleDateString()}.pdf`);
    toast.success("Reporte exportado a PDF");
  };

  // Calcular totales
  const totals = filteredProducts.reduce((acc, product) => {
    const cost = Number(product.purchasePrice) || 0;
    const profit = Number(product.profitAmount) || 0;
    
    return {
      totalCost: acc.totalCost + cost,
      totalRevenue: acc.totalRevenue + (cost + profit),
      totalProfit: acc.totalProfit + profit,
      count: acc.count + 1
    };
  }, { totalCost: 0, totalRevenue: 0, totalProfit: 0, count: 0 });

  const averageMargin = totals.totalRevenue > 0 ? (totals.totalProfit / totals.totalRevenue) * 100 : 0;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center text-gray-900">
          <FaMoneyBillWave className="mr-3 text-green-600" />
          Reportes Financieros - Costos y Ganancias
        </h1>
        <p className="text-gray-600 mt-2">
          Análisis simplificado de costos, precios de venta y ganancias por producto
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FaMoneyBillWave className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Costos</p>
              <p className="text-2xl font-bold text-gray-900">{displayPYGCurrency(totals.totalCost)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <FaMoneyBillWave className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">{displayPYGCurrency(totals.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <FaMoneyBillWave className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ganancia Total</p>
              <p className="text-2xl font-bold text-gray-900">{displayPYGCurrency(totals.totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <FaMoneyBillWave className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Margen Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{averageMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FaFilter className="mr-2 text-gray-600" />
            Filtros
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
              className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm flex items-center"
            >
              <FaUndo className="mr-1" />
              Limpiar
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Búsqueda</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Buscar productos..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select
                name="brandName"
                value={filters.brandName}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las marcas</option>
                {availableBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
              <div className="flex space-x-2">
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="productName">Nombre</option>
                  <option value="purchasePrice">Costo</option>
                  <option value="sellingPrice">Precio Venta</option>
                  <option value="profitAmount">Ganancia</option>
                  <option value="profitMargin">Margen %</option>
                </select>
                <select
                  name="sortOrder"
                  value={filters.sortOrder}
                  onChange={handleFilterChange}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">↓</option>
                  <option value="asc">↑</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Mínimo</label>
              <input
                type="number"
                name="minCost"
                value={filters.minCost}
                onChange={handleFilterChange}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Máximo</label>
              <input
                type="number"
                name="maxCost"
                value={filters.maxCost}
                onChange={handleFilterChange}
                placeholder="999999999"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ganancia Mínima</label>
              <input
                type="number"
                name="minProfit"
                value={filters.minProfit}
                onChange={handleFilterChange}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ganancia Máxima</label>
              <input
                type="number"
                name="maxProfit"
                value={filters.maxProfit}
                onChange={handleFilterChange}
                placeholder="999999999"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Acciones de exportación */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          Mostrando {filteredProducts.length} de {products.length} productos
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaFileExcel className="mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FaDownload className="mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando productos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Venta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ganancia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product, index) => (
                  <tr key={product._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.productName || 'Sin nombre'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {product.brandName || 'Sin marca'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {product.category || 'Sin categoría'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {displayPYGCurrency(product.purchasePrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {displayPYGCurrency(product.sellingPrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`font-medium ${(product.profitAmount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {displayPYGCurrency(product.profitAmount || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`font-medium ${(product.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.profitMargin || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FaMoneyBillWave className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
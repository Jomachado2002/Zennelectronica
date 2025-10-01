// frontend/src/pages/NewProfitabilityAnalysis.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSearch, FaTimes, FaArrowLeft, FaCalculator } from 'react-icons/fa';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const NewProfitabilityAnalysis = () => {
  const [searchParams] = useSearchParams();
  const [budgets, setBudgets] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    budgetId: searchParams.get('budgetId') || '',
    clientId: searchParams.get('clientId') || '',
    items: [],
    notes: '',
    estimatedDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 días por defecto
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [currentCustomProduct, setCurrentCustomProduct] = useState({
    productSnapshot: {
      name: '',
      description: '',
      category: 'Personalizado',
      subcategory: 'Personalizado',
      brandName: ''
    },
    supplier: '',
    quantity: 1,
    purchasePrice: 0,
    purchaseCurrency: 'USD',
    exchangeRate: 7300,
    shippingCost: 0,
    customsCost: 0,
    otherCosts: 0,
    sellingPrice: 0,
    deliveryTime: '',
    notes: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(7300);
  
  const navigate = useNavigate();

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [budgetsRes, clientsRes, suppliersRes, productsRes] = await Promise.all([
          fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos`, {
            method: 'GET',
            credentials: 'include'
          }),
          fetch(`${SummaryApi.baseURL}/api/finanzas/clientes`, {
            method: 'GET',
            credentials: 'include'
          }),
          fetch(`${SummaryApi.baseURL}/api/finanzas/proveedores`, {
            method: 'GET',
            credentials: 'include'
          }),
          fetch(SummaryApi.allProduct.url, {
            method: 'GET',
            credentials: 'include'
          })
        ]);

        const [budgetsData, clientsData, suppliersData, productsData] = await Promise.all([
          budgetsRes.json(),
          clientsRes.json(),
          suppliersRes.json(),
          productsRes.json()
        ]);

        if (budgetsData.success) setBudgets(budgetsData.data.budgets || []);
        if (clientsData.success) setClients(clientsData.data.clients || []);
        if (suppliersData.success) setSuppliers(suppliersData.data.suppliers || []);
        if (productsData.success) setProducts(productsData.data || []);

      } catch (error) {
        console.error("Error:", error);
        toast.error("Error al cargar datos iniciales");
      }
    };

    fetchInitialData();
  }, []);

  // Filtrar productos por búsqueda
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
    
    setFilteredProducts(filtered.slice(0, 10));
  }, [searchTerm, products]);

  // Cargar productos automáticamente cuando se selecciona un presupuesto
  useEffect(() => {
    if (formData.budgetId) {
      loadBudgetProducts(formData.budgetId);
    }
  }, [formData.budgetId]);

  // Función para cargar productos del presupuesto seleccionado
  const loadBudgetProducts = async (budgetId) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success && result.data.items) {
        // Convertir items del presupuesto a items de análisis
        const budgetItems = result.data.items.map(item => ({
          product: item.product,
          productSnapshot: {
            name: item.productSnapshot?.name || 'Producto',
            description: item.productSnapshot?.description || '',
            category: item.productSnapshot?.category || 'General',
            subcategory: item.productSnapshot?.subcategory || 'General',
            brandName: item.productSnapshot?.brandName || ''
          },
          supplier: '', // El usuario debe seleccionar el proveedor
          quantity: item.quantity,
          purchasePrice: 0, // El usuario debe ingresar el precio de compra
          purchaseCurrency: 'USD',
          exchangeRate: exchangeRate,
          shippingCost: 0,
          customsCost: 0,
          otherCosts: 0,
          sellingPrice: item.unitPrice, // Usar el precio del presupuesto
          deliveryTime: '',
          notes: ''
        }));
        
        setFormData(prev => ({
          ...prev,
          items: budgetItems,
          clientId: result.data.client._id || result.data.client // Auto-seleccionar cliente
        }));
        
        toast.success(`${budgetItems.length} productos cargados desde el presupuesto`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar productos del presupuesto");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProduct = (product) => {
    const existingItemIndex = formData.items.findIndex(item => 
      item.product && item.product === product._id
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += 1;
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    } else {
      const newItem = {
        product: product._id,
        productSnapshot: {
          name: product.productName,
          description: product.description || '',
          category: product.category,
          subcategory: product.subcategory,
          brandName: product.brandName
        },
        supplier: '',
        quantity: 1,
        purchasePrice: 0,
        purchaseCurrency: 'USD',
        exchangeRate: exchangeRate,
        shippingCost: 0,
        customsCost: 0,
        otherCosts: 0,
        sellingPrice: product.sellingPrice || 0,
        deliveryTime: '',
        notes: ''
      };
      
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }
    
    setSearchTerm('');
    setShowProductSearch(false);
  };

  const handleAddCustomProduct = () => {
    if (!currentCustomProduct.productSnapshot.name || !currentCustomProduct.supplier) {
      toast.error("El nombre del producto y el proveedor son obligatorios");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...currentCustomProduct, exchangeRate: exchangeRate }]
    }));
    
    setCurrentCustomProduct({
      productSnapshot: {
        name: '',
        description: '',
        category: 'Personalizado',
        subcategory: 'Personalizado',
        brandName: ''
      },
      supplier: '',
      quantity: 1,
      purchasePrice: 0,
      purchaseCurrency: 'USD',
      exchangeRate: exchangeRate,
      shippingCost: 0,
      customsCost: 0,
      otherCosts: 0,
      sellingPrice: 0,
      deliveryTime: '',
      notes: ''
    });
    setShowCustomProduct(false);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedItems[index][parent][child] = value;
    } else {
      updatedItems[index][field] = value;
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleCustomProductChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCurrentCustomProduct(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setCurrentCustomProduct(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const calculateItemTotals = (item) => {
    const quantity = Number(item.quantity) || 0;
    const purchasePrice = Number(item.purchasePrice) || 0;
    const exchangeRate = Number(item.exchangeRate) || 7300;
    const shippingCost = Number(item.shippingCost) || 0;
    const customsCost = Number(item.customsCost) || 0;
    const otherCosts = Number(item.otherCosts) || 0;
    const sellingPrice = Number(item.sellingPrice) || 0;

    // Convertir precio de compra a PYG
    let purchasePricePYG = purchasePrice;
    if (item.purchaseCurrency === 'USD') {
      purchasePricePYG = purchasePrice * exchangeRate;
    } else if (item.purchaseCurrency === 'EUR') {
      purchasePricePYG = purchasePrice * 1.1 * exchangeRate;
    }

    const totalCostPerUnit = purchasePricePYG + shippingCost + customsCost + otherCosts;
    const totalCost = totalCostPerUnit * quantity;
    const totalRevenue = sellingPrice * quantity;
    const grossProfit = sellingPrice - totalCostPerUnit;
    const totalGrossProfit = grossProfit * quantity;
    const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
      purchasePricePYG,
      totalCostPerUnit,
      totalCost,
      totalRevenue,
      grossProfit,
      totalGrossProfit,
      profitMargin
    };
  };

  const calculateGrandTotals = () => {
    return formData.items.reduce((totals, item) => {
      const itemTotals = calculateItemTotals(item);
      return {
        totalCosts: totals.totalCosts + itemTotals.totalCost,
        totalRevenue: totals.totalRevenue + itemTotals.totalRevenue,
        totalGrossProfit: totals.totalGrossProfit + itemTotals.totalGrossProfit
      };
    }, { totalCosts: 0, totalRevenue: 0, totalGrossProfit: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.budgetId) {
      toast.error("Debe seleccionar un presupuesto");
      return;
    }
    
    if (!formData.clientId) {
      toast.error("Debe seleccionar un cliente");
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error("Debe añadir al menos un producto al análisis");
      return;
    }

    // Validar que todos los items tengan proveedor
    const itemsWithoutSupplier = formData.items.filter(item => !item.supplier);
    if (itemsWithoutSupplier.length > 0) {
      toast.error("Todos los productos deben tener un proveedor asignado");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/analisis-rentabilidad`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Análisis de rentabilidad creado correctamente");
        navigate("/panel-admin/analisis-rentabilidad");
      } else {
        toast.error(result.message || "Error al crear el análisis");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const grandTotals = calculateGrandTotals();
  const averageMargin = grandTotals.totalRevenue > 0 ? 
    (grandTotals.totalGrossProfit / grandTotals.totalRevenue) * 100 : 0;

  return (
    <div className="container mx-auto p-4">
      <Link to="/panel-admin/analisis-rentabilidad" className="text-blue-600 hover:underline mb-4 inline-flex items-center">
        <FaArrowLeft className="mr-2" /> Volver a Análisis de Rentabilidad
      </Link>
      
      <h1 className="text-2xl font-bold mb-4 flex items-center">
        <FaCalculator className="mr-2 text-blue-600" />
        Crear Nuevo Análisis de Rentabilidad
      </h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        {/* Selección de presupuesto y cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="budgetId" className="block text-sm font-medium text-gray-700 mb-1">
              Presupuesto *
            </label>
            <select
              id="budgetId"
              name="budgetId"
              value={formData.budgetId}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Seleccione un presupuesto</option>
              {budgets.map(budget => (
                <option key={budget._id} value={budget._id}>
                  {budget.budgetNumber} - {budget.client?.name || 'Cliente no disponible'} - {displayPYGCurrency(budget.finalAmount)}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Al seleccionar un presupuesto, se cargarán automáticamente sus productos
            </p>
          </div>
          
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              id="clientId"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Seleccione un cliente</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.name} {client.company ? `(${client.company})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Productos y análisis */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg">Productos para Análisis</h2>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowProductSearch(true);
                  setShowCustomProduct(false);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
              >
                <FaPlus className="mr-1" /> Añadir Producto
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomProduct(true);
                  setShowProductSearch(false);
                }}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center"
              >
                <FaPlus className="mr-1" /> Producto Personalizado
              </button>
            </div>
          </div>

          {/* Búsqueda de productos */}
          {showProductSearch && (
            <div className="mb-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Buscar Productos</h3>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 pl-10 bg-white border border-gray-300 rounded-lg"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              
              {searchTerm.trim() !== '' && (
                <div className="mt-2 max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center py-2">No se encontraron productos</p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {filteredProducts.map(product => (
                        <li 
                          key={product._id} 
                          className="py-2 px-3 hover:bg-blue-100 cursor-pointer"
                          onClick={() => handleAddProduct(product)}
                        >
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-sm text-gray-500">
                            {product.brandName} - {displayPYGCurrency(product.sellingPrice)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Formulario de producto personalizado */}
          {showCustomProduct && (
            <div className="mb-4 p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Producto Personalizado</h3>
                <button
                  type="button"
                  onClick={() => setShowCustomProduct(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del producto *
                  </label>
                  <input
                    type="text"
                    value={currentCustomProduct.productSnapshot.name}
                    onChange={(e) => handleCustomProductChange('productSnapshot.name', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={currentCustomProduct.productSnapshot.brandName}
                    onChange={(e) => handleCustomProductChange('productSnapshot.brandName', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor *
                  </label>
                  <select
                    value={currentCustomProduct.supplier}
                    onChange={(e) => handleCustomProductChange('supplier', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={currentCustomProduct.quantity}
                    onChange={(e) => handleCustomProductChange('quantity', Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de compra
                  </label>
                  <input
                    type="number"
                    value={currentCustomProduct.purchasePrice}
                    onChange={(e) => handleCustomProductChange('purchasePrice', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda
                  </label>
                  <select
                    value={currentCustomProduct.purchaseCurrency}
                    onChange={(e) => handleCustomProductChange('purchaseCurrency', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="PYG">PYG</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de venta
                  </label>
                  <input
                    type="number"
                    value={currentCustomProduct.sellingPrice}
                    onChange={(e) => handleCustomProductChange('sellingPrice', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de envío (PYG)
                  </label>
                  <input
                    type="number"
                    value={currentCustomProduct.shippingCost}
                    onChange={(e) => handleCustomProductChange('shippingCost', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo de entrega
                  </label>
                  <input
                    type="text"
                    value={currentCustomProduct.deliveryTime}
                    onChange={(e) => handleCustomProductChange('deliveryTime', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    placeholder="Ej: 5-7 días"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Añadir al Análisis
                </button>
              </div>
            </div>
          )}

          {/* Tabla de productos para análisis */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Compra</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Venta</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancia</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Margen %</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                      Añada productos para analizar rentabilidad
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, index) => {
                    const totals = calculateItemTotals(item);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900 text-sm">
                            {item.productSnapshot.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.productSnapshot.brandName}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.supplier}
                            onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                            required
                          >
                            <option value="">Seleccionar proveedor</option>
                            {suppliers.map(supplier => (
                              <option key={supplier._id} value={supplier._id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                            className="w-16 p-1 border border-gray-300 rounded text-center text-sm"
                            min="1"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex space-x-1">
                            <input
                              type="number"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(index, 'purchasePrice', Number(e.target.value))}
                              className="w-20 p-1 border border-gray-300 rounded text-right text-sm"
                              min="0"
                              step="0.01"
                            />
                            <select
                              value={item.purchaseCurrency}
                              onChange={(e) => handleItemChange(index, 'purchaseCurrency', e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="USD">USD</option>
                              <option value="PYG">PYG</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            = {displayPYGCurrency(totals.purchasePricePYG)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="text-sm font-medium">
                            {displayPYGCurrency(totals.totalCost)}
                          </div>
                          <div className="text-xs text-gray-500">
                            x{item.quantity}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            value={item.sellingPrice}
                            onChange={(e) => handleItemChange(index, 'sellingPrice', Number(e.target.value))}
                            className="w-24 p-1 border border-gray-300 rounded text-right text-sm"
                            min="0"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Total: {displayPYGCurrency(totals.totalRevenue)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className={`text-sm font-medium ${totals.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {displayPYGCurrency(totals.totalGrossProfit)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-semibold ${totals.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totals.profitMargin.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen de totales */}
        {formData.items.length > 0 && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Resumen del Análisis</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Costos</div>
                <div className="text-lg font-bold text-red-600">
                  {displayPYGCurrency(grandTotals.totalCosts)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Ingresos</div>
                <div className="text-lg font-bold text-blue-600">
                  {displayPYGCurrency(grandTotals.totalRevenue)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Ganancia Total</div>
                <div className={`text-lg font-bold ${grandTotals.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {displayPYGCurrency(grandTotals.totalGrossProfit)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Margen Promedio</div>
                <div className={`text-lg font-bold ${averageMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {averageMargin.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuración adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="estimatedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha estimada de entrega
            </label>
            <input
              type="date"
              id="estimatedDeliveryDate"
              name="estimatedDeliveryDate"
              value={formData.estimatedDeliveryDate}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas del análisis
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
              rows="3"
              placeholder="Observaciones, condiciones especiales, etc."
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/panel-admin/analisis-rentabilidad")}
            className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creando análisis...
              </span>
            ) : (
              "Crear Análisis de Rentabilidad"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProfitabilityAnalysis;
import React, { useState, useEffect, useRef } from 'react';
import { 
  FaPlus, 
  FaMinus, 
  FaSearch, 
  FaTrash, 
  FaSave, 
  FaCalculator,
  FaFileInvoice,
  FaUpload,
  FaDownload,
  FaEye,
  FaCheck,
  FaTimes,
  FaUser,
  FaBuilding,
  FaShoppingBag,
  FaDollarSign,
  FaPercent,
  FaFileAlt,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const EnhancedSalesForm = () => {
  // Form data state
  const [formData, setFormData] = useState({
    saleTypeId: '',
    clientId: '',
    branchId: '',
    salespersonId: '',
    currency: 'PYG',
    exchangeRate: 7300,
    paymentMethod: 'efectivo',
    paymentTerms: 'efectivo',
    customPaymentTerms: '',
    internalNotes: '',
    customerNotes: '',
    items: [],
    attachments: []
  });

  // Dropdown data
  const [dropdownData, setDropdownData] = useState({
    salesTypes: [],
    branches: [],
    salespersons: [],
    exchangeRates: { USD: 7300, lastUpdated: new Date() }
  });

  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState({
    customers: [],
    products: []
  });

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSalespersonForm, setShowSalespersonForm] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);

  // Calculations
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    totalAmountPYG: 0,
    totalAmountUSD: 0,
    amountInWords: ''
  });

  // Refs
  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);

  // Load form data on component mount
  useEffect(() => {
    loadFormData();
    initializeEmptyRows(); // Initialize with 5 empty rows
  }, []);

  // Force recalculation when items change
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      calculateTotals();
    }
  }, [formData.items]);

  // Recalculate totals when items or currency changes
  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.currency, formData.exchangeRate]);

  const loadFormData = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/formulario-datos`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setDropdownData(result.data);
        
        // Set default values
        if (result.data.branches && result.data.branches.length > 0) {
          setFormData(prev => ({ ...prev, branchId: result.data.branches[0]._id }));
        }
        if (result.data.salesTypes && result.data.salesTypes.length > 0) {
          setFormData(prev => ({ ...prev, saleTypeId: result.data.salesTypes[0]._id }));
        }
        if (result.data.salespersons && result.data.salespersons.length > 0) {
          setFormData(prev => ({ ...prev, salespersonId: result.data.salespersons[0]._id }));
        }
        if (result.data.exchangeRates && result.data.exchangeRates.USD) {
          setFormData(prev => ({ ...prev, exchangeRate: result.data.exchangeRates.USD }));
        }
      } else {
        console.error("Error loading form data:", result.message);
        // Don't set invalid IDs - let user select manually
        setDropdownData({
          salesTypes: [],
          branches: [],
          salespersons: [],
          exchangeRates: { USD: 7300, lastUpdated: new Date() }
        });
        
        setFormData(prev => ({
          ...prev,
          saleTypeId: '',
          branchId: '',
          salespersonId: '',
          exchangeRate: 7300
        }));
      }
    } catch (error) {
      console.error("Error loading form data:", error);
      // Don't set invalid IDs - let user select manually
      setDropdownData({
        salesTypes: [],
        branches: [],
        salespersons: [],
        exchangeRates: { USD: 7300, lastUpdated: new Date() }
      });
      
      setFormData(prev => ({
        ...prev,
        saleTypeId: '',
        branchId: '',
        salespersonId: '',
        exchangeRate: 7300
      }));
    }
  };

  const searchCustomers = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults(prev => ({ ...prev, customers: [] }));
      return;
    }

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/clientes/buscar?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSearchResults(prev => ({ ...prev, customers: result.data }));
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  };

  const searchProducts = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults(prev => ({ ...prev, products: [] }));
      return;
    }

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/productos/buscar?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSearchResults(prev => ({ ...prev, products: result.data }));
      }
    } catch (error) {
      console.error("Error searching products:", error);
    }
  };

  const selectProduct = (product) => {
    if (!currentEditingItem) return;
    
    const unitPrice = product.salesPrice || product.price || 0;
    
    updateItem(currentEditingItem, 'productId', product._id);
    updateItem(currentEditingItem, 'productSnapshot', {
      _id: product._id,
      name: product.name,
      code: product.code,
      salesPrice: unitPrice
    });
    updateItem(currentEditingItem, 'description', product.name);
    updateItem(currentEditingItem, 'unitPrice', unitPrice);
    
    setSearchResults(prev => ({ ...prev, products: [] }));
    setShowProductModal(false);
    setCurrentEditingItem(null);
  };

  const calculateTax = (amount, taxType, priceIncludesTax) => {
    const taxRates = { exempt: 0, iva_5: 5, iva_10: 10 };
    const taxRate = taxRates[taxType] !== undefined ? taxRates[taxType] : 10;
    
    console.log('calculateTax:', { amount, taxType, taxRate, priceIncludesTax });
    
    // Si el impuesto es 0% (exento), NO hacer ningún cálculo de IVA
    // El subtotal debe ser exactamente el precio ingresado
    if (taxType === 'exempt' || taxRate === 0) {
      console.log('IVA 0% (exento) - sin cálculo de impuesto - amount:', amount);
      return { 
        baseAmount: amount,    // Subtotal = precio original (₲1,100,000)
        taxAmount: 0,          // IVA = 0
        totalAmount: amount,   // Total = precio original (₲1,100,000)
        taxRate: 0 
      };
    }

    if (priceIncludesTax) {
      // Fórmulas específicas de Paraguay para IVA incluido
      let baseAmount, taxAmount;
      
      if (taxRate === 10) {
        // IVA 10%: IVA = Total / 11
        taxAmount = Math.round(amount / 11);
        baseAmount = amount - taxAmount;
      } else if (taxRate === 5) {
        // IVA 5%: IVA = Total / 21
        taxAmount = Math.round(amount / 21);
        baseAmount = amount - taxAmount;
      } else {
        // Para otros porcentajes, usar fórmula estándar
        baseAmount = amount / (1 + (taxRate / 100));
        taxAmount = amount - baseAmount;
      }
      
      return {
        baseAmount: Math.round(baseAmount),
        taxAmount: Math.round(taxAmount),
        totalAmount: amount,
        taxRate
      };
    } else {
      // El precio no incluye impuesto, agregamos el impuesto
      const taxAmount = amount * (taxRate / 100);
      const totalAmount = amount + taxAmount;
      return {
        baseAmount: amount,
        taxAmount: Math.round(taxAmount),
        totalAmount: Math.round(totalAmount),
        taxRate
      };
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    // Validación defensiva para evitar errores si items es undefined
    if (formData.items && Array.isArray(formData.items)) {
      formData.items.forEach(item => {
        if (item && item.quantity && (item.unitPrice || item.unitPricePYG)) {
          // Use unitPricePYG for consistent calculations, fallback to unitPrice
          const priceForCalculation = item.unitPricePYG || item.unitPrice;
          const itemSubtotal = item.quantity * priceForCalculation;
          const tax = calculateTax(itemSubtotal, item.taxType, item.priceIncludesTax);
          
          // Sumar subtotales (precio sin IVA) e IVAs por separado
          subtotal += tax.baseAmount;
          taxAmount += tax.taxAmount;
        }
      });
    }

    const totalAmount = subtotal + taxAmount;
    const totalAmountPYG = formData.currency === 'PYG' ? totalAmount : totalAmount * (formData.exchangeRate || 7300);
    const totalAmountUSD = formData.currency === 'USD' ? totalAmount : totalAmount / (formData.exchangeRate || 7300);

    setCalculations({
      subtotal,
      taxAmount,
      totalAmount,
      totalAmountPYG,
      totalAmountUSD,
      amountInWords: convertToWords(totalAmountPYG, 'PYG') // Always show PYG in words
    });
  };

  const convertToWords = (amount, currency) => {
    // This would call the API to convert amount to words
    // For now, return a placeholder
    return `Monto en palabras: ${amount.toLocaleString()} ${currency === 'PYG' ? 'guaraníes' : 'dólares'}`;
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      productId: null,
      productSnapshot: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      currency: formData.currency,
      exchangeRate: formData.exchangeRate,
      unitPricePYG: 0,
      taxType: 'iva_10',
      taxRate: 10,
      taxAmount: 0,
      subtotal: 0,
      subtotalWithTax: 0,
      priceIncludesTax: true
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Initialize with 3 empty rows for faster loading
  const initializeEmptyRows = () => {
    const emptyRows = Array.from({ length: 3 }, (_, index) => ({
      id: `empty-${index}`,
      productId: null,
      productSnapshot: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      currency: formData.currency,
      exchangeRate: formData.exchangeRate,
      unitPricePYG: 0,
      taxType: 'iva_10',
      taxRate: 10,
      taxAmount: 0,
      subtotal: 0,
      subtotalWithTax: 0,
      priceIncludesTax: true, // En Paraguay los precios normalmente incluyen IVA
      isEmpty: true
    }));
    
    setFormData(prev => ({
      ...prev,
      items: emptyRows
    }));
  };

  const updateItem = (itemId, field, value) => {
    console.log('updateItem called:', { itemId, field, value });
    
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          console.log('Updated item before calculation:', updatedItem);
          
          // Log específico para cambios de taxType
          if (field === 'taxType') {
            console.log('🔄 CAMBIO DE TAX TYPE:', {
              from: item.taxType,
              to: value,
              amount: updatedItem.unitPricePYG || updatedItem.unitPrice
            });
          }
          
          // Handle currency conversion for unit price
          if (field === 'unitPrice') {
            if (formData.currency === 'USD') {
              // Convert USD to PYG for calculations
              updatedItem.unitPricePYG = value * formData.exchangeRate;
            } else {
              // PYG price
              updatedItem.unitPricePYG = value;
            }
          }
          
          // Recalculate item totals when any relevant field changes
          const shouldRecalculate = ['unitPrice', 'quantity', 'taxType', 'priceIncludesTax'].includes(field);
          
          console.log('Should recalculate:', shouldRecalculate, 'for field:', field);
          
          if (shouldRecalculate) {
            const priceForCalculation = updatedItem.unitPricePYG || updatedItem.unitPrice;
            const itemSubtotal = updatedItem.quantity * priceForCalculation;
            const tax = calculateTax(itemSubtotal, updatedItem.taxType, updatedItem.priceIncludesTax);
            
            console.log('Recalculating item:', {
              itemId: updatedItem.id,
              field,
              taxType: updatedItem.taxType,
              priceForCalculation,
              itemSubtotal,
              priceIncludesTax: updatedItem.priceIncludesTax,
              taxResult: tax
            });
            
            // Log específico para IVA 0%
            if (updatedItem.taxType === 'exempt') {
              console.log('🔍 IVA 0% DETECTADO:', {
                taxType: updatedItem.taxType,
                amount: itemSubtotal,
                result: tax
              });
            }
            
            // Forzar actualización del estado para IVA 0%
            if (updatedItem.taxType === 'exempt') {
              console.log('Forzando actualización para IVA 0% (exento)');
            }
            
            return {
              ...updatedItem,
              subtotal: tax.baseAmount, // Subtotal = precio sin IVA (baseAmount)
              taxAmount: tax.taxAmount, // IVA calculado
              subtotalWithTax: tax.totalAmount, // Total = precio con IVA
              taxRate: tax.taxRate,
              isEmpty: false // Mark as no longer empty when user starts typing
            };
          }
          
          return {
            ...updatedItem,
            isEmpty: false // Mark as no longer empty when user starts typing
          };
        }
        return item;
      })
    }));
  };

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item && item.id !== itemId)
    }));
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, clientId: customer._id }));
    setCustomerSearch(customer.name);
    setSearchResults(prev => ({ ...prev, customers: [] }));
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/upload-attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...result.data]
        }));
        toast.success(`${files.length} archivo(s) subido(s) correctamente`);
      } else {
        toast.error(result.message || "Error al subir archivos");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Error al subir archivos");
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (attachmentId) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att._id !== attachmentId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.saleTypeId || !formData.clientId || !formData.branchId || !formData.salespersonId) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // Verificar que hay al menos un item con descripción válida
    const validItems = (formData.items || []).filter(item => 
      item && item.description && item.description.trim() !== ''
    );

    if (validItems.length === 0) {
      toast.error("Debes agregar al menos un producto con descripción");
      return;
    }

    setShowConfirmationModal(true);
  };

  const confirmSubmit = async () => {
    setIsLoading(true);
    try {
      // Filtrar solo los items que tienen descripción (no están vacíos)
      const validItems = (formData.items || []).filter(item => 
        item && item.description && item.description.trim() !== ''
      );

      if (validItems.length === 0) {
        toast.error("Debes agregar al menos un producto con descripción");
        setIsLoading(false);
        return;
      }

      // Crear los datos a enviar con solo los items válidos
      const saleData = {
        ...formData,
        items: validItems
      };

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas-mejoradas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(saleData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("Venta creada correctamente");
        // Reset form
        setFormData({
          saleTypeId: '',
          clientId: '',
          branchId: '',
          salespersonId: '',
          currency: 'PYG',
          exchangeRate: 7300,
          paymentMethod: 'efectivo',
          paymentTerms: 'efectivo',
          customPaymentTerms: '',
          internalNotes: '',
          customerNotes: '',
          items: []
        });
        setCustomerSearch('');
        setCalculations({
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          totalAmountPYG: 0,
          totalAmountUSD: 0,
          amountInWords: ''
        });
      } else {
        toast.error(result.message || "Error al crear la venta");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
      setShowConfirmationModal(false);
    }
  };

  const getSelectedCustomer = () => {
    if (!formData.clientId) return null;
    // This would be populated from the selected customer
    return { name: customerSearch };
  };

  const getSelectedSalesperson = () => {
    return dropdownData.salespersons.find(sp => sp._id === formData.salespersonId);
  };

  const getSelectedBranch = () => {
    return dropdownData.branches.find(b => b._id === formData.branchId);
  };

  const getSelectedSalesType = () => {
    return dropdownData.salesTypes.find(st => st._id === formData.saleTypeId);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center text-gray-900">
          <FaFileInvoice className="mr-2 text-blue-600" />
          Nueva Venta
        </h1>
        <p className="text-sm text-gray-600">
          Sistema completo de ventas con soporte para IVA de Paraguay y múltiples monedas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information - Compact */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-md font-semibold text-gray-700">Información de la Venta</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Venta *</label>
                <select
                  value={formData.saleTypeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, saleTypeId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {dropdownData.salesTypes.map(type => (
                    <option key={type._id} value={type._id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal *</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {dropdownData.branches.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendedor *</label>
                <select
                  value={formData.salespersonId}
                  onChange={(e) => setFormData(prev => ({ ...prev, salespersonId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {dropdownData.salespersons.map(salesperson => (
                    <option key={salesperson._id} value={salesperson._id}>{salesperson.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="PYG">Guaraní (₲)</option>
                  <option value="USD">Dólar ($)</option>
                </select>
              </div>
            </div>
            
            {/* Exchange Rate Display - Compact */}
            {formData.currency === 'USD' && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <span className="text-yellow-800">
                  Tasa: 1 USD = {formData.exchangeRate.toLocaleString()} PYG
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Selection - Compact */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-md font-semibold text-gray-700">Cliente</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
                <div className="relative">
                  <input
                    ref={customerSearchRef}
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      searchCustomers(e.target.value);
                    }}
                    placeholder="Buscar cliente..."
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                  >
                    <FaSearch className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Customer search results */}
                {(searchResults.customers?.length || 0) > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.customers.map(customer => (
                      <div
                        key={customer._id}
                        onClick={() => selectCustomer(customer)}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm"
                      >
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">
                          {customer.taxId && `RUC: ${customer.taxId}`}
                          {customer.phone && ` • ${customer.phone}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="w-full p-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors text-sm"
                >
                  <FaSearch className="w-4 h-4 mr-1 inline" />
                  Buscar
                </button>
              </div>
            </div>

            {getSelectedCustomer() && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                <div className="flex items-center">
                  <FaUser className="w-4 h-4 text-green-600 mr-2" />
                  <div>
                    <div className="font-medium text-green-900">{getSelectedCustomer().name}</div>
                    <div className="text-xs text-green-700">✓ Cliente seleccionado</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Table - Compact */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-md font-semibold text-gray-700">Productos</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center px-3 py-1 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors text-sm"
            >
              <FaPlus className="w-4 h-4 mr-1" />
              Agregar Fila
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase w-8">#</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase w-20">Código</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Descripción</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase w-16">Cant.</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 uppercase w-24">Precio</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase w-16">IVA</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 uppercase w-24">Subtotal</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 uppercase w-24">Total</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase w-12">Acc.</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {formData.items.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                      item.isEmpty ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-2 py-2 text-sm text-gray-700 text-center">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={item.productSnapshot?.code || ''}
                        onChange={(e) => updateItem(item.id, 'productCode', e.target.value)}
                        className={`w-full text-xs px-1 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          item.isEmpty ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
                        }`}
                        placeholder="Código"
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className={`flex-1 text-xs px-1 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                            item.isEmpty ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
                          }`}
                          placeholder="Descripción del producto"
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentEditingItem(item.id);
                            setShowProductModal(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                          title="Buscar producto"
                        >
                          <FaSearch className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        className={`w-full text-xs px-1 py-1 border border-gray-200 rounded text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          item.isEmpty ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
                        }`}
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <div className="relative">
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                          {formData.currency === 'PYG' ? '₲' : '$'}
                        </span>
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className={`w-full text-xs pl-4 pr-1 py-1 border border-gray-200 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                            item.isEmpty ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
                          }`}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={item.taxType}
                        onChange={(e) => updateItem(item.id, 'taxType', e.target.value)}
                        className={`w-full text-xs px-1 py-1 border border-gray-200 rounded text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          item.isEmpty ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
                        }`}
                      >
                        <option value="exempt">0%</option>
                        <option value="iva_5">5%</option>
                        <option value="iva_10">10%</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-gray-700 font-medium">
                      {formData.currency === 'PYG' ? '₲' : '$'}{item.subtotal.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-gray-900 font-bold">
                      {formData.currency === 'PYG' ? '₲' : '$'}{item.subtotalWithTax.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!item.isEmpty && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Search Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-4xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Buscar Productos</h3>
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setCurrentEditingItem(null);
                    setProductSearch('');
                    setSearchResults(prev => ({ ...prev, products: [] }));
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    ref={productSearchRef}
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    placeholder="Buscar por código o nombre..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {(searchResults.products?.length || 0) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.products.map(product => (
                      <div
                        key={product._id}
                        onClick={() => selectProduct(product)}
                        className="p-3 hover:bg-blue-50 cursor-pointer border border-gray-200 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-gray-900 text-sm">{product.name || product.productName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Código: {product.code || product.codigo}
                        </div>
                        <div className="text-sm font-medium text-green-600 mt-1">
                          Precio: {formData.currency === 'PYG' ? '₲' : '$'}{(product.salesPrice || product.sellingPrice || product.price || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {productSearch ? 'No se encontraron productos' : 'Ingresa un término de búsqueda'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customer Search Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-4xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Buscar Clientes</h3>
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setCustomerSearch('');
                    setSearchResults(prev => ({ ...prev, customers: [] }));
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      searchCustomers(e.target.value);
                    }}
                    placeholder="Buscar por nombre, RUC, teléfono..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {(searchResults.customers?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {searchResults.customers.map(customer => (
                      <div
                        key={customer._id}
                        onClick={() => {
                          selectCustomer(customer);
                          setShowCustomerModal(false);
                        }}
                        className="p-3 hover:bg-green-50 cursor-pointer border border-gray-200 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {customer.taxId && `RUC: ${customer.taxId}`}
                          {customer.phone && ` • Tel: ${customer.phone}`}
                          {customer.email && ` • Email: ${customer.email}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {customerSearch ? 'No se encontraron clientes' : 'Ingresa un término de búsqueda'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Information - Compact */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-md font-semibold text-gray-700">Información de Pago</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pago</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Términos de Pago</label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="net_15">Neto 15 días</option>
                  <option value="net_30">Neto 30 días</option>
                  <option value="net_60">Neto 60 días</option>
                  <option value="net_90">Neto 90 días</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {formData.paymentTerms === 'personalizado' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Términos Personalizados</label>
                  <input
                    type="text"
                    value={formData.customPaymentTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, customPaymentTerms: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ej: 45 días, 2 meses, etc."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Attachments */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Documentos Adjuntos</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subir Archivos
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileUpload}
                  disabled={uploadingFiles}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingFiles && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Subiendo...
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (máx. 10MB por archivo)
              </p>
            </div>

            {(formData.attachments?.length || 0) > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Archivos adjuntos:</h4>
                {formData.attachments.map((attachment) => (
                  <div key={attachment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FaFileAlt className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-900">{attachment.originalName}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(attachment.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={`${SummaryApi.baseURL}/api/finanzas/ventas/download-attachment/${attachment._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="Descargar"
                      >
                        <FaDownload className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Internas
              </label>
              <textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas internas para el equipo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas del Cliente
              </label>
              <textarea
                value={formData.customerNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas que aparecerán en la factura"
              />
            </div>
          </div>
        </div>

        {/* Totals - ERP Style */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300">
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-gray-300">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <FaCalculator className="w-5 h-5 mr-2 text-green-600" />
              Resumen de Totales
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-lg font-medium text-gray-700">Subtotal:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formData.currency === 'PYG' ? '₲' : '$'}{calculations.subtotal.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-lg font-medium text-gray-700">IVA:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formData.currency === 'PYG' ? '₲' : '$'}{calculations.taxAmount.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 bg-green-50 rounded-lg px-4 border-2 border-green-200">
                  <span className="text-xl font-bold text-gray-800">TOTAL:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formData.currency === 'PYG' ? '₲' : '$'}{calculations.totalAmount.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-2">Conversión de Moneda</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-blue-700">Total en PYG:</span>
                      <span className="font-bold text-blue-900">₲{calculations.totalAmountPYG.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    {formData.currency === 'USD' && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-blue-700">Total en USD:</span>
                        <span className="font-bold text-blue-900">${calculations.totalAmountUSD.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-700 mb-2">Monto en Palabras</h4>
                  <p className="text-sm text-gray-600 italic">
                    {calculations.amountInWords}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons - ERP Style */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300 p-6">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-8 py-3 text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 font-bold shadow-lg"
            >
              <FaSave className="w-5 h-5 mr-2" />
              {isLoading ? 'Guardando...' : 'Crear Venta'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="w-6 h-6 text-yellow-600 mr-3" />
              <h3 className="text-lg font-semibold">Confirmar Venta</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div>
                <span className="font-medium">Cliente:</span> {getSelectedCustomer()?.name || 'No seleccionado'}
              </div>
              <div>
                <span className="font-medium">Vendedor:</span> {getSelectedSalesperson()?.name || 'No seleccionado'}
              </div>
              <div>
                <span className="font-medium">Sucursal:</span> {getSelectedBranch()?.name || 'No seleccionado'}
              </div>
              <div>
                <span className="font-medium">Productos:</span> {formData.items?.length || 0}
              </div>
              <div>
                <span className="font-medium">Total:</span> {displayPYGCurrency(calculations.totalAmount)}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSubmit}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <FaCheck className="w-4 h-4 mr-2" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSalesForm;

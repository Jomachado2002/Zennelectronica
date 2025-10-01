// frontend/src/pages/NewBudget.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSearch, FaTimes } from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';

const NewBudget = () => {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    clientId: '',
    items: [],
    totalAmount: 0,
    discount: 0,
    tax: 10, // IVA por defecto (10%)
    finalAmount: 0,
    notes: '',
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 días por defecto
    paymentTerms: 'Pago a 30 días',
    deliveryMethod: 'Recogida en tienda'
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
    quantity: 1,
    unitPrice: 0,
    discount: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  
  const navigate = useNavigate();

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setClients(result.data.clients || []);
        } else {
          toast.error(result.message || "Error al cargar los clientes");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error de conexión");
      } finally {
        setIsLoadingClients(false);
      }
    };
    
    fetchClients();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
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
        setIsLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Filter products based on search term
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
    
    setFilteredProducts(filtered.slice(0, 10)); // Limitar a 10 resultados para mejor rendimiento
  }, [searchTerm, products]);

  // Calculate totals whenever items, discount, or tax changes
  useEffect(() => {
    const calculateTotals = () => {
      const totalAmount = formData.items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const itemDiscount = Number(item.discount) || 0;
        const subtotal = quantity * unitPrice * (1 - itemDiscount / 100);
        return sum + subtotal;
      }, 0);
      
      const discountAmount = totalAmount * (Number(formData.discount) / 100);
      const afterDiscount = totalAmount - discountAmount;
      const taxAmount = afterDiscount * (Number(formData.tax) / 100);
      const finalAmount = afterDiscount + taxAmount;
      
      setFormData(prev => ({
        ...prev,
        totalAmount,
        finalAmount
      }));
    };
    
    calculateTotals();
  }, [formData.items, formData.discount, formData.tax]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProduct = (product) => {
    // Verificar si el producto ya está en la lista
    const existingItemIndex = formData.items.findIndex(item => 
      item.product && item.product === product._id
    );

    if (existingItemIndex >= 0) {
      // Si ya existe, aumentamos la cantidad
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += 1;
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    } else {
      // Si no existe, lo añadimos
      const newItem = {
        product: product._id,
        productSnapshot: {
          name: product.productName,
          price: product.sellingPrice,
          description: product.description || '',
          category: product.category,
          subcategory: product.subcategory,
          brandName: product.brandName
        },
        quantity: 1,
        unitPrice: product.sellingPrice,
        discount: 0
      };
      
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }
    
    // Limpiar búsqueda y cerrar panel
    setSearchTerm('');
    setShowProductSearch(false);
  };

  const handleAddCustomProduct = () => {
    if (!currentCustomProduct.productSnapshot.name || !currentCustomProduct.unitPrice) {
      toast.error("El nombre y el precio del producto son obligatorios");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...currentCustomProduct }]
    }));
    
    // Resetear producto personalizado y cerrar panel
    setCurrentCustomProduct({
      productSnapshot: {
        name: '',
        description: '',
        category: 'Personalizado',
        subcategory: 'Personalizado',
        brandName: ''
      },
      quantity: 1,
      unitPrice: 0,
      discount: 0
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
      // Campos anidados como productSnapshot.name
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
      // Campos anidados como productSnapshot.name
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.clientId) {
      toast.error("Debe seleccionar un cliente");
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error("Debe añadir al menos un producto al presupuesto");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Presupuesto creado correctamente");
        navigate("/panel-admin/presupuestos");
      } else {
        toast.error(result.message || "Error al crear el presupuesto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Link to="/panel-admin/presupuestos" className="text-blue-600 hover:underline mb-4 inline-block">
        &lt; Volver a la lista de presupuestos
      </Link>
      
      <h1 className="text-2xl font-bold mb-4">Crear Nuevo Presupuesto</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        {/* Selección de cliente */}
        <div className="mb-6">
          <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          {isLoadingClients ? (
            <div className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg">
              Cargando clientes...
            </div>
          ) : (
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
          )}
          
          <Link to="/panel-admin/clientes/nuevo" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
            + Crear nuevo cliente
          </Link>
        </div>
        
        {/* Productos */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg">Productos y Servicios</h2>
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
                  {isLoadingProducts ? (
                    <p className="text-center py-2">Cargando productos...</p>
                  ) : filteredProducts.length === 0 ? (
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
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
                    Precio *
                  </label>
                  <input
                    type="number"
                    value={currentCustomProduct.unitPrice}
                    onChange={(e) => handleCustomProductChange('unitPrice', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    min="0"
                    required
                  />
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
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={currentCustomProduct.productSnapshot.description}
                    onChange={(e) => handleCustomProductChange('productSnapshot.description', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg"
                    rows="2"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Añadir al Presupuesto
                </button>
              </div>
            </div>
          )}
          
          {/* Tabla de productos seleccionados */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dto.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                      Añada productos al presupuesto
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, index) => {
                    // Calcular subtotal para este item
                    const quantity = Number(item.quantity) || 0;
                    const unitPrice = Number(item.unitPrice) || 0;
                    const discount = Number(item.discount) || 0;
                    const subtotal = quantity * unitPrice * (1 - discount / 100);
                    
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.productSnapshot.name}</div>
                          <div className="text-sm text-gray-500">{item.productSnapshot.brandName}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                            className="w-16 p-1 border border-gray-300 rounded text-center"
                            min="1"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                            className="w-24 p-1 border border-gray-300 rounded text-right"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, 'discount', Math.min(100, Math.max(0, Number(e.target.value))))}
                            className="w-16 p-1 border border-gray-300 rounded text-center"
                            min="0"
                            max="100"
                          />
                          %
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {displayPYGCurrency(subtotal)}
                        </td>
                        <td className="px-4 py-3 text-center">
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
        
        {/* Totales y configuración adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Columna 1: Configuración del presupuesto */}
          <div>
            <h3 className="font-semibold mb-3">Configuración</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">
                  Válido hasta
                </label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                  Condiciones de pago
                </label>
                <select
                  id="paymentTerms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                >
                  <option value="Pago por adelantado">Pago por adelantado</option>
                  <option value="Pago al contado">Pago al contado</option>
                  <option value="Pago a 15 días">Pago a 15 días</option>
                  <option value="Pago a 30 días">Pago a 30 días</option>
                  <option value="Pago a 60 días">Pago a 60 días</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Método de entrega
                </label>
                <select
                  id="deliveryMethod"
                  name="deliveryMethod"
                  value={formData.deliveryMethod}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                >
                  <option value="Recogida en tienda">Recogida en tienda</option>
                  <option value="Envío estándar">Envío estándar</option>
                  <option value="Envío express">Envío express</option>
                  <option value="Entrega a domicilio">Entrega a domicilio</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas/Condiciones adicionales
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  rows="4"
                  placeholder="Términos, condiciones especiales, información adicional..."
                ></textarea>
              </div>
            </div>
          </div>
          
          {/* Columna 2: Resumen de totales */}
          <div>
            <h3 className="font-semibold mb-3">Resumen</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{displayPYGCurrency(formData.totalAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Descuento:</span>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      className="w-16 p-1 border border-gray-300 rounded text-center"
                      min="0"
                      max="100"
                    />
                    <span className="ml-1">%</span>
                  </div>
                  <span className="font-medium">
                    {displayPYGCurrency(formData.totalAmount * (formData.discount / 100))}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">IVA:</span>
                    <input
                      type="number"
                      name="tax"
                      value={formData.tax}
                      onChange={handleChange}
                      className="w-16 p-1 border border-gray-300 rounded text-center"
                      min="0"
                      max="100"
                    />
                    <span className="ml-1">%</span>
                  </div>
                  <span className="font-medium">
                    {displayPYGCurrency(formData.totalAmount * (1 - formData.discount / 100) * (formData.tax / 100))}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-lg font-bold text-blue-700">
                  <span>TOTAL:</span>
                  <span>{displayPYGCurrency(formData.finalAmount)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={() => navigate("/panel-admin/presupuestos")}
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
    Creando presupuesto...
  </span>
) : (
  "Crear Presupuesto"
)}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewBudget;
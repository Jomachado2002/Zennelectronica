import React, { useState, useEffect, useCallback } from 'react';
import DynamicProductSpecifications from './DynamicProductSpecifications';
import SummaryApi from '../common';
import { 
  FaUpload, FaSave, FaTimes, FaImage, FaFileAlt, FaDollarSign,
  FaInfoCircle, FaEye, FaEyeSlash, FaTrash, FaSync, FaBox
} from "react-icons/fa";
import useCategories from '../hooks/useCategories';
import uploadImage from '../helpers/uploadImage';
import DisplayImage from './DisplayImage';
import { toast } from 'react-toastify';

const UploadProduct = ({ onClose, fetchData }) => {
  const { getSubcategoriesByCategory, getCategoriesForSelect, getSpecificationsBySubcategory, categories, loading: categoriesLoading } = useCategories();
  
  // Función para normalizar imágenes existentes (solo para carga inicial)
  const normalizeImages = (images) => {
    if (!Array.isArray(images)) return [];
    
    return images.map(img => {
      if (typeof img === 'string') {
        return img; // Ya es una URL
      } else if (img && img.secure_url) {
        return img.secure_url; // Extraer URL del objeto
      } else if (img && img.url) {
        return img.url; // Extraer URL del objeto
      }
      return img; // Fallback
    }).filter(img => img); // Filtrar valores vacíos
  };

  // Función para mapear especificaciones del producto a las especificaciones de la categoría
  const mapProductSpecifications = (productData, category, subcategory) => {
    if (!productData || !category || !subcategory) return {};
    
    const availableSpecs = getSpecificationsBySubcategory(category, subcategory);
    const mappedSpecs = {};
    
    console.log('🔍 UploadProduct - Mapeando especificaciones:', {
      category,
      subcategory,
      availableSpecsCount: availableSpecs.length,
      availableSpecs: availableSpecs.map(s => ({ name: s.name, label: s.label, type: s.type }))
    });
    
    // Mapear cada especificación disponible
    availableSpecs.forEach(spec => {
      const fieldName = spec.name;
      // Buscar el valor en los datos del producto
      mappedSpecs[fieldName] = productData[fieldName] || '';
    });
    
    console.log('🔍 UploadProduct - Especificaciones mapeadas:', mappedSpecs);
    
    return mappedSpecs;
  };
  
  // Debug logs para categorías
  useEffect(() => {
    console.log('🔍 UploadProduct - Estado de categorías:', {
      categoriesLoading,
      categoriesCount: categories.length,
      categories: categories.map(c => ({ value: c.value, label: c.label, subcategoriesCount: c.subcategories?.length || 0 }))
    });
  }, [categories, categoriesLoading]);
  
  // Estado principal del producto
  const [data, setData] = useState({
    productName: '',
    brandName: '',
    category: '',
    subcategory: '',
    productImage: [],
    description: '',
    price: 0, // Precio anterior
    sellingPrice: 0, // Precio de venta actual
    stock: 0,
    isVipOffer: false,
    specifications: {},
    codigo: '',
    // Campos financieros
    purchasePriceUSD: 0,
    exchangeRate: 7300,
    loanInterest: 0,
    deliveryCost: 0,
    profitMargin: 0,
    purchasePrice: 0,
    profitAmount: 0
  });

  const [openFullScreenImage, setOpenFullScreenImage] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState(7300);

  // Actualizar especificaciones cuando cambien la categoría o subcategoría
  useEffect(() => {
    if (data.category && data.subcategory && categories.length > 0) {
      const mappedSpecifications = mapProductSpecifications(data, data.category, data.subcategory);
      setData(prev => ({
        ...prev,
        specifications: mappedSpecifications
      }));
    }
  }, [data.category, data.subcategory, categories]);

  // Función para obtener el tipo de cambio actual
  const fetchCurrentExchangeRate = useCallback(async () => {
    try {
      setIsLoadingExchangeRate(true);
      const response = await fetch(SummaryApi.exchangeRate.current.url);
      const data = await response.json();
      if (data.success) {
        setCurrentExchangeRate(data.data.rate);
        setData(prev => ({
          ...prev,
          exchangeRate: data.data.rate.toString()
        }));
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    } finally {
      setIsLoadingExchangeRate(false);
    }
  }, []);

  // Calcular precios cuando cambien los valores financieros
  useEffect(() => {
    const purchasePriceUSD = parseFloat(data.purchasePriceUSD) || 0;
    const exchangeRate = parseFloat(data.exchangeRate) || 7300;
    const loanInterest = parseFloat(data.loanInterest) || 0;
    const deliveryCost = parseFloat(data.deliveryCost) || 0;
    const profitMargin = parseFloat(data.profitMargin) || 0;
    const sellingPrice = parseFloat(data.sellingPrice) || 0;

    // Calcular precio de compra en PYG
    const purchasePricePYG = purchasePriceUSD * exchangeRate;
    
    // Calcular costo total correctamente
    const interestAmount = purchasePricePYG * (loanInterest / 100);
    const totalCost = purchasePricePYG + interestAmount + deliveryCost;
    
    // Calcular ganancia y margen real
    const profitAmount = sellingPrice - totalCost;
    const actualProfitMargin = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;

    // Calcular precio sugerido con la fórmula correcta
    const suggestedSellingPrice = profitMargin > 0 && profitMargin < 100 
      ? totalCost / (1 - (profitMargin / 100)) 
      : totalCost;

    setData(prev => ({
      ...prev,
      purchasePrice: purchasePricePYG,
      profitAmount: profitAmount,
      actualProfitMargin: actualProfitMargin,
      suggestedSellingPrice: Math.round(suggestedSellingPrice),
      totalCost: totalCost
    }));
  }, [data.purchasePriceUSD, data.exchangeRate, data.loanInterest, data.deliveryCost, data.sellingPrice, data.profitMargin]);

  const handleOnChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;

    // Manejar campos numéricos
    if (type === 'number') {
      // Permitir vacío para poder borrar
      if (value === '') {
        processedValue = '';
      } else {
        // Convertir a número y evitar decimales innecesarios
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          processedValue = numValue.toString();
        }
      }
    } else if (type === 'checkbox') {
      processedValue = checked;
    }

    setData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Limpiar errores de validación
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSpecificationsChange = (specs) => {
    setData(prev => ({
      ...prev,
      specifications: specs
    }));
  };

  const handleUploadProductImage = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const maxImages = 10;
    const remainingSlots = maxImages - data.productImage.length;
    
    if (remainingSlots <= 0) {
      toast.warning(`Solo se pueden cargar hasta ${maxImages} imágenes en total`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    const uploadPromises = [];

    try {
      for (const file of filesToUpload) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`La imagen ${file.name} excede el límite de 5MB`);
          continue;
        }

        if (!file.type.startsWith('image/')) {
          toast.error(`El archivo ${file.name} no es una imagen válida`);
          continue;
        }

        const uploadPromise = uploadImage(file)
          .then(response => response.url)
          .catch(error => {
            console.error(`Error al cargar ${file.name}:`, error);
            return null;
          });

        uploadPromises.push(uploadPromise);
      }

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null);

      if (validUrls.length > 0) {
        setData(prev => ({
          ...prev,
          productImage: [...prev.productImage, ...validUrls]
        }));
        toast.success(`${validUrls.length} ${validUrls.length === 1 ? 'imagen cargada' : 'imágenes cargadas'} exitosamente`);
      }
    } catch (error) {
      console.error('Error al cargar las imágenes:', error);
      toast.error('Error al cargar las imágenes');
    }
  };

  const handleDeleteImage = async (index) => {
    setData(prev => ({
      ...prev,
      productImage: prev.productImage.filter((_, i) => i !== index)
    }));
  };

  const handleUseSuggestedPrice = () => {
    const suggestedPrice = data.suggestedSellingPrice || 0;
    
    if (suggestedPrice > 0) {
      setData(prev => ({
        ...prev,
        sellingPrice: suggestedPrice.toString(),
        price: prev.sellingPrice || '0' // Guardar precio anterior
      }));
      toast.success(`Precio sugerido aplicado: ${suggestedPrice.toLocaleString()} Gs`);
    } else {
      toast.error('No se pudo calcular el precio sugerido');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!data.productName.trim()) errors.productName = 'El nombre del producto es requerido';
    if (!data.brandName.trim()) errors.brandName = 'La marca es requerida';
    if (!data.category) errors.category = 'La categoría es requerida';
    if (!data.subcategory) errors.subcategory = 'La subcategoría es requerida';
    if (!data.codigo.trim()) errors.codigo = 'El código del producto es requerido';
    if (!data.description.trim()) errors.description = 'La descripción es requerida';
    if (data.productImage.length === 0) errors.productImage = 'Al menos una imagen es requerida';
    if (!data.sellingPrice || data.sellingPrice <= 0) errors.sellingPrice = 'El precio de venta debe ser mayor a 0';
    if (!data.stock || data.stock < 0) errors.stock = 'El stock debe ser mayor o igual a 0';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    console.log('🚀 UploadProduct - handleSubmit iniciado');
    e.preventDefault();
    
    console.log('📋 UploadProduct - Validando formulario...');
    if (!validateForm()) {
      console.log('❌ UploadProduct - Validación falló');
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }
    console.log('✅ UploadProduct - Validación exitosa');

    setIsSubmitting(true);
    try {
      // Preparar datos para enviar
      const productDataToSend = {
        ...data,
        // Mapear price (precio anterior) correctamente
        price: data.price || 0,
        // Incluir todas las especificaciones individuales
        ...data.specifications
      };

      console.log('📤 UploadProduct - Datos preparados para enviar:', {
        productName: productDataToSend.productName,
        sellingPrice: productDataToSend.sellingPrice,
        price: productDataToSend.price,
        purchasePriceUSD: productDataToSend.purchasePriceUSD,
        exchangeRate: productDataToSend.exchangeRate,
        loanInterest: productDataToSend.loanInterest,
        deliveryCost: productDataToSend.deliveryCost,
        profitMargin: productDataToSend.profitMargin,
        specifications: productDataToSend.specifications
      });

      console.log('🌐 UploadProduct - Llamando a SummaryApi.uploadProduct...');
      const response = await fetch(SummaryApi.uploadProduct.url, {
        method: SummaryApi.uploadProduct.method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(productDataToSend)
      });
      
      const responseData = await response.json();
      
      console.log('📥 UploadProduct - Respuesta recibida:', responseData);
      
      if (responseData.success) {
        console.log('✅ UploadProduct - Producto creado exitosamente');
        toast.success('Producto creado correctamente');
        if (fetchData) fetchData();
        onClose();
      } else {
        console.log('❌ UploadProduct - Error en la respuesta:', responseData.message);
        toast.error(responseData.message || 'Error al crear el producto');
      }
    } catch (error) {
      console.error('💥 UploadProduct - Error en handleSubmit:', error);
      console.error('💥 UploadProduct - Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      toast.error('Error al crear el producto');
    } finally {
      console.log('🏁 UploadProduct - handleSubmit finalizado');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Producto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Single Page Layout */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaInfoCircle className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-800">Información Básica</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    name="productName"
                    value={data.productName}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ingrese el nombre del producto"
                  />
                  {validationErrors.productName && <p className="text-red-600 text-sm mt-1">{validationErrors.productName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    name="brandName"
                    value={data.brandName}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ingrese la marca"
                  />
                  {validationErrors.brandName && <p className="text-red-600 text-sm mt-1">{validationErrors.brandName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select
                    name="category"
                    value={data.category}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar categoría</option>
                    {(() => {
                      const categoriesForSelect = getCategoriesForSelect();
                      console.log('🔍 UploadProduct - Categorías para select:', categoriesForSelect);
                      return categoriesForSelect.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ));
                    })()}
                  </select>
                  {validationErrors.category && <p className="text-red-600 text-sm mt-1">{validationErrors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría *</label>
                  <select
                    name="subcategory"
                    value={data.subcategory}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!data.category}
                  >
                    <option value="">Seleccionar subcategoría</option>
                    {(() => {
                      const subcategories = getSubcategoriesByCategory(data.category);
                      console.log('🔍 UploadProduct - Subcategorías para select:', {
                        category: data.category,
                        subcategories: subcategories
                      });
                      return subcategories.map(sub => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ));
                    })()}
                  </select>
                  {validationErrors.subcategory && <p className="text-red-600 text-sm mt-1">{validationErrors.subcategory}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código del Producto *</label>
                  <input
                    type="text"
                    name="codigo"
                    value={data.codigo}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: INF-001"
                  />
                  {validationErrors.codigo && <p className="text-red-600 text-sm mt-1">{validationErrors.codigo}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                  <textarea
                    name="description"
                    value={data.description}
                    onChange={handleOnChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción detallada del producto"
                  />
                  {validationErrors.description && <p className="text-red-600 text-sm mt-1">{validationErrors.description}</p>}
                </div>
              </div>
            </div>

            {/* Imágenes */}
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaImage className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-800">Imágenes del Producto</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.productImage.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Producto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFullScreenImage(image);
                            setOpenFullScreenImage(true);
                          }}
                          className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(index)}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {data.productImage.length < 10 && (
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-32 hover:border-gray-400 transition-colors">
                    <label htmlFor="uploadImage" className="cursor-pointer flex flex-col items-center">
                      <FaUpload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs mt-1">Subir</span>
                      <input
                        type="file"
                        id="uploadImage"
                        className="hidden"
                        onChange={handleUploadProductImage}
                        multiple
                        accept="image/*"
                      />
                    </label>
                  </div>
                )}
              </div>
              {validationErrors.productImage && <p className="text-red-600 text-sm mt-1">{validationErrors.productImage}</p>}
            </div>

            {/* Información Financiera */}
            <div className="bg-yellow-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaDollarSign className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-semibold text-yellow-800">Información Financiera</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Compra USD</label>
                  <input
                    type="number"
                    name="purchasePriceUSD"
                    value={data.purchasePriceUSD}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio USD/PYG</label>
                  <div className="flex">
                    <input
                      type="number"
                      name="exchangeRate"
                      value={data.exchangeRate}
                      onChange={handleOnChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="7300"
                    />
                    <button
                      type="button"
                      onClick={fetchCurrentExchangeRate}
                      disabled={isLoadingExchangeRate}
                      className="px-3 py-2 bg-yellow-500 text-white rounded-r-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {isLoadingExchangeRate ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <FaSync className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Compra PYG</label>
                  <input
                    type="number"
                    value={data.purchasePrice}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    placeholder="Calculado automáticamente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interés sobre Préstamos (%)</label>
                  <input
                    type="number"
                    name="loanInterest"
                    value={data.loanInterest}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Envío (PYG)</label>
                  <input
                    type="number"
                    name="deliveryCost"
                    value={data.deliveryCost}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia Deseado (%)</label>
                  <input
                    type="number"
                    name="profitMargin"
                    value={data.profitMargin}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="mt-4 p-4 bg-purple-100 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Resumen Financiero</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Ganancia:</p>
                    <p className="font-semibold text-purple-900">{Number(data.profitAmount || 0).toLocaleString()} Gs</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Margen Real:</p>
                    <p className="font-semibold text-purple-900">{Number(data.actualProfitMargin || 0).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Costo Total:</p>
                    <p className="font-semibold text-purple-900">
                      {Number(data.totalCost || 0).toLocaleString()} Gs
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Precio Sugerido:</p>
                    <p className="font-semibold text-purple-900">{Number(data.suggestedSellingPrice || 0).toLocaleString()} Gs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Precios de Venta */}
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaDollarSign className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-purple-800">Precios de Venta</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Anterior (PYG)</label>
                  <input
                    type="number"
                    name="price"
                    value={data.price}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta Final (PYG) *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={data.sellingPrice}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                    step="0.01"
                    required
                  />
                  {validationErrors.sellingPrice && <p className="text-red-600 text-sm mt-1">{validationErrors.sellingPrice}</p>}
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleUseSuggestedPrice}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center"
                >
                  <FaDollarSign className="w-4 h-4 mr-2" />
                  Usar Precio Sugerido
                </button>
              </div>
            </div>

            {/* Inventario */}
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaBox className="w-5 h-5 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold text-orange-800">Inventario</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Disponible *</label>
                  <input
                    type="number"
                    name="stock"
                    value={data.stock}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0"
                    min="0"
                  />
                  {validationErrors.stock && <p className="text-red-600 text-sm mt-1">{validationErrors.stock}</p>}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isVipOffer"
                    checked={data.isVipOffer}
                    onChange={handleOnChange}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Oferta VIP
                  </label>
                </div>
              </div>
            </div>

            {/* Especificaciones Técnicas */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaFileAlt className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Especificaciones Técnicas</h3>
              </div>
              
              <DynamicProductSpecifications
                category={data.category}
                subcategory={data.subcategory}
                specifications={data.specifications}
                onSpecificationsChange={handleSpecificationsChange}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-50 space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <FaSave className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? 'Creando...' : 'Crear Producto'}
          </button>
        </div>
      </div>

      {/* Modal de imagen en pantalla completa */}
      {openFullScreenImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setOpenFullScreenImage(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <FaTimes className="w-8 h-8" />
            </button>
            <img
              src={fullScreenImage}
              alt="Vista previa"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProduct;
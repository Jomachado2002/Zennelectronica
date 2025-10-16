import React, { useState, useEffect, useCallback } from 'react';
import DynamicProductSpecifications from './DynamicProductSpecifications';
import SummaryApi from '../common';
import { 
  FaUpload, FaSave, FaTimes, FaImage, FaFileAlt, FaDollarSign,
  FaInfoCircle, FaEye, FaEyeSlash, FaTrash, FaSync
} from "react-icons/fa";
import useCategories from '../hooks/useCategories';
import uploadImage from '../helpers/uploadImage';
import DisplayImage from './DisplayImage';
import { toast } from 'react-toastify';

const AdminEditProduct = ({ onClose, productData, fetchdata }) => {
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
    
    console.log('🔍 AdminEditProduct - Mapeando especificaciones:', {
      category,
      subcategory,
      availableSpecsCount: availableSpecs.length,
      availableSpecs: availableSpecs.map(s => ({ name: s.name, label: s.label, type: s.type })),
      productDataKeys: Object.keys(productData).filter(key => 
        !['_id', 'productName', 'brandName', 'category', 'subcategory', 'productImage', 'description', 
          'price', 'sellingPrice', 'stock', 'isVipOffer', 'codigo', 'slug', 'createdAt', 'updatedAt', 
          'purchasePriceUSD', 'exchangeRate', 'loanInterest', 'deliveryCost', 'profitMargin', 
          'purchasePrice', 'profitAmount', 'lastUpdatedFinance', 'stockStatus', 'sales', 'budgets', '__v']
      )
    });
    
    // Mapear cada especificación disponible
    availableSpecs.forEach(spec => {
      const fieldName = spec.name;
      // Buscar el valor en los datos del producto
      mappedSpecs[fieldName] = productData[fieldName] || '';
    });
    
    console.log('🔍 AdminEditProduct - Especificaciones mapeadas:', mappedSpecs);
    
    return mappedSpecs;
  };
  
  // Debug logs para categorías
  useEffect(() => {
    console.log('🔍 AdminEditProduct - Estado de categorías:', {
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState(7300);

  // Cargar datos del producto al montar el componente
  useEffect(() => {
    if (productData) {
      console.log('🔍 AdminEditProduct - Cargando datos del producto:', {
        productName: productData.productName,
        category: productData.category,
        subcategory: productData.subcategory,
        specifications: productData.specifications
      });
      
      // Mapear especificaciones dinámicamente basado en la categoría y subcategoría
      const mappedSpecifications = mapProductSpecifications(
        productData, 
        productData.category, 
        productData.subcategory
      );
      
      setData(prev => ({
        ...prev,
        ...productData,
        // Normalizar imágenes para que sean solo URLs
        productImage: normalizeImages(productData.productImage || []),
        // Asegurar que los campos financieros sean strings para inputs
        purchasePriceUSD: productData.purchasePriceUSD ? Number(productData.purchasePriceUSD).toString() : '',
        exchangeRate: productData.exchangeRate ? Number(productData.exchangeRate).toString() : '7300',
        loanInterest: productData.loanInterest ? Number(productData.loanInterest).toString() : '',
        deliveryCost: productData.deliveryCost ? Number(productData.deliveryCost).toString() : '',
        profitMargin: productData.profitMargin ? Number(productData.profitMargin).toString() : '',
        price: productData.price ? Number(productData.price).toString() : '',
        sellingPrice: productData.sellingPrice ? Number(productData.sellingPrice).toString() : '',
        stock: productData.stock ? Number(productData.stock).toString() : '',
        profitAmount: Number(productData.profitAmount) || 0,
        purchasePrice: Number(productData.purchasePrice) || 0,
        // Usar especificaciones mapeadas dinámicamente
        specifications: mappedSpecifications
      }));
    }
  }, [productData, categories]);

  // Actualizar especificaciones cuando cambien la categoría o subcategoría
  useEffect(() => {
    if (data.category && data.subcategory && categories.length > 0) {
      const mappedSpecifications = mapProductSpecifications(productData, data.category, data.subcategory);
      setData(prev => ({
        ...prev,
        specifications: mappedSpecifications
      }));
    }
  }, [data.category, data.subcategory, categories, productData]);

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

  // Cargar tipo de cambio al montar
  useEffect(() => {
    fetchCurrentExchangeRate();
  }, [fetchCurrentExchangeRate]);

  // Función para calcular el precio sugerido
  const calculateSuggestedPrice = useCallback((purchasePriceUSD, exchangeRate, loanInterest, deliveryCost, profitMargin) => {
    if (!purchasePriceUSD || !exchangeRate) return 0;
    
    const purchasePricePYG = purchasePriceUSD * exchangeRate;
    const totalCost = purchasePricePYG + (purchasePricePYG * (loanInterest / 100)) + deliveryCost;
    const suggestedPrice = totalCost / (1 - (profitMargin / 100));
    
    return Math.round(suggestedPrice);
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
    
    // Para campos numéricos, asegurar que se manejen correctamente
    if (type === 'number') {
      // Permitir campo vacío para poder borrar
      if (value === '') {
        processedValue = '';
      } else {
        // Convertir a número y luego a string para evitar decimales innecesarios
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          // Si es un número entero, no mostrar decimales
          processedValue = Number.isInteger(numValue) ? numValue.toString() : numValue.toString();
        }
      }
    }
    
    setData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));

    // Limpiar errores de validación
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
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
    if (!data.description.trim()) errors.description = 'La descripción es requerida';
    if (data.productImage.length === 0) errors.productImage = 'Al menos una imagen es requerida';
    if (!data.codigo.trim()) errors.codigo = 'El código del producto es requerido';
    if (data.sellingPrice <= 0) errors.sellingPrice = 'El precio de venta debe ser mayor a 0';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    console.log('🚀 AdminEditProduct - handleSubmit iniciado');
    e.preventDefault();
    
    console.log('📋 AdminEditProduct - Validando formulario...');
    if (!validateForm()) {
      console.log('❌ AdminEditProduct - Validación falló');
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }
    console.log('✅ AdminEditProduct - Validación exitosa');

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

      console.log('📤 AdminEditProduct - Datos preparados para enviar:', {
        _id: productDataToSend._id,
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

      console.log('🌐 AdminEditProduct - Llamando a SummaryApi.updateProduct...');
      const response = await fetch(SummaryApi.updateProduct.url, {
        method: SummaryApi.updateProduct.method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(productDataToSend)
      });
      
      const responseData = await response.json();
      
      console.log('📥 AdminEditProduct - Respuesta recibida:', responseData);
      
      if (responseData.success) {
        console.log('✅ AdminEditProduct - Actualización exitosa');
        toast.success('Producto actualizado correctamente');
        if (fetchdata) fetchdata();
        onClose();
      } else {
        console.log('❌ AdminEditProduct - Error en la respuesta:', responseData.message);
        toast.error(responseData.message || 'Error al actualizar el producto');
      }
    } catch (error) {
      console.error('💥 AdminEditProduct - Error en handleSubmit:', error);
      console.error('💥 AdminEditProduct - Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      toast.error('Error al actualizar el producto');
    } finally {
      console.log('🏁 AdminEditProduct - handleSubmit finalizado');
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(SummaryApi.deleteProduct.url, {
        method: SummaryApi.deleteProduct.method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ productId: data._id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Producto eliminado correctamente');
        if (fetchdata) fetchdata();
        onClose();
      } else {
        toast.error(result.message || 'Error al eliminar el producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreviewProduct = () => {
    if (data.slug) {
      // Abrir en una nueva pestaña
      window.open(`/producto/${data.slug}`, '_blank');
    } else if (data._id) {
      // Fallback al ID si no hay slug
      window.open(`/producto/${data._id}`, '_blank');
    } else {
      toast.error('No se puede generar la vista previa del producto');
    }
  };

  const suggestedPrice = calculateSuggestedPrice(
    Number(data.purchasePriceUSD) || 0,
    Number(data.exchangeRate) || 7300,
    Number(data.loanInterest) || 0,
    Number(data.deliveryCost) || 0,
    Number(data.profitMargin) || 0
  );

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Editar Producto</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow">
          <form onSubmit={handleSubmit} className="space-y-8">
            
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
                      console.log('🔍 AdminEditProduct - Categorías para select:', categoriesForSelect);
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
                      console.log('🔍 AdminEditProduct - Subcategorías para select:', {
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
                    placeholder="Ej: INF-6073"
                  />
                  {validationErrors.codigo && <p className="text-red-600 text-sm mt-1">{validationErrors.codigo}</p>}
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="isVipOffer"
                    checked={data.isVipOffer}
                    onChange={handleOnChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Oferta VIP</label>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea
                  name="description"
                  value={data.description}
                  onChange={handleOnChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingrese la descripción del producto"
                />
                {validationErrors.description && <p className="text-red-600 text-sm mt-1">{validationErrors.description}</p>}
              </div>
            </div>

            {/* Imágenes */}
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaImage className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-800">Imágenes del Producto</h3>
              </div>
              
              <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                {data.productImage.map((img, index) => (
                  <div key={index} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={img}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => { setFullScreenImage(img); setOpenFullScreenImage(true); }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
                <label htmlFor="uploadImage" className="cursor-pointer w-24 h-24 flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-green-400 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                  <FaUpload className="w-6 h-6" />
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia (%)</label>
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

              {/* Precio Sugerido */}
              <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Precio de Venta Sugerido</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {suggestedPrice.toLocaleString()} Gs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseSuggestedPrice}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    disabled={suggestedPrice <= 0}
                  >
                    Usar Precio
                  </button>
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
                  />
                  <p className="text-xs text-gray-500 mt-1">Para mostrar precio tachado en descuentos</p>
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
                    required
                  />
                  {validationErrors.sellingPrice && <p className="text-red-600 text-sm mt-1">{validationErrors.sellingPrice}</p>}
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

            {/* Inventario */}
            <div className="bg-indigo-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <FaInfoCircle className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-indigo-800">Inventario</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={data.stock}
                    onChange={handleOnChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="isVipOffer"
                    checked={data.isVipOffer}
                    onChange={handleOnChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Oferta VIP</label>
                </div>
              </div>
            </div>

            {/* Especificaciones */}
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
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handlePreviewProduct}
              className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaEye className="w-4 h-4 mr-2" />
              Vista Previa
            </button>
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <FaTrash className="w-4 h-4 mr-2" />
                  Eliminar Producto
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <FaSave className="w-4 h-4 mr-2" />
                  Actualizar Producto
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de imagen completa */}
      {openFullScreenImage && (
        <DisplayImage
          imgUrl={fullScreenImage}
          onClose={() => setOpenFullScreenImage(false)}
        />
      )}
    </div>
  );
};

export default AdminEditProduct;
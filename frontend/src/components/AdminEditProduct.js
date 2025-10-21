import React, { useState, useEffect, useCallback, useRef } from 'react';
import DynamicProductSpecifications from './DynamicProductSpecifications';
import SummaryApi from '../common';
import { 
  FaUpload, FaSave, FaTimes, FaImage, FaFileAlt, FaDollarSign,
  FaInfoCircle, FaEye, FaEyeSlash, FaTrash, FaSync,
  FaLink, FaExternalLinkAlt, FaExclamationTriangle, FaExclamationCircle,
  FaPaste, FaMousePointer, FaFolderOpen, FaCheck, FaSpinner, FaCopy
} from "react-icons/fa";
import useCategories from '../hooks/useCategories';
import uploadImage from '../helpers/uploadImage';
import { 
  optimizeMultipleImages, 
  extractImagesFromClipboard, 
  isValidImageFile, 
  validateFileSize,
  getOptimizationStats 
} from '../helpers/imageOptimizer';
import DisplayImage from './DisplayImage';
import { toast } from 'react-toastify';

const AdminEditProduct = ({ onClose, productData, fetchdata, extraData }) => {
  const { getSubcategoriesByCategory, getCategoriesForSelect, getSpecificationsBySubcategory, categories, loading: categoriesLoading } = useCategories();
  
  // Referencias
  const fileInputRef = useRef(null);
  const imageAreaRef = useRef(null);
  
  // Estados para el sistema de imágenes
  const [isPasteActive, setIsPasteActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [showInstructions, setShowInstructions] = useState(false); // Cambiado a false por defecto
  const [syncData, setSyncData] = useState(extraData || null);
  
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
    if (!productData || !category || !subcategory) {
      console.log('⚠️ AdminEditProduct - Datos insuficientes para mapear especificaciones:', {
        hasProductData: !!productData,
        category,
        subcategory
      });
      return {};
    }
    
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
      const value = productData[fieldName] || '';
      mappedSpecs[fieldName] = value;
      
      if (value) {
        console.log(`✅ Mapeado ${fieldName}: "${value}"`);
      }
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
    // Campos del proveedor
    documentationLink: '',
    imageUrlFromProvider: '',
    importMode: false,
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

  // Cargar datos de sincronización si vienen del módulo de sincronización
  useEffect(() => {
    if (extraData) {
      // console.log removed for production
      setSyncData(extraData);
      
      // Si viene URL del proveedor, agregarla
      if (extraData.productUrl) {
        setData(prev => ({
          ...prev,
          documentationLink: extraData.productUrl
        }));
      }
    }
  }, [extraData]);

  // Cargar datos del producto al montar
  useEffect(() => {
    if (productData) {
      // console.log removed for production
      
      setData({
        productName: productData.productName || '',
        brandName: productData.brandName || '',
        category: productData.category || '',
        subcategory: productData.subcategory || '',
        productImage: normalizeImages(productData.productImage || []),
        description: productData.description || '',
        price: productData.price || 0,
        sellingPrice: productData.sellingPrice || 0,
        stock: productData.stock || 0,
        isVipOffer: productData.isVipOffer || false,
        specifications: {}, // Inicializar vacío, se llenará después
        codigo: productData.codigo || '',
        documentationLink: productData.documentationLink || '',
        imageUrlFromProvider: productData.imageUrlFromProvider || '',
        importMode: false,
        purchasePriceUSD: productData.purchasePriceUSD || 0,
        exchangeRate: productData.exchangeRate || 7300,
        loanInterest: productData.loanInterest || 0,
        deliveryCost: productData.deliveryCost || 30000,
        profitMargin: productData.profitMargin || 20,
        purchasePrice: productData.purchasePrice || 0,
        profitAmount: productData.profitAmount || 0
      });
    }
  }, [productData]);

  // Mapear especificaciones cuando las categorías estén cargadas
  useEffect(() => {
    if (productData && !categoriesLoading && categories.length > 0 && data.category && data.subcategory) {
      console.log('🔍 AdminEditProduct - Mapeando especificaciones después de cargar categorías');
      const mappedSpecs = mapProductSpecifications(productData, data.category, data.subcategory);
      
      setData(prevData => ({
        ...prevData,
        specifications: mappedSpecs
      }));
    }
  }, [productData, categories, categoriesLoading, data.category, data.subcategory]);

  // Event listeners para paste y drag & drop
  useEffect(() => {
    const handlePaste = (e) => {
      // ✅ SOLO PROCESAR PASTE SI ESTÁ ACTIVO Y NO ES EN UN INPUT DE TEXTO
      if (!isPasteActive) return;
      
      // ✅ VERIFICAR SI EL TARGET ES UN INPUT DE TEXTO O TEXTAREA
      const target = e.target;
      const isTextInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true'
      );
      
      if (isTextInput) {
        // console.log removed for production
        return; // No procesar paste de imágenes en inputs de texto
      }
      
      // console.log removed for production
      e.preventDefault();
      
      const clipboardData = e.clipboardData;
      if (clipboardData && clipboardData.items) {
        handleClipboardImages(clipboardData);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);
      
      if (isProcessingImages) return;
      
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => isValidImageFile(file));
      
      if (imageFiles.length > 0) {
        handleImageFiles(imageFiles);
      }
    };

    // Agregar listeners
    document.addEventListener('paste', handlePaste);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isPasteActive, isProcessingImages]);

  // Activar paste automáticamente al abrir el modal
  useEffect(() => {
    if (imageAreaRef.current) {
      setIsPasteActive(true);
      imageAreaRef.current.focus();
    }
  }, []);

  // Función para manejar imágenes del portapapeles
  const handleClipboardImages = async (clipboardData) => {
    try {
      // console.log removed for production
      const imageFiles = await extractImagesFromClipboard(clipboardData);
      
      if (imageFiles.length === 0) {
        toast.info('No se encontraron imágenes en el portapapeles');
        return;
      }
      
      // console.log removed for production
      await handleImageFiles(imageFiles);
      
    } catch (error) {
      // console.error removed for production
      toast.error('Error al procesar imágenes del portapapeles');
    }
  };

  // Función para manejar archivos de imagen (paste, drag & drop, upload)
  const handleImageFiles = async (files) => {
    if (isProcessingImages) return;
    
    const maxImages = 10;
    const currentCount = data.productImage.length;
    const availableSlots = maxImages - currentCount;
    
    if (availableSlots <= 0) {
      toast.warning(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }
    
    // Tomar solo las imágenes que caben
    const filesToProcess = files.slice(0, availableSlots);
    
    if (files.length > availableSlots) {
      toast.warning(`Solo se procesarán ${availableSlots} imágenes (máximo ${maxImages} permitidas)`);
    }
    
    setIsProcessingImages(true);
    setProcessingProgress({ current: 0, total: filesToProcess.length, fileName: '' });
    
    try {
      // console.log removed for production
      
      // Optimizar imágenes
      const optimizationResults = await optimizeMultipleImages(
        filesToProcess,
        {},
        (current, total, fileName) => {
          setProcessingProgress({ current, total, fileName, stage: 'optimizing' });
        }
      );
      
      // console.log removed for production
      
      // Subir imágenes optimizadas
      const uploadPromises = optimizationResults.map(async (result, index) => {
        setProcessingProgress({ 
          current: index + 1, 
          total: optimizationResults.length, 
          fileName: result.file.name,
          stage: 'uploading'
        });
        
        try {
          const uploadResult = await uploadImage(result.file);
          return uploadResult.url;
        } catch (error) {
          // console.error removed for production
          return null;
        }
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter(url => url !== null);
      
      // Actualizar estado
      setData(prev => ({
        ...prev,
        productImage: [...prev.productImage, ...successfulUrls]
      }));
      
      // Estadísticas
      const stats = getOptimizationStats(optimizationResults);
      const successful = optimizationResults.filter(r => r.success).length;
      
      if (successful > 0) {
        toast.success(
          `✅ ${successful} imágenes cargadas y optimizadas ✨\n` +
          `📊 Reducción promedio: ${stats.averageReduction}%`
        );
      }
      
      if (stats.failed > 0) {
        toast.warning(`${stats.failed} imágenes no se pudieron optimizar`);
      }
      
      // Ocultar instrucciones después del primer uso exitoso
      if (showInstructions) {
        setShowInstructions(false);
      }
      
    } catch (error) {
      // console.error removed for production
      toast.error('Error al procesar las imágenes');
    } finally {
      setIsProcessingImages(false);
      setProcessingProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  // Función para manejar selección de archivos tradicional
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => isValidImageFile(file));
    
    if (imageFiles.length > 0) {
      handleImageFiles(imageFiles);
    } else {
      toast.warning('Por favor selecciona archivos de imagen válidos');
    }
    
    // Limpiar input
    e.target.value = '';
  };

  // Función para eliminar imagen
  const handleRemoveImage = (index) => {
    setData(prev => ({
      ...prev,
      productImage: prev.productImage.filter((_, i) => i !== index)
    }));
  };

  // Función para mostrar imagen en pantalla completa
  const handleShowFullImage = (imageUrl) => {
    setFullScreenImage(imageUrl);
    setOpenFullScreenImage(true);
  };

  // Función para copiar al portapapeles
  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado al portapapeles');
    } catch (error) {
      // console.error removed for production
      toast.error('Error al copiar');
    }
  };

  // Resto de las funciones existentes...
  const handleOnChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSpecificationChange = (updatedSpecs) => {
    setData(prev => ({
      ...prev,
      specifications: updatedSpecs
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!data.productName.trim()) errors.productName = 'El nombre del producto es requerido';
    if (!data.brandName.trim()) errors.brandName = 'La marca es requerida';
    if (!data.category) errors.category = 'La categoría es requerida';
    if (!data.subcategory) errors.subcategory = 'La subcategoría es requerida';
    if (!data.description.trim()) errors.description = 'La descripción es requerida';
    if (!data.codigo.trim()) errors.codigo = 'El código es requerido';
    if (data.productImage.length === 0) errors.productImage = 'Debe cargar al menos una imagen del producto';
    if (!data.sellingPrice || data.sellingPrice <= 0) {
      errors.sellingPrice = 'El precio de venta debe ser mayor a 0';
    }
    if (!data.stock || data.stock < 0) {
      errors.stock = 'El stock debe ser mayor o igual a 0';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const productDataToSend = {
        _id: productData._id, // ✅ INCLUIR ID DEL PRODUCTO
        ...data,
        ...data.specifications
      };
      
      console.log('🚀 Enviando datos a:', SummaryApi.updateProduct.url);
      console.log('📦 Datos del producto:', {
        _id: productData._id,
        productName: data.productName,
        codigo: data.codigo,
        price: data.price,
        sellingPrice: data.sellingPrice,
        hasImages: data.productImage.length > 0,
        specifications: data.specifications
      });
      
      const response = await fetch(SummaryApi.updateProduct.url, {
        method: SummaryApi.updateProduct.method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productDataToSend)
      });
      
      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      const result = await response.json();
      console.log('📄 Resultado completo:', result);
      
      if (result.success) {
        toast.success('Producto actualizado exitosamente');
        if (fetchdata) fetchdata();
        onClose();
      } else {
        console.error('❌ Error del servidor:', result);
        toast.error(result.message || 'Error al actualizar producto');
      }
      
    } catch (error) {
      // console.error removed for production
      toast.error('Error al actualizar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(SummaryApi.deleteProduct.url, {
        method: SummaryApi.deleteProduct.method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: productData._id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Producto eliminado exitosamente');
        if (fetchdata) fetchdata();
        onClose();
      } else {
        toast.error(result.message || 'Error al eliminar producto');
      }
      
    } catch (error) {
      // console.error removed for production
      toast.error('Error al eliminar el producto');
    } finally {
      setIsDeleting(false);
    }
  };

  // Función para cargar tipo de cambio
  const loadExchangeRate = async () => {
    setIsLoadingExchangeRate(true);
    try {
      const response = await fetch('/api/admin/exchange-rate', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success && result.data && result.data.value) {
        setCurrentExchangeRate(result.data.value);
        setData(prev => ({
          ...prev,
          exchangeRate: result.data.value
        }));
      }
    } catch (error) {
      // console.error removed for production
    } finally {
      setIsLoadingExchangeRate(false);
    }
  };

  // Función para calcular precio automáticamente
  const calculatePrice = () => {
    const purchasePriceUSD = parseFloat(data.purchasePriceUSD) || 0;
    const exchangeRate = parseFloat(data.exchangeRate) || 7300;
    const deliveryCost = parseFloat(data.deliveryCost) || 30000;
    const profitMargin = parseFloat(data.profitMargin) || 20;
    
    if (purchasePriceUSD > 0) {
      const purchasePrice = purchasePriceUSD * exchangeRate;
      const totalCost = purchasePrice + deliveryCost;
      const sellingPrice = Math.round(totalCost / (1 - (profitMargin / 100)));
      
      setData(prev => ({
        ...prev,
        purchasePrice: Math.round(purchasePrice),
        sellingPrice: sellingPrice,
        profitAmount: sellingPrice - totalCost
      }));
    }
  };

  // Calcular precio cuando cambien los valores
  useEffect(() => {
    calculatePrice();
  }, [data.purchasePriceUSD, data.exchangeRate, data.deliveryCost, data.profitMargin]);

  // Cargar tipo de cambio al montar
  useEffect(() => {
    loadExchangeRate();
  }, []);

  const getImageCountStatus = () => {
    const count = data.productImage.length;
    if (count >= 10) return { color: 'text-red-600', bg: 'bg-red-100' };
    if (count >= 8) return { color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { color: 'text-green-600', bg: 'bg-green-100' };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Editar Producto</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Instrucciones simplificadas */}
          {showInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
              >
                <FaTimes />
              </button>
              
              <div className="flex items-start space-x-3">
                <FaInfoCircle className="text-blue-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">💡 Tip rápido</h3>
                  <p className="text-sm text-blue-700">
                    Copia imágenes desde cualquier lugar y presiona <kbd className="bg-blue-100 px-2 py-1 rounded">Ctrl+V</kbd> aquí para pegarlas automáticamente.
                    También puedes arrastrar archivos o hacer click en "Subir Imágenes".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alertas de sincronización */}
          {syncData?.priceComparison && (
            <div className="mx-6 mt-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
              <div className="flex items-start">
                <FaExclamationTriangle className="w-6 h-6 text-orange-500 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">
                    ⚠️ Cambio de Precio Detectado
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-600 font-medium mb-1">Precio Actual (Sistema)</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${syncData.priceComparison.currentPrice.toFixed(2)} USD
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-600 font-medium mb-1">Precio Nuevo (Proveedor)</p>
                      <p className="text-xl font-bold text-green-700">
                        ${syncData.priceComparison.providerPrice.toFixed(2)} USD
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-600 font-medium mb-1">Diferencia</p>
                      <p className={`text-xl font-bold ${
                        syncData.priceComparison.hasIncrease ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {syncData.priceComparison.hasIncrease ? '+' : ''}${syncData.priceComparison.difference.toFixed(2)} USD
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ({syncData.priceComparison.hasIncrease ? '+' : ''}{syncData.priceComparison.percentageChange}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newPriceUSD = syncData.priceComparison.providerPrice;
                        const exchangeRate = parseFloat(data.exchangeRate) || 7300;
                        const deliveryCost = parseFloat(data.deliveryCost) || 30000;
                        const profitMargin = parseFloat(data.profitMargin) || 20;
                        
                        const purchasePrice = newPriceUSD * exchangeRate;
                        const totalCost = purchasePrice + deliveryCost;
                        const newSellingPrice = Math.round(totalCost / (1 - (profitMargin / 100)));
                        
                        setData(prev => ({
                          ...prev,
                          purchasePriceUSD: newPriceUSD.toString(),
                          sellingPrice: newSellingPrice.toString(),
                          price: prev.sellingPrice || '0'
                        }));
                        
                        setSyncData(prev => prev ? { ...prev, priceComparison: null } : null);
                        toast.success(`Precio actualizado a $${newPriceUSD} USD (Venta: ${newSellingPrice.toLocaleString()} Gs)`);
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                    >
                      <FaSync className="w-4 h-4" />
                      Actualizar al Precio del Proveedor
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(data.documentationLink, '_blank')}
                      disabled={!data.documentationLink}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <FaExternalLinkAlt className="w-4 h-4" />
                      Ver en Sitio del Proveedor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Área de Imágenes Mejorada - Estilo WhatsApp */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Imágenes del Producto
              </label>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getImageCountStatus().bg} ${getImageCountStatus().color}`}>
                {data.productImage.length} / 10
              </div>
            </div>

            {/* Input estilo chat */}
            <div 
              className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={(e) => {
                // ✅ SOLO ACTIVAR PASTE SI NO SE HIZO CLIC EN UN INPUT DE TEXTO
                const target = e.target;
                const isTextInput = target && (
                  target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.contentEditable === 'true'
                );
                
                if (!isTextInput) {
                  setIsPasteActive(true);
                  if (imageAreaRef.current) {
                    imageAreaRef.current.focus();
                  }
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <FaImage className="w-6 h-6 text-gray-400" />
                </div>
                <div 
                  ref={imageAreaRef}
                  tabIndex={0}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                  contentEditable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPasteActive(true);
                    if (imageAreaRef.current) {
                      imageAreaRef.current.focus();
                    }
                  }}
                >
                  <span className="text-gray-500">
                    {isPasteActive 
                      ? 'Pega imágenes aquí (Ctrl+V) o arrastra archivos...' 
                      : 'Haz clic para pegar imágenes...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FaFolderOpen />
                  <span>Seleccionar</span>
                </button>
              </div>
            </div>

            {/* Grid de imágenes existente */}
            {data.productImage.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {data.productImage.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={image}
                        alt={`Producto ${index + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => handleShowFullImage(image)}
                      />
                    </div>
                    
                    {/* Número de orden */}
                    <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {index + 1}
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowFullImage(image);
                          }}
                          className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full text-gray-700 hover:text-red-600 transition-colors"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input oculto para selección de archivos */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {validationErrors.productImage && (
              <p className="text-red-600 text-sm">{validationErrors.productImage}</p>
            )}
          </div>

          {/* Resto del formulario... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Información Básica</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={data.productName}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Monitor Gamer MSI"
                />
                {validationErrors.productName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.productName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  name="brandName"
                  value={data.brandName}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: MSI"
                />
                {validationErrors.brandName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.brandName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={data.codigo}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 54460"
                />
                {validationErrors.codigo && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.codigo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  name="category"
                  value={data.category}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar categoría</option>
                  {getCategoriesForSelect().map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategoría *
                </label>
                <select
                  name="subcategory"
                  value={data.subcategory}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!data.category}
                >
                  <option value="">Seleccionar subcategoría</option>
                  {data.category && getSubcategoriesByCategory(data.category).map(sub => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
                {validationErrors.subcategory && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.subcategory}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  name="description"
                  value={data.description}
                  onChange={handleOnChange}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe el producto..."
                />
                {validationErrors.description && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.description}</p>
                )}
              </div>

              {/* Campo de URL del producto con botón de copiar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL del Producto (Proveedor)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    name="documentationLink"
                    value={data.documentationLink}
                    onChange={handleOnChange}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.visaovip.com/produto/..."
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(data.documentationLink)}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    title="Copiar URL"
                  >
                    <FaCopy />
                  </button>
                  {data.documentationLink && (
                    <button
                      type="button"
                      onClick={() => window.open(data.documentationLink, '_blank')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      title="Abrir en nueva pestaña"
                    >
                      <FaExternalLinkAlt />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Información Financiera */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Información Financiera</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de Compra (USD) *
                </label>
                <input
                  type="number"
                  name="purchasePriceUSD"
                  value={data.purchasePriceUSD}
                  onChange={handleOnChange}
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cambio
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="exchangeRate"
                    value={data.exchangeRate}
                    onChange={handleOnChange}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="7300"
                  />
                  <button
                    type="button"
                    onClick={loadExchangeRate}
                    disabled={isLoadingExchangeRate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingExchangeRate ? <FaSpinner className="animate-spin" /> : <FaSync />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo de Envío (PYG)
                </label>
                <input
                  type="number"
                  name="deliveryCost"
                  value={data.deliveryCost}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="30000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margen de Ganancia (%)
                </label>
                <input
                  type="number"
                  name="profitMargin"
                  value={data.profitMargin}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Anterior (PYG) 
                  <span className="text-xs text-gray-500 ml-2">
                    (Opcional - Para mostrar descuentos)
                  </span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={data.price || 0}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si es 0, no se mostrará descuento. Si es mayor al precio de venta, se mostrará el % de descuento.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de Venta (PYG) *
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={data.sellingPrice}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                {validationErrors.sellingPrice && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.sellingPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={data.stock}
                  onChange={handleOnChange}
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                {validationErrors.stock && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.stock}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isVipOffer"
                  checked={data.isVipOffer}
                  onChange={handleOnChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Oferta VIP
                </label>
              </div>
            </div>
          </div>

          {/* Especificaciones Dinámicas */}
          {data.category && data.subcategory && (
            <DynamicProductSpecifications
              category={data.category}
              subcategory={data.subcategory}
              specifications={data.specifications}
              onSpecificationsChange={handleSpecificationChange}
            />
          )}

          {/* Botones */}
          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <FaTrash />
                  <span>Eliminar Producto</span>
                </>
              )}
            </button>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isProcessingImages}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <FaSave />
                    <span>Actualizar Producto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de imagen en pantalla completa */}
      {openFullScreenImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setOpenFullScreenImage(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
            >
              <FaTimes />
            </button>
            <img
              src={fullScreenImage}
              alt="Imagen del producto"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEditProduct;
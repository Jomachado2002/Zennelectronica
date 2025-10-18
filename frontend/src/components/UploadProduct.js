import React, { useState, useEffect, useCallback, useRef } from 'react';
import DynamicProductSpecifications from './DynamicProductSpecifications';
import SummaryApi from '../common';
import { 
  FaUpload, FaSave, FaTimes, FaImage, FaFileAlt, FaDollarSign,
  FaInfoCircle, FaEye, FaEyeSlash, FaTrash, FaSync, FaBox,
  FaLink, FaExternalLinkAlt, FaPaste, FaMousePointer, FaFolderOpen,
  FaCheck, FaExclamationTriangle, FaSpinner, FaCopy
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

const UploadProduct = ({ onClose, fetchData, preloadedData }) => {
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
  const [imagePreview, setImagePreview] = useState(null);
  const [imageSource, setImageSource] = useState('manual');
  
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
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState(7300);

  // Cargar datos precargados si existen
  useEffect(() => {
    if (preloadedData) {
      console.log('📥 UploadProduct - Recibiendo preloadedData:', preloadedData);
      console.log('🔢 Código recibido:', preloadedData.productCode, preloadedData.codigo);
      
      setData(prev => ({
        ...prev,
        ...preloadedData,
        // MAPEO EXPLÍCITO del código
        codigo: preloadedData.codigo || preloadedData.productCode || ''
      }));
      
      // IMPORTANTE: Establecer preview de imagen si viene del CSV
      if (preloadedData.imageUrlFromProvider) {
        console.log('🖼️ Estableciendo preview de imagen del CSV');
        console.log('🖼️ URL:', preloadedData.imageUrlFromProvider);
        setImagePreview(preloadedData.imageUrlFromProvider);
        setImageSource('csv');
      }
      
      console.log('✅ Datos establecidos en el estado');
      console.log('🔢 Código en estado:', preloadedData.codigo || preloadedData.productCode);
    }
  }, [preloadedData]);

  // Agregar log adicional cuando el estado cambia
  useEffect(() => {
    console.log('🔍 Estado "data" actualizado:');
    console.log(' - productName:', data.productName);
    console.log(' - codigo:', data.codigo);
    console.log(' - category:', data.category);
  }, [data]);

  // Event listeners para paste y drag & drop
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isPasteActive) return;
      
      console.log('📋 Paste detectado en UploadProduct');
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
      console.log('📋 Procesando imágenes del portapapeles...');
      const imageFiles = await extractImagesFromClipboard(clipboardData);
      
      if (imageFiles.length === 0) {
        toast.info('No se encontraron imágenes en el portapapeles');
        return;
      }
      
      console.log(`📊 ${imageFiles.length} imágenes encontradas en el portapapeles`);
      await handleImageFiles(imageFiles);
      
    } catch (error) {
      console.error('❌ Error procesando portapapeles:', error);
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
      console.log(`🖼️ Procesando ${filesToProcess.length} imágenes...`);
      
      // Optimizar imágenes
      const optimizationResults = await optimizeMultipleImages(
        filesToProcess,
        {},
        (current, total, fileName) => {
          setProcessingProgress({ current, total, fileName, stage: 'optimizing' });
        }
      );
      
      console.log('✅ Optimización completada, iniciando subida...');
      
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
          console.error(`❌ Error subiendo ${result.file.name}:`, error);
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
      console.error('❌ Error procesando imágenes:', error);
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
      console.error('Error copiando:', error);
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
    
    // Validación de imágenes: permitir si hay imágenes manuales O si hay imagen del CSV
    if (data.productImage.length === 0 && !imagePreview) {
      errors.productImage = 'Debe cargar al menos una imagen del producto';
    }
    
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
      let finalProductImages = [...data.productImage];
      
      // Si hay imagen del CSV y no hay imágenes manuales cargadas
      if (imageSource === 'csv' && preloadedData?.imageUrlFromProvider && finalProductImages.length === 0) {
        console.log('📥 Descargando e importando imagen del CSV...');
        console.log('📥 URL:', preloadedData.imageUrlFromProvider);
        
        try {
          // Llamar al endpoint que descarga y sube la imagen
          const imageResponse = await fetch('/api/admin/inventory-sync/import-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              imageUrl: preloadedData.imageUrlFromProvider,
              productCode: data.codigo
            })
          });
          
          const imageResult = await imageResponse.json();
          if (imageResult.success) {
            console.log('✅ Imagen importada:', imageResult.firebaseUrl);
            finalProductImages = [imageResult.firebaseUrl];
          } else {
            console.warn('⚠️ No se pudo importar la imagen:', imageResult.error);
            toast.warning('Producto creado sin imagen (error al importarla)');
          }
        } catch (imageError) {
          console.error('❌ Error importando imagen:', imageError);
          toast.warning('Producto se creará sin imagen');
        }
      }
      
      // Crear producto
      const productDataToSend = {
        ...data,
        productImage: finalProductImages,
        ...data.specifications
      };
      
      console.log('📤 Enviando producto:', productDataToSend);
      
      const response = await fetch('http://localhost:8080/api/cargar-producto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productDataToSend)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Producto creado exitosamente');
        if (fetchData) fetchData();
        onClose();
      } else {
        toast.error(result.message || 'Error al crear producto');
      }
      
    } catch (error) {
      console.error('💥 Error:', error);
      toast.error('Error al crear el producto');
    } finally {
      setIsSubmitting(false);
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
      console.error('Error cargando tipo de cambio:', error);
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
          <h2 className="text-2xl font-bold text-gray-800">
            {preloadedData ? 'Cargar Producto' : 'Subir Producto'}
          </h2>
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

          {/* Preview de Imagen del Proveedor */}
          {imageSource === 'csv' && imagePreview && (
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center mb-3">
                <FaImage className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-800">Imagen del Proveedor</h4>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img 
                    src={imagePreview} 
                    alt="Preview del proveedor" 
                    className="w-32 h-32 object-cover rounded-lg border-2 border-blue-300 shadow-sm"
                    onError={(e) => {
                      console.error('❌ Error cargando preview de imagen');
                      console.error('❌ URL que falló:', imagePreview);
                      e.target.src = 'https://via.placeholder.com/150?text=Error';
                    }}
                    onLoad={() => {
                      console.log('✅ Preview de imagen cargado exitosamente');
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-3">
                    Esta imagen se descargará automáticamente del proveedor y se subirá a nuestro servidor al guardar el producto.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔗 Abriendo imagen original');
                        window.open(imagePreview, '_blank');
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      🔗 Ver Imagen Original
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('❌ Cambiando a upload manual');
                        setImageSource('manual');
                        setImagePreview(null);
                      }}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                    >
                      ❌ Usar Otra Imagen
                    </button>
                    {data.documentationLink && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('📄 Abriendo página del producto');
                          window.open(data.documentationLink, '_blank');
                        }}
                        className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                      >
                        📄 Ver Producto en Sitio
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Área de Imágenes Simplificada */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Imágenes del Producto
              </label>
              <div className="flex items-center space-x-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getImageCountStatus().bg} ${getImageCountStatus().color}`}>
                  {data.productImage.length} / 10
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  💡 Ayuda
                </button>
              </div>
            </div>

            {/* Área de Paste y Drag & Drop Simplificada */}
            <div
              ref={imageAreaRef}
              tabIndex={0}
              onClick={() => {
                if (isPasteActive) {
                  fileInputRef.current?.click();
                } else {
                  setIsPasteActive(true);
                  if (imageAreaRef.current) {
                    imageAreaRef.current.focus();
                  }
                }
              }}
              onFocus={() => setIsPasteActive(true)}
              onBlur={() => setIsPasteActive(false)}
              className={`
                relative min-h-[150px] border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200
                ${isPasteActive ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
                ${isDragOver ? 'border-blue-400 bg-blue-50' : ''}
                ${isProcessingImages ? 'pointer-events-none opacity-75' : ''}
              `}
            >
              {/* Grid de Imágenes */}
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
                
                {/* Botón de subir (solo si hay espacio) */}
                {data.productImage.length < 10 && (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <FaUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-xs text-gray-500">Subir Imágenes</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instrucciones cuando no hay imágenes */}
              {data.productImage.length === 0 && (
                <div className="text-center py-8">
                  <FaImage className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {isPasteActive ? 'Presiona Ctrl+V para pegar imágenes' : 'Haz click para activar el modo paste'}
                  </p>
                  <p className="text-sm text-gray-400">
                    O arrastra archivos aquí, o haz click para seleccionar
                  </p>
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
            </div>

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
                  value={data.codigo || ''}
                  onChange={handleOnChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 54460"
                  readOnly={data.importMode}
                />
                {data.importMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    Debug - Valor actual: "{data.codigo}" | Import Mode: SÍ
                  </p>
                )}
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
          <div className="flex justify-end space-x-4 pt-6 border-t">
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
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Crear Producto</span>
                </>
              )}
            </button>
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

export default UploadProduct;
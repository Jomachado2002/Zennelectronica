import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Circle, Transformer, Group } from 'react-konva';
import { 
  FaImage, FaTextHeight, FaSquare, FaCircle, FaSave, 
  FaDownload, FaLayerGroup, FaTrash, FaPlus, FaSearchPlus,
  FaSearchMinus, FaChevronLeft, FaChevronRight,
  FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import useCategories from '../hooks/useCategories';

const CANVAS_SIZE = {
  width: 2400,
  height: 2400
};

const ImageEditorPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Editor state
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  
  // Canvas controls
  const [canvasScale, setCanvasScale] = useState(0.5);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const layerRefs = useRef({});
  const containerRef = useRef(null);
  
  const { getSubcategoriesByCategory, getCategoriesForSelect, categories } = useCategories();

  // Calcular escala automática del canvas
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 100;
      const containerHeight = container.clientHeight - 100;
      
      const scaleX = containerWidth / CANVAS_SIZE.width;
      const scaleY = containerHeight / CANVAS_SIZE.height;
      const newScale = Math.min(scaleX, scaleY, 1) * 0.9;
      
      setCanvasScale(Math.max(0.1, Math.min(1, newScale)));
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // Cargar productos
  const loadProducts = useCallback(async () => {
    if (!selectedCategory || !selectedSubcategory) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${SummaryApi.baseURL}/api/catalog-products?category=${selectedCategory}&subcategory=${selectedSubcategory}`
      );
      const data = await response.json();
      
      if (data.success && data.data) {
        const allProducts = [];
        data.data.forEach(cat => {
          cat.subcategorias?.forEach(sub => {
            sub.productos?.forEach(prod => {
              allProducts.push({
                _id: prod.id,
                productName: prod.titulo,
                brandName: prod.marca,
                price: prod.precio,
                sellingPrice: prod.precio,
                stock: prod.stock,
                productImage: prod.imagen_url ? [prod.imagen_url] : [],
                slug: prod.slug,
                category: selectedCategory,
                subcategory: selectedSubcategory
              });
            });
          });
        });
        
        setProducts(allProducts);
        if (allProducts.length > 0 && !selectedProduct) {
          setSelectedProduct(allProducts[0]);
          setSelectedProductIndex(0);
        }
        toast.success(`${allProducts.length} productos cargados`);
      } else {
        const altResponse = await fetch(
          `${SummaryApi.baseURL}/api/productos-por-categoria`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: selectedCategory, subcategory: selectedSubcategory })
          }
        );
        const altData = await altResponse.json();
        
        if (altData.success && altData.data) {
          const productsWithStock = altData.data.filter(p => (p.stock || 0) > 0);
          setProducts(productsWithStock);
          if (productsWithStock.length > 0 && !selectedProduct) {
            setSelectedProduct(productsWithStock[0]);
            setSelectedProductIndex(0);
          }
          toast.success(`${productsWithStock.length} productos cargados`);
        }
      }
    } catch (error) {
      toast.error('Error cargando productos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSubcategory, selectedProduct]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Actualizar textos dinámicos
  useEffect(() => {
    if (selectedProduct && layers.length > 0) {
      setLayers(prev => prev.map(layer => {
        if (layer.type === 'text' && layer.dynamicField) {
          let text = '';
          switch (layer.dynamicField) {
            case 'productName':
              text = selectedProduct.productName || '';
              break;
            case 'price':
              text = `Gs. ${(selectedProduct.sellingPrice || selectedProduct.price || 0).toLocaleString()}`;
              break;
            case 'brand':
              text = selectedProduct.brandName || '';
              break;
            case 'stock':
              text = `Stock: ${selectedProduct.stock || 0}`;
              break;
            default:
              text = layer.text || '';
          }
          return { ...layer, text };
        }
        return layer;
      }));
    }
  }, [selectedProduct, layers.length]);

  // Cargar imagen de fondo
  const handleLoadBackground = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const bgLayer = {
          id: `layer-bg-${Date.now()}`,
          type: 'background',
          image: img,
          zIndex: 0,
          locked: true,
          visible: true
        };
        setLayers(prev => [bgLayer, ...prev.filter(l => l.type !== 'background')]);
        toast.success('Fondo cargado');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Cambiar producto
  const handleProductChange = (product, index) => {
    setSelectedProduct(product);
    setSelectedProductIndex(0);
    
    // Actualizar imagen en todos los contenedores
    const productContainers = layers.filter(l => l.type === 'productContainer');
    productContainers.forEach(container => {
      loadImageInContainer(container.id, product, 0);
    });
  };

  // Cargar imagen en contenedor
  const loadImageInContainer = useCallback((containerId, product, imageIndex = 0) => {
    if (!product || !product.productImage || product.productImage.length === 0) {
      return;
    }

    const imageUrl = product.productImage[imageIndex] || product.productImage[0];
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLayers(prev => prev.map(l => 
        l.id === containerId && l.type === 'productContainer'
          ? { ...l, image: img, productId: product._id, imageIndex: imageIndex }
          : l
      ));
    };
    img.onerror = () => {
      toast.error('Error cargando imagen');
    };
    img.src = imageUrl;
  }, []);

  // Cambiar imagen del producto en contenedor
  const handleChangeProductImage = (direction) => {
    if (!selectedProduct || !selectedProduct.productImage || selectedProduct.productImage.length === 0) return;
    if (!selectedLayerId) {
      toast.warning('Selecciona un contenedor primero');
      return;
    }
    
    const container = layers.find(l => l.id === selectedLayerId && l.type === 'productContainer');
    if (!container) {
      toast.warning('Selecciona un contenedor de producto');
      return;
    }
    
    let newIndex = container.imageIndex || 0;
    if (direction === 'next') {
      newIndex = (newIndex + 1) % selectedProduct.productImage.length;
    } else {
      newIndex = newIndex - 1;
      if (newIndex < 0) newIndex = selectedProduct.productImage.length - 1;
    }
    
    loadImageInContainer(selectedLayerId, selectedProduct, newIndex);
  };

  // Crear contenedor de producto
  const handleCreateProductContainer = () => {
    const maxZIndex = Math.max(...layers.map(l => l.zIndex || 0), 0);
    const containerLayer = {
      id: `layer-product-container-${Date.now()}`,
      type: 'productContainer',
      x: CANVAS_SIZE.width / 2 - 300,
      y: CANVAS_SIZE.height / 2 - 300,
      width: 600,
      height: 600,
      imageFit: 'contain',
      zIndex: maxZIndex + 1,
      visible: true,
      productId: selectedProduct?._id || null,
      imageIndex: 0
    };
    setLayers(prev => [...prev, containerLayer]);
    setSelectedLayerId(containerLayer.id);
    
    if (selectedProduct && selectedProduct.productImage && selectedProduct.productImage.length > 0) {
      setTimeout(() => {
        loadImageInContainer(containerLayer.id, selectedProduct, 0);
      }, 100);
      toast.success('Contenedor creado con imagen');
    } else {
      toast.success('Contenedor creado. Selecciona un producto y carga la imagen');
    }
  };

  // Agregar texto
  const handleAddText = () => {
    const maxZIndex = Math.max(...layers.map(l => l.zIndex || 0), 0);
    let text = 'Nuevo texto';
    if (selectedProduct) {
      text = selectedProduct.productName || 'Nuevo texto';
    }

    const textLayer = {
      id: `layer-text-${Date.now()}`,
      type: 'text',
      text: text,
      x: 200,
      y: 200,
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#000000',
      zIndex: maxZIndex + 1,
      visible: true,
      dynamicField: null
    };
    setLayers(prev => [...prev, textLayer]);
    setSelectedLayerId(textLayer.id);
  };

  // Agregar forma
  const handleAddShape = (shapeType = 'rect') => {
    const maxZIndex = Math.max(...layers.map(l => l.zIndex || 0), 0);
    const shapeLayer = {
      id: `layer-shape-${Date.now()}`,
      type: 'shape',
      shapeType: shapeType,
      x: 300,
      y: 300,
      width: shapeType === 'circle' ? 200 : 300,
      height: shapeType === 'circle' ? 200 : 200,
      radius: shapeType === 'circle' ? 100 : null,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 0.8,
      zIndex: maxZIndex + 1,
      visible: true
    };
    setLayers(prev => [...prev, shapeLayer]);
    setSelectedLayerId(shapeLayer.id);
  };

  // Eliminar capa
  const handleDeleteLayer = (layerId) => {
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  // Control de z-index
  const handleLayerToFront = (layerId) => {
    setLayers(prev => {
      const maxZIndex = Math.max(...prev.map(l => l.zIndex || 0), 0);
      return prev.map(l => 
        l.id === layerId ? { ...l, zIndex: maxZIndex + 1 } : l
      );
    });
  };

  const handleLayerToBack = (layerId) => {
    setLayers(prev => {
      const minZIndex = Math.min(...prev.filter(l => l.type !== 'background').map(l => l.zIndex || 0), 1);
      return prev.map(l => 
        l.id === layerId ? { ...l, zIndex: minZIndex - 1 } : l
      );
    });
  };

  // Exportar imagen
  const handleExportImage = () => {
    if (!stageRef.current) return;

    const dataURL = stageRef.current.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    });

    const link = document.createElement('a');
    link.download = `producto-${selectedProduct?._id || 'editado'}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    toast.success('Imagen exportada');
  };

  // Zoom
  const handleZoom = (direction) => {
    const newScale = direction === 'in' ? canvasScale * 1.2 : canvasScale / 1.2;
    setCanvasScale(Math.max(0.1, Math.min(2, newScale)));
  };

  // Actualizar transformer
  useEffect(() => {
    if (selectedLayerId && transformerRef.current) {
      const layer = layerRefs.current[selectedLayerId];
      if (layer) {
        transformerRef.current.nodes([layer]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedLayerId, layers]);

  // Renderizar capas
  const renderLayers = () => {
    return layers
      .filter(layer => layer.visible)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map(layer => {
        switch (layer.type) {
          case 'background':
            return (
              <KonvaImage
                key={layer.id}
                image={layer.image}
                x={0}
                y={0}
                width={CANVAS_SIZE.width}
                height={CANVAS_SIZE.height}
                listening={false}
              />
            );
          
          case 'productContainer':
            const containerWidth = layer.width || 600;
            const containerHeight = layer.height || 600;
            
            // Calcular dimensiones de imagen
            let imageWidth = containerWidth;
            let imageHeight = containerHeight;
            let imageX = 0;
            let imageY = 0;
            
            if (layer.image) {
              const imgAspect = layer.image.width / layer.image.height;
              const containerAspect = containerWidth / containerHeight;
              
              if (layer.imageFit === 'contain') {
                if (imgAspect > containerAspect) {
                  imageHeight = containerWidth / imgAspect;
                  imageWidth = containerWidth;
                  imageY = (containerHeight - imageHeight) / 2;
                } else {
                  imageWidth = containerHeight * imgAspect;
                  imageHeight = containerHeight;
                  imageX = (containerWidth - imageWidth) / 2;
                }
              } else if (layer.imageFit === 'cover') {
                if (imgAspect > containerAspect) {
                  imageHeight = containerHeight;
                  imageWidth = containerHeight * imgAspect;
                  imageX = -(imageWidth - containerWidth) / 2;
                } else {
                  imageWidth = containerWidth;
                  imageHeight = containerWidth / imgAspect;
                  imageY = -(imageHeight - containerHeight) / 2;
                }
              }
            }
            
            return (
              <Group
                key={layer.id}
                ref={el => {
                  if (el) layerRefs.current[layer.id] = el;
                }}
                x={layer.x || 0}
                y={layer.y || 0}
                draggable={true}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedLayerId(layer.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  setSelectedLayerId(layer.id);
                }}
                onDragStart={() => {
                  setSelectedLayerId(layer.id);
                }}
                onDragEnd={(e) => {
                  const node = e.target;
                  setLayers(prev => prev.map(l => 
                    l.id === layer.id 
                      ? { ...l, x: node.x(), y: node.y() }
                      : l
                  ));
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  setLayers(prev => prev.map(l => 
                    l.id === layer.id 
                      ? { 
                          ...l, 
                          x: node.x(), 
                          y: node.y(),
                          width: Math.max(100, containerWidth * scaleX),
                          height: Math.max(100, containerHeight * scaleY)
                        }
                      : l
                  ));
                  node.scaleX(1);
                  node.scaleY(1);
                }}
                clipX={0}
                clipY={0}
                clipWidth={containerWidth}
                clipHeight={containerHeight}
              >
                <Rect
                  x={0}
                  y={0}
                  width={containerWidth}
                  height={containerHeight}
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[5, 5]}
                  listening={false}
                />
                {layer.image && (
                  <KonvaImage
                    image={layer.image}
                    x={imageX}
                    y={imageY}
                    width={imageWidth}
                    height={imageHeight}
                    listening={false}
                  />
                )}
                {!layer.image && (
                  <Rect
                    x={0}
                    y={0}
                    width={containerWidth}
                    height={containerHeight}
                    fill="#f3f4f6"
                    stroke="#9ca3af"
                    strokeWidth={1}
                    listening={false}
                  />
                )}
              </Group>
            );
          
          case 'text':
            return (
              <Text
                key={layer.id}
                ref={el => {
                  if (el) layerRefs.current[layer.id] = el;
                }}
                text={layer.text || ''}
                x={layer.x || 0}
                y={layer.y || 0}
                fontSize={layer.fontSize || 48}
                fontFamily={layer.fontFamily || 'Arial'}
                fill={layer.fill || '#000000'}
                draggable={true}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedLayerId(layer.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  setSelectedLayerId(layer.id);
                }}
                onDragStart={() => {
                  setSelectedLayerId(layer.id);
                }}
                onDragEnd={(e) => {
                  const node = e.target;
                  setLayers(prev => prev.map(l => 
                    l.id === layer.id 
                      ? { ...l, x: node.x(), y: node.y() }
                      : l
                  ));
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleY = node.scaleY();
                  setLayers(prev => prev.map(l => 
                    l.id === layer.id 
                      ? { 
                          ...l, 
                          x: node.x(), 
                          y: node.y(),
                          fontSize: Math.max(12, (layer.fontSize || 48) * scaleY)
                        }
                      : l
                  ));
                  node.scaleX(1);
                  node.scaleY(1);
                }}
              />
            );
          
          case 'shape':
            if (layer.shapeType === 'rect') {
              return (
                <Rect
                  key={layer.id}
                  ref={el => {
                    if (el) layerRefs.current[layer.id] = el;
                  }}
                  x={layer.x || 0}
                  y={layer.y || 0}
                  width={layer.width || 300}
                  height={layer.height || 200}
                  fill={layer.fill || '#ffffff'}
                  stroke={layer.stroke || '#000000'}
                  strokeWidth={layer.strokeWidth || 2}
                  opacity={layer.opacity || 1}
                  draggable={true}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedLayerId(layer.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    setSelectedLayerId(layer.id);
                  }}
                  onDragStart={() => {
                    setSelectedLayerId(layer.id);
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    setLayers(prev => prev.map(l => 
                      l.id === layer.id 
                        ? { ...l, x: node.x(), y: node.y() }
                        : l
                    ));
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    setLayers(prev => prev.map(l => 
                      l.id === layer.id 
                        ? { 
                            ...l, 
                            x: node.x(), 
                            y: node.y(),
                            width: Math.max(20, (layer.width || 300) * scaleX),
                            height: Math.max(20, (layer.height || 200) * scaleY)
                          }
                        : l
                    ));
                    node.scaleX(1);
                    node.scaleY(1);
                  }}
                />
              );
            } else if (layer.shapeType === 'circle') {
              return (
                <Circle
                  key={layer.id}
                  ref={el => {
                    if (el) layerRefs.current[layer.id] = el;
                  }}
                  x={layer.x || 0}
                  y={layer.y || 0}
                  radius={layer.radius || 100}
                  fill={layer.fill || '#ffffff'}
                  stroke={layer.stroke || '#000000'}
                  strokeWidth={layer.strokeWidth || 2}
                  opacity={layer.opacity || 1}
                  draggable={true}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedLayerId(layer.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    setSelectedLayerId(layer.id);
                  }}
                  onDragStart={() => {
                    setSelectedLayerId(layer.id);
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    setLayers(prev => prev.map(l => 
                      l.id === layer.id 
                        ? { ...l, x: node.x(), y: node.y() }
                        : l
                    ));
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    setLayers(prev => prev.map(l => 
                      l.id === layer.id 
                        ? { 
                            ...l, 
                            x: node.x(), 
                            y: node.y(),
                            radius: Math.max(10, (layer.radius || 100) * scaleX)
                          }
                        : l
                    ));
                    node.scaleX(1);
                    node.scaleY(1);
                  }}
                />
              );
            }
            return null;
          
          default:
            return null;
        }
      });
  };

  const subcategories = selectedCategory 
    ? getSubcategoriesByCategory(selectedCategory) 
    : [];

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 overflow-hidden" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="bg-gray-800 text-white p-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Editor de Imágenes</h1>
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-2 text-sm">
              <FaImage />
              <span>Fondo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLoadBackground}
                className="hidden"
              />
            </label>
            <button
              onClick={handleAddText}
              className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-2 text-sm"
            >
              <FaTextHeight />
              <span>Texto</span>
            </button>
            <button
              onClick={() => handleAddShape('rect')}
              className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-2 text-sm"
            >
              <FaSquare />
              <span>Rectángulo</span>
            </button>
            <button
              onClick={() => handleAddShape('circle')}
              className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-2 text-sm"
            >
              <FaCircle />
              <span>Círculo</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom('out')}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600"
            title="Alejar"
          >
            <FaSearchMinus />
          </button>
          <span className="text-sm px-2 min-w-[60px] text-center">{Math.round(canvasScale * 100)}%</span>
          <button
            onClick={() => handleZoom('in')}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600"
            title="Acercar"
          >
            <FaSearchPlus />
          </button>
          <button
            onClick={handleExportImage}
            className="px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <FaDownload />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar izquierdo */}
        {sidebarOpen && (
          <div className="w-64 bg-gray-800 text-white overflow-y-auto border-r border-gray-700 flex-shrink-0">
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-semibold">Productos</h3>
            </div>
            
            <div className="p-3 border-b border-gray-700 space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory('');
                  }}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                >
                  <option value="">Seleccionar</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Subcategoría</label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white disabled:opacity-50"
                >
                  <option value="">Seleccionar</option>
                  {subcategories.map(sub => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={loadProducts}
                disabled={!selectedCategory || !selectedSubcategory || loading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Cargando...' : 'Cargar Productos'}
              </button>
            </div>

            <div className="p-2">
              {products.map((product, index) => (
                <div
                  key={product._id}
                  onClick={() => handleProductChange(product, index)}
                  className={`p-2 mb-2 rounded cursor-pointer transition-colors ${
                    selectedProduct?._id === product._id
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {product.productImage?.[0] && (
                      <img
                        src={product.productImage[0]}
                        alt={product.productName}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {product.productName}
                      </p>
                      <p className="text-xs text-gray-300">
                        Gs. {(product.sellingPrice || product.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 text-white p-2 rounded-r hover:bg-gray-700"
        >
          {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
        </button>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center bg-gray-900 overflow-auto p-4"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              setCanvasScale(prev => Math.max(0.1, Math.min(2, prev + delta)));
            }
          }}
        >
          <div 
            className="bg-white shadow-2xl rounded-lg p-4 inline-block"
            style={{ 
              transform: `scale(${canvasScale})`,
              transformOrigin: 'center center'
            }}
          >
            <Stage
              ref={stageRef}
              width={CANVAS_SIZE.width}
              height={CANVAS_SIZE.height}
              style={{ border: '1px solid #e5e7eb', cursor: 'default' }}
              onMouseDown={(e) => {
                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                  setSelectedLayerId(null);
                }
              }}
            >
              <Layer>
                {renderLayers()}
                {selectedLayerId && (
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Sidebar derecho */}
        {propertiesOpen && (
          <div className="w-80 bg-gray-800 text-white overflow-y-auto border-l border-gray-700 flex-shrink-0">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FaLayerGroup />
                  Capas
                </h3>
                <button
                  onClick={handleCreateProductContainer}
                  className="p-1.5 bg-blue-600 rounded hover:bg-blue-700"
                  title="Crear contenedor de producto"
                >
                  <FaPlus />
                </button>
              </div>
              
              {selectedLayerId && selectedProduct && (() => {
                const container = layers.find(l => l.id === selectedLayerId && l.type === 'productContainer');
                if (!container) return null;
                if (!selectedProduct.productImage || selectedProduct.productImage.length <= 1) return null;
                
                return (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => handleChangeProductImage('prev')}
                      className="p-1 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <FaChevronLeft />
                    </button>
                    <span className="text-xs text-gray-400 flex-1 text-center">
                      Imagen {(container.imageIndex || 0) + 1} / {selectedProduct.productImage.length}
                    </span>
                    <button
                      onClick={() => handleChangeProductImage('next')}
                      className="p-1 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                );
              })()}
              
              {selectedLayerId && selectedProduct && (() => {
                const container = layers.find(l => l.id === selectedLayerId && l.type === 'productContainer');
                if (!container) return null;
                
                return (
                  <button
                    onClick={() => loadImageInContainer(selectedLayerId, selectedProduct, 0)}
                    className="w-full px-3 py-2 mb-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Cargar Imagen
                  </button>
                );
              })()}
            </div>

            <div className="p-2">
              {layers
                .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                .map((layer, index) => (
                <div
                  key={layer.id}
                  className={`p-2 mb-1 rounded flex items-center justify-between ${
                    selectedLayerId === layer.id
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div 
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <span className="text-xs text-gray-400">#{layers.length - index}</span>
                    <span className="text-xs truncate">
                      {layer.type === 'background' && 'Fondo'}
                      {layer.type === 'productContainer' && 'Contenedor'}
                      {layer.type === 'text' && `Texto: ${(layer.text || '').substring(0, 15)}`}
                      {layer.type === 'shape' && `Forma: ${layer.shapeType}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {layer.type !== 'background' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLayerToFront(layer.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Traer al frente"
                        >
                          <FaArrowUp className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLayerToBack(layer.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Enviar atrás"
                        >
                          <FaArrowDown className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLayer(layer.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Panel de propiedades */}
            {selectedLayer && (
              <div className="p-3 border-t border-gray-700">
                <h3 className="font-semibold mb-3">Propiedades</h3>
                
                {selectedLayer.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Texto</label>
                      <input
                        type="text"
                        value={selectedLayer.text || ''}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, text: e.target.value } : l
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Texto Dinámico</label>
                      <select
                        value={selectedLayer.dynamicField || ''}
                        onChange={(e) => {
                          const dynamicField = e.target.value || null;
                          let text = selectedLayer.text;
                          if (dynamicField && selectedProduct) {
                            switch (dynamicField) {
                              case 'productName':
                                text = selectedProduct.productName || '';
                                break;
                              case 'price':
                                text = `Gs. ${(selectedProduct.sellingPrice || selectedProduct.price || 0).toLocaleString()}`;
                                break;
                              case 'brand':
                                text = selectedProduct.brandName || '';
                                break;
                              case 'stock':
                                text = `Stock: ${selectedProduct.stock || 0}`;
                                break;
                            }
                          }
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, dynamicField, text } : l
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      >
                        <option value="">Estático</option>
                        <option value="productName">Nombre del Producto</option>
                        <option value="price">Precio</option>
                        <option value="brand">Marca</option>
                        <option value="stock">Stock</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tamaño</label>
                      <input
                        type="number"
                        value={selectedLayer.fontSize || 48}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, fontSize: parseInt(e.target.value) || 48 } : l
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                        min="8"
                        max="200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Color</label>
                      <input
                        type="color"
                        value={selectedLayer.fill || '#000000'}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, fill: e.target.value } : l
                          ));
                        }}
                        className="w-full h-8 border border-gray-600 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Fuente</label>
                      <select
                        value={selectedLayer.fontFamily || 'Arial'}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, fontFamily: e.target.value } : l
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Times New Roman">Times New Roman</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedLayer.type === 'productContainer' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Modo de Ajuste</label>
                      <select
                        value={selectedLayer.imageFit || 'contain'}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, imageFit: e.target.value } : l
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      >
                        <option value="contain">Contener</option>
                        <option value="cover">Cubrir</option>
                        <option value="fill">Llenar</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">X</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.x || 0)}
                          onChange={(e) => {
                            setLayers(prev => prev.map(l => 
                              l.id === selectedLayer.id ? { ...l, x: parseInt(e.target.value) || 0 } : l
                            ));
                          }}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Y</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.y || 0)}
                          onChange={(e) => {
                            setLayers(prev => prev.map(l => 
                              l.id === selectedLayer.id ? { ...l, y: parseInt(e.target.value) || 0 } : l
                            ));
                          }}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Ancho</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.width || 600)}
                          onChange={(e) => {
                            setLayers(prev => prev.map(l => 
                              l.id === selectedLayer.id ? { ...l, width: parseInt(e.target.value) || 600 } : l
                            ));
                          }}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                          min="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Alto</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.height || 600)}
                          onChange={(e) => {
                            setLayers(prev => prev.map(l => 
                              l.id === selectedLayer.id ? { ...l, height: parseInt(e.target.value) || 600 } : l
                            ));
                          }}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                          min="100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedLayer.type === 'shape' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Color de relleno</label>
                      <input
                        type="color"
                        value={selectedLayer.fill || '#ffffff'}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, fill: e.target.value } : l
                          ));
                        }}
                        className="w-full h-8 border border-gray-600 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Color de borde</label>
                      <input
                        type="color"
                        value={selectedLayer.stroke || '#000000'}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, stroke: e.target.value } : l
                          ));
                        }}
                        className="w-full h-8 border border-gray-600 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Opacidad</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedLayer.opacity || 1}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayer.id ? { ...l, opacity: parseFloat(e.target.value) } : l
                          ));
                        }}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-400">
                        {Math.round((selectedLayer.opacity || 1) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setPropertiesOpen(!propertiesOpen)}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 text-white p-2 rounded-l hover:bg-gray-700"
        >
          {propertiesOpen ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>
    </div>
  );
};

export default ImageEditorPage;

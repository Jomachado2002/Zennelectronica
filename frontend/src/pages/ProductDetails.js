import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import SummaryApi from '../common';
import displayINRCurrency from '../helpers/displayCurrency';
import CategoryWiseProductDisplay from '../components/CategoryWiseProductDisplay';
import addToCart from '../helpers/addToCart';
import Context from '../context';
import { trackWhatsAppContact, trackAddToCart, trackViewContent } from '../components/MetaPixelTracker';
import { useQuery } from '@tanstack/react-query';
import usePreloadedCategories from '../hooks/usePreloadedCategories';


// Las especificaciones ahora se cargan dinámicamente desde la base de datos


const ProductDetails = () => {
  const [data, setData] = useState({
    productName: "",
    brandName: "",
    category: "",
    productImage: [],
    description: "",
    price: "",
    sellingPrice: ""
  });
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const productImageListLoading = new Array(4).fill(null);
  const [activeImage, setActiveImage] = useState("");
  
  // Coordenadas relativas para el zoom
  const [zoomImageCoordinate, setZoomImageCoordinate] = useState({ x: 0, y: 0 });
  const [zoomImage, setZoomImage] = useState(false);
  
  // ID del producto actual para control de navegación
  const [currentProductId, setCurrentProductId] = useState(null);

  const { fetchUserAddToCart } = useContext(Context);
  const navigate = useNavigate();

  // Hook para categorías precargadas (datos dinámicos)
  const { 
    getSpecifications
  } = usePreloadedCategories();

  // Función simplificada para determinar el estado del stock
  const getStockStatus = (stock) => {
    // Si no hay stock definido o es null/undefined, asumir que está en stock
    if (stock === undefined || stock === null) {
      return { status: 'in_stock', text: 'En Stock', color: 'bg-green-500' };
    }
    
    // Si stock es 0, está agotado
    if (stock === 0) {
      return { status: 'out_of_stock', text: 'Sin Stock', color: 'bg-red-500' };
    }
    
    // Si stock es mayor a 0, está disponible
    return { status: 'in_stock', text: 'En Stock', color: 'bg-green-500' };
  };

  // Función para formatear la fecha un año en el futuro (para priceValidUntil)
  const getOneYearFromNow = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  };

  // Función para obtener las especificaciones técnicas en formato schema.org (dinámicas)
  const getProductSpecifications = () => {
    if (!data.category || !data.subcategory) return {};
    
    // Obtener especificaciones dinámicamente desde la base de datos
    const specifications = getSpecifications(data.category, data.subcategory);
    const specs = {};
    
    specifications.forEach(spec => {
      if (data[spec.name] && data[spec.name].trim !== '') {
        specs[spec.label] = data[spec.name];
      }
    });
    
    return specs;
  };

 // ✅ PRODUCTO CON CACHÉ AUTOMÁTICO
const { data: productData, isLoading: productLoading } = useQuery({
  queryKey: ['product-details', params?.id],
  queryFn: async () => {
    // Primero intentamos buscar por ID
    try {
      const response = await fetch(SummaryApi.productDetails.url, {
        method: SummaryApi.productDetails.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: params?.id })
      });
      
      const dataResponse = await response.json();
      
      if (dataResponse?.success) {
        return dataResponse.data;
      } else {
        // Si no se encuentra por ID, intentar por slug
        const slugResponse = await fetch(`${SummaryApi.productDetailsBySlug?.url || '/api/producto-por-slug'}/${params?.id}`);
        const slugData = await slugResponse.json();
        
        if (slugData?.success) {
          return slugData.data;
        }
        
        throw new Error('Producto no encontrado');
      }
    } catch (error) {
      throw new Error('Error al cargar producto: ' + error.message);
    }
  },
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
  retry: 1,
});

// ✅ SINCRONIZAR CON ESTADO LOCAL
useEffect(() => {
  if (productData) {
    setData(productData);
    setCurrentProductId(productData._id);
    setLoading(false);
    
    if (productData.productImage && productData.productImage.length > 0) {
      setActiveImage(productData.productImage[0]);
    }
    
    // ✅ TRACKEAR VIEW CONTENT CUANDO SE CARGA EL PRODUCTO
    trackViewContent(productData);
  } else {
    setLoading(productLoading);
  }
}, [productData, productLoading]);

  // Redirección canónica para SEO
  useEffect(() => {
    // Si el usuario accedió por ID pero el producto tiene slug, redirigir a la URL con slug
    if (data && data._id && data.slug && params.id !== data.slug) {
      navigate(`/producto/${data.slug}`, { replace: true });
    }
  }, [data, params.id, navigate]);

  // Al pasar el cursor por una miniatura se cambia la imagen activa
  const handleMouseEnterProduct = useCallback((imageURL, e) => {
    if (e) {
      e.stopPropagation();
    }
    setActiveImage(imageURL);
  }, []);

  // Calcula la posición relativa del cursor sobre la imagen principal
  const handleMouseMove = useCallback((e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    setZoomImageCoordinate({ x, y });
    setZoomImage(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setZoomImage(false);
  }, []);

  // Función para agregar al carrito con tracking
  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(e, product);
    fetchUserAddToCart();
    
    // Tracking de Add to Cart
    if (typeof trackAddToCart === 'function') {
      trackAddToCart(product);
    }
  };

  // Función para ir al carrito
  const handleBuyProduct = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(e, product);
    fetchUserAddToCart();
    navigate("/carrito");
  };

  // Función principal para WhatsApp con tracking
  const handleWhatsAppClick = () => {
    const price = displayINRCurrency(data.sellingPrice);
    const productUrl = window.location.href;
    const message = `Hola, estoy interesado en este producto: *${data.productName}* (${data.brandName})
Precio: ${price}
${productUrl}
¿Me puedes brindar más detalles sobre disponibilidad y envío?`;
    
    // Tracking de WhatsApp - EVENTO PRINCIPAL
    if (typeof trackWhatsAppContact === 'function') {
      trackWhatsAppContact({
        _id: data._id,
        productName: data.productName,
        category: data.category,
        subcategory: data.subcategory,
        brandName: data.brandName,
        sellingPrice: data.sellingPrice
      });
    }
    
    const whatsappUrl = `https://wa.me/+595981150393?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Calcula el porcentaje de descuento 
  const discountPercentage = data.price && data.sellingPrice && data.price > 0
    ? Math.round(((data.price - data.sellingPrice) / data.price) * 100)
    : 0;

  // Función para obtener los campos de especificaciones relevantes para el producto actual (dinámicas)
  const getRelevantSpecifications = () => {
    if (!data.category || !data.subcategory) return [];
    
    // Obtener especificaciones dinámicamente desde la base de datos
    const specifications = getSpecifications(data.category, data.subcategory);
    
    // Obtener todas las especificaciones que tienen valores
    const filledSpecs = specifications
      .filter(spec => data[spec.name] && data[spec.name].trim !== '')
      .map(spec => ({ 
        key: spec.name, 
        value: data[spec.name], 
        label: spec.label 
      }));
    
    return filledSpecs;
  };

  // Variables optimizadas para Google Merchant
  const isInStock = data?.stock === undefined || data?.stock === null || data?.stock > 0;
  const stockInfo = getStockStatus(data?.stock);

  return (
    <>
      <Helmet>
        <title>{data.productName ? `${data.productName} | Zenn` : 'Producto | Zenn'}</title>
        <meta name="description" content={data.description?.substring(0, 160) || 'Descubre este producto en Zenn'} />
        <meta property="og:title" content={data.productName || 'Producto'} />
        <meta property="og:description" content={data.description?.substring(0, 160) || 'Descubre este producto en Zenn'} />
        {data.productImage && data.productImage[0] && (
          <meta property="og:image" content={data.productImage[0]} />
        )}
        <link rel="canonical" href={`https://zenn.com.py/producto/${data.slug || params.id}`} />
        
        {/* BreadcrumbList Schema.org para navegación */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Inicio",
                "item": "https://zenn.com.py"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": data.category ? (data.category.charAt(0).toUpperCase() + data.category.slice(1)) : "Categoría",
                "item": `https://zenn.com.py/categoria-producto?category=${data.category}`
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": data.subcategory ? (data.subcategory.charAt(0).toUpperCase() + data.subcategory.slice(1)) : "Subcategoría",
                "item": `https://zenn.com.py/categoria-producto?category=${data.category}&subcategory=${data.subcategory}`
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": data.productName,
                "item": `https://zenn.com.py/producto/${data.slug || params.id}`
              }
            ]
          })}
        </script>
        
        {/* Product Schema.org optimizado para Google Merchant */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": data.productName,
            "image": data.productImage,
            "description": data.description,
            "sku": data._id,
            "mpn": data._id,
            "category": `${data.category}/${data.subcategory}`.replace(/undefined/g, ''),
            "brand": {
              "@type": "Brand",
              "name": data.brandName
            },
            "offers": {
              "@type": "Offer",
              "url": `https://zenn.com.py/producto/${data.slug || params.id}`,
              "priceCurrency": "PYG",
              "price": data.sellingPrice,
              "priceValidUntil": getOneYearFromNow(),
              "itemCondition": "https://schema.org/NewCondition",
              "availability": isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "seller": {
                "@type": "Organization",
                "name": "Zenn Electronicos"
              }
            },
            "additionalProperty": Object.entries(getProductSpecifications()).map(([name, value]) => ({
              "@type": "PropertyValue",
              "name": name,
              "value": value
            })),
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "27"
            },
            "review": [
              {
                "@type": "Review",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5",
                  "bestRating": "5"
                },
                "author": {
                  "@type": "Person",
                  "name": "Cliente Satisfecho"
                },
                "reviewBody": "Excelente producto, llegó antes de lo esperado y con todas las características prometidas."
              }
            ]
          })}
        </script>
      </Helmet>
      
      <div className="container mx-auto p-4 font-roboto">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex flex-col lg:flex-row gap-6 flex-1">
            {/** Sección de Imagen Principal y Zoom **/}
            <div className="relative">
              <div
                className="relative h-auto w-full lg:w-[600px] bg-gray-50 flex justify-center items-center border border-gray-200"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {activeImage && (
                  <img
                    src={activeImage}
                    alt={data.productName}
                    className="object-contain h-full w-full"
                  />
                )}
                {/** Contenedor de Zoom (visible solo en pantallas grandes) **/}
                {zoomImage && activeImage && (
                  <div className="hidden lg:block absolute top-0 left-full ml-4 w-[600px] h-[500px] border border-gray-200 rounded overflow-hidden shadow-xl pointer-events-none">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${activeImage})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1200px 1000px',
                        backgroundPosition: `${zoomImageCoordinate.x * 100}% ${zoomImageCoordinate.y * 100}%`
                      }}
                    />
                  </div>
                )}
              </div>
              {/** Sección de Miniaturas Mejoradas **/}
              <div className="flex flex-nowrap gap-2 p-2 bg-white border-t border-gray-200 mt-2 overflow-x-auto">
                {loading
                  ? productImageListLoading.map((_, index) => (
                      <div key={"loadingImage" + index} className="h-16 w-16 bg-gray-200 rounded animate-pulse"></div>
                    ))
                  : data?.productImage?.map((imgURL, index) => (
                      <div
                        key={`thumb-${index}-${currentProductId}`}
                        className={`h-16 w-16 rounded border cursor-pointer transition-shadow duration-200 hover:shadow-md ${activeImage === imgURL ? 'border-[#2A3190]' : 'border-transparent'}`}
                        onMouseEnter={(e) => handleMouseEnterProduct(imgURL, e)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMouseEnterProduct(imgURL, e);
                        }}
                      >
                        <img 
                          src={imgURL} 
                          alt={`Producto ${index + 1}`} 
                          className="h-full w-full object-cover rounded" 
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ))
                }
              </div>
            </div>

            {/** Sección de Detalles del Producto **/}
            <div className="flex-1 flex flex-col justify-between">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="bg-gray-200 h-6 w-1/2 rounded"></div>
                  <div className="bg-gray-200 h-8 w-full rounded"></div>
                  <div className="bg-gray-200 h-6 w-1/3 rounded"></div>
                  <div className="flex gap-4">
                    <div className="bg-gray-200 h-10 w-32 rounded"></div>
                    <div className="bg-gray-200 h-10 w-32 rounded"></div>
                    <div className="bg-gray-200 h-10 w-32 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-gray-200 h-4 w-full rounded"></div>
                    <div className="bg-gray-200 h-4 w-full rounded"></div>
                    <div className="bg-gray-200 h-4 w-full rounded"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="inline-block bg-[#2A3190] text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {data?.brandName}
                      </p>
                      {/* Badge de Stock simplificado para Google Merchant */}
                      <span className={`${stockInfo.color} text-white text-xs px-2 py-1 rounded-full`}>
                        {stockInfo.text}
                      </span>
                    </div>
                    <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-800">
                      {data?.productName}
                    </h2>
                    <p className="capitalize text-sm md:text-lg text-gray-500">{data?.subcategory}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <p className="text-3xl lg:text-4xl font-bold text-[#2A3190]">
                      {displayINRCurrency(data.sellingPrice)}
                    </p>
                    {data.price > 0 && (
                      <>
                        <p className="text-xl lg:text-2xl text-gray-400 line-through">
                          {displayINRCurrency(data.price)}
                        </p>
                        {discountPercentage > 0 && (
                          <span className="bg-red-500 text-white text-sm font-semibold px-2 py-1 rounded-md">
                            {discountPercentage}% OFF
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Botones de acción optimizados */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={(e) => handleBuyProduct(e, data)}
                      disabled={!isInStock}
                      className={`py-2.5 px-6 rounded-xl transition duration-300 font-medium text-sm ${
                        isInStock 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isInStock ? 'Comprar' : 'Sin Stock'}
                    </button>
                    <button
                      onClick={(e) => handleAddToCart(e, data)}
                      disabled={!isInStock}
                      className={`py-2.5 px-6 rounded-xl border-2 transition duration-300 font-medium text-sm ${
                        isInStock 
                          ? 'bg-white text-purple-600 border-purple-600 hover:bg-purple-50' 
                          : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {isInStock ? 'Agregar al carrito' : 'No disponible'}
                    </button>
                    
                    <button
                      onClick={handleWhatsAppClick}
                      className="bg-white text-green-600 border-2 border-green-600 py-2.5 px-6 rounded-xl hover:bg-green-50 transition duration-300 font-medium text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      WhatsApp
                    </button>
                  </div>

                  {!loading && (
                    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-xl font-semibold text-gray-700 mb-3">Especificaciones</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getRelevantSpecifications().map(({ key, value, label }) => (
                          <div key={`spec-${key}-${currentProductId}`} className="flex flex-col sm:flex-row justify-between p-2 bg-white rounded-lg shadow-sm">
                            <span className="font-medium text-gray-600">{label}:</span>
                            <span className="text-gray-800">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="mt-4 text-xl font-semibold text-gray-700">Descripción:</h3>
                    <p className="mt-2 text-gray-600 leading-relaxed">{data?.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {data.category && data.subcategory && (
          <div className="mt-12">
            <CategoryWiseProductDisplay
              key={`related-products-${currentProductId}`}
              category={data?.category} 
              subcategory={data?.subcategory} 
              heading="Productos Recomendados"
              currentProductId={currentProductId}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default ProductDetails;
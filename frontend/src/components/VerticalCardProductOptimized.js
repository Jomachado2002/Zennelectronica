// frontend/src/components/VerticalCardProductOptimized.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import displayPYGCurrency from '../helpers/displayCurrency';
import { FaAngleLeft, FaAngleRight, FaShoppingCart } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import addToCart from '../helpers/addToCart';
import Context from '../context';
import scrollTop from '../helpers/scrollTop';
import { trackAddToCart } from './MetaPixelTracker';

const VerticalCardProductOptimized = ({ 
  category, 
  subcategory, 
  heading, 
  products = [],
  loading = false
}) => {
  const [data, setData] = useState([]);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [hoveredProductId, setHoveredProductId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [hoverTimeout, setHoverTimeout] = useState(null);
  
  const loadingList = new Array(12).fill(null);
  const scrollElement = useRef();
  const { fetchUserAddToCart } = useContext(Context);

  // ✅ DETECTOR MOBILE
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
                               || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ CONFIGURACIÓN DE DATOS CON LÍMITES OPTIMIZADOS
  useEffect(() => {
    if (products && products.length > 0) {
      const limits = {
        'mouses': isMobile ? 5 : 10,
        'teclados': isMobile ? 5 : 10,
        'auriculares': isMobile ? 5 : 10,
        'microfonos': isMobile ? 5 : 10,
        'notebooks': isMobile ? 5 : 10,
        'monitores': isMobile ? 5 : 10,
        'memorias_ram': isMobile ? 5 : 10,
        'discos_duros': isMobile ? 5 : 10,
        'tarjeta_grafica': isMobile ? 5 : 10,
        'gabinetes': isMobile ? 5 : 10,
        'procesador': isMobile ? 5 : 10,
        'placas_madre': isMobile ? 5 : 10,
        'telefonos_moviles': isMobile ? 5 : 10,
      };
      
      const limit = limits[subcategory] || (isMobile ? 5 : 10);
      const limitedProducts = products.slice(0, limit);
      setData(limitedProducts);
    } else {
      setData([]);
    }
  }, [products, subcategory, isMobile]);

  // ✅ PRECARGA INTELIGENTE SOLO EN DESKTOP
  useEffect(() => {
    if (isMobile || data.length === 0) return;
    
    data.forEach((product, index) => {
      setTimeout(() => {
        if (product?.productImage?.[0]) {
          const img1 = new Image();
          img1.fetchPriority = index < 3 ? 'high' : 'low';
          img1.src = product.productImage[0];
        }
        if (product?.productImage?.[1]) {
          const img2 = new Image();
          img2.fetchPriority = 'low';
          img2.src = product.productImage[1];
        }
      }, index * 50);
    });
  }, [data, isMobile]);

  const handleImageError = (productId) => {
    setImageErrors(prev => new Set([...prev, productId]));
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    trackAddToCart(product);
    addToCart(e, product);
    fetchUserAddToCart();
  };

  const scrollRight = () => {
    const scrollAmount = isMobile ? 200 : 300;
    scrollElement.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const scrollLeft = () => {
    const scrollAmount = isMobile ? 200 : 300;
    scrollElement.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const checkScrollPosition = () => {
    if (scrollElement.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth);
    }
  };
  
  useEffect(() => {
    const scrollContainer = scrollElement.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => scrollContainer.removeEventListener('scroll', checkScrollPosition);
    }
  }, [data]);

  const calculateDiscount = (price, sellingPrice) => {
    if (price && price > 0) {
      const discount = Math.round(((price - sellingPrice) / price) * 100);
      return discount > 0 ? discount : null;
    }
    return null;
  };

  if (!loading && data.length === 0) {
    return null;
  }

  return (
    <div className='w-full relative'>
      {heading && (
        <div className='flex justify-between items-center mb-6'>
          <div>
            <h2 className='text-2xl sm:text-3xl font-bold text-gray-800'>{heading}</h2>
            <div className='h-1 w-20 bg-[#002060] mt-2 rounded-full'></div>
          </div>
          <Link 
            to={`/categoria-producto?category=${category}${subcategory ? `&subcategory=${subcategory}` : ''}`}
            className='text-[#002060] hover:text-[#003399] text-sm font-semibold transition-colors flex items-center'
            onClick={scrollTop}
          >
            Ver todos <FaAngleRight className='ml-1 transition-transform hover:translate-x-1' />
          </Link>
        </div>
      )}

      <div className='relative group'>
        {/* ✅ BOTONES DE SCROLL - RESTAURADOS */}
        {showLeftButton && (
          <button
            className='absolute left-0 top-1/2 transform -translate-y-1/2 z-10 
                    bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                    transition-all duration-300 -translate-x-2
                    opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
            onClick={scrollLeft}
            aria-label="Scroll izquierda"
          >
            <FaAngleLeft className='text-[#002060]' />
          </button>
        )}
        
        {showRightButton && (
          <button
            className='absolute right-0 top-1/2 transform -translate-y-1/2 z-10 
                    bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                    transition-all duration-300 translate-x-2
                    opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
            onClick={scrollRight}
            aria-label="Scroll derecha"
          >
            <FaAngleRight className='text-[#002060]' />
          </button>
        )}

        {/* ✅ CONTENEDOR DE PRODUCTOS - DISEÑO ORIGINAL */}
        <div
          ref={scrollElement}
          className='flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-4'
        >
          {loading
            ? loadingList.map((_, index) => (
                <div
                  key={index}
                  className='snap-center flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg animate-pulse overflow-hidden'
                  style={{
                    border: '2px solid transparent',
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box'
                  }}
                >
                  <div className='bg-gradient-to-br from-gray-200 to-gray-300 h-32 sm:h-36 rounded-t-xl'></div>
                  <div className='p-2.5 space-y-1.5'>
                    <div className='h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded'></div>
                    <div className='h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3'></div>
                    <div className='h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded'></div>
                    <div className='h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded'></div>
                  </div>
                </div>
              ))
            : data.map((product) => {
                const discount = calculateDiscount(product?.price, product?.sellingPrice);
                const hasImageError = imageErrors.has(product._id);
                const isHovered = hoveredProductId === product?._id;
                const secondImage = product.productImage?.[1];
                const showSecondImage = isHovered && secondImage;
                
                // Funciones para manejar hover con delay
                const handleMouseEnter = () => {
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                  }
                  
                  const timeout = setTimeout(() => {
                    setHoveredProductId(product?._id);
                  }, 300);
                  
                  setHoverTimeout(timeout);
                };
                
                const handleMouseLeave = () => {
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    setHoverTimeout(null);
                  }
                  
                  setHoveredProductId(null);
                };
                
                return (
                  <Link to={`/producto/${product?.slug || product?._id}`}
                    key={product?._id} 
                    className='snap-center flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group/card relative flex flex-col overflow-hidden'
                    style={{
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box'
                    }}
                    onClick={scrollTop}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* ✅ IMAGEN DEL PRODUCTO - EXACTAMENTE COMO ANTES */}
                    <div className='h-32 sm:h-36 rounded-t-xl flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100'>
                      {!hasImageError ? (
                        <>
                          {/* ✅ IMAGEN PRINCIPAL - COMPLETA EN EL CONTENEDOR */}
                          <img
                            src={product.productImage[0]}
                            alt={product.productName}
                            className={`object-contain h-full w-full transition-all duration-500 ease-in-out ${
                              showSecondImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                            loading={isMobile ? "lazy" : "eager"}
                            fetchpriority={isMobile ? "low" : "high"}
                            onError={() => handleImageError(product._id)}
                            decoding="async"
                          />
                          
                          {/* ✅ IMAGEN DE HOVER - SE PONE ENCIMA EXACTAMENTE COMO ANTES */}
                          {secondImage && (
                            <img
                              src={secondImage}
                              alt={product.productName}
                              className={`absolute inset-0 object-contain h-full w-full transition-all duration-500 ease-in-out ${
                                showSecondImage ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                              }`}
                              loading="lazy"
                              fetchpriority="low"
                              decoding="async"
                            />
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-gray-400 text-center">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs">Error al cargar</p>
                          </div>
                        </div>
                      )}

                      {/* Badge de descuento */}
                      {discount && (
                        <div className="absolute top-2 left-2 z-10">
                          <span 
                            className='text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg'
                            style={{
                              background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                            }}
                          >
                            -{discount}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ✅ DETALLES DEL PRODUCTO */}
                    <div className='p-2.5 flex flex-col flex-grow'>
                      <div className='flex-grow space-y-1.5'>
                        <h3 className='font-medium text-xs text-gray-600 leading-tight line-clamp-4 min-h-[2.8rem]'>
                          {product?.productName}
                        </h3>
                        
                        {/* ✅ NUEVO: CÓDIGO DEL PRODUCTO */}
                        {product?.codigo && (
                          <div className='text-xs font-bold text-[#002060] bg-blue-50 px-2 py-1 rounded-md inline-block'>
                            Código: {product.codigo}
                          </div>
                        )}
                        
                        <div className='text-xs text-gray-500 uppercase font-medium tracking-wide'>
                          {product?.subcategory || product?.brandName}
                        </div>
                      </div>
                      
                      <div className='mt-auto space-y-2'>
                        <div className='space-y-0.5 text-center'>
                          <div className='text-lg font-bold text-black'>
                            {displayPYGCurrency(product?.sellingPrice)}
                          </div>
                          {product?.price > 0 && product?.price > product?.sellingPrice && (
                            <div className='text-xs text-gray-400 line-through'>
                              {displayPYGCurrency(product?.price)}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(e, product);
                          }}
                          className='w-full flex items-center justify-center gap-1 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn'
                          style={{
                            background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                          }}
                        >
                          <FaShoppingCart size={11} className="group-hover/btn:scale-110 transition-transform duration-300" /> 
                          <span className="group-hover/btn:translate-x-0.5 transition-transform duration-300">Agregar</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
};

export default VerticalCardProductOptimized;
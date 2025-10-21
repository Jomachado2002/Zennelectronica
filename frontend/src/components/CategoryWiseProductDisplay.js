import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import fetchCategoryWiseProduct from '../helpers/fetchCategoryWiseProduct';
import { FaAngleLeft, FaAngleRight, FaShoppingCart, FaExpand } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import addToCart from '../helpers/addToCart';
import Context from '../context';
import displayPYGCurrency from '../helpers/displayCurrency';

const CategoryWiseProductDisplay = ({ category, subcategory, heading, currentProductId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [hoveredProductId, setHoveredProductId] = useState(null);
  const loadingList = new Array(13).fill(null);

  const scrollElement = useRef();
  const navigate = useNavigate();

  const { fetchUserAddToCart } = useContext(Context);

  // Función para calcular el descuento
  const calculateDiscount = (price, sellingPrice) => {
    if (price && price > 0) {
      const discount = Math.round(((price - sellingPrice) / price) * 100);
      return discount > 0 ? `${discount}% OFF` : null;
    }
    return null;
  };

  // Función para manejar la acción de agregar al carrito
  const handleAddToCart = useCallback(
    (e, product) => {
      e.preventDefault();
      e.stopPropagation(); // Evita que el clic se propague al Link
      addToCart(e, product);
      fetchUserAddToCart();
    },
    [fetchUserAddToCart]
  );

  // Función para navegar directamente a la página del producto
  const handleProductClick = useCallback((e, productSlug) => {
    e.preventDefault();
    // Forzar una recarga completa para evitar problemas de estado
    window.location.href = `/producto/${productSlug}`;
  }, []);

  // Función para obtener datos
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const categoryProduct = await fetchCategoryWiseProduct(category, subcategory);
      
      // Filtrar el producto actual de los resultados si tenemos su ID
      let filteredProducts = categoryProduct?.data || [];
      if (currentProductId && filteredProducts.length > 0) {
        filteredProducts = filteredProducts.filter(product => product._id !== currentProductId);
      }
      
      // ✅ FILTRAR PRODUCTOS CON STOCK > 0
      const productsWithStock = filteredProducts.filter(product => 
        product?.stock === undefined || product?.stock === null || product?.stock > 0
      );
      
      setData(productsWithStock);
    } catch (error) {
      // console.error removed for production
    } finally {
      setLoading(false);
    }
  }, [category, subcategory, currentProductId]);

  // useEffect para cargar datos
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Función para desplazar a la derecha
  const scrollRight = () => {
    if (scrollElement.current) {
      scrollElement.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Función para desplazar a la izquierda
  const scrollLeft = () => {
    if (scrollElement.current) {
      scrollElement.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  // Función para verificar la posición del scroll
  const checkScrollPosition = useCallback(() => {
    if (scrollElement.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth);
    }
  }, []);

  // useEffect para verificar la posición del scroll
  useEffect(() => {
    const scrollContainer = scrollElement.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollPosition);
      
      // Verificar la posición inicial del scroll cuando se carga el componente
      checkScrollPosition();
      
      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', checkScrollPosition);
        }
      };
    }
  }, [checkScrollPosition, data]);

  // Manejo de teclas para accesibilidad
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      scrollRight();
    } else if (e.key === 'ArrowLeft') {
      scrollLeft();
    }
  };

  // Si no hay datos y no está cargando, no mostrar nada
  if (data.length === 0 && !loading) {
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
        </div>
      )}

      <div className='relative group'>
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

        <div
          className='flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-4'
          ref={scrollElement}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Carrusel de productos recomendados"
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
                const productUrl = `/producto/${product?.slug || product?._id}`;
                const isHovered = hoveredProductId === product?._id;
                const secondImage = product.productImage?.[1];
                const showSecondImage = isHovered && secondImage;
                
                return (
                  <div
                    key={`product-${product?._id}`}
                    className='snap-center flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group/card relative flex flex-col overflow-hidden cursor-pointer'
                    style={{
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box'
                    }}
                    onClick={(e) => handleProductClick(e, product?.slug || product?._id)}
                    onMouseEnter={() => setHoveredProductId(product?._id)}
                    onMouseLeave={() => setHoveredProductId(null)}
                  >
                    {/* Imagen del producto */}
                    <div className='h-32 sm:h-36 rounded-t-xl flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100'>
                      <img
                        src={product.productImage[0]}
                        alt={product.productName}
                        className={`object-contain h-full w-full transition-all duration-500 ease-in-out ${
                          showSecondImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        }`}
                        loading="lazy"
                        fetchpriority="low"
                        decoding="async"
                      />
                      
                      {/* Imagen de hover */}
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

                      {/* Badge de descuento */}
                      {discount && (
                        <div className="absolute top-2 left-2 z-10">
                          <span 
                            className='text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg'
                            style={{
                              background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                            }}
                          >
                            -{discount.replace('% OFF', '')}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detalles del producto */}
                    <div className='p-2.5 flex flex-col flex-grow'>
                      <div className='flex-grow space-y-1.5'>
                        <h3 className='font-medium text-xs text-gray-600 leading-tight line-clamp-4 min-h-[2.8rem]'>
                          {product?.productName}
                        </h3>
                        
                        {/* Código del producto */}
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
                          onClick={(e) => handleAddToCart(e, product)}
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
                  </div>
                );
              })}
        </div>

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
      </div>
    </div>
  );
};

export default CategoryWiseProductDisplay;
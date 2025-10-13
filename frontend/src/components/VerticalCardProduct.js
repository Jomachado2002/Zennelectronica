import React, { useContext, useEffect, useRef, useState } from 'react';
import displayPYGCurrency from '../helpers/displayCurrency';
import { FaAngleLeft, FaAngleRight, FaShoppingCart } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import addToCart from '../helpers/addToCart';
import Context from '../context';
import scrollTop from '../helpers/scrollTop';
import { trackViewContent, trackAddToCart } from './MetaPixelTracker';

// ✅ COMPONENTE OPTIMIZADO PARA MOBILE/DESKTOP
const VerticalCardProduct = ({ 
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
    
    // ✅ ESTADOS SIMPLIFICADOS
    const [loadedImages, setLoadedImages] = useState(new Set());
    const [visibleProductIds, setVisibleProductIds] = useState(new Set());
    
    const loadingList = new Array(6).fill(null);
    const scrollElement = useRef();
    const observerRef = useRef();
    const { fetchUserAddToCart } = useContext(Context);

    // ✅ DETECTOR MOBILE OPTIMIZADO
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

    // ✅ INTERSECTION OBSERVER REAL PARA MOBILE
    useEffect(() => {
        if (!isMobile) return;
        
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const productId = entry.target.dataset.productId;
                        if (productId) {
                            setVisibleProductIds(prev => new Set([...prev, productId]));
                        }
                    }
                });
            },
            {
                root: scrollElement.current,
                rootMargin: '100px', // ✅ Precargar 100px antes
                threshold: 0.1
            }
        );

        // ✅ OBSERVAR PRODUCTOS EXISTENTES
        const productElements = scrollElement.current?.querySelectorAll('[data-product-id]');
        productElements?.forEach(el => {
            observerRef.current.observe(el);
        });

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [isMobile, data]);

    // ✅ CONFIGURACIÓN DE DATOS OPTIMIZADA
    useEffect(() => {
        if (products && products.length > 0) {
            const limits = {
                'mouses': isMobile ? 4 : 12,         // ✅ REDUCIDO PARA MOBILE
                'teclados': isMobile ? 4 : 12,
                'auriculares': isMobile ? 4 : 12,
                'microfonos': isMobile ? 4 : 12,
                'notebooks': isMobile ? 4 : 20,
                'monitores': isMobile ? 4 : 20,
                'memorias_ram': isMobile ? 4 : 20,
                'discos_duros': isMobile ? 4 : 20,
                'tarjeta_grafica': isMobile ? 4 : 20,
                'gabinetes': isMobile ? 4 : 20,
                'procesador': isMobile ? 4 : 20,
                'placas_madre': isMobile ? 4 : 20,
            };
            
            const limit = limits[subcategory] || (isMobile ? 4 : 20);
            const limitedProducts = products.slice(0, limit);
            setData(limitedProducts);

            if (isMobile) {
                // ✅ EN MOBILE: Solo los primeros 2 productos visibles inicialmente
                const initialVisible = new Set(limitedProducts.slice(0, 2).map(p => p._id));
                setVisibleProductIds(initialVisible);
            } else {
                // ✅ EN DESKTOP: Todos los productos visibles (comportamiento actual)
                setVisibleProductIds(new Set(limitedProducts.map(p => p._id)));
            }
        } else {
            setData([]);
            setVisibleProductIds(new Set());
        }
    }, [products, subcategory, isMobile]);

    // ✅ PRELOAD INTELIGENTE SOLO PARA DESKTOP
    useEffect(() => {
        if (isMobile || data.length === 0) return;
        
        // ✅ SOLO DESKTOP: Preload ambas imágenes
        const preloadDesktopImages = () => {
            data.forEach((product, index) => {
                // Preload con prioridad decreciente
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
        };
        
        preloadDesktopImages();
    }, [data, isMobile]);

    // ✅ FUNCIÓN DE MANEJO DE IMAGEN CARGADA
    const handleImageLoad = (productId) => {
        setLoadedImages(prev => new Set([...prev, productId]));
    };

    const handleAddToCart = (e, product) => {
        e.preventDefault();
        
        // ✅ TRACKEAR ADD TO CART CON ID CONSISTENTE
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
            return discount > 0 ? `${discount}% OFF` : null;
        }
        return null;
    };

    // ✅ PLACEHOLDER OPTIMIZADO PARA MOBILE - ESTILO HEADER
    const ProductPlaceholder = ({ product }) => (
        <div 
            data-product-id={product._id}
            className='snap-center flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden'
            style={{
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
            }}
        >
            <div className="text-center p-4">
                <div 
                    className="w-6 h-6 border-3 border-gray-200 rounded-full animate-spin mx-auto mb-2"
                    style={{
                        borderTopColor: '#00B5D8'
                    }}
                ></div>
                <div className="text-xs text-gray-500 font-medium">Cargando...</div>
            </div>
        </div>
    );

    // ✅ SPINNER OPTIMIZADO - ESTILO HEADER
    const ImageSpinner = () => (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl">
            <div 
                className="w-5 h-5 border-2 border-gray-200 rounded-full animate-spin"
                style={{
                    borderTopColor: '#00B5D8'
                }}
            ></div>
        </div>
    );

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
                {/* Botones de scroll - SOLO DESKTOP */}
                {!isMobile && showLeftButton && (
                    <button
                        className='absolute left-0 top-1/2 transform -translate-y-1/2 z-10 
                                bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                                transition-all duration-300 -translate-x-2
                                opacity-0 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block'
                        onClick={scrollLeft}
                        aria-label="Scroll izquierda"
                    >
                        <FaAngleLeft className='text-[#002060]' />
                    </button>
                )}
                
                {!isMobile && showRightButton && (
                    <button
                        className='absolute right-0 top-1/2 transform -translate-y-1/2 z-10 
                                bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                                transition-all duration-300 translate-x-2
                                opacity-0 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block'
                        onClick={scrollRight}
                        aria-label="Scroll derecha"
                    >
                        <FaAngleRight className='text-[#002060]' />
                    </button>
                )}

                {/* Contenedor de productos */}
                <div
                    ref={scrollElement}
                    className={`flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-4 ${
                        isMobile ? 'snap-x snap-mandatory' : ''
                    }`}
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
                            const isVisible = visibleProductIds.has(product?._id);
                            const isImageLoaded = loadedImages.has(product?._id);
                            
                            // ✅ LÓGICA HOVER SOLO PARA DESKTOP
                            const isHovered = !isMobile && hoveredProductId === product?._id;
                            const secondImage = product.productImage?.[1];
                            const showSecondImage = isHovered && secondImage && isImageLoaded;
                            
                            // ✅ EN MOBILE: Mostrar placeholder si no es visible
                            if (isMobile && !isVisible) {
                                return <ProductPlaceholder key={product?._id} product={product} />;
                            }
                          
                            return (
                                <Link to={`/producto/${product?.slug || product?._id}`}
                                    key={product?._id} 
                                    data-product-id={product?._id}
                                    className='snap-center flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group/card relative flex flex-col overflow-hidden'
                                    style={{
                                        border: '2px solid transparent',
                                        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                                        backgroundOrigin: 'border-box',
                                        backgroundClip: 'padding-box, border-box'
                                    }}
                                    onClick={scrollTop}
                                    onMouseEnter={() => !isMobile && setHoveredProductId(product?._id)}
                                    onMouseLeave={() => !isMobile && setHoveredProductId(null)}
                                >
                                    {/* Imagen del producto */}
                                    <div className='h-32 sm:h-36 rounded-t-xl flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100'>
                                        {/* Spinner mientras carga */}
                                        {!isImageLoaded && <ImageSpinner />}
                                        
                                        {/* Imagen principal */}
                                        <img
                                            src={product.productImage[0]}
                                            alt={product.productName}
                                            className={`object-contain h-full w-full transition-all duration-500 ease-in-out ${
                                                showSecondImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                            } ${!isImageLoaded ? 'opacity-0' : 'opacity-100'}`}
                                            loading={isMobile ? "lazy" : "eager"} // ✅ LAZY EN MOBILE, EAGER EN DESKTOP
                                            fetchpriority={isMobile ? "low" : "high"} // ✅ PRIORIDAD BAJA EN MOBILE
                                            onLoad={() => handleImageLoad(product?._id)}
                                            onError={() => handleImageLoad(product?._id)}
                                        />
                                        
                                        {/* Segunda imagen solo en desktop */}
                                        {secondImage && !isMobile && isImageLoaded && (
                                            <img
                                                src={secondImage}
                                                alt={product.productName}
                                                className={`absolute inset-0 object-contain h-full w-full transition-all duration-500 ease-in-out ${
                                                    showSecondImage ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                                                }`}
                                                loading="lazy"
                                                fetchpriority="low"
                                            />
                                        )}

                                        {/* Badge de descuento - estilo del Header */}
                                        {discount && (
                                            <div className="absolute top-2 left-2 z-10">
                                                <span 
                                                    className='text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg'
                                                    style={{
                                                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                                                    }}
                                                >
                                                    -{Math.round(((product?.price - product?.sellingPrice) / product?.price) * 100)}%
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

export default VerticalCardProduct;
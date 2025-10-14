import React, { useContext, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import scrollTop from '../helpers/scrollTop';
import Context from '../context';
import addToCart from '../helpers/addToCart';
import { Link } from 'react-router-dom';
import displayPYGCurrency from '../helpers/displayCurrency';
import { FaShoppingCart } from 'react-icons/fa';
import { trackViewContent, trackAddToCart } from './MetaPixelTracker';

const VerticalCard = ({ loading, data = [] }) => {
    const loadingList = useMemo(() => new Array(12).fill(null), []);
    const { fetchUserAddToCart } = useContext(Context);
    const cardContainerRef = useRef(null);
    const [imageErrors, setImageErrors] = useState(new Set());
    const [hoveredProductId, setHoveredProductId] = useState(null);
    const [hoverTimeout, setHoverTimeout] = useState(null);
    const [viewedProducts, setViewedProducts] = useState(new Set());
    const observerRef = useRef(null);

   // ✅ PRELOAD ULTRA RÁPIDO - TODAS LAS IMÁGENES INMEDIATAMENTE
useEffect(() => {
    if (data.length > 0) {
        // Precargar TODAS las imágenes principales inmediatamente
        data.forEach((product, index) => {
            if (product?.productImage?.[0]) {
                // Precargar imagen principal inmediatamente
                const img = new Image();
                img.src = product.productImage[0];
                img.loading = 'eager'; // Forzar carga inmediata
                
                // Precargar segunda imagen inmediatamente también
                if (product?.productImage?.[1]) {
                    const img2 = new Image();
                    img2.src = product.productImage[1];
                    img2.loading = 'eager';
                }
            }
        });
    }
}, [data]);
// ✅ INTERSECTION OBSERVER PARA TRACKEAR VIEW CONTENT
    useEffect(() => {
        if (!data.length) return;
        
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const productId = entry.target.dataset.productId;
                        const product = data.find(p => p._id === productId);
                        
                        if (product && !viewedProducts.has(productId)) {
                            setViewedProducts(prev => new Set([...prev, productId]));
                            trackViewContent(product);
                        }
                    }
                });
            },
            {
                threshold: 0.5, // 50% del producto visible
                rootMargin: '0px'
            }
        );

        // Observar todos los productos
        const productElements = document.querySelectorAll('[data-product-id]');
        productElements.forEach(el => {
            observerRef.current.observe(el);
        });

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [data, viewedProducts]);

    const handleAddToCart = useCallback((e, product) => {
        e.stopPropagation();
        e.preventDefault();
        
        // ✅ TRACKEAR ADD TO CART CON ID CONSISTENTE
        trackAddToCart(product);
        
        addToCart(e, product);
        fetchUserAddToCart();
    }, [fetchUserAddToCart]);

    const calculateDiscount = useCallback((price, sellingPrice) => {
        if (price && price > 0) {
            const discount = Math.round(((price - sellingPrice) / price) * 100);
            return discount > 0 ? discount : null;
        }
        return null;
    }, []);

    const handleImageError = useCallback((productId) => {
        setImageErrors(prev => new Set([...prev, productId]));
    }, []);

    if (loading) {
        return (
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4'>
                {loadingList.map((_, index) => (
                    <div
                        key={index}
                        className='w-full h-[280px] sm:h-[300px] bg-white rounded-lg shadow-sm border animate-pulse flex flex-col'
                    >
                        <div className='bg-gray-200 h-32 sm:h-36 rounded-t-lg'></div>
                        <div className='p-2.5 flex flex-col flex-grow space-y-1.5'>
                            <div className='h-4 bg-gray-200 rounded'></div>
                            <div className='h-3 bg-gray-200 rounded w-2/3'></div>
                            <div className='h-6 bg-gray-200 rounded mt-auto'></div>
                            <div className='h-8 bg-gray-200 rounded'></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div 
            className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4'
            ref={cardContainerRef}
        >
            {data
                .filter(product => {
                    // Filtrar productos sin stock
                    // Si stock es undefined, null o mayor a 0, mostrar el producto
                    return product?.stock === undefined || product?.stock === null || product?.stock > 0;
                })
                .map((product) => {
                const discount = calculateDiscount(product?.price, product?.sellingPrice);
                const hasImageError = imageErrors.has(product._id);
                const isHovered = hoveredProductId === product?._id;
                const secondImage = product.productImage?.[1];
                const showSecondImage = isHovered && secondImage;
                
                // Funciones para manejar hover con delay
                const handleMouseEnter = () => {
                    // Limpiar cualquier timeout previo
                    if (hoverTimeout) {
                        clearTimeout(hoverTimeout);
                    }
                    
                    // Establecer nuevo timeout de 300ms
                    const timeout = setTimeout(() => {
                        setHoveredProductId(product?._id);
                    }, 300);
                    
                    setHoverTimeout(timeout);
                };
                
                const handleMouseLeave = () => {
                    // Limpiar timeout si existe
                    if (hoverTimeout) {
                        clearTimeout(hoverTimeout);
                        setHoverTimeout(null);
                    }
                    
                    // Inmediatamente quitar el hover
                    setHoveredProductId(null);
                };
                
                return (
                    <Link
                        to={`/producto/${product?.slug || product?._id}`} 
                        key={product._id}
                        data-product-id={product._id}
                        className='w-full h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group/card relative flex flex-col overflow-hidden'
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
                        {/* Imagen del producto */}
                        <div className='h-32 sm:h-36 rounded-t-xl flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100'>
                            {!hasImageError ? (
                                <>
                                    {/* Imagen principal */}
                                    <img
                                        src={product.productImage[0]}
                                        alt={product.productName}
                                        className={`object-contain h-full w-full transition-all duration-500 ease-in-out ${
                                            showSecondImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                        }`}
                                        loading="eager"
                                        onError={() => handleImageError(product._id)}
                                        decoding="async"
                                        fetchPriority="high"
                                        style={{ 
                                            contentVisibility: 'auto',
                                            willChange: 'transform, opacity'
                                        }}
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    />
                                    
                                    {/* Imagen de hover (segunda imagen) */}
                                    {secondImage && (
                                        <img
                                            src={secondImage}
                                            alt={`${product.productName} - Vista adicional`}
                                            className={`absolute inset-0 object-contain h-full w-full transition-all duration-500 ease-in-out ${
                                                showSecondImage ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                                            }`}
                                            loading="lazy"
                                            decoding="async"
                                            fetchPriority="low"
                                            style={{ 
                                                contentVisibility: 'auto',
                                                willChange: 'transform, opacity'
                                            }}
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <div className="text-gray-400 text-center">
                                        <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs">Sin imagen</span>
                                    </div>
                                </div>
                            )}

                            {/* Badge de descuento - estilo del Header */}
                            {discount && (
                                <div className="absolute top-2 left-2">
                                    <span 
                                        className='text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg'
                                        style={{
                                            background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                                        }}
                                    >
                                        -{discount}% OFF
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Detalles del producto - ESTRUCTURA FIJA */}
                        <div className='p-2.5 flex flex-col flex-grow'>
                            {/* Contenido superior que puede variar */}
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
                            
                            {/* Contenido inferior fijo - SIEMPRE EN LA MISMA POSICIÓN */}
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
                    </Link>
                );
            })}
        </div>
    );
};

export default VerticalCard;
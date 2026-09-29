import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaAngleLeft, FaAngleRight, FaShoppingCart } from 'react-icons/fa';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import { productPath } from '../helpers/productPath';
import addToCart from '../helpers/addToCart';
import scrollTop from '../helpers/scrollTop';
import { getVisitorId } from '../helpers/behaviorTracker';

export default function HomeInterest() {
    const [products, setProducts] = useState([]);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);
    const scroller = useRef(null);

    useEffect(() => {
        const visitorId = getVisitorId();
        if (!visitorId) return undefined;
        let ignore = false;
        fetch(`${SummaryApi.baseURL}/api/analitica/inicio?visitorId=${encodeURIComponent(visitorId)}`)
            .then((response) => response.json())
            .then((data) => {
                if (!ignore) setProducts(Array.isArray(data.data) ? data.data : []);
            })
            .catch(() => {
                if (!ignore) setProducts([]);
            });
        return () => {
            ignore = true;
        };
    }, []);

    const checkScroll = () => {
        const node = scroller.current;
        if (!node) return;
        setShowLeft(node.scrollLeft > 8);
        setShowRight(node.scrollLeft < node.scrollWidth - node.clientWidth - 8);
    };

    useEffect(() => {
        checkScroll();
    }, [products]);

    if (!products.length) return null;

    return (
        <section className="w-full">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Lo que miraste</h2>
            <div className="h-1 w-16 mt-2 rounded-full mb-2" style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}></div>
            <div className="relative">
                {showLeft && (
                    <button type="button" aria-label="Anterior" onClick={() => scroller.current?.scrollBy({ left: -220, behavior: 'smooth' })} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 sm:p-3 shadow-md">
                        <FaAngleLeft className="text-[#7B2CBF]" />
                    </button>
                )}
                {showRight && (
                    <button type="button" aria-label="Siguiente" onClick={() => scroller.current?.scrollBy({ left: 220, behavior: 'smooth' })} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 sm:p-3 shadow-md">
                        <FaAngleRight className="text-[#7B2CBF]" />
                    </button>
                )}
                <div ref={scroller} onScroll={checkScroll} className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth py-4 overscroll-x-contain touch-pan-x">
                    {products.map((product) => {
                        const discount = product.price > product.sellingPrice
                            ? Math.round(((product.price - product.sellingPrice) / product.price) * 100)
                            : null;
                        return (
                            <Link
                                key={product._id}
                                to={productPath(product)}
                                onClick={scrollTop}
                                className="snap-center flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] h-[280px] sm:h-[300px] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden"
                                style={{
                                    border: '2px solid transparent',
                                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                                    backgroundOrigin: 'border-box',
                                    backgroundClip: 'padding-box, border-box'
                                }}
                            >
                                <div className="h-32 sm:h-36 rounded-t-xl flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100">
                                    <img src={product.productImage?.[0]} alt={product.productName} className="object-contain h-full w-full" loading="lazy" />
                                    {discount > 0 && (
                                        <span className="absolute top-1.5 left-1.5 text-white text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}>
                                            -{discount}%
                                        </span>
                                    )}
                                </div>
                                <div className="p-2.5 flex flex-col flex-grow min-h-0">
                                    <h3 className="font-medium text-xs text-gray-600 leading-tight line-clamp-4 min-h-[2.8rem]">{product.productName}</h3>
                                    <div className="text-xs text-gray-500 uppercase font-medium tracking-wide mt-1 truncate">{product.brandName}</div>
                                    <div className="mt-auto space-y-2">
                                        <div className="text-lg font-bold text-black text-center">{displayPYGCurrency(product.sellingPrice)}</div>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                addToCart(event, product);
                                            }}
                                            className="w-full flex items-center justify-center gap-1 text-white px-3 py-2 rounded-lg text-xs font-medium"
                                            style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
                                        >
                                            <FaShoppingCart size={11} />
                                            <span>Agregar</span>
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

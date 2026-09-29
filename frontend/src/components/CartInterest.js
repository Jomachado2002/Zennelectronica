import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaAngleLeft, FaAngleRight, FaShoppingCart } from 'react-icons/fa';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import { productPath } from '../helpers/productPath';
import addToCart from '../helpers/addToCart';
import scrollTop from '../helpers/scrollTop';
import {
    getVisitorId,
    syncCart
} from '../helpers/behaviorTracker';

export default function CartInterest({ items }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);
    const scroller = useRef(null);

    useEffect(() => {
        syncCart(items);
    }, [items]);

    const cartKey = (Array.isArray(items) ? items : []).map((item) => {
        const source = item.productId && typeof item.productId === 'object' ? item.productId : item;
        return `${source._id || item.productId || ''}:${item.addedAt || ''}`;
    }).join('|');

    useEffect(() => {
        const visitorId = getVisitorId();
        if (!visitorId) return;
        const ids = (Array.isArray(items) ? [...items] : [])
            .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')))
            .map((item) => {
                const source = item.productId && typeof item.productId === 'object' ? item.productId : item;
                return String(source._id || item.productId || '');
            })
            .filter((value) => /^[a-f\d]{24}$/i.test(value));
        if (!ids.length) {
            setSuggestions([]);
            return undefined;
        }
        const params = new URLSearchParams({ visitorId, cart: ids.join(',') });
        const cacheKey = `zenn_sugerencias_${ids.join(',')}`;
        try {
            const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
            if (Array.isArray(cached) && cached.length) setSuggestions(cached);
        } catch (error) {
            // Si el navegador bloquea la sesión, se pide igual al servidor.
        }
        let ignore = false;
        fetch(`${SummaryApi.baseURL}/api/analitica/sugerencias?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                const next = Array.isArray(data.data) ? data.data : [];
                if (ignore) return;
                setSuggestions(next);
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(next));
                } catch (error) {
                    // La fila igual queda en pantalla.
                }
            })
            .catch(() => {
                if (!ignore) setSuggestions((current) => current);
            });
        return () => {
            ignore = true;
        };
    }, [cartKey]);

    const checkScroll = () => {
        const node = scroller.current;
        if (!node) return;
        setShowLeft(node.scrollLeft > 8);
        setShowRight(node.scrollLeft < node.scrollWidth - node.clientWidth - 8);
    };

    useEffect(() => {
        checkScroll();
    }, [suggestions]);

    const slide = (direction) => {
        scroller.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });
    };

    const addSuggested = (event, product) => {
        event.preventDefault();
        event.stopPropagation();
        addToCart(event, product);
        setSuggestions((current) => current.filter((item) => item._id !== product._id));
    };

    if (!suggestions.length) return null;

    return (
        <div className="mt-8">
                <section className="relative">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Según lo que estuviste mirando</h2>
                    <div className="h-1 w-16 bg-[#002060] mt-2 rounded-full mb-2"></div>
                    <div className="relative group">
                        {showLeft && (
                            <button
                                type="button"
                                onClick={() => slide(-1)}
                                aria-label="Anterior"
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 sm:p-3 shadow-md"
                            >
                                <FaAngleLeft className="text-[#002060]" />
                            </button>
                        )}
                        {showRight && (
                            <button
                                type="button"
                                onClick={() => slide(1)}
                                aria-label="Siguiente"
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 sm:p-3 shadow-md"
                            >
                                <FaAngleRight className="text-[#002060]" />
                            </button>
                        )}
                        <div
                            ref={scroller}
                            onScroll={checkScroll}
                            className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth py-4 overscroll-x-contain touch-pan-x"
                        >
                            {suggestions.map((product) => {
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
                                            <img
                                                src={product.productImage?.[0]}
                                                alt={product.productName}
                                                className="object-contain h-full w-full"
                                                loading="lazy"
                                            />
                                            {discount > 0 && (
                                                <span
                                                    className="absolute top-1.5 left-1.5 text-white text-[10px] font-bold px-2 py-1 rounded-full"
                                                    style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
                                                >
                                                    -{discount}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-2.5 flex flex-col flex-grow">
                                            <div className="space-y-1.5">
                                                <h3 className="font-medium text-xs text-gray-600 leading-tight line-clamp-4 min-h-[2.8rem] break-words">
                                                    {product.productName}
                                                </h3>
                                                <div className="text-xs text-gray-500 uppercase font-medium tracking-wide truncate">
                                                    {product.brandName}
                                                </div>
                                            </div>
                                            <div className="mt-auto space-y-2">
                                                <div className="text-lg font-bold text-black text-center">
                                                    {displayPYGCurrency(product.sellingPrice)}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(event) => addSuggested(event, product)}
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
        </div>
    );
}

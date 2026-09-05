import React, { useEffect, useRef, useState } from 'react';
import SummaryApi from '../../common';
import { authGet } from '../../helpers/authFetch';
import displayPYGCurrency from '../../helpers/displayCurrency';
import { formatUsd } from '../../helpers/tradeTax';

export function getProductUnitPrice(product, mode, currency = 'PYG', exchangeRate = 7300) {
  const rate = Number(exchangeRate || 0);
  if (mode === 'purchase') {
    const usd = Number(product.purchasePriceUSD || 0);
    if (currency === 'USD') return usd;
    return Math.round(usd * rate);
  }
  const pyg = Number(product.sellingPrice || product.salesPrice || product.price || 0);
  if (currency === 'PYG' || rate <= 0) return pyg;
  return Math.round((pyg / rate) * 100) / 100;
}

export function getProductDisplayName(product) {
  return product.productName || product.name || '';
}

const ProductPicker = ({
  mode = 'sale',
  query,
  onQueryChange,
  onSelect,
  disabled = false
}) => {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!open || !query || query.trim().length < 2) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await authGet(
          `${SummaryApi.baseURL}/api/finanzas/ventas/productos/buscar?query=${encodeURIComponent(query)}&mode=${mode}&limit=20`
        );
        const result = await response.json();
        if (!cancelled) setResults(result.success ? (result.data || []) : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, mode]);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        disabled={disabled}
        onChange={(e) => {
          onQueryChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar producto por nombre o código"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2A3190] focus:ring-2 focus:ring-[#2A3190]/20"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-[min(36rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {loading && <div className="p-3 text-sm text-slate-500">Buscando productos...</div>}
          {!loading && results.map((product) => {
            const image = Array.isArray(product.productImage) ? product.productImage[0] : product.productImage;
            return (
              <button
                type="button"
                key={product._id}
                onClick={() => {
                  onSelect?.(product);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-slate-50">
                  {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-slate-300">📦</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{getProductDisplayName(product)}</p>
                  <p className="text-xs text-slate-500">
                    {product.codigo || product.code || 's/código'} · {product.brandName || ''} · stock {product.stock ?? 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-700">{displayPYGCurrency(product.sellingPrice || 0)}</p>
                  {Number(product.purchasePriceUSD) > 0 && (
                    <p className="text-[11px] text-orange-600">Costo {formatUsd(product.purchasePriceUSD)}</p>
                  )}
                </div>
              </button>
            );
          })}
          {!loading && results.length === 0 && (
            <div className="p-3 text-sm text-slate-500">Sin productos para “{query}”.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductPicker;

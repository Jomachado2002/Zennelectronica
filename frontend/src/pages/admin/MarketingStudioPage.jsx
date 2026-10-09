import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaMagic, FaSearch, FaSpinner } from 'react-icons/fa';
import axiosInstance from '../../config/axiosInstance';

const SAMPLE = {
  id: '34115',
  codigo: '34115',
  brandName: 'Mtek',
  productName: 'Gabinete Mtek',
  title: 'Gabinete Mtek',
  price: '',
  listPrice: '',
  onOffer: false,
  discountPercent: 0,
  family: '',
  imageUrl: 'https://cdn.zenn.com.py/products/cd37a528-61cb-41c1-95c7-ca880999ff3e_34115_0.jpg'
};

const TEMPLATES = [
  {
    id: 'precio',
    name: 'Precio',
    use: 'La del catálogo. Fondo blanco, producto entero y el precio en una pastilla, sin tapar la foto.'
  },
  {
    id: 'oferta',
    name: 'Oferta',
    use: 'Solo si el descuento es real. Precio nuevo, el anterior tachado y el porcentaje en cian.'
  },
  {
    id: 'notebook',
    name: 'Notebook',
    use: 'Notebooks y marcas conocidas. Logo de la marca más grande, nombre en una línea y el precio.'
  }
];

function recommendTemplate(product) {
  if (product?.onOffer) return 'oferta';
  if (product?.family === 'notebook') return 'notebook';
  return 'precio';
}

function CatalogPlate({ product = {}, templateId = 'precio', logoUrl = '', compact = false }) {
  const {
    imageUrl,
    title,
    productName,
    brandName,
    price,
    listPrice,
    onOffer,
    discountPercent
  } = product;

  const name = productName || title || '';
  const toDigits = (value) => {
    const digits = String(value ?? '').replace(/[^\d]/g, '');
    return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  };
  const toNumber = (value) => {
    const digits = String(value ?? '').replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  const priceText = toDigits(price);
  const listText = toDigits(listPrice);
  const priceNum = toNumber(price);
  const listNum = toNumber(listPrice);
  const hasRealOffer = Boolean(onOffer) && listNum > priceNum && priceNum > 0;
  const showOffer = templateId === 'oferta' && hasRealOffer;
  const percent = showOffer
    ? (Number(discountPercent) > 0
      ? Math.round(Number(discountPercent))
      : Math.round((1 - priceNum / listNum) * 100))
    : 0;
  const isNotebook = templateId === 'notebook';
  const priceFill = 'linear-gradient(135deg, #00B5D8, #7B2CBF)';

  const s = compact
    ? {
      edge: 'p-2',
      imgPad: 'p-[6%]',
      line: 'h-[3px]',
      zenn: 'h-3',
      brandLogo: isNotebook ? 'h-5 max-w-[56px]' : 'h-4 max-w-[44px]',
      brandChip: 'rounded-md px-1 py-0.5',
      brandText: 'text-[7px]',
      name: 'text-[9px]',
      pill: 'rounded-lg px-2 py-1',
      gs: 'text-[7px]',
      amount: 'text-[16px]',
      list: 'text-[8px]',
      chip: 'rounded px-1 py-px text-[8px]',
      gap: 'gap-1'
    }
    : {
      edge: 'p-4',
      imgPad: 'p-[7%]',
      line: 'h-[5px]',
      zenn: 'h-7',
      brandLogo: isNotebook ? 'h-12 max-w-[150px]' : 'h-9 max-w-[120px]',
      brandChip: 'rounded-xl px-2.5 py-1.5',
      brandText: 'text-[13px]',
      name: 'text-[18px]',
      pill: 'rounded-2xl px-4 py-3',
      gs: 'text-[14px]',
      amount: 'text-[34px]',
      list: 'text-[15px]',
      chip: 'rounded-lg px-2.5 py-0.5 text-[16px]',
      gap: 'gap-2'
    };

  return (
    <div
      className="relative flex aspect-square w-full flex-col overflow-hidden bg-white"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className={`shrink-0 ${s.line}`} style={{ background: priceFill }} />
      <div className="relative min-h-0 flex-1">
        {imageUrl ? (
          <img src={imageUrl} alt="" className={`absolute inset-0 h-full w-full object-contain ${s.imgPad}`} draggable={false} />
        ) : null}
        <div className={`absolute left-0 top-0 ${s.edge}`}>
          {logoUrl ? (
            <div className={`flex items-center bg-white ring-1 ring-slate-200 ${s.brandChip}`}>
              <img src={logoUrl} alt={brandName || ''} className={`w-auto object-contain ${s.brandLogo}`} draggable={false} />
            </div>
          ) : brandName ? (
            <span className={`block font-bold uppercase tracking-widest text-slate-500 ${s.brandText}`}>
              {brandName}
            </span>
          ) : null}
        </div>
        <div className={`absolute right-0 top-0 ${s.edge}`}>
          <img src="/logozenn.svg" alt="Zenn" className={`w-auto object-contain ${s.zenn}`} draggable={false} />
        </div>
      </div>
      <div className={`flex shrink-0 items-stretch ${s.edge} ${s.gap}`}>
        {name ? (
          <p className={`min-w-0 flex-1 self-center font-semibold leading-snug tracking-tight ${s.name}`} style={{ color: '#14122e' }}>
            {name}
          </p>
        ) : <span className="flex-1" />}
        {priceText ? (
          <div
            className={`flex shrink-0 flex-col items-end justify-center text-white ${s.pill}`}
            style={{ background: priceFill, textShadow: '0 1px 1px rgba(20, 10, 40, 0.28)' }}
          >
            {showOffer && percent > 0 ? (
              <span className={`mb-1 font-extrabold tracking-tight ${s.chip}`} style={{ background: 'rgba(255,255,255,0.22)' }}>
                -{percent}%
              </span>
            ) : null}
            {showOffer && listText ? (
              <span className={`font-semibold leading-none line-through ${s.list}`}>
                Gs. {listText}
              </span>
            ) : null}
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className={`font-bold ${s.gs}`}>Gs.</span>
              <span className={`font-extrabold tracking-tight ${s.amount}`}>{priceText}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const MarketingStudioPage = () => {
  const [templateId, setTemplateId] = useState('precio');
  const [query, setQuery] = useState('34115');
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(SAMPLE);
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const template = TEMPLATES.find((item) => item.id === templateId) || TEMPLATES[0];
  const suggested = useMemo(() => recommendTemplate(product), [product]);

  const loadProducts = useCallback(async (nextQuery) => {
    const q = String(nextQuery ?? '').trim();
    setLoading(true);
    setNote('');
    try {
      const requests = [
        axiosInstance.get('/api/creativos/productos', { params: { q: q || '34115', limit: 12 } })
      ];
      if (!q) {
        requests.push(
          axiosInstance.get('/api/creativos/productos', { params: { offers: '1', limit: 8 } }),
          axiosInstance.get('/api/creativos/productos', {
            params: { category: 'notebook_y_computadoras', limit: 8 }
          })
        );
      }
      const responses = await Promise.all(requests);
      const seen = new Set();
      const rows = [];
      responses.forEach((res) => {
        (res.data?.data || []).forEach((row) => {
          if (!row?.id || seen.has(row.id)) return;
          seen.add(row.id);
          rows.push(row);
        });
      });
      setProducts(rows);
      const first = rows[0];
      if (first) {
        setProduct(first);
        setTemplateId(recommendTemplate(first));
      } else {
        setNote('No encontré productos con esa búsqueda. Sigue el ejemplo de la foto.');
        setProduct(SAMPLE);
      }
    } catch (error) {
      setNote('No pude cargar productos. Reviso la foto de ejemplo para que veas la plantilla.');
      setProduct(SAMPLE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts('34115');
  }, [loadProducts]);

  useEffect(() => {
    const brand = product?.brandName;
    if (!brand) {
      setLogoUrl('');
      return;
    }
    let cancel = false;
    axiosInstance
      .get(`/api/brands/by-name/${encodeURIComponent(brand)}`)
      .then((res) => {
        if (!cancel) setLogoUrl(res.data?.data?.logoUrl || '');
      })
      .catch(() => {
        if (!cancel) setLogoUrl('');
      });
    return () => {
      cancel = true;
    };
  }, [product?.brandName]);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
          <FaMagic style={{ color: '#7B2CBF' }} />
          Marketing IA
        </h1>
        <p className="text-sm text-zinc-600 mt-2 max-w-3xl">
          Acá se elige la plantilla del catálogo. La foto del producto queda grande y el precio se lee de un vistazo.
          Estas piezas todavía no reemplazan las imágenes que Meta está importando: primero dejamos el diseño y después se aplican.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_300px] gap-5 items-start">
        <div className="space-y-3">
          {TEMPLATES.map((item) => {
            const active = item.id === templateId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTemplateId(item.id)}
                className="w-full text-left rounded-xl border bg-white overflow-hidden flex gap-3 p-2"
                style={{ borderColor: active ? '#1E1B4B' : '#e5e7eb', boxShadow: active ? 'inset 0 0 0 2px #1E1B4B' : 'none' }}
              >
                <div className="w-24 shrink-0">
                  <CatalogPlate product={product} templateId={item.id} logoUrl={logoUrl} compact />
                </div>
                <div className="min-w-0 py-1 pr-1">
                  <div className="font-semibold text-zinc-900">{item.name}</div>
                  <p className="text-xs text-zinc-600 mt-1">{item.use}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Vista del catálogo · cuadrado</div>
              <div className="font-semibold text-zinc-900">{template.name}</div>
            </div>
            {suggested !== templateId ? (
              <button
                type="button"
                onClick={() => setTemplateId(suggested)}
                className="text-sm font-semibold px-3 py-2 rounded-full text-white"
                style={{ background: '#7B2CBF' }}
              >
                Usar la recomendada
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700">Recomendada para este producto</span>
            )}
          </div>
          <div className="max-w-[560px] mx-auto">
            <CatalogPlate product={product} templateId={templateId} logoUrl={logoUrl} />
          </div>
          <p className="text-sm text-zinc-600 mt-4">{template.use}</p>
        </div>

        <div className="space-y-4">
          <form
            className="bg-white border border-zinc-200 rounded-xl p-4"
            onSubmit={(event) => {
              event.preventDefault();
              loadProducts(query);
            }}
          >
            <label className="block text-sm font-medium text-zinc-800 mb-2">Probar con un producto</label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Código, marca o nombre"
                className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="px-3 rounded-lg text-white"
                style={{ background: '#1E1B4B' }}
                aria-label="Buscar producto"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
              </button>
            </div>
            {note ? <p className="text-xs text-amber-700 mt-2">{note}</p> : null}
          </form>

          <div className="bg-white border border-zinc-200 rounded-xl p-2 max-h-[420px] overflow-auto">
            {products.map((row) => {
              const active = row.id === product?.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setProduct(row);
                    setTemplateId(recommendTemplate(row));
                  }}
                  className="w-full flex items-center gap-3 text-left rounded-lg px-2 py-2"
                  style={{ background: active ? '#eef2ff' : 'transparent' }}
                >
                  <img src={row.imageUrl} alt="" className="w-12 h-12 object-contain bg-zinc-100 rounded" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 truncate">{row.title || row.productName}</span>
                    <span className="block text-xs text-zinc-500">{row.brandName} · {row.price}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-zinc-950 text-white rounded-xl p-4 text-sm">
            <div className="font-semibold mb-2">Cómo se va a usar</div>
            <p className="text-zinc-300">
              La foto se deja como viene, en blanco. El producto ocupa el cuadro. El precio, el nombre y los logos quedan en las esquinas.
              Oferta solo si el descuento es real. El logo de Zenn va a color, chico, arriba a la derecha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingStudioPage;

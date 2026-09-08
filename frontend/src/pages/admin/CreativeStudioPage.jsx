import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaBullhorn,
  FaCheck,
  FaDownload,
  FaFilter,
  FaSearch,
  FaSpinner,
  FaImage,
  FaCopy
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

const QUICK = [
  { label: 'Notebooks oficina', category: 'notebook_y_computadoras', subcategory: 'notebook__20_03', lane: 'office' },
  { label: 'Notebooks gamer', category: 'notebook_y_computadoras', subcategory: 'notebook__20_03', lane: 'gamer' },
  { label: 'Monitores', category: 'monitores', subcategory: 'monitores__27', lane: 'all' },
  { label: 'Celulares', group: 'phones', category: 'celulares_y_tablets', subcategory: 'smartphones_y_celulares__32_01', lane: 'all' },
  { label: 'iPhone', category: 'apple', subcategory: 'iphone__19_04', lane: 'all' },
  { label: 'Gabinetes', category: 'gabinetes', subcategory: 'gabinetes__28', lane: 'all' },
  { label: 'Auriculares', group: 'headphones', category: 'perifericos', subcategory: 'auriculares_y_accesorios__30_05', lane: 'all' }
];

const FORMAT_OPTIONS = [
  { id: 'feed', label: 'Feed 4:5', hint: '1080×1350' },
  { id: 'story', label: 'Story 9:16', hint: '1080×1920' },
  { id: 'square', label: 'Cuadrado', hint: '1080×1080' }
];

const PREVIEW_SIZE = {
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 }
};

async function saveBlob(blob, fileName) {
  const type = blob.type || (fileName.endsWith('.zip') ? 'application/zip' : 'image/png');
  try {
    const file = new File([blob], fileName, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function errorFromAxios(err, fallback) {
  const data = err?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed && parsed.message) return parsed.message;
    } catch {
      /* no era JSON */
    }
  }
  return data?.message || fallback;
}

function captionFor(product, title) {
  if (!product) return '';
  const rest = String(product.instagramCaption || '')
    .split('\n')
    .slice(1)
    .join('\n')
    .trim();
  const head = title || product.title || '';
  const shortTitle = head.length > 28 ? `${head.slice(0, 27).trim()}…` : head;
  if (rest) return `${shortTitle}\n${rest}`.trim();
  const specs = (product.specs || []).map((s) => s.text).filter(Boolean).slice(0, 3).join(' · ');
  return [shortTitle, specs, `${product.price} · 24 h`, 'WhatsApp 0973 345 284'].filter(Boolean).join('\n');
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMsg);
  } catch {
    toast.error('No se pudo copiar');
  }
}

const CreativeStudioPage = () => {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [q, setQ] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [formats, setFormats] = useState(['feed']);
  const [previewFormat, setPreviewFormat] = useState('feed');
  const [theme, setTheme] = useState('auto');
  const [lane, setLane] = useState('all');
  const [group, setGroup] = useState('');
  const [listTotal, setListTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadingOne, setDownloadingOne] = useState(false);
  const [overrides, setOverrides] = useState({});

  const toggleFormat = (id) => {
    setFormats((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((x) => x !== id);
        setPreviewFormat((cur) => (next.includes(cur) ? cur : next[0]));
        return next;
      }
      setPreviewFormat(id);
      return [...prev, id];
    });
  };

  const subcategories = useMemo(() => {
    const cat = categories.find((c) => c.value === category);
    return cat?.subcategories || [];
  }, [categories, category]);

  const activeProduct = products.find((p) => p.id === activeId);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get('/api/creativos/categorias');
        if (res.data?.success) setCategories(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar las categorías');
      }
    };
    load();
  }, []);

  const fetchProducts = useCallback(async (next = {}) => {
    const cat = next.category ?? category;
    const sub = next.subcategory ?? subcategory;
    const query = next.q ?? q;
    const nextLane = next.lane ?? lane;
    const nextGroup = next.group !== undefined ? next.group : group;
    const append = Boolean(next.append);
    const skip = Number(next.skip) || 0;
    if (!cat && !nextGroup) {
      toast.info('Elegí una categoría o un atajo (Notebooks, iPhone, Gabinetes…)');
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/creativos/productos', {
        params: {
          category: nextGroup ? undefined : cat,
          subcategory: nextGroup ? undefined : (sub || undefined),
          group: nextGroup || undefined,
          q: query || undefined,
          theme,
          lane: nextLane,
          limit: 400,
          skip
        }
      });
      if (res.data?.success) {
        const incoming = res.data.data || [];
        setProducts((prev) => (append ? [...prev, ...incoming] : incoming));
        setListTotal(res.data.total || incoming.length);
        setHasMore(Boolean(res.data.hasMore));
        if (!append) {
          setSelected([]);
          const first = incoming[0];
          setActiveId(first?.id || '');
          setTitleDraft(first?.title || '');
          setImageIndex(0);
        }
        const shown = (append ? skip : 0) + incoming.length;
        toast.success(`${res.data.total || shown} productos con stock${shown < (res.data.total || shown) ? ` · mostrando ${shown}` : ''}`);
      } else {
        toast.error(res.data?.message || 'Error cargando productos');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error cargando productos');
    } finally {
      setLoading(false);
    }
  }, [category, subcategory, q, theme, lane, group]);

  useEffect(() => {
    if (!activeId) {
      setPreviewHtml('');
      return undefined;
    }
    const product = products.find((p) => p.id === activeId);
    if (!product) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await axiosInstance.get(`/api/creativos/html/${activeId}`, {
          params: {
            format: previewFormat,
            theme: theme === 'auto' ? undefined : theme,
            title: titleDraft || product.title,
            imageIndex
          },
          responseType: 'text',
          transformResponse: [(data) => data],
          timeout: 180000
        });
        if (!cancelled) setPreviewHtml(res.data || '');
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error('No se pudo armar el preview');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [activeId, previewFormat, theme, titleDraft, imageIndex, products]);

  const applyQuick = (pack) => {
    setCategory(pack.category);
    setSubcategory(pack.subcategory);
    setQ('');
    setLane(pack.lane || 'all');
    setGroup(pack.group || '');
    fetchProducts({
      category: pack.category,
      subcategory: pack.subcategory,
      q: '',
      lane: pack.lane || 'all',
      group: pack.group || '',
      skip: 0
    });
  };

  const isQuickOn = (pack) => {
    if (pack.group) return group === pack.group && lane === (pack.lane || 'all');
    return !group && category === pack.category && subcategory === pack.subcategory && lane === (pack.lane || 'all');
  };

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectVisible = () => {
    const ids = products.slice(0, 30).map((p) => p.id);
    setSelected(ids);
  };

  const persistOverride = (id, patch) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const onTitleChange = (value) => {
    setTitleDraft(value);
    if (activeId) persistOverride(activeId, { title: value, imageIndex });
  };

  const activeCaption = activeProduct ? captionFor(activeProduct, titleDraft) : '';

  const copyActiveCaption = () => {
    if (!activeCaption) return;
    copyText(activeCaption, 'Texto de Instagram copiado');
  };

  const copyCarouselCaptions = () => {
    const ids = selected.length ? selected : (activeId ? [activeId] : []);
    if (!ids.length) {
      toast.info('Seleccioná productos o dejá uno abierto');
      return;
    }
    const block = ids.map((id, i) => {
      const p = products.find((x) => x.id === id);
      if (!p) return '';
      const title = overrides[id]?.title || (id === activeId ? titleDraft : p.title);
      return `—— Foto ${i + 1} ——\n${captionFor(p, title)}`;
    }).filter(Boolean).join('\n\n');
    copyText(block, `${ids.length} textos listos para el carrusel`);
  };

  const downloadOne = async () => {
    if (!activeId) return;
    try {
      setDownloadingOne(true);
      const res = await axiosInstance.get(`/api/creativos/descargar/${activeId}`, {
        params: {
          format: previewFormat,
          theme: theme === 'auto' ? undefined : theme,
          title: titleDraft,
          imageIndex
        },
        responseType: 'blob',
        timeout: 180000
      });
      const name = `zenn-${(titleDraft || 'producto').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${previewFormat}.png`;
      await saveBlob(res.data, name);
    } catch (err) {
      console.error(err);
      toast.error(await errorFromAxios(err, 'No se pudo descargar el PNG'));
    } finally {
      setDownloadingOne(false);
    }
  };

  const exportZip = async () => {
    const ids = selected.length ? selected : (activeId ? [activeId] : []);
    if (!ids.length) {
      toast.info('Seleccioná productos o dejá uno abierto en el preview');
      return;
    }
    if (ids.length > 30) {
      toast.error('Máximo 30 productos por descarga');
      return;
    }
    try {
      setExporting(true);
      const res = await axiosInstance.post(
        '/api/creativos/exportar',
        {
          productIds: ids,
          formats,
          theme: theme === 'auto' ? undefined : theme,
          overrides
        },
        { responseType: 'blob', timeout: 300000 }
      );
      await saveBlob(res.data, `zenn-creativos-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success('ZIP listo para Instagram y Facebook');
    } catch (err) {
      console.error(err);
      toast.error(await errorFromAxios(err, 'Error exportando el ZIP'));
    } finally {
      setExporting(false);
    }
  };

  const size = PREVIEW_SIZE[previewFormat] || PREVIEW_SIZE.feed;
  const scale = Math.min(360 / size.w, 520 / size.h);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaBullhorn className="mr-3" style={{ color: '#7B2CBF' }} />
                Estudio de creativos
              </h1>
              <p className="text-gray-600 mt-1">
                Filtrá, previsualizá y descargá flyers listos para Instagram y Facebook. Logo, precio, specs y sello de 24 h ya van en la plantilla.
              </p>
            </div>
            <button
              type="button"
              onClick={exportZip}
              disabled={exporting || (!selected.length && !activeId)}
              className="px-5 py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#7B2CBF' }}
            >
              {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              {exporting ? 'Generando ZIP…' : `Descargar ZIP (${selected.length || (activeId ? 1 : 0)})`}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaFilter className="mr-2" style={{ color: '#00B5D8' }} />
                Qué publicar
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK.map((pack) => (
                  <button
                    key={pack.label}
                    type="button"
                    onClick={() => applyQuick(pack)}
                    className="px-3 py-2 text-sm font-semibold rounded-full border hover:opacity-90"
                    style={
                      isQuickOn(pack)
                        ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                        : { color: '#1E1B4B', borderColor: '#C7D2FE', background: '#fff' }
                    }
                  >
                    {pack.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'gamer', label: 'Con GPU' },
                  { id: 'office', label: 'Oficina' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setLane(opt.id);
                      if (category) fetchProducts({ lane: opt.id });
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      lane === opt.id ? 'text-white' : 'text-gray-700 bg-white'
                    }`}
                    style={lane === opt.id ? { background: '#7B2CBF', borderColor: '#7B2CBF' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory('');
                  setGroup('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              >
                <option value="">Elegí categoría</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {subcategories.length > 0 && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subcategoría</label>
                  <select
                    value={subcategory}
                    onChange={(e) => {
                      setSubcategory(e.target.value);
                      setGroup('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                  >
                    <option value="">Todas</option>
                    {subcategories.map((sub) => (
                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                    ))}
                  </select>
                </>
              )}

              <div className="relative mb-3">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar marca, modelo o código"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchProducts();
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => fetchProducts()}
                disabled={loading}
                className="w-full py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
                style={{ background: '#1E1B4B' }}
              >
                {loading ? 'Cargando…' : 'Cargar productos en stock'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Formato</h2>
              <div className="space-y-2 mb-4">
                {FORMAT_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!formats.includes(opt.id)) toggleFormat(opt.id);
                        else setPreviewFormat(opt.id);
                      }}
                      className="text-sm text-gray-800 text-left"
                    >
                      {opt.label} <span className="text-gray-400">{opt.hint}</span>
                      {previewFormat === opt.id ? <span className="ml-2 text-xs font-semibold" style={{ color: '#7B2CBF' }}>preview</span> : null}
                    </button>
                    <input
                      type="checkbox"
                      checked={formats.includes(opt.id)}
                      onChange={() => toggleFormat(opt.id)}
                    />
                  </div>
                ))}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Fondo</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'studio', label: 'Studio' },
                  { id: 'gamer', label: 'Gamer' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`py-2 text-sm font-semibold rounded-lg border ${
                      theme === opt.id ? 'text-white' : 'text-gray-700 bg-white'
                    }`}
                    style={theme === opt.id ? { background: '#1E1B4B', borderColor: '#1E1B4B' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                La foto se usa tal cual, con su fondo blanco, en una ficha limpia. Sin recorte ni distorsión.
              </p>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">
                  Productos{listTotal ? ` · ${products.length} de ${listTotal}` : ''}
                </h2>
                <button type="button" onClick={selectVisible} className="text-sm font-semibold" style={{ color: '#7B2CBF' }}>
                  Seleccionar hasta 30
                </button>
              </div>
              {loading && products.length === 0 ? (
                <div className="py-16 flex items-center justify-center text-gray-500">
                  <FaSpinner className="animate-spin mr-2" /> Cargando catálogo…
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  Tocá <strong>Notebooks</strong> o cargá una categoría para armar flyers.
                </div>
              ) : (
                <div className="max-h-[760px] overflow-y-auto divide-y">
                  {products.map((p) => {
                    const isActive = p.id === activeId;
                    const isSel = selected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActiveId(p.id);
                          setTitleDraft(overrides[p.id]?.title || p.title);
                          setImageIndex(overrides[p.id]?.imageIndex || 0);
                        }}
                        className={`w-full text-left flex items-center gap-3 p-3 ${isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelected(p.id);
                          }}
                          className={`w-5 h-5 rounded border flex items-center justify-center ${isSel ? 'text-white' : 'bg-white'}`}
                          style={isSel ? { background: '#7B2CBF', borderColor: '#7B2CBF' } : { borderColor: '#D1D5DB' }}
                        >
                          {isSel ? <FaCheck className="w-3 h-3" /> : null}
                        </span>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-14 h-14 object-contain bg-gray-100 rounded" />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            <FaImage />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                            <span className="truncate">{p.title}</span>
                            {p.hasGpu ? (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#7B2CBF' }}>GPU</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {p.kicker} · {p.specs.map((s) => s.text).join(' · ') || 'Sin specs'}
                            {p.imageCount > 1 ? ` · ${p.imageCount} fotos` : ''}
                          </div>
                          <div className="text-sm font-bold" style={{ color: '#00B5D8' }}>{p.price}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {hasMore && products.length > 0 && (
                <button
                  type="button"
                  onClick={() => fetchProducts({ append: true, skip: products.length })}
                  disabled={loading}
                  className="w-full mt-3 py-2.5 rounded-lg font-semibold border"
                  style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
                >
                  {loading ? 'Cargando…' : `Cargar más (${listTotal - products.length} restantes)`}
                </button>
              )}
            </div>
          </div>

          <div className="xl:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
              <h2 className="font-semibold text-gray-900 mb-3">Preview y ajuste</h2>
              {activeProduct ? (
                <>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título en el flyer</label>
                  <input
                    value={titleDraft}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
                  />
                  {activeProduct.images.length > 1 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {activeProduct.images.map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setImageIndex(i);
                            persistOverride(activeId, { title: titleDraft, imageIndex: i });
                          }}
                          className={`w-12 h-12 rounded border overflow-hidden ${i === imageIndex ? 'ring-2 ring-purple-600' : ''}`}
                        >
                          <img src={src} alt="" className="w-full h-full object-contain bg-gray-100" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-center bg-gray-100 rounded-lg p-3 mb-3 overflow-hidden">
                    {previewLoading && !previewHtml ? (
                      <FaSpinner className="animate-spin text-gray-400 my-16" />
                    ) : (
                      <div style={{ width: size.w * scale, height: size.h * scale, position: 'relative' }}>
                        <iframe
                          title="Preview creativo"
                          srcDoc={previewHtml}
                          style={{
                            width: size.w,
                            height: size.h,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            border: 0,
                            background: '#fff'
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={downloadOne}
                    disabled={downloadingOne}
                    className="w-full py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: '#00B5D8' }}
                  >
                    {downloadingOne ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                    Descargar este PNG
                  </button>
                  <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">
                    Pie de foto para Instagram (esta imagen)
                  </label>
                  <textarea
                    readOnly
                    value={activeCaption}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={copyActiveCaption}
                    className="w-full py-2.5 rounded-lg font-semibold border flex items-center justify-center gap-2 mb-2"
                    style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
                  >
                    <FaCopy /> Copiar este texto
                  </button>
                  <button
                    type="button"
                    onClick={copyCarouselCaptions}
                    className="w-full py-2 text-sm font-semibold"
                    style={{ color: '#7B2CBF' }}
                  >
                    Copiar textos del carrusel ({selected.length || 1})
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    En Instagram el texto es corto a propósito (4 líneas). Pegá uno por foto en el celular.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Cargá productos para ver el flyer con logo, specs y precio.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeStudioPage;

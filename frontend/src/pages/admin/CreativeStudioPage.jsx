import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { siteUrl } from '../../config/siteUrl';
import { productPath } from '../../helpers/productPath';
import BrandStoriesPanel from '../../components/admin/BrandStoriesPanel';
import PublishPanel from '../../components/admin/PublishPanel';
import {
  collectLeafSubcategoryValues,
  getSortedTreeChildEntries,
  getTreeNodeAtPath,
  leafLabelFromStoredLabel,
  usableVisaoTree
} from '../../helpers/visaoNavigationTree';

function subsForCategory(cat) {
  if (!cat) return [];
  if (usableVisaoTree(cat.visaoNavigationTree)) {
    const seen = new Set();
    return collectLeafSubcategoryValues(cat.visaoNavigationTree)
      .filter((leaf) => {
        if (!leaf.subcategoryValue || seen.has(leaf.subcategoryValue)) return false;
        seen.add(leaf.subcategoryValue);
        return true;
      })
      .map((leaf) => ({
        value: leaf.subcategoryValue,
        label: leafLabelFromStoredLabel(leaf.label) || leaf.subcategoryValue
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  return (cat.subcategories || [])
    .map((sub) => ({
      value: sub.value,
      label: leafLabelFromStoredLabel(sub.label || sub.name) || sub.value
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

const QUICK = [
  { label: 'Promociones', offers: true, lane: 'all' },
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
  const type = fileName.endsWith('.zip') ? 'application/zip' : 'image/png';
  const fileBlob = blob.type === type ? blob : new Blob([blob], { type });
  try {
    const file = new File([fileBlob], fileName, { type });
    const shareData = { files: [file], title: fileName };
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      await navigator.share(shareData);
      return 'shared';
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancel';
  }
  const url = URL.createObjectURL(fileBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'download';
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

function captionFor(product, title, detail) {
  if (!product) return '';
  const head = title || product.title || '';
  const specs = (product.specs || [])
    .filter((spec) => spec && spec.text)
    .map((spec) => `${spec.label || 'Detalle'}: ${spec.text}`);
  const extra = detail != null ? String(detail).trim() : String(product.detail || '').trim();
  return [
    head,
    extra,
    ...specs,
    'Precio de hoy por WhatsApp · Entrega 24 h',
    'WhatsApp 0973 345 284'
  ].filter(Boolean).join('\n');
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMsg);
  } catch {
    toast.error('No se pudo copiar');
  }
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function savedAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 'ya guardada';
  const mins = Math.round(diff / 60000);
  if (mins < 2) return 'guardada recién';
  if (mins < 60) return `guardada hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `guardada hace ${hours} h`;
  return `guardada hace ${Math.round(hours / 24)} d`;
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
  const [scene, setScene] = useState('auto');
  const [lane, setLane] = useState('all');
  const [offersOnly, setOffersOnly] = useState(false);
  const [treePath, setTreePath] = useState([]);
  const [subsQuery, setSubsQuery] = useState('');
  const [group, setGroup] = useState('');
  const [listTotal, setListTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [detailDraft, setDetailDraft] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadingOne, setDownloadingOne] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [studioMode, setStudioMode] = useState('flyers');
  const [brandsReady, setBrandsReady] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [frameW, setFrameW] = useState(340);
  const [toolsOpen, setToolsOpen] = useState(false);
  const photoRef = useRef({ key: '', file: null });
  const ios = isIosDevice();

  const openBrands = () => {
    setStudioMode('brands');
    setBrandsReady(true);
  };

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

  const selectedCategory = categories.find((cat) => cat.value === category) || null;
  const treeRoot = usableVisaoTree(selectedCategory?.visaoNavigationTree)
    ? selectedCategory.visaoNavigationTree
    : null;
  const treeNode = treeRoot ? (getTreeNodeAtPath(treeRoot, treePath) || treeRoot) : null;
  const treeEntries = treeNode ? getSortedTreeChildEntries(treeNode.children) : [];
  const flatSubs = treeRoot ? [] : subsForCategory(selectedCategory);

  const activeProduct = products.find((p) => p.id === activeId);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get('/api/admin/categories/menu/complete-structure');
        if (res.data?.success) {
          const menu = (res.data.data || []).filter((cat) => subsForCategory(cat).length > 0);
          setCategories(menu);
        }
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
    const nextOffers = next.offers !== undefined ? next.offers : offersOnly;
    const nextGroup = next.group !== undefined ? next.group : group;
    let nextSubs = subsQuery;
    if (next.subcategories !== undefined) nextSubs = next.subcategories;
    else if (next.subcategory !== undefined || next.group !== undefined) nextSubs = '';
    const append = Boolean(next.append);
    const skip = Number(next.skip) || 0;
    if (!cat && !nextGroup && !nextOffers) {
      toast.info('Elegí una categoría o un atajo (Promociones, Notebooks, iPhone…)');
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/creativos/productos', {
        params: {
          category: nextOffers || nextGroup ? undefined : cat,
          subcategory: nextGroup || nextSubs ? undefined : (sub || undefined),
          subcategories: nextGroup ? undefined : (nextSubs || undefined),
          group: nextGroup || undefined,
          q: query || undefined,
          theme,
          lane: nextLane,
          offers: nextOffers ? '1' : undefined,
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
          setSubsQuery(nextSubs || '');
          setSelected([]);
          const first = incoming[0];
          setActiveId(first?.id || '');
          setTitleDraft(first?.title || '');
          setDetailDraft(first?.detail || '');
          setImageIndex(0);
        }
        const shown = (append ? skip : 0) + incoming.length;
        toast.success(`${res.data.total || shown} ${nextOffers ? 'ofertas' : 'productos'} con stock${shown < (res.data.total || shown) ? ` · mostrando ${shown}` : ''}`);
      } else {
        toast.error(res.data?.message || 'Error cargando productos');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error cargando productos');
    } finally {
      setLoading(false);
    }
  }, [category, subcategory, q, theme, lane, group, subsQuery, offersOnly]);

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
            scene: scene === 'auto' ? undefined : scene,
            title: titleDraft || product.title,
            detail: detailDraft,
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
  }, [activeId, previewFormat, theme, scene, titleDraft, detailDraft, imageIndex, products]);

  useEffect(() => {
    const fit = () => setFrameW(Math.min(460, Math.max(280, window.innerWidth - 48)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (!activeId) {
      photoRef.current = { key: '', file: null };
      setPhotoReady(false);
      return undefined;
    }
    const key = [activeId, previewFormat, theme, scene, titleDraft, detailDraft, imageIndex].join('|');
    let cancelled = false;
    setPhotoReady(false);
    photoRef.current = { key: '', file: null };
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/api/creativos/descargar/${activeId}`, {
          params: {
            format: previewFormat,
            theme: theme === 'auto' ? undefined : theme,
            scene: scene === 'auto' ? undefined : scene,
            title: titleDraft,
            detail: detailDraft,
            imageIndex
          },
          responseType: 'blob',
          timeout: 180000
        });
        if (cancelled) return;
        const blob = res.data && res.data.type === 'image/png'
          ? res.data
          : new Blob([res.data], { type: 'image/png' });
        photoRef.current = { key, file: new File([blob], 'zenn-flyer.png', { type: 'image/png' }) };
        setPhotoReady(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          photoRef.current = { key: '', file: null };
          setPhotoReady(false);
        }
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeId, previewFormat, theme, scene, titleDraft, detailDraft, imageIndex]);

  const openProduct = (product) => {
    if (!product) return;
    setActiveId(product.id);
    setTitleDraft(overrides[product.id]?.title || product.title);
    setDetailDraft(overrides[product.id]?.detail ?? product.detail ?? '');
    setImageIndex(overrides[product.id]?.imageIndex || 0);
  };

  const applyQuick = (pack) => {
    const offers = Boolean(pack.offers);
    setOffersOnly(offers);
    setCategory(offers ? '' : pack.category);
    setSubcategory(offers ? '' : pack.subcategory);
    setQ('');
    setLane(pack.lane || 'all');
    setGroup(offers ? '' : (pack.group || ''));
    setTreePath([]);
    fetchProducts({
      category: offers ? '' : pack.category,
      subcategory: offers ? '' : pack.subcategory,
      q: '',
      lane: pack.lane || 'all',
      group: offers ? '' : (pack.group || ''),
      offers,
      skip: 0
    });
  };

  const isQuickOn = (pack) => {
    if (pack.offers) return offersOnly && !category && !group;
    if (offersOnly) return false;
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
    if (activeId) persistOverride(activeId, { title: value, imageIndex, detail: detailDraft });
  };

  const onDetailChange = (value) => {
    setDetailDraft(value);
    if (activeId) persistOverride(activeId, { title: titleDraft, imageIndex, detail: value });
  };

  const activeCaption = activeProduct ? captionFor(activeProduct, titleDraft, detailDraft) : '';
  const productUrl = activeProduct ? siteUrl(productPath(activeProduct)) : '';

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
      const detail = overrides[id]?.detail ?? (id === activeId ? detailDraft : p.detail);
      return `—— Foto ${i + 1} ——\n${captionFor(p, title, detail)}`;
    }).filter(Boolean).join('\n\n');
    copyText(block, `${ids.length} textos listos para el carrusel`);
  };

  const downloadOne = async () => {
    if (!activeId) return;
    const key = [activeId, previewFormat, theme, scene, titleDraft, detailDraft, imageIndex].join('|');
    const cached = photoRef.current;

    const rememberAndNext = async () => {
      const id = activeId;
      try {
        await axiosInstance.post(`/api/creativos/marcado/${id}`, {
          format: previewFormat,
          imageIndex
        });
      } catch (err) {
        console.error(err);
      }
      const idx = products.findIndex((p) => p.id === id);
      const next = products[idx + 1] || products.find((p) => p.id !== id);
      setProducts((prev) => {
        const current = prev.find((p) => p.id === id);
        if (!current) return prev;
        const updated = {
          ...current,
          lastDownloadedAt: new Date().toISOString(),
          downloadCount: (current.downloadCount || 0) + 1
        };
        return [...prev.filter((p) => p.id !== id), updated];
      });
      if (next && next.id !== id) openProduct(next);
    };

    if (ios && cached.file && cached.key === key && navigator.share) {
      try {
        await navigator.share({ files: [cached.file] });
        toast.success('Elegiste dónde guardarla. Si fue Guardar imagen, ya está en Fotos. Siguiente.');
        await rememberAndNext();
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        toast.error('No se abrió el menú de Fotos. Tocá el botón otra vez.');
      }
      return;
    }

    try {
      setDownloadingOne(true);
      let file = cached.file && cached.key === key ? cached.file : null;
      if (!file) {
        const res = await axiosInstance.get(`/api/creativos/descargar/${activeId}`, {
          params: {
            format: previewFormat,
            theme: theme === 'auto' ? undefined : theme,
            scene: scene === 'auto' ? undefined : scene,
            title: titleDraft,
            detail: detailDraft,
            imageIndex
          },
          responseType: 'blob',
          timeout: 180000
        });
        const blob = res.data && res.data.type === 'image/png'
          ? res.data
          : new Blob([res.data], { type: 'image/png' });
        file = new File([blob], 'zenn-flyer.png', { type: 'image/png' });
        photoRef.current = { key, file };
        setPhotoReady(true);
      }
      if (ios) {
        toast.info('La foto ya está lista. Tocá Guardar en Fotos y después Guardar imagen.');
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenn-${(titleDraft || 'producto').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${previewFormat}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success('Imagen descargada. Siguiente producto.');
      await rememberAndNext();
    } catch (err) {
      console.error(err);
      toast.error(await errorFromAxios(err, 'No se pudo guardar la imagen'));
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
          scene: scene === 'auto' ? undefined : scene,
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
  const scale = Math.min(frameW / size.w, 560 / size.h);
  const saveLabel = downloadingOne || (ios && !photoReady)
    ? 'Preparando foto…'
    : (ios ? 'Guardar en Fotos' : 'Descargar imagen');
  const activeIndex = products.findIndex((p) => p.id === activeId);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 pb-28 xl:pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaBullhorn className="mr-3" style={{ color: '#7B2CBF' }} />
                Estudio de creativos
              </h1>
              <p className="text-gray-600 mt-1">
                {studioMode === 'brands'
                  ? 'Historias con fondo blanco: ícono de la subcategoría y los logos de las marcas que tenemos en stock.'
                  : 'Filtrá, previsualizá y descargá flyers listos para Instagram y Facebook. Logo, precio, specs y sello de 24 h ya van en la plantilla.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setStudioMode('flyers')}
                  className="px-4 py-2 rounded-full text-sm font-semibold border"
                  style={studioMode === 'flyers'
                    ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                    : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
                >
                  Flyers de producto
                </button>
                <button
                  type="button"
                  onClick={openBrands}
                  className="px-4 py-2 rounded-full text-sm font-semibold border"
                  style={studioMode === 'brands'
                    ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                    : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
                >
                  Historias de marcas
                </button>
                <button
                  type="button"
                  onClick={() => setStudioMode('publish')}
                  className="px-4 py-2 rounded-full text-sm font-semibold border"
                  style={studioMode === 'publish'
                    ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                    : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
                >
                  Publicar
                </button>
              </div>
            </div>
            {studioMode === 'flyers' ? (
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
            ) : null}
          </div>
        </div>

        {brandsReady ? (
          <div className={studioMode === 'brands' ? '' : 'hidden'}>
            <BrandStoriesPanel />
          </div>
        ) : null}

        <div className={`grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 ${studioMode === 'brands' ? 'hidden' : ''}`}>
          <div className={`xl:col-span-4 space-y-4 sm:space-y-6 ${studioMode === 'publish' ? 'order-1' : (products.length ? 'order-3' : 'order-1')} xl:order-1`}>
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
                  setLane('all');
                  setTreePath([]);
                  setSubsQuery('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              >
                <option value="">Elegí categoría</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {category && (treeEntries.length > 0 || flatSubs.length > 0) && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {treePath.length ? (treeNode?.label || 'Subcategoría') : 'Subcategoría'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setGroup('');
                        setLane('all');
                        if (treePath.length && treeNode) {
                          const values = [...new Set(
                            collectLeafSubcategoryValues(treeNode)
                              .map((leaf) => leaf.subcategoryValue)
                              .filter(Boolean)
                          )];
                          setSubcategory(values.length === 1 ? values[0] : '');
                          fetchProducts({
                            category,
                            subcategory: values.length === 1 ? values[0] : '',
                            subcategories: values.length > 1 ? values.join(',') : '',
                            group: '',
                            lane: 'all',
                            skip: 0
                          });
                          return;
                        }
                        setSubcategory('');
                        setTreePath([]);
                        fetchProducts({ subcategory: '', subcategories: '', group: '', lane: 'all', skip: 0 });
                      }}
                      className="text-xs font-semibold shrink-0"
                      style={{ color: '#7B2CBF' }}
                    >
                      {treePath.length ? `Todos de ${treeNode?.label || 'esta carpeta'}` : 'Todos de esta categoría'}
                    </button>
                  </div>
                  {treePath.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTreePath((prev) => prev.slice(0, -1))}
                      className="mb-2 text-xs font-semibold"
                      style={{ color: '#0369A1' }}
                    >
                      ← Volver
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                    {treeEntries.map(({ key, node }) => {
                      const leaf = Boolean(node.subcategoryValue);
                      const on = leaf && !group && !subsQuery && subcategory === node.subcategoryValue;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (!leaf) {
                              setTreePath((prev) => [...prev, key]);
                              return;
                            }
                            setSubcategory(node.subcategoryValue);
                            setGroup('');
                            setLane('all');
                            fetchProducts({
                              category,
                              subcategory: node.subcategoryValue,
                              subcategories: '',
                              group: '',
                              lane: 'all',
                              skip: 0
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border"
                          style={
                            on
                              ? { background: '#00B5D8', color: '#fff', borderColor: '#00B5D8' }
                              : { color: '#1E1B4B', borderColor: '#E5E7EB', background: '#F8FAFC' }
                          }
                        >
                          {node.label}{leaf ? '' : ' ›'}
                        </button>
                      );
                    })}
                    {flatSubs.map((sub) => {
                      const on = !group && !subsQuery && subcategory === sub.value;
                      return (
                        <button
                          key={sub.value}
                          type="button"
                          onClick={() => {
                            setSubcategory(sub.value);
                            setGroup('');
                            setLane('all');
                            fetchProducts({
                              category,
                              subcategory: sub.value,
                              subcategories: '',
                              group: '',
                              lane: 'all',
                              skip: 0
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border"
                          style={
                            on
                              ? { background: '#00B5D8', color: '#fff', borderColor: '#00B5D8' }
                              : { color: '#1E1B4B', borderColor: '#E5E7EB', background: '#F8FAFC' }
                          }
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
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

            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              className="xl:hidden w-full py-2.5 rounded-lg font-semibold border bg-white"
              style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
            >
              {toolsOpen ? 'Ocultar formato y fondo' : 'Formato y fondo'}
            </button>
            <div className={`${toolsOpen ? '' : 'hidden'} xl:block bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6`}>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Estilo</h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'studio', label: 'Oficina' },
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
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Fondo</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'auto', label: 'Variar' },
                  { id: 'orbita', label: 'Órbita' },
                  { id: 'neon', label: 'Neón' },
                  { id: 'haz', label: 'Haces' },
                  { id: 'malla', label: 'Malla' },
                  { id: 'cielo', label: 'Azul claro' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setScene(opt.id)}
                    className={`py-2 text-sm font-semibold rounded-lg border ${
                      scene === opt.id ? 'text-white' : 'text-gray-700 bg-white'
                    }`}
                    style={scene === opt.id ? { background: '#7B2CBF', borderColor: '#7B2CBF' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Promociones muestra cada producto que tiene precio anterior, con el mayor descuento arriba. En la foto y en el texto van el precio tachado, el de ahora y el porcentaje. Si no hay promoción, el precio no se imprime.
              </p>
            </div>
          </div>

          <div className={`xl:col-span-5 order-2 ${studioMode === 'publish' ? 'hidden' : ''}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">
                  Productos{listTotal ? ` · ${products.length} de ${listTotal}` : ''}
                </h2>
                <button type="button" onClick={selectVisible} className="text-sm font-semibold" style={{ color: '#7B2CBF' }}>
                  Seleccionar hasta 30
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">Primero los que todavía no guardaste. Los ya publicados van al final.</p>
              {loading && products.length === 0 ? (
                <div className="py-16 flex items-center justify-center text-gray-500">
                  <FaSpinner className="animate-spin mr-2" /> Cargando catálogo…
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  Elegí una categoría y una subcategoría para ver los productos.
                </div>
              ) : (
                <div className="max-h-[52vh] xl:max-h-[760px] overflow-y-auto divide-y">
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
                          setDetailDraft(overrides[p.id]?.detail ?? p.detail ?? '');
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
                            {p.kicker} · {p.specs.filter((s) => s.text).slice(0, 3).map((s) => s.text).join(' · ') || 'Sin specs'}
                            {p.imageCount > 1 ? ` · ${p.imageCount} fotos` : ''}
                          </div>
                          {p.onOffer ? (
                            <div className="text-sm font-bold flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ background: '#E11D48' }}>-{p.discountPercent}%</span>
                              <span className="text-gray-400 line-through font-medium">{p.listPrice}</span>
                              <span style={{ color: '#00B5D8' }}>{p.price}</span>
                            </div>
                          ) : (
                            <div className="text-sm font-bold" style={{ color: '#00B5D8' }}>{p.price}</div>
                          )}
                          {p.lastDownloadedAt ? (
                            <div className="text-[11px] font-semibold text-amber-700">{savedAgo(p.lastDownloadedAt)} · al final para no repetir</div>
                          ) : null}
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

          <div className={`${studioMode === 'publish' ? 'xl:col-span-8 order-2' : 'xl:col-span-3'} ${products.length && studioMode !== 'publish' ? 'order-1' : 'order-2'} xl:order-3`}>
            {studioMode === 'publish' ? (
              <PublishPanel selected={selected} products={products} />
            ) : null}
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4 ${studioMode === 'publish' ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-gray-900">Preview</h2>
                {products.length > 1 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm font-semibold rounded-lg border"
                      onClick={() => openProduct(products[activeIndex > 0 ? activeIndex - 1 : products.length - 1])}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm font-semibold rounded-lg text-white"
                      style={{ background: '#1E1B4B' }}
                      onClick={() => openProduct(products[activeIndex >= 0 && activeIndex < products.length - 1 ? activeIndex + 1 : 0])}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
              {activeProduct ? (
                <>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título en el flyer</label>
                  <input
                    value={titleDraft}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
                  />
                  <label className="block text-xs font-medium text-gray-600 mb-1">Detalles en el flyer y en el texto</label>
                  <textarea
                    value={detailDraft}
                    onChange={(e) => onDetailChange(e.target.value)}
                    rows={4}
                    placeholder="Sumá detalles. Si una spec no tiene dato, el cuadro queda en blanco."
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
                    disabled={downloadingOne || (ios && !photoReady)}
                    className="w-full py-3.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                    style={{ background: '#00B5D8' }}
                  >
                    {downloadingOne || (ios && !photoReady) ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                    {saveLabel}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    {ios
                      ? 'En el iPhone se abre el menú del sistema. Tocá Guardar imagen y la foto queda en el carrete, lista para subir.'
                      : 'Las que ya guardaste quedan al final de la lista para no repetir la misma imagen.'}
                  </p>
                  <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">
                    Link del producto para la historia
                  </label>
                  <input
                    readOnly
                    value={productUrl}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-xs bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(productUrl, 'Link copiado para la historia')}
                    className="w-full py-2.5 rounded-lg font-semibold border flex items-center justify-center gap-2 mb-1"
                    style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
                  >
                    <FaCopy /> Copiar link
                  </button>
                  <p className="text-xs text-gray-500 mb-2">
                    En la historia, en el sticker de enlace o en Mostrar más, pegá este link de la página del producto.
                  </p>
                  <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">
                    Pie de foto para Instagram (esta imagen)
                  </label>
                  <textarea
                    readOnly
                    value={activeCaption}
                    rows={5}
                    className="hidden md:block w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm bg-gray-50"
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
        {studioMode === 'flyers' && activeProduct ? (
          <div className="xl:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white border-t border-gray-200 shadow-lg">
            <button
              type="button"
              onClick={downloadOne}
              disabled={downloadingOne || (ios && !photoReady)}
              className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 text-lg"
              style={{ background: '#00B5D8' }}
            >
              {downloadingOne || (ios && !photoReady) ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              {saveLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CreativeStudioPage;

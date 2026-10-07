import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaDownload, FaSearch, FaSpinner, FaSyncAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

const COVER = { w: 1080, h: 1080 };

const ICON_PATHS = {
  notebook: '<rect x="3" y="4" width="18" height="11" rx="1.6"/><path d="M2 19h20l-2-4H4z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M8 20h8M12 16v4"/>',
  desktop: '<rect x="2" y="4" width="13" height="10" rx="1.4"/><path d="M5 18h7"/><rect x="17" y="6" width="5" height="12" rx="1"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
  mouse: '<rect x="7" y="2" width="10" height="20" rx="5"/><path d="M12 2v7"/>',
  mousepad: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M14 9h4v6h-4z"/>',
  headphones: '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="7" rx="1.2"/><rect x="17" y="13" width="4" height="7" rx="1.2"/>',
  case: '<rect x="7" y="2" width="10" height="20" rx="1.6"/><path d="M10 6h4M10 12h4M10 15h4M10 18h4"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
  ssd: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h8"/>',
  ram: '<rect x="3" y="7" width="18" height="10" rx="1.4"/><path d="M7 7V4M12 7V4M17 7V4"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="1.4"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  gpu: '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h5"/>',
  motherboard: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="6" width="6" height="6"/><path d="M15 8h3M15 12h3M7 16h10"/>',
  charger: '<rect x="7" y="7" width="10" height="14" rx="2"/><path d="M10 3v4M14 3v4"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="1.4"/><path d="M7 16v5h10v-5"/>',
  camera: '<path d="M8 7l1.4-2h5.2L16 7"/><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3"/>',
  router: '<rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 11V7M12 11V4M17 11V7"/>',
  chair: '<path d="M7 3h10v8H7z"/><path d="M5 11h14v3H5zM8 14v6M16 14v6"/>',
  speaker: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="9" r="1.6"/><circle cx="12" cy="15.5" r="2.4"/>',
  mic: '<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8"/>',
  fan: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.5c1.6-3.4 5.2-3.6 6.2-1.6S15 11 13.2 11.2M12 14.5c-1.6 3.4-5.2 3.6-6.2 1.6S9 13 10.8 12.8"/>',
  ups: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M8 7V4h8v3M12 11v5M10 13h4"/>',
  cable: '<path d="M4 9c3.5 0 3.5 6 7.5 6S15.5 9 19 9"/><circle cx="4" cy="9" r="1.4"/><circle cx="20" cy="9" r="1.4"/>',
  bag: '<path d="M6 8h12l-1 13H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  projector: '<rect x="2" y="8" width="13" height="8" rx="1.4"/><circle cx="17.5" cy="12" r="2.6"/><path d="M6 16v3M11 16v3"/>',
  watch: '<rect x="8" y="6" width="8" height="12" rx="2"/><path d="M10 6V3h4v3M10 18v3h4v-3"/>',
  console: '<rect x="2" y="8" width="20" height="8" rx="3"/><circle cx="8" cy="12" r="1.3"/><path d="M15 11h.01M17.5 13h.01"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  product: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>'
};

function TypeIcon({ name, className = 'w-7 h-7' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || ICON_PATHS.product }}
    />
  );
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function fileSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

const HighlightCoversPanel = () => {
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [activeId, setActiveId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const photoRef = useRef({ key: '', file: null });
  const ios = isIosDevice();

  const loadCovers = async (refresh = false) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/creativos/iconos', {
        params: refresh ? { refresh: 1 } : undefined,
        timeout: 60000
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setCovers(data);
      setActiveId((current) => current || data[0]?.id || '');
      if (refresh) toast.success('Subcategorías actualizadas');
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los íconos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCovers(false);
  }, []);

  const categories = useMemo(() => {
    const seen = [];
    for (const cover of covers) {
      if (!seen.some((item) => item.value === cover.category)) {
        seen.push({ value: cover.category, label: cover.categoryLabel });
      }
    }
    return seen;
  }, [covers]);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return covers.filter((cover) => {
      if (category && cover.category !== category) return false;
      if (!query) return true;
      return `${cover.subcategoryLabel} ${cover.categoryLabel}`.toLowerCase().includes(query);
    });
  }, [covers, q, category]);

  const active = visible.find((cover) => cover.id === activeId) || visible[0] || null;

  useEffect(() => {
    photoRef.current = { key: '', file: null };
    setPhotoReady(false);
  }, [activeId]);

  useEffect(() => {
    if (!active) {
      setPreviewHtml('');
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await axiosInstance.get('/api/creativos/iconos/html', {
          params: { category: active.category, subcategory: active.subcategory },
          responseType: 'text',
          transformResponse: [(data) => data],
          timeout: 60000
        });
        if (!cancelled) setPreviewHtml(res.data || '');
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error('No se pudo armar la portada');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active]);

  const openNext = (currentId) => {
    const idx = visible.findIndex((cover) => cover.id === currentId);
    const next = visible[idx + 1] || visible.find((cover) => cover.id !== currentId);
    if (next && next.id !== currentId) setActiveId(next.id);
  };

  const downloadCover = async () => {
    if (!active) return;
    const key = active.id;
    const name = `zenn-destacada-${fileSlug(active.categoryLabel)}-${fileSlug(active.subcategoryLabel)}.png`;
    const cached = photoRef.current;

    if (ios && cached.file && cached.key === key && navigator.share) {
      try {
        await navigator.share({ files: [cached.file], title: active.subcategoryLabel });
        toast.success('Si elegiste Guardar imagen, ya está en Fotos. Siguiente portada.');
        openNext(key);
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        toast.error('No se abrió el menú de Fotos. Tocá el botón otra vez.');
      }
      return;
    }

    try {
      setDownloading(true);
      let file = cached.file && cached.key === key ? cached.file : null;
      if (!file) {
        const res = await axiosInstance.get('/api/creativos/iconos/descargar', {
          params: { category: active.category, subcategory: active.subcategory },
          responseType: 'blob',
          timeout: 180000
        });
        const blob = res.data && res.data.type === 'image/png'
          ? res.data
          : new Blob([res.data], { type: 'image/png' });
        file = new File([blob], name, { type: 'image/png' });
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
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success('Portada descargada. Siguiente subcategoría.');
      openNext(key);
    } catch (err) {
      console.error(err);
      toast.error(await errorFromAxios(err, 'No se pudo guardar la imagen'));
    } finally {
      setDownloading(false);
    }
  };

  const scale = Math.min(420 / COVER.w, 420 / COVER.h);
  const saveLabel = downloading || (ios && !photoReady)
    ? 'Preparando foto…'
    : (ios ? 'Guardar en Fotos' : 'Descargar imagen');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Íconos de destacadas</h2>
            <button
              type="button"
              onClick={() => loadCovers(true)}
              disabled={loading}
              className="text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              style={{ color: '#7B2CBF' }}
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCategory('')}
              className="px-3 py-1.5 text-sm font-semibold rounded-full border"
              style={!category
                ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
            >
              Todas
            </button>
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className="px-3 py-1.5 text-sm font-semibold rounded-full border"
                style={category === item.value
                  ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                  : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar, por ejemplo monitores"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          {loading && covers.length === 0 ? (
            <div className="py-16 flex items-center justify-center text-gray-500">
              <FaSpinner className="animate-spin mr-2" /> Cargando subcategorías…
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-gray-500">No hay subcategorías para ese filtro.</p>
          ) : (
            <div className="max-h-[720px] overflow-y-auto divide-y">
              {visible.map((cover) => {
                const isActive = active && cover.id === active.id;
                return (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => setActiveId(cover.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left ${isActive ? 'bg-indigo-50' : ''}`}
                  >
                    <span
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
                      style={{ background: 'linear-gradient(135deg, #1E1B4B, #7B2CBF)' }}
                    >
                      <TypeIcon name={cover.icon} className="w-6 h-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900 truncate">{cover.subcategoryLabel}</span>
                      <span className="block text-xs text-gray-500 truncate">{cover.categoryLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {active ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{active.subcategoryLabel}</h2>
                  <p className="text-sm text-gray-500">
                    {active.categoryLabel} · ícono centrado · cuadrado 1080×1080 para la portada de destacadas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadCover}
                  disabled={downloading}
                  className="px-4 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#7B2CBF' }}
                >
                  {downloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                  {saveLabel}
                </button>
              </div>
              <div className="flex justify-center bg-gray-100 rounded-lg p-3 overflow-hidden">
                {previewLoading && !previewHtml ? (
                  <div className="py-24 text-gray-500 flex items-center">
                    <FaSpinner className="animate-spin mr-2" /> Armando portada…
                  </div>
                ) : (
                  <div style={{ width: COVER.w * scale, height: COVER.h * scale, position: 'relative' }}>
                    <iframe
                      title={active.subcategoryLabel}
                      srcDoc={previewHtml}
                      style={{
                        width: COVER.w,
                        height: COVER.h,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        border: 0,
                        background: '#1E1B4B'
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-gray-500">Elegí una subcategoría para ver la portada.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighlightCoversPanel;

import React, { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaCopy, FaDownload, FaSearch, FaSpinner, FaSyncAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

const QUICK = ['Notebook', 'Teclados', 'Monitores', 'Gabinetes', 'Auriculares'];

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

const STORY = { w: 1080, h: 1920 };

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

function fileSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function captionFor(board, page) {
  if (!board) return '';
  const perPage = board.perPage || 12;
  const start = (page - 1) * perPage;
  const slice = board.brands.slice(start, start + perPage);
  const names = slice.map((brand) => brand.name).join(' · ');
  const head = board.pages > 1 ? `${board.subcategoryLabel} (${page}/${board.pages})` : board.subcategoryLabel;
  return [
    head,
    names ? `Marcas: ${names}` : '',
    `${board.productCount} productos en stock · Entrega Asunción 24 h`,
    'WhatsApp 0973 345 284'
  ].filter(Boolean).join('\n');
}

const BrandStoriesPanel = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadBoards = async (refresh = false) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/creativos/historias-marcas', {
        params: refresh ? { refresh: 1 } : undefined,
        timeout: 60000
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setBoards(data);
      setActiveId((current) => current || data[0]?.id || '');
      if (refresh) toast.success('Marcas actualizadas');
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar las marcas por subcategoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards(false);
  }, []);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return boards;
    return boards.filter((board) => {
      const haystack = `${board.subcategoryLabel} ${board.categoryLabel} ${board.brands.map((b) => b.name).join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [boards, q]);

  const active = boards.find((board) => board.id === activeId) || null;
  const caption = captionFor(active, page);
  const scale = Math.min(380 / STORY.w, 640 / STORY.h);

  useEffect(() => {
    if (!active) {
      setPreviewHtml('');
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await axiosInstance.get('/api/creativos/historias-marcas/html', {
          params: {
            category: active.category,
            subcategory: active.subcategory,
            page
          },
          responseType: 'text',
          transformResponse: [(data) => data],
          timeout: 60000
        });
        if (!cancelled) setPreviewHtml(res.data || '');
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error('No se pudo armar la historia');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, page]);

  const openBoard = (board) => {
    setActiveId(board.id);
    setPage(1);
  };

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const downloadPage = async () => {
    if (!active) return;
    try {
      setDownloading(true);
      const res = await axiosInstance.get('/api/creativos/historias-marcas/descargar', {
        params: {
          category: active.category,
          subcategory: active.subcategory,
          page
        },
        responseType: 'blob',
        timeout: 180000
      });
      const name = `zenn-marcas-${fileSlug(active.categoryLabel)}-${fileSlug(active.subcategoryLabel)}-${page}.png`;
      await saveBlob(res.data, name);
      toast.success('Historia lista para Instagram');
    } catch (err) {
      console.error(err);
      toast.error(await errorFromAxios(err, 'No se pudo descargar la historia'));
    } finally {
      setDownloading(false);
    }
  };

  const exportItems = async (items, emptyMessage) => {
    if (!items.length) {
      toast.info(emptyMessage);
      return;
    }
    if (items.length > 12) {
      toast.error('Máximo 12 subcategorías por descarga');
      return;
    }
    try {
      setExporting(true);
      const res = await axiosInstance.post(
        '/api/creativos/historias-marcas/exportar',
        { items },
        { responseType: 'blob', timeout: 300000 }
      );
      await saveBlob(res.data, `zenn-historias-marcas-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success('ZIP listo para las historias');
    } catch (err) {
      console.error(err);
      toast.error(await errorFromAxios(err, 'No se pudo armar el ZIP'));
    } finally {
      setExporting(false);
    }
  };

  const pageBrands = active
    ? active.brands.slice((page - 1) * (active.perPage || 12), page * (active.perPage || 12))
    : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Subcategorías</h2>
            <button
              type="button"
              onClick={() => loadBoards(true)}
              disabled={loading}
              className="text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              style={{ color: '#7B2CBF' }}
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setQ(label)}
                className="px-3 py-1.5 text-sm font-semibold rounded-full border"
                style={q === label
                  ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                  : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
              >
                {label}
              </button>
            ))}
            {q ? (
              <button type="button" onClick={() => setQ('')} className="px-3 py-1.5 text-sm text-gray-500">
                Ver todas
              </button>
            ) : null}
          </div>
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar subcategoría o marca"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          {loading && boards.length === 0 ? (
            <div className="py-16 flex items-center justify-center text-gray-500">
              <FaSpinner className="animate-spin mr-2" /> Armando marcas con stock…
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-gray-500">No hay subcategorías con marcas en stock para esa búsqueda.</p>
          ) : (
            <div className="max-h-[720px] overflow-y-auto divide-y">
              {visible.map((board) => {
                const isActive = board.id === activeId;
                const isSel = selected.includes(board.id);
                const logos = board.brands.filter((brand) => brand.logoUrl).slice(0, 5);
                return (
                  <div key={board.id} className={`flex items-start gap-3 p-3 ${isActive ? 'bg-indigo-50' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleSelected(board.id)}
                      className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSel ? 'text-white' : 'bg-white'}`}
                      style={isSel ? { background: '#7B2CBF', borderColor: '#7B2CBF' } : { borderColor: '#D1D5DB' }}
                      aria-label={`Seleccionar ${board.subcategoryLabel}`}
                    >
                      {isSel ? <FaCheck className="w-3 h-3" /> : null}
                    </button>
                    <button type="button" onClick={() => openBoard(board)} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#F4F0FA', color: '#373592' }}>
                          <TypeIcon name={board.icon} className="w-6 h-6" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-900 truncate">{board.subcategoryLabel}</span>
                          <span className="block text-xs text-gray-500 truncate">
                            {board.categoryLabel} · {board.brandCount} marcas · {board.productCount} en stock
                          </span>
                        </span>
                      </div>
                      {logos.length > 0 ? (
                        <span className="flex items-center gap-1 mt-2 ml-14">
                          {logos.map((brand) => (
                            <img
                              key={brand.slug}
                              src={brand.logoUrl}
                              alt=""
                              className="w-8 h-8 rounded-md bg-white border border-gray-200 object-contain p-0.5"
                            />
                          ))}
                          {board.brandCount > logos.length ? (
                            <span className="text-xs text-gray-400 ml-1">+{board.brandCount - logos.length}</span>
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => exportItems(
              selected
                .map((id) => boards.find((board) => board.id === id))
                .filter(Boolean)
                .map((board) => ({ category: board.category, subcategory: board.subcategory })),
              'Marcá las subcategorías que querés bajar'
            )}
            disabled={exporting || selected.length === 0}
            className="w-full mt-4 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#7B2CBF' }}
          >
            {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {exporting ? 'Generando ZIP…' : `Descargar historias (${selected.length})`}
          </button>
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {active ? (
            <>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F4F0FA', color: '#373592' }}>
                    <TypeIcon name={active.icon} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-gray-900">{active.subcategoryLabel}</h2>
                    <p className="text-sm text-gray-500">
                      {active.categoryLabel} · {active.brandCount} marcas · fondo blanco · story 1080×1920
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadPage}
                  disabled={downloading}
                  className="px-4 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#00B5D8' }}
                >
                  {downloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                  Descargar esta historia
                </button>
              </div>

              {active.pages > 1 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from({ length: active.pages }, (_, index) => index + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className="px-3 py-1.5 text-sm font-semibold rounded-full border"
                      style={page === n
                        ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                        : { background: '#fff', color: '#1E1B4B', borderColor: '#E5E7EB' }}
                    >
                      Historia {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => exportItems(
                      [{ category: active.category, subcategory: active.subcategory }],
                      'Elegí una subcategoría'
                    )}
                    disabled={exporting}
                    className="px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                    style={{ color: '#7B2CBF' }}
                  >
                    Bajar las {active.pages} juntas
                  </button>
                </div>
              ) : null}

              <div className="flex justify-center bg-gray-100 rounded-lg p-3 mb-4 overflow-hidden">
                {previewLoading && !previewHtml ? (
                  <FaSpinner className="animate-spin text-gray-400 my-16" />
                ) : (
                  <div style={{ width: STORY.w * scale, height: STORY.h * scale, position: 'relative' }}>
                    <iframe
                      title={`Historia ${active.subcategoryLabel}`}
                      srcDoc={previewHtml}
                      style={{
                        width: STORY.w,
                        height: STORY.h,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        border: 0,
                        background: '#fff'
                      }}
                    />
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">Marcas de esta historia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
                {pageBrands.map((brand) => (
                  <div key={brand.slug} className="flex items-center gap-3 border border-gray-200 rounded-lg p-2 bg-white">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="" className="w-12 h-12 object-contain bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-50 text-xs font-bold text-gray-500 flex items-center justify-center text-center px-1">
                        {brand.name.slice(0, 8)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{brand.name}</div>
                      <div className="text-xs text-gray-500">
                        {brand.productCount} {brand.productCount === 1 ? 'producto' : 'productos'}
                        {brand.desde ? ` · desde ${brand.desde}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {active.truncated ? (
                <p className="text-xs text-gray-500 mb-3">
                  La historia muestra las {active.shownBrandCount} marcas con más stock. En el catálogo hay {active.brandCount}.
                </p>
              ) : null}

              <label className="block text-xs font-medium text-gray-600 mb-1">Texto para la historia</label>
              <textarea
                readOnly
                value={caption}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm bg-gray-50"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(caption);
                    toast.success('Texto copiado');
                  } catch {
                    toast.error('No se pudo copiar');
                  }
                }}
                className="w-full py-2.5 rounded-lg font-semibold border flex items-center justify-center gap-2"
                style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
              >
                <FaCopy /> Copiar texto
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500 py-16 text-center">Elegí una subcategoría para ver la historia de sus marcas.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandStoriesPanel;

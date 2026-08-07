import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import {
  FaImage,
  FaPlus,
  FaSave,
  FaSync,
  FaTrash,
  FaUpload
} from 'react-icons/fa';
import SummaryApi from '../common';
import { clearHomeLocalCache } from '../hooks/useProducts';

const emptyBanner = () => ({
  title: '',
  alt: 'Banner Zenn',
  imageDesktop: '',
  imageMobile: '',
  desktopWidth: null,
  desktopHeight: null,
  mobileWidth: null,
  mobileHeight: null,
  href: '',
  order: 100,
  enabled: true
});

const slotLabel = (slot) => (slot === 'mobile' ? 'móvil' : 'desktop');

const formatDims = (w, h, originalW, originalH) => {
  if (!w || !h) return '';
  const out = `${w}×${h}`;
  if (originalW && originalH && (originalW !== w || originalH !== h)) {
    return `${originalW}×${originalH} → ${out} (optimizado)`;
  }
  return out;
};

const HomeMediaManagement = () => {
  const queryClient = useQueryClient();
  const apiBase = SummaryApi.baseURL || '';

  const [tab, setTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [bannerForm, setBannerForm] = useState(emptyBanner());
  const [editingBannerId, setEditingBannerId] = useState(null);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${apiBase}${path}`, {
        credentials: 'include',
        ...options,
        headers: {
          ...(options.body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...options.headers
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.message || `Error ${res.status}`);
      }
      return data;
    },
    [apiBase]
  );

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [bRes, tRes] = await Promise.all([
        authFetch('/api/admin/home-banners'),
        authFetch('/api/admin/home-category-tiles')
      ]);
      setBanners(Array.isArray(bRes.data) ? bRes.data : []);
      setTiles(Array.isArray(tRes.data) ? tRes.data : []);
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const invalidateHome = () => {
    clearHomeLocalCache();
    queryClient.removeQueries({ queryKey: ['category-products', 'home'] });
    queryClient.invalidateQueries({ queryKey: ['category-products', 'home'] });
  };

  const uploadImage = async (file, folder) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('folder', folder);
    setUploading(true);
    try {
      const data = await authFetch(`/api/admin/home-media/upload?folder=${folder}`, {
        method: 'POST',
        body: fd
      });
      return data.data || {};
    } finally {
      setUploading(false);
    }
  };

  const applyUploadToSlot = (meta, slot) => {
    const url = meta.url || '';
    if (!url) return;
    if (slot === 'mobile') {
      setBannerForm((f) => ({
        ...f,
        imageMobile: url,
        mobileWidth: meta.width || null,
        mobileHeight: meta.height || null
      }));
    } else {
      setBannerForm((f) => ({
        ...f,
        imageDesktop: url,
        desktopWidth: meta.width || null,
        desktopHeight: meta.height || null
      }));
    }
    const dims = formatDims(
      meta.width,
      meta.height,
      meta.originalWidth,
      meta.originalHeight
    );
    toast.success(
      `Imagen ${slotLabel(slot)} lista${dims ? ` (${dims})` : ''}. Proporción preservada.`
    );
  };

  const saveBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.imageDesktop?.trim() && !bannerForm.imageMobile?.trim()) {
      toast.error('Subí al menos una imagen (desktop o móvil)');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: bannerForm.title.trim(),
        alt: bannerForm.alt.trim() || 'Banner Zenn',
        imageDesktop: (bannerForm.imageDesktop || '').trim(),
        imageMobile: (bannerForm.imageMobile || '').trim(),
        desktopWidth: bannerForm.desktopWidth || null,
        desktopHeight: bannerForm.desktopHeight || null,
        mobileWidth: bannerForm.mobileWidth || null,
        mobileHeight: bannerForm.mobileHeight || null,
        href: (bannerForm.href || '').trim(),
        order: Number(bannerForm.order) || 100,
        enabled: !!bannerForm.enabled
      };
      if (editingBannerId) {
        await authFetch(`/api/admin/home-banners/${editingBannerId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Banner actualizado');
      } else {
        await authFetch('/api/admin/home-banners', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Banner creado');
      }
      setBannerForm(emptyBanner());
      setEditingBannerId(null);
      await loadAll();
      invalidateHome();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editBanner = (b) => {
    setEditingBannerId(b._id);
    setBannerForm({
      title: b.title || '',
      alt: b.alt || 'Banner Zenn',
      imageDesktop: b.imageDesktop || '',
      imageMobile: b.imageMobile || '',
      desktopWidth: b.desktopWidth || null,
      desktopHeight: b.desktopHeight || null,
      mobileWidth: b.mobileWidth || null,
      mobileHeight: b.mobileHeight || null,
      href: b.href || '',
      order: b.order ?? 100,
      enabled: b.enabled !== false
    });
    setTab('banners');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('¿Eliminar este banner?')) return;
    try {
      await authFetch(`/api/admin/home-banners/${id}`, { method: 'DELETE' });
      toast.success('Banner eliminado');
      if (editingBannerId === id) {
        setEditingBannerId(null);
        setBannerForm(emptyBanner());
      }
      await loadAll();
      invalidateHome();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateTileField = (id, patch) => {
    setTiles((prev) => prev.map((t) => (t._id === id ? { ...t, ...patch } : t)));
  };

  const saveTile = async (tile) => {
    if (!tile.label?.trim() || !tile.href?.trim()) {
      toast.error('Label y URL son obligatorios');
      return;
    }
    try {
      setSaving(true);
      await authFetch(`/api/admin/home-category-tiles/${tile._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: tile.label.trim(),
          href: tile.href.trim(),
          image: (tile.image || '').trim(),
          order: Number(tile.order) || 100,
          enabled: tile.enabled !== false
        })
      });
      toast.success(`Tile “${tile.label}” guardado`);
      await loadAll();
      invalidateHome();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const seedTiles = async () => {
    try {
      setSaving(true);
      await authFetch('/api/admin/home-category-tiles/seed', { method: 'POST' });
      toast.success('Tiles por defecto creados');
      await loadAll();
      invalidateHome();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (e, folder, onMeta) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const meta = await uploadImage(file, folder);
      if (meta?.url) onMeta(meta);
      else toast.error('No se obtuvo URL de la imagen');
    } catch (err) {
      toast.error(err.message || 'Error al subir');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Cargando Home Media…</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaImage className="text-cyan-600" />
            Home Media
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Banners del slider e imágenes de Notebooks / Games / Informática / Electrónicos /
            Portátiles. Se suben al CDN (R2) para carga rápida.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <FaSync /> Recargar
        </button>
      </div>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('banners')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'banners'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-gray-500'
          }`}
        >
          Banners ({banners.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('tiles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'tiles'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-gray-500'
          }`}
        >
          Categorías inicio ({tiles.length})
        </button>
      </div>

      {tab === 'banners' && (
        <div className="space-y-6">
          <form
            onSubmit={saveBanner}
            className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm space-y-4"
          >
            <h2 className="font-semibold text-lg">
              {editingBannerId ? 'Editar banner' : 'Nuevo banner'}
            </h2>
            <p className="text-sm text-gray-600 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
              Proporciones fijas del home: <strong>móvil 1545×1329</strong> ·{' '}
              <strong>desktop 1374×438</strong>. Subí las imágenes en ese tamaño (o lo más
              cercano) para que se vean bien.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-gray-600">Título (interno)</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={bannerForm.title}
                  onChange={(e) =>
                    setBannerForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Alt (accesibilidad)</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={bannerForm.alt}
                  onChange={(e) => setBannerForm((f) => ({ ...f, alt: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-600">
                  URL al hacer clic (ej. /categoria-producto?category=… o https://…)
                </span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  placeholder="/categoria-producto?category=notebook_y_computadoras"
                  value={bannerForm.href}
                  onChange={(e) => setBannerForm((f) => ({ ...f, href: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Orden</span>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={bannerForm.order}
                  onChange={(e) =>
                    setBannerForm((f) => ({ ...f, order: e.target.value }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={bannerForm.enabled}
                  onChange={(e) =>
                    setBannerForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                Visible en el home
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Imagen desktop{' '}
                  {bannerForm.desktopWidth && bannerForm.desktopHeight ? (
                    <span className="text-xs font-normal text-cyan-700">
                      ({bannerForm.desktopWidth}×{bannerForm.desktopHeight})
                    </span>
                  ) : null}
                </p>
                {bannerForm.imageDesktop ? (
                  <img
                    src={bannerForm.imageDesktop}
                    alt="Desktop"
                    className="w-full h-28 object-contain bg-gray-50 rounded-lg border mb-2"
                  />
                ) : null}
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm cursor-pointer hover:bg-cyan-700">
                  <FaUpload /> {uploading ? 'Subiendo…' : 'Subir CDN'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) =>
                      onPickFile(e, 'banners', (meta) => applyUploadToSlot(meta, 'desktop'))
                    }
                  />
                </label>
                <input
                  className="mt-2 w-full border rounded-lg px-3 py-1.5 text-xs"
                  placeholder="o pegá URL CDN"
                  value={bannerForm.imageDesktop}
                  onChange={(e) =>
                    setBannerForm((f) => ({ ...f, imageDesktop: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Imagen móvil{' '}
                  {bannerForm.mobileWidth && bannerForm.mobileHeight ? (
                    <span className="text-xs font-normal text-cyan-700">
                      ({bannerForm.mobileWidth}×{bannerForm.mobileHeight})
                    </span>
                  ) : null}
                </p>
                {bannerForm.imageMobile ? (
                  <img
                    src={bannerForm.imageMobile}
                    alt="Móvil"
                    className="w-full h-28 object-contain bg-gray-50 rounded-lg border mb-2"
                  />
                ) : null}
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm cursor-pointer hover:bg-cyan-700">
                  <FaUpload /> {uploading ? 'Subiendo…' : 'Subir CDN'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) =>
                      onPickFile(e, 'banners', (meta) => applyUploadToSlot(meta, 'mobile'))
                    }
                  />
                </label>
                <input
                  className="mt-2 w-full border rounded-lg px-3 py-1.5 text-xs"
                  placeholder="si vacío, usa desktop"
                  value={bannerForm.imageMobile}
                  onChange={(e) =>
                    setBannerForm((f) => ({ ...f, imageMobile: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <FaSave /> {editingBannerId ? 'Guardar cambios' : 'Crear banner'}
              </button>
              {editingBannerId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBannerId(null);
                    setBannerForm(emptyBanner());
                  }}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {banners.length === 0 && (
              <p className="text-sm text-gray-500">
                Todavía no hay banners. Creá uno arriba con la imagen del proveedor.
              </p>
            )}
            {banners.map((b) => (
              <div
                key={b._id}
                className="flex flex-col sm:flex-row gap-3 bg-white border rounded-xl p-3 items-start sm:items-center"
              >
                <img
                  src={b.imageDesktop || b.imageMobile}
                  alt={b.alt || b.title}
                  className="w-full sm:w-40 h-20 object-contain bg-gray-50 rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {b.title || b.alt || 'Sin título'}{' '}
                    {!b.enabled && (
                      <span className="text-xs text-amber-600">(oculto)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Orden {b.order}
                    {b.desktopWidth && b.desktopHeight
                      ? ` · Desktop ${b.desktopWidth}×${b.desktopHeight}`
                      : ''}
                    {b.mobileWidth && b.mobileHeight
                      ? ` · Móvil ${b.mobileWidth}×${b.mobileHeight}`
                      : ''}
                  </p>
                  <p className="text-xs text-cyan-700 truncate">{b.href || '(sin link)'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editBanner(b)}
                    className="px-3 py-1.5 text-sm border rounded-lg"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBanner(b._id)}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tiles' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              Estas 5 tarjetas reemplazan el bloque de subcategorías al inicio del home.
              Subí una imagen por tile y definí a qué URL va el clic.
            </p>
            {tiles.length === 0 && (
              <button
                type="button"
                onClick={seedTiles}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-cyan-600 text-white rounded-lg"
              >
                <FaPlus /> Crear tiles por defecto
              </button>
            )}
          </div>

          {tiles.map((tile) => (
            <div
              key={tile._id}
              className="bg-white border rounded-xl p-4 shadow-sm grid sm:grid-cols-[140px_1fr] gap-4"
            >
              <div>
                <div
                  className="rounded-lg overflow-hidden min-h-[100px] flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(145deg, #00B5D8 0%, #1E90FF 45%, #7B2CBF 100%)'
                  }}
                >
                  {tile.image ? (
                    <img
                      src={tile.image}
                      alt={tile.label}
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs p-2 text-center">Sin imagen</span>
                  )}
                </div>
                <label className="mt-2 inline-flex w-full justify-center items-center gap-2 px-2 py-1.5 bg-cyan-600 text-white rounded-lg text-xs cursor-pointer">
                  <FaUpload /> CDN
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) =>
                      onPickFile(e, 'tiles', (meta) =>
                        updateTileField(tile._id, { image: meta.url })
                      )
                    }
                  />
                </label>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {tile.key}
                  </span>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={tile.enabled !== false}
                      onChange={(e) =>
                        updateTileField(tile._id, { enabled: e.target.checked })
                      }
                    />
                    Visible
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="text-gray-600">Nombre en la tarjeta</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={tile.label || ''}
                    onChange={(e) => updateTileField(tile._id, { label: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">URL al hacer clic</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={tile.href || ''}
                    onChange={(e) => updateTileField(tile._id, { href: e.target.value })}
                  />
                </label>
                <div className="flex flex-wrap gap-3 items-end">
                  <label className="block text-sm w-28">
                    <span className="text-gray-600">Orden</span>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={tile.order ?? 100}
                      onChange={(e) =>
                        updateTileField(tile._id, { order: e.target.value })
                      }
                    />
                  </label>
                  <label className="block text-sm flex-1 min-w-[180px]">
                    <span className="text-gray-600">URL imagen (CDN)</span>
                    <input
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-xs"
                      value={tile.image || ''}
                      onChange={(e) =>
                        updateTileField(tile._id, { image: e.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveTile(tile)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
                  >
                    <FaSave /> Guardar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeMediaManagement;

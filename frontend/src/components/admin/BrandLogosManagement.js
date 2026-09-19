import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  FaEdit,
  FaEraser,
  FaPaste,
  FaPlus,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaTrademark,
  FaUpload
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';
import SummaryApi from '../../common';
import { authFetch } from '../../helpers/authFetch';
import { extractImagesFromClipboard, isValidImageFile } from '../../helpers/imageOptimizer';
import uploadImage from '../../helpers/uploadImage';

const SIZE_OPTIONS = [256, 400, 512, 800];

const checkerboardStyle = {
  backgroundImage:
    'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0'
};

function isTextField(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function fileFromBlob(blob, name = 'logo-pegado.png') {
  if (!blob) return null;
  const type = blob.type || 'image/png';
  const ext = (type.split('/')[1] || 'png').replace('+xml', '');
  return new File([blob], name.includes('.') ? name : `logo-pegado.${ext}`, { type });
}

async function readImageFromClipboardApi() {
  if (!navigator.clipboard?.read) return null;
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = (item.types || []).find((t) => t.startsWith('image/'));
    if (!type) continue;
    const blob = await item.getType(type);
    return fileFromBlob(blob);
  }
  return null;
}

async function imageFileFromClipboardEvent(clipboardData) {
  const fromEvent = await extractImagesFromClipboard(clipboardData);
  if (fromEvent[0]) return fromEvent[0];
  return readImageFromClipboardApi();
}

const BrandLogosManagement = () => {
  const apiBase = SummaryApi.baseURL || '';
  const [brands, setBrands] = useState([]);
  const [stats, setStats] = useState({ total: 0, withLogo: 0, withoutLogo: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [size, setSize] = useState(512);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [pendingLogo, setPendingLogo] = useState(null);
  const [pendingPreview, setPendingPreview] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAliases, setEditAliases] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const fileRefs = useRef({});
  const selectedBrandIdRef = useRef(null);
  const showAddRef = useRef(false);

  useEffect(() => {
    selectedBrandIdRef.current = selectedBrandId;
  }, [selectedBrandId]);

  useEffect(() => {
    showAddRef.current = showAdd;
  }, [showAdd]);

  useEffect(() => {
    if (!pendingLogo) {
      setPendingPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(pendingLogo);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo]);

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/admin/brands', {
        params: { q, filter, limit: 1000 }
      });
      setBrands(Array.isArray(response.data.data) ? response.data.data : []);
      if (response.data.stats) setStats(response.data.stats);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cargar las marcas');
    } finally {
      setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => {
    const timer = setTimeout(loadBrands, q ? 280 : 0);
    return () => clearTimeout(timer);
  }, [loadBrands, q]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await axiosInstance.post('/api/admin/brands/sync');
      setBrands(Array.isArray(response.data.data) ? response.data.data : []);
      if (response.data.stats) setStats(response.data.stats);
      const created = response.data.sync?.created || 0;
      const updated = response.data.sync?.updated || 0;
      const kept = response.data.sync?.keptWithoutProducts || 0;
      toast.success(
        `Marcas sincronizadas (${created} nuevas, ${updated} actualizadas). Los logos se conservan${kept ? `, ${kept} sin productos actuales` : ''}.`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al sincronizar marcas');
    } finally {
      setSyncing(false);
    }
  };

  const handleRebuild = async () => {
    const withoutLogo = stats.withoutLogo || 0;
    const ok = window.confirm(
      `Esto elimina las ${withoutLogo} marcas SIN logo (tipos de producto, gabinetes, etc.) y vuelve a crear solo las marcas reales que hay en el catálogo ahora.\n\nLas marcas CON logo no se tocan, aunque no tengan stock. ¿Continuar?`
    );
    if (!ok) return;
    try {
      setSyncing(true);
      const response = await axiosInstance.post('/api/admin/brands/rebuild');
      setFilter('all');
      setBrands(Array.isArray(response.data.data) ? response.data.data : []);
      if (response.data.stats) setStats(response.data.stats);
      const deleted = response.data.rebuild?.cleanup?.deleted || 0;
      const created = response.data.rebuild?.sync?.created || 0;
      toast.success(
        `Limpieza lista: se quitaron ${deleted} marcas sin logo y se regeneraron ${created} marcas reales del catálogo. Los logos existentes se conservaron.`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al limpiar marcas');
    } finally {
      setSyncing(false);
    }
  };

  const authUpload = useCallback(
    async (brandId, file) => {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('size', String(size));
      fd.append('removeBackground', removeBackground ? 'true' : 'false');
      const res = await authFetch(`${apiBase}/api/admin/brands/${brandId}/logo`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.message || `Error ${res.status}`);
      }
      const payload = data.data || {};
      if (payload.clientUpload && payload.processedPng) {
        const bytes = Uint8Array.from(atob(payload.processedPng), (c) => c.charCodeAt(0));
        const processedFile = new File([bytes], `logo-${brandId}.png`, { type: 'image/png' });
        const firebase = await uploadImage(processedFile);
        const saved = await axiosInstance.put(`/api/admin/brands/${brandId}`, {
          logoUrl: firebase.url || firebase.secure_url,
          logoKey: firebase.public_id || '',
          logoWidth: payload.logoWidth,
          logoHeight: payload.logoHeight
        });
        return saved.data.data;
      }
      return payload;
    },
    [apiBase, size, removeBackground]
  );

  const handleUpload = useCallback(
    async (brand, file) => {
      if (!brand?._id || !file) return;
      if (!isValidImageFile(file) && !String(file.type || '').startsWith('image/')) {
        toast.error('El archivo pegado no es una imagen válida');
        return;
      }
      try {
        setUploadingId(brand._id);
        setSelectedBrandId(brand._id);
        const updated = await authUpload(brand._id, file);
        setBrands((prev) => prev.map((item) => (item._id === brand._id ? { ...item, ...updated } : item)));
        toast.success(`Logo de ${updated.name || brand.name} guardado`);
        loadBrands();
      } catch (error) {
        toast.error(error.message || 'No se pudo subir el logo');
      } finally {
        setUploadingId(null);
        if (fileRefs.current[brand._id]) fileRefs.current[brand._id].value = '';
      }
    },
    [authUpload, loadBrands]
  );

  const handleUploadRef = useRef(handleUpload);
  useEffect(() => {
    handleUploadRef.current = handleUpload;
  }, [handleUpload]);

  const takePastedImage = useCallback((file) => {
    if (!file) {
      toast.info('No hay una imagen en el portapapeles. Copiá el logo y volvé a pegar.');
      return;
    }
    if (showAddRef.current) {
      setPendingLogo(file);
      toast.success('Logo pegado. Completá el nombre y guardá la marca.');
      return;
    }
    const brandId = selectedBrandIdRef.current;
    const brand = brands.find((item) => item._id === brandId);
    if (!brand) {
      toast.info('Hacé clic en una marca y después pegá el logo (Ctrl+V).');
      return;
    }
    handleUploadRef.current(brand, file);
  }, [brands]);

  useEffect(() => {
    const onPaste = async (e) => {
      if (isTextField(e.target)) return;
      const file = await imageFileFromClipboardEvent(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      takePastedImage(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [takePastedImage]);

  const handlePasteButton = async (brand) => {
    if (brand?._id) setSelectedBrandId(brand._id);
    try {
      const file = await readImageFromClipboardApi();
      if (!file) {
        toast.info('Copiá el logo (Captura o Ctrl+C) y pegá acá con Ctrl+V');
        return;
      }
      if (brand) handleUpload(brand, file);
      else takePastedImage(file);
    } catch (error) {
      toast.info('No se pudo leer el portapapeles. Usá Ctrl+V sobre la marca.');
    }
  };

  const handleCardDrop = (e, brand) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const file = Array.from(e.dataTransfer.files || []).find((item) => String(item.type || '').startsWith('image/'));
    if (!file) {
      toast.error('Soltá una imagen de logo');
      return;
    }
    handleUpload(brand, file);
  };

  const handleNewDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const file = Array.from(e.dataTransfer.files || []).find((item) => String(item.type || '').startsWith('image/'));
    if (!file) return;
    setPendingLogo(file);
    toast.success('Logo listo para guardar con la marca');
  };

  const handleDeleteLogo = async (brand) => {
    if (!window.confirm(`¿Quitar el logo de ${brand.name}? La marca se mantiene.`)) return;
    try {
      await axiosInstance.delete(`/api/admin/brands/${brand._id}/logo`);
      toast.success('Logo eliminado');
      loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar el logo');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Escribí el nombre de la marca');
      return;
    }
    try {
      const response = await axiosInstance.post('/api/admin/brands', {
        name: newName.trim(),
        aliases: newAliases
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });
      const brand = response.data.data;
      if (pendingLogo && brand?._id) {
        await handleUpload(brand, pendingLogo);
      } else {
        toast.success('Marca creada. El logo queda guardado aunque no haya productos.');
      }
      setShowAdd(false);
      setNewName('');
      setNewAliases('');
      setPendingLogo(null);
      loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo crear la marca');
    }
  };

  const startEdit = (brand) => {
    setEditingId(brand._id);
    setEditName(brand.name || '');
    setEditAliases((brand.aliases || []).join(', '));
  };

  const handleSaveEdit = async (brandId) => {
    try {
      await axiosInstance.put(`/api/admin/brands/${brandId}`, {
        name: editName.trim(),
        aliases: editAliases
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });
      toast.success('Marca actualizada');
      setEditingId(null);
      loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar');
    }
  };

  const handleDeleteBrand = async (brand) => {
    if (!window.confirm(`¿Eliminar la ficha de ${brand.name}? Los productos no se borran.`)) return;
    try {
      await axiosInstance.delete(`/api/admin/brands/${brand._id}`);
      toast.success('Marca eliminada del listado de logos');
      loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const visibleStats = useMemo(
    () => ({
      showing: brands.length,
      ...stats
    }),
    [brands.length, stats]
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaTrademark className="text-[#2A3190]" />
            Logos de marca
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cargá o pegá el logo (Ctrl+V). Las marcas con logo se conservan aunque se queden sin stock.
            El worker de Visão agrega marcas nuevas reales; no borra las existentes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <FaSyncAlt className={syncing ? 'animate-spin' : ''} />
            Sincronizar desde productos
          </button>
          <button
            type="button"
            onClick={handleRebuild}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-60"
          >
            <FaEraser />
            Limpiar sin logo
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A3190] text-white hover:bg-[#1f246c]"
          >
            <FaPlus />
            Nueva marca
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Marcas</div>
          <div className="text-2xl font-bold text-slate-800">{visibleStats.total}</div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-emerald-700">Con logo</div>
          <div className="text-2xl font-bold text-emerald-800">{visibleStats.withLogo}</div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-amber-700">Sin logo</div>
          <div className="text-2xl font-bold text-amber-800">{visibleStats.withoutLogo}</div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
          <h3 className="font-semibold text-gray-800 mb-3">Agregar marca</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre (ej. Apple)"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              value={newAliases}
              onChange={(e) => setNewAliases(e.target.value)}
              placeholder="Alias separados por coma (APPLE, apple)"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div
            className={`mt-3 rounded-lg border-2 border-dashed p-4 text-sm text-center ${
              dragOverId === 'new' ? 'border-[#2A3190] bg-indigo-50' : 'border-gray-300 bg-white'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId('new');
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={handleNewDrop}
          >
            {pendingPreview ? (
              <div className="flex items-center justify-center gap-3">
                <img src={pendingPreview} alt="Vista previa" className="h-14 w-auto max-w-[120px] object-contain" />
                <button type="button" className="text-red-600 text-xs" onClick={() => setPendingLogo(null)}>
                  Quitar
                </button>
              </div>
            ) : (
              <p className="text-gray-500">
                Pegá el logo con <strong>Ctrl+V</strong> o arrastralo acá. Se guarda aunque no haya productos.
              </p>
            )}
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handlePasteButton(null)}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-gray-300"
              >
                <FaPaste /> Pegar logo
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A3190] text-white"
            >
              <FaSave /> Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setPendingLogo(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300"
            >
              <FaTimes /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div className="relative flex-1 max-w-xl">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar marca (APPLE, hp, asus...)"
            className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'without-logo', label: 'Sin logo' },
            { id: 'with-logo', label: 'Con logo' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                filter === item.id
                  ? 'bg-[#2A3190] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-5 p-4 rounded-lg bg-indigo-50 border border-indigo-100">
        <label className="text-sm text-indigo-900">
          Tamaño al subir
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="ml-2 rounded-md border border-indigo-200 px-2 py-1 bg-white"
          >
            {SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}×{option} px
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="checkbox"
            checked={removeBackground}
            onChange={(e) => setRemoveBackground(e.target.checked)}
          />
          Quitar fondo blanco al cargar
        </label>
        <p className="text-xs text-indigo-800 sm:ml-auto self-center">
          Clic en una marca → Ctrl+V para pegar el logo
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Cargando marcas…</div>
      ) : brands.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay marcas todavía. Tocá <strong>Sincronizar desde productos</strong> o creá una y pegá el logo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brands.map((brand) => {
            const isEditing = editingId === brand._id;
            const isSelected = selectedBrandId === brand._id;
            const isDrag = dragOverId === brand._id;
            return (
              <div
                key={brand._id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBrandId(brand._id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedBrandId(brand._id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(brand._id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleCardDrop(e, brand)}
                className={`border rounded-xl p-4 flex gap-3 text-left transition-colors ${
                  isDrag
                    ? 'border-[#2A3190] bg-indigo-50'
                    : isSelected
                      ? 'border-[#2A3190] ring-2 ring-[#2A3190]/20'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white"
                  style={brand.logoUrl ? checkerboardStyle : undefined}
                >
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="max-h-[72px] max-w-[72px] object-contain"
                    />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 px-1 text-center">
                      {isSelected ? 'Ctrl+V' : 'Sin logo'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={editAliases}
                        onChange={(e) => setEditAliases(e.target.value)}
                        placeholder="Alias"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(brand._id)}
                          className="text-sm text-white bg-[#2A3190] px-2 py-1 rounded"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-sm text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-gray-900 truncate">{brand.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {(brand.aliases || []).filter((alias) => alias !== brand.name).join(' · ') || 'Sin alias extra'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {brand.productCount || 0} producto{(brand.productCount || 0) === 1 ? '' : 's'}
                        {brand.logoUrl ? ' · logo guardado' : ''}
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={(el) => {
                        fileRefs.current[brand._id] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleUpload(brand, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={uploadingId === brand._id}
                      onClick={() => fileRefs.current[brand._id]?.click()}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-[#2A3190] text-white disabled:opacity-60"
                    >
                      <FaUpload />
                      {uploadingId === brand._id ? 'Subiendo…' : brand.logoUrl ? 'Reemplazar' : 'Cargar'}
                    </button>
                    <button
                      type="button"
                      disabled={uploadingId === brand._id}
                      onClick={() => handlePasteButton(brand)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 disabled:opacity-60"
                    >
                      <FaPaste /> Pegar
                    </button>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(brand)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700"
                      >
                        <FaEdit /> Editar
                      </button>
                    )}
                    {brand.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLogo(brand)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-amber-200 text-amber-700"
                      >
                        Quitar logo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBrand(brand)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md text-red-600"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrandLogosManagement;

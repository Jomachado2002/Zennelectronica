import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import {
  FaArrowDown,
  FaArrowUp,
  FaEdit,
  FaPlus,
  FaSave,
  FaStore,
  FaSync,
  FaTimes,
  FaTrash
} from 'react-icons/fa';
import SummaryApi from '../common';
import useCategories from '../hooks/useCategories';
import { clearHomeLocalCache } from '../hooks/useProducts';

const emptyForm = () => ({
  key: '',
  title: '',
  subtitle: '',
  layout: 'grid',
  enabled: true,
  order: 100,
  pairs: [{ category: '', subcategory: '' }],
  verMas: { category: '', subcategory: '' },
  filters: {
    brandNames: [],
    specifications: {},
    priceMin: '',
    priceMax: '',
    minStock: 1
  }
});

const sectionToForm = (s) => ({
  key: s.key || '',
  title: s.title || '',
  subtitle: s.subtitle || '',
  layout: s.layout || 'grid',
  enabled: s.enabled !== false,
  order: s.order ?? 100,
  pairs:
    Array.isArray(s.pairs) && s.pairs.length
      ? s.pairs.map((p) => ({ category: p.category, subcategory: p.subcategory }))
      : [{ category: '', subcategory: '' }],
  verMas: {
    category: s.verMas?.category || s.pairs?.[0]?.category || '',
    subcategory: s.verMas?.subcategory || s.pairs?.[0]?.subcategory || ''
  },
  filters: {
    brandNames: Array.isArray(s.filters?.brandNames) ? [...s.filters.brandNames] : [],
    specifications:
      s.filters?.specifications && typeof s.filters.specifications === 'object'
        ? Object.fromEntries(
            Object.entries(s.filters.specifications).map(([k, v]) => [
              k,
              Array.isArray(v) ? [...v] : []
            ])
          )
        : {},
    priceMin: s.filters?.priceMin ?? '',
    priceMax: s.filters?.priceMax ?? '',
    minStock: s.filters?.minStock ?? 1
  }
});

const formToPayload = (form, { includeKey } = {}) => {
  const pairs = (form.pairs || [])
    .map((p) => ({
      category: String(p.category || '').trim(),
      subcategory: String(p.subcategory || '').trim()
    }))
    .filter((p) => p.category && p.subcategory);

  const specifications = {};
  for (const [key, values] of Object.entries(form.filters?.specifications || {})) {
    const arr = Array.isArray(values) ? values.filter(Boolean) : [];
    if (arr.length) specifications[key] = arr;
  }

  const payload = {
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    layout: form.layout,
    enabled: !!form.enabled,
    order: Number(form.order) || 100,
    // Pool interno; el carrusel muestra 5 móvil / 10 desktop
    limit: form.layout === 'grid' ? 12 : 20,
    pairs,
    verMas: {
      category: form.verMas.category || pairs[0]?.category || '',
      subcategory: form.verMas.subcategory || pairs[0]?.subcategory || ''
    },
    filters: {
      brandNames: Array.isArray(form.filters.brandNames)
        ? form.filters.brandNames.filter(Boolean)
        : [],
      specifications,
      priceMin: form.filters.priceMin === '' ? null : Number(form.filters.priceMin),
      priceMax: form.filters.priceMax === '' ? null : Number(form.filters.priceMax),
      minStock: Number(form.filters.minStock) || 0
    }
  };
  if (includeKey) payload.key = form.key.trim().toLowerCase().replace(/\s+/g, '_');
  return payload;
};

const prettySpecLabel = (key) => {
  const map = {
    processor: 'Procesador',
    memory: 'Memoria RAM',
    storage: 'Almacenamiento',
    disk: 'Disco',
    graphicsCard: 'Tarjeta Gráfica',
    notebookScreen: 'Pantalla',
    notebookBattery: 'Batería',
    ramType: 'Tipo de RAM',
    ramSpeed: 'Velocidad',
    ramCapacity: 'Capacidad',
    motherboardSocket: 'Socket',
    motherboardChipset: 'Chipset',
    monitorSize: 'Tamaño',
    monitorResolution: 'Resolución',
    monitorRefreshRate: 'Refresh Rate'
  };
  if (map[key]) return map[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
};

const HomeVitrinasManagement = () => {
  const queryClient = useQueryClient();
  const { getCategoriesForSelect, getSubcategoriesByCategory, loading: catsLoading } = useCategories();
  const categories = getCategoriesForSelect();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [availableFilters, setAvailableFilters] = useState({ brands: [], specifications: {} });
  const [loadingFilters, setLoadingFilters] = useState(false);

  const apiBase = SummaryApi.baseURL || '';

  const pairsKey = useMemo(
    () =>
      (form.pairs || [])
        .filter((p) => p.category && p.subcategory)
        .map((p) => `${p.category}::${p.subcategory}`)
        .sort()
        .join('|'),
    [form.pairs]
  );

  const fetchAvailableFilters = useCallback(
    async (pairs) => {
      const valid = (pairs || []).filter((p) => p.category && p.subcategory);
      if (!valid.length) {
        setAvailableFilters({ brands: [], specifications: {} });
        return;
      }
      try {
        setLoadingFilters(true);
        const res = await fetch(SummaryApi.filterProduct.url, {
          method: SummaryApi.filterProduct.method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: [...new Set(valid.map((p) => p.category))],
            subcategory: [...new Set(valid.map((p) => p.subcategory))],
            brandName: [],
            specifications: {}
          })
        });
        const data = await res.json();
        if (data.success) {
          const brands = (data.filters?.brands || []).filter(Boolean).sort();
          const specifications = data.filters?.specifications || {};
          setAvailableFilters({ brands, specifications });
          // Limpiar selecciones que ya no aplican a la nueva cat/sub
          setForm((prev) => {
            const nextBrands = (prev.filters.brandNames || []).filter((b) => brands.includes(b));
            const nextSpecs = {};
            for (const [k, vals] of Object.entries(prev.filters.specifications || {})) {
              const allowed = specifications[k] || [];
              const kept = (vals || []).filter((v) => allowed.includes(v));
              if (kept.length) nextSpecs[k] = kept;
            }
            return {
              ...prev,
              filters: {
                ...prev.filters,
                brandNames: nextBrands,
                specifications: nextSpecs
              }
            };
          });
        } else {
          setAvailableFilters({ brands: [], specifications: {} });
        }
      } catch {
        setAvailableFilters({ brands: [], specifications: {} });
      } finally {
        setLoadingFilters(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!modalOpen) return;
    fetchAvailableFilters(form.pairs);
  }, [modalOpen, pairsKey, fetchAvailableFilters, form.pairs]);

  const toggleBrand = (brand) => {
    setForm((prev) => {
      const current = prev.filters.brandNames || [];
      const next = current.includes(brand)
        ? current.filter((b) => b !== brand)
        : [...current, brand];
      return { ...prev, filters: { ...prev.filters, brandNames: next } };
    });
  };

  const toggleSpecValue = (specKey, value) => {
    setForm((prev) => {
      const specs = { ...(prev.filters.specifications || {}) };
      const current = Array.isArray(specs[specKey]) ? specs[specKey] : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length) specs[specKey] = next;
      else delete specs[specKey];
      return { ...prev, filters: { ...prev.filters, specifications: specs } };
    });
  };

  const invalidateHomeCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['category-products', 'home'] });
    queryClient.removeQueries({ queryKey: ['category-products', 'home'] });
    clearHomeLocalCache();
  }, [queryClient]);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/admin/home-sections`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al cargar');
      setSections(data.data || []);
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las vitrinas');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (section) => {
    setEditingId(section._id);
    setForm(sectionToForm(section));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const updatePair = (index, field, value) => {
    setForm((prev) => {
      const pairs = [...prev.pairs];
      pairs[index] = {
        ...pairs[index],
        [field]: value,
        ...(field === 'category' ? { subcategory: '' } : {})
      };
      return { ...prev, pairs };
    });
  };

  const addPair = () => {
    setForm((prev) => ({
      ...prev,
      pairs: [...prev.pairs, { category: '', subcategory: '' }]
    }));
  };

  const removePair = (index) => {
    setForm((prev) => ({
      ...prev,
      pairs: prev.pairs.length <= 1 ? prev.pairs : prev.pairs.filter((_, i) => i !== index)
    }));
  };

  const saveSection = async (e) => {
    e.preventDefault();
    const payload = formToPayload(form, { includeKey: !editingId });
    if (!payload.title) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!editingId && !payload.key) {
      toast.error('La clave (key) es obligatoria');
      return;
    }
    if (!payload.pairs.length) {
      toast.error('Agregá al menos un par categoría / subcategoría');
      return;
    }

    try {
      setSaving(true);
      const url = editingId
        ? `${apiBase}/api/admin/home-sections/${editingId}`
        : `${apiBase}/api/admin/home-sections`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al guardar');
      toast.success(editingId ? 'Sección actualizada' : 'Sección creada');
      invalidateHomeCache();
      closeModal();
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (section) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/home-sections/${section._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formToPayload(sectionToForm(section)),
          enabled: !section.enabled
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error');
      invalidateHomeCache();
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado');
    }
  };

  const moveSection = async (index, direction) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const items = next.map((s, i) => ({ id: s._id, order: (i + 1) * 10 }));
    try {
      const res = await fetch(`${apiBase}/api/admin/home-sections/reorder`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al reordenar');
      setSections(data.data || next);
      invalidateHomeCache();
    } catch (err) {
      toast.error(err.message || 'No se pudo reordenar');
    }
  };

  const deleteSection = async (section) => {
    if (!window.confirm(`¿Eliminar la vitrina "${section.title}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/home-sections/${section._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al eliminar');
      toast.success('Sección eliminada');
      invalidateHomeCache();
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar');
    }
  };

  const reseed = async () => {
    if (
      !window.confirm(
        'Esto borra todas las vitrinas y vuelve a cargar los defaults del sistema. ¿Continuar?'
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/admin/home-sections/seed`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error');
      toast.success('Vitrinas restauradas a defaults');
      invalidateHomeCache();
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'No se pudo restaurar');
    }
  };

  const layoutLabel = useMemo(
    () => ({
      hero: 'Hero (banner + carrusel)',
      full: 'Ancho completo',
      grid: 'Grilla 2 columnas'
    }),
    []
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaStore className="text-indigo-600" />
            Home / Vitrinas
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Editá títulos, categorías, límite y filtros de cada sección del home sin tocar código.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchSections}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm"
          >
            <FaSync /> Actualizar
          </button>
          <button
            type="button"
            onClick={reseed}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-sm"
          >
            Restaurar defaults
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
          >
            <FaPlus /> Nueva sección
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando vitrinas…</div>
        ) : sections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay secciones. Creá una o restaurá defaults.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Layout</th>
                  <th className="px-4 py-3 font-medium">Categorías</th>
                  <th className="px-4 py-3 font-medium">Activa</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sections.map((s, index) => (
                  <tr key={s._id} className={!s.enabled ? 'bg-gray-50 opacity-70' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                          onClick={() => moveSection(index, -1)}
                          title="Subir"
                        >
                          <FaArrowUp />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                          onClick={() => moveSection(index, 1)}
                          title="Bajar"
                        >
                          <FaArrowDown />
                        </button>
                        <span className="ml-1 text-gray-700">{s.order}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{s.subtitle}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.key}</td>
                    <td className="px-4 py-3 text-gray-700">{layoutLabel[s.layout] || s.layout}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 space-y-0.5 max-w-xs">
                        {(s.pairs || []).slice(0, 3).map((p, i) => (
                          <div key={`${p.category}-${p.subcategory}-${i}`} className="truncate">
                            {p.category} / {p.subcategory}
                          </div>
                        ))}
                        {(s.pairs || []).length > 3 && (
                          <div className="text-gray-400">+{(s.pairs || []).length - 3} más</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(s)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          s.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {s.enabled ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                      >
                        <FaEdit /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 ml-1"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar vitrina' : 'Nueva vitrina'}
              </h2>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={saveSection} className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!editingId && (
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">Clave interna (key)</span>
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={form.key}
                      onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                      placeholder="ej: notebooks"
                      required
                    />
                    <span className="text-xs text-gray-500">Solo minúsculas, números y _</span>
                  </label>
                )}
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-gray-700">Título</span>
                  <input
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Notebooks de Alto Rendimiento"
                    required
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-gray-700">Subtítulo</span>
                  <input
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="Gamer, oficina, estudio y accesorios"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Layout</span>
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.layout}
                    onChange={(e) => setForm((p) => ({ ...p, layout: e.target.value }))}
                  >
                    <option value="hero">Hero (banner + carrusel)</option>
                    <option value="full">Ancho completo</option>
                    <option value="grid">Grilla 2 columnas</option>
                  </select>
                  <span className="text-xs text-gray-500 mt-1 block">
                    En el home se muestran 5 productos en móvil y 10 en desktop.
                  </span>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Orden</span>
                  <input
                    type="number"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.order}
                    onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm mt-6">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  <span className="font-medium text-gray-700">Visible en el home</span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Categorías / subcategorías</h3>
                  <button
                    type="button"
                    onClick={addPair}
                    className="text-sm text-indigo-600 hover:underline"
                    disabled={catsLoading}
                  >
                    + Agregar par
                  </button>
                </div>
                <div className="space-y-3">
                  {form.pairs.map((pair, index) => {
                    const subs = pair.category ? getSubcategoriesByCategory(pair.category) : [];
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <label className="block text-sm">
                          <span className="text-gray-600">Categoría</span>
                          <select
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                            value={pair.category}
                            onChange={(e) => updatePair(index, 'category', e.target.value)}
                          >
                            <option value="">Seleccionar…</option>
                            {categories.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-600">Subcategoría</span>
                          <div className="flex gap-2 mt-1">
                            <select
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                              value={pair.subcategory}
                              onChange={(e) => updatePair(index, 'subcategory', e.target.value)}
                              disabled={!pair.category}
                            >
                              <option value="">Seleccionar…</option>
                              {subs.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removePair(index)}
                              className="px-3 rounded-lg text-red-600 hover:bg-red-50"
                              title="Quitar"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Ver más → categoría</span>
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.verMas.category}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        verMas: { category: e.target.value, subcategory: '' }
                      }))
                    }
                  >
                    <option value="">(usar primer par)</option>
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Ver más → subcategoría</span>
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={form.verMas.subcategory}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        verMas: { ...p.verMas, subcategory: e.target.value }
                      }))
                    }
                    disabled={!form.verMas.category}
                  >
                    <option value="">(usar primer par)</option>
                    {(form.verMas.category
                      ? getSubcategoriesByCategory(form.verMas.category)
                      : []
                    ).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">Filtros opcionales</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Se cargan según las categorías/subcategorías elegidas (igual que en el listado de
                  productos).
                </p>

                {loadingFilters ? (
                  <div className="text-sm text-gray-500 mb-3">Cargando filtros disponibles…</div>
                ) : !pairsKey ? (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                    Seleccioná al menos un par categoría/subcategoría para ver marcas y filtros.
                  </div>
                ) : (
                  <div className="space-y-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Marcas ({availableFilters.brands.length})
                      </div>
                      {availableFilters.brands.length === 0 ? (
                        <div className="text-xs text-gray-500">No hay marcas para esa selección.</div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableFilters.brands.map((brand) => {
                            const checked = (form.filters.brandNames || []).includes(brand);
                            return (
                              <label
                                key={brand}
                                className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded cursor-pointer ${
                                  checked ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleBrand(brand)}
                                />
                                <span className="truncate">{brand}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {Object.keys(availableFilters.specifications || {}).length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700">
                          Especificaciones (como en el listado)
                        </div>
                        {Object.entries(availableFilters.specifications).map(([specKey, values]) => (
                          <div key={specKey} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              {prettySpecLabel(specKey)}
                            </div>
                            <div className="max-h-28 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {(values || []).filter(Boolean).map((value) => {
                                const checked = (form.filters.specifications?.[specKey] || []).includes(
                                  value
                                );
                                return (
                                  <label
                                    key={`${specKey}-${value}`}
                                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded cursor-pointer ${
                                      checked ? 'bg-indigo-50 text-indigo-800' : 'bg-white hover:bg-gray-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleSpecValue(specKey, value)}
                                    />
                                    <span className="truncate">{String(value)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="text-gray-700">Precio mín. (Gs)</span>
                    <input
                      type="number"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={form.filters.priceMin}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          filters: { ...p.filters, priceMin: e.target.value }
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-700">Precio máx. (Gs)</span>
                    <input
                      type="number"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={form.filters.priceMax}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          filters: { ...p.filters, priceMax: e.target.value }
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-700">Stock mínimo</span>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={form.filters.minStock}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          filters: { ...p.filters, minStock: e.target.value }
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <FaSave /> {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeVitrinasManagement;

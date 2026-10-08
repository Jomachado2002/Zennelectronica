import React, { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

export default function CreativeSpecFocusPanel() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    let cancel = false;
    axiosInstance.get('/api/creativos/specs-foco')
      .then((res) => {
        if (!cancel) setRows(res.data?.data || []);
      })
      .catch(() => {
        if (!cancel) toast.error('No se pudo cargar la tabla de especificaciones');
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => (
      `${row.categoryLabel} ${row.subcategoryLabel}`.toLowerCase().includes(q)
    ));
  }, [rows, query]);

  const toggle = async (row, spec) => {
    const next = !spec.enabled;
    const key = `${row.category}::${row.subcategory}::${spec.name}`;
    setSaving(key);
    try {
      await axiosInstance.put('/api/creativos/specs-foco', {
        category: row.category,
        subcategory: row.subcategory,
        name: spec.name,
        enabled: next
      });
      setRows((prev) => prev.map((item) => {
        if (item.category !== row.category || item.subcategory !== row.subcategory) return item;
        return {
          ...item,
          specs: item.specs.map((itemSpec) => (
            itemSpec.name === spec.name ? { ...itemSpec, enabled: next } : itemSpec
          ))
        };
      }));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 flex justify-center">
        <FaSpinner className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">Qué spec sale en el flyer</h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Cada subcategoría muestra como máximo 3 datos, los que el cliente mira antes de comprar. Tildá o destildá para cambiar lo que aparece en la imagen.
      </p>
      <div className="relative mb-4 max-w-md">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar subcategoría, por ejemplo notebook"
          className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-full text-sm"
        />
      </div>
      <div className="space-y-2">
        {visible.map((row) => {
          const id = `${row.category}::${row.subcategory}`;
          const open = openId === id;
          const chosen = row.specs.filter((spec) => spec.enabled);
          return (
            <div key={id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? '' : id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{row.subcategoryLabel}</span>
                  <span className="block text-xs text-gray-500">{row.categoryLabel}</span>
                </span>
                <span className="text-xs font-medium text-[#7B2CBF] text-right">
                  {chosen.length
                    ? chosen.map((spec) => spec.label).join(' · ')
                    : 'Sin especificaciones en la imagen'}
                </span>
              </button>
              {open ? (
                <div className="border-t border-gray-100 px-4 py-3 grid sm:grid-cols-2 gap-2">
                  {chosen.length >= 3 ? (
                    <p className="sm:col-span-2 text-xs text-gray-500">Ya hay 3 datos. Destildá uno para elegir otro.</p>
                  ) : null}
                  {row.specs.length ? row.specs.map((spec) => {
                    const key = `${id}::${spec.name}`;
                    const blocked = !spec.enabled && chosen.length >= 3;
                    return (
                      <label key={spec.name} className={`flex items-center gap-2 text-sm ${blocked ? 'text-gray-400' : 'text-gray-800'}`}>
                        <input
                          type="checkbox"
                          checked={spec.enabled}
                          disabled={saving === key || blocked}
                          onChange={() => toggle(row, spec)}
                          className="h-4 w-4 rounded border-gray-300 text-[#7B2CBF]"
                        />
                        <span>{spec.label}</span>
                      </label>
                    );
                  }) : (
                    <p className="text-sm text-gray-500">Esta subcategoría no tiene especificaciones cargadas.</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {!visible.length ? (
          <p className="text-sm text-gray-500 py-6 text-center">No hay subcategorías con ese nombre.</p>
        ) : null}
      </div>
    </div>
  );
}

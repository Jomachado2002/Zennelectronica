import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaDownload,
  FaPlus,
  FaSpinner,
  FaStore,
  FaSyncAlt,
  FaTimes
} from 'react-icons/fa';
import axiosInstance from '../../config/axiosInstance';

const money = (n) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);

const TiendaNaranjaPage = () => {
  const [estado, setEstado] = useState(null);
  const [brands, setBrands] = useState([]);
  const [brandDraft, setBrandDraft] = useState('');
  const [diffs, setDiffs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingBrands, setSavingBrands] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [filters, setFilters] = useState({ promo: false, nuevos: false, gap: '' });

  const refresh = useCallback(async () => {
    const [e, m, d] = await Promise.all([
      axiosInstance.get('/api/admin/tienda-naranja/estado'),
      axiosInstance.get('/api/admin/tienda-naranja/marcas-descuento'),
      axiosInstance.get('/api/admin/tienda-naranja/diferencias', {
        params: {
          limit: 80,
          promo: filters.promo ? 1 : undefined,
          nuevos: filters.nuevos ? 1 : undefined,
          gap: filters.gap || undefined
        },
        timeout: 120000
      })
    ]);
    if (!e.data.success) throw new Error(e.data.message || 'No se pudo leer el estado');
    setEstado(e.data);
    setBrands(m.data.discountBrands || e.data.discountBrands || []);
    setDiffs(d.data);
  }, [filters.gap, filters.nuevos, filters.promo]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => toast.error(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data } = await axiosInstance.post(
        '/api/admin/tienda-naranja/sync-precios',
        {},
        { timeout: 900000 }
      );
      if (!data.success) throw new Error(data.message || 'Sync falló');
      toast.success(`TN sync: ok ${data.ok} · fallidos ${data.fail} · omitidos ${data.skipped}`);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSyncing(false);
    }
  };

  const downloadNuevos = async () => {
    setExcelBusy(true);
    try {
      const response = await axiosInstance.get('/api/admin/tienda-naranja/excel-nuevos', {
        responseType: 'blob',
        timeout: 900000,
        params: { probe: 1 }
      });
      const header = response.headers['content-disposition'] || '';
      const match = header.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : 'zenn-tn-solo-nuevos.xls';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      const rows = response.headers['x-tn-rows'];
      toast.success(rows ? `Excel listo · ${rows} productos nuevos` : 'Excel de altas nuevas listo');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo armar el Excel de nuevos');
    } finally {
      setExcelBusy(false);
    }
  };

  const saveBrands = async (next) => {
    setSavingBrands(true);
    try {
      const { data } = await axiosInstance.put('/api/admin/tienda-naranja/marcas-descuento', {
        discountBrands: next
      });
      if (!data.success) throw new Error(data.message || 'No se guardó');
      setBrands(data.discountBrands || []);
      toast.success('Marcas −5% actualizadas');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSavingBrands(false);
    }
  };

  const addBrand = () => {
    const value = brandDraft.trim().toLowerCase();
    if (!value) return;
    if (brands.includes(value)) {
      setBrandDraft('');
      return;
    }
    saveBrands([...brands, value]);
    setBrandDraft('');
  };

  const removeBrand = (brand) => {
    saveBrands(brands.filter((item) => item !== brand));
  };

  const lastSync = useMemo(() => {
    if (!estado?.lastPriceStockSyncAt) return 'Todavía no hubo sync';
    return new Date(estado.lastPriceStockSyncAt).toLocaleString('es-PY');
  }, [estado]);

  if (loading && !estado) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-600">
        <FaSpinner className="animate-spin" /> Cargando Tienda Naranja…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FaStore className="text-orange-500" />
            Tienda Naranja
          </h1>
          <p className="mt-2 text-gray-600 max-w-3xl">
            Precio de venta TN = costo Visão × 1,10 × 1,15 × 1,10 (Itaú). Marcas de la lista: −5%. Stock TN: 5 si está en Visão, 0 si no.
            Hasta el <strong>20/11/2026</strong> se manda también un precio tachado (40–70% de descuento visible) para que se vea la promo.
            Tras el worker Visão se actualizan solos los productos ya publicados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Estado</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {estado?.configured ? 'Credenciales OK' : 'Faltan credenciales'}
            </p>
            <p className="text-sm text-gray-500">Markup ×{(estado?.markup || 1.3915).toFixed(4)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Último sync precio/stock</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{lastSync}</p>
            <p className="text-sm text-gray-500">{estado?.lastPriceStockSync?.message || '—'}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Diferencias cargadas</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{diffs?.total ?? '—'}</p>
            <p className="text-sm text-gray-500">
              Publicados {diffs?.published ?? 0} · Sin publicar {diffs?.unpublished ?? 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {syncing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
            {syncing ? 'Sincronizando…' : 'Sincronizar precios y stock ahora'}
          </button>
          <button
            type="button"
            onClick={downloadNuevos}
            disabled={excelBusy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-50"
          >
            {excelBusy ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {excelBusy ? 'Armando Excel…' : 'Descargar Excel de altas nuevas'}
          </button>
          <button
            type="button"
            onClick={() => refresh().catch((err) => toast.error(err.message))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <FaSyncAlt /> Actualizar tabla
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Marcas con −5% en Tienda Naranja</h2>
          <p className="text-sm text-gray-600 mb-4">
            Estas marcas salen 5% debajo del precio TN normal para empujar venta con Itaú.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {brands.map((brand) => (
              <span
                key={brand}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-800 text-sm"
              >
                {brand}
                <button
                  type="button"
                  onClick={() => removeBrand(brand)}
                  disabled={savingBrands}
                  className="text-orange-600 hover:text-orange-900"
                  aria-label={`Quitar ${brand}`}
                >
                  <FaTimes className="h-3 w-3" />
                </button>
              </span>
            ))}
            {!brands.length && <span className="text-sm text-gray-500">Sin marcas cargadas</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={brandDraft}
              onChange={(e) => setBrandDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBrand()}
              placeholder="Agregar marca (ej. redragon)"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[220px]"
            />
            <button
              type="button"
              onClick={addBrand}
              disabled={savingBrands || !brandDraft.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-orange-500 text-white text-sm disabled:opacity-50"
            >
              <FaPlus /> Agregar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Diferencias Zenn vs Tienda Naranja</h2>
              <p className="text-sm text-gray-600">
                El precio de TN no es el de zenn.com.py: lleva el margen Itaú (y −5% en marcas de la lista).
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.promo}
                  onChange={(e) => setFilters((f) => ({ ...f, promo: e.target.checked }))}
                />
                Solo marcas −5%
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.nuevos}
                  onChange={(e) => setFilters((f) => ({ ...f, nuevos: e.target.checked }))}
                />
                Solo sin publicar
              </label>
              <label className="inline-flex items-center gap-2">
                Gap % ≥
                <input
                  type="number"
                  min="0"
                  value={filters.gap}
                  onChange={(e) => setFilters((f) => ({ ...f, gap: e.target.value }))}
                  className="w-16 border border-gray-300 rounded px-2 py-1"
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Zenn</th>
                  <th className="py-2 pr-3">TN calc.</th>
                  <th className="py-2 pr-3">Delta</th>
                  <th className="py-2 pr-3">Stock TN</th>
                  <th className="py-2 pr-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(diffs?.items || []).map((row) => (
                  <tr key={row.sku} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-mono text-xs">{row.sku}</td>
                    <td className="py-2 pr-3">
                      <div className="max-w-xs truncate" title={row.nombre}>
                        {row.nombre}
                      </div>
                      {row.discountBrand ? (
                        <span className="text-xs text-orange-600">−5% {row.brandName || 'marca'}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{money(row.zennPrice)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-medium">{money(row.tnPrice)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.deltaPct == null ? '—' : `${row.deltaPct > 0 ? '+' : ''}${row.deltaPct}%`}
                    </td>
                    <td className="py-2 pr-3">{row.tnStock}</td>
                    <td className="py-2 pr-3">
                      {row.published ? (
                        <span className="text-green-700">En TN</span>
                      ) : (
                        <span className="text-amber-700">Alta pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!diffs?.items?.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Sin filas para estos filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TiendaNaranjaPage;

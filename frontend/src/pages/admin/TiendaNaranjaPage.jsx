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
    const [e, m] = await Promise.all([
      axiosInstance.get('/api/admin/tienda-naranja/estado', { timeout: 15000 }),
      axiosInstance.get('/api/admin/tienda-naranja/marcas-descuento', { timeout: 15000 })
    ]);
    if (!e.data.success) throw new Error(e.data.message || 'No se pudo leer el estado');
    setEstado(e.data);
    setBrands(m.data.discountBrands || e.data.discountBrands || []);

    // Diferencias solo si el worker ya corrió; si no, vacío sin llamar a TN.
    if (!e.data.lastPriceStockSyncAt) {
      setDiffs({
        total: 0,
        published: 0,
        unpublished: 0,
        items: [],
        fromWorker: false,
        message: 'Todavía no hay sync del worker. Cuando Visão actualice TN, acá se ven las diferencias.'
      });
      return;
    }

    const d = await axiosInstance.get('/api/admin/tienda-naranja/diferencias', {
      params: {
        limit: 80,
        promo: filters.promo ? 1 : undefined,
        nuevos: filters.nuevos ? 1 : undefined,
        gap: filters.gap || undefined
      },
      timeout: 30000
    });
    setDiffs(d.data);
  }, [filters.gap, filters.nuevos, filters.promo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((err) => {
        if (!cancelled) {
          toast.error(err.response?.data?.message || err.message);
          setDiffs({ total: 0, items: [], fromWorker: false, message: 'No se pudo cargar.' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
        params: { probe: 0 }
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
    if (!estado?.lastPriceStockSyncAt) return null;
    return new Date(estado.lastPriceStockSyncAt).toLocaleString('es-PY');
  }, [estado]);

  const hasWorkerData = Boolean(estado?.lastPriceStockSyncAt);

  if (loading) {
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
            Acá solo se muestra lo que ya mandó el worker (precios/stock). Si todavía no corrió, la tabla queda vacía.
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
            <p className="text-xs uppercase tracking-wide text-gray-500">Último sync del worker</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{lastSync || 'Sin sync todavía'}</p>
            <p className="text-sm text-gray-500">{estado?.lastPriceStockSync?.message || '—'}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Filas del último sync</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {hasWorkerData ? (diffs?.total ?? 0) : '—'}
            </p>
            <p className="text-sm text-gray-500">
              {hasWorkerData
                ? `Publicados ${diffs?.published ?? 0}`
                : 'Esperando worker Visão + TN'}
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
            onClick={() => {
              setLoading(true);
              refresh()
                .catch((err) => toast.error(err.message))
                .finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <FaSyncAlt /> Actualizar
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Marcas con −5% en Tienda Naranja</h2>
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
            {!brands.length && <span className="text-sm text-gray-500">Sin marcas</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={brandDraft}
              onChange={(e) => setBrandDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBrand()}
              placeholder="Agregar marca"
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
              <h2 className="text-lg font-semibold text-gray-900">Resultado del worker</h2>
              <p className="text-sm text-gray-600">
                {diffs?.message
                  || (hasWorkerData
                    ? 'Solo productos que el worker ya tocó en Tienda Naranja.'
                    : 'Sin datos todavía.')}
              </p>
            </div>
            {hasWorkerData ? (
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
            ) : null}
          </div>

          {!hasWorkerData || !(diffs?.items || []).length ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              {hasWorkerData ? 'El último sync no dejó filas para mostrar.' : 'Nada para mostrar hasta que corra el worker.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 pr-3">Zenn</th>
                    <th className="py-2 pr-3">TN calc.</th>
                    <th className="py-2 pr-3">TN remoto</th>
                    <th className="py-2 pr-3">Stock TN</th>
                    <th className="py-2 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(diffs?.items || []).map((row) => (
                    <tr key={row.sku} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-mono text-xs">{row.sku}</td>
                      <td className="py-2 pr-3">
                        <div className="max-w-xs truncate" title={row.nombre}>{row.nombre}</div>
                        {row.lastError ? (
                          <span className="text-xs text-red-600">{row.lastError}</span>
                        ) : row.discountBrand ? (
                          <span className="text-xs text-orange-600">−5%</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{money(row.zennPrice)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap font-medium">{money(row.tnPrice)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {row.remotePrice == null ? '—' : money(row.remotePrice)}
                      </td>
                      <td className="py-2 pr-3">{row.tnStock}</td>
                      <td className="py-2 pr-3">
                        {row.lastError ? (
                          <span className="text-red-700">Error</span>
                        ) : (
                          <span className="text-green-700">Sync OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TiendaNaranjaPage;

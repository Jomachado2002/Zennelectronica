import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaPlay,
  FaSave,
  FaSpinner,
  FaSyncAlt,
  FaPowerOff,
  FaStop,
} from 'react-icons/fa';
import axiosInstance from '../../config/axiosInstance';

const pad = (n) => String(n).padStart(2, '0');

const statusLabel = {
  queued: 'En cola',
  running: 'En curso',
  success: 'OK',
  error: 'Error',
  cancelled: 'Cancelado',
};

const AdminWorkerPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [openLog, setOpenLog] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    const [s, l] = await Promise.all([
      axiosInstance.get('/api/worker/settings'),
      axiosInstance.get('/api/worker/logs', { params: { limit: 40 } }),
    ]);
    if (!s.data.success) throw new Error(s.data.message || 'Error al leer settings');
    setSettings(s.data.settings);
    setLogs(l.data.logs || []);
    setRunning(Boolean(s.data.running || l.data.running));
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const next = { ...settings, ...patch };
      const { data } = await axiosInstance.put('/api/worker/settings', {
          enabled: next.enabled,
          runHour: Number(next.runHour),
          runMinute: Number(next.runMinute),
          intervalHours: Number(next.intervalHours),
          profitMargin: Number(next.profitMargin),
          deliveryCost: Number(next.deliveryCost),
          cleanupMissingStock: Boolean(next.cleanupMissingStock),
      });
      if (!data.success) throw new Error(data.message || 'No se pudo guardar');
      setSettings(data.settings);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (quick) => {
    try {
      await axiosInstance.post('/api/worker/run', { quick });
      toast.info(quick ? 'Prueba rápida en cola. Ya debe verse en logs.' : 'Corrida en cola. Ya debe verse en logs.');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const cancelJob = async () => {
    setCancelling(true);
    try {
      await axiosInstance.post('/api/worker/cancel');
      toast.warn('Cancelación pedida. El worker para en el próximo lote.');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setCancelling(false);
    }
  };

  const busy = running || logs.some((l) => l.status === 'queued' || l.status === 'running');
  const cancellingUi = Boolean(settings?.cancelRequested);
  const timeValue = settings
    ? `${pad(settings.runHour || 0)}:${pad(settings.runMinute || 0)}`
    : '03:00';

  if (loading) {
    return (
      <div className="p-8 flex items-center text-gray-600">
        <FaSpinner className="animate-spin mr-2" /> Cargando worker...
      </div>
    );
  }

  if (!settings) {
    return <div className="p-8 text-red-600">No se pudo cargar la configuración del worker.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Worker Visão</h1>
          <p className="text-sm text-gray-600">
            Horario y logs en Mongo (3 días). jobs-api solo lee settings y escribe logs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh().catch((e) => toast.error(e.message))}
          className="px-3 py-2 text-sm border rounded-lg flex items-center gap-2"
        >
          <FaSyncAlt /> Actualizar
        </button>
      </div>

      {busy && (
        <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4 text-amber-950 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-lg">
              {cancellingUi ? 'Cancelando worker…' : 'Worker en ejecución — no inicies otra corrida'}
            </p>
            <p className="text-sm mt-1">
              Puede tardar varias horas. El progreso sale en la consola de jobs-api; al terminar el histórico guarda creados, actualizados y errores.
            </p>
          </div>
          <button
            type="button"
            disabled={cancelling || cancellingUi}
            onClick={cancelJob}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm flex items-center gap-2"
          >
            {cancelling ? <FaSpinner className="animate-spin" /> : <FaStop />} Cancelar job
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg border p-4 ${settings.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
          <div className="text-xs uppercase text-gray-500">Estado</div>
          <div className="text-lg font-semibold mt-1">
            {busy ? 'Ejecutando' : settings.enabled ? 'Encendido' : 'Apagado'}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-xs uppercase text-gray-500">Próxima corrida</div>
          <div className="text-lg font-semibold mt-1">
            {settings.enabled && settings.nextRunAt
              ? new Date(settings.nextRunAt).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })
              : '—'}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-xs uppercase text-gray-500">Última corrida</div>
          <div className="text-lg font-semibold mt-1">
            {settings.lastRunAt
              ? `${new Date(settings.lastRunAt).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })} (${settings.lastStatus || '—'})`
              : '—'}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">Horario y parámetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={Boolean(settings.enabled)}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            Worker encendido (usa el horario)
          </label>
          <label className="text-sm">
            Hora (Asunción)
            <input
              type="time"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              disabled={busy}
              value={timeValue}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':');
                setSettings({ ...settings, runHour: Number(h), runMinute: Number(m) });
              }}
            />
          </label>
          <label className="text-sm">
            Cada cuántas horas
            <input
              type="number"
              min={1}
              max={168}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              disabled={busy}
              value={settings.intervalHours}
              onChange={(e) => setSettings({ ...settings, intervalHours: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm">
            Margen de ganancia %
            <input
              type="number"
              min={0}
              max={100}
              disabled={busy}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={settings.profitMargin}
              onChange={(e) => setSettings({ ...settings, profitMargin: Number(e.target.value) })}
            />
            <span className="text-xs text-gray-500">
              Venta = (precio Visão / (1 − margen)) + envío. Con 20% se divide por 0,80.
            </span>
          </label>
          <label className="text-sm">
            Costo de envío
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              disabled={busy}
              value={settings.deliveryCost}
              onChange={(e) => setSettings({ ...settings, deliveryCost: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              disabled={busy}
              checked={Boolean(settings.cleanupMissingStock)}
              onChange={(e) => setSettings({ ...settings, cleanupMissingStock: e.target.checked })}
            />
            Limpiar stock de productos que ya no están
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || busy}
            onClick={() => save({})}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm flex items-center gap-2"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Guardar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runNow(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2"
          >
            <FaPlay /> Correr espejo completo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runNow(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm flex items-center gap-2"
          >
            Prueba rápida
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save({ enabled: false })}
            className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2"
          >
            <FaPowerOff /> Apagar horario
          </button>
        </div>
        {settings.lastStatus === 'error' && (
          <p className="text-sm text-red-600">Último estado: error (ver logs)</p>
        )}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Histórico (3 días)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Creados</th>
                <th className="px-3 py-2">Actualizados</th>
                <th className="px-3 py-2">Cats / Subs</th>
                <th className="px-3 py-2">Errores</th>
                <th className="px-3 py-2">Duración</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    Todavía no hay corridas.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <React.Fragment key={log._id}>
                  <tr
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => setOpenLog(openLog === log._id ? null : log._id)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(log.startedAt).toLocaleString('es-PY')}
                    </td>
                    <td className="px-3 py-2">{statusLabel[log.status] || log.status}</td>
                    <td className="px-3 py-2">{log.trigger}</td>
                    <td className="px-3 py-2">{log.summary?.productsCreated ?? 0}</td>
                    <td className="px-3 py-2">{log.summary?.productsUpdated ?? 0}</td>
                    <td className="px-3 py-2">
                      {log.summary?.categoriesCount ?? (log.taxonomy || []).length} /{' '}
                      {log.summary?.subcategoriesCount ??
                        (log.taxonomy || []).reduce((n, c) => n + (c.subcategories || []).length, 0)}
                    </td>
                    <td className="px-3 py-2">{log.summary?.productsErrors ?? 0}</td>
                    <td className="px-3 py-2">
                      {log.durationMs != null ? `${Math.round(log.durationMs / 1000)}s` : '—'}
                    </td>
                  </tr>
                  {openLog === log._id && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-3 py-3 text-xs space-y-2">
                        {log.errorMessage && (
                          <p className="text-red-700 font-medium">{log.errorMessage}</p>
                        )}
                        <p>
                          Omitidos: {log.summary?.productsSkipped ?? 0} · Stock limpio:{' '}
                          {log.summary?.stockCleanupCount ?? 0}
                        </p>
                        {(log.events || []).map((ev, i) => (
                          <div key={i} className="font-mono text-gray-700">
                            [{new Date(ev.at).toLocaleTimeString('es-PY')}] {ev.message}
                          </div>
                        ))}
                        {(log.taxonomy || []).map((cat) => (
                          <div key={cat.value}>
                            {cat.label}: +{cat.created} / ~{cat.updated}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkerPage;

import React, { useCallback, useEffect, useState } from 'react';
import SummaryApi from '../../common';
import { authFetch } from '../../helpers/authFetch';

const PERIODS = [
  { days: 7, label: '7 días' },
  { days: 28, label: '28 días' },
  { days: 90, label: '90 días' }
];

const TYPES = [
  { id: 'web', label: 'Web' },
  { id: 'image', label: 'Imágenes' },
  { id: 'video', label: 'Video' }
];

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('es-PY');
}

function formatCtr(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

function formatPosition(value) {
  const n = Number(value) || 0;
  if (!n) return '—';
  return n.toFixed(1);
}

function deltaText(current, previous, { lowerIsBetter = false, asPercent = false } = {}) {
  if (previous == null || !Number.isFinite(Number(previous))) return null;
  const diff = Number(current) - Number(previous);
  const abs = Math.abs(diff);
  if (abs < (asPercent ? 0.0005 : 0.05)) return { text: 'igual', better: null };
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const amount = asPercent ? `${(abs * 100).toFixed(1)} pp` : lowerIsBetter ? abs.toFixed(1) : formatNumber(abs);
  return { text: `${diff > 0 ? '+' : '−'}${amount}`, better };
}

function Metric({ label, value, hint }) {
  return (
    <div className="bg-white border border-gray-200 p-4">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-700 mt-1">{label}</p>
      {hint && <p className={`text-xs mt-1 ${hint.better === true ? 'text-emerald-700' : hint.better === false ? 'text-red-600' : 'text-gray-500'}`}>{hint.text} vs. período anterior</p>}
    </div>
  );
}

function Table({ rows, firstHeader, empty }) {
  if (!rows?.length) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-3 font-medium">{firstHeader}</th>
            <th className="py-2 pr-3 font-medium">Clics</th>
            <th className="py-2 pr-3 font-medium">Impresiones</th>
            <th className="py-2 pr-3 font-medium">CTR</th>
            <th className="py-2 font-medium">Posición</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key || row.label} className="border-b border-gray-100">
              <td className="py-2 pr-3 text-gray-900 max-w-[280px] truncate" title={row.key}>{row.label || row.key}</td>
              <td className="py-2 pr-3">{formatNumber(row.clicks)}</td>
              <td className="py-2 pr-3">{formatNumber(row.impressions)}</td>
              <td className="py-2 pr-3">{formatCtr(row.ctr)}</td>
              <td className="py-2">{formatPosition(row.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SearchConsolePage() {
  const [days, setDays] = useState(28);
  const [searchType, setSearchType] = useState('web');
  const [status, setStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const statusResponse = await authFetch(`${SummaryApi.baseURL}/api/admin/search-console/estado`);
      const statusBody = await statusResponse.json();
      setStatus(statusBody.data || null);
      if (statusBody.data?.configError) setError(statusBody.data.configError);
      if (!statusBody.data?.configured || statusBody.data?.siteAccess === false) {
        setReport(null);
        if (!statusBody.success && statusBody.message) setError(statusBody.message);
        return;
      }

      const reportResponse = await authFetch(
        `${SummaryApi.baseURL}/api/admin/search-console/informe?days=${days}&type=${searchType}${refresh ? '&refresh=1' : ''}`
      );
      const reportBody = await reportResponse.json();
      if (!reportResponse.ok || !reportBody.success) {
        throw new Error(reportBody.message || 'No se pudo leer Search Console');
      }
      setReport(reportBody.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days, searchType]);

  useEffect(() => {
    load(false);
  }, [load]);

  const summary = report?.summary || {};
  const previous = report?.previous || {};
  const maxImpressions = Math.max(...(report?.byDate || []).map((row) => row.impressions), 1);
  const configured = status?.configured;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-full">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#2A3190]">Google Search</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lo que Google ya muestra de zenn.com.py: consultas, páginas y dónde se puede ganar clic.
            {report?.range ? ` Datos del ${report.range.startDate} al ${report.range.endDate}.` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              onClick={() => setDays(period.days)}
              className={`px-3 py-1.5 text-sm border ${days === period.days ? 'bg-[#2A3190] text-white border-[#2A3190]' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {period.label}
            </button>
          ))}
          {TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSearchType(type.id)}
              className={`px-3 py-1.5 text-sm border ${searchType === type.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {type.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 bg-white disabled:opacity-60"
          >
            {loading ? 'Leyendo…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {status && !configured && (
        <section className="bg-white border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Falta conectar la cuenta de Search Console</h2>
          <p className="text-sm text-gray-600 mt-2">
            La API es gratuita. Hace falta una cuenta de servicio con permiso sobre la propiedad. La clave queda solo en el servidor.
          </p>
          <ol className="mt-4 space-y-2 text-sm text-gray-800 list-decimal pl-5">
            {(status.steps || []).map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>
      )}

      {configured && status && !status.siteAccess && status.sites && (
        <section className="bg-white border border-amber-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">La cuenta no ve la propiedad configurada</h2>
          <p className="text-sm text-gray-600 mt-2">
            El servidor busca <span className="font-mono">{status.siteUrl}</span>
            {status.clientEmail ? ` con ${status.clientEmail}` : ''}. En Search Console el identificador tiene que coincidir exactamente.
          </p>
          {status.sites.length > 0 ? (
            <ul className="mt-3 text-sm font-mono text-gray-800 space-y-1">
              {status.sites.map((site) => <li key={site.siteUrl}>{site.siteUrl}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 mt-3">Esta cuenta todavía no tiene propiedades. Agregala como usuario en Search Console.</p>
          )}
        </section>
      )}

      {report?.configured && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Metric label="Clics" value={formatNumber(summary.clicks)} hint={previous.impressions ? deltaText(summary.clicks, previous.clicks) : null} />
            <Metric label="Impresiones" value={formatNumber(summary.impressions)} hint={previous.impressions ? deltaText(summary.impressions, previous.impressions) : null} />
            <Metric label="CTR" value={formatCtr(summary.ctr)} hint={previous.impressions ? deltaText(summary.ctr, previous.ctr, { asPercent: true }) : null} />
            <Metric label="Posición media" value={formatPosition(summary.position)} hint={previous.impressions ? deltaText(summary.position, previous.position, { lowerIsBetter: true }) : null} />
          </div>

          <section className="bg-white border border-gray-200 p-4 mb-6">
            {(report.reading || []).map((line) => (
              <p key={line} className="text-sm text-gray-800 leading-6">{line}</p>
            ))}
            <p className="text-xs text-gray-500 mt-3">
              Google publica con unos dos días de retraso. Impresión es una vez que el resultado se mostró. Clic es una visita desde ese resultado.
              {report.cached ? ' Este informe está en caché de las últimas horas.' : ''}
            </p>
          </section>

          {report.byDate?.length > 0 && (
            <section className="bg-white border border-gray-200 p-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Impresiones por día</h2>
              <div className="flex items-end gap-[2px] h-24">
                {report.byDate.map((row) => (
                  <div
                    key={row.key}
                    title={`${row.key}: ${formatNumber(row.impressions)} impresiones, ${formatNumber(row.clicks)} clics`}
                    className="flex-1 bg-[#2A3190] min-w-[3px]"
                    style={{ height: `${Math.max(4, (row.impressions / maxImpressions) * 100)}%` }}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Qué mejorar primero</h2>
            {report.opportunities?.length ? (
              <div className="space-y-3">
                {report.opportunities.map((item) => (
                  <article key={`${item.kind}-${item.query || ''}-${item.page || ''}-${item.title}`} className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 ${item.severity === 'alta' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                        {item.severity}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-700">{item.detail}</p>
                    <p className="text-sm text-gray-900 mt-2">{item.action}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay oportunidades claras en este rango. Probá 90 días o esperá a que Google acumule impresiones.</p>
            )}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <section className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Consultas</h2>
              <Table rows={(report.queries || []).slice(0, 25)} firstHeader="Búsqueda" empty="Sin consultas en este rango." />
            </section>
            <section className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Páginas</h2>
              <Table rows={(report.pages || []).slice(0, 25)} firstHeader="URL" empty="Sin páginas en este rango." />
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Dispositivo</h2>
              <Table rows={report.devices} firstHeader="Tipo" empty="Sin datos." />
            </section>
            <section className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">País</h2>
              <Table rows={report.countries} firstHeader="País" empty="Sin datos." />
            </section>
            <section className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Sitemaps</h2>
              {report.sitemaps?.length ? report.sitemaps.map((sitemap) => (
                <div key={sitemap.path} className="text-sm text-gray-800 mb-3">
                  <p className="font-mono text-xs break-all">{sitemap.path}</p>
                  <p className="mt-1">Errores: {sitemap.errors}. Avisos: {sitemap.warnings}.</p>
                  {(sitemap.contents || []).map((item) => (
                    <p key={item.type}>{item.type}: {formatNumber(item.indexed)} indexadas de {formatNumber(item.submitted)}</p>
                  ))}
                </div>
              )) : <p className="text-sm text-gray-500">Search Console no devolvió sitemaps.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import SummaryApi from '../../common';
import { authFetch } from '../../helpers/authFetch';

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('es-PY');
}

function when(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function SeoDailyPage() {
  const [days, setDays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setError('');
    const response = await authFetch(`${SummaryApi.baseURL}/api/admin/seo-diario`);
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.message || 'No se pudo leer el informe');
    setDays(body.data || []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [load]);

  const run = async () => {
    setRunning(true);
    setError('');
    try {
      const response = await authFetch(`${SummaryApi.baseURL}/api/admin/seo-diario/correr`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'No se pudo correr');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const copyPrompt = async (prompt, key) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(key);
    } catch {
      setCopied('');
    }
  };

  const today = days[0];
  const summary = today?.search?.summary || {};

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#2A3190]">SEO diario</h1>
          <p className="text-sm text-gray-500 mt-1">
            Después de actualizar productos, Gemini redacta el título y Claude lo frena si el precio no coincide. Los cambios de código quedan acá, listos para aplicar.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="bg-[#2A3190] text-white px-4 py-2 text-sm disabled:opacity-60"
        >
          {running ? 'Revisando…' : 'Correr ahora'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Cargando…</p>}

      {!loading && !today && (
        <p className="text-sm text-gray-600">Todavía no hay un día corrido. A las 8 de Paraguay se arma solo, y también al terminar el worker.</p>
      )}

      {today && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Día {today.day} · {today.status} · {when(today.updatedAt)}
            {today.note ? ` · ${today.note}` : ''}
          </p>
          {today.error && <p className="text-sm text-red-600 mb-3">{today.error}</p>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              ['Clics, 28 días', formatNumber(summary.clicks)],
              ['Impresiones', formatNumber(summary.impressions)],
              ['CTR', `${((Number(summary.ctr) || 0) * 100).toFixed(1)}%`],
              ['Posición', summary.position ? Number(summary.position).toFixed(1) : '—']
            ].map(([label, value]) => (
              <div key={label} className="bg-white border border-gray-200 p-3">
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {(today.search?.reading || []).map((line) => (
            <p key={line} className="text-sm text-gray-800 mb-2">{line}</p>
          ))}

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Categorías para búsquedas generales</h2>
            {today.hubs?.length ? (
              <div className="space-y-3">
                {today.hubs.map((item) => (
                  <article key={`${item.category}-${item.subcategory}`} className="bg-white border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">{item.seoTitle}</p>
                    <p className="text-sm text-gray-700 mt-1">{item.intro}</p>
                    <p className="text-xs text-gray-500 mt-2">{item.label} · {item.productCount} con stock</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Todavía no se reescribió una categoría en este día. El lote diario toma dos secciones con mucho stock.</p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Fichas que se reescribieron</h2>
            {today.applied?.length ? (
              <div className="space-y-3">
                {today.applied.filter((item) => item.seoTitle).map((item) => (
                  <article key={`${item.codigo}-${item.seoTitle}`} className="bg-white border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">{item.seoTitle}</p>
                    <p className="text-sm text-gray-700 mt-1">{item.seoDescription}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {item.productName}
                      {item.previousSlug ? ` · URL nueva /producto/${item.slug}` : ` · /producto/${item.slug}`}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">En este día no quedó ninguna ficha aplicada.</p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Cambios de código para aplicar</h2>
            {today.codePrompts?.length ? (
              <div className="space-y-3">
                {today.codePrompts.map((item) => (
                  <article key={item.title} className="bg-white border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                      <button
                        type="button"
                        onClick={() => copyPrompt(item.prompt, item.title)}
                        className="text-xs border border-gray-300 px-2 py-1 shrink-0"
                      >
                        {copied === item.title ? 'Copiado' : 'Copiar prompt'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{item.why}</p>
                    <p className="text-sm text-gray-900 mt-2 whitespace-pre-wrap">{item.prompt}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay un cambio de código pedido para este día.</p>
            )}
          </section>
        </>
      )}

      {days.length > 1 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Días anteriores</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {days.slice(1).map((day) => (
              <li key={day.day}>{day.day} · {day.status} · {(day.applied || []).filter((item) => item.seoTitle).length} fichas</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { FaMagic, FaSpinner, FaWhatsapp, FaUsers, FaStore } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';
import MarketingPlanner from './MarketingPlanner';

const MarketingStudioPage = () => {
  const [themes, setThemes] = useState([]);
  const [themeId, setThemeId] = useState('pack_auriculares');
  const [note, setNote] = useState('Pack auriculares fin de año: cotización 100 / 300 / 400 unidades para empresas.');
  const [signals, setSignals] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [t, s, c] = await Promise.all([
      axiosInstance.get('/api/creativos/campanas/temas'),
      axiosInstance.get('/api/creativos/campanas/senales'),
      axiosInstance.get('/api/creativos/campanas', { params: { limit: 12 } })
    ]);
    setThemes(t.data.themes || []);
    setSignals(s.data || null);
    setCampaigns(c.data.campaigns || []);
    if (!current && c.data.campaigns?.[0]) setCurrent(c.data.campaigns[0]);
  }, [current]);

  useEffect(() => {
    refresh()
      .catch((err) => toast.error(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const compose = async () => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(
        '/api/creativos/campanas/armar',
        { themeId, note },
        { timeout: 300000 }
      );
      if (!data.success) throw new Error(data.message || 'No se pudo armar');
      toast.success(data.message || 'Campaña lista');
      setCurrent(data.campaign);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-600">
        <FaSpinner className="animate-spin" /> Cargando Marketing IA…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
          <FaMagic style={{ color: '#EA580C' }} />
          Marketing IA
        </h1>
        <p className="text-sm text-zinc-600 mt-2 max-w-3xl">
          Campañas B2B de fin de año: packs cerrados (auriculares, mochilas, termos, periféricos…) para cotizar 100–400 piezas.
          Flyer con plantilla fija + fotos reales. Elegí el pack y generá.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <FaStore className="text-orange-500" /> Stock vivo
          </div>
          <p className="text-2xl font-bold mt-2">{signals?.stockCount?.toLocaleString('es-PY') || '—'}</p>
          <p className="text-xs text-zinc-500 mt-1">Productos con stock para armar campañas</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <FaWhatsapp className="text-emerald-500" /> Señal WhatsApp / Meta
          </div>
          <p className="text-sm text-zinc-700 mt-2 leading-relaxed">
            {signals?.note || 'Las campañas de pauta miran CONTACT (WhatsApp). Acá armamos el creativo orgánico para que llegue esa conversación.'}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <FaUsers className="text-sky-500" /> Qué se busca / vende
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Búsquedas: {(signals?.searches || []).slice(0, 3).map((s) => s.query).filter(Boolean).join(' · ') || 'sin datos'}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Ventas: {(signals?.salesTop || []).slice(0, 2).map((s) => s.name).filter(Boolean).join(' · ') || 'sin datos'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Armar campaña</h2>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setThemeId(theme.id);
                  setNote(theme.hookSeed || note);
                }}
                className="px-3 py-2 rounded-full text-sm border"
                style={{
                  borderColor: active ? '#EA580C' : '#e5e7eb',
                  background: active ? '#FFF7ED' : '#fff',
                  color: active ? '#9A3412' : '#374151'
                }}
              >
                {theme.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Ej: empresas que regalan 300 auriculares a fin de año"
        />
        <button
          type="button"
          onClick={compose}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50"
          style={{ background: '#EA580C' }}
        >
          {busy ? <FaSpinner className="animate-spin" /> : <FaMagic />}
          {busy ? 'Armando campaña y flyer…' : 'Generar campaña + flyer'}
        </button>
      </div>

      {current ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2 flex justify-between">
              <span>Flyer de campaña</span>
              {current.artSource ? (
                <span className="normal-case tracking-normal text-zinc-400">
                  Plantilla B2B · {current.packLabel || current.themeLabel || 'pack'}
                </span>
              ) : null}
            </div>
            {current.mediaUrl ? (
              <img
                src={current.mediaUrl}
                alt={current.title}
                className="w-full max-w-[540px] mx-auto rounded-lg border border-zinc-100"
              />
            ) : (
              <div className="aspect-[4/5] max-w-[540px] mx-auto bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500 text-sm px-4 text-center">
                {current.artError || 'Sin preview todavía'}
              </div>
            )}
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xl font-semibold text-zinc-900">{current.title}</h3>
            <p className="text-sm text-zinc-700">{current.hook}</p>
            <p className="text-xs text-zinc-500">{current.why}</p>
            <div>
              <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">Caption</div>
              <pre className="whitespace-pre-wrap text-sm bg-zinc-50 rounded-lg p-3 border border-zinc-100">{current.caption}</pre>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-zinc-500 mb-2">Productos en la pieza</div>
              <ul className="space-y-2">
                {(current.products || []).map((item) => (
                  <li key={item.productId || item.codigo} className="flex gap-3 items-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-12 h-12 object-contain bg-zinc-100 rounded" />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-wide text-orange-700">{item.role}</span>
                      <span className="block text-sm font-medium truncate">{item.name}</span>
                      <span className="block text-xs text-zinc-500">{item.priceText}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {campaigns.length > 1 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <h3 className="font-semibold text-zinc-900 mb-3">Campañas recientes</h3>
          <div className="flex flex-wrap gap-2">
            {campaigns.map((item) => (
              <button
                key={item._id || item.key}
                type="button"
                onClick={() => setCurrent(item)}
                className="text-left px-3 py-2 rounded-lg border text-sm hover:bg-zinc-50"
                style={{ borderColor: current?.key === item.key ? '#EA580C' : '#e5e7eb' }}
              >
                <span className="block font-medium">{item.title}</span>
                <span className="block text-xs text-zinc-500">{item.themeId} · {item.planDate}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">Pauta Meta (WhatsApp / ROAS)</h2>
        <p className="text-sm text-zinc-600 mb-4 max-w-3xl">
          Esto sigue siendo el planner de anuncios pagos: cruza CAPI, contactos de WhatsApp y presupuesto. Arriba está el creativo de campaña orgánica.
        </p>
        <MarketingPlanner />
      </div>
    </div>
  );
};

export default MarketingStudioPage;

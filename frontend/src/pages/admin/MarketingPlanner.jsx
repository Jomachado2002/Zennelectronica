import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftKey(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function gridStart(year, month) {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday + 6) % 7;
  return shiftKey(monthKey(year, month), -offset);
}

function monthTitle(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1, 15));
  return new Intl.DateTimeFormat('es-PY', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function money(value) {
  const n = Math.round(Number(value) || 0);
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CHIP = {
  mantener: 'bg-[#D1FAE5] text-[#065F46]',
  ganadora: 'bg-[#D1FAE5] text-[#065F46]',
  escalar: 'bg-[#DBEAFE] text-[#1E40AF]',
  crear: 'bg-[#EDE9FE] text-[#5B21B6]',
  lista: 'bg-[#EDE9FE] text-[#5B21B6]',
  cambiar: 'bg-[#FEF3C7] text-[#92400E]',
  perdedora: 'bg-[#FEE2E2] text-[#991B1B]',
  cara: 'bg-[#FEE2E2] text-[#991B1B]',
  no_interesa: 'bg-[#FEE2E2] text-[#991B1B]',
  pausada: 'bg-gray-100 text-gray-600',
  esperar: 'bg-gray-100 text-gray-600',
  aprendiendo: 'bg-[#FEF3C7] text-[#92400E]',
  en_prueba: 'bg-[#FEF3C7] text-[#92400E]'
};

export default function MarketingPlanner() {
  const today = todayKey();
  const start = today.split('-').map(Number);
  const [year, setYear] = useState(start[0]);
  const [month, setMonth] = useState(start[1]);
  const [days, setDays] = useState([]);
  const [live, setLive] = useState(null);
  const [latest, setLatest] = useState(null);
  const [running, setRunning] = useState([]);
  const [capi, setCapi] = useState(null);
  const [nextReview, setNextReview] = useState('');
  const [weekBudgetUsd, setWeekBudgetUsd] = useState(50);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState(today);
  const [dayAsk, setDayAsk] = useState('');

  const from = gridStart(year, month);

  const apply = (data) => {
    setDays(data.days || []);
    setLive(data.live || null);
    setLatest(data.latest || null);
    setRunning(data.running || []);
    setCapi(data.capi || null);
    setNextReview(data.nextReview || '');
    setWeekBudgetUsd(Number(data.weekBudgetUsd) || 50);
  };

  const load = useCallback(async (startKey) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/creativos/planner', {
        params: { from: startKey, days: 42 }
      });
      apply(res.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo leer el calendario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(from);
  }, [from, load]);

  const byDate = useMemo(() => {
    const map = new Map();
    days.forEach((day) => map.set(day.date, day));
    return map;
  }, [days]);

  const cells = useMemo(() => Array.from({ length: 42 }, (_, index) => shiftKey(from, index)), [from]);
  const selectedDay = byDate.get(selected);
  const ads = (live && live.activeAds) || [];
  const skip = (latest && latest.skip) || [];
  const watch = (latest && latest.watch) || [];
  const changes = (selectedDay && selectedDay.changes && selectedDay.changes.length)
    ? selectedDay.changes
    : ((latest && latest.changes) || []);

  const moveMonth = (delta) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    const nextYear = next.getUTCFullYear();
    const nextMonth = next.getUTCMonth() + 1;
    setYear(nextYear);
    setMonth(nextMonth);
    const parts = today.split('-').map(Number);
    setSelected(parts[0] === nextYear && parts[1] === nextMonth ? today : monthKey(nextYear, nextMonth));
  };

  const authorize = async (slotIndex) => {
    setBusy(`ad-${slotIndex}`);
    try {
      const res = await axiosInstance.post('/api/creativos/planner/autorizar', {
        date: (latest && latest.planDate) || selected,
        slot: slotIndex
      }, { params: { from, days: 42 }, timeout: 120000 });
      toast.success(res.data.message || 'La campaña quedó autorizada');
      apply(res.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo publicar la campaña');
    } finally {
      setBusy('');
    }
  };

  const arm = async (note) => {
    setBusy('day');
    try {
      const res = await axiosInstance.post('/api/creativos/planner/dia', { note: note || '' }, {
        params: { from, days: 42 },
        timeout: 180000
      });
      toast.success(res.data.message || 'El día quedó armado');
      setDayAsk('');
      apply(res.data);
      setSelected(today);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo armar el día');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-5 mb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthTitle(year, month)}</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Claude elige qué productos se pagan con {weekBudgetUsd} USD a la semana (~7 USD al día). Lo que vende se deja. Lo que gasta y no vende se pausa. Vos solo autorizás. Próxima revisión: {nextReview || 'cuando armes hoy'}.
          </p>
        </div>
        <button type="button" onClick={() => arm('')} disabled={Boolean(busy)} className="px-3 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#7B2CBF' }}>
          {busy === 'day' ? <FaSpinner className="animate-spin inline mr-2" /> : null}
          Armar hoy
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-[#E9D5FF] bg-[#F5F3FF] p-3 sm:p-4">
        <p className="text-sm font-semibold text-gray-900">Pedile un cambio al planner</p>
        <p className="text-xs text-gray-600 mt-1">Lo que escribas reemplaza el plan. Ejemplo: 10 mouse gamer y 10 monitores hasta 2 millones. Nada de notebooks caros.</p>
        <textarea
          value={dayAsk}
          onChange={(event) => setDayAsk(event.target.value)}
          rows={3}
          placeholder="Sacá lo caro. Armá 10 monitores de 24/27 y 10 mouse de entrada."
          className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy === 'day' || !dayAsk.trim()} onClick={() => arm(dayAsk)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#7B2CBF' }}>
            {busy === 'day' ? 'Cambiando…' : 'Aplicar pedido'}
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => arm('')} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 text-gray-700 disabled:opacity-50">
            Rearmar sin pedido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 text-sm">
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <div className="text-xs text-gray-500">Gasto Meta, 7 días</div>
          <div className="font-semibold">USD {Number(live?.spentUsd || 0).toLocaleString('es-PY')}</div>
          <div className="text-[11px] text-gray-500">Quedan USD {Number(live?.remainingUsd || 0).toLocaleString('es-PY')}</div>
        </div>
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <div className="text-xs text-gray-500">Tope del día</div>
          <div className="font-semibold">USD {Number(live?.dailyTotalUsd || 0).toLocaleString('es-PY')}</div>
        </div>
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <div className="text-xs text-gray-500">Interacciones</div>
          <div className="font-semibold">{live?.clicks || 0} clics · {live?.contacts || 0} WhatsApp</div>
        </div>
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <div className="text-xs text-gray-500">Compras que Meta vio</div>
          <div className="font-semibold">{live?.purchases || 0}</div>
        </div>
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <div className="text-xs text-gray-500">Ventas pagadas, 7 días</div>
          <div className="font-semibold">{live?.sales?.count || 0} · {live?.sales?.totalPyg ? money(live.sales.totalPyg) : 'Gs. 0'}</div>
        </div>
      </div>

      {capi ? <p className="text-xs text-gray-500 mb-3">{capi.note}</p> : null}

      {running.length ? (
        <div className="mb-4 rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Análisis de lo que está en Meta</p>
          <div className="space-y-2">
            {running.map((row) => (
              <div key={row.metaCampaignId || row.name} className="text-xs text-gray-700">
                <span className={`inline-flex rounded px-1.5 py-0.5 font-semibold mr-2 ${CHIP[row.verdict] || 'bg-gray-100 text-gray-700'}`}>
                  {row.label || row.verdict}
                </span>
                <span className="font-semibold">{row.name}</span>
                <span className="text-gray-500"> · {money(row.spendPyg)} · {row.clicks} clics · {row.contacts || 0} WhatsApp · {row.purchases} compras</span>
                {row.reason ? <p className="text-gray-600 mt-0.5">{row.reason}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : ads.length ? (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">Publicidad activa hoy</p>
          <div className="flex gap-2 overflow-auto">
            {ads.map((ad) => (
              <div key={ad.name} className="min-w-[180px] rounded-lg border border-gray-200 px-3 py-2 text-xs">
                <p className="font-semibold text-gray-900 truncate">{ad.name}</p>
                <p className="text-gray-600 mt-1">USD {ad.spendUsd} · {ad.clicks} clics · {ad.purchases} compras</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center" aria-label="Mes anterior">
          <FaChevronLeft />
        </button>
        <button type="button" onClick={() => { const parts = today.split('-').map(Number); setYear(parts[0]); setMonth(parts[1]); setSelected(today); }} className="text-sm font-semibold" style={{ color: '#7B2CBF' }}>Hoy</button>
        <button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center" aria-label="Mes siguiente">
          <FaChevronRight />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#7C3AED]" /> Lista / autorizar</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#059669]" /> Ganadora</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#D97706]" /> En prueba</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#DC2626]" /> Pausada</span>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><FaSpinner className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.85fr)] lg:gap-4">
          <div>
            <div className="grid grid-cols-7 text-center text-[11px] sm:text-xs font-semibold text-gray-500 mb-1">
              {WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 border-t border-l border-gray-200">
              {cells.map((date) => {
                const inMonth = date.slice(5, 7) === String(month).padStart(2, '0');
                const day = byDate.get(date);
                const slots = (day && day.slots) || [];
                const active = date === selected;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    className={`min-h-[4.5rem] sm:min-h-[6.5rem] border-r border-b border-gray-200 p-1 text-left align-top ${active ? 'bg-[#F5F3FF]' : 'bg-white'} ${inMonth ? '' : 'opacity-40'}`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${date === today ? 'bg-[#7B2CBF] text-white' : 'text-gray-800'}`}>
                      {Number(date.slice(8, 10))}
                    </span>
                    <div className="mt-1 hidden sm:block space-y-0.5">
                      {slots.slice(0, 3).map((slot) => (
                        <p key={slot.id} className={`truncate rounded px-1 text-[10px] leading-4 font-medium ${CHIP[slot.action] || 'bg-gray-100 text-gray-700'}`}>
                          {slot.name}
                        </p>
                      ))}
                      {day && day.salesCount ? <p className="text-[10px] text-emerald-700 px-1">{day.salesCount} ventas</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="mt-4 lg:mt-0 border border-gray-200 rounded-xl p-3 sm:p-4 max-h-[70vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900">{selected}</h3>
            {selectedDay && selectedDay.salesCount ? (
              <p className="text-sm text-emerald-700 mt-1">{selectedDay.salesCount} ventas pagadas · {selectedDay.salesGs}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Sin ventas pagadas ese día.</p>
            )}

            {selectedDay && selectedDay.diagnosis ? <p className="text-sm text-gray-700 mt-3">{selectedDay.diagnosis}</p> : null}

            {changes.length ? (
              <ul className="mt-3 space-y-1 text-xs text-gray-600 list-disc pl-4">
                {changes.slice(0, 8).map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : null}

            {skip.length && (selectedDay && selectedDay.isLatest) ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-700">No se paga</p>
                {skip.map((row) => (
                  <p key={row.family} className="text-xs text-gray-600 mt-1">{row.label}: {row.why}</p>
                ))}
              </div>
            ) : null}

            {watch.length && (selectedDay && selectedDay.isLatest) ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-700">Mirar en 3 días</p>
                {watch.map((line) => <p key={line} className="text-xs text-gray-600 mt-1">{line}</p>)}
              </div>
            ) : null}

            {!selectedDay || !selectedDay.slots.length ? (
              <p className="text-sm text-gray-500 mt-3">Ese día no tiene campañas. Armá hoy o esperá a las 7:00.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {selectedDay.slots.map((slot, slotIndex) => (
                  <article key={slot.id} className="rounded-lg bg-gray-50 px-3 py-3">
                    {slot.image && !(slot.products && slot.products.length > 1) ? (
                      <img src={slot.image} alt={slot.name} className="w-full rounded-md mb-2 bg-white" />
                    ) : null}
                    <p className={`text-[11px] font-semibold inline-flex rounded px-1.5 py-0.5 ${CHIP[slot.action] || 'bg-gray-100 text-gray-700'}`}>
                      {slot.verdict || slot.action} · {slot.dailyBudgetGs || `USD ${slot.dailyBudgetUsd}/día`}
                    </p>
                    <p className="font-semibold text-gray-900 mt-2 text-sm">{slot.name}</p>
                    <p className="text-xs text-gray-500">
                      {slot.filterLabel || slot.productSet || ''}
                      {slot.priceFrom ? ` · ${slot.priceFrom} a ${slot.priceTo}` : ''}
                      {slot.setSize ? ` · ${slot.setSize} productos` : ''}
                    </p>
                    {slot.avgProfit ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Gana {money(slot.avgProfit)} por venta · ROAS mínimo {slot.breakEvenRoas || '-'}
                        {slot.killAtPyg ? ` · se corta a ${money(slot.killAtPyg)}` : ''}
                      </p>
                    ) : null}
                    {slot.headline ? <p className="text-sm text-gray-800 mt-1">{slot.headline}</p> : null}
                    {slot.text ? <p className="text-sm text-gray-700">{slot.text}</p> : null}
                    {slot.why ? <p className="text-sm text-gray-600 mt-1">{slot.why}</p> : null}
                    {slot.expected ? <p className="text-xs text-gray-500 mt-1">En 3 días: {slot.expected}</p> : null}
                    {slot.warn ? <p className="text-xs text-red-700 mt-1">{slot.warn}</p> : null}
                    {slot.products && slot.products.length ? (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {slot.products.map((product) => (
                          <div key={product.codigo || product.name} className="rounded bg-white p-1">
                            {product.plate ? <img src={product.plate} alt="" className="w-full rounded" /> : null}
                            <p className="text-[10px] text-gray-700 mt-1 line-clamp-2">{product.name}</p>
                            <p className="text-[10px] text-gray-500">{product.priceText || money(product.price)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {slot.canAuthorize ? (
                      <button
                        type="button"
                        disabled={busy === `ad-${slotIndex}`}
                        onClick={() => authorize(slotIndex)}
                        className="mt-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: '#7B2CBF' }}
                      >
                        {busy === `ad-${slotIndex}` ? 'Publicando…' : 'Autorizar y publicar'}
                      </button>
                    ) : null}
                    {slot.published ? <p className="text-xs text-emerald-700 mt-2">Ya está publicada en Meta.</p> : null}
                    {slot.paused ? <p className="text-xs text-red-700 mt-2">Pausada. No se toca hasta la próxima revisión.</p> : null}
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

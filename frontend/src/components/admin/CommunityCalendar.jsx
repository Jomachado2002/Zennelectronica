import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheck, FaChevronLeft, FaChevronRight, FaCopy, FaSpinner, FaTimes } from 'react-icons/fa';
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

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const COLORS = [
  { name: 'Naranja', hex: '#F25C2A' },
  { name: 'Amarillo', hex: '#E6F25A' },
  { name: 'Azul', hex: '#1C3144' },
  { name: 'Arena', hex: '#E7D7C3' },
  { name: 'Verde', hex: '#1F4F4A' },
  { name: 'Negro', hex: '#161616' }
];

const KIND = {
  feed: 'Post del sistema',
  story: 'Historia',
  reel: 'Reel para grabar',
  imagen: 'Sugerencia · imagen',
  dato: 'Sugerencia · dato'
};

const CHIP = {
  feed: 'bg-[#EDE9FE] text-[#5B21B6]',
  story: 'bg-[#DBEAFE] text-[#1D4ED8]',
  reel: 'bg-[#FEF3C7] text-[#92400E]',
  imagen: 'bg-[#FCE7F3] text-[#9D174D]',
  dato: 'bg-[#D1FAE5] text-[#065F46]'
};

function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => toast.success('Texto copiado'),
    () => toast.error('No se pudo copiar')
  );
}

function monthTitle(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1, 15));
  return new Intl.DateTimeFormat('es-PY', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export default function CommunityCalendar() {
  const today = todayKey();
  const start = today.split('-').map(Number);
  const [year, setYear] = useState(start[0]);
  const [month, setMonth] = useState(start[1]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState(today);
  const [openId, setOpenId] = useState('');
  const [reviseId, setReviseId] = useState('');
  const [asks, setAsks] = useState({});
  const [aiReady, setAiReady] = useState(true);
  const [dayAsk, setDayAsk] = useState('');

  const from = gridStart(year, month);

  const load = useCallback(async (startKey) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/creativos/comunidad', {
        params: { from: startKey, days: 42 }
      });
      setDays(res.data.days || []);
      setAiReady(Boolean(res.data.claude));
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

  const cells = useMemo(() => {
    const total = 42;
    return Array.from({ length: total }, (_, index) => shiftKey(from, index));
  }, [from]);

  const selectedDay = byDate.get(selected);

  const moveMonth = (delta) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    const nextYear = next.getUTCFullYear();
    const nextMonth = next.getUTCMonth() + 1;
    setYear(nextYear);
    setMonth(nextMonth);
    const key = monthKey(nextYear, nextMonth);
    const todayParts = today.split('-').map(Number);
    if (todayParts[0] === nextYear && todayParts[1] === nextMonth) setSelected(today);
    else setSelected(key);
    setOpenId('');
  };

  const arm = async (count) => {
    setBusy(String(count));
    try {
      const res = await axiosInstance.post('/api/creativos/comunidad/armar', { days: count }, { timeout: 180000 });
      toast.success(res.data.message || 'Calendario listo');
      load(from);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo armar el plan');
    } finally {
      setBusy('');
    }
  };

  const cancel = async (id) => {
    setBusy(id);
    try {
      await axiosInstance.delete(`/api/creativos/calendario/${id}`);
      toast.success('Se sacó del día');
      load(from);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo cancelar');
    } finally {
      setBusy('');
    }
  };

  const upload = async (id, file) => {
    if (!file) return;
    setBusy(id);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await axiosInstance.post(`/api/creativos/comunidad/${id}/archivo`, body, { timeout: 180000 });
      toast.success(res.data.message || 'Archivo cargado');
      load(from);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo cargar');
    } finally {
      setBusy('');
    }
  };

  const patchSlot = (post) => {
    if (!post || !post.id) return;
    setDays((current) => current.map((day) => ({
      ...day,
      slots: (day.slots || []).map((slot) => (slot.id === post.id ? { ...slot, ...post } : slot))
    })));
  };

  const revise = async (id, body) => {
    setBusy(id);
    try {
      const res = await axiosInstance.post(`/api/creativos/comunidad/${id}/modificar`, body, { timeout: 180000 });
      if (res.data.post) patchSlot(res.data.post);
      toast.success('La pieza se actualizó');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo modificar');
    } finally {
      setBusy('');
    }
  };

  const talk = async () => {
    setBusy('focus');
    try {
      const res = await axiosInstance.post('/api/creativos/comunidad/dia', {
        date: selected,
        note: dayAsk
      }, { timeout: 180000 });
      toast.success(res.data.message || 'El día se actualizó');
      setDayAsk('');
      load(from);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo cambiar el día');
    } finally {
      setBusy('');
    }
  };

  const approve = async (id) => {
    setBusy(id);
    try {
      const res = await axiosInstance.post(`/api/creativos/comunidad/${id}/autorizar`);
      toast.success(res.data.message || 'Autorizada');
      load(from);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo autorizar');
    } finally {
      setBusy('');
    }
  };

  const done = async (id) => {
    setBusy(id);
    try {
      await axiosInstance.post(`/api/creativos/comunidad/${id}/listo`);
      toast.success('Quedó marcado como grabado');
      load(from);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo marcar');
    } finally {
      setBusy('');
    }
  };

  const goToday = () => {
    const parts = today.split('-').map(Number);
    setYear(parts[0]);
    setMonth(parts[1]);
    setSelected(today);
    setOpenId('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthTitle(year, month)}</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-xl">
            Tocá un día para ver qué sube. A las 7:00 se miran los próximos 3 días y Google arma un día solo si está vacío. En el día podés hablarle al plan: cambiar un rubro, meter una marca o separar un grupo. La foto de un creativo se cambia con el HTML.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => arm(3)} disabled={Boolean(busy)} className="px-3 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#7B2CBF' }}>
            {busy === '3' ? <FaSpinner className="animate-spin inline mr-2" /> : null}
            Armar 3 días
          </button>
          <button type="button" onClick={() => arm(14)} disabled={Boolean(busy)} className="px-3 py-2 rounded-full text-sm font-semibold border disabled:opacity-50" style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}>
            {busy === '14' ? <FaSpinner className="animate-spin inline mr-2" /> : null}
            Armar 14 días
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center" aria-label="Mes anterior">
          <FaChevronLeft />
        </button>
        <button type="button" onClick={goToday} className="text-sm font-semibold" style={{ color: '#7B2CBF' }}>Hoy</button>
        <button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center" aria-label="Mes siguiente">
          <FaChevronRight />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#7C3AED]" /> Sube solo</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#2563EB]" /> Historia</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#D97706]" /> Para grabar</span>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><FaSpinner className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:gap-4">
          <div>
            <div className="grid grid-cols-7 text-center text-[11px] sm:text-xs font-semibold text-gray-500 mb-1">
              {WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 border-t border-l border-gray-200">
              {cells.map((date) => {
                const inMonth = date.slice(5, 7) === String(month).padStart(2, '0');
                const slots = (byDate.get(date) || {}).slots || [];
                const active = date === selected;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => { setSelected(date); setOpenId(''); }}
                    className={`min-h-[4.5rem] sm:min-h-[6.5rem] border-r border-b border-gray-200 p-1 text-left align-top ${active ? 'bg-[#F5F3FF]' : 'bg-white'} ${inMonth ? '' : 'opacity-40'}`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${date === today ? 'bg-[#7B2CBF] text-white' : 'text-gray-800'}`}>
                      {Number(date.slice(8, 10))}
                    </span>
                    <div className="mt-1 hidden sm:block space-y-0.5">
                      {slots.slice(0, 3).map((slot) => (
                        <p key={slot.id} className={`truncate rounded px-1 text-[10px] leading-4 font-medium ${CHIP[slot.kind] || 'bg-gray-100 text-gray-700'}`}>
                          {slot.time} {slot.headline}
                        </p>
                      ))}
                      {slots.length > 3 ? <p className="text-[10px] text-gray-500 px-1">+{slots.length - 3}</p> : null}
                    </div>
                    {slots.length ? (
                      <div className="mt-1 flex gap-0.5 sm:hidden">
                        {slots.slice(0, 4).map((slot) => (
                          <i key={slot.id} className={`h-1.5 w-1.5 rounded-full ${slot.kind === 'feed' ? 'bg-[#7C3AED]' : slot.kind === 'story' ? 'bg-[#2563EB]' : 'bg-[#D97706]'}`} />
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500 sm:hidden">Los puntos son lo que hay ese día. El detalle está abajo.</p>
          </div>

          <aside className="mt-4 lg:mt-0 border border-gray-200 rounded-xl p-3 sm:p-4 max-h-[70vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 capitalize">
              {(selectedDay && selectedDay.label) || selected}
            </h3>
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold text-gray-800">Hablar con este día</p>
              <p className="mt-1 text-xs text-gray-500">El plan se cambia con una frase. Por ejemplo: en vez de monitores mostrá memorias RAM. Agregá las notebooks Acer. En vez de 5 auriculares subí 5 cosas distintas. Si hablás de la foto, ese pedido va al HTML de la pieza.</p>
              <textarea
                value={dayAsk}
                onChange={(event) => setDayAsk(event.target.value)}
                rows={3}
                placeholder="En vez de monitores mostrá memorias RAM"
                className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <button type="button" disabled={busy === 'focus' || !dayAsk.trim()} onClick={talk} className="mt-2 text-xs font-semibold" style={{ color: '#7B2CBF' }}>
                {busy === 'focus' ? 'Cambiando…' : 'Cambiar el día'}
              </button>
            </div>
            {!selectedDay || !selectedDay.slots.length ? (
              <p className="text-sm text-gray-500 mt-3">Ese día no tiene publicaciones. Armá los días o esperá a las 7:00.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {selectedDay.slots.map((slot) => {
                  const open = openId === slot.id;
                  const reel = slot.kind === 'reel';
                  const suggestion = slot.kind === 'imagen' || slot.kind === 'dato';
                  const rosa = slot.scene === 'rosa' || selected.slice(5, 7) === '10';
                  return (
                    <article key={slot.id} className="rounded-lg bg-gray-50 px-3 py-3">
                      <p className={`text-[11px] font-semibold inline-flex rounded px-1.5 py-0.5 ${CHIP[slot.kind] || ''}`}>
                        {slot.time} · {KIND[slot.kind] || slot.kind}
                        {slot.autoPublish ? ' · se publica solo' : ''}
                        {slot.status === 'published' ? ' · publicado' : ''}
                        {slot.needsApproval ? ' · falta tu autorización' : ''}
                        {slot.waitingUpload ? (reel ? ' · falta el video' : ' · falta tu archivo') : ''}
                      </p>
                      <p className="font-semibold text-gray-900 mt-2 text-sm">{slot.headline}</p>
                      {rosa && !suggestion ? <p className="text-xs font-semibold text-[#9D174D] mt-1">Flyer Octubre Rosa</p> : null}
                      {slot.previewUrl && !reel && !/\.mp4($|\?)/i.test(slot.previewUrl) ? (
                        <div className="relative mt-2 w-full max-w-[260px]">
                          <img key={slot.previewUrl} src={slot.previewUrl} alt="" className="w-full rounded-lg border border-gray-200 bg-white" />
                          {busy === slot.id ? (
                            <p className="absolute inset-0 flex items-end rounded-lg bg-black/45 px-3 py-2 text-xs font-semibold text-white">Rearmando la pieza…</p>
                          ) : null}
                        </div>
                      ) : null}
                      {slot.titles.length ? <p className="text-sm text-gray-700 mt-1">{slot.titles.join(' · ')}</p> : null}
                      {slot.reason ? <p className="text-sm text-gray-500 mt-1">{slot.reason}</p> : null}
                      {reel ? (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-800">Cómo grabar el reel</p>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{slot.brief}</p>
                          {slot.brief ? (
                            <button type="button" onClick={() => copyText(slot.brief)} className="mt-1 text-xs font-semibold inline-flex items-center gap-2" style={{ color: '#7B2CBF' }}>
                              <FaCopy /> Copiar guía
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-3 mt-2">
                        <button type="button" onClick={() => setOpenId(open ? '' : slot.id)} className="text-xs font-semibold" style={{ color: '#1E1B4B' }}>
                          {open ? 'Ocultar textos' : (reel ? 'Qué publicar' : 'Ver textos')}
                        </button>
                        {slot.canRevise ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReviseId(reviseId === slot.id ? '' : slot.id);
                              setAsks((current) => ({ ...current, [slot.id]: '' }));
                            }}
                            className="text-xs font-semibold"
                            style={{ color: '#9D174D' }}
                          >
                            {reviseId === slot.id ? 'Cerrar modificación' : 'Solicitar modificación'}
                          </button>
                        ) : null}
                        {slot.needsApproval ? (
                          <button type="button" onClick={() => approve(slot.id)} disabled={busy === slot.id} className="text-xs font-semibold" style={{ color: '#7B2CBF' }}>
                            {busy === slot.id ? 'Autorizando…' : 'Autorizar publicación'}
                          </button>
                        ) : null}
                        {reel && slot.waitingUpload ? (
                          <label className="text-xs font-semibold cursor-pointer" style={{ color: '#0F766E' }}>
                            {busy === slot.id ? 'Cargando…' : 'Cargar el video'}
                            <input
                              type="file"
                              accept="video/mp4"
                              className="hidden"
                              disabled={busy === slot.id}
                              onChange={(event) => {
                                const file = event.target.files && event.target.files[0];
                                event.target.value = '';
                                upload(slot.id, file);
                              }}
                            />
                          </label>
                        ) : null}
                        {!reel && (slot.waitingUpload || slot.needsApproval) ? (
                          <label className="text-xs font-semibold cursor-pointer" style={{ color: '#0F766E' }}>
                            {busy === slot.id ? 'Cargando…' : (slot.needsApproval ? 'Reemplazar archivo' : 'Cargar foto o video')}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,video/mp4"
                              className="hidden"
                              disabled={busy === slot.id}
                              onChange={(event) => {
                                const file = event.target.files && event.target.files[0];
                                event.target.value = '';
                                upload(slot.id, file);
                              }}
                            />
                          </label>
                        ) : null}
                        {(suggestion || reel) && slot.status === 'idea' ? (
                          <button type="button" onClick={() => done(slot.id)} disabled={busy === slot.id} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: '#0F766E' }}>
                            <FaCheck /> Ya lo publiqué yo
                          </button>
                        ) : null}
                        {slot.status === 'scheduled' || slot.status === 'idea' ? (
                          <button type="button" onClick={() => cancel(slot.id)} disabled={busy === slot.id} className="text-xs font-semibold inline-flex items-center gap-1 text-red-600">
                            <FaTimes /> Quitar
                          </button>
                        ) : null}
                      </div>
                      {(slot.status === 'idea' || reviseId === slot.id) && slot.canRevise ? (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs font-semibold text-gray-800">Cambiar esta pieza</p>
                          <p className="mt-1 text-xs text-gray-500">Mientras no la autorices, podés pedir otra tipografía, otro fondo o pegar el link de un producto de la tienda.</p>
                          {!aiReady ? <p className="mt-1 text-xs text-gray-500">Falta la clave de Claude. Sin eso no se reescribe la pieza.</p> : null}
                          <textarea
                            value={asks[slot.id] || ''}
                            onChange={(event) => setAsks((current) => ({ ...current, [slot.id]: event.target.value }))}
                            rows={3}
                            placeholder="https://www.zenn.com.py/producto/el-slug — o pedí otra tipografía y otro fondo."
                            className="mt-2 w-full text-sm border border-gray-200 rounded-lg p-2"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {COLORS.map((color) => (
                              <button
                                key={color.hex}
                                type="button"
                                title={color.name}
                                disabled={busy === slot.id}
                                onClick={() => revise(slot.id, { background: color.hex, note: asks[slot.id] || '' })}
                                className="h-7 w-7 rounded-full border border-gray-300"
                                style={{ background: color.hex }}
                              />
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3">
                            <button type="button" disabled={busy === slot.id} onClick={() => revise(slot.id, { swap: true, note: asks[slot.id] || 'Otro producto, el anterior no recorta bien.' })} className="text-xs font-semibold" style={{ color: '#0F766E' }}>
                              Otro producto
                            </button>
                            <button type="button" disabled={busy === slot.id || !(asks[slot.id] || '').trim()} onClick={() => revise(slot.id, { note: asks[slot.id] })} className="text-xs font-semibold" style={{ color: '#9D174D' }}>
                              {busy === slot.id ? 'Rearmando…' : 'Aplicar pedido'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {open && reel ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-800">Qué publicar con el video</p>
                          <textarea readOnly value={slot.caption || ''} rows={6} className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-3 bg-white" />
                          <button type="button" onClick={() => copyText(slot.caption)} className="mt-1 text-sm font-semibold inline-flex items-center gap-2" style={{ color: '#7B2CBF' }}>
                            <FaCopy /> Copiar descripción
                          </button>
                        </div>
                      ) : null}
                      {open && suggestion ? (
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-800">Copy de la pieza</p>
                            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{slot.brief || 'Todavía no hay una idea escrita para esta pieza.'}</p>
                            {slot.brief ? (
                              <button type="button" onClick={() => copyText(slot.brief)} className="mt-1 text-sm font-semibold inline-flex items-center gap-2" style={{ color: '#7B2CBF' }}>
                                <FaCopy /> Copiar copy
                              </button>
                            ) : null}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">Descripción para redes</p>
                            <textarea readOnly value={slot.caption || ''} rows={6} className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-3 bg-white" />
                            <button type="button" onClick={() => copyText(slot.caption)} className="mt-1 text-sm font-semibold inline-flex items-center gap-2" style={{ color: '#7B2CBF' }}>
                              <FaCopy /> Copiar descripción
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {open && !suggestion ? (
                        <div className="mt-3">
                          <textarea readOnly value={slot.caption || ''} rows={6} className="w-full text-sm border border-gray-200 rounded-lg p-3 bg-white" />
                          <button type="button" onClick={() => copyText(slot.caption)} className="mt-2 text-sm font-semibold inline-flex items-center gap-2" style={{ color: '#7B2CBF' }}>
                            <FaCopy /> Copiar
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

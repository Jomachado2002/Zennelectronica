import React, { useCallback, useEffect, useState } from 'react';
import { FaCalendarAlt, FaCopy, FaDownload, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

function downloadText(text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zenn-publicacion.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PublishPanel({ selected, products }) {
  const [variants, setVariants] = useState([]);
  const [caption, setCaption] = useState('');
  const [kind, setKind] = useState('feed');
  const [loadingText, setLoadingText] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [posts, setPosts] = useState([]);

  const idsKey = selected.join(',');

  const loadCalendar = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/creativos/calendario');
      setPosts(res.data.posts || []);
    } catch {
      /* el calendario no bloquea la selección */
    }
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!selected.length) {
      setVariants([]);
      setCaption('');
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setLoadingText(true);
      try {
        const res = await axiosInstance.post('/api/creativos/texto', { ids: selected });
        if (cancelled) return;
        const next = res.data.variants || [];
        setVariants(next);
        setCaption(next[0]?.caption || '');
      } catch (err) {
        if (!cancelled) toast.error(err?.response?.data?.message || 'No se pudo armar el texto');
      } finally {
        if (!cancelled) setLoadingText(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const chosen = selected
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  const copyCaption = async () => {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Texto copiado');
    } catch {
      downloadText(caption);
      toast.success('Texto descargado');
    }
  };

  const publish = async (schedule) => {
    if (!selected.length) {
      toast.info('Elegí productos en la lista');
      return;
    }
    setPublishing(true);
    try {
      const res = await axiosInstance.post('/api/creativos/publicar', {
        ids: selected,
        kind,
        caption,
        scheduledAt: schedule ? scheduledAt : undefined
      }, { timeout: 300000 });
      const post = res.data.post;
      if (post?.status === 'scheduled') toast.success('Quedó en el calendario');
      else toast.success(kind === 'story' ? 'Historias publicadas' : 'Publicado en Instagram y Facebook');
      setScheduledAt('');
      loadCalendar();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo publicar');
      loadCalendar();
    } finally {
      setPublishing(false);
    }
  };

  const cancel = async (id) => {
    try {
      await axiosInstance.delete(`/api/creativos/calendario/${id}`);
      toast.success('Se sacó del calendario');
      loadCalendar();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo cancelar');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Publicar</h2>
        <p className="text-sm text-gray-500 mt-1">
          {chosen.length
            ? chosen.map((p) => p.title).join(' · ')
            : 'Marcá hasta 10 productos. El texto se arma solo.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'feed', label: 'Post o carrusel' },
          { id: 'story', label: 'Historias' }
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setKind(opt.id)}
            className="py-3 rounded-xl text-sm font-semibold border"
            style={kind === opt.id
              ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
              : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {variants.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => setCaption(variant.caption)}
              className="shrink-0 px-3 py-2 rounded-full text-xs font-semibold border"
              style={caption === variant.caption
                ? { background: '#7B2CBF', color: '#fff', borderColor: '#7B2CBF' }
                : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
            >
              {variant.label}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={12}
        placeholder={loadingText ? 'Armando el texto…' : 'El texto de la publicación'}
        className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base leading-relaxed"
      />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyCaption} disabled={!caption} className="py-3 rounded-xl font-semibold border flex items-center justify-center gap-2 disabled:opacity-40">
          <FaCopy /> Copiar
        </button>
        <button type="button" onClick={() => downloadText(caption)} disabled={!caption} className="py-3 rounded-xl font-semibold border flex items-center justify-center gap-2 disabled:opacity-40">
          <FaDownload /> Descargar
        </button>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Programar
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-1 w-full px-3 py-3 border border-gray-300 rounded-xl text-base"
        />
      </label>

      <button
        type="button"
        onClick={() => publish(false)}
        disabled={publishing || !selected.length || (kind === 'feed' && !caption)}
        className="w-full py-4 rounded-xl font-bold text-white text-lg disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: '#7B2CBF' }}
      >
        {publishing ? <FaSpinner className="animate-spin" /> : null}
        {publishing ? 'Publicando…' : 'Publicar ahora en IG y Facebook'}
      </button>
      <button
        type="button"
        onClick={() => publish(true)}
        disabled={publishing || !selected.length || !scheduledAt}
        className="w-full py-3 rounded-xl font-semibold border flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
      >
        <FaCalendarAlt /> Dejar en el calendario
      </button>

      {posts.length ? (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-sm font-semibold text-gray-800">Calendario</p>
          {posts.map((post) => (
            <div key={post._id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">{(post.titles || []).slice(0, 2).join(' · ') || 'Publicación'}</p>
                <p className="text-gray-500">
                  {post.kind === 'story' ? 'Historias' : 'Feed'} · {post.status} · {whenLabel(post.scheduledAt || post.publishedAt)}
                </p>
                {post.error ? <p className="text-red-600">{post.error}</p> : null}
              </div>
              {post.status === 'scheduled' ? (
                <button type="button" onClick={() => cancel(post._id)} className="text-xs font-semibold shrink-0" style={{ color: '#7B2CBF' }}>
                  Cancelar
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

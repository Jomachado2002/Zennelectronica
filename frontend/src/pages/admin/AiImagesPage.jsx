import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheck, FaDownload, FaImage, FaPaperPlane, FaPlus, FaSpinner, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../config/axiosInstance';

const FORMATS = [
  { id: 'feed', label: 'Feed 4:5' },
  { id: 'story', label: 'Story 9:16' },
  { id: 'square', label: 'Cuadrado' }
];

const FRAME = {
  feed: '1080 / 1350',
  story: '1080 / 1920',
  square: '1 / 1'
};

function fileName(image) {
  const slug = String(image?.title || 'imagen')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `zenn-${slug || 'imagen'}.jpg`;
}

async function downloadImage(src, name) {
  const res = await fetch(src);
  if (!res.ok) throw new Error('No se pudo bajar la imagen');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const AiImagesPage = () => {
  const [formats, setFormats] = useState(FORMATS);
  const [claude, setClaude] = useState(true);
  const [library, setLibrary] = useState([]);
  const [session, setSession] = useState(null);
  const [format, setFormat] = useState('feed');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const threadRef = useRef(null);

  const applyImage = (image) => {
    setSession(image);
    if (image?.format) setFormat(image.format);
  };

  const refreshLibrary = useCallback(async () => {
    const { data } = await axiosInstance.get('/api/creativos/imagenes-ai');
    setClaude(data.claude !== false);
    if (Array.isArray(data.formats) && data.formats.length) setFormats(data.formats);
    setLibrary(data.items || []);
  }, []);

  useEffect(() => {
    refreshLibrary()
      .catch((err) => toast.error(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [refreshLibrary]);

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [session?.messages, busy]);

  const openImage = async (id) => {
    try {
      const { data } = await axiosInstance.get(`/api/creativos/imagenes-ai/${id}`);
      applyImage(data.image);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const send = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    const current = session;
    setBusy(true);
    setDraft('');
    setSession(current ? {
      ...current,
      messages: [...(current.messages || []), { role: 'user', text: message }]
    } : {
      messages: [{ role: 'user', text: message }],
      format,
      status: 'draft',
      preview: ''
    });
    try {
      const { data } = await axiosInstance.post(
        '/api/creativos/imagenes-ai',
        { sessionId: current?.id, message, format },
        { timeout: 180000 }
      );
      if (!data.success) throw new Error(data.message || 'No se pudo armar');
      applyImage(data.image);
      await refreshLibrary();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      setSession(current);
      setDraft(message);
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!session?.id || saving) return;
    setSaving(true);
    try {
      const { data } = await axiosInstance.post(
        `/api/creativos/imagenes-ai/${session.id}/finalizar`,
        {},
        { timeout: 120000 }
      );
      if (!data.success) throw new Error(data.message || 'No se pudo guardar');
      applyImage(data.image);
      toast.success(data.message || 'La imagen quedó guardada');
      await refreshLibrary();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Borrar esta imagen?')) return;
    try {
      await axiosInstance.delete(`/api/creativos/imagenes-ai/${id}`);
      if (session?.id === id) setSession(null);
      await refreshLibrary();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const preview = session?.preview || session?.imageUrl || '';
  const saved = library.filter((item) => item.status === 'saved');
  const drafts = library.filter((item) => item.status !== 'saved');

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 pb-16">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Link to="/panel-admin/creativos" className="text-sm font-semibold" style={{ color: '#7B2CBF' }}>
            Creativos IG / FB
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-3">
            <FaImage style={{ color: '#7B2CBF' }} />
            Imágenes AI
          </h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Le pedís la gráfica a Claude. Arma el HTML con el logo de Zenn, los logos de marca y las fotos de los productos que tenemos, y lo deja en JPG. Cuando finalizás el chat, la imagen queda guardada para usarla después.
          </p>
          {!claude && !loading && (
            <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Falta ANTHROPIC_API_KEY en el servidor. Sin esa clave el chat no puede armar la pieza.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-[640px]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
              <div className="flex flex-wrap gap-2">
                {formats.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                    style={format === item.id
                      ? { background: '#1E1B4B', color: '#fff', borderColor: '#1E1B4B' }
                      : { background: '#fff', color: '#1E1B4B', borderColor: '#C7D2FE' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setSession(null); setDraft(''); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E1B4B]"
              >
                <FaPlus /> Nuevo chat
              </button>
            </div>

            <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
              {(session?.messages || []).length === 0 && (
                <p className="text-sm text-slate-500">
                  Ejemplo: feed oscuro del iPhone 16, logo de Apple arriba, precio enorme y el logo de Zenn abajo.
                </p>
              )}
              {(session?.messages || []).map((item, index) => (
                <div key={`${item.role}-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      item.role === 'user' ? 'bg-[#1E1B4B] text-white' : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FaSpinner className="animate-spin" /> Claude está armando el JPG…
                </div>
              )}
            </div>

            <form
              className="border-t border-gray-100 p-3 flex gap-2"
              onSubmit={(event) => { event.preventDefault(); send(); }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Decile qué gráfica querés, o qué cambiar de la que ya está."
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#7B2CBF]"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="self-end h-10 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                style={{ background: '#7B2CBF' }}
              >
                <FaPaperPlane /> Pedir
              </button>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Vista</p>
                  <h2 className="font-semibold text-slate-900">{session?.title || 'Todavía sin pieza'}</h2>
                </div>
                {session?.status === 'saved' && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Guardada</span>
                )}
              </div>
              <div
                className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200"
                style={{ aspectRatio: FRAME[format] || FRAME.feed }}
              >
                {preview ? (
                  <img src={preview} alt={session?.title || 'Pieza'} className="w-full h-full object-contain bg-slate-900" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-slate-400 px-6 text-center">
                    El JPG aparece acá cuando Claude termina la pieza.
                  </div>
                )}
              </div>
              {(session?.products || []).length > 0 && (
                <ul className="mt-3 space-y-1">
                  {session.products.map((product) => (
                    <li key={product.codigo} className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{product.name}</span>
                      {product.priceText ? ` · ${product.priceText}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={finalize}
                  disabled={!session?.id || !preview || saving || busy}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#1E1B4B' }}
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  Finalizar chat
                </button>
                <button
                  type="button"
                  disabled={!preview}
                  onClick={() => downloadImage(preview, fileName(session)).catch(() => toast.error('No se pudo descargar'))}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 disabled:opacity-50"
                >
                  <FaDownload /> JPG
                </button>
              </div>
            </div>
          </aside>
        </div>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-slate-900">Guardadas</h2>
          <p className="text-sm text-slate-500 mt-1">Quedan acá después de finalizar el chat, para descargarlas o seguir editándolas.</p>
          {saved.length === 0 ? (
            <p className="text-sm text-slate-400 mt-4">Todavía no hay imágenes guardadas.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-4">
              {saved.map((item) => (
                <article key={item.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => openImage(item.id)} className="block w-full bg-slate-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-36 object-cover" />
                    ) : (
                      <div className="h-36" />
                    )}
                  </button>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <button type="button" onClick={() => openImage(item.id)} className="text-xs font-semibold" style={{ color: '#7B2CBF' }}>
                        Abrir
                      </button>
                      <button type="button" onClick={() => remove(item.id)} className="text-slate-400 hover:text-red-600" aria-label="Borrar">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {drafts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700">Chats sin finalizar</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {drafts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openImage(item.id)}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-700"
                  >
                    {item.title || 'Borrador'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AiImagesPage;

import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../config/axiosInstance';

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `Gs. ${amount.toLocaleString('es-PY')}`;
}

export default function ReelDraftPanel() {
  const [codigo, setCodigo] = useState('');
  const [product, setProduct] = useState(null);
  const [looking, setLooking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [job, setJob] = useState(null);
  const [trials, setTrials] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [message, setMessage] = useState('');

  const loadTrials = useCallback(async () => {
    const response = await axiosInstance.get('/api/reels/jobs/trials');
    setTrials(response.data?.data || []);
  }, []);

  useEffect(() => {
    loadTrials().catch(() => setMessage('No se pudo leer el listado de pruebas'));
  }, [loadTrials]);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'rendering')) return undefined;
    const timer = setInterval(async () => {
      try {
        const response = await axiosInstance.get(`/api/reels/jobs/${job.id}`);
        const next = response.data?.data;
        if (!next) return;
        setJob(next);
        if (next.status === 'ready_for_review' || next.status === 'failed') {
          clearInterval(timer);
          await loadTrials();
        }
      } catch {
        setMessage('No se pudo consultar el estado');
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [job, loadTrials]);

  const lookup = async () => {
    const code = codigo.trim().toUpperCase();
    if (!code) return;
    setLooking(true);
    setMessage('');
    setProduct(null);
    try {
      const response = await axiosInstance.get('/api/creativos/productos', {
        params: { q: code, limit: 20 }
      });
      const rows = response.data?.data || [];
      const match = rows.find((row) => String(row.codigo || '').toUpperCase() === code);
      if (!match) {
        setMessage('No encontré un producto con stock y ese código');
        return;
      }
      setProduct(match);
    } catch {
      setMessage('No se pudo buscar el producto');
    } finally {
      setLooking(false);
    }
  };

  const generate = async () => {
    if (!product || creating) return;
    setCreating(true);
    setMessage('');
    try {
      const response = await axiosInstance.post('/api/reels/jobs', { codigo: product.codigo });
      setJob(response.data?.data || null);
      setMessage('El render empezó. Consultar el estado no lo vuelve a iniciar.');
    } catch (error) {
      const status = error?.response?.status;
      setMessage(status === 409
        ? 'Ya hay un Reel renderizándose'
        : (error?.response?.data?.message || 'No se pudo crear el trabajo'));
    } finally {
      setCreating(false);
    }
  };

  const play = async (id) => {
    setMessage('');
    try {
      const response = await axiosInstance.get(`/api/reels/jobs/${id}/stream`, { responseType: 'blob' });
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(response.data));
    } catch {
      setMessage('No se pudo reproducir el video');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900">Reel de prueba</h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Genera un MP4 vertical en esta Mac. No se publica, no entra al calendario y no se sube al bucket público.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          placeholder="Código del producto"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={looking}
          className="px-4 py-2 rounded-lg font-semibold border"
          style={{ color: '#1E1B4B', borderColor: '#C7D2FE' }}
        >
          {looking ? 'Buscando…' : 'Ver producto'}
        </button>
      </div>
      {product ? (
        <div className="mb-4 text-sm text-gray-800">
          <p className="font-semibold">{product.productName}</p>
          <p>Código {product.codigo}</p>
          <p>Stock {product.stock}</p>
          <p>{money(product.sellingPrice)}</p>
          <button
            type="button"
            onClick={generate}
            disabled={creating}
            className="mt-3 px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: '#1E1B4B' }}
          >
            {creating ? 'Creando trabajo…' : 'Generar MP4'}
          </button>
        </div>
      ) : null}
      {job ? (
        <p className="text-sm text-gray-700 mb-3">
          Trabajo {job.id}: {job.status}
          {job.error ? `. ${job.error}` : ''}
        </p>
      ) : null}
      {message ? <p className="text-sm text-gray-600 mb-3">{message}</p> : null}
      {videoUrl ? (
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          playsInline
          autoPlay
          className="w-full max-w-sm rounded-lg bg-black mb-4"
        />
      ) : null}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Pruebas en producción</h3>
      <ul className="text-sm text-gray-700 space-y-2">
        {trials.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            <span>{item.codigo}</span>
            <span>{item.productName}</span>
            <span>{item.status}</span>
            {item.status === 'ready_for_review' ? (
              <button type="button" onClick={() => play(item.id)} className="font-semibold" style={{ color: '#7B2CBF' }}>
                Reproducir
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

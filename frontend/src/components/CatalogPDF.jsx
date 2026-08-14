import React, { useState } from 'react';
import { jobsConfig } from '../helpers/jobsApi';
import axiosInstance from '../config/axiosInstance';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CatalogPDF = ({ catalogData, companyName = 'Zenn Electrónica', selectedCategory = 'all', selectedSubcategory = 'all' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const jobs = jobsConfig();
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (!catalogData || catalogData.length === 0) {
    return (
      <div className="w-full bg-gray-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center">
        No hay productos para generar catálogo
      </div>
    );
  }

  const pdfFileName = () =>
    `catalogo-${companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

  const savePdf = async (blob) => {
    const name = pdfFileName();
    const file = new File([blob], name, { type: 'application/pdf' });
    const canShare =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    setProgressText('Iniciando…');
    try {
      let jobId;
      let poll;
      let download;

      const reqOpts = { timeout: 12000 };

      if (isLocal) {
        if (!jobs.base) {
          throw new Error('Falta REACT_APP_JOBS_API_URL (URL de jobs-api).');
        }
        const headers = {
          'Content-Type': 'application/json',
          'X-Worker-Key': jobs.key,
        };
        const healthRes = await fetch(`${jobs.base}/health`, { headers: { 'X-Worker-Key': jobs.key } });
        const health = await healthRes.json().catch(() => ({}));
        if (!healthRes.ok) {
          throw new Error('jobs-api no responde. En el VPS: pm2 restart zenn-jobs');
        }
        if (health.scrapeRunning) {
          throw new Error('Hay un scrape Visão en curso. Esperá a que termine y volvé a generar el PDF.');
        }
        const response = await fetch(`${jobs.base}/catalog-pdf`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            category: selectedCategory,
            subcategory: selectedSubcategory,
            title: `Catálogo - ${companyName}`,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || `jobs-api ${response.status}`);
        if (!data.jobId) throw new Error('jobs-api no devolvió jobId');
        jobId = data.jobId;
        poll = async () => {
          const st = await fetch(`${jobs.base}/catalog-pdf/${jobId}`, {
            headers: { 'X-Worker-Key': jobs.key },
          });
          const body = await st.json().catch(() => ({}));
          if (st.status === 404) {
            throw new Error('El job se perdió (jobs-api se reinició). Volvé a generar el PDF.');
          }
          return body;
        };
        download = async () => {
          const fileRes = await fetch(`${jobs.base}/catalog-pdf/${jobId}/file`, {
            headers: { 'X-Worker-Key': jobs.key },
          });
          if (!fileRes.ok) throw new Error('No se pudo descargar el PDF');
          return fileRes.blob();
        };
      } else {
        setProgressText('Comprobando servidor de jobs…');
        const healthRes = await axiosInstance.get('/api/jobs-health', reqOpts);
        const health = healthRes.data || {};
        if (!health.jobsUp) {
          throw new Error(
            health.message ||
              'El servidor de jobs (VPS) está caído. En el VPS: pm2 status zenn-jobs && pm2 restart zenn-jobs'
          );
        }
        if (health.scrapeRunning) {
          throw new Error('Hay un scrape Visão en curso. Esperá a que termine y volvé a generar el PDF.');
        }
        const { data } = await axiosInstance.post(
          '/api/generate-catalog-pdf',
          {
            category: selectedCategory,
            subcategory: selectedSubcategory,
            title: `Catálogo - ${companyName}`,
          },
          reqOpts
        );
        if (!data?.jobId) throw new Error(data?.message || 'El backend no inició el PDF en el VPS');
        jobId = data.jobId;
        poll = async () => {
          const st = await axiosInstance.get(`/api/catalog-pdf-job/${jobId}`, reqOpts);
          return st.data || {};
        };
        download = async () => {
          const fileRes = await axiosInstance.get(`/api/catalog-pdf-job/${jobId}/file`, {
            ...reqOpts,
            timeout: 60000,
            responseType: 'blob',
          });
          const blob = fileRes.data;
          if (blob && blob.type && blob.type.includes('json')) {
            const text = await blob.text();
            const err = JSON.parse(text);
            throw new Error(err.message || err.error || 'PDF no listo');
          }
          return blob;
        };
      }

      const started = Date.now();
      setProgressText('Generando en el servidor…');
      let fails = 0;
      while (Date.now() - started < 4 * 60 * 1000) {
        try {
          const status = await poll();
          fails = 0;
          if (status.progress) setProgressText(status.progress);
          if (status.status === 'ready') {
            setProgressText('Descargando…');
            await savePdf(await download());
            return;
          }
          if (status.status === 'error') {
            throw new Error(status.error || 'Error generando PDF');
          }
        } catch (pollErr) {
          fails += 1;
          const msg =
            pollErr?.response?.data?.error ||
            pollErr?.response?.data?.message ||
            pollErr.message ||
            '';
          if (/no responde|caído|se perdió|se reinició|503/i.test(msg) || pollErr?.response?.status === 503) {
            throw pollErr;
          }
          if (fails >= 3) {
            throw new Error(
              'El servidor de jobs dejó de responder. En el VPS: pm2 restart zenn-jobs'
            );
          }
        }
        await sleep(800);
      }
      throw new Error('Tiempo agotado generando el PDF. Revisá en el VPS: pm2 logs zenn-jobs');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        'Error al generar el PDF. Por favor, intenta de nuevo.';
      console.error('Error generando PDF:', error);
      alert(msg);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className={`w-full ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors`}
    >
      {isGenerating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{progressText || 'Generando PDF...'}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Descargar Catálogo PDF</span>
        </>
      )}
    </button>
  );
};

export default CatalogPDF;

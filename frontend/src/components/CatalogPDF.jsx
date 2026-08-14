import React, { useState } from 'react';
import { jobsConfig } from '../helpers/jobsApi';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const backendBase = () =>
  (process.env.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    ''
  );

const CatalogPDF = ({ catalogData, companyName = 'Zenn Electrónica', selectedCategory = 'all', selectedSubcategory = 'all' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
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

  const savePdf = (blob) => {
    const url = window.URL.createObjectURL(blob);
    const ios = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    if (ios) {
      window.location.href = url;
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFileName();
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      let jobId;
      let pollUrl;
      let fileUrl;
      let fetchOpts;

      if (isLocal) {
        if (!jobs.base) {
          throw new Error('Falta REACT_APP_JOBS_API_URL (URL de jobs-api).');
        }
        const headers = {
          'Content-Type': 'application/json',
          'X-Worker-Key': jobs.key,
        };
        fetchOpts = { headers };
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
        pollUrl = `${jobs.base}/catalog-pdf/${jobId}`;
        fileUrl = `${jobs.base}/catalog-pdf/${jobId}/file`;
      } else {
        const api = backendBase();
        fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
        const response = await fetch(`${api}/api/generate-catalog-pdf`, {
          method: 'POST',
          ...fetchOpts,
          body: JSON.stringify({
            category: selectedCategory,
            subcategory: selectedSubcategory,
            title: `Catálogo - ${companyName}`,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error || `Error ${response.status}`);
        if (!data.jobId) throw new Error(data.message || 'El backend no inició el PDF en el VPS');
        jobId = data.jobId;
        pollUrl = `${api}/api/catalog-pdf-job/${jobId}`;
        fileUrl = `${api}/api/catalog-pdf-job/${jobId}/file`;
      }

      const started = Date.now();
      while (Date.now() - started < 8 * 60 * 1000) {
        const st = await fetch(pollUrl, fetchOpts);
        const status = await st.json().catch(() => ({}));
        if (status.status === 'ready') {
          const fileRes = await fetch(fileUrl, fetchOpts);
          if (!fileRes.ok) throw new Error('No se pudo descargar el PDF');
          savePdf(await fileRes.blob());
          return;
        }
        if (status.status === 'error') {
          throw new Error(status.error || 'Error generando PDF');
        }
        await sleep(2500);
      }
      throw new Error('Tiempo agotado generando el PDF');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert(error.message || 'Error al generar el PDF. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
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
          <span>Generando PDF...</span>
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

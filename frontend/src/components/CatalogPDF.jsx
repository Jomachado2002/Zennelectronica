import React, { useState } from 'react';
import { jobsConfig } from '../helpers/jobsApi';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CatalogPDF = ({ catalogData, companyName = 'Zenn Electrónica', selectedCategory = 'all', selectedSubcategory = 'all' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const jobs = jobsConfig();

  if (!catalogData || catalogData.length === 0) {
    return (
      <div className="w-full bg-gray-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center">
        No hay productos para generar catálogo
      </div>
    );
  }

  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const pdfFileName = () =>
    `catalogo-${companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

  const generatePDF = async () => {
    if (!jobs.base) {
      alert('Falta REACT_APP_JOBS_API_URL (URL de jobs-api).');
      return;
    }
    setIsGenerating(true);
    const headers = {
      'Content-Type': 'application/json',
      'X-Worker-Key': jobs.key,
    };
    const startUrl = `${jobs.base}/catalog-pdf`;
    console.log('[catalog-pdf] POST', startUrl);
    try {
      const response = await fetch(startUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: selectedCategory,
          subcategory: selectedSubcategory,
          title: `Catálogo - ${companyName}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `jobs-api ${response.status}`);
      }
      if (!data.jobId) throw new Error('jobs-api no devolvió jobId');

      const started = Date.now();
      while (Date.now() - started < 8 * 60 * 1000) {
        const st = await fetch(`${jobs.base}/catalog-pdf/${data.jobId}`, { headers });
        const status = await st.json();
        if (status.status === 'ready') {
          const fileRes = await fetch(`${jobs.base}/catalog-pdf/${data.jobId}/file`, { headers });
          if (!fileRes.ok) throw new Error('No se pudo descargar el PDF');
          downloadBlob(await fileRes.blob(), pdfFileName());
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

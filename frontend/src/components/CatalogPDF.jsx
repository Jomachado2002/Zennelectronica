import React, { useState } from 'react';

const CatalogPDF = ({ catalogData, companyName = 'Zenn Electrónica', selectedCategory = 'all', selectedSubcategory = 'all' }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!catalogData || catalogData.length === 0) {
    return (
      <div className="w-full bg-gray-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center">
        No hay productos para generar catálogo
      </div>
    );
  }

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // Llamar al endpoint del backend que usa Puppeteer
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/api/generate-catalog-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          category: selectedCategory,
          subcategory: selectedSubcategory,
          title: `Catálogo - ${companyName}`
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error del servidor:', errorData);
        throw new Error(`Error al generar el PDF: ${response.status} ${response.statusText}`);
      }

      // Obtener el blob del PDF
      const blob = await response.blob();
      console.log('PDF recibido, tamaño:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Crear un enlace temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo-${companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Descargar Catálogo PDF</span>
        </>
      )}
    </button>
  );
};

export default CatalogPDF;
import React from 'react';
import ProductFinanceForm from './ProductFinanceForm';

const ProductFinanceModal = ({ product, onClose, onUpdate, exchangeRate }) => {
  // Evitar la propagación del clic para que no se cierre al hacer clic dentro del modal
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Overlay de fondo con z-index mayor que el header */}
      <div 
        className="fixed inset-0 bg-black/60 z-[200]" 
        onClick={onClose}
      />
      
      {/* Contenedor del modal centrado con z-index aún mayor */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[210] p-4"
        onClick={handleModalClick}
      >
        <div className="w-full max-w-2xl">
          <ProductFinanceForm 
            product={product} 
            onClose={onClose} 
            onUpdate={onUpdate}
            exchangeRate={exchangeRate}
          />
        </div>
      </div>
    </>
  );
};

export default ProductFinanceModal;
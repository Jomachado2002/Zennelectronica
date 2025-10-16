// frontend/src/pages/NewProductPage.js - PÁGINA QUE ABRE EL MODAL DE CARGA DE PRODUCTOS
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UploadProduct from '../components/UploadProduct';

const NewProductPage = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/panel-admin/productos');
  };

  const handleProductCreated = () => {
    // El producto se creó exitosamente, navegar de vuelta a la lista
    navigate('/panel-admin/productos');
  };

  return (
    <UploadProduct 
      onClose={handleClose}
      fetchData={handleProductCreated}
    />
  );
};

export default NewProductPage;

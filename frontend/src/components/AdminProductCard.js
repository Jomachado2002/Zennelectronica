import React, { useState } from 'react';
import { MdModeEditOutline } from "react-icons/md";
import { 
  FaImage, 
  FaTag, 
  FaBox, 
  FaChartLine,
  FaExclamationTriangle,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import AdminEditProduct from './AdminEditProduct';
import displayPYGCurrency from '../helpers/displayCurrency';

const AdminProductCard = ({
  data,
  fetchdata
}) => {
  // Debug: Log data when component mounts (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🏷️ AdminProductCard - Datos del producto:', data);
  }
  
  const [editProduct, setEditProduct] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  
  const getStockStatus = () => {
    const stock = data.stock || 0;
    if (stock === 0) return { color: 'red', text: 'Sin Stock', icon: <FaTimes /> };
    if (stock <= 10) return { color: 'yellow', text: 'Stock Bajo', icon: <FaExclamationTriangle /> };
    return { color: 'green', text: 'En Stock', icon: <FaCheck /> };
  };

  const stockStatus = getStockStatus();

  return (
    <div className='bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden'>
      {/* Imagen del producto */}
      <div className='relative h-48 bg-gray-100'>
        {data?.productImage?.[0] ? (
          <img 
            src={data.productImage[0]} 
            className='w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200' 
            alt={data.productName || 'Producto'}
            onClick={() => setShowFullImage(true)}
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-gray-400'>
            <FaImage className='w-12 h-12' />
          </div>
        )}
        
        {/* Badges */}
        <div className='absolute top-2 left-2 flex flex-col space-y-1'>
          {data.isVipOffer && (
            <span className='bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center'>
              <FaTag className='w-3 h-3 mr-1' />
              VIP
            </span>
          )}
          <span className={`text-white text-xs px-2 py-1 rounded-full flex items-center bg-${stockStatus.color}-600`}>
            {stockStatus.icon}
            <span className='ml-1'>{stockStatus.text}</span>
          </span>
        </div>

        {/* Stock badge */}
        <div className='absolute top-2 right-2'>
          <span className='bg-white text-gray-700 text-xs px-2 py-1 rounded-full shadow-sm'>
            {data.stock || 0} unidades
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className='p-4'>
        {/* Código del producto */}
        {data?.codigo && (
          <div className='text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-2 inline-block'>
            {data.codigo}
          </div>
        )}
        
        {/* Nombre del producto */}
        <h3 className='font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight'>
          {data.productName || 'Sin nombre'}
        </h3>
        
        {/* Marca y categoría */}
        <div className='text-sm text-gray-600 mb-3'>
          <div className='flex items-center mb-1'>
            <FaBox className='w-3 h-3 mr-1' />
            <span>{data.brandName || 'Sin marca'}</span>
          </div>
          <div className='text-xs'>
            {data.category} {data.subcategory && `• ${data.subcategory}`}
          </div>
        </div>
        
        {/* Precio */}
        <div className='mb-3'>
          <div className='text-lg font-bold text-gray-900'>
            {displayPYGCurrency(data.sellingPrice || 0)}
          </div>
          {data.profitAmount && (
            <div className='text-xs text-green-600 flex items-center'>
              <FaChartLine className='w-3 h-3 mr-1' />
              Ganancia: {displayPYGCurrency(data.profitAmount)}
              {data.profitMargin && (
                <span className='ml-1'>({data.profitMargin.toFixed(1)}%)</span>
              )}
            </div>
          )}
        </div>
        
        {/* Acciones */}
        <div className='flex justify-between items-center pt-3 border-t border-gray-100'>
          <div className='flex space-x-2'>
            
            <button
              className='p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors'
              onClick={() => setEditProduct(true)}
              title="Editar Producto"
            >
              <MdModeEditOutline className='w-4 h-4' />
            </button>
          </div>
          
          <div className='text-xs text-gray-500'>
            {data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : ''}
          </div>
        </div>
      </div>

      {/* Modal de imagen completa */}
      {showFullImage && data?.productImage?.[0] && (
        <div className='fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4'>
          <div className='relative max-w-4xl max-h-full'>
            <button
              onClick={() => setShowFullImage(false)}
              className='absolute -top-10 right-0 text-white text-2xl hover:text-gray-300'
            >
              <FaTimes />
            </button>
            <img
              src={data.productImage[0]}
              className='max-w-full max-h-full object-contain rounded-lg'
              alt={data.productName || 'Producto'}
            />
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editProduct && (
        <AdminEditProduct
          onClose={() => setEditProduct(false)}
          productData={data}
          fetchdata={fetchdata}
        />
      )}
    </div>
  );
};

export default AdminProductCard;
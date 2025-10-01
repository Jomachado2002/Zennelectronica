import React, { useState } from 'react';
import { MdModeEditOutline } from "react-icons/md";
import { FaCalculator, FaImage } from "react-icons/fa";
import AdminEditProduct from './AdminEditProduct';
import displayPYGCurrency from '../helpers/displayCurrency';


const AdminProductCard = ({
  data,
  fetchdata,
  onFinance
}) => {
  const [editProduct, setEditProduct] = useState(false);
  

  return (
    <div className='bg-green-50 p-4 rounded'>
      <div className='w-40'>
        <div>
          <div className='w-32 h-32 flex justify-center items-center '>
            <img src={data?.productImage[0]} className='mx-auto object-fill h-full' alt={data.productName || 'Producto'} />
          </div>
          <h1 className='text-ellipsis line-clamp-2'>{data.productName}</h1>
          
          <div>
            <p className='font-semibold'>
              {
                displayPYGCurrency(data.sellingPrice)
              }
            </p>
            <div className='flex justify-end'>
       
            
              {/* Botón para gestión financiera */}
              <button
                className='w-fit p-2 bg-blue-100 hover:bg-blue-600 rounded-full hover:text-white cursor-pointer mr-2'
                onClick={(e) => {
                  e.stopPropagation();
                  onFinance(data);
                }}
                title="Gestión Financiera"
              >
                <FaCalculator />
              </button>
                
              {/* Botón para editar producto */}
              <div
                className='w-fit p-2 bg-green-100 hover:bg-green-600 rounded-full hover:text-white cursor-pointer'
                onClick={() => setEditProduct(true)}
              >
                <MdModeEditOutline />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de edición de producto */}
      {
        editProduct && (
          <AdminEditProduct productData={data} onClose={() => setEditProduct(false)} fetchdata={fetchdata} />
        )
      }
      
      
    
    </div>
  )
}

export default AdminProductCard
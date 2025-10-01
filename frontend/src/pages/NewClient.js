// frontend/src/pages/NewClient.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';

const NewClient = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    taxId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'Paraguay'
    },
    notes: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Manejar campos anidados (dirección)
    if (name.includes('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(SummaryApi.createClient.url, {
        method: SummaryApi.createClient.method,
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Cliente creado correctamente");
        navigate("/panel-admin/clientes");
      } else {
        toast.error(result.message || "Error al crear el cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Link to="/panel-admin/clientes" className="text-blue-600 hover:underline mb-4 inline-block">
        &lt; Volver a la lista de clientes
      </Link>
      
      <h1 className="text-2xl font-bold mb-4">Crear Nuevo Cliente</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Información básica */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
              NIF/CIF
            </label>
            <input
              type="text"
              id="taxId"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        
        {/* Dirección */}
        <h2 className="text-lg font-semibold mb-2 mt-4 text-gray-800">Dirección</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">
              Calle y número
            </label>
            <input
              type="text"
              id="address.street"
              name="address.street"
              value={formData.address.street}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              id="address.city"
              name="address.city"
              value={formData.address.city}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
              Provincia/Estado
            </label>
            <input
              type="text"
              id="address.state"
              name="address.state"
              value={formData.address.state}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="address.zip" className="block text-sm font-medium text-gray-700 mb-1">
              Código postal
            </label>
            <input
              type="text"
              id="address.zip"
              name="address.zip"
              value={formData.address.zip}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <input
              type="text"
              id="address.country"
              name="address.country"
              value={formData.address.country}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        
        {/* Notas */}
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notas adicionales
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg resize-none"
          ></textarea>
        </div>
        
        {/* Botón de envío */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/panel-admin/clientes")}
            className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Creando..." : "Crear Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewClient;
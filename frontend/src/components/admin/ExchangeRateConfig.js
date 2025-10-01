// frontend/src/components/admin/ExchangeRateConfig.js
import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaExchangeAlt, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ExchangeRateConfig = ({ exchangeRate, setExchangeRate }) => {
  const [editMode, setEditMode] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate);
  const [lastUpdated, setLastUpdated] = useState(
    localStorage.getItem('exchangeRateLastUpdated') || new Date().toLocaleString()
  );

  // Al montar el componente, intentar cargar el tipo de cambio almacenado
  useEffect(() => {
    const savedRate = localStorage.getItem('exchangeRate');
    if (savedRate) {
      setExchangeRate(Number(savedRate));
      setTempRate(Number(savedRate));
    }
  }, [setExchangeRate]);

  // Guardar el tipo de cambio actual
  const saveExchangeRate = () => {
    // Validar que sea un número positivo
    if (!tempRate || tempRate <= 0 || isNaN(tempRate)) {
      toast.error("Por favor ingrese un valor válido para el tipo de cambio");
      return;
    }
    
    // Actualizar el estado global
    setExchangeRate(Number(tempRate));
    
    // Guardar en localStorage para persistencia
    localStorage.setItem('exchangeRate', tempRate);
    
    // Actualizar la fecha de última modificación
    const now = new Date().toLocaleString();
    setLastUpdated(now);
    localStorage.setItem('exchangeRateLastUpdated', now);
    
    // Salir del modo edición
    setEditMode(false);
    
    toast.success("Tipo de cambio actualizado correctamente");
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 border-blue-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FaExchangeAlt className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Tipo de Cambio USD/PYG</h3>
            <p className="text-xs text-gray-500">Actualizado: {lastUpdated}</p>
          </div>
        </div>
        
        {editMode ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden border">
              <span className="px-2 bg-gray-200 text-gray-700">
                <FaDollarSign />
              </span>
              <input
                type="number"
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                className="w-24 p-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="1"
                step="1"
              />
            </div>
            <button
              onClick={saveExchangeRate}
              className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
              title="Guardar"
            >
              <FaSave />
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setTempRate(exchangeRate);
              }}
              className="bg-gray-600 text-white p-1 rounded hover:bg-gray-700"
              title="Cancelar"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="text-xl font-bold text-gray-800">
              {exchangeRate.toLocaleString()} Gs.
            </div>
            <button
              onClick={() => setEditMode(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
            >
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExchangeRateConfig;
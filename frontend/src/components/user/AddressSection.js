import React from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

const AddressSection = ({ 
  address, 
  isEditing, 
  onChange 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <FaMapMarkerAlt />
        Dirección
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Calle */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Dirección
          </label>
          {isEditing ? (
            <input
              type="text"
              name="address.street"
              value={address.street}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
              placeholder="Calle y número"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {address.street || 'No especificado'}
            </div>
          )}
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Ciudad
          </label>
          {isEditing ? (
            <input
              type="text"
              name="address.city"
              value={address.city}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
              placeholder="Ciudad"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {address.city || 'No especificado'}
            </div>
          )}
        </div>

        {/* Departamento/Estado */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Departamento
          </label>
          {isEditing ? (
            <input
              type="text"
              name="address.state"
              value={address.state}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
              placeholder="Departamento"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {address.state || 'No especificado'}
            </div>
          )}
        </div>

        {/* Código Postal */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Código Postal
          </label>
          {isEditing ? (
            <input
              type="text"
              name="address.zipCode"
              value={address.zipCode}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
              placeholder="Código postal"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {address.zipCode || 'No especificado'}
            </div>
          )}
        </div>

        {/* País */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            País
          </label>
          {isEditing ? (
            <select
              name="address.country"
              value={address.country}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
            >
              <option value="Paraguay">Paraguay</option>
              <option value="Argentina">Argentina</option>
              <option value="Brasil">Brasil</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Chile">Chile</option>
              <option value="Bolivia">Bolivia</option>
              <option value="Otro">Otro</option>
            </select>
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {address.country || 'Paraguay'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressSection;
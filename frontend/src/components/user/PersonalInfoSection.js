import React from 'react';
import { FaUser, FaEnvelope, FaPhone, FaCalendar } from 'react-icons/fa';

const PersonalInfoSection = ({ 
  formData, 
  isEditing, 
  errors, 
  onChange 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Información Personal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-medium mb-2">
            <FaUser className="inline mr-2" />
            Nombre Completo *
          </label>
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190] ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tu nombre completo"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {formData.name || 'No especificado'}
            </div>
          )}
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-medium mb-2">
            <FaEnvelope className="inline mr-2" />
            Email *
          </label>
          {isEditing ? (
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190] ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="tu@email.com"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {formData.email || 'No especificado'}
            </div>
          )}
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            <FaPhone className="inline mr-2" />
            Teléfono
          </label>
          {isEditing ? (
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190] ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+595 XXX XXXXXX"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {formData.phone || 'No especificado'}
            </div>
          )}
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Fecha de nacimiento */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            <FaCalendar className="inline mr-2" />
            Fecha de Nacimiento
          </label>
          {isEditing ? (
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
            />
          ) : (
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-gray-800">
              {formData.dateOfBirth || 'No especificado'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;
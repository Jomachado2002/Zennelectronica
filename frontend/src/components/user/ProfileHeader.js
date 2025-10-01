import React from 'react';
import { FaUser, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const ProfileHeader = ({ 
  isEditing, 
  loading, 
  onEdit, 
  onSave, 
  onCancel 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
            <FaUser className="text-xl" />
            Mi Perfil
          </h1>
          <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
        </div>
        
        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 bg-[#2A3190] text-white px-4 py-2 rounded-lg hover:bg-[#1e236b] transition-colors"
            >
              <FaEdit className="text-sm" />
              Editar Perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FaSave className="text-sm" />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <FaTimes className="text-sm" />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
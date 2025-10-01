import React from 'react';
import { FaUser, FaCamera } from 'react-icons/fa';

const ProfileImageSection = ({ 
  profilePic, 
  name, 
  email, 
  isEditing, 
  onImageUpload 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Foto de Perfil</h2>
      
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {profilePic ? (
              <img 
                src={profilePic} 
                alt="Perfil" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <FaUser className="text-4xl text-gray-400" />
            )}
          </div>
          
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-[#2A3190] text-white p-2 rounded-full cursor-pointer hover:bg-[#1e236b] transition-colors">
              <FaCamera className="text-sm" />
              <input
                type="file"
                accept="image/*"
                onChange={onImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
        
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">{name || 'Sin nombre'}</h3>
          <p className="text-gray-500 text-sm">{email || 'Sin email'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageSection;
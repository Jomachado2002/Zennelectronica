import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ProfileHeader from './ProfileHeader';
import ProfileImageSection from './ProfileImageSection';
import PersonalInfoSection from './PersonalInfoSection';
import AddressSection from './AddressSection';
import SecurityInfoBanner from './SecurityInfoBanner';
import SimpleLocationSelector from '../location/SimpleLocationSelector';
import { FaClock, FaMapMarkerAlt, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';
import SummaryApi from '../../common';
import { authGet } from '../../helpers/authFetch';

const UserProfile = ({ user, onUpdateProfile, onUploadImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Paraguay'
    },
    dateOfBirth: '',
    profilePic: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const handleLocationSave = (locationData) => {
    // ✅ NO MOSTRAR TOAST AQUÍ PORQUE SimpleLocationSelector YA LO MUESTRA
    // La ubicación ya está guardada en el backend
    console.log('📍 Ubicación actualizada:', locationData);
  };

  // Cargar datos del usuario al montar
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'Paraguay'
        },
        dateOfBirth: user.dateOfBirth || '',
        profilePic: user.profilePic || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Limpiar error del campo específico
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onUpdateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      // console.error removed for production
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Restaurar datos originales
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'Paraguay'
        },
        dateOfBirth: user.dateOfBirth || '',
        profilePic: user.profilePic || ''
      });
    }
    setIsEditing(false);
    setErrors({});
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const imageUrl = await onUploadImage(file);
        setFormData(prev => ({
          ...prev,
          profilePic: imageUrl
        }));
      } catch (error) {
        // console.error removed for production
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header del perfil */}
        <ProfileHeader
          isEditing={isEditing}
          loading={loading}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
        />

        {/* Contenido del perfil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Imagen de perfil */}
          <div className="lg:col-span-1">
            <ProfileImageSection
              profilePic={formData.profilePic}
              name={formData.name}
              email={formData.email}
              isEditing={isEditing}
              onImageUpload={handleImageUpload}
            />
          </div>

          {/* Información personal */}
          <div className="lg:col-span-2">
            <PersonalInfoSection
              formData={formData}
              isEditing={isEditing}
              errors={errors}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Dirección */}
        <div className="mt-6">
          <AddressSection
            address={formData.address}
            isEditing={isEditing}
            onChange={handleInputChange}
          />
        </div>
        
        {/* ✅ NUEVA SECCIÓN DE UBICACIÓN GUARDADA */}
        <div className="mt-6">
          <UserLocationDisplay 
            user={user}
            onLocationUpdate={() => {
              window.location.reload();
            }}
          />
        </div>

        {/* Información de seguridad */}
        <div className="mt-6">
          <SecurityInfoBanner />
        </div>
      </div>
    </div>
  );
};

// ✅ COMPONENTE PARA MOSTRAR UBICACIÓN GUARDADA
const UserLocationDisplay = ({ user, onLocationUpdate }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    setLoading(true);
    try {
      // ✅ USAR authGet QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
      const response = await authGet(SummaryApi.location.getUserLocation.url);
      
      const result = await response.json();
      if (result.success && result.data) {
        setUserLocation(result.data);
      }
    } catch (error) {
      // console.warn removed for production
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSave = (locationData) => {
    setUserLocation(locationData);
    setShowLocationSelector(false);
    toast.success('📍 Ubicación actualizada correctamente');
    if (onLocationUpdate) onLocationUpdate();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <FaMapMarkerAlt />
          Mi Ubicación Principal
        </h3>
        <p className="text-blue-100 text-sm mt-1">Ubicación guardada para entregas</p>
      </div>

      <div className="p-6">
        {userLocation ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCheckCircle className="text-green-600 text-xl" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-2">📍 Ubicación confirmada</h4>
                  <p className="text-green-800 mb-3 font-medium">{userLocation.address}</p>
                  
                  <div className="flex flex-wrap gap-3 items-center mb-4">
                    <div className="text-xs text-green-600 font-mono bg-green-100 px-3 py-1 rounded-full">
                      📍 {userLocation.lat?.toFixed(6)}, {userLocation.lng?.toFixed(6)}
                    </div>
                    {userLocation.google_maps_url && (
                      <a
                        href={userLocation.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        <FaExternalLinkAlt />
                        Ver en Google Maps
                      </a>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLocationSelector(true)}
                      className="px-4 py-2 text-green-700 bg-green-100 hover:bg-green-200 rounded-lg font-medium transition-colors text-sm"
                    >
                      Cambiar ubicación
                    </button>
                    {userLocation.google_maps_url && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${userLocation.lat},${userLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg font-medium transition-colors text-sm"
                      >
                        Cómo llegar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              <p className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-500" />
                <span>Esta ubicación se usará automáticamente en tus pedidos</span>
              </p>
              <p className="flex items-center gap-2">
                <FaClock className="text-blue-500" />
                <span>Actualizado: {new Date(userLocation.timestamp || Date.now()).toLocaleDateString('es-ES')}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaMapMarkerAlt className="text-gray-400 text-2xl" />
            </div>
            <h4 className="text-lg font-medium text-gray-800 mb-2">Sin ubicación guardada</h4>
            <p className="text-gray-600 mb-6">Agrega tu ubicación principal para entregas más rápidas</p>
            <button
              onClick={() => setShowLocationSelector(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Agregar mi ubicación
            </button>
          </div>
        )}

        {showLocationSelector && (
          <div className="mt-6">
            <SimpleLocationSelector
              initialLocation={userLocation}
              onLocationSave={handleLocationSave}
              isUserLoggedIn={true}
              title="Actualizar Mi Ubicación Principal"
              onClose={() => setShowLocationSelector(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
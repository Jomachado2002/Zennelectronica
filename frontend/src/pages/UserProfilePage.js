// frontend/src/pages/UserProfilePage.js - VERSIÓN MEJORADA COMPATIBLE CON IOS
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { setUserDetails } from '../store/userSlice';
import UserProfile from '../components/user/UserProfile';
import CardManagementPage from '../components/user/CardManagementPage';
import FavoritesPage from '../components/user/FavoritesPage';
import SettingsPage from '../components/user/SettingsPage';
import UserPurchases from '../components/user/UserPurchases';
import BalanceManagement from '../components/user/BalanceManagement';
import BalanceDisplay from '../components/BalanceDisplay';
import { BiSolidPurchaseTag } from "react-icons/bi";

import SummaryApi from '../common';
import { 
  FaUser, 
  FaCreditCard, 
  FaHeart, 
  FaCog, 
  FaSignOutAlt,
  FaHome,
  FaSpinner,
  FaExclamationTriangle,
  FaWallet
} from 'react-icons/fa';

const UserProfilePage = () => {
  const user = useSelector(state => state?.user?.user); // ✅ IGUAL QUE ADMIN PANEL
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [userDataReady, setUserDataReady] = useState(false);

  // ✅ VERIFICACIÓN Y CARGA DE DATOS COMO ADMIN PANEL
  useEffect(() => {
    const initializeUserData = async () => {
      if (!user) {
        toast.info('Debes iniciar sesión para acceder a tu perfil');
        navigate('/iniciar-sesion');
        return;
      }

      // ✅ VERIFICAR QUE EL USUARIO TENGA DATOS COMPLETOS
      if (!user._id) {
        // console.warn removed for production
        await fetchUserDetails();
      } else {
        setUserDataReady(true);
      }
    };

    initializeUserData();
  }, [user, navigate]);

  // ✅ FUNCIÓN PARA RECARGAR DATOS DEL USUARIO (COMO ADMIN PANEL)
  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      
      
      const response = await fetch(SummaryApi.current_user.url, {
        method: SummaryApi.current_user.method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // ✅ IMPORTANTE PARA iOS
        }
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        
        dispatch(setUserDetails(result.data));
        setUserDataReady(true);
      } else {
        // console.error removed for production
        if (response.status === 401) {
          toast.error('Sesión expirada, redirigiendo...');
          navigate('/iniciar-sesion');
        } else {
          toast.error('Error al cargar datos del usuario');
        }
      }
    } catch (error) {
      // console.error removed for production
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // ✅ LEER TAB DESDE URL PARAMS
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['profile', 'cards', 'balance', 'favorites', 'settings', 'purchases'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // ✅ FUNCIÓN MEJORADA PARA REGISTRO DE TARJETAS CON VALIDACIONES
  const handleRegisterCard = async (cardData) => {
    try {
      
      
      // ✅ VALIDAR USUARIO ANTES DE PROCEDER
      if (!user?._id) {
        toast.error('❌ Error: Usuario no válido. Recarga la página.');
        return { success: false, message: 'Usuario no válido' };
      }

      // ✅ GENERAR bancardUserId SI NO EXISTE
      const bancardUserId = user.bancardUserId || user._id;
      
      const enrichedCardData = {
        ...cardData,
        //user_id: bancardUserId, // ✅ USAR bancardUserId O _id como fallback
        user_cell_phone: user.phone || '12345678',
        user_mail: user.email
      };
      
      
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/tarjetas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // ✅ IMPORTANTE PARA iOS
        },
        credentials: 'include',
        body: JSON.stringify(enrichedCardData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // console.error removed for production
        
        // ✅ MANEJO ESPECÍFICO DE ERRORES DE IOS
        if (response.status === 401) {
          toast.error('❌ Sesión expirada. Recargando datos...');
          await fetchUserDetails();
          return { success: false, message: 'Sesión expirada' };
        }
        
        toast.error(`❌ Error del servidor: ${response.status}`);
        return { success: false, message: `Error ${response.status}` };
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.process_id) {
        
        toast.success('✅ Proceso de catastro iniciado');
        return result;
      } else {
        // console.error removed for production
        toast.error(result.message || '❌ Error al iniciar catastro');
        return { success: false, message: result.message };
      }
      
    } catch (error) {
      // console.error removed for production
      toast.error('❌ Error de conexión crítico');
      return { success: false, message: 'Error de conexión crítico' };
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA OBTENER TARJETAS CON VALIDACIONES
  const handleFetchCards = async (userId) => {
    try {
      
      
      // ✅ VALIDAR USUARIO
      if (!user?._id) {
        // console.error removed for production
        toast.error('❌ Error: Usuario no válido');
        return [];
      }

      // ✅ USAR bancardUserId O _id COMO FALLBACK
      const targetUserId = user.bancardUserId || user._id;
      
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/tarjetas/${targetUserId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // ✅ IMPORTANTE PARA iOS
        }
      });

      const result = await response.json();
      
      if (result.success) {
        
        return result.data.cards || [];
      } else {
        // console.warn removed for production
        
        // ✅ MANEJO ESPECÍFICO PARA USUARIOS SIN BANCARD ID
        if (result.message?.includes('bancardUserId')) {
          toast.info('ℹ️ Aún no tienes tarjetas registradas. Puedes registrar tu primera tarjeta.');
          return [];
        }
        
        toast.warn(result.message || '⚠️ No se pudieron cargar las tarjetas');
        return [];
      }
    } catch (error) {
      // console.error removed for production
      toast.error('❌ Error al cargar tarjetas');
      return [];
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA ELIMINAR TARJETAS
  const handleDeleteCard = async (userId, aliasToken) => {
    try {
      
      
      // ✅ VALIDAR USUARIO
      if (!user?._id) {
        toast.error('❌ Error: Usuario no válido');
        return { success: false, message: 'Usuario no válido' };
      }

      const targetUserId = user.bancardUserId || user._id;
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/tarjetas/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // ✅ IMPORTANTE PARA iOS
        },
        credentials: 'include',
        body: JSON.stringify({ alias_token: aliasToken })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('✅ Tarjeta eliminada exitosamente');
        return result;
      } else {
        // console.error removed for production
        toast.error(result.message || '❌ Error al eliminar tarjeta');
        return { success: false, message: result.message };
      }
    } catch (error) {
      // console.error removed for production
      toast.error('❌ Error de conexión');
      return { success: false, message: 'Error de conexión' };
    }
  };

  // ✅ RESTO DE FUNCIONES SIN CAMBIOS PERO CON MEJOR MANEJO DE ERRORES
  const handleUpdateProfile = async (profileData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/perfil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('✅ Perfil actualizado exitosamente');
        
        // ✅ ACTUALIZAR REDUX CON NUEVOS DATOS
        dispatch(setUserDetails({ ...user, ...profileData }));
      } else {
        toast.error(result.message || '❌ Error al actualizar perfil');
      }
    } catch (error) {
      // console.error removed for production
      toast.error('❌ Error de conexión');
    }
  };

  const handleUploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/perfil/imagen`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('✅ Imagen subida exitosamente');
        
        // ✅ ACTUALIZAR REDUX
        dispatch(setUserDetails({ ...user, profilePic: result.data.profilePic }));
        
        return result.data.profilePic;
      } else {
        toast.error(result.message || '❌ Error al subir imagen');
        throw new Error(result.message);
      }
    } catch (error) {
      // console.error removed for production
      throw error;
    }
  };

  const handleChangePassword = async (passwordData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/perfil/cambiar-contrasena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('✅ Contraseña cambiada exitosamente');
      } else {
        toast.error(result.message || '❌ Error al cambiar contraseña');
        throw new Error(result.message);
      }
    } catch (error) {
      // console.error removed for production
      throw error;
    }
  };

  const handleUpdateSettings = async (settings) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem(`user_settings_${user._id}`, JSON.stringify(settings));
      toast.success('✅ Configuración guardada');
    } catch (error) {
      // console.error removed for production
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(SummaryApi.logout_user.url, {
        method: SummaryApi.logout_user.method,
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('👋 Sesión cerrada');
        dispatch(setUserDetails(null)); // ✅ LIMPIAR REDUX
        navigate('/');
      }
    } catch (error) {
      // console.error removed for production
      toast.error('❌ Error al cerrar sesión');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: FaUser },
    { id: 'cards', label: 'Mis Tarjetas', icon: FaCreditCard },
    { id: 'balance', label: 'Mi Saldo', icon: FaWallet },
    { id: 'purchases', label: 'Mis Compras', icon: BiSolidPurchaseTag },
    { id: 'favorites', label: 'Favoritos', icon: FaHeart },
    { id: 'settings', label: 'Configuración', icon: FaCog }
  ];

  // ✅ PANTALLA DE CARGA MIENTRAS SE VERIFICAN DATOS
  if (loading || !userDataReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-[#2A3190] mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Cargando tu perfil...</p>
          {loading && (
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-blue-600 hover:underline"
            >
              Si tarda mucho, haz clic aquí para recargar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ VERIFICACIÓN SIMPLE IGUAL QUE ADMIN PANEL
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Debes iniciar sesión para acceder a tu perfil</p>
          <button 
            onClick={() => navigate('/iniciar-sesion')}
            className="bg-[#2A3190] text-white px-4 py-2 rounded-lg"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      
      {/* Header de navegación */}
      <div className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            
            {/* Logo/Título */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-[#2A3190] transition-colors"
              >
                <FaHome className="text-lg" />
                <span className="font-medium">Zenn Electronicos</span>
              </button>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-bold text-[#2A3190]">Mi Cuenta</h1>
            </div>

            {/* Usuario y logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                {/* Mostrar saldo debajo del nombre */}
                <BalanceDisplay 
                  className="mt-1"
                  showLoadButton={false}
                />
                {user.bancardUserId && (
                  <p className="text-xs text-blue-600">ID Bancard: {user.bancardUserId}</p>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <FaSignOutAlt className="text-sm" />
                <span className="hidden md:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="flex space-x-1 overflow-x-auto pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    const newUrl = `/mi-perfil?tab=${tab.id}`;
                    window.history.pushState(null, '', newUrl);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#2A3190] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="text-sm" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'profile' && (
          <UserProfile
            user={user} // ✅ USAR USER DIRECTO DESDE REDUX (IGUAL QUE ADMIN PANEL)
            onUpdateProfile={handleUpdateProfile}
            onUploadImage={handleUploadImage}
          />
        )}

        {activeTab === 'cards' && (
          <CardManagementPage
            user={user} // ✅ PASAR USER COMPLETO, NO OBJETO RECONSTRUIDO
            onRegisterCard={handleRegisterCard}
            onDeleteCard={handleDeleteCard}
            onFetchCards={handleFetchCards}
          />
        )}

        {activeTab === 'balance' && (
          <BalanceManagement
            user={user} // ✅ PASAR USER COMPLETO
          />
        )}

        {activeTab === 'purchases' && (
          <UserPurchases
            user={user} // ✅ PASAR USER COMPLETO, NO OBJETO RECONSTRUIDO
          />
        )}
        
        {activeTab === 'favorites' && (
          <FavoritesPage
            user={user} // ✅ USER DIRECTO
            onNavigate={navigate}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            user={user} // ✅ USER DIRECTO
            onChangePassword={handleChangePassword}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </div>

      {/* Footer informativo */}
      <div className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">🔒 Seguridad</h3>
              <p className="text-sm text-gray-600">
                Tus datos están protegidos con encriptación de nivel bancario
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">💳 Pagos Seguros</h3>
              <p className="text-sm text-gray-600">
                Procesos certificados por Bancard, la plataforma más confiable de Paraguay
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">📞 Soporte 24/7</h3>
              <p className="text-sm text-gray-600">
                Estamos aquí para ayudarte en cualquier momento
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
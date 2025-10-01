import React, { useState } from 'react';
import { 
  FaCog, 
  FaLock, 
  FaBell, 
  FaShield, 
  FaEye, 
  FaEyeSlash,
  FaSave,
  FaCheck
} from 'react-icons/fa';

const SettingsPage = ({ user, onChangePassword, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState('password');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    twoFactorAuth: false
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSettingsChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    setLoading(true);
    try {
      await onChangePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setSuccess('Contraseña cambiada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setErrors({ submit: 'Error al cambiar contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSettings = async () => {
    setLoading(true);
    try {
      await onUpdateSettings(settings);
      setSuccess('Configuración guardada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setErrors({ submit: 'Error al guardar configuración' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'password', label: 'Cambiar Contraseña', icon: FaLock },
    { id: 'notifications', label: 'Notificaciones', icon: FaBell },
    { id: 'security', label: 'Seguridad', icon: FaShield }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
            <FaCog className="text-xl" />
            Configuración
          </h1>
          <p className="text-gray-600 mt-1">Gestiona tu cuenta y preferencias</p>
        </div>

        {/* Mensajes de éxito/error */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-800">
              <FaCheck />
              <span>{success}</span>
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <span>❌ {errors.submit}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar de tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#2A3190] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="text-sm" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6">
              
              {/* Tab: Cambiar Contraseña */}
              {activeTab === 'password' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Cambiar Contraseña</h2>
                  
                  <form onSubmit={handleSubmitPassword} className="space-y-4">
                    {/* Contraseña actual */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Contraseña Actual *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190] pr-10 ${
                            errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Tu contraseña actual"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {errors.currentPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
                      )}
                    </div>

                    {/* Nueva contraseña */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Nueva Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190] pr-10 ${
                            errors.newPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Tu nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                      )}
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Confirmar Nueva Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190] pr-10 ${
                            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Confirma tu nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#2A3190] text-white px-6 py-2 rounded-lg hover:bg-[#1e236b] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <FaSave className="text-sm" />
                      {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab: Notificaciones */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Preferencias de Notificaciones</h2>
                  
                  <div className="space-y-4">
                    {/* Email notifications */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">Notificaciones por Email</h3>
                        <p className="text-sm text-gray-600">Recibe actualizaciones sobre tus pedidos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={() => handleSettingsChange('emailNotifications')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2A3190]"></div>
                      </label>
                    </div>

                    {/* Push notifications */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">Notificaciones Push</h3>
                        <p className="text-sm text-gray-600">Notificaciones en tiempo real en tu navegador</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.pushNotifications}
                          onChange={() => handleSettingsChange('pushNotifications')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2A3190]"></div>
                      </label>
                    </div>

                    {/* Marketing emails */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">Emails de Marketing</h3>
                        <p className="text-sm text-gray-600">Ofertas especiales y promociones</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.marketingEmails}
                          onChange={() => handleSettingsChange('marketingEmails')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2A3190]"></div>
                      </label>
                    </div>

                    <button
                      onClick={handleSubmitSettings}
                      disabled={loading}
                      className="bg-[#2A3190] text-white px-6 py-2 rounded-lg hover:bg-[#1e236b] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <FaSave className="text-sm" />
                      {loading ? 'Guardando...' : 'Guardar Preferencias'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: Seguridad */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Configuración de Seguridad</h2>
                  
                  <div className="space-y-6">
                    {/* Autenticación de dos factores */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-800">Autenticación de Dos Factores</h3>
                          <p className="text-sm text-gray-600">Agrega una capa extra de seguridad a tu cuenta</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.twoFactorAuth}
                            onChange={() => handleSettingsChange('twoFactorAuth')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2A3190]"></div>
                        </label>
                      </div>
                      {settings.twoFactorAuth && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            📱 La autenticación de dos factores está activada. 
                            Necesitarás tu dispositivo móvil para iniciar sesión.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Información de sesión */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-3">Información de Sesión</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Último acceso:</span>
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dispositivo:</span>
                          <span>Navegador web</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IP:</span>
                          <span>192.168.1.1</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de seguridad */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-3">Acciones de Seguridad</h3>
                      <div className="space-y-3">
                        <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="font-medium text-gray-800">Descargar Datos de Cuenta</div>
                          <div className="text-sm text-gray-600">Obtén una copia de todos tus datos</div>
                        </button>
                        
                        <button className="w-full text-left p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          <div className="font-medium text-red-800">Cerrar Todas las Sesiones</div>
                          <div className="text-sm text-red-600">Cierra sesión en todos los dispositivos</div>
                        </button>
                        
                        <button className="w-full text-left p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          <div className="font-medium text-red-800">Eliminar Cuenta</div>
                          <div className="text-sm text-red-600">Elimina permanentemente tu cuenta</div>
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitSettings}
                      disabled={loading}
                      className="bg-[#2A3190] text-white px-6 py-2 rounded-lg hover:bg-[#1e236b] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <FaSave className="text-sm" />
                      {loading ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">🔒</span>
              </div>
              <div>
                <h3 className="font-medium text-blue-800 mb-1">Tu Seguridad es Importante</h3>
                <p className="text-blue-700 text-sm">
                  Mantén tu cuenta segura usando una contraseña fuerte y activando la autenticación de dos factores.
                  Nunca compartas tu información de acceso con terceros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
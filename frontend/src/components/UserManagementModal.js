// frontend/src/components/UserManagementModal.js - MODAL COMPLETO PARA GESTIÓN DE USUARIOS
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { 
  FaUser, 
  FaKey, 
  FaTrash, 
  FaSave, 
  FaTimes, 
  FaEye, 
  FaEyeSlash,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import SummaryApi from '../common';

const UserManagementModal = ({ user, onClose, onUserUpdated, onUserDeleted }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  const [userData, setUserData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'USER'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  const tabs = [
    { id: 'info', label: 'Información', icon: <FaUser className="w-4 h-4" /> },
    { id: 'password', label: 'Contraseña', icon: <FaKey className="w-4 h-4" /> },
    { id: 'danger', label: 'Zona Peligrosa', icon: <FaExclamationTriangle className="w-4 h-4" /> }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores de validación
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores de validación
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateUserData = () => {
    const errors = {};

    if (!userData.name.trim()) errors.name = 'El nombre es requerido';
    if (!userData.email.trim()) errors.email = 'El email es requerido';
    if (!userData.phone.trim()) errors.phone = 'El teléfono es requerido';
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userData.email && !emailRegex.test(userData.email)) {
      errors.email = 'El email no es válido';
    }

    // Validar teléfono
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (userData.phone && !phoneRegex.test(userData.phone)) {
      errors.phone = 'El teléfono no es válido';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordData = () => {
    const errors = {};

    if (!passwordData.currentPassword) errors.currentPassword = 'La contraseña actual es requerida';
    if (!passwordData.newPassword) errors.newPassword = 'La nueva contraseña es requerida';
    if (passwordData.newPassword.length < 6) errors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!validateUserData()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/user/update-user/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Usuario actualizado exitosamente');
        setIsEditing(false);
        onUserUpdated && onUserUpdated(result.data);
      } else {
        toast.error(result.message || 'Error al actualizar el usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordData()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/user/change-password/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Contraseña cambiada exitosamente');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordFields(false);
      } else {
        toast.error(result.message || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/user/delete-user/${user._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Usuario eliminado exitosamente');
        onUserDeleted && onUserDeleted(user._id);
        onClose();
      } else {
        toast.error(result.message || 'Error al eliminar el usuario');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const InputField = ({ label, name, type = "text", required = false, placeholder = "", value, onChange, className = "" }) => (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={!isEditing && activeTab !== 'password'}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          validationErrors[name] ? 'border-red-500' : 'border-gray-300'
        } ${(!isEditing && activeTab !== 'password') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {validationErrors[name] && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <FaExclamationTriangle className="w-3 h-3 mr-1" />
          {validationErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuario</h2>
              <p className="text-gray-600 mt-1">Administrar información y configuraciones del usuario</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl p-2 hover:bg-gray-100 rounded-lg"
            >
              <FaTimes />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Información */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Información del Usuario</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <FaCheckCircle className="w-4 h-4 mr-2" />
                        Guardar Cambios
                      </>
                    ) : (
                      <>
                        <FaUser className="w-4 h-4 mr-2" />
                        Editar Información
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Nombre Completo"
                    name="name"
                    required
                    placeholder="Nombre del usuario"
                    value={userData.name}
                    onChange={handleInputChange}
                  />
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    required
                    placeholder="email@ejemplo.com"
                    value={userData.email}
                    onChange={handleInputChange}
                  />
                  <InputField
                    label="Teléfono"
                    name="phone"
                    required
                    placeholder="+595 123 456 789"
                    value={userData.phone}
                    onChange={handleInputChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      name="role"
                      value={userData.role}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpdateUser}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <FaSave className="w-4 h-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Contraseña */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h3>
                  <button
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {showPasswordFields ? <FaEyeSlash className="w-4 h-4 mr-2" /> : <FaEye className="w-4 h-4 mr-2" />}
                    {showPasswordFields ? 'Ocultar Campos' : 'Mostrar Campos'}
                  </button>
                </div>

                {showPasswordFields && (
                  <div className="space-y-4">
                    <InputField
                      label="Contraseña Actual"
                      name="currentPassword"
                      type="password"
                      required
                      placeholder="Contraseña actual"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                    />
                    <InputField
                      label="Nueva Contraseña"
                      name="newPassword"
                      type="password"
                      required
                      placeholder="Nueva contraseña"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />
                    <InputField
                      label="Confirmar Nueva Contraseña"
                      name="confirmPassword"
                      type="password"
                      required
                      placeholder="Confirmar nueva contraseña"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                    />

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">Requisitos de la Contraseña</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Mínimo 6 caracteres</li>
                        <li>• La nueva contraseña debe ser diferente a la actual</li>
                        <li>• Se recomienda usar una combinación de letras, números y símbolos</li>
                      </ul>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        onClick={() => {
                          setShowPasswordFields(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Cambiando...
                          </>
                        ) : (
                          <>
                            <FaKey className="w-4 h-4 mr-2" />
                            Cambiar Contraseña
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Zona Peligrosa */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                    <FaExclamationTriangle className="w-5 h-5 mr-2" />
                    Zona Peligrosa
                  </h3>
                  <p className="text-red-700 mb-4">
                    Las acciones en esta sección son irreversibles. Por favor, procede con precaución.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-red-300">
                      <h4 className="font-medium text-red-900 mb-2">Eliminar Usuario</h4>
                      <p className="text-sm text-red-700 mb-3">
                        Esta acción eliminará permanentemente el usuario y todos sus datos asociados.
                      </p>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <FaTrash className="w-4 h-4 mr-2" />
                        Eliminar Usuario
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirmación de eliminación */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <div className="p-3 bg-red-100 rounded-full">
                            <FaExclamationTriangle className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                            <p className="text-gray-600">Esta acción no se puede deshacer</p>
                          </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                          <p className="text-red-700 text-sm">
                            ¿Estás seguro de que deseas eliminar al usuario <strong>{user.name}</strong>? 
                            Esta acción eliminará permanentemente:
                          </p>
                          <ul className="text-red-700 text-sm mt-2 ml-4 space-y-1">
                            <li>• Perfil del usuario</li>
                            <li>• Historial de compras</li>
                            <li>• Datos de contacto</li>
                            <li>• Configuraciones personales</li>
                          </ul>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteUser}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Eliminando...
                              </>
                            ) : (
                              <>
                                <FaTrash className="w-4 h-4 mr-2" />
                                Eliminar Usuario
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;

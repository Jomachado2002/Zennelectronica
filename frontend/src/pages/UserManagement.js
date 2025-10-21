// frontend/src/pages/UserManagement.js - GESTIÓN AVANZADA DE USUARIOS Y PERMISOS
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { 
  FaUsers, 
  FaUserCog, 
  FaKey, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaEye, 
  FaEyeSlash,
  FaShieldAlt,
  FaUserPlus,
  FaSearch,
  FaFilter,
  FaCheck,
  FaTimes as FaClose,
  FaCrown,
  FaUserTie,
  FaUser,
  FaLock,
  FaUnlock
} from 'react-icons/fa';
import SummaryApi from '../common';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentUserPermissions, setCurrentUserPermissions] = useState(null);

  // Estados para crear/editar usuario
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'GENERAL',
    permissions: {}
  });

  // Permisos por defecto según rol
  const defaultPermissions = {
    ROOT: {
      adminPanel: true,
      products: { view: true, create: true, edit: true, delete: true, upload: true },
      categories: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, sync: true, update: true, import: true },
      users: { view: true, create: true, edit: true, delete: true },
      finances: { view: true, create: true, edit: true, reports: true },
      sales: { view: true, create: true, edit: true, delete: true },
      purchases: { view: true, create: true, edit: true, delete: true },
      clients: { view: true, create: true, edit: true, delete: true },
      suppliers: { view: true, create: true, edit: true, delete: true },
      budgets: { view: true, create: true, edit: true, delete: true },
      bancard: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, edit: true }
    },
    ADMIN: {
      adminPanel: true,
      products: { view: true, create: false, edit: false, delete: false, upload: false },
      categories: { view: true, create: false, edit: false, delete: false },
      inventory: { view: true, sync: false, update: false, import: false },
      users: { view: true, create: false, edit: false, delete: false },
      finances: { view: true, create: false, edit: false, reports: false },
      sales: { view: true, create: false, edit: false, delete: false },
      purchases: { view: true, create: false, edit: false, delete: false },
      clients: { view: true, create: false, edit: false, delete: false },
      suppliers: { view: true, create: false, edit: false, delete: false },
      budgets: { view: true, create: false, edit: false, delete: false },
      bancard: { view: true, create: false, edit: false, delete: false },
      settings: { view: false, edit: false }
    },
    GENERAL: {
      adminPanel: false,
      products: { view: false, create: false, edit: false, delete: false, upload: false },
      categories: { view: false, create: false, edit: false, delete: false },
      inventory: { view: false, sync: false, update: false, import: false },
      users: { view: false, create: false, edit: false, delete: false },
      finances: { view: false, create: false, edit: false, reports: false },
      sales: { view: false, create: false, edit: false, delete: false },
      purchases: { view: false, create: false, edit: false, delete: false },
      clients: { view: false, create: false, edit: false, delete: false },
      suppliers: { view: false, create: false, edit: false, delete: false },
      budgets: { view: false, create: false, edit: false, delete: false },
      bancard: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, edit: false }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserPermissions();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SummaryApi.baseURL}/api/admin/users-with-permissions`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
      } else {
        toast.error(data.message || 'Error al cargar usuarios');
      }
    } catch (error) {
      // console.error removed for production
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserPermissions = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/permissions/me`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setCurrentUserPermissions(data.data.permissions);
      }
    } catch (error) {
      // console.error removed for production
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setLoading(true);
      
      // Obtener permisos por defecto para el nuevo rol
      const newPermissions = defaultPermissions[newRole];
      
      const response = await fetch(`${SummaryApi.baseURL}/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          permissions: newPermissions
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Rol actualizado a ${newRole}`);
        fetchUsers(); // Recargar usuarios
      } else {
        toast.error(data.message || 'Error al actualizar rol');
      }
    } catch (error) {
      // console.error removed for production
      toast.error('Error al actualizar rol');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (userId, module, action, value) => {
    try {
      const user = users.find(u => u._id === userId);
      if (!user) return;

      const updatedPermissions = { ...user.permissions };
      
      if (typeof updatedPermissions[module] === 'object') {
        updatedPermissions[module] = {
          ...updatedPermissions[module],
          [action]: value
        };
      } else {
        updatedPermissions[module] = value;
      }

      const response = await fetch(`${SummaryApi.baseURL}/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          permissions: updatedPermissions
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Permisos actualizados');
        fetchUsers(); // Recargar usuarios
      } else {
        toast.error(data.message || 'Error al actualizar permisos');
      }
    } catch (error) {
      // console.error removed for production
      toast.error('Error al actualizar permisos');
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      const userData = {
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        permissions: userForm.role === 'ROOT' ? defaultPermissions.ROOT : defaultPermissions[userForm.role]
      };

      const response = await fetch(`${SummaryApi.baseURL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Usuario creado exitosamente');
        setShowCreateModal(false);
        setUserForm({
          name: '',
          email: '',
          password: '',
          role: 'GENERAL',
          permissions: {}
        });
        fetchUsers();
      } else {
        toast.error(data.message || 'Error al crear usuario');
      }
    } catch (error) {
      // console.error removed for production
      toast.error('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ROOT':
        return <FaCrown className="text-yellow-500" />;
      case 'ADMIN':
        return <FaUserTie className="text-blue-500" />;
      case 'GENERAL':
        return <FaUser className="text-gray-500" />;
      default:
        return <FaUser className="text-gray-500" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ROOT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'GENERAL':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canManageUsers = currentUserPermissions?.users?.create || currentUserPermissions?.role === 'ROOT';
  const canEditUsers = currentUserPermissions?.users?.edit || currentUserPermissions?.role === 'ROOT';

  if (!canManageUsers && !canEditUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FaLock className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-500">No tienes permisos para gestionar usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaUserCog className="text-blue-600" />
              Gestión de Usuarios y Permisos
            </h1>
            <p className="text-gray-600 mt-1">Administra roles y permisos de usuarios del sistema</p>
          </div>
          {canManageUsers && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaUserPlus />
              Crear Usuario
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los roles</option>
              <option value="ROOT">ROOT</option>
              <option value="ADMIN">ADMIN</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <FaUser className="text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={!canEditUsers}
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)} ${
                            canEditUsers ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                          }`}
                        >
                          <option value="GENERAL">GENERAL</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="ROOT">ROOT</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {user.permissions?.adminPanel ? 'Admin Panel' : 'Sin acceso admin'}
                        </span>
                        {user.permissions?.adminPanel && (
                          <span className="text-xs text-green-600">✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPermissionsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <FaKey />
                          Permisos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Permisos */}
      {showPermissionsModal && selectedUser && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
          onPermissionChange={handlePermissionChange}
          defaultPermissions={defaultPermissions}
          canEdit={canEditUsers}
        />
      )}

      {/* Modal de Crear Usuario */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          userForm={userForm}
          setUserForm={setUserForm}
          loading={loading}
        />
      )}
    </div>
  );
};

// Componente Modal de Permisos
const PermissionsModal = ({ user, onClose, onPermissionChange, defaultPermissions, canEdit }) => {
  const [permissions, setPermissions] = useState(user.permissions || {});

  useEffect(() => {
    setPermissions(user.permissions || {});
  }, [user]);

  const handlePermissionToggle = (module, action, value) => {
    const newPermissions = { ...permissions };
    
    if (typeof newPermissions[module] === 'object') {
      newPermissions[module] = {
        ...newPermissions[module],
        [action]: value
      };
    } else {
      newPermissions[module] = value;
    }
    
    setPermissions(newPermissions);
    onPermissionChange(user._id, module, action, value);
  };

  const modules = [
    { key: 'adminPanel', label: 'Panel de Administración', type: 'boolean' },
    { key: 'products', label: 'Productos', type: 'object', actions: ['view', 'create', 'edit', 'delete', 'upload'] },
    { key: 'categories', label: 'Categorías', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'inventory', label: 'Inventario', type: 'object', actions: ['view', 'sync', 'update', 'import'] },
    { key: 'users', label: 'Usuarios', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'finances', label: 'Finanzas', type: 'object', actions: ['view', 'create', 'edit', 'reports'] },
    { key: 'sales', label: 'Ventas', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'purchases', label: 'Compras', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'clients', label: 'Clientes', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'suppliers', label: 'Proveedores', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'budgets', label: 'Presupuestos', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'bancard', label: 'Bancard', type: 'object', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'settings', label: 'Configuración', type: 'object', actions: ['view', 'edit'] }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Permisos de {user.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaClose className="text-xl" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => (
              <div key={module.key} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">{module.label}</h3>
                
                {module.type === 'boolean' ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions[module.key] || false}
                      onChange={(e) => handlePermissionToggle(module.key, null, e.target.checked)}
                      disabled={!canEdit}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Habilitado</span>
                  </label>
                ) : (
                  <div className="space-y-2">
                    {module.actions.map((action) => (
                      <label key={action} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions[module.key]?.[action] || false}
                          onChange={(e) => handlePermissionToggle(module.key, action, e.target.checked)}
                          disabled={!canEdit}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">{action}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Crear Usuario
const CreateUserModal = ({ onClose, onSubmit, userForm, setUserForm, loading }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Usuario</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaClose className="text-xl" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="GENERAL">GENERAL</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ROOT">ROOT</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;

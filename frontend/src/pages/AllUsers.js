// frontend/src/pages/AllUsers.js - MEJORADO CON INFORMACIÓN COMPLETA DE USUARIOS
import React, { useEffect, useState } from 'react';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaCreditCard, 
  FaShoppingCart, 
  FaCalendarAlt, 
  FaEye, 
  FaSearch, 
  FaFilter, 
  FaDownload, 
  FaChartLine,
  FaMobile,
  FaDesktop,
  FaGlobe,
  FaEdit,
  FaMoneyBillWave
} from 'react-icons/fa'
import { CiEdit } from 'react-icons/ci';
import moment from 'moment';
import ChangeUserRole from '../components/ChangeUserRole';
import UserManagementModal from '../components/UserManagementModal';
import displayPYGCurrency from '../helpers/displayCurrency';
import * as XLSX from 'xlsx';

const AllUsers = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [openUpdateRole, setOpenUpdateRole] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [userForManagement, setUserForManagement] = useState(null);
  const [updateUserDetails, setUpdateUserDetails] = useState({
    email: "",
    name: "",
    role: "",
    _id: ""
  });

  // Filtros y búsqueda
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    hasPhone: '',
    hasCard: '',
    lastLogin: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [userStats, setUserStats] = useState({
    total: 0,
    admins: 0,
    users: 0,
    withPhone: 0,
    withCard: 0,
    recentActivity: 0
  });

  const fetchAllUsers = async () => {
    try {
      const fetchData = await fetch(SummaryApi.allUser.url, {
            method: SummaryApi.allUser.method,
        credentials: 'include'
      });

      const dataResponse = await fetchData.json();

      if (dataResponse.success) {
        setAllUsers(dataResponse.data);
        
        // Calcular estadísticas
        const stats = calculateUserStats(dataResponse.data);
        setUserStats(stats);
      }
      if (dataResponse.error) {
        toast.error(dataResponse.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  const calculateUserStats = (users) => {
    const now = moment();
    const lastWeek = now.clone().subtract(7, 'days');

    return {
      total: users.length,
      admins: users.filter(u => u.role === 'ADMIN').length,
      users: users.filter(u => u.role === 'USER').length,
      withPhone: users.filter(u => u.phone).length,
      withCard: users.filter(u => u.hasBancardCard).length,
      recentActivity: users.filter(u => moment(u.lastLogin).isAfter(lastWeek)).length
    };
  };

  const applyFilters = () => {
    let filtered = [...allUsers];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        (user.name?.toLowerCase() || '').includes(searchLower) ||
        (user.email?.toLowerCase() || '').includes(searchLower) ||
        (user.phone?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Filtro de rol
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Filtro de teléfono
    if (filters.hasPhone === 'yes') {
      filtered = filtered.filter(user => user.phone);
    } else if (filters.hasPhone === 'no') {
      filtered = filtered.filter(user => !user.phone);
    }

    // Filtro de tarjeta
    if (filters.hasCard === 'yes') {
      filtered = filtered.filter(user => user.hasBancardCard);
    } else if (filters.hasCard === 'no') {
      filtered = filtered.filter(user => !user.hasBancardCard);
    }

    // Filtro de última actividad
    if (filters.lastLogin) {
      const now = moment();
      filtered = filtered.filter(user => {
        const lastLogin = moment(user.lastLogin);
        switch (filters.lastLogin) {
          case 'today':
            return lastLogin.isSame(now, 'day');
          case 'week':
            return lastLogin.isAfter(now.clone().subtract(7, 'days'));
          case 'month':
            return lastLogin.isAfter(now.clone().subtract(30, 'days'));
          case 'never':
            return !user.lastLogin;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    fetchAllUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilters();
  }, [allUsers, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: '',
      hasPhone: '',
      hasCard: '',
      lastLogin: ''
    });
  };

  const exportToExcel = () => {
    const excelData = filteredUsers.map(user => ({
      'Nombre': user.name || '',
      'Email': user.email || '',
      'Teléfono': user.phone || '',
      'Rol': user.role || '',
      'Ubicación': user.location || '',
      'Tiene Tarjeta': user.hasBancardCard ? 'Sí' : 'No',
      'Último Login': user.lastLogin ? moment(user.lastLogin).format('DD/MM/YYYY HH:mm') : 'Nunca',
      'Fecha de Registro': moment(user.createdAt).format('DD/MM/YYYY HH:mm'),
      'Total Compras': user.totalPurchases || 0,
      'Monto Total': user.totalSpent || 0,
      'Dispositivo': user.deviceType || 'Desconocido'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 25 }, // Nombre
      { wch: 30 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 10 }, // Rol
      { wch: 20 }, // Ubicación
      { wch: 12 }, // Tiene Tarjeta
      { wch: 20 }, // Último Login
      { wch: 20 }, // Fecha de Registro
      { wch: 12 }, // Total Compras
      { wch: 15 }, // Monto Total
      { wch: 15 }  // Dispositivo
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, `Usuarios_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Datos exportados a Excel");
  };

  const handleEditUser = (user) => {
    setUpdateUserDetails({
      email: user.email,
      name: user.name,
      role: user.role,
      _id: user._id
    });
    setOpenUpdateRole(true);
  };

  const handleViewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleManageUser = (user) => {
    setUserForManagement(user);
    setShowUserManagement(true);
  };

  const handleUserUpdated = (updatedUser) => {
    setAllUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
    setFilteredUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
    setShowUserManagement(false);
  };

  const handleUserDeleted = (deletedUserId) => {
    setAllUsers(prev => prev.filter(u => u._id !== deletedUserId));
    setFilteredUsers(prev => prev.filter(u => u._id !== deletedUserId));
    setShowUserManagement(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'USER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <FaMobile className="w-4 h-4 text-blue-600" />;
      case 'desktop':
        return <FaDesktop className="w-4 h-4 text-green-600" />;
      default:
        return <FaGlobe className="w-4 h-4 text-gray-600" />;
    }
  };

    return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center text-gray-900">
          <FaUser className="mr-3 text-blue-600" />
          Gestión de Usuarios
        </h1>
        <p className="text-gray-600 mt-1">
          Administrar usuarios del sistema con información completa
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaUser className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{userStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-50 rounded-lg">
              <FaUser className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-xl font-bold text-gray-900">{userStats.admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <FaUser className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Usuarios</p>
              <p className="text-xl font-bold text-gray-900">{userStats.users}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FaPhone className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Con Teléfono</p>
              <p className="text-xl font-bold text-gray-900">{userStats.withPhone}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <FaCreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Con Tarjeta</p>
              <p className="text-xl font-bold text-gray-900">{userStats.withCard}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FaChartLine className="w-5 h-5 text-teal-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-xl font-bold text-gray-900">{userStats.recentActivity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FaFilter className="mr-2 text-gray-600" />
            Filtros y Búsqueda
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
            >
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
            >
              Limpiar
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 text-sm flex items-center"
            >
              <FaDownload className="mr-1" />
              Excel
            </button>
          </div>
        </div>

        {/* Búsqueda principal */}
        <div className="mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar por nombre, email o teléfono..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="USER">Usuario</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <select
                name="hasPhone"
                value={filters.hasPhone}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="yes">Con teléfono</option>
                <option value="no">Sin teléfono</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarjeta Bancard</label>
              <select
                name="hasCard"
                value={filters.hasCard}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="yes">Con tarjeta</option>
                <option value="no">Sin tarjeta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Última Actividad</label>
              <select
                name="lastLogin"
                value={filters.lastLogin}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="never">Nunca</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actividad
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user, index) => (
                <tr key={user._id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.profilePic ? (
                            <img src={user.profilePic} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <FaUser className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user._id?.slice(-8) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <FaEnvelope className="w-3 h-3 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center">
                          <FaPhone className="w-3 h-3 mr-2 text-gray-400" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role || 'USER'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      {user.location && typeof user.location === 'string' && (
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="w-3 h-3 mr-1 text-gray-400" />
                          <span className="text-xs">{user.location}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        {user.hasBancardCard ? (
                          <FaCreditCard className="w-3 h-3 mr-1 text-green-500" />
                        ) : (
                          <FaCreditCard className="w-3 h-3 mr-1 text-gray-400" />
                        )}
                        <span className="text-xs">
                          {user.hasBancardCard ? 'Tarjeta registrada' : 'Sin tarjeta'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {getDeviceIcon(user.deviceType)}
                        <span className="text-xs ml-1 capitalize">{user.deviceType || 'Desconocido'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div className="flex items-center">
                        <FaCalendarAlt className="w-3 h-3 mr-1" />
                        {user.lastLogin ? moment(user.lastLogin).format('DD/MM/YYYY') : 'Nunca'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Registro: {moment(user.createdAt).format('DD/MM/YYYY')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleViewUserDetails(user)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50"
                        title="Ver detalles"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleManageUser(user)}
                        className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                        title="Gestionar usuario"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-purple-600 hover:text-purple-900 p-2 rounded-lg hover:bg-purple-50"
                        title="Cambiar rol"
                      >
                        <CiEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                        </tr>
              ))}
            </tbody>
        </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <FaUser className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
          </p>
        </div>
      )}

      {/* Modales */}
      {openUpdateRole && (
        <ChangeUserRole 
          onClose={() => setOpenUpdateRole(false)} 
          name={updateUserDetails.name}
          email={updateUserDetails.email}
          role={updateUserDetails.role}
          userId={updateUserDetails._id} 
          callFunc={fetchAllUsers}
        />
      )}

      {showUserManagement && userForManagement && (
        <UserManagementModal
          user={userForManagement}
          onClose={() => {
            setShowUserManagement(false);
            setUserForManagement(null);
          }}
          onUserUpdated={handleUserUpdated}
          onUserDeleted={handleUserDeleted}
        />
      )}

      {/* Modal de detalles del usuario */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Detalles del Usuario</h2>
              <button 
                className="text-3xl text-gray-600 hover:text-black" 
                onClick={() => setShowUserDetails(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre</label>
                      <p className="text-sm text-gray-900">{selectedUser.name || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <p className="text-sm text-gray-900">{selectedUser.phone || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rol</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role || 'USER'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Información Adicional</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                      <p className="text-sm text-gray-900">
                        {selectedUser.location && typeof selectedUser.location === 'string' 
                          ? selectedUser.location 
                          : 'No especificada'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tarjeta Bancard</label>
                      <p className="text-sm text-gray-900">
                        {selectedUser.hasBancardCard ? 'Registrada' : 'No registrada'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dispositivo</label>
                      <div className="flex items-center">
                        {getDeviceIcon(selectedUser.deviceType)}
                        <span className="text-sm text-gray-900 ml-2 capitalize">
                          {selectedUser.deviceType || 'Desconocido'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                      <p className="text-sm text-gray-900">
                        {moment(selectedUser.createdAt).format('DD/MM/YYYY HH:mm')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Último Login</label>
                      <p className="text-sm text-gray-900">
                        {selectedUser.lastLogin ? 
                          moment(selectedUser.lastLogin).format('DD/MM/YYYY HH:mm') : 
                          'Nunca ha iniciado sesión'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas de actividad */}
              {(selectedUser.totalPurchases || selectedUser.totalSpent) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas de Actividad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <FaShoppingCart className="w-5 h-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total Compras</p>
                          <p className="text-lg font-bold text-gray-900">{selectedUser.totalPurchases || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <FaMoneyBillWave className="w-5 h-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Monto Total</p>
                          <p className="text-lg font-bold text-gray-900">
                            {displayPYGCurrency(selectedUser.totalSpent || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowUserDetails(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleEditUser(selectedUser);
                  setShowUserDetails(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Editar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsers;
// frontend/src/pages/AdminPanel.js - MEJORADO CON INTERFAZ OPTIMIZADA
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CiUser } from 'react-icons/ci';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import ROLE from '../common/role';
import { 
  FaBars, 
  FaTimes, 
  FaUsers, 
  FaBoxOpen, 
  FaChartPie, 
  FaUserFriends, 
  FaFileInvoiceDollar, 
  FaSignOutAlt, 
  FaTruck, 
  FaMoneyBillWave, 
  FaShoppingCart,
  FaTachometerAlt,
  FaCreditCard,
  FaFolder,
  FaBell,
  FaSearch,
  FaExpand,
  FaCompress,
  FaDollarSign,
  FaBuilding
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import { useDispatch } from 'react-redux';
import { setUserDetails } from '../store/userSlice';

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user] = useState(useSelector(state => state.user?.user));

  // Detectar si es móvil y ajustar sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const userRole = user?.role;
    if (userRole !== ROLE.ADMIN) {
      toast.error("Acceso denegado");
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      const response = await fetch(SummaryApi.signOut.url, {
        method: SummaryApi.signOut.method,
        credentials: 'include'
      });
      
      const result = await response.json();
      if (result.success) {
        dispatch(setUserDetails(null));
        navigate("/");
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      dispatch(setUserDetails(null));
      navigate("/");
    }
  };

  const navItems = [
    {
      path: "dashboard",
      label: "Dashboard",
      icon: <FaTachometerAlt className="w-5 h-5" />,
      description: "Vista general del sistema",
      color: "text-blue-600 bg-blue-50"
    },
    {
      category: "Gestión de Productos",
      items: [
        {
          path: "productos",
          label: "Productos",
          icon: <FaBoxOpen className="w-5 h-5" />,
          description: "Gestionar productos",
          color: "text-teal-600 bg-teal-50"
        },
        {
          path: "categorias",
          label: "Categorías",
          icon: <FaFolder className="w-5 h-5" />,
          description: "Gestionar categorías y especificaciones",
          color: "text-indigo-600 bg-indigo-50"
        }
      ]
    },
    {
      category: "Gestión Financiera",
      items: [
        {
          path: "clientes",
          label: "Clientes",
          icon: <FaUserFriends className="w-5 h-5" />,
          description: "Gestionar clientes",
          color: "text-purple-600 bg-purple-50"
        },
        {
          path: "proveedores",
          label: "Proveedores",
          icon: <FaTruck className="w-5 h-5" />,
          description: "Gestionar proveedores",
          color: "text-orange-600 bg-orange-50"
        },
        {
          path: "presupuestos",
          label: "Presupuestos",
          icon: <FaFileInvoiceDollar className="w-5 h-5" />,
          description: "Crear y gestionar presupuestos",
          color: "text-indigo-600 bg-indigo-50"
        },
        {
          path: "tipo-cambio",
          label: "Tipo de Cambio",
          icon: <FaDollarSign className="w-5 h-5" />,
          description: "Gestionar tipo de cambio USD/PYG",
          color: "text-green-600 bg-green-50"
        },
        {
          path: "ventas",
          label: "Ventas",
          icon: <FaMoneyBillWave className="w-5 h-5" />,
          description: "Registrar y gestionar ventas",
          color: "text-green-600 bg-green-50"
        },
        {
          path: "nueva-venta",
          label: "Nueva Venta",
          icon: <FaFileInvoiceDollar className="w-5 h-5" />,
          description: "Crear nueva venta con sistema completo",
          color: "text-emerald-600 bg-emerald-50"
        },
        {
          path: "compras",
          label: "Compras",
          icon: <FaShoppingCart className="w-5 h-5" />,
          description: "Registrar y gestionar compras",
          color: "text-red-600 bg-red-50"
        }
      ]
    },
    {
      category: "Configuración de Ventas",
      items: [
        {
          path: "tipos-venta",
          label: "Tipos de Venta",
          icon: <FaFileInvoiceDollar className="w-5 h-5" />,
          description: "Gestionar tipos de venta configurables",
          color: "text-blue-600 bg-blue-50"
        },
        {
          path: "sucursales",
          label: "Sucursales",
          icon: <FaBuilding className="w-5 h-5" />,
          description: "Gestionar sucursales y centros de costo",
          color: "text-indigo-600 bg-indigo-50"
        },
        {
          path: "vendedores",
          label: "Vendedores",
          icon: <FaUserFriends className="w-5 h-5" />,
          description: "Gestionar vendedores y comisiones",
          color: "text-purple-600 bg-purple-50"
        }
      ]
    },
    {
      category: "Pagos Online",
      items: [
        {
          path: "transacciones-bancard",
          label: "Transacciones Bancard",
          icon: <FaCreditCard className="w-5 h-5" />,
          description: "Gestionar pagos online y rollbacks",
          color: "text-cyan-600 bg-cyan-50"
        }
      ]
    },
    {
      category: "Reportes y Análisis",
      items: [
        {
          path: "reportes",
          label: "Reportes Financieros",
          icon: <FaChartPie className="w-5 h-5" />,
          description: "Reportes detallados y métricas",
          color: "text-pink-600 bg-pink-50"
        }
      ]
    },
    {
      path: "todos-usuarios",
      label: "Usuarios",
      icon: <FaUsers className="w-5 h-5" />,
      description: "Gestionar usuarios del sistema",
      color: "text-gray-600 bg-gray-50"
    }
  ];

  const renderNavItem = (item) => {
    const isActive = location.pathname === `/panel-admin/${item.path}`;
    
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={isMobile ? () => setSidebarOpen(false) : undefined}
        className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
          isActive 
            ? `${item.color} shadow-sm` 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        } ${(sidebarCollapsed && !isMobile) ? 'justify-center px-2' : ''}`}
        title={(sidebarCollapsed && !isMobile) ? item.label : ''}
      >
        <span className={`${isActive ? 'text-current' : 'text-gray-400 group-hover:text-gray-600'}`}>
          {item.icon}
        </span>
        {(!sidebarCollapsed || isMobile) && (
          <span className="ml-3 truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  const renderCategory = (category) => (
    <div key={category.category} className="mb-6">
      {(!sidebarCollapsed || isMobile) && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {category.category}
        </h3>
      )}
      <div className="space-y-1">
        {category.items.map(renderNavItem)}
      </div>
    </div>
  );

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullScreenMode(true);
    } else {
      document.exitFullscreen();
      setFullScreenMode(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header mejorado */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <FaTimes className="w-4 h-4" /> : <FaBars className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <FaTachometerAlt className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Panel Administrativo
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Búsqueda global */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <FaSearch className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="bg-transparent text-sm outline-none w-32"
              />
            </div>
            
            {/* Notificaciones */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <FaBell className="w-4 h-4 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            
            {/* Pantalla completa */}
            <button 
              onClick={toggleFullScreen}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={fullScreenMode ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {fullScreenMode ? <FaCompress className="w-4 h-4 text-gray-600" /> : <FaExpand className="w-4 h-4 text-gray-600" />}
            </button>
            
            {/* Información del usuario */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {user?.profilePic ? (
                  <img src={user.profilePic} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <CiUser className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm text-white transition-colors"
            >
              <FaSignOutAlt className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar mejorado */}
        <aside 
          className={`bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? (isMobile ? 'w-64' : sidebarCollapsed ? 'w-16' : 'w-64') : 'w-0 -ml-64'
          } fixed md:static h-full z-30 shadow-lg md:shadow-none overflow-y-auto`}
        >
          {/* Overlay para móvil */}
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-[-1] md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="p-4 flex flex-col h-full">
            {/* Toggle de colapso (solo desktop) */}
            <div className="hidden md:flex justify-end mb-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              >
                <FaBars className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Navegación principal */}
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                if (item.category) {
                  return renderCategory(item);
                }
                return renderNavItem(item);
              })}
            </nav>

            {/* Footer del sidebar */}
            {!sidebarCollapsed && (
              <div className="mt-auto pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  <p>Zenn Electrónica</p>
                  <p>Admin Panel v2.0</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Contenido principal */}
        <main className={`flex-1 overflow-auto transition-all duration-300 ${
          !sidebarOpen ? 'md:ml-0' : ''
        }`}>
          <div className="h-full p-2 md:p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
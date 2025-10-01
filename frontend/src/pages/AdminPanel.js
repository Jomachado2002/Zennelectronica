// frontend/src/pages/AdminPanel.js - ACTUALIZADO CON TRANSACCIONES BANCARD
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
  FaChartLine, 
  FaCalculator, 
  FaFileAlt, 
  FaPlus, 
  FaMoneyBillWave, 
  FaShoppingCart,
  FaTachometerAlt,
  FaHome,
  FaCreditCard, // ✅ NUEVO ICONO PARA BANCARD
  FaUndo // ✅ ICONO PARA ROLLBACKS
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import { useDispatch } from 'react-redux';
import { setUserDetails } from '../store/userSlice';

const AdminPanel = () => {
  const user = useSelector(state => state?.user?.user);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Verificar que el usuario tenga rol de administrador
  useEffect(() => {
    if (!user || user?.role !== ROLE.ADMIN) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      const fetchData = await fetch(SummaryApi.logout_user.url, {
        method: SummaryApi.logout_user.method,
        credentials: 'include'
      });

      const data = await fetchData.json();

      if (data.success) {
        toast.success(data.message);
        dispatch(setUserDetails(null));
        navigate("/");
      } else {
        toast.error(data.message || "Error al cerrar sesión");
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast.error("Error de conexión");
    }
  };

  // Comprobar qué ruta está activa
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  // ✅ MENÚ ACTUALIZADO CON TRANSACCIONES BANCARD
  const navItems = [
    {
      path: "dashboard",
      label: "Dashboard",
      icon: <FaTachometerAlt className="mr-2" />,
      description: "Vista general del sistema"
    },
    {
      category: "Gestión de Productos",
      items: [
        {
          path: "todos-productos",
          label: "Productos",
          icon: <FaBoxOpen className="mr-2" />,
          description: "Gestionar productos"
        }
      ]
    },
    {
      category: "Gestión Financiera",
      items: [
        {
          path: "clientes",
          label: "Clientes",
          icon: <FaUserFriends className="mr-2" />,
          description: "Gestionar clientes"
        },
        {
          path: "proveedores",
          label: "Proveedores",
          icon: <FaTruck className="mr-2" />,
          description: "Gestionar proveedores"
        },
        {
          path: "presupuestos",
          label: "Presupuestos",
          icon: <FaFileInvoiceDollar className="mr-2" />,
          description: "Crear y gestionar presupuestos"
        },
        {
          path: "ventas",
          label: "Ventas",
          icon: <FaMoneyBillWave className="mr-2" />,
          description: "Registrar y gestionar ventas"
        },
        {
          path: "compras",
          label: "Compras",
          icon: <FaShoppingCart className="mr-2" />,
          description: "Registrar y gestionar compras"
        }
      ]
    },
    {
      category: "Pagos Online", // ✅ NUEVA CATEGORÍA
      items: [
        {
          path: "transacciones-bancard",
          label: "Transacciones Bancard",
          icon: <FaCreditCard className="mr-2" />,
          description: "Gestionar pagos online y rollbacks"
        }
      ]
    },
    {
      category: "Reportes y Análisis",
      items: [
        {
          path: "analisis-rentabilidad",
          label: "Análisis Rentabilidad",
          icon: <FaChartLine className="mr-2" />,
          description: "Analizar rentabilidad por proveedor"
        },
        {
          path: "reportes",
          label: "Reportes Financieros",
          icon: <FaChartPie className="mr-2" />,
          description: "Reportes detallados y métricas"
        }
      ]
    },
    {
      path: "todos-usuarios",
      label: "Usuarios",
      icon: <FaUsers className="mr-2" />,
      description: "Gestionar usuarios del sistema"
    }
  ];

  const renderNavItem = (item) => (
    <Link
      key={item.path}
      to={item.path}
      className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 mb-1
        ${isActive(item.path) 
          ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500' 
          : 'text-gray-700 hover:bg-gray-100'
        }
        ${!sidebarOpen && 'md:justify-center md:px-2'}`
      }
    >
      <div className="flex items-center w-full">
        {item.icon}
        <div className={`${!sidebarOpen && 'md:hidden'}`}>
          <div className="font-medium">{item.label}</div>
          {item.description && sidebarOpen && (
            <div className="text-xs text-gray-500">{item.description}</div>
          )}
        </div>
      </div>
    </Link>
  );

  const renderCategorySection = (category) => (
    <div key={category.category} className={`mb-4 ${!sidebarOpen && 'md:hidden'}`}>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
        {category.category}
      </h3>
      <div className="space-y-1">
        {category.items.map(renderNavItem)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Encabezado de la sección admin */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-3 p-1 rounded hover:bg-blue-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            <h1 className="text-xl font-bold flex items-center">
              Panel Administrativo
            </h1>
          </div>
          
          <div className="flex items-center">
            <div className="mr-4 text-sm hidden md:block">
              <span>Hola, </span>
              <span className="font-semibold">{user?.name}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full text-sm transition-colors"
            >
              <FaSignOutAlt className="mr-1" />
              <span className="hidden md:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-0 -ml-64 md:ml-0 md:w-16'
          } fixed md:static h-full z-30 shadow-lg md:shadow-none overflow-y-auto`}
        >
          <div className="p-4 flex flex-col h-full">
            {/* Perfil del administrador */}
            <div className={`flex flex-col items-center mb-6 ${!sidebarOpen && 'md:hidden'}`}>
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2 overflow-hidden">
                {user?.profilePic ? (
                  <img src={user.profilePic} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <CiUser className="text-4xl text-gray-500" />
                )}
              </div>
              <h2 className="font-medium text-sm">{user?.name}</h2>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>

            {/* Ícono pequeño cuando sidebar está colapsado */}
            <div className={`hidden md:flex md:flex-col md:items-center mb-6 ${sidebarOpen && 'md:hidden'}`}>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                {user?.profilePic ? (
                  <img src={user.profilePic} alt={user?.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <CiUser className="text-lg text-gray-500" />
                )}
              </div>
            </div>

            {/* Navegación */}
            <nav className="flex-1 mt-2">
              {navItems.map((item) => {
                if (item.category) {
                  return renderCategorySection(item);
                } else {
                  return renderNavItem(item);
                }
              })}
            </nav>

            {/* Botón para ir a la tienda */}
            <div className={`mt-auto mb-2 ${!sidebarOpen && 'md:hidden'}`}>
              <Link
                to="/"
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-center text-sm transition-colors flex items-center justify-center"
              >
                <FaHome className="mr-2" />
                Ir a la tienda
              </Link>
            </div>

            {/* Versión pequeña del botón cuando sidebar está colapsado */}
            <div className={`mt-auto mb-2 hidden ${!sidebarOpen ? 'md:block' : 'md:hidden'}`}>
              <Link
                to="/"
                className="flex justify-center items-center w-10 h-10 mx-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                title="Ir a la tienda"
              >
                <FaHome className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Contenido principal con scroll independiente */}
        <main className="flex-1 bg-gray-50 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          {/* Overlay para cerrar sidebar en móvil cuando está abierto */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            ></div>
          )}
          
          {/* Contenido de la ruta actual */}
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
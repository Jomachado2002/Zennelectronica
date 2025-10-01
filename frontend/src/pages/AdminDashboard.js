// frontend/src/pages/AdminDashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaMoneyBillWave, 
  FaShoppingCart, 
  FaUsers, 
  FaChartLine, 
  FaFileInvoiceDollar,
  FaTruck,
  FaBoxOpen,
  FaUserFriends
} from 'react-icons/fa';

const AdminDashboard = () => {
  const dashboardItems = [
    {
      title: 'Gestión Financiera',
      items: [
        {
          title: 'Dashboard Financiero',
          description: 'Vista general de ingresos, gastos y ganancias',
          icon: <FaChartLine className="text-4xl text-blue-600" />,
          link: '/panel-admin/dashboard',
          color: 'bg-blue-50 hover:bg-blue-100'
        },
        {
          title: 'Ventas',
          description: 'Registrar y gestionar ventas',
          icon: <FaMoneyBillWave className="text-4xl text-green-600" />,
          link: '/panel-admin/ventas',
          color: 'bg-green-50 hover:bg-green-100'
        },
        {
          title: 'Compras',
          description: 'Registrar y gestionar compras',
          icon: <FaShoppingCart className="text-4xl text-red-600" />,
          link: '/panel-admin/compras',
          color: 'bg-red-50 hover:bg-red-100'
        }
      ]
    },
    {
      title: 'Gestión de Relaciones',
      items: [
        {
          title: 'Clientes',
          description: 'Administrar base de clientes',
          icon: <FaUserFriends className="text-4xl text-purple-600" />,
          link: '/panel-admin/clientes',
          color: 'bg-purple-50 hover:bg-purple-100'
        },
        {
          title: 'Proveedores',
          description: 'Gestionar proveedores',
          icon: <FaTruck className="text-4xl text-orange-600" />,
          link: '/panel-admin/proveedores',
          color: 'bg-orange-50 hover:bg-orange-100'
        },
        {
          title: 'Presupuestos',
          description: 'Crear y gestionar presupuestos',
          icon: <FaFileInvoiceDollar className="text-4xl text-indigo-600" />,
          link: '/panel-admin/presupuestos',
          color: 'bg-indigo-50 hover:bg-indigo-100'
        }
      ]
    },
    {
      title: 'Administración',
      items: [
        {
          title: 'Productos',
          description: 'Gestionar catálogo de productos',
          icon: <FaBoxOpen className="text-4xl text-teal-600" />,
          link: '/panel-admin/todos-productos',
          color: 'bg-teal-50 hover:bg-teal-100'
        },
        {
          title: 'Usuarios',
          description: 'Administrar usuarios del sistema',
          icon: <FaUsers className="text-4xl text-gray-600" />,
          link: '/panel-admin/todos-usuarios',
          color: 'bg-gray-50 hover:bg-gray-100'
        }
      ]
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-600 mt-2">Bienvenido al sistema de gestión empresarial</p>
      </div>

      {dashboardItems.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{section.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.items.map((item, index) => (
              <Link
                key={index}
                to={item.link}
                className={`block p-6 rounded-lg shadow transition-all duration-200 transform hover:scale-105 ${item.color}`}
              >
                <div className="flex items-center mb-4">
                  {item.icon}
                  <h3 className="ml-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Acceso rápido */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/panel-admin/ventas"
            className="bg-white bg-opacity-20 rounded-lg p-4 text-center hover:bg-opacity-30 transition-colors"
          >
            <FaMoneyBillWave className="text-2xl mx-auto mb-2" />
            <span className="text-sm">Nueva Venta</span>
          </Link>
          <Link
            to="/panel-admin/compras"
            className="bg-white bg-opacity-20 rounded-lg p-4 text-center hover:bg-opacity-30 transition-colors"
          >
            <FaShoppingCart className="text-2xl mx-auto mb-2" />
            <span className="text-sm">Nueva Compra</span>
          </Link>
          <Link
            to="/panel-admin/clientes/nuevo"
            className="bg-white bg-opacity-20 rounded-lg p-4 text-center hover:bg-opacity-30 transition-colors"
          >
            <FaUserFriends className="text-2xl mx-auto mb-2" />
            <span className="text-sm">Nuevo Cliente</span>
          </Link>
          <Link
            to="/panel-admin/presupuestos/nuevo"
            className="bg-white bg-opacity-20 rounded-lg p-4 text-center hover:bg-opacity-30 transition-colors"
          >
            <FaFileInvoiceDollar className="text-2xl mx-auto mb-2" />
            <span className="text-sm">Nuevo Presupuesto</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
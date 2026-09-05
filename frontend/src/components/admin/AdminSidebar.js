import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaUser,
  FaFileAlt,
  FaShoppingCart,
  FaPlus,
  FaTruck,
  FaBoxOpen,
  FaFolder,
  FaSyncAlt,
  FaDownload,
  FaFilePdf,
  FaImage,
  FaStore,
  FaImages,
  FaBuilding,
  FaUserFriends,
  FaUsers,
  FaUserCog,
  FaDollarSign,
  FaCreditCard,
  FaChartPie,
  FaCog,
  FaChevronDown,
  FaChevronRight,
  FaList
} from 'react-icons/fa';
import ROLE from '../../common/role';

const STORAGE_KEY = 'zenn-admin-nav-open';

export function getAdminNavGroups() {
  return [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: FaTachometerAlt,
      path: 'dashboard'
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: FaMoneyBillWave,
      children: [
        { path: 'nueva-venta', label: 'Nueva venta', icon: FaPlus, accent: true },
        { path: 'ventas', label: 'Listado de ventas', icon: FaList },
        { path: 'clientes', label: 'Clientes', icon: FaUser },
        { path: 'presupuestos', label: 'Presupuestos', icon: FaFileAlt },
        { path: 'tipos-venta', label: 'Tipos de venta', icon: FaFileInvoiceDollar },
        { path: 'vendedores', label: 'Vendedores', icon: FaUserFriends }
      ]
    },
    {
      id: 'compras',
      label: 'Compras',
      icon: FaShoppingCart,
      children: [
        { path: 'nueva-compra', label: 'Nueva compra', icon: FaPlus, accent: true },
        { path: 'compras', label: 'Listado de compras', icon: FaList },
        { path: 'proveedores', label: 'Proveedores', icon: FaTruck }
      ]
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: FaBoxOpen,
      children: [
        { path: 'productos', label: 'Productos', icon: FaBoxOpen },
        { path: 'categorias', label: 'Categorías', icon: FaFolder },
        { path: 'sincronizacion-inventario', label: 'Sincronizar inventario', icon: FaSyncAlt },
        { path: 'worker-visao', label: 'Worker Visão', icon: FaSyncAlt },
        { path: 'exportar-productos', label: 'Exportar productos', icon: FaDownload },
        { path: 'catalogo-pdf', label: 'Catálogo PDF', icon: FaFilePdf },
        { path: 'editar-imagenes', label: 'Editor de imágenes', icon: FaImage }
      ]
    },
    {
      id: 'pagos',
      label: 'Pagos online',
      icon: FaCreditCard,
      children: [
        { path: 'transacciones-bancard', label: 'Transacciones Bancard', icon: FaCreditCard }
      ]
    },
    {
      id: 'tienda',
      label: 'Tienda',
      icon: FaStore,
      children: [
        { path: 'home-vitrinas', label: 'Home / Vitrinas', icon: FaStore },
        { path: 'home-media', label: 'Banners e imágenes', icon: FaImages },
        { path: 'sucursales', label: 'Sucursales', icon: FaBuilding }
      ]
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: FaChartPie,
      path: 'reportes'
    },
    {
      id: 'config',
      label: 'Configuración',
      icon: FaCog,
      children: [
        { path: 'configuracion', label: 'Panel de ajustes', icon: FaUserCog },
        { path: 'tipo-cambio', label: 'Tipo de cambio', icon: FaDollarSign },
        { path: 'todos-usuarios', label: 'Usuarios', icon: FaUsers, rootOnly: true },
        { path: 'gestion-usuarios', label: 'Roles y permisos', icon: FaUserCog, rootOnly: true }
      ]
    }
  ];
}

function isPathActive(pathname, path) {
  return pathname === `/panel-admin/${path}` || pathname.startsWith(`/panel-admin/${path}/`);
}

function loadOpenGroups(groups, pathname) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const next = { ventas: true, compras: true, catalogo: true, ...saved };
    groups.forEach((group) => {
      if (group.children?.some((child) => isPathActive(pathname, child.path))) {
        next[group.id] = true;
      }
    });
    return next;
  } catch {
    return {};
  }
}

const AdminSidebar = ({
  user,
  collapsed,
  isMobile,
  onNavigate
}) => {
  const location = useLocation();
  const groups = useMemo(() => getAdminNavGroups(), []);
  const [openGroups, setOpenGroups] = useState(() => loadOpenGroups(groups, location.pathname));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      groups.forEach((group) => {
        if (group.children?.some((child) => isPathActive(location.pathname, child.path))) {
          next[group.id] = true;
        }
      });
      return next;
    });
  }, [location.pathname, groups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleChildren = (children = []) =>
    children.filter((item) => !item.rootOnly || user?.role === ROLE.ROOT);

  const linkClass = (active, accent = false) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      active
        ? 'bg-[#2A3190] text-white shadow-sm'
        : accent
          ? 'text-[#2A3190] font-semibold hover:bg-indigo-50'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`;

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto pb-6">
      {groups.map((group) => {
        const children = visibleChildren(group.children);
        if (group.children && children.length === 0) return null;

        if (!group.children) {
          const active = isPathActive(location.pathname, group.path);
          const Icon = group.icon;
          return (
            <Link
              key={group.id}
              to={group.path}
              onClick={onNavigate}
              title={collapsed ? group.label : undefined}
              className={linkClass(active)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{group.label}</span>}
            </Link>
          );
        }

        const childActive = children.some((child) => isPathActive(location.pathname, child.path));
        const isOpen = collapsed && !isMobile ? false : Boolean(openGroups[group.id] ?? childActive);
        const Icon = group.icon;

        return (
          <div key={group.id} className="pt-1">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              title={collapsed ? group.label : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                childActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1 text-left">{group.label}</span>
                  {isOpen ? <FaChevronDown className="h-3 w-3" /> : <FaChevronRight className="h-3 w-3" />}
                </>
              )}
            </button>

            {(!collapsed || isMobile) && isOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l border-slate-200 pl-2">
                {children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isPathActive(location.pathname, child.path);
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={onNavigate}
                      className={linkClass(active, child.accent && !active)}
                    >
                      <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {collapsed && !isMobile && childActive && (
              <div className="mt-1 flex justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2A3190]" />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default AdminSidebar;

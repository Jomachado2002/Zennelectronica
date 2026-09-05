import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CiUser } from 'react-icons/ci';
import { Outlet, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaSignOutAlt, FaExpand, FaCompress } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ROLE from '../common/role';
import SummaryApi from '../common';
import { setUserDetails } from '../store/userSlice';
import { clearAuthToken, getStoredAuthToken } from '../helpers/getAuthToken';
import AdminSidebar from '../components/admin/AdminSidebar';

const AdminPanel = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobile && sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    if (!user) {
      if (!getStoredAuthToken()) {
        toast.error('Acceso denegado');
        navigate('/');
      }
      return;
    }
    if (user.role !== ROLE.ADMIN && user.role !== ROLE.ROOT) {
      toast.error('Acceso denegado');
      navigate('/');
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
        clearAuthToken();
        dispatch(setUserDetails(null));
        navigate('/');
      }
    } catch {
      dispatch(setUserDetails(null));
      navigate('/');
    }
  };

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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <header className="z-40 h-11 shrink-0 border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between px-2 md:px-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              {sidebarOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="hidden rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:inline-flex"
              aria-label="Colapsar menú"
            >
              <FaBars className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-slate-900">Zenn Admin</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullScreen}
              className="hidden rounded p-1.5 text-slate-500 hover:bg-slate-100 md:inline-flex"
              title={fullScreenMode ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {fullScreenMode ? <FaCompress className="h-3.5 w-3.5" /> : <FaExpand className="h-3.5 w-3.5" />}
            </button>
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">{user?.name}</span>
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                {user?.profilePic ? (
                  <img src={user.profilePic} alt={user?.name} className="h-full w-full object-cover" />
                ) : (
                  <CiUser className="text-sm text-slate-500" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
            >
              <FaSignOutAlt className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {isMobile && sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`z-40 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
            isMobile
              ? `fixed bottom-0 left-0 top-11 w-72 max-w-[86vw] shadow-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
              : sidebarCollapsed
                ? 'w-[72px]'
                : 'w-72'
          }`}
        >
          <div className="flex h-full flex-col px-3 py-3">
            <AdminSidebar
              user={user}
              collapsed={!isMobile && sidebarCollapsed}
              isMobile={isMobile}
              onNavigate={() => isMobile && setSidebarOpen(false)}
            />
            {(!sidebarCollapsed || isMobile) && (
              <p className="mt-auto px-2 pt-4 text-center text-[11px] text-slate-400">
                ERP Zenn · venta rápida
              </p>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="min-h-full p-3 md:p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;

import React, { useContext, useState, useEffect, useRef } from 'react';
import { GrSearch } from "react-icons/gr";
import { CiShoppingCart, CiHome } from "react-icons/ci";
import { BiCategoryAlt } from "react-icons/bi";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { setUserDetails } from '../store/userSlice';
import ROLE from '../common/role';
import Context from '../context';
import { 
  FaWhatsapp, 
  FaUser, 
  FaUserShield, 
  FaSignInAlt, 
  FaSignOutAlt,
  FaCreditCard,
  FaHeart,
  FaCog
} from "react-icons/fa";
import MenuCategorias from './MenuCategorias';
import SearchPreview from './SearchPreview';

const scrollTop = () => {
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  } else {
    const scrollToTop = () => {
      const currentPosition = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

      if (currentPosition > 0) {
        window.requestAnimationFrame(scrollToTop);
        window.scrollTo(0, currentPosition - currentPosition / 8);
      }
    };

    scrollToTop();
  }

  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    setTimeout(() => {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }, 100);
  }

  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, 200);
};

const Header = () => {
  const user = useSelector(state => state?.user?.user);
  const dispatch = useDispatch();
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const context = useContext(Context);
  const navigate = useNavigate();
  const location = useLocation();
  const searchInput = location;
  const URLSearch = new URLSearchParams(searchInput?.search);
  const searchQuery = URLSearch.getAll("q");
  const [search, setSearch] = useState(searchQuery);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  
  const userDropdownRef = useRef(null);

  const isAdminRoute = location.pathname.includes('/panel-admin');

  // Detectar cambios en el tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Efecto para cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Detectar scroll para efectos
  useEffect(() => {
    if (isAdminRoute) return;
    
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return null;
  }

  const handleLogout = async () => {
    const fetchData = await fetch(SummaryApi.logout_user.url, {
      method: SummaryApi.logout_user.method,
      credentials: 'include'
    });

    const data = await fetchData.json();

    if (data.success) {
      toast.success(data.message);
      dispatch(setUserDetails(null));
      setUserDropdownOpen(false);
    }
    if (data.error) {
      toast.error(data.message);
    }
  };

  const handleSearch = (e) => {
    const { value } = e.target;
    setSearch(value);
    
    // Mostrar preview solo si hay texto
    const trimmedValue = String(value || '').trim();
    if (trimmedValue.length >= 2) {
      setShowSearchPreview(true);
    } else {
      setShowSearchPreview(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
      setShowSearchPreview(false);
      navigate(`/search?q=${encodeURIComponent(trimmedSearch)}`);
    }
  };

  const handleCloseSearchPreview = () => {
    setShowSearchPreview(false);
  };

  const toggleCategoryMenu = () => setCategoryMenuOpen(!categoryMenuOpen);
  const toggleDesktopMenu = () => setDesktopMenuOpen(!desktopMenuOpen);
  const toggleMobileSearch = () => setShowMobileSearch(!showMobileSearch);
  const toggleUserDropdown = () => setUserDropdownOpen(!userDropdownOpen);

  const handleUserIconClick = () => {
    if (!user) {
      navigate('/iniciar-sesion');
    } else if (user.role === ROLE.ADMIN) {
      navigate('/panel-admin');
      scrollTop();
    } else {
      navigate('/mi-perfil');
      scrollTop();
    }
  };

  return (
    <>
      <header 
        className={`fixed w-full top-0 z-[100] transition-all duration-300 ${
          scrolled 
            ? 'bg-white shadow-lg' 
            : 'bg-white border-b border-gray-100'
        }`}
      >
        {/* ============ VERSIÓN DESKTOP ============ */}
        <div className="container mx-auto px-6 lg:px-8 h-20 hidden lg:flex items-center justify-between">
          
          {/* LOGO SVG */}
          <Link 
            to="/" 
            className="flex items-center transition-all duration-300 hover:scale-105 hover:opacity-90"
            onClick={scrollTop}
            style={{ minWidth: '180px' }}
          >
            <img 
              src="/logozenn.svg" 
              alt="Zenn Electrónicos" 
              className="h-12 w-auto"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 181, 216, 0.15))'
              }}
            />
          </Link>

          {/* BUSCADOR PREMIUM */}
          <div className="flex items-center flex-1 justify-center mx-12 max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div 
                className="flex items-center w-full bg-white rounded-full transition-all duration-300 group"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: scrolled ? '0 2px 12px rgba(0, 181, 216, 0.1)' : '0 2px 8px rgba(0, 181, 216, 0.08)'
                }}
              >
                <input
                  type="text"
                  placeholder="Busca tus productos..."
                  className="w-full outline-none py-3.5 px-6 text-gray-700 bg-transparent rounded-full text-[15px] placeholder:text-gray-400"
                  onChange={handleSearch}
                  value={search}
                  style={{
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                  }}
                />
                <button 
                  type="submit"
                  className="mr-2 p-2.5 rounded-full transition-all duration-300 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                  aria-label="Buscar productos"
                  title="Buscar productos"
                >
                  <GrSearch className="text-white text-lg" />
                </button>
              </div>
            </form>
            
            {/* Search Preview */}
            <SearchPreview
              searchTerm={search}
              onSearchChange={setSearch}
              isVisible={showSearchPreview}
              onClose={handleCloseSearchPreview}
            />
          </div>

          {/* ÁREA DERECHA */}
          <div className="flex items-center gap-3">
            
            {/* USUARIO DROPDOWN */}
            <div className="relative" ref={userDropdownRef}>
              {!user ? (
                <button
                  onClick={handleUserIconClick}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 text-gray-700 hover:text-white group relative overflow-hidden"
                  style={{
                    border: '2px solid transparent',
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box'
                  }}
                >
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <FaSignInAlt className="text-lg relative z-10" />
                  <span className="font-medium text-[14px] relative z-10">Iniciar Sesión</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleUserDropdown}
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 text-gray-700 hover:shadow-lg"
                    style={{
                      border: '2px solid #f3f4f6',
                      background: 'white'
                    }}
                  >
                    {user.role === ROLE.ADMIN ? (
                      <FaUserShield className="text-lg text-purple-600" />
                    ) : (
                      <FaUser className="text-lg text-cyan-500" />
                    )}
                    <span className="font-medium text-[14px] max-w-[120px] truncate">
                      {user.name}
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-300 ${userDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* DROPDOWN */}
                  {userDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[200] overflow-hidden"
                      style={{
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      {/* Info del usuario */}
                      <div 
                        className="px-5 py-4"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 181, 216, 0.08) 0%, rgba(123, 44, 191, 0.08) 100%)'
                        }}
                      >
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{user.email}</p>
                        <p 
                          className="text-xs font-medium mt-2 inline-block px-3 py-1 rounded-full"
                          style={{
                            background: user.role === ROLE.ADMIN 
                              ? 'linear-gradient(135deg, #7B2CBF 0%, #5A189A 100%)'
                              : 'linear-gradient(135deg, #00B5D8 0%, #00D4FF 100%)',
                            color: 'white'
                          }}
                        >
                          {user.role === ROLE.ADMIN ? 'Administrador' : 'Usuario General'}
                        </p>
                      </div>

                      {/* Opciones */}
                      <div className="py-2">
                        {user.role === ROLE.ADMIN ? (
                          <Link
                            to="/panel-admin"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              scrollTop();
                            }}
                            className="flex items-center px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 transition-all duration-200 group"
                          >
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                              <FaUserShield className="text-purple-600" />
                            </div>
                            <span className="font-medium">Panel de Administración</span>
                          </Link>
                        ) : (
                          <>
                            <Link
                              to="/mi-perfil"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                scrollTop();
                              }}
                              className="flex items-center px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                <FaUser className="text-cyan-600" />
                              </div>
                              <span className="font-medium">Mi Perfil</span>
                            </Link>
                            <Link
                              to="/mi-perfil?tab=cards"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                scrollTop();
                              }}
                              className="flex items-center px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group"
                            >
                              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                <FaCreditCard className="text-green-600" />
                              </div>
                              <span className="font-medium">Mis Tarjetas</span>
                            </Link>
                            <Link
                              to="/mi-perfil?tab=favorites"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                scrollTop();
                              }}
                              className="flex items-center px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200 group"
                            >
                              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                <FaHeart className="text-red-600" />
                              </div>
                              <span className="font-medium">Favoritos</span>
                            </Link>
                            <Link
                              to="/mi-perfil?tab=settings"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                scrollTop();
                              }}
                              className="flex items-center px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200 group"
                            >
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                <FaCog className="text-gray-600" />
                              </div>
                              <span className="font-medium">Configuración</span>
                            </Link>
                          </>
                        )}
                        
                        <div className="border-t border-gray-100 my-2"></div>
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                        >
                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                            <FaSignOutAlt />
                          </div>
                          <span className="font-medium">Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BOTÓN MENÚ CATEGORÍAS */}
            <button 
              onClick={toggleDesktopMenu}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 text-gray-700 hover:shadow-lg"
              style={{
                border: '2px solid #f3f4f6',
                background: 'white'
              }}
              aria-label="Abrir menú de categorías"
              aria-expanded={desktopMenuOpen}
              aria-haspopup="true"
            >
              <BiCategoryAlt className="text-xl" />
              <span className="font-medium text-[14px]">Menú</span>
            </button>

            {/* CARRITO */}
            <Link 
              to="/carrito" 
              className="relative p-3 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg"
              onClick={scrollTop}
              style={{
                background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
              }}
            >
              <CiShoppingCart className="text-2xl text-white" />
              {context?.cartProductCount > 0 && (
                <div 
                  className="absolute -top-1 -right-1 w-6 h-6 text-xs text-white rounded-full flex items-center justify-center shadow-lg font-bold border-2 border-white"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)'
                  }}
                >
                  {context?.cartProductCount}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* ============ VERSIÓN MÓVIL ============ */}
        <div className="lg:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 h-16 bg-white border-b border-gray-100">
            {/* Logo SVG móvil */}
            <Link to="/" className="flex items-center" onClick={scrollTop}>
              <img 
                src="/logozenn.svg" 
                alt="Zenn Electrónicos" 
                className="h-9 w-auto"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 181, 216, 0.15))'
                }}
              />
            </Link>

            {/* Iconos móviles */}
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleMobileSearch}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <GrSearch className="text-xl text-gray-700" />
              </button>
              <Link to="/carrito" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" onClick={scrollTop}>
                <CiShoppingCart className="text-2xl text-gray-700" />
                {context?.cartProductCount > 0 && (
                  <div 
                    className="absolute -top-1 -right-1 w-5 h-5 text-xs text-white rounded-full flex items-center justify-center font-bold border-2 border-white"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)'
                    }}
                  >
                    {context?.cartProductCount}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ============ BARRA DE BÚSQUEDA MÓVIL EXPANDIBLE ============ */}
      {showMobileSearch && (
        <>
          {/* Overlay para cerrar con click fuera */}
          <div 
            className="lg:hidden fixed inset-0 z-[80] bg-black bg-opacity-20"
            onClick={toggleMobileSearch}
            style={{ top: '64px' }}
          />
          
          {/* Barra de búsqueda móvil */}
          <div 
            className="lg:hidden fixed top-16 left-0 right-0 z-[90] px-4 py-3 bg-white shadow-lg border-b border-gray-200"
            style={{
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <div 
                className="flex items-center w-full bg-white rounded-full transition-all duration-300"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 2px 8px rgba(0, 181, 216, 0.12)'
                }}
              >
                <input
                  type="text"
                  placeholder="Busca tus productos..."
                  className="w-full outline-none py-3 px-5 text-gray-700 bg-transparent text-sm"
                  onChange={handleSearch}
                  value={search}
                  autoFocus
                />
                <button 
                  type="submit"
                  className="mr-2 p-2.5 rounded-full transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <GrSearch className="text-white text-lg" />
                </button>
              </div>
              
              {/* Search Preview para móvil */}
              <SearchPreview
                searchTerm={search}
                onSearchChange={setSearch}
                isVisible={showSearchPreview}
                onClose={handleCloseSearchPreview}
                className="mt-2"
              />
            </form>
          </div>
        </>
      )}

      {/* ============ COMPONENTE MENU CATEGORÍAS ============ */}
      <MenuCategorias 
        isOpen={isMobile ? categoryMenuOpen : desktopMenuOpen}
        onClose={isMobile ? toggleCategoryMenu : toggleDesktopMenu}
        isMobile={isMobile}
      />

      {/* ============ BARRA DE NAVEGACIÓN MÓVIL INFERIOR ============ */}
      <div 
        className="lg:hidden fixed bottom-0 w-full bg-white shadow-2xl border-t border-gray-200 p-2 flex justify-around z-[100]"
        style={{
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)'
        }}
      >
        <Link 
          to="/" 
          className="flex flex-col items-center text-gray-600 hover:text-cyan-500 transition-all duration-200 py-2 px-3 rounded-xl hover:bg-cyan-50 group" 
          onClick={scrollTop}
        >
          <CiHome className="text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium mt-1">Inicio</span>
        </Link>
        
        <button 
          onClick={() => { toggleCategoryMenu(); scrollTop(); }} 
          className="flex flex-col items-center text-gray-600 hover:text-purple-600 transition-all duration-200 py-2 px-3 rounded-xl hover:bg-purple-50 group"
        >
          <BiCategoryAlt className="text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium mt-1">Menú</span>
        </button>
        
        <Link 
          to="/carrito" 
          className="flex flex-col items-center text-gray-600 hover:text-cyan-500 transition-all duration-200 py-2 px-3 rounded-xl hover:bg-cyan-50 group relative" 
          onClick={scrollTop}
        >
          <CiShoppingCart className="text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium mt-1">Carrito</span>
          {context?.cartProductCount > 0 && (
            <div 
              className="absolute -top-1 right-2 w-5 h-5 text-xs text-white rounded-full flex items-center justify-center font-bold border-2 border-white"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)'
              }}
            >
              {context?.cartProductCount}
            </div>
          )}
        </Link>
        
        <a 
          href="https://wa.me/595981150393?text=Hola,%20estoy%20interesado%20en%20obtener%20información%20sobre%20insumos%20de%20tecnología." 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-col items-center text-gray-600 hover:text-green-600 transition-all duration-200 py-2 px-3 rounded-xl hover:bg-green-50 group"
        >
          <FaWhatsapp className="text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium mt-1">WhatsApp</span>
        </a>
        
        <button 
          onClick={handleUserIconClick}
          className="flex flex-col items-center text-gray-600 hover:text-cyan-500 transition-all duration-200 py-2 px-3 rounded-xl hover:bg-cyan-50 group"
        >
          {!user ? (
            <>
              <FaSignInAlt className="text-2xl group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium mt-1">Entrar</span>
            </>
          ) : user.role === ROLE.ADMIN ? (
            <>
              <FaUserShield className="text-2xl group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium mt-1">Admin</span>
            </>
          ) : (
            <>
              <FaUser className="text-2xl group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium mt-1">Perfil</span>
            </>
          )}
        </button>
      </div>
      
      {/* Estilos globales */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  );
};

export default Header;
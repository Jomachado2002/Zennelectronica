import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BiCategoryAlt } from "react-icons/bi";
import { FaInfoCircle, FaWhatsapp, FaPhone } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import useDynamicCategories from '../hooks/useDynamicCategories';

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

const MenuCategorias = ({ 
  isOpen, 
  onClose, 
  isMobile = false 
}) => {
  const navigate = useNavigate();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(null);
  const [activeSubcategories, setActiveSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]); // Para móvil
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const menuRef = useRef(null);
  const overlayRef = useRef(null);

  // Hook para categorías dinámicas
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    loadSubcategories,
  } = useDynamicCategories();

  // Efecto para actualizar subcategorías cuando cambia la categoría activa (DESKTOP)
  useEffect(() => {
    const loadSubcategoriesForActiveCategory = async () => {
      if (!isMobile && activeCategoryIndex !== null && categories[activeCategoryIndex]) {
        setLoadingSubcategories(true);
        const subcategories = await loadSubcategories(categories[activeCategoryIndex].value);
        setActiveSubcategories(subcategories);
        setLoadingSubcategories(false);
      } else if (!isMobile) {
        setActiveSubcategories([]);
      }
    };

    loadSubcategoriesForActiveCategory();
  }, [activeCategoryIndex, isMobile, categories, loadSubcategories]);

  // Prevenir scroll cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCategoryClick = (index) => {
    if (isMobile) {
      // En móvil: toggle accordion
      if (expandedCategories.includes(index)) {
        setExpandedCategories(expandedCategories.filter(i => i !== index));
      } else {
        setExpandedCategories([...expandedCategories, index]);
      }
    } else {
      // En desktop: cambiar categoría activa
      setActiveCategoryIndex(index);
    }
  };

  const handleNavigateWithReload = (url) => {
    navigate(url);
    scrollTop();
    onClose();
    
    setTimeout(() => {
      window.location.reload();
    }, 10);
  };

  if (!isOpen) return null;

  // ============ VERSIÓN MÓVIL MEJORADA ============
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140] transition-opacity duration-300"
          onClick={onClose}
        />

        {/* Menú Lateral */}
        <div
          className="fixed top-0 left-0 h-screen bg-white w-[85%] max-w-sm shadow-2xl z-[150] overflow-y-auto"
          style={{
            animation: 'slideInLeft 0.3s ease-out'
          }}
        >
          {/* Header del Menú */}
          <div 
            className="sticky top-0 z-10 p-5 flex items-center justify-between shadow-md"
            style={{
              background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
            }}
          >
            <div>
              <h1 className="text-xl font-bold text-white">Menú</h1>
              <p className="text-xs text-white/80 mt-0.5">Explora nuestras categorías</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <IoMdClose className="text-2xl" />
            </button>
          </div>

          {/* Contenido del Menú */}
          <div className="p-4 space-y-3">
            
            {/* Enlace a Nosotros */}
            <Link 
              to="/nosotros" 
              className="flex items-center p-4 rounded-xl transition-all duration-200 group"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 181, 216, 0.1) 0%, rgba(123, 44, 191, 0.1) 100%)',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
              onClick={() => {
                onClose();
                scrollTop();
              }}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mr-3 transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                }}
              >
                <FaInfoCircle className="text-white text-lg" />
              </div>
              <div>
                <span className="font-bold text-gray-800 block">Nosotros</span>
                <span className="text-xs text-gray-600">Conoce más sobre Zenn</span>
              </div>
            </Link>

            {/* Separador */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Categorías con Acordeón */}
            <div className="space-y-3">
              {categoriesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  <span className="ml-3 text-gray-600">Cargando categorías...</span>
                </div>
              ) : categoriesError ? (
                <div className="text-center p-8 text-red-600">
                  <p>Error al cargar categorías</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Recargar página
                  </button>
                </div>
              ) : (
                categories.map((category, index) => (
                  <CategoryAccordion
                    key={category.id}
                    category={category}
                    index={index}
                    expandedCategories={expandedCategories}
                    onCategoryClick={handleCategoryClick}
                    onNavigateWithReload={handleNavigateWithReload}
                    loadSubcategories={loadSubcategories}
                  />
                ))
              )}
            </div>

            {/* Separador */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Enlaces de Contacto */}
            <div className="space-y-2">
              <a 
                href="https://wa.me/595981150393?text=Hola,%20estoy%20interesado%20en%20obtener%20información%20sobre%20insumos%20de%20tecnología." 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-4 rounded-xl bg-green-50 border-2 border-green-200 transition-all duration-200 hover:bg-green-100 group"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <FaWhatsapp className="text-white text-xl" />
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">WhatsApp</span>
                  <span className="text-xs text-gray-600">Chatea con nosotros</span>
                </div>
              </a>

              <a 
                href="tel:+595981150393" 
                className="flex items-center p-4 rounded-xl bg-blue-50 border-2 border-blue-200 transition-all duration-200 hover:bg-blue-100 group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <FaPhone className="text-white text-lg" />
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">Llamar</span>
                  <span className="text-xs text-gray-600">+595 981150393</span>
                </div>
              </a>
            </div>

            {/* Espaciador inferior */}
            <div className="h-4"></div>
          </div>

          {/* Estilos de animación */}
          <style jsx>{`
            @keyframes slideInLeft {
              from {
                transform: translateX(-100%);
              }
              to {
                transform: translateX(0);
              }
            }

            @keyframes slideDown {
              from {
                opacity: 0;
                max-height: 0;
              }
              to {
                opacity: 1;
                max-height: 1000px;
              }
            }
          `}</style>
        </div>
      </>
    );
  }

  // ============ VERSIÓN DESKTOP (IGUAL QUE ANTES) ============
  return (
    <>
      {/* Overlay de fondo oscuro */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-[120]" 
        onClick={onClose}
        style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}
      />
      
      {/* Contenido del menú */}
      <div 
        ref={menuRef}
        className="desktop-menu-container fixed top-20 left-0 bottom-0 w-1/2 bg-gray-100 shadow-xl z-[130]"
        style={{position: 'fixed', top: '5rem', left: 0, bottom: 0, width: '50%'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full">
          {/* Panel de navegación izquierdo */}
          <div className="w-64 bg-gray-100 pt-4 border-r border-gray-200 overflow-y-auto h-full">
            <nav className="space-y-1 px-3">
              {/* Enlace a Nosotros */}
              <Link 
                to="/nosotros" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                onClick={() => {
                  onClose();
                  scrollTop();
                }}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 mr-3 flex-shrink-0">
                  <FaInfoCircle className="text-blue-500 text-sm" />
                </div>
                <span className="font-medium">Nosotros</span>
              </Link>
              
              {/* Categorías principales */}
              <div className="mt-4">
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  CATEGORÍAS
                </h3>
                {categoriesLoading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Cargando categorías...</p>
                  </div>
                ) : categoriesError ? (
                  <div className="px-4 py-8 text-center text-red-600">
                    <p className="text-sm">Error al cargar categorías</p>
                  </div>
                ) : (
                  categories.map((category, index) => (
                    <div
                      key={category.id}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between border-l-4 ${activeCategoryIndex === index 
                        ? 'border-l-blue-500 bg-blue-50/50 text-blue-800' 
                        : 'border-l-transparent text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => handleCategoryClick(index)}
                    >
                      <span className="font-medium">{category.label}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))
                )}
              </div>
              
              {/* Contacto */}
              <div className="pt-3 mt-4 border-t border-gray-200">
                <a 
                  href="https://wa.me/595981150393?text=Hola,%20estoy%20interesado%20en%20obtener%20información%20sobre%20insumos%20de%20tecnología." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 mr-3 flex-shrink-0">
                    <FaWhatsapp className="text-blue-500 text-sm" />
                  </div>
                  <span className="font-medium">Contactar</span>
                </a>
                <a 
                  href="tel:+595981150393" 
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 mr-3 flex-shrink-0">
                    <FaPhone className="text-blue-500 text-sm" />
                  </div>
                  <span className="font-medium">+595 981150393</span>
                </a>
              </div>
            </nav>
          </div>
          
          {/* Panel de subcategorías derecho */}
          <div className="flex-1 py-4 px-6 overflow-y-auto bg-white h-full">
            {activeCategoryIndex !== null && categories[activeCategoryIndex] ? (
              <>
                <h2 className="text-xl font-bold text-blue-800 mb-5 pb-2 border-b border-gray-200">
                  {categories[activeCategoryIndex]?.label}
                </h2>
                
                {loadingSubcategories ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Cargando subcategorías...</span>
                  </div>
                ) : activeSubcategories.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {activeSubcategories.map((subcategory) => (
                        <a
                          key={subcategory.id}
                          href="#"
                          className="group p-3 hover:bg-blue-50 transition-colors flex items-center"
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavigateWithReload(`/categoria-producto?category=${categories[activeCategoryIndex].value}&subcategory=${subcategory.value}`);
                          }}
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors flex-shrink-0 mr-3">
                            <BiCategoryAlt className="text-sm" />
                          </div>
                          <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors text-sm">
                            {subcategory.label}
                          </span>
                        </a>
                      ))}
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                      <a
                        href="#"
                        className="py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigateWithReload(`/categoria-producto?category=${categories[activeCategoryIndex].value}`);
                        }}
                      >
                        Ver toda la colección
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay subcategorías disponibles</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="text-3xl font-bold text-blue-800 mb-4">Zenn</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Tecnología a tu alcance</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Selecciona una categoría para explorar nuestros productos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Componente para el acordeón de categorías móvil
const CategoryAccordion = ({ 
  category, 
  index, 
  expandedCategories, 
  onCategoryClick, 
  onNavigateWithReload,
  loadSubcategories 
}) => {
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  const handleCategoryClick = async () => {
    if (!expandedCategories.includes(index)) {
      // Si se está expandiendo, cargar subcategorías
      setLoadingSubcategories(true);
      const subs = await loadSubcategories(category.value);
      setSubcategories(subs);
      setLoadingSubcategories(false);
    }
    onCategoryClick(index);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
    >
      {/* Header de Categoría */}
      <button
        className="w-full p-4 flex items-center justify-between transition-colors duration-200"
        style={{
          background: expandedCategories.includes(index)
            ? 'linear-gradient(135deg, rgba(0, 181, 216, 0.1) 0%, rgba(123, 44, 191, 0.1) 100%)'
            : 'white'
        }}
        onClick={handleCategoryClick}
      >
        <div className="flex items-center">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
            style={{
              background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
            }}
          >
            <BiCategoryAlt className="text-white" />
          </div>
          <span className="font-bold text-gray-800 text-left">
            {category.label}
          </span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 transition-transform duration-300 ${
            expandedCategories.includes(index) ? 'rotate-180' : ''
          }`}
          style={{ color: '#00B5D8' }}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Subcategorías (Acordeón) */}
      {expandedCategories.includes(index) && (
        <div 
          className="border-t border-gray-100 bg-gray-50"
          style={{
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          {loadingSubcategories ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando...</span>
            </div>
          ) : (
            <>
              {subcategories.map((subcategory) => (
                <a
                  key={subcategory.id}
                  href="#"
                  className="flex items-center justify-between p-3.5 border-b border-gray-100 last:border-b-0 hover:bg-white transition-all duration-200 group"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateWithReload(`/categoria-producto?category=${category.value}&subcategory=${subcategory.value}`);
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-3 group-hover:scale-150 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-cyan-600 font-medium transition-colors">
                      {subcategory.label}
                    </span>
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 text-gray-400 group-hover:text-cyan-600 transition-colors" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </a>
              ))}
              
              {/* Botón "Ver Todo" */}
              <a
                href="#"
                className="block p-3.5 text-center text-sm font-bold text-white transition-all duration-200 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateWithReload(`/categoria-producto?category=${category.value}`);
                }}
              >
                Ver toda la colección →
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuCategorias;
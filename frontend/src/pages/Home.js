import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaAngleRight } from 'react-icons/fa';
import BannerProduct from '../components/BannerProduct';
import CategoryShowcase from '../components/CategoryShowcase';

import VerticalCardProductOptimized from '../components/VerticalCardProductOptimized';
import { useHomeProducts } from '../hooks/useProducts';
import BrandCarousel from '../components/BrandCarousel';
import NotebookBanner from '../components/NotebookBanner';
import LatestProductsMix from '../components/LatestProductsMix';
import '../styles/global.css';  

// Importar la función scrollTop mejorada
import scrollTop from '../helpers/scrollTop';
import { showPerformanceReport } from '../utils/performanceMonitor';

// Animaciones simplificadas para mejor performance
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const Home = () => {
  // ✅ ÚNICA FUENTE DE DATOS - UNA SOLA LLAMADA HTTP
  const { data: homeData, isLoading: homeLoading } = useHomeProducts();

  // ✅ EXTRAER DATOS POR CATEGORÍA PARA PASAR COMO PROPS
  const getProductsForCategory = (category, subcategory) => {
    if (!homeData?.data?.[category]?.[subcategory]) {
      return [];
    }
    return homeData.data[category][subcategory];
  };

  // Optimizaciones de carga
  useEffect(() => {
    scrollTop();

    // ✅ PREFETCH CRÍTICO - Solo imágenes del banner
    const prefetchCriticalImages = () => {
      const criticalImages = [
        // Agregar URLs de imágenes críticas del banner aquí si las tienes estáticas
      ];
      
      criticalImages.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
      });
    };
    
    prefetchCriticalImages();
    
    // ✅ MOSTRAR REPORTE DE RENDIMIENTO EN DESARROLLO
    showPerformanceReport();
  }, []);

  // Función para abrir WhatsApp
  const openWhatsApp = () => {
    const message = "Hola, necesito asesoramiento sobre productos de informática. ¿Podrían ayudarme?";
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/595981150393?text=${encodedMessage}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Zenn | Lo Mejor en Tecnología en Paraguay</title>
        <meta
          name="description"
          content="Descubre los mejores productos de informática, notebooks, placas madre, computadoras ensambladas, monitores y más en Zenn. ¡Ofertas exclusivas en Paraguay!"
        />
        <meta
          name="keywords"
          content="informática, notebooks, placas madre, computadoras, monitores, Paraguay, tecnología, ofertas"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Script de Google Tag Manager */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16909859875"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-16909859875');
          `}
        </script>
      </Helmet>
      
      {/* ✅ FONDO CON GRADIENTE SUTIL - ESTILO HEADER */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white font-inter text-gray-800">
        {/* Hero Banner con animación */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="relative bg-white shadow-xl overflow-hidden mt-0 md:mt-4"
        >
          {/* ✅ ELIMINADOS EFECTOS DECORATIVOS QUE PODRÍAN CAUSAR VERDE */}
          <div className="w-full -mt-2 sm:mt-0">
            <BannerProduct />
          </div>
          <CategoryShowcase />
        </motion.div>

        {/* SEO Content Section - Hidden visually but accessible to screen readers */}
        <div className="sr-only">
          <h1>Zenn - Especialistas en Computadoras Gamer y Soluciones IT en Paraguay</h1>
          <p>
            En Zenn somos especialistas en tecnología en Paraguay. Ofrecemos la mejor selección de computadoras gamer, 
            equipos de última generación, componentes de PC y soluciones informáticas completas para profesionales y entusiastas de la tecnología.
          </p>
          <p>
            Nuestro catálogo incluye notebooks de alto rendimiento, procesadores Intel y AMD, placas madre, 
            tarjetas gráficas NVIDIA y AMD, memorias RAM, discos duros SSD y HDD, monitores gaming, 
            teclados mecánicos, mouses gaming y todos los accesorios que necesitas para armar tu PC perfecta.
          </p>
          <p>
            Con años de experiencia en el mercado paraguayo, Zenn se ha consolidado como la tienda de referencia 
            para la compra de equipos tecnológicos de calidad. Ofrecemos garantía extendida, soporte técnico 
            especializado y las mejores marcas del mercado internacional.
          </p>
        </div>

        {/* Contenido principal con animaciones */}
        <div className="max-w-7xl mx-auto px-4 space-y-8 sm:space-y-16 py-8 sm:py-16">
          {/* Sección: Notebooks */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="flex flex-col lg:flex-row items-stretch gap-8">
              {/* Imagen destacada */}
              <motion.div 
                variants={fadeIn}
                className="w-full lg:w-1/3"
              >
                <div className="h-full relative overflow-hidden rounded-2xl shadow-2xl group">
                  <NotebookBanner />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6 transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                    <div className="text-white">
                      <Link to="/categoria-producto?category=informatica&subcategory=notebooks"
                            onClick={() => scrollTop()}>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Carousel de notebooks */}
              <motion.div 
                variants={fadeIn}
                className="w-full lg:w-2/3"
              >
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 
                        className="text-2xl sm:text-3xl font-bold mb-4 flex items-center bg-clip-text text-transparent"
                        style={{
                          background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        <span className="mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        Notebooks de Alto Rendimiento
                      </h2>
                      <div 
                        className="h-1 w-32 mb-6 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                        }}
                      ></div>
                    </div>
                    
                      <Link to="/categoria-producto?category=informatica&subcategory=notebooks" 
                            onClick={() => scrollTop()}>
                        <button 
                          className="px-6 py-3 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center group/btn"
                          style={{
                            background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                          }}
                        >
                          Ver más <FaAngleRight className="ml-1 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </button>
                      </Link>
                  </div>
                  
                  {/* ✅ COMPONENTE OPTIMIZADO - CARGA RÁPIDA */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="notebooks"
                    heading=""
                    products={getProductsForCategory('informatica', 'notebooks')}
                    loading={homeLoading}
                  />
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Sección: Teléfonos Móviles */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                  <div>
                    <h2 
                      className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      Teléfonos Móviles
                    </h2>
                    <p className="mt-2 text-gray-600 max-w-lg">La última tecnología móvil al alcance de tus manos</p>
                    <div 
                      className="h-1 w-24 mt-2 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    ></div>
                  </div>
                  <Link to="/categoria-producto?category=telefonia&subcategory=telefonos_moviles" 
                        onClick={() => scrollTop()}>
                    <button 
                      className="mt-4 md:mt-0 px-6 py-3 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver toda la colección
                    </button>
                  </Link>
                </div>
                
                <div className="mt-6">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="telefonia"
                    subcategory="telefonos_moviles"
                    heading=""
                    products={getProductsForCategory('telefonia', 'telefonos_moviles')}
                    loading={homeLoading}
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Sección: Placas Madre */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                  <div>
                    <h2 
                      className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      Placas Madre
                    </h2>
                    <p className="mt-2 text-gray-600 max-w-lg">La base perfecta para tu próximo sistema de alto rendimiento</p>
                    <div 
                      className="h-1 w-24 mt-2 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    ></div>
                  </div>
                  <Link to="/categoria-producto?category=informatica&subcategory=placas_madre" 
                        onClick={() => scrollTop()}>
                    <button 
                      className="mt-4 md:mt-0 px-6 py-3 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                     Ver más
                    </button>
                  </Link>
                </div>
                
                <div className="mt-6">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="placas_madre"
                    heading=""
                    products={getProductsForCategory('informatica', 'placas_madre')}
                    loading={homeLoading}
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Grid de 4x2 para componentes */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mouses */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 
                    className="text-2xl font-bold flex items-center text-white"
                  >
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </span>
                    Mouses
                  </h2>
                  <div className="h-1 w-24 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="perifericos"
                    subcategory="mouses"
                    heading=""
                    products={getProductsForCategory('perifericos', 'mouses')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=perifericos&subcategory=mouses"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Monitores */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Monitores
                  </h2>
                  <div className="h-1 w-20 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="perifericos"
                    subcategory="monitores"
                    heading=""
                    products={getProductsForCategory('perifericos', 'monitores')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=perifericos&subcategory=monitores"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Memorias RAM */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    Memorias RAM
                  </h2>
                  <div className="h-1 w-20 bg-blue-300 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="memorias_ram"
                    heading=""
                    products={getProductsForCategory('informatica', 'memorias_ram')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=informatica&subcategory=memorias_ram"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Discos Duros */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </span>
                    Discos Duros
                  </h2>
                  <div className="h-1 w-20 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="discos_duros"
                    heading=""
                    products={getProductsForCategory('informatica', 'discos_duros')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=informatica&subcategory=discos_duros"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Tarjetas Gráficas */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
</svg>
                    </span>
                    Tarjetas Gráficas
                  </h2>
                  <div className="h-1 w-24 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="tarjeta_grafica"
                    heading=""
                    products={getProductsForCategory('informatica', 'tarjeta_grafica')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=informatica&subcategory=tarjeta_grafica"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Gabinetes */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </span>
                    Gabinetes
                  </h2>
                  <div className="h-1 w-20 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="gabinetes"
                    heading=""
                    products={getProductsForCategory('informatica', 'gabinetes')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=informatica&subcategory=gabinetes"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Procesadores */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </span>
                    Procesadores
                  </h2>
                  <div className="h-1 w-24 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="informatica"
                    subcategory="procesador"
                    heading=""
                    products={getProductsForCategory('informatica', 'procesador')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=informatica&subcategory=procesador"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Teclados */}
              <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div 
                  className="p-6 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                >
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Teclados
                  </h2>
                  <div className="h-1 w-20 bg-white/30 mt-2 mb-4 rounded-full"></div>
                </div>
                <div className="p-4">
                  {/* ✅ COMPONENTE OPTIMIZADO */}
                  <VerticalCardProductOptimized
                    category="perifericos"
                    subcategory="teclados"
                    heading=""
                    products={getProductsForCategory('perifericos', 'teclados')}
                    loading={homeLoading}
                  />
                </div>
                <div className="p-4 pt-0 text-center">
                  <Link to="/categoria-producto?category=perifericos&subcategory=teclados"
                        onClick={() => scrollTop()}>
                    <button 
                      className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg group/btn"
                      style={{
                        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                      }}
                    >
                      Ver más
                    </button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Sección: Productos Destacados */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="text-center mb-10">
              <h2 
                className="inline-block text-3xl font-bold bg-clip-text text-transparent"
                style={{
                  background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Productos Destacados
              </h2>
              <div 
                className="h-1 w-40 mx-auto mt-3 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                }}
              ></div>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Descubre nuestra selección de productos más recientes y exclusivos</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 
                    className="text-xl font-semibold bg-clip-text text-transparent"
                    style={{
                      background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    Últimas novedades
                  </h3>
                  <div 
                    className="h-1 w-20 mt-2 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                    }}
                  ></div>
                </div>
                <Link 
                  to="/categoria-producto"
                  className="text-sm font-semibold transition-all duration-300 flex items-center group/link"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  onClick={scrollTop}
                >
                  Ver todos <FaAngleRight className="ml-1 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
              
              <LatestProductsMix limit={5} />
            </div>
          </motion.section>

          {/* Sección: Marcas Destacadas */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="bg-white rounded-2xl shadow-lg py-10 px-6">
              <div className="text-center mb-8">
                <h2 
                  className="text-3xl font-bold bg-clip-text text-transparent"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Marcas Destacadas
                </h2>
                <div 
                  className="h-1 w-32 mx-auto mt-3 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
                  }}
                ></div>
                <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Trabajamos con las mejores marcas para ofrecerte la mejor calidad y garantía</p>
              </div>
              
              <div className="relative py-4">
                <BrandCarousel />
              </div>
            </div>
          </motion.section>
          
          {/* Banner CTA */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="w-full"
          >
            <div 
              className="relative overflow-hidden rounded-2xl shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
              }}
            >
              <div className="absolute inset-0 bg-pattern opacity-10"></div>
              
              <div className="relative z-10 px-6 py-12 sm:px-12 text-center sm:text-left">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div className="mb-6 sm:mb-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">¿Necesitas ayuda para elegir?</h2>
                    <p className="text-blue-100">Nuestros expertos están listos para asesorarte y encontrar la solución perfecta para ti.</p>
                    </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={openWhatsApp}
                      className="px-6 py-3 bg-white text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center group/btn"
                    >
                      <svg className="w-5 h-5 mr-2 group-hover/btn:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      Contactar Asesor
                    </button>
                    <Link to="/nosotros" onClick={() => scrollTop()}>
                      <button 
                        className="px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg border-2 border-white/30 group/btn"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)'
                        }}
                      >
                        NOSOTROS
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
};

export default Home;
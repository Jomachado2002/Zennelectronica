import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaAngleRight } from 'react-icons/fa';
import BannerProduct from '../components/BannerProduct';
import CategoryShowcase from '../components/CategoryShowcase';
import GlobalImagePreloader from '../components/GlobalImagePreloader';
import HomeDynamicSections from '../components/home/HomeDynamicSections';
import { useHomeProducts } from '../hooks/useProducts';
import BrandCarousel from '../components/BrandCarousel';
import LatestProductsMix from '../components/LatestProductsMix';
import '../styles/global.css';
import scrollTop from '../helpers/scrollTop';
import { showPerformanceReport } from '../utils/performanceMonitor';
import {
  HOME_SLOT_ROUTES,
  HOME_SECTION_SUBTITLES,
  categoriaProductoHref,
  getCelularesListingHref
} from '../config/homeSlotRoutes';
import { useSeedHomeShowcasePreviews } from '../hooks/useSubcategoryPreviewMap';
import { cdnThumbUrl, warmImageUrls } from '../helpers/cdnImageUrl';

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

/** Fallback si el API aún no envía `sections` (backend viejo). */
function buildFallbackSections() {
  const order = [
    'notebooks',
    'celulares',
    'placas_madre',
    'mouses',
    'monitores',
    'memorias_ram',
    'discos',
    'tarjetas_graficas',
    'apple',
    'procesadores',
    'teclados'
  ];
  const layouts = {
    notebooks: 'hero',
    celulares: 'full',
    placas_madre: 'full'
  };
  const titles = {
    notebooks: 'Notebooks de Alto Rendimiento',
    celulares: 'Celulares',
    placas_madre: 'Placas Madre',
    mouses: 'Mouses',
    monitores: 'Monitores',
    memorias_ram: 'Memorias RAM',
    discos: 'Discos Duros',
    tarjetas_graficas: 'Tarjetas Gráficas',
    apple: 'Apple',
    procesadores: 'Procesadores',
    teclados: 'Teclados'
  };

  return order
    .filter((key) => HOME_SLOT_ROUTES[key])
    .map((key, index) => ({
      key,
      title: titles[key] || key,
      subtitle: HOME_SECTION_SUBTITLES[key] || '',
      layout: layouts[key] || 'grid',
      order: (index + 1) * 10,
      verMas: HOME_SLOT_ROUTES[key],
      pairs: [HOME_SLOT_ROUTES[key]]
    }));
}

const Home = () => {
  const { data: homeData, isLoading: homeLoading } = useHomeProducts();
  const [, setImagesPreloaded] = useState(false);

  const showcasePreviewsByCategory = homeData?.data?.showcasePreviewsByCategory || null;
  useSeedHomeShowcasePreviews(showcasePreviewsByCategory);

  // Calienta thumbs de subcategorías apenas llega el home (antes/mientras monta el carrusel)
  useEffect(() => {
    if (!showcasePreviewsByCategory) return;
    const urls = [];
    Object.values(showcasePreviewsByCategory).forEach((map) => {
      if (!map || typeof map !== 'object') return;
      Object.values(map).forEach((u) => {
        if (u) urls.push(cdnThumbUrl(u, { width: 384, quality: 70 }));
      });
    });
    warmImageUrls(urls, 12);
  }, [showcasePreviewsByCategory]);

  const slots = homeData?.data?.slots;
  const slotProducts = (slotKey) =>
    Array.isArray(slots?.[slotKey]) ? slots[slotKey] : [];

  const sections = useMemo(() => {
    const fromApi = homeData?.data?.sections;
    if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
    return buildFallbackSections();
  }, [homeData]);

  const [novedadesVerTodosHref, setNovedadesVerTodosHref] = useState('/categoria-producto');
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const celularesSection = sections.find((s) => s.key === 'celulares');
    const mobileHref = celularesSection
      ? categoriaProductoHref(
          celularesSection.verMas?.category || celularesSection.pairs?.[0]?.category,
          celularesSection.verMas?.subcategory || celularesSection.pairs?.[0]?.subcategory
        )
      : getCelularesListingHref();
    const sync = () =>
      setNovedadesVerTodosHref(mq.matches ? mobileHref : '/categoria-producto');
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [sections]);

  useEffect(() => {
    scrollTop();
    showPerformanceReport();
  }, []);

  const openWhatsApp = () => {
    const message =
      'Hola, necesito asesoramiento sobre productos de informática. ¿Podrían ayudarme?';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/595973345284?text=${encodedMessage}`, '_blank');
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
        <link rel="preconnect" href="https://cdn.zenn.com.py" crossOrigin="true" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
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

      <GlobalImagePreloader
        homeData={homeData}
        onPreloadComplete={() => setImagesPreloaded(true)}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white font-inter text-gray-800">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="relative bg-white shadow-xl overflow-hidden mt-0 md:mt-4"
        >
          <div className="w-full -mt-2 sm:mt-0">
            <BannerProduct />
          </div>
          <CategoryShowcase showcasePreviewsByCategory={showcasePreviewsByCategory} />
        </motion.div>

        <div className="sr-only">
          <h1>Zenn - Especialistas en Computadoras Gamer y Soluciones IT en Paraguay</h1>
          <p>
            En Zenn somos especialistas en tecnología en Paraguay. Ofrecemos la mejor selección de
            computadoras gamer, equipos de última generación, componentes de PC y soluciones
            informáticas completas para profesionales y entusiastas de la tecnología.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 space-y-8 sm:space-y-16 py-8 sm:py-16">
          <HomeDynamicSections
            sections={sections}
            slotProducts={slotProducts}
            loading={homeLoading}
          />

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
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
              />
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                Descubre nuestra selección de productos más recientes y exclusivos
              </p>
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
                  />
                </div>
                <Link
                  to={novedadesVerTodosHref}
                  className="text-sm font-semibold transition-all duration-300 flex items-center group/link"
                  style={{
                    background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  onClick={scrollTop}
                >
                  Ver todos{' '}
                  <FaAngleRight className="ml-1 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>

              <LatestProductsMix limit={20} />
            </div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
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
                />
                <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                  Trabajamos con las mejores marcas para ofrecerte la mejor calidad y garantía
                </p>
              </div>

              <div className="relative py-4">
                <BrandCarousel />
              </div>
            </div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            className="w-full"
          >
            <div
              className="relative overflow-hidden rounded-2xl shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
              }}
            >
              <div className="absolute inset-0 bg-pattern opacity-10" />
              <div className="relative z-10 px-6 py-12 sm:px-12 text-center sm:text-left">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div className="mb-6 sm:mb-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      ¿Necesitas ayuda para elegir?
                    </h2>
                    <p className="text-blue-100">
                      Nuestros expertos están listos para asesorarte y encontrar la solución perfecta
                      para ti.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={openWhatsApp}
                      className="px-6 py-3 bg-white text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center group/btn"
                    >
                      <svg
                        className="w-5 h-5 mr-2 group-hover/btn:scale-110 transition-transform duration-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      </svg>
                      Contactar Asesor
                    </button>
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

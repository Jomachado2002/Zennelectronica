// src/pages/CategoryProduct.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IoGridOutline, IoMenuOutline } from 'react-icons/io5';
import { BiX, BiFilter } from 'react-icons/bi';
import { FilterProvider, useFilters } from '../context/FilterContext';

import DesktopFilters from '../components/filters/DesktopFilters';
import SideDrawerFilters from '../components/filters/SideDrawerFilters';
import usePreloadedCategories from '../hooks/usePreloadedCategories';
import getSeoTitle from '../utils/getSeoTitle';
import { Helmet } from 'react-helmet';
import VerticalCard from '../components/VerticalCard';

// Hook para detectar dirección del scroll
const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      const direction = scrollY > lastScrollY ? "down" : "up";
      
      // Solo actualizar si hay un cambio significativo (más de 10px)
      if (Math.abs(scrollY - lastScrollY) > 10) {
        setScrollDirection(direction);
        
        // Mostrar/ocultar según la dirección del scroll
        if (direction === "down" && scrollY > 100) {
          setIsVisible(false);
        } else if (direction === "up") {
          setIsVisible(true);
        }
      }
      
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { scrollDirection, isVisible };
};

// Componente para filtros activos en línea
const InlineActiveFilters = ({ categories }) => {
  const { 
    filterCategoryList, 
    filterSubcategoryList, 
    filterBrands, 
    specFilters, 
    priceRange, 
    handleSelectCategory, 
    handleSelectSubcategory, 
    setFilterBrands, 
    handleSpecFilterChange,
    setPriceRange,
    clearAllFilters,
    hasActiveFilters
  } = useFilters();
  
  if (!hasActiveFilters()) return null;
  
  // Función para obtener etiqueta de especificación
  const getSpecificationLabel = (specKey) => {
    const labels = {
      // Notebooks
      processor: "Procesador",
      memory: "Memoria RAM",
      storage: "Almacenamiento",
      disk: "Disco",
      graphicsCard: "Tarjeta Gráfica",
      notebookScreen: "Pantalla",
      notebookBattery: "Batería",

      // Computadoras Ensambladas
      pcCase: "Gabinete",
      pcPowerSupply: "Fuente de Poder",
      pcCooling: "Sistema de Enfriamiento",

      // Placas Madre
      motherboardSocket: "Socket",
      motherboardChipset: "Chipset",
      motherboardFormFactor: "Factor de Forma",
      expansionSlots: "Slots de Expansión",

      // Memorias RAM
      ramText : "Categoria de Memoria",
      ramType: "Tipo de RAM",
      ramSpeed: "Velocidad",
      ramCapacity: "Capacidad",
      ramLatency: "Latencia",

      // Discos Duros
      hddCapacity: "Capacidad",
      diskType: "Tipo de Disco",
      hddInterface: "Interfaz",
      hddRPM: "RPM",
      diskReadSpeed: "Velocidad de Lectura",
      diskWriteSpeed: "Velocidad de Escritura",

      // Procesadores
      model: "Modelo",
      processorSocket: "Socket",
      processorCores: "Núcleos",
      processorThreads: "Hilos",
      processorBaseFreq: "Frecuencia Base",
      processorTurboFreq: "Frecuencia Turbo",
      processorCache: "Caché",
      processorTDP: "TDP",
      processorIntegratedGraphics: "Gráficos Integrados",
      processorManufacturingTech: "Tecnología de Fabricación",

      // Tarjetas Gráficas
      graphicCardModel: "Modelo",
      graphicCardMemory: "Memoria",
      graphicCardMemoryType: "Tipo de Memoria",
      graphicCardBaseFrequency: "Frecuencia Base",
      graphicfabricate: "Fabricante",
      graphicCardTDP: "Consumo (TDP)",

      // Gabinetes
      caseFormFactor: "Factor de Forma",
      caseMaterial: "Material",
      caseExpansionBays: "Bahías de Expansión",
      caseIncludedFans: "Ventiladores Incluidos",
      caseCoolingSupport: "Soporte de Refrigeración",
      caseBacklight: "Iluminación",

      // Fuentes de Alimentación
      psuWattage: "Vataje",
      psuEfficiency: "Eficiencia",
      psuModular: "Modularidad",
      psuFormFactor: "Factor de Forma",
      psuProtections: "Protecciones",

      // Monitores
      monitorSize: "Tamaño",
      monitorResolution: "Resolución",
      monitorRefreshRate: "Tasa de Refresco",
      monitorPanel: "Tipo de Panel",
      monitorConnectivity: "Conectividad",

      // Teclados
      keyboardInterface: "Interfaz",
      keyboardLayout: "Layout",
      keyboardBacklight: "Iluminación",
      keyboardSwitches: "Switches",
      keyboardFeatures: "Características",

      // Mouses
      mouseInterface: "Interfaz",
      mouseSensor: "Sensor",
      mouseDPI: "DPI",
      mouseButtons: "Botones",
      mouseBacklight: "Iluminación",

      // Adaptadores
      adapterType: "Tipo",
      adapterInterface: "Interfaz",
      adapterSpeed: "Velocidad",
      adapterProtocol: "Protocolo",

      // Auriculares
      headphoneConnectionType: "Tipo de Conexión",
      headphoneTechnology: "Tecnología de Conexión",
      headphoneFrequencyResponse: "Respuesta de Frecuencia",
      headphoneImpedance: "Impedancia",
      headphoneNoiseCancel: "Cancelación de Ruido",
      headphoneBatteryLife: "Duración de Batería",

      // Micrófonos
      microphoneType: "Tipo de Micrófono",
      microphonePolarPattern: "Patrón Polar",
      microphoneFrequencyRange: "Rango de Frecuencia",
      microphoneConnection: "Conexión",
      microphoneSpecialFeatures: "Características Especiales",

      // Cámaras de Seguridad
      cameraResolution: "Resolución",
      cameraLensType: "Tipo de Lente",
      cameraIRDistance: "Distancia IR",
      cameraType: "Tipo de Cámara",
      cameraConnectivity: "Conectividad",
      cameraProtection: "Protección",

      // DVR
      dvrChannels: "Canales",
      dvrResolution: "Resolución",
      dvrStorageCapacity: "Almacenamiento",
      dvrConnectivity: "Conectividad",
      dvrSmartFeatures: "Funciones Inteligentes",

      // NAS
      nasMaxCapacity: "Capacidad Máxima",
      nasBaysNumber: "Número de Bahías",
      nasProcessor: "Procesador",
      nasRAM: "Memoria RAM",
      nasRAIDSupport: "Tipos de RAID Soportados",
      nasConnectivity: "Conectividad",
      nasCapacity: "Capacidad",
      nasBays: "Bahías",
      nasRAID: "Soporte RAID",

      // Impresoras
      printerType: "Tipo",
      printerResolution: "Resolución",
      printerSpeed: "Velocidad",
      printerDuplex: "Impresión Dúplex",
      printerConnectivity: "Conectividad",
      printerTrayCapacity: "Capacidad de Bandeja",
      printerFunctions: "Funciones",
      printerDisplay: "Display",

      // Cartuchos/Toner
      tonerPrinterType: "Tipo de Impresora",
      tonerColor: "Color",
      tonerYield: "Rendimiento",
      tonerCartridgeType: "Tipo de Cartucho",
      tonerCompatibleModel: "Modelo Compatible",

      // UPS
      upsCapacity: "Capacidad",
      upsOutputPower: "Potencia de Salida",
      upsBackupTime: "Tiempo de Respaldo",
      upsOutlets: "Tomas",
      upsType: "Tipo",
      upsConnectivity: "Conectividad",

      // Accesorios
      airpodsModel: "Modelo",
      airpodsBatteryLife: "Duración de Batería",
      airpodsCharging: "Tipo de Carga",
      airpodsResistance: "Resistencia",
      airpodsFeatures: "Características",

      // Software y Licencias
      softwareLicenseType: "Tipo de Licencia",
      softwareLicenseDuration: "Duración",
      softwareLicenseQuantity: "Cantidad de Usuarios",
      softwareVersion: "Versión",
      softwareFeatures: "Características",

      // Telefonía - Móviles
      phoneType: "Color",
      phoneScreenSize: "Tamaño de Pantalla",
      phoneRAM: "RAM",
      phoneStorage: "Almacenamiento",
      phoneProcessor: "Procesador",
      phoneCameras: "Cámaras",
      phoneBattery: "Batería",
      phoneOS: "Sistema Operativo",

      // Telefonía - Fijos
      landlineType: "Tipo",
      landlineTechnology: "Tecnología",
      landlineDisplay: "Pantalla",
      landlineFunctions: "Funciones",
      landlineHandsets: "Auriculares",

      // Telefonía - Tablets
      tabletScreenSize: "Tamaño de Pantalla",
      tabletScreenResolution: "Resolución de Pantalla",
      tabletProcessor: "Procesador",
      tabletRAM: "Memoria RAM",
      tabletStorage: "Almacenamiento",
      tabletOS: "Sistema Operativo",
      tabletConnectivity: "Conectividad",

      // Redes - Switch
      switchType: "Tipo de Switch",
      switchPorts: "Número de Puertos",
      switchPortSpeed: "Velocidad de Puertos",
      switchNetworkLayer: "Capa de Red",
      switchCapacity: "Capacidad de Conmutación",

      // Redes - Servidores
      serverType: "Tipo de Servidor",
      serverProcessor: "Procesador",
      serverProcessorCount: "Número de Procesadores",
      serverRAM: "Memoria RAM",
      serverStorage: "Almacenamiento",
      serverOS: "Sistema Operativo",

      // Redes - Cables
      networkCableType: "Tipo de Cable",
      networkCableCategory: "Categoría",
      networkCableLength: "Longitud",
      networkCableShielding: "Blindaje",
      networkCableRecommendedUse: "Uso Recomendado",

      // Redes - Racks
      rackType: "Tipo de Rack",
      rackUnits: "Unidades de Rack (U)",
      rackDepth: "Profundidad",
      rackMaterial: "Material",
      rackLoadCapacity: "Capacidad de Carga",

      // Redes - Access Point
      apWiFiStandard: "Estándar WiFi",
      apSupportedBands: "Bandas Soportadas",
      apMaxSpeed: "Velocidad Máxima",
      apPorts: "Puertos",
      apAntennas: "Antenas",

      // Periféricos - Otros
      operatingSystem: "Sistema Operativo"
    };
    
    return labels[specKey] || specKey;
  };
  
  // Componente para chip de filtro
  const FilterChip = ({ label, onRemove }) => (
    <div className="inline-flex items-center bg-blue-100 rounded-full px-2 py-0.5 text-xs text-blue-800 mr-1.5 mb-1 border border-blue-200">
      <span className="mr-1">{label}</span>
      <button 
        onClick={onRemove} 
        className="text-blue-700 hover:text-blue-900 p-0.5 rounded-full"
        aria-label={`Eliminar filtro ${label}`}
      >
        <BiX className="text-sm" />
      </button>
    </div>
  );
  
  return (
    <div className="flex flex-wrap items-center">
      {/* Chips de filtros */}
      <div className="flex flex-wrap flex-grow">
        {categories && filterCategoryList.map(cat => {
          const category = categories.find(c => c.value === cat);
          return (
            <FilterChip 
              key={`cat-${cat}`} 
              label={`${category?.label || cat}`} 
              onRemove={() => handleSelectCategory(cat)} 
            />
          );
        })}
        
        {categories && filterSubcategoryList.map(sub => {
          let subcategoryLabel = sub;
          categories.forEach(cat => {
            const foundSub = cat.subcategories?.find(s => s.value === sub);
            if (foundSub) subcategoryLabel = foundSub.label;
          });
          return (
            <FilterChip 
              key={`sub-${sub}`} 
              label={subcategoryLabel} 
              onRemove={() => handleSelectSubcategory(sub)} 
            />
          );
        })}
        
        {filterBrands.map(brand => (
          <FilterChip 
            key={`brand-${brand}`} 
            label={brand} 
            onRemove={() => setFilterBrands(prev => prev.filter(b => b !== brand))} 
          />
        ))}
        
        {Object.entries(specFilters).map(([specKey, values]) => 
          values.map(value => (
            <FilterChip 
              key={`spec-${specKey}-${value}`} 
              label={`${getSpecificationLabel(specKey)}: ${value}`} 
              onRemove={() => handleSpecFilterChange(specKey, value)} 
            />
          ))
        )}
        
        {(priceRange.min || priceRange.max) && (
          <FilterChip 
            label={`Precio: ${priceRange.min || '0'} - ${priceRange.max || '∞'}`} 
            onRemove={() => setPriceRange({ min: '', max: '' })} 
          />
        )}
      </div>
      
      {/* Botón para limpiar todos los filtros */}
      <button 
        onClick={clearAllFilters}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium ml-2"
      >
        Limpiar todos
      </button>
    </div>
  );
};

// Componente interno que utiliza el contexto de filtros
const CategoryProductContent = () => {
  const { 
    data, 
    loading, 
    gridView, 
    setGridView,
    clearAllFilters,
    filterCount,
    setMobileFilterOpen
  } = useFilters();
  
  const location = useLocation();
  const { isVisible } = useScrollDirection();
  
  // Hook para categorías precargadas
  const { 
    getCategories, 
    getSubcategories, 
    getSpecifications, 
    loading: categoriesLoading 
  } = usePreloadedCategories();
  
  const categories = getCategories();
  
  // Configurar metadatos de SEO
  useEffect(() => {
    // Cambiar el título del documento para SEO
    const seoTitle = getSeoTitle(location, categories);
    document.title = `${seoTitle} | Zenn`;
    
    // Actualizar meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Compra online ${seoTitle.toLowerCase()} con garantía oficial. Envío a todo Paraguay. Precios competitivos y atención personalizada.`);
    }
  }, [location, categories]);

  return (
    <>
      {/* Barra de filtros con auto-hide */}
      <div 
        className={`sticky top-12 z-22 bg-white shadow-sm border-b border-gray-200 px-4 py-2 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="flex items-center w-full">
              {/* Botón de filtros móvil */}
              <button 
                className="lg:hidden flex items-center py-1.5 px-3 bg-[#002060] text-white text-sm rounded-lg shadow-sm mr-3 hover:bg-[#1565C0] transition-colors"
                onClick={() => setMobileFilterOpen(true)}
              >
                <BiFilter className="mr-1" />
                Filtros
                {filterCount > 0 && (
                  <span className="ml-1 px-1.5 bg-white text-[#002060] rounded-full text-xs">
                    {filterCount}
                  </span>
                )}
              </button>
              
              {/* Título de página reducido */}
              <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate flex-grow">
                {getSeoTitle(location, categories)}
              </h1>
            </div>
            
            {/* Filtros activos - Pasamos categories como prop */}
            <div className="w-full mt-2 sm:mt-0 sm:ml-4">
              <InlineActiveFilters categories={categories} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="container mx-auto px-4 pt-2">
        {/* Controles de visualización */}
        <div className="flex items-center justify-end mb-4">
          {/* Contador de resultados */}
          <span className="text-sm text-gray-600 mr-auto">
            {data.length} {data.length === 1 ? 'producto' : 'productos'}
          </span>
          
          {/* Botones de vista cuadrícula/lista (solo desktop) */}
          <div className="hidden lg:flex items-center bg-blue-50 rounded-lg p-1">
            <button 
              className={`p-2 rounded ${gridView ? 'bg-white shadow-sm text-[#002060]' : 'text-gray-600'}`}
              onClick={() => setGridView(true)}
              aria-label="Vista de cuadrícula"
            >
              <IoGridOutline size={20} />
            </button>
            <button 
              className={`p-2 rounded ${!gridView ? 'bg-white shadow-sm text-[#002060]' : 'text-gray-600'}`}
              onClick={() => setGridView(false)}
              aria-label="Vista de lista"
            >
              <IoMenuOutline size={20} />
            </button>
          </div>
        </div>

        {/* Contenido principal grid */}
        <div className="flex flex-col lg:flex-row lg:space-x-6">
          {/* Sidebar filtros (solo desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-150px)] overflow-y-auto bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <DesktopFilters 
                categories={categories} 
                categoriesLoading={categoriesLoading}
                getSubcategories={getSubcategories}
                getSpecifications={getSpecifications}
              />
            </div>
          </div>

          {/* Lista de productos - Incluye el drawer de filtros en móvil */}
          <div className="flex-grow relative mb-20">
            {/* Drawer lateral para filtros en móvil */}
            <SideDrawerFilters 
              categories={categories} 
              categoriesLoading={categoriesLoading}
              getSubcategories={getSubcategories}
              getSpecifications={getSpecifications}
            />
            
            {loading ? (
              <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002060] mb-3"></div>
                  <p className="text-gray-600">Cargando productos...</p>
                </div>
              </div>
            ) : data.length > 0 ? (
              <div className="transition-opacity duration-300" style={{ opacity: loading ? 0.5 : 1 }}>
                <VerticalCard data={data} loading={loading} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
                <div className="mb-4 text-gray-400">
                  <BiX size={48} className="mx-auto" />
                </div>
                <p className="text-lg text-gray-600 mb-4">No se encontraron productos con los filtros seleccionados</p>
                <button 
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#002060] text-white rounded-lg hover:bg-[#1565C0] transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Componente principal que envuelve todo con el proveedor de contexto
const CategoryProduct = () => {
  return (
    <>
    <Helmet>
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
    <FilterProvider>
      <CategoryProductContent />
    </FilterProvider>
  </>
  );
};

export default CategoryProduct;
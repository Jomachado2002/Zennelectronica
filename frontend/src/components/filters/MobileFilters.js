// src/components/filters/MobileFilters.js - Corregido para evitar la barra de navegación inferior

import React, { useRef, useEffect, useState } from 'react';
import { BiX, BiFilter, BiChevronDown, BiChevronUp, BiCheck } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useFilters } from '../../context/FilterContext'; // Ajustada la ruta a context sin 's'
import productCategory from '../../helpers/productCategory';

const MobileFilters = () => {
  const { 
    mobileFilterOpen, 
    setMobileFilterOpen, 
    activeMobileFilter, 
    setActiveMobileFilter,
    filterCategoryList,
    filterSubcategoryList,
    filterBrands,
    setFilterBrands,
    specFilters,
    priceRange, 
    tempPriceRange,
    sortBy,
    setSortBy,
    handleSelectCategory,
    handleSelectSubcategory,
    handleSpecFilterChange,
    handlePriceChange,
    applyPriceFilter,
    availableFilters,
    filterCount,
    clearAllFilters
  } = useFilters();
  
  const [searchBrand, setSearchBrand] = useState('');
  const [searchSpecification, setSearchSpecification] = useState('');
  const [expandedSpecs, setExpandedSpecs] = useState({});
  const mobileFilterRef = useRef(null);
  
  // Filtrar marcas por término de búsqueda
  const filteredBrands = availableFilters.brands.filter(brand => 
    brand.toLowerCase().includes(searchBrand.toLowerCase())
  );
  
  // Función para obtener etiqueta legible para la especificación
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
      phoneType: "Tipo",
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
  
  // Cerrar el filtro móvil al tocar fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(event.target)) {
        setMobileFilterOpen(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileFilterOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [setMobileFilterOpen]);
  
  // Renderizado del botón para abrir filtros en móvil - POSICIONADO PARA EVITAR LA BARRA INFERIOR
  const renderMobileFilterButton = () => (
    <button 
      className="lg:hidden fixed left-4 bottom-24 z-40 flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-full shadow-lg"
      onClick={() => setMobileFilterOpen(true)}
      style={{ minWidth: '120px' }}
    >
      <BiFilter className="mr-2" size={20} />
      Filtrar
      {filterCount > 0 && (
        <span className="ml-1 px-1.5 bg-white text-blue-800 rounded-full text-xs">
          {filterCount}
        </span>
      )}
    </button>
  );
  
  return (
    <>
      {/* Botón para abrir filtros - MODIFICADO para evitar la barra inferior */}
      {renderMobileFilterButton()}
      
      {/* Panel de filtros móvil - AJUSTADO PARA EVITAR LA BARRA INFERIOR */}
      <div 
        className={`fixed inset-0 z-50 ${mobileFilterOpen ? 'flex' : 'hidden'} flex-col`}
      >
        {/* Overlay para cerrar al tocar fuera del panel */}
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileFilterOpen(false)} />
        
        {/* Panel de filtro - Ahora respeta la barra inferior */}
        <div 
          ref={mobileFilterRef}
          className="absolute inset-x-0 top-0 bottom-16 flex flex-col bg-white z-10" // Ajustado bottom para evitar la barra inferior
        >
          {/* Cabecera del panel de filtros personalizado */}
          <div className="flex-shrink-0 bg-blue-600 text-white p-4 flex items-center justify-between shadow-md">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <button 
              onClick={() => setMobileFilterOpen(false)}
              className="p-2 rounded-full bg-blue-700 text-white hover:bg-blue-800"
              aria-label="Cerrar filtros"
            >
              <BiX size={24} />
            </button>
          </div>
          
          {/* Botones de categorías de filtro en pestañas */}
          <div className="flex-shrink-0 overflow-x-auto bg-white shadow-md border-b">
            <div className="flex p-3 space-x-2">
              <button 
                onClick={() => setActiveMobileFilter('categories')}
                className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-medium ${
                  activeMobileFilter === 'categories' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Categorías
                {(filterCategoryList.length || filterSubcategoryList.length) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-800 text-xs rounded-full">
                    {filterCategoryList.length + filterSubcategoryList.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveMobileFilter('price')}
                className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-medium ${
                  activeMobileFilter === 'price' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Precio
                {(priceRange.min || priceRange.max) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-800 text-xs rounded-full">
                    1
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveMobileFilter('brands')}
                className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-medium ${
                  activeMobileFilter === 'brands' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Marcas
                {filterBrands.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-800 text-xs rounded-full">
                    {filterBrands.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveMobileFilter('specs')}
                className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-medium ${
                  activeMobileFilter === 'specs' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Especificaciones
                {Object.values(specFilters).flat().length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-800 text-xs rounded-full">
                    {Object.values(specFilters).flat().length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveMobileFilter('sort')}
                className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-medium ${
                  activeMobileFilter === 'sort' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Ordenar
                {sortBy && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-800 text-xs rounded-full">
                    1
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Contenido del filtro con scroll independiente */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Categorías */}
            {activeMobileFilter === 'categories' && (
              <div>
                <h3 className="text-lg font-medium mb-3">Categorías</h3>
                <div className="space-y-2">
                  {productCategory.map((category) => (
                    <div key={category.value} className="mb-3">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div 
                          className={`flex items-center justify-between py-3 px-4 cursor-pointer ${
                            filterCategoryList.includes(category.value) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleSelectCategory(category.value)}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-3"
                              checked={filterCategoryList.includes(category.value)}
                              onChange={() => {}} // Manejado por onClick del div
                              id={`category-${category.value}`}
                            />
                            <label 
                              htmlFor={`category-${category.value}`} 
                              className="text-gray-800 font-medium cursor-pointer"
                            >
                              {category.label}
                            </label>
                          </div>
                        </div>
                        
                        {filterCategoryList.includes(category.value) && category.subcategories && (
                          <div className="border-t border-gray-100 bg-gray-50">
                            {category.subcategories.map((subcat) => (
                              <div 
                                key={subcat.value}
                                className="flex items-center py-3 px-4 border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-3"
                                  checked={filterSubcategoryList.includes(subcat.value)}
                                  onChange={() => handleSelectSubcategory(subcat.value)}
                                  id={`subcategory-${subcat.value}`}
                                />
                                <label 
                                  htmlFor={`subcategory-${subcat.value}`} 
                                  className="text-gray-700 cursor-pointer"
                                >
                                  {subcat.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Precio */}
            {activeMobileFilter === 'price' && (
              <div>
                <h3 className="text-lg font-medium mb-3">Rango de Precio</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  <div>
                    <label htmlFor="mobile-min-price" className="block text-sm text-gray-600 mb-1">Precio mínimo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Gs.</span>
                      <input
                        id="mobile-min-price"
                        type="text"
                        inputMode="numeric"
                        placeholder="Mínimo"
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm"
                        value={tempPriceRange.min}
                        onChange={(e) => handlePriceChange('min', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="mobile-max-price" className="block text-sm text-gray-600 mb-1">Precio máximo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Gs.</span>
                      <input
                        id="mobile-max-price"
                        type="text"
                        inputMode="numeric"
                        placeholder="Máximo"
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm"
                        value={tempPriceRange.max}
                        onChange={(e) => handlePriceChange('max', e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="w-full py-3 bg-blue-600 text-white text-md font-medium rounded-lg hover:bg-blue-700 transition"
                    onClick={applyPriceFilter}
                  >
                    Aplicar filtro de precio
                  </button>
                </div>
              </div>
            )}
            
            {/* Marcas */}
            {activeMobileFilter === 'brands' && (
              <div>
                <h3 className="text-lg font-medium mb-3">Marcas</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Buscar marca..."
                      className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm"
                      value={searchBrand}
                      onChange={(e) => setSearchBrand(e.target.value)}
                    />
                    <FiSearch className="absolute right-3 top-3.5 text-gray-400" />
                  </div>
                  
                  <div className="max-h-[40vh] overflow-y-auto bg-white rounded-lg">
                    {filteredBrands.length > 0 ? (
                      filteredBrands.map((brand) => (
                        <label key={brand} className="flex items-center py-3 px-3 border-b border-gray-100 last:border-b-0">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-3"
                            checked={filterBrands.includes(brand)}
                            onChange={() => {
                              const newBrands = filterBrands.includes(brand)
                                ? filterBrands.filter(b => b !== brand)
                                : [...filterBrands, brand];
                              setFilterBrands(newBrands);
                            }}
                            id={`brand-${brand}`}
                          />
                          <span className="text-gray-700">{brand}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-3 text-center">No se encontraron marcas</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Especificaciones - NUEVA VERSIÓN CON ACORDEÓN */}
            {activeMobileFilter === 'specs' && (
              <div>
                <h3 className="text-lg font-medium mb-3">Especificaciones</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Buscar especificación..."
                      className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm"
                      value={searchSpecification}
                      onChange={(e) => setSearchSpecification(e.target.value)}
                    />
                    <FiSearch className="absolute right-3 top-3.5 text-gray-400" />
                  </div>
                  
                  {Object.keys(availableFilters.specifications).length === 0 ? (
                    <p className="text-sm text-gray-500 py-2 text-center italic">
                      Selecciona una categoría para ver las especificaciones disponibles
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.keys(availableFilters.specifications)
                        .filter(key => getSpecificationLabel(key).toLowerCase().includes(searchSpecification.toLowerCase()))
                        .map(specKey => {
                          const hasActiveFilters = specFilters[specKey] && specFilters[specKey].length > 0;
                          
                          return (
                            <div key={specKey} className="border border-gray-200 rounded-md overflow-hidden">
                              <button 
                                onClick={() => {
                                  setExpandedSpecs(prev => ({
                                    ...prev,
                                    [specKey]: !prev[specKey]
                                  }));
                                }}
                                className={`w-full flex items-center justify-between p-3 text-left ${
                                  hasActiveFilters ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-gray-50 text-gray-800'
                                }`}
                              >
                                <span>{getSpecificationLabel(specKey)}</span>
                                {hasActiveFilters && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {specFilters[specKey].length}
                                  </span>
                                )}
                                <span className="ml-auto text-gray-500">
                                  {expandedSpecs[specKey] ? <BiChevronUp size={20} /> : <BiChevronDown size={20} />}
                                </span>
                              </button>
                              
                              {expandedSpecs[specKey] && (
                                <div className="p-3 border-t border-gray-100 bg-white">
                                  <div className="space-y-2">
                                    {availableFilters.specifications[specKey].map(value => (
                                      <label key={`${specKey}-${value}`} className="flex items-center py-2 px-2 rounded hover:bg-gray-50">
                                        <input
                                          type="checkbox"
                                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-3"
                                          checked={(specFilters[specKey] || []).includes(value)}
                                          onChange={() => handleSpecFilterChange(specKey, value)}
                                          id={`mobile-spec-${specKey}-${value}`}
                                        />
                                        <span className="text-sm text-gray-700">{value}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Ordenar */}
            {activeMobileFilter === 'sort' && (
              <div>
                <h3 className="text-lg font-medium mb-3">Ordenar por</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <label className="flex items-center py-3.5 px-4 cursor-pointer border-b border-gray-100">
                    <input
                      type="radio"
                      name="sortByMobile"
                      value="asc"
                      checked={sortBy === 'asc'}
                      onChange={() => setSortBy('asc')}
                      className="text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-gray-700">Precio: Menor a mayor</span>
                  </label>
                  <label className="flex items-center py-3.5 px-4 cursor-pointer border-b border-gray-100">
                    <input
                      type="radio"
                      name="sortByMobile"
                      value="dsc"
                      checked={sortBy === 'dsc'}
                      onChange={() => setSortBy('dsc')}
                      className="text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-gray-700">Precio: Mayor a menor</span>
                  </label>
                  <label className="flex items-center py-3.5 px-4 cursor-pointer">
                    <input
                      type="radio"
                      name="sortByMobile"
                      value=""
                      checked={!sortBy}
                      onChange={() => setSortBy('')}
                      className="text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-gray-700">Sin ordenar</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Pie del panel con botones de acción */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white shadow-inner">
            <div className="flex justify-between">
              <button
                onClick={clearAllFilters}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex-1 mr-2"
              >
                Limpiar filtros
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1 ml-2"
              >
                Ver {filterCount > 0 ? `(${filterCount} filtros)` : 'productos'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileFilters;
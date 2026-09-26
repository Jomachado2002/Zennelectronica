// src/components/filters/SideDrawerFilters.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BiX } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useFilters } from '../../context/FilterContext';
import productCategory from '../../helpers/productCategory';
import {
  getSortedTreeChildEntries,
  getTreeNodeAtPath,
  hasTreeChildren,
  isTreeLeaf,
  leafLabelFromStoredLabel,
  usableVisaoTree
} from '../../helpers/visaoNavigationTree';

const SideDrawerFilters = ({ 
  categories = [], 
  categoriesLoading = false,
  getSubcategories,
  getSpecifications,
  presentation = 'modal'
}) => {
  const isSidebar = presentation === 'sidebar';
  const { 
    mobileFilterOpen, 
    setMobileFilterOpen,
    desktopFilterOpen,
    setDesktopFilterOpen, 
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
    availableFilters,
    filterCount,
    clearAllFilters,
    data,
    loading,
    setPriceRange
  } = useFilters();
  
  const panelOpen = isSidebar ? desktopFilterOpen : mobileFilterOpen;
  const closePanel = useCallback(() => {
    if (isSidebar) setDesktopFilterOpen(false);
    else setMobileFilterOpen(false);
  }, [isSidebar, setDesktopFilterOpen, setMobileFilterOpen]);

  const [searchBrand, setSearchBrand] = useState('');
  const [searchSpecification, setSearchSpecification] = useState('');
  const drawerRef = useRef(null);
  const [expandedSpecs, setExpandedSpecs] = useState({});
  const [openSection, setOpenSection] = useState(null);
  const [categoryDrill, setCategoryDrill] = useState(null);
  
  // Obtener subcategorías para una categoría (datos precargados)
  const getSubcategoriesForCategory = useCallback((categoryValue) => {
    return getSubcategories ? getSubcategories(categoryValue) : [];
  }, [getSubcategories]);

  // Obtener especificaciones para una subcategoría (datos precargados)
  const getSpecificationsForSubcategory = useCallback((categoryValue, subcategoryValue) => {
    return getSpecifications ? getSpecifications(categoryValue, subcategoryValue) : [];
  }, [getSpecifications]);
  
  // Filtrar marcas por término de búsqueda
  const filteredBrands = availableFilters.brands.filter(brand => 
    brand.toLowerCase().includes(searchBrand.toLowerCase())
  );
  
  // Función eliminada - ya no se usa
  /*
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
  */
  
  // Cerrar el drawer al hacer clic en el overlay (30% derecho)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        closePanel();
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };
    
    if (panelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [panelOpen, closePanel]);

  useEffect(() => {
    if (!panelOpen) {
      setOpenSection(null);
      setExpandedSpecs({});
    }
  }, [panelOpen]);
  
  const categorySource = categories.length > 0 ? categories : productCategory;
  const drilledCategory = categoryDrill
    ? categorySource.find((category) => category.value === categoryDrill.value) || null
    : null;

  const toggleSection = (id) => {
    if (openSection === id) {
      setOpenSection(null);
      return;
    }
    if (id === 'categories') {
      const selected = filterCategoryList[0];
      setCategoryDrill(selected ? { value: selected, pathKeys: [] } : null);
    }
    setOpenSection(id);
  };

  const selectWholeCategory = (value) => {
    if (!filterCategoryList.includes(value)) {
      handleSelectCategory(value);
      return;
    }
    if (filterSubcategoryList.length > 0) {
      handleSelectSubcategory(filterSubcategoryList[0]);
      return;
    }
    handleSelectCategory(value);
  };

  const goCategoryBack = () => {
    if (!categoryDrill) return;
    if (categoryDrill.pathKeys.length > 0) {
      setCategoryDrill({
        value: categoryDrill.value,
        pathKeys: categoryDrill.pathKeys.slice(0, -1)
      });
      return;
    }
    setCategoryDrill(null);
  };

  const sortMeta = sortBy === 'asc' ? 'Menor precio' : sortBy === 'dsc' ? 'Mayor precio' : '';
  const priceMeta = (priceRange.min || priceRange.max)
    ? `Gs. ${priceRange.min || '0'} – ${priceRange.max || 'máx.'}`
    : '';
  const selectedCategory = categorySource.find((category) => category.value === filterCategoryList[0]);
  const categoryMeta = selectedCategory ? selectedCategory.label : '';
  const specCount = Object.values(specFilters).reduce((sum, values) => sum + (values?.length || 0), 0);
  const resultCount = Array.isArray(data) ? data.length : 0;

  const showResults = () => {
    setPriceRange(tempPriceRange);
    closePanel();
  };

  const specCatalog = [];
  if (filterCategoryList[0]) {
    const groups = filterSubcategoryList[0]
      ? [filterSubcategoryList[0]]
      : getSubcategoriesForCategory(filterCategoryList[0]).map((sub) => sub.value);
    const seen = new Set();
    groups.forEach((subValue) => {
      getSpecificationsForSubcategory(filterCategoryList[0], subValue).forEach((spec) => {
        if (!spec?.name || seen.has(spec.name)) return;
        seen.add(spec.name);
        specCatalog.push(spec);
      });
    });
  }

  const optionsForSpec = (specName) => {
    const fromApi = availableFilters.specifications?.[specName] || [];
    if (fromApi.length > 0) return fromApi;
    const values = new Set();
    (Array.isArray(data) ? data : []).forEach((product) => {
      const value = product?.[specName];
      if (value == null || String(value).trim() === '') return;
      values.add(String(value));
    });
    return [...values].sort((a, b) => a.localeCompare(b, 'es'));
  };

  const filteredSpecs = specCatalog.filter((spec) =>
    optionsForSpec(spec.name).length > 0 &&
    String(spec.label || spec.name || '').toLowerCase().includes(searchSpecification.toLowerCase())
  );

  let categoryOptions = [];
  if (drilledCategory && usableVisaoTree(drilledCategory.visaoNavigationTree)) {
    const node = getTreeNodeAtPath(drilledCategory.visaoNavigationTree, categoryDrill.pathKeys);
    categoryOptions = getSortedTreeChildEntries(node?.children).map(({ key, node: child }) => {
      if (hasTreeChildren(child)) {
        return {
          key,
          label: child.label,
          kind: 'folder',
          onOpen: () => setCategoryDrill({
            value: drilledCategory.value,
            pathKeys: [...categoryDrill.pathKeys, key]
          })
        };
      }
      if (isTreeLeaf(child)) {
        return {
          key,
          label: leafLabelFromStoredLabel(child.label),
          kind: 'leaf',
          checked: filterSubcategoryList.includes(child.subcategoryValue),
          onToggle: () => handleSelectSubcategory(child.subcategoryValue)
        };
      }
      return null;
    }).filter(Boolean);
  } else if (drilledCategory) {
    const liveSubs = categories.length > 0 ? getSubcategoriesForCategory(drilledCategory.value) : [];
    const fallbackSubs = productCategory.find((category) => category.value === drilledCategory.value)?.subcategories || [];
    categoryOptions = (liveSubs.length > 0 ? liveSubs : fallbackSubs).map((subcat) => ({
      key: subcat.value,
      label: leafLabelFromStoredLabel(subcat.label),
      kind: 'leaf',
      checked: filterSubcategoryList.includes(subcat.value),
      onToggle: () => handleSelectSubcategory(subcat.value)
    }));
  }

  return (
    <div
      className={`${isSidebar ? 'hidden lg:block' : 'lg:hidden'} fixed inset-0 z-[160] ${panelOpen ? '' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${isSidebar ? '' : 'hidden'} ${panelOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closePanel}
      />
      <div
        ref={drawerRef}
        className={`absolute left-0 top-0 h-full bg-white shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ${
          isSidebar ? 'w-[min(100%,380px)]' : 'w-full'
        } ${panelOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className="relative flex items-center justify-center h-14 px-12 flex-shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
        >
          <h2 className="text-[16px] font-semibold tracking-wide">Filtrar por</h2>
          <button
            type="button"
            onClick={closePanel}
            className="absolute right-2 w-10 h-10 flex items-center justify-center text-white"
            aria-label="Cerrar filtros"
          >
            <BiX size={26} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FilterSection
            title="Ordenar por"
            meta={sortMeta}
            open={openSection === 'sort'}
            onToggle={() => toggleSection('sort')}
          >
            {[
              { value: 'asc', label: 'Precio: menor a mayor' },
              { value: 'dsc', label: 'Precio: mayor a menor' },
              { value: '', label: 'Sin ordenar' }
            ].map((option) => (
              <label key={option.label} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                <input
                  type="radio"
                  name={`sortByDrawer-${isSidebar ? 'desktop' : 'mobile'}`}
                  value={option.value}
                  checked={sortBy === option.value}
                  onChange={() => setSortBy(option.value)}
                  className="h-4 w-4 text-[#7B2CBF] focus:ring-[#00B5D8]"
                />
                <span className="text-sm text-gray-800">{option.label}</span>
              </label>
            ))}
          </FilterSection>

          <FilterSection
            title="Precio"
            meta={priceMeta}
            open={openSection === 'price'}
            onToggle={() => toggleSection('price')}
          >
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Mínimo</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Gs.</span>
                  <input
                    id={`${isSidebar ? 'desktop' : 'mobile'}-min-price`}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-lg text-sm"
                    value={tempPriceRange.min}
                    onChange={(e) => handlePriceChange('min', e.target.value)}
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Máximo</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Gs.</span>
                  <input
                    id={`${isSidebar ? 'desktop' : 'mobile'}-max-price`}
                    type="text"
                    inputMode="numeric"
                    placeholder="Sin límite"
                    className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-lg text-sm"
                    value={tempPriceRange.max}
                    onChange={(e) => handlePriceChange('max', e.target.value)}
                  />
                </div>
              </label>
              <p className="text-xs text-gray-400">Se aplica al mostrar los artículos.</p>
            </div>
          </FilterSection>

          <FilterSection
            title="Marcas"
            meta={filterBrands.length > 0 ? String(filterBrands.length) : ''}
            open={openSection === 'brands'}
            onToggle={() => toggleSection('brands')}
          >
            <div className="relative mb-2">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar marca"
                className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-full text-sm"
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand) => (
                  <DrawerCheck
                    key={brand}
                    label={brand}
                    checked={filterBrands.includes(brand)}
                    onChange={() => {
                      const next = filterBrands.includes(brand)
                        ? filterBrands.filter((item) => item !== brand)
                        : [...filterBrands, brand];
                      setFilterBrands(next);
                    }}
                  />
                ))
              ) : (
                <p className="py-3 text-sm text-gray-500 text-center">No se encontraron marcas</p>
              )}
            </div>
          </FilterSection>

          <FilterSection
            title="Categoría"
            meta={categoryMeta}
            open={openSection === 'categories'}
            onToggle={() => toggleSection('categories')}
          >
            {categoriesLoading && categorySource.length === 0 ? (
              <p className="py-3 text-sm text-gray-500">Cargando categorías...</p>
            ) : !drilledCategory ? (
              categorySource.length > 0 ? (
                categorySource.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setCategoryDrill({ value: category.value, pathKeys: [] })}
                    className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left last:border-b-0"
                  >
                    <span className={`text-sm ${filterCategoryList.includes(category.value) ? 'font-semibold text-[#002060]' : 'text-gray-800'}`}>
                      {category.label}
                    </span>
                    <DrawerChevron />
                  </button>
                ))
              ) : (
                <p className="py-3 text-sm text-gray-500">No hay categorías disponibles</p>
              )
            ) : (
              <div>
                <button
                  type="button"
                  onClick={goCategoryBack}
                  className="mb-2 text-sm font-medium text-[#002060]"
                >
                  ← {categoryDrill.pathKeys.length > 0 ? 'Atrás' : 'Categorías'}
                </button>
                {categoryDrill.pathKeys.length === 0 && (
                  <DrawerCheck
                    label={`Todo ${drilledCategory.label}`}
                    checked={filterCategoryList.includes(drilledCategory.value) && filterSubcategoryList.length === 0}
                    onChange={() => selectWholeCategory(drilledCategory.value)}
                  />
                )}
                {categoryOptions.length > 0 ? (
                  categoryOptions.map((option) => (
                    option.kind === 'folder' ? (
                      <button
                        key={option.key}
                        type="button"
                        onClick={option.onOpen}
                        className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left"
                      >
                        <span className="text-sm text-gray-800">{option.label}</span>
                        <DrawerChevron />
                      </button>
                    ) : (
                      <DrawerCheck
                        key={option.key}
                        label={option.label}
                        checked={option.checked}
                        onChange={option.onToggle}
                      />
                    )
                  ))
                ) : (
                  <p className="py-3 text-sm text-gray-500">No hay subcategorías en este nivel</p>
                )}
              </div>
            )}
          </FilterSection>

          <FilterSection
            title="Especificaciones"
            meta={specCount > 0 ? String(specCount) : ''}
            open={openSection === 'specs'}
            onToggle={() => toggleSection('specs')}
          >
            {filteredSpecs.length === 0 ? (
              <p className="py-2 text-sm text-gray-500">
                {filterCategoryList.length === 0
                  ? 'Elegí una categoría para ver las especificaciones.'
                  : 'No hay especificaciones con valores en este listado.'}
              </p>
            ) : (
              <>
                <div className="relative mb-2">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Buscar especificación"
                    className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-full text-sm"
                    value={searchSpecification}
                    onChange={(e) => setSearchSpecification(e.target.value)}
                  />
                </div>
                {filteredSpecs.map((spec) => {
                  const activeCount = (specFilters[spec.name] || []).length;
                  const open = !!expandedSpecs[spec.name];
                  return (
                    <div key={spec.name} className="border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => setExpandedSpecs((prev) => ({ ...prev, [spec.name]: !prev[spec.name] }))}
                        className="w-full flex items-center justify-between py-3 text-left"
                      >
                        <span className="text-sm text-gray-800">
                          {spec.label || spec.name}
                          {activeCount > 0 ? (
                            <span className="ml-2 text-xs font-medium text-[#00B5D8]">{activeCount}</span>
                          ) : null}
                        </span>
                        <span className="text-lg font-light text-[#7B2CBF]" aria-hidden>{open ? '−' : '+'}</span>
                      </button>
                      {open && (
                        <div className="pb-2">
                          {optionsForSpec(spec.name).map((value) => (
                            <DrawerCheck
                              key={`${spec.name}-${value}`}
                              label={value}
                              checked={(specFilters[spec.name] || []).includes(value)}
                              onChange={() => handleSpecFilterChange(spec.name, value)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </FilterSection>
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white">
          {filterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="w-full mb-2 h-9 text-sm font-medium text-[#7B2CBF]"
            >
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            onClick={showResults}
            className="w-full h-12 rounded-full text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
          >
            {loading ? 'Cargando…' : `Mostrar ${resultCount} ${resultCount === 1 ? 'artículo' : 'artículos'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

function FilterSection({ title, meta, open, onToggle, children }) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#002060] pr-4">
          {title}
          {meta ? (
            <span className="ml-2 normal-case tracking-normal text-[11px] font-semibold text-[#7B2CBF] truncate max-w-[9rem] inline-block align-bottom">
              {meta}
            </span>
          ) : null}
        </span>
        <span className="text-2xl font-light leading-none text-[#7B2CBF]" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? <div className="px-5 pb-4">{children}</div> : null}
    </div>
  );
}

function DrawerCheck({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-[#7B2CBF] focus:ring-[#00B5D8]"
      />
      <span className="text-sm text-gray-800">{label}</span>
    </label>
  );
}

function DrawerChevron() {
  return (
    <svg className="w-4 h-4 text-[#7B2CBF] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default SideDrawerFilters;

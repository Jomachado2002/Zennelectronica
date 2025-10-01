// src/components/filters/DesktopFilters.js
import React, { useMemo, useState } from 'react';
import { BiSort } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useFilters } from '../../context/FilterContext';
import FilterAccordion from './FilterAccordion';
import FilterCheckbox from './FilterCheckbox';
import PriceFilterAccordion from './PriceFilterAccordion';
import SpecificationFilter from './SpecificationFilter';
import productCategory from '../../helpers/productCategory';

const DesktopFilters = () => {
  const { 
    filterCategoryList, 
    filterSubcategoryList, 
    filterBrands, 
    setFilterBrands,
    sortBy, 
    setSortBy, 
    handleSelectCategory, 
    handleSelectSubcategory,
    availableFilters,
    data,
    clearAllFilters,
    hasActiveFilters
  } = useFilters();
  
  const [searchBrand, setSearchBrand] = useState('');
  
  // Filtrar marcas por término de búsqueda
  const filteredBrands = useMemo(() => {
    return availableFilters.brands.filter(brand => 
      brand.toLowerCase().includes(searchBrand.toLowerCase())
    );
  }, [availableFilters.brands, searchBrand]);
  
  // Obtener etiqueta para especificación
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

     // Memormodelias RAM
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
  
  return (
    <div className="space-y-1">
      <div className="bg-blue-50 p-4 mb-4 rounded-lg border border-blue-100">
        <h2 className="text-lg font-semibold text-[#002060] mb-2">Filtros</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {data.length} {data.length === 1 ? 'producto encontrado' : 'productos encontrados'}
          </p>
          {hasActiveFilters() && (
            <button 
              onClick={clearAllFilters}
              className="text-xs text-[#1565C0] hover:text-[#0D47A1] hover:underline font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
      
      {/* Precio */}
      <PriceFilterAccordion />
      
      {/* Ordenar por */}
      <FilterAccordion
        id="sort"
        title="Ordenar por"
        icon={<BiSort />}
        count={sortBy ? 1 : 0}
      >
        <div className="px-1">
          <label className="flex items-center py-1.5 px-2 rounded hover:bg-blue-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="sortBy"
              value="asc"
              checked={sortBy === 'asc'}
              onChange={() => setSortBy('asc')}
              className="text-[#002060] focus:ring-[#1565C0]"
            />
            <span className="ml-2 text-sm text-gray-700">Precio: Menor a mayor</span>
          </label>
          <label className="flex items-center py-1.5 px-2 rounded hover:bg-blue-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="sortBy"
              value="dsc"
              checked={sortBy === 'dsc'}
              onChange={() => setSortBy('dsc')}
              className="text-[#002060] focus:ring-[#1565C0]"
            />
            <span className="ml-2 text-sm text-gray-700">Precio: Mayor a menor</span>
          </label>
        </div>
      </FilterAccordion>

      {/* Categorías */}
      <FilterAccordion
        id="categories"
        title="Categorías"
        count={filterCategoryList.length}
      >
        <div className="px-1 max-h-60 overflow-y-auto">
          {productCategory.map((category) => (
            <div key={category.value} className="mb-2">
              <FilterCheckbox
                label={category.label}
                checked={filterCategoryList.includes(category.value)}
                onChange={() => handleSelectCategory(category.value)}
                bold={true}
              />
              
              {filterCategoryList.includes(category.value) && category.subcategories && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-blue-200 pl-2">
                  {category.subcategories.map((subcat) => (
                    <FilterCheckbox
                      key={subcat.value}
                      label={subcat.label}
                      checked={filterSubcategoryList.includes(subcat.value)}
                      onChange={() => handleSelectSubcategory(subcat.value)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </FilterAccordion>

      {/* Marcas */}
      {availableFilters.brands && availableFilters.brands.length > 0 && (
        <FilterAccordion
          id="brands"
          title="Marcas"
          count={filterBrands.length}
        >
          <div className="px-1">
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Buscar marca..."
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
              />
              <FiSearch className="absolute right-3 top-2.5 text-gray-400" />
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded bg-white">
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand) => (
                  <FilterCheckbox
                    key={brand}
                    label={brand}
                    checked={filterBrands.includes(brand)}
                    onChange={() => {
                      const newBrands = filterBrands.includes(brand)
                        ? filterBrands.filter(b => b !== brand)
                        : [...filterBrands, brand];
                      setFilterBrands(newBrands);
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500 py-3 text-center">No se encontraron marcas</p>
              )}
            </div>
          </div>
        </FilterAccordion>
      )}
      
      {/* Especificaciones */}
      <div className="mt-4">
        <h3 className="text-md font-semibold text-[#002060] mb-2 border-b pb-2">Especificaciones</h3>
        {Object.keys(availableFilters.specifications).map(specKey => (
          <SpecificationFilter
            key={specKey}
            title={getSpecificationLabel(specKey)}
            specKey={specKey}
            options={availableFilters.specifications[specKey] || []}
          />
        ))}
        {Object.keys(availableFilters.specifications).length === 0 && (
          <p className="text-sm text-gray-500 py-2 text-center italic">
            Selecciona una categoría para ver las especificaciones disponibles
          </p>
        )}
      </div>
    </div>
  );
};

export default DesktopFilters;
// src/components/filters/ActiveFiltersBar.js
import React from 'react';
import { BiX } from 'react-icons/bi';
import { useFilters } from '../../context/FilterContext';
import productCategory from '../../helpers/productCategory';
import { model } from 'mongoose';

const ActiveFiltersBar = () => {
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
  
  // Función para obtener la etiqueta de la especificación
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
  
  // Componente para chip de filtro
  const FilterChip = ({ label, onRemove }) => (
    <div className="inline-flex items-center bg-blue-100 rounded-full px-3 py-1 text-sm text-blue-800 mr-2 mb-2 border border-blue-200 shadow-sm">
      <span className="mr-1 font-medium">{label}</span>
      <button 
        onClick={onRemove} 
        className="text-blue-700 hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5"
        aria-label={`Eliminar filtro ${label}`}
      >
        <BiX className="text-lg" />
      </button>
    </div>
  );
  
  return (
    <div className="mb-4 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-800">Filtros activos</h3>
        <button 
          onClick={clearAllFilters}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          Limpiar todos
        </button>
      </div>
      
      <div className="flex flex-wrap">
        {/* Chips de categorías */}
        {filterCategoryList.map(cat => {
          const category = productCategory.find(c => c.value === cat);
          return (
            <FilterChip 
              key={`cat-${cat}`} 
              label={`Categoría: ${category?.label || cat}`} 
              onRemove={() => handleSelectCategory(cat)} 
            />
          );
        })}
        
        {/* Chips de subcategorías */}
        {filterSubcategoryList.map(sub => {
          let subcategoryLabel = sub;
          productCategory.forEach(cat => {
            const foundSub = cat.subcategories?.find(s => s.value === sub);
            if (foundSub) subcategoryLabel = foundSub.label;
          });
          return (
            <FilterChip 
              key={`sub-${sub}`} 
              label={`Subcategoría: ${subcategoryLabel}`} 
              onRemove={() => handleSelectSubcategory(sub)} 
            />
          );
        })}
        
        {/* Chips de marcas */}
        {filterBrands.map(brand => (
          <FilterChip 
            key={`brand-${brand}`} 
            label={`Marca: ${brand}`} 
            onRemove={() => setFilterBrands(prev => prev.filter(b => b !== brand))} 
          />
        ))}
        
        {/* Chips de especificaciones */}
        {Object.entries(specFilters).map(([specKey, values]) => 
          values.map(value => (
            <FilterChip 
              key={`spec-${specKey}-${value}`} 
              label={`${getSpecificationLabel(specKey)}: ${value}`} 
              onRemove={() => handleSpecFilterChange(specKey, value)} 
            />
          ))
        )}
        
        {/* Chip de rango de precio */}
        {(priceRange.min || priceRange.max) && (
          <FilterChip 
            label={`Precio: ${priceRange.min ? `Gs. ${Number(priceRange.min).toLocaleString()}` : 'Gs. 0'} - ${priceRange.max ? `Gs. ${Number(priceRange.max).toLocaleString()}` : 'Sin límite'}`} 
            onRemove={() => setPriceRange({ min: '', max: '' })} 
          />
        )}
      </div>
    </div>
  );
};

export default ActiveFiltersBar;
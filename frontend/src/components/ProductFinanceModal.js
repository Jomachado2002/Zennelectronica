// frontend/src/components/ProductFinanceModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { IoIosClose } from "react-icons/io";
import { FaCalculator, FaChartLine } from "react-icons/fa";
import displayPYGCurrency from '../helpers/displayCurrency';
import SummaryApi from '../common';

// Este componente mejorado ofrece una vista más detallada de la gestión financiera
// con validaciones mejoradas y un análisis más completo

const ProductFinanceModal = ({ product, onClose, onUpdate }) => {
  const [data, setData] = useState({
    productId: product?._id || '',
    purchasePrice: product?.purchasePrice || '',
    loanInterest: product?.loanInterest || 0,
    deliveryCost: product?.deliveryCost || 0,
    sellingPrice: product?.sellingPrice || ''
  });

  const [summary, setSummary] = useState({
    totalCosts: 0,
    interestAmount: 0,
    profitAmount: 0,
    profitMargin: 0,
    breakEvenPoint: 0
  });

  const [activeTab, setActiveTab] = useState('prices');
  const [isLoading, setIsLoading] = useState(false);
  const [financeHistory, setFinanceHistory] = useState([]);
  const [hasFinanceData, setHasFinanceData] = useState(false);

  // Cargar datos históricos de finanzas si existen
  useEffect(() => {
    if (product?.purchasePrice) {
      setHasFinanceData(true);
    }
  }, [product]);

  // Calcular resumen financiero cuando cambian los datos
  useEffect(() => {
    if (data.purchasePrice && data.sellingPrice) {
      const purchase = Number(data.purchasePrice) || 0;
      const interest = Number(data.loanInterest) || 0;
      const delivery = Number(data.deliveryCost) || 0;
      const selling = Number(data.sellingPrice) || 0;

      // Calcular costos
      const interestAmount = purchase * (interest / 100);
      const totalCosts = purchase + interestAmount + delivery;
      
      // Calcular utilidad y margen
      const profitAmount = selling - totalCosts;
      const profitMargin = selling > 0 ? (profitAmount / selling) * 100 : 0;
      
      // Calcular punto de equilibrio (cantidad necesaria para cubrir costos)
      const breakEvenPoint = selling > 0 ? totalCosts / selling : 0;

      setSummary({
        totalCosts,
        interestAmount,
        profitAmount,
        profitMargin,
        breakEvenPoint
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones mejoradas
    if (Number(data.purchasePrice) <= 0) {
      toast.error("El precio de compra debe ser mayor que cero");
      return;
    }

    if (Number(data.sellingPrice) <= 0) {
      toast.error("El precio de venta debe ser mayor que cero");
      return;
    }

    if (Number(data.sellingPrice) < Number(data.purchasePrice)) {
      // Mostrar advertencia pero permitir continuar
      if (!window.confirm("El precio de venta es menor que el precio de compra, lo que resultará en pérdidas. ¿Desea continuar?")) {
        return;
      }
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/producto/finanzas`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Información financiera actualizada correctamente");
        if (onUpdate) onUpdate(result.data.product);
        onClose();
      } else {
        toast.error(result.message || "Error al actualizar la información financiera");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  // Opciones de decisión recomendadas basadas en el análisis
  const getRecommendations = () => {
    const recommendations = [];
    
    if (summary.profitMargin < 10) {
      recommendations.push("El margen de ganancia es bajo (menos del 10%). Considere aumentar el precio de venta o buscar reducir costos.");
    }
    
    if (summary.profitMargin > 50) {
      recommendations.push("El margen de ganancia es muy alto. Puede considerar estrategias de ventas más agresivas para aumentar el volumen.");
    }
    
    if (data.loanInterest > 15) {
      recommendations.push("Los intereses financieros son elevados. Considere buscar alternativas de financiación más económicas.");
    }
    
    if (data.deliveryCost > data.purchasePrice * 0.1) {
      recommendations.push("Los costos de envío representan más del 10% del precio de compra. Considere optimizar la logística.");
    }
    
    return recommendations;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Encabezado */}
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="font-bold text-xl text-gray-800 flex items-center">
            <FaCalculator className="mr-2 text-blue-600" />
            Gestión Financiera del Producto
          </h2>
          <button 
            className="text-3xl text-gray-600 hover:text-black transition-colors" 
            onClick={onClose}
          >
            <IoIosClose />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'prices' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
            onClick={() => setActiveTab('prices')}
          >
            Precios y Costos
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'analysis' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
            onClick={() => setActiveTab('analysis')}
          >
            Análisis
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* Info del producto */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-700">
              {product?.productName}
            </h3>
            <div className="text-sm text-gray-500 grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Categoría:</span> {product?.category} / {product?.subcategory}
              </div>
              <div>
                <span className="font-medium">Marca:</span> {product?.brandName}
              </div>
              {hasFinanceData && (
                <div className="col-span-2">
                  <span className="font-medium">Última actualización:</span> {product?.lastUpdatedFinance ? new Date(product.lastUpdatedFinance).toLocaleDateString() : 'No disponible'}
                </div>
              )}
            </div>
          </div>

          {activeTab === 'prices' && (
            <form onSubmit={handleSubmit}>
              {/* Formulario de precios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Compra (Costo) *
                  </label>
                  <input
                    type="number"
                    id="purchasePrice"
                    name="purchasePrice"
                    value={data.purchasePrice}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Precio de compra"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Venta *
                  </label>
                  <input
                    type="number"
                    id="sellingPrice"
                    name="sellingPrice"
                    value={data.sellingPrice}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Precio de venta"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="loanInterest" className="block text-sm font-medium text-gray-700 mb-1">
                    Interés sobre Préstamo (%)
                  </label>
                  <input
                    type="number"
                    id="loanInterest"
                    name="loanInterest"
                    value={data.loanInterest}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Porcentaje de interés"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div>
                  <label htmlFor="deliveryCost" className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de Envío
                  </label>
                  <input
                    type="number"
                    id="deliveryCost"
                    name="deliveryCost"
                    value={data.deliveryCost}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Costo de envío"
                    min="0"
                  />
                </div>
              </div>

              {/* Resumen de rentabilidad */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-blue-700 mb-2 flex items-center">
                  <FaChartLine className="mr-1" /> Resumen Financiero
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Costo base:</p>
                    <p className="font-semibold text-gray-800">{displayPYGCurrency(Number(data.purchasePrice) || 0)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Interés financiero:</p>
                    <p className="font-semibold text-gray-800">{displayPYGCurrency(summary.interestAmount)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Costo de envío:</p>
                    <p className="font-semibold text-gray-800">{displayPYGCurrency(Number(data.deliveryCost) || 0)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Costo total:</p>
                    <p className="font-semibold text-gray-800">{displayPYGCurrency(summary.totalCosts)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Precio de venta:</p>
                    <p className="font-semibold text-gray-800">{displayPYGCurrency(Number(data.sellingPrice) || 0)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Utilidad:</p>
                    <p className={`font-semibold ${summary.profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayPYGCurrency(summary.profitAmount)}
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-gray-600">Margen de ganancia:</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 mb-1">
                      <div 
                        className={`h-2.5 rounded-full ${
                          summary.profitMargin < 0 ? 'bg-red-600' :
                          summary.profitMargin < 10 ? 'bg-orange-500' :
                          summary.profitMargin < 20 ? 'bg-yellow-500' :
                          summary.profitMargin < 30 ? 'bg-green-500' : 'bg-blue-600'
                        }`} 
                        style={{ width: `${Math.max(0, Math.min(100, summary.profitMargin))}%` }}
                      ></div>
                    </div>
                    <p className={`font-semibold text-lg ${
                      summary.profitMargin < 0 ? 'text-red-600' :
                      summary.profitMargin < 10 ? 'text-orange-500' :
                      summary.profitMargin < 20 ? 'text-yellow-500' : 'text-green-600'
                    }`}>
                      {summary.profitMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    "Guardar Información"
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'analysis' && (
            <div>
              {/* Análisis detallado */}
              <div className="mb-6">
                <h4 className="font-semibold text-blue-700 mb-3">Análisis de Rentabilidad</h4>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Estructura de Costos</h5>
                    
                    {/* Gráfico de estructura de costos */}
                    <div className="relative h-6 bg-gray-200 rounded-lg overflow-hidden mb-2">
                      {summary.totalCosts > 0 && (
                        <>
                          <div 
                            className="absolute h-full bg-blue-500" 
                            style={{ width: `${(Number(data.purchasePrice) / summary.totalCosts) * 100}%` }}
                            title="Precio de compra"
                          ></div>
                          <div 
                            className="absolute h-full bg-purple-500" 
                            style={{ 
                              width: `${(summary.interestAmount / summary.totalCosts) * 100}%`,
                              left: `${(Number(data.purchasePrice) / summary.totalCosts) * 100}%`
                            }}
                            title="Intereses financieros"
                          ></div>
                          <div 
                            className="absolute h-full bg-indigo-500" 
                            style={{ 
                              width: `${(Number(data.deliveryCost) / summary.totalCosts) * 100}%`,
                              left: `${((Number(data.purchasePrice) + summary.interestAmount) / summary.totalCosts) * 100}%`
                            }}
                            title="Costo de envío"
                          ></div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 mr-1 rounded-sm"></div>
                        <span>Compra: {summary.totalCosts > 0 ? ((Number(data.purchasePrice) / summary.totalCosts) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-500 mr-1 rounded-sm"></div>
                        <span>Interés: {summary.totalCosts > 0 ? ((summary.interestAmount / summary.totalCosts) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-indigo-500 mr-1 rounded-sm"></div>
                        <span>Envío: {summary.totalCosts > 0 ? ((Number(data.deliveryCost) / summary.totalCosts) * 100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Punto de Equilibrio</h5>
                    <p className="text-sm text-gray-600 mb-1">
                      Para cubrir todos los costos, se necesita vender: 
                      <span className="font-semibold ml-1">
                        {summary.breakEvenPoint.toFixed(2)} unidades
                      </span>
                    </p>
                    {summary.breakEvenPoint > 1 && (
                      <p className="text-xs text-gray-500">Considera revisar los costos o el precio de venta para mejorar el punto de equilibrio.</p>
                    )}
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Recomendaciones</h5>
                    
                    {getRecommendations().length > 0 ? (
                      <ul className="text-sm space-y-1">
                        {getRecommendations().map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-1">•</span>
                            <span className="text-gray-600">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">
                        La estructura de precios actual parece equilibrada. Mantén un seguimiento periódico del mercado.
                      </p>
                    )}
                  </div>
                  
                  {summary.profitMargin < 0 && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-lg">
                      <h5 className="font-medium mb-1">¡Alerta! Pérdida potencial</h5>
                      <p className="text-sm">
                        Con el precio de venta actual, estás perdiendo {displayPYGCurrency(Math.abs(summary.profitAmount))} por unidad vendida.
                        Considera aumentar el precio o reducir costos.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductFinanceModal;
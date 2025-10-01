// frontend/src/components/admin/ProductFinanceForm.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { IoIosClose } from "react-icons/io";
import { FaCalculator, FaDollarSign, FaExchangeAlt } from "react-icons/fa";
import displayPYGCurrency from '../../helpers/displayCurrency';
import SummaryApi from '../../common';

const ProductFinanceForm = ({ product, onClose, onUpdate, exchangeRate }) => {
  // Valores predeterminados
  const DEFAULT_LOAN_INTEREST = 15;
  const DEFAULT_DELIVERY_COST = 10000;
  const DEFAULT_PROFIT_MARGIN = 10;

  // Estado para los datos del formulario
  const [data, setData] = useState({
    productId: product?._id || '',
    purchasePriceUSD: product?.purchasePriceUSD || '',  // Precio de compra en USD
    exchangeRate: exchangeRate || 8020, // Usar el tipo de cambio global o un valor predeterminado
    deliveryCost: product?.deliveryCost || 0,
    loanInterest: product?.loanInterest || 0,
    profitMargin: product?.profitMargin === 30 ? DEFAULT_PROFIT_MARGIN : (product?.profitMargin || DEFAULT_PROFIT_MARGIN),
    sellingPrice: product?.sellingPrice || '',
    userModifiedSellingPrice: false
  });

  // Estado para mostrar el resumen financiero
  const [summary, setSummary] = useState({
    purchasePricePYG: 0,    // Precio de compra en guaraníes (convertido)
    loanAmount: 0,          // Monto del interés de préstamo
    totalCosts: 0,          // Costos totales
    profitAmount: 0,        // Monto de ganancia
    profitMarginCalculated: 0 // Margen de ganancia calculado
  });

  const [isLoading, setIsLoading] = useState(false);
  
  // Aplicar valores predeterminados cuando los valores son 0 o no están definidos
  useEffect(() => {
    setData(prevData => ({
      ...prevData,
      // Si el interés es 0 o no está definido, usar el valor predeterminado
      loanInterest: !prevData.loanInterest || prevData.loanInterest <= 0 ? 
        DEFAULT_LOAN_INTEREST : prevData.loanInterest,
      
      // Si el costo de envío es 0 o no está definido, usar el valor predeterminado
      deliveryCost: !prevData.deliveryCost || prevData.deliveryCost <= 0 ? 
        DEFAULT_DELIVERY_COST : prevData.deliveryCost,
      
      // Si el margen de ganancia es 0 o no está definido, usar el valor predeterminado
      profitMargin: !prevData.profitMargin || prevData.profitMargin <= 0 ? 
        DEFAULT_PROFIT_MARGIN : prevData.profitMargin
    }));
  }, []);
  
  // Calcular el resumen financiero cuando cambian los datos
  useEffect(() => {
    if (data.purchasePriceUSD) {
      // Convertir el precio de compra USD a PYG
      const purchasePricePYG = Number(data.purchasePriceUSD) * Number(data.exchangeRate);
      
      // Calcular monto del interés de préstamo
      const loanAmount = purchasePricePYG * (Number(data.loanInterest) / 100);
      
      // Calcular costos totales (compra + envío + interés préstamo)
      const deliveryCost = Number(data.deliveryCost) || 0;
      const totalCosts = purchasePricePYG + loanAmount + deliveryCost;
      
      // Calcular precio de venta según margen de ganancia
      const profitMargin = Number(data.profitMargin) || 0;
      const profitMultiplier = 1 / (1 - (profitMargin / 100));
      const calculatedSellingPrice = totalCosts * profitMultiplier;
      
      // Si el usuario no ha modificado el precio de venta manualmente o el precio es 0, actualizar
      if (!data.userModifiedSellingPrice || !data.sellingPrice) {
        setData(prev => ({
          ...prev,
          sellingPrice: Math.round(calculatedSellingPrice)
        }));
      }
      
      // Calcular monto de ganancia
      const sellingPrice = Number(data.sellingPrice) || calculatedSellingPrice;
      const profitAmount = sellingPrice - totalCosts;
      
      // Calcular margen de ganancia real
      const profitMarginCalculated = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;
      
      // Actualizar resumen
      setSummary({
        purchasePricePYG,
        loanAmount,
        totalCosts,
        profitAmount,
        profitMarginCalculated
      });
    }
  }, [data]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambio en el precio de venta (marcarlo como modificado manualmente)
  const handleSellingPriceChange = (e) => {
    setData(prev => ({
      ...prev,
      sellingPrice: e.target.value,
      userModifiedSellingPrice: true
    }));
  };

  // Calcular el precio de venta basado en el margen de ganancia
  const calculateSellingPrice = () => {
    const purchasePricePYG = Number(data.purchasePriceUSD) * Number(data.exchangeRate);
    const loanAmount = purchasePricePYG * (Number(data.loanInterest) / 100);
    const deliveryCost = Number(data.deliveryCost) || 0;
    const totalCosts = purchasePricePYG + loanAmount + deliveryCost;
    
    const profitMargin = Number(data.profitMargin) || 0;
    const profitMultiplier = 1 / (1 - (profitMargin / 100));
    const calculatedSellingPrice = totalCosts * profitMultiplier;
    
    setData(prev => ({
      ...prev,
      sellingPrice: Math.round(calculatedSellingPrice),
      userModifiedSellingPrice: false
    }));
  };
  
  // Actualizar el exchangeRate si cambia en el componente padre
  useEffect(() => {
    setData(prev => ({
      ...prev,
      exchangeRate: exchangeRate
    }));
  }, [exchangeRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!data.purchasePriceUSD || !data.sellingPrice) {
      toast.error("Los precios de compra y venta son obligatorios");
      return;
    }

    try {
      setIsLoading(true);
      
      // Preparar datos para enviar al backend
      const dataToSend = {
        productId: data.productId,
        purchasePriceUSD: Number(data.purchasePriceUSD),
        exchangeRate: Number(data.exchangeRate),
        purchasePrice: summary.purchasePricePYG, // Enviar también el precio convertido a PYG
        loanInterest: Number(data.loanInterest),
        deliveryCost: Number(data.deliveryCost),
        profitMargin: Number(data.profitMargin),
        sellingPrice: Number(data.sellingPrice)
      };
      
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/producto/finanzas`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
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

  return (
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[200] overflow-y-auto max-h-[90vh]">
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

      <form onSubmit={handleSubmit} className="p-5">
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3 text-gray-700">
            {product?.productName}
          </h3>
          <p className="text-sm text-gray-500">
            Categoría: {product?.category} / {product?.subcategory}
          </p>
          <p className="text-sm text-gray-500 mb-3">
            Marca: {product?.brandName}
          </p>
        </div>

        {/* Formulario de precios con dólares */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="purchasePriceUSD" className="block text-sm font-medium text-gray-700 mb-1">
              Precio de Compra (USD)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                <FaDollarSign />
              </span>
              <input
                type="number"
                id="purchasePriceUSD"
                name="purchasePriceUSD"
                value={data.purchasePriceUSD}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Precio en dólares"
                required
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Equivale a: {displayPYGCurrency(summary.purchasePricePYG)}
            </p>
          </div>

          <div>
            <label htmlFor="exchangeRate" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Cambio (Gs por USD)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                <FaExchangeAlt />
              </span>
              <input
                type="number"
                id="exchangeRate"
                name="exchangeRate"
                value={data.exchangeRate}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Tasa de cambio actual"
                required
                min="1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valor global que puedes modificar en la pantalla principal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="deliveryCost" className="block text-sm font-medium text-gray-700 mb-1">
              Costo de Envío/Transportadora (Gs)
            </label>
            <input
              type="number"
              id="deliveryCost"
              name="deliveryCost"
              value={data.deliveryCost}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Costo de envío en guaraníes"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Valor predeterminado: {DEFAULT_DELIVERY_COST.toLocaleString()} Gs
            </p>
          </div>

          <div>
            <label htmlFor="loanInterest" className="block text-sm font-medium text-gray-700 mb-1">
              Interés de Préstamo (%)
            </label>
            <input
              type="number"
              id="loanInterest"
              name="loanInterest"
              value={data.loanInterest}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Porcentaje de interés de préstamo"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              Valor predeterminado: {DEFAULT_LOAN_INTEREST}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="profitMargin" className="block text-sm font-medium text-gray-700 mb-1">
              Margen de Ganancia (%)
            </label>
            <div className="flex">
              <input
                type="number"
                id="profitMargin"
                name="profitMargin"
                value={data.profitMargin}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Porcentaje de ganancia deseado"
                min="0"
                max="100"
                step="0.01"
              />
              <button
                type="button"
                onClick={calculateSellingPrice}
                className="px-4 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                title="Calcular precio de venta según margen"
              >
                Calcular
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valor predeterminado: {DEFAULT_PROFIT_MARGIN}%
            </p>
          </div>

          <div>
            <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Precio de Venta Final (Gs)
            </label>
            <input
              type="number"
              id="sellingPrice"
              name="sellingPrice"
              value={data.sellingPrice}
              onChange={handleSellingPriceChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Precio de venta"
              required
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              {data.userModifiedSellingPrice 
                ? "Precio modificado manualmente" 
                : "Precio calculado según margen"}
            </p>
          </div>
        </div>

        {/* Resumen de rentabilidad */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h4 className="font-semibold text-blue-700 mb-2">Resumen Financiero</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Costo en USD:</p>
              <p className="font-semibold text-gray-800">$ {Number(data.purchasePriceUSD).toFixed(2)}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Costo en guaraníes:</p>
              <p className="font-semibold text-gray-800">{displayPYGCurrency(summary.purchasePricePYG)}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Interés de préstamo:</p>
              <p className="font-semibold text-gray-800">{displayPYGCurrency(summary.loanAmount)}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Costo de envío:</p>
              <p className="font-semibold text-gray-800">{displayPYGCurrency(Number(data.deliveryCost))}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Costo total:</p>
              <p className="font-semibold text-gray-800">{displayPYGCurrency(summary.totalCosts)}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Utilidad:</p>
              <p className={`font-semibold ${summary.profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {displayPYGCurrency(summary.profitAmount)}
              </p>
            </div>
            
            <div className="col-span-2">
              <p className="text-gray-600">Margen de ganancia real:</p>
              <p className={`font-semibold text-lg ${summary.profitMarginCalculated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.profitMarginCalculated.toFixed(2)}%
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
    </div>
  );
};

export default ProductFinanceForm;
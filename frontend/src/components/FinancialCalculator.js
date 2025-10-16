// frontend/src/components/FinancialCalculator.js - CALCULADORA FINANCIERA MEJORADA
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaDollarSign, 
  FaCalculator, 
  FaTruck, 
  FaPercentage, 
  FaTag,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaSync
} from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';
import SummaryApi from '../common';
import { toast } from 'react-toastify';

const FinancialCalculator = ({ 
  data, 
  onDataChange, 
  mode = 'create' // 'create' o 'edit'
}) => {
  const [financialData, setFinancialData] = useState({
    purchasePriceUSD: data.purchasePriceUSD || 0,
    exchangeRate: data.exchangeRate || 7300,
    deliveryCost: data.deliveryCost || 0,
    loanInterest: data.loanInterest || 0,
    profitMargin: data.profitMargin || 30,
    sellingPrice: data.sellingPrice || 0,
    price: data.price || 0, // Precio anterior (para promociones)
    purchasePrice: data.purchasePrice || 0 // Precio de compra en PYG
  });

  const [manualSellingPrice, setManualSellingPrice] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState(7300);
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);

  // Función para obtener el tipo de cambio actual
  const fetchCurrentExchangeRate = useCallback(async () => {
    try {
      setIsLoadingExchangeRate(true);
      const response = await fetch(SummaryApi.exchangeRate.current.url);
      const data = await response.json();
      if (data.success) {
        setCurrentExchangeRate(data.data.rate);
        // Si no hay exchangeRate en los datos, usar el actual
        if (!financialData.exchangeRate || financialData.exchangeRate === 7300) {
          const newValue = data.data.rate;
          const updatedData = { ...financialData, exchangeRate: newValue };
          setFinancialData(updatedData);
          onDataChange(updatedData);
        }
      }
    } catch (error) {
      console.error('Error obteniendo tipo de cambio:', error);
      toast.error('Error al obtener el tipo de cambio actual');
    } finally {
      setIsLoadingExchangeRate(false);
    }
  }, [financialData, onDataChange]);

  // Efecto para obtener el tipo de cambio actual
  useEffect(() => {
    fetchCurrentExchangeRate();
  }, [fetchCurrentExchangeRate]);

  useEffect(() => {
    // Solo actualizar si los datos son diferentes para evitar loops infinitos
    const newFinancialData = {
      purchasePriceUSD: data.purchasePriceUSD || 0,
      exchangeRate: data.exchangeRate || 7300,
      deliveryCost: data.deliveryCost || 0,
      loanInterest: data.loanInterest || 0,
      profitMargin: data.profitMargin || 30,
      sellingPrice: data.sellingPrice || 0,
      price: data.price || 0,
      purchasePrice: data.purchasePrice || 0
    };

    // Solo calcular automáticamente si no hay sellingPrice y hay datos para calcularlo
    if (!data.sellingPrice && newFinancialData.purchasePriceUSD > 0 && !manualSellingPrice) {
      const purchasePricePYG = newFinancialData.purchasePriceUSD * newFinancialData.exchangeRate;
      const interestAmount = purchasePricePYG * (newFinancialData.loanInterest / 100);
      const totalCost = purchasePricePYG + interestAmount + newFinancialData.deliveryCost;
      const calculatedPrice = totalCost * (1 + newFinancialData.profitMargin / 100);
      newFinancialData.sellingPrice = calculatedPrice;
    }
    setFinancialData(newFinancialData);
  }, [data, manualSellingPrice]);

  // Cálculos financieros (igual que ProductFinanceModal)
  const purchasePricePYG = financialData.purchasePriceUSD * financialData.exchangeRate;
  const interestAmount = purchasePricePYG * (financialData.loanInterest / 100);
  const totalCost = purchasePricePYG + interestAmount + financialData.deliveryCost;
  const calculatedSellingPrice = totalCost * (1 + financialData.profitMargin / 100);
  const profitAmount = (manualSellingPrice ? financialData.sellingPrice : calculatedSellingPrice) - totalCost;
  const realProfitMargin = (manualSellingPrice ? financialData.sellingPrice : calculatedSellingPrice) > 0 ? (profitAmount / (manualSellingPrice ? financialData.sellingPrice : calculatedSellingPrice)) * 100 : 0;

  const handleFinancialChange = (field, value) => {
    // Permitir valores vacíos para edición
    const newValue = value === '' ? '' : (Number(value) || 0);
    const updatedData = { ...financialData, [field]: newValue };
    
    // Recalcular automáticamente el precio de venta si no está en modo manual
    if (!manualSellingPrice && field !== 'sellingPrice') {
      const purchasePricePYG = (updatedData.purchasePriceUSD || 0) * (updatedData.exchangeRate || 7300);
      const interestAmount = purchasePricePYG * ((updatedData.loanInterest || 0) / 100);
      const totalCost = purchasePricePYG + interestAmount + (updatedData.deliveryCost || 0);
      const calculatedSellingPrice = totalCost * (1 + (updatedData.profitMargin || 30) / 100);
      updatedData.sellingPrice = calculatedSellingPrice;
    }
    setFinancialData(updatedData);
    
    // Notificar cambios al componente padre solo con valores válidos
    const dataToSend = { ...updatedData };
    Object.keys(dataToSend).forEach(key => {
      if (dataToSend[key] === '') {
        dataToSend[key] = 0;
      }
    });
    onDataChange(dataToSend);
  };

  const toggleManualPrice = () => {
    setManualSellingPrice(!manualSellingPrice);
    if (!manualSellingPrice) {
      // Al activar modo manual, mantener el precio actual
      setFinancialData(prev => ({ ...prev, sellingPrice: prev.sellingPrice }));
    } else {
      // Al desactivar modo manual, recalcular basado en margen
      const newTotalCost = (financialData.purchasePriceUSD * financialData.exchangeRate) + financialData.deliveryCost;
      const newSellingPrice = newTotalCost * (1 + financialData.profitMargin / 100);
      const updatedData = { ...financialData, sellingPrice: newSellingPrice };
      setFinancialData(updatedData);
      onDataChange(updatedData);
    }
  };

  const InputField = ({ label, name, type = "number", value, onChange, placeholder = "0", icon: Icon, suffix = "", info = "" }) => {
    const handleInputChange = (e) => {
      const inputValue = e.target.value;
      onChange(name, inputValue);
    };

    return (
      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600" />}
          {label}
          {info && (
            <span className="ml-1 text-gray-400 cursor-help" title={info}>
              <FaInfoCircle className="w-3 h-3" />
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type={type}
            name={name}
            value={value || ''}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-all hover:border-gray-400"
            style={{ 
              pointerEvents: 'auto', 
              userSelect: 'text',
              WebkitAppearance: 'textfield',
              MozAppearance: 'textfield'
            }}
            autoComplete="off"
            step={type === "number" ? "0.01" : undefined}
            min={type === "number" ? "0" : undefined}
            onFocus={(e) => {
              e.target.select(); // Seleccionar todo el texto al hacer focus
            }}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <div className="flex items-center space-x-2">
        <FaCalculator className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Cálculo Financiero</h3>
      </div>

      {/* Campos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Precio en USD"
          name="purchasePriceUSD"
          value={financialData.purchasePriceUSD}
          onChange={handleFinancialChange}
          icon={FaDollarSign}
          suffix="USD"
          info="Precio de compra del producto en dólares"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Cambio (USD/PYG)
          </label>
          <div className="relative">
            <input
              type="number"
              name="exchangeRate"
              value={financialData.exchangeRate || currentExchangeRate}
              onChange={(e) => handleFinancialChange('exchangeRate', e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
              placeholder="Ej: 7600"
              step="1"
              min="0"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {isLoadingExchangeRate && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
              <button
                type="button"
                onClick={fetchCurrentExchangeRate}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Actualizar tipo de cambio"
              >
                <FaSync className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Tipo de cambio actual: {currentExchangeRate.toLocaleString()} Gs
          </p>
        </div>

        <InputField
          label="Interés sobre Préstamo"
          name="loanInterest"
          value={financialData.loanInterest}
          onChange={handleFinancialChange}
          icon={FaPercentage}
          suffix="%"
          info="Porcentaje de interés sobre el préstamo"
        />

        <InputField
          label="Costo de Envío/Transportadora"
          name="deliveryCost"
          value={financialData.deliveryCost}
          onChange={handleFinancialChange}
          icon={FaTruck}
          suffix="PYG"
          info="Costo adicional de envío"
        />

        <InputField
          label="Margen de Ganancia"
          name="profitMargin"
          value={financialData.profitMargin}
          onChange={handleFinancialChange}
          icon={FaPercentage}
          suffix="%"
          info="Porcentaje de ganancia deseado"
        />
      </div>

      {/* Precio de venta */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900">Precio de Venta Final</h4>
          <button
            type="button"
            onClick={toggleManualPrice}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              manualSellingPrice 
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {manualSellingPrice ? 'Modo Manual' : 'Automático'}
          </button>
        </div>

        <InputField
          label="Precio de Venta (Selling Price)"
          name="sellingPrice"
          value={financialData.sellingPrice}
          onChange={handleFinancialChange}
          icon={FaTag}
          suffix="PYG"
          info="Precio final de venta al cliente"
        />

        <InputField
          label="Precio Anterior (Price)"
          name="price"
          value={financialData.price}
          onChange={handleFinancialChange}
          icon={FaTag}
          suffix="PYG"
          info="Precio anterior para promociones (opcional)"
        />

        {!manualSellingPrice && (
          <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center">
              <FaInfoCircle className="w-4 h-4 mr-2 text-blue-600" />
              <span>Calculado automáticamente: {displayPYGCurrency(calculatedSellingPrice)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Precio anterior (para promociones) */}
      <div className="border-t pt-6">
        <InputField
          label="Precio Anterior (Opcional)"
          name="price"
          value={financialData.price}
          onChange={handleFinancialChange}
          icon={FaTag}
          suffix="PYG"
          info="Precio anterior para mostrar descuentos o promociones"
        />
      </div>

      {/* Resumen Financiero */}
      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <h4 className="text-md font-semibold text-gray-900 flex items-center">
          <FaCalculator className="w-4 h-4 mr-2 text-blue-600" />
          Resumen Financiero
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Costo base:</span>
              <span className="font-medium">{displayPYGCurrency(purchasePricePYG)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Interés sobre préstamo:</span>
              <span className="font-medium">{displayPYGCurrency(interestAmount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Costo de envío:</span>
              <span className="font-medium">{displayPYGCurrency(financialData.deliveryCost)}</span>
            </div>
            
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-medium text-gray-700">Costo total:</span>
              <span className="font-semibold">{displayPYGCurrency(totalCost)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Precio de venta:</span>
              <span className="font-medium">{displayPYGCurrency(manualSellingPrice ? financialData.sellingPrice : calculatedSellingPrice)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Utilidad:</span>
              <span className={`font-medium ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitAmount >= 0 ? <FaArrowUp className="w-3 h-3 inline mr-1" /> : <FaArrowDown className="w-3 h-3 inline mr-1" />}
                {displayPYGCurrency(Math.abs(profitAmount))}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Margen real:</span>
              <span className={`font-medium ${realProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {realProfitMargin.toFixed(2)}%
              </span>
            </div>

            {financialData.price > 0 && (
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm text-gray-600">Descuento:</span>
                <span className="font-medium text-orange-600">
                  -{displayPYGCurrency(financialData.price - (manualSellingPrice ? financialData.sellingPrice : calculatedSellingPrice))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialCalculator;

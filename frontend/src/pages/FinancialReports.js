// frontend/src/pages/FinancialReports.js
import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaDownload, FaFilter, FaUndo, FaChartLine, FaChartBar, FaChartPie, FaFileExcel, FaExchangeAlt, FaDollarSign, FaTruck, FaPercentage, FaMoneyBillWave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import displayPYGCurrency from '../helpers/displayCurrency';
import SummaryApi from '../common';
import productCategory from '../helpers/productCategory';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';

const FinancialReports = () => {
  const [activeTab, setActiveTab] = useState('margins');
  const [isLoading, setIsLoading] = useState(false);
  const [marginReport, setMarginReport] = useState({
    products: [],
    summary: null
  });
  const [profitabilityReport, setProfitabilityReport] = useState({
    overall: null,
    byCategory: [],
    bySubcategory: [],
    byBrand: []
  });
  
  // Nuevo estado para análisis de costos
  const [costAnalysisReport, setCostAnalysisReport] = useState({
    loanInterestSummary: null, // Resumen de intereses de préstamos
    deliveryCostSummary: null, // Resumen de costos de envío
    products: []
  });

  // Filtros
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    brandName: '',
    minMargin: '',
    maxMargin: '',
    minLoanInterest: '',
    maxLoanInterest: '',
    minDeliveryCost: '',
    maxDeliveryCost: '',
    sortBy: 'profitMargin',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  
  // Estado para el tipo de cambio actual
  const [currentExchangeRate, setCurrentExchangeRate] = useState(() => {
    return localStorage.getItem('exchangeRate') ? Number(localStorage.getItem('exchangeRate')) : 8020;
  });

  // Cargar categorías y subcategorías disponibles
  useEffect(() => {
    setAvailableCategories(productCategory);
    
    // Cargar el tipo de cambio desde localStorage
    const savedRate = localStorage.getItem('exchangeRate');
    if (savedRate) {
      setCurrentExchangeRate(Number(savedRate));
    }
  }, []);

  // Actualizar subcategorías cuando cambia la categoría seleccionada
  useEffect(() => {
    if (filters.category) {
      const category = availableCategories.find(c => c.value === filters.category);
      if (category && category.subcategories) {
        setAvailableSubcategories(category.subcategories);
      } else {
        setAvailableSubcategories([]);
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [filters.category, availableCategories]);

  // Cargar reportes
  useEffect(() => {
    if (activeTab === 'margins') {
      fetchMarginReport();
    } else if (activeTab === 'profitability') {
      fetchProfitabilityReport();
    } else if (activeTab === 'costAnalysis') {
      fetchCostAnalysisReport();
    }
  }, [activeTab]);
  
  // Detectar cambios en el tipo de cambio en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedRate = localStorage.getItem('exchangeRate');
      if (savedRate && Number(savedRate) !== currentExchangeRate) {
        setCurrentExchangeRate(Number(savedRate));
        
        // Si hay un cambio en el tipo de cambio, actualizar el reporte
        if (activeTab === 'margins') {
          fetchMarginReport();
        } else if (activeTab === 'profitability') {
          fetchProfitabilityReport();
        } else if (activeTab === 'costAnalysis') {
          fetchCostAnalysisReport();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeTab, currentExchangeRate]);

  const fetchMarginReport = async () => {
    try {
      setIsLoading(true);
      
      // Construir query params
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.subcategory) queryParams.append('subcategory', filters.subcategory);
      if (filters.brandName) queryParams.append('brandName', filters.brandName);
      if (filters.minMargin) queryParams.append('minMargin', filters.minMargin);
      if (filters.maxMargin) queryParams.append('maxMargin', filters.maxMargin);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      
      const url = `${SummaryApi.baseURL}/api/finanzas/reportes/margenes?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setMarginReport({
          products: result.data.products || [],
          summary: result.data.summary || null
        });
      } else {
        toast.error(result.message || "Error al cargar el reporte de márgenes");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfitabilityReport = async () => {
    try {
      setIsLoading(true);
      
      const url = `${SummaryApi.baseURL}/api/finanzas/reportes/rentabilidad`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setProfitabilityReport({
          overall: result.data.overall || null,
          byCategory: result.data.byCategory || [],
          bySubcategory: result.data.bySubcategory || [],
          byBrand: result.data.byBrand || []
        });
      } else {
        toast.error(result.message || "Error al cargar el reporte de rentabilidad");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Nueva función para obtener análisis de costos (intereses de préstamos y envío)
  const fetchCostAnalysisReport = async () => {
    try {
      setIsLoading(true);
      
      // Construir query params para filtros específicos
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.subcategory) queryParams.append('subcategory', filters.subcategory);
      if (filters.brandName) queryParams.append('brandName', filters.brandName);
      if (filters.minLoanInterest) queryParams.append('minLoanInterest', filters.minLoanInterest);
      if (filters.maxLoanInterest) queryParams.append('maxLoanInterest', filters.maxLoanInterest);
      if (filters.minDeliveryCost) queryParams.append('minDeliveryCost', filters.minDeliveryCost);
      if (filters.maxDeliveryCost) queryParams.append('maxDeliveryCost', filters.maxDeliveryCost);
      
      // Para esta demo, utilizaremos la misma API y procesaremos los datos en el frontend
      const url = `${SummaryApi.baseURL}/api/finanzas/reportes/margenes?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        // Procesamos datos para obtener análisis de costos
        const products = result.data.products || [];
        
        // Calculamos promedios y totales relacionados con intereses y envío
        let totalLoanInterest = 0;
        let totalDeliveryCost = 0;
        let totalLoanAmount = 0;
        let productsWithLoan = 0;
        let productsWithDelivery = 0;
        
        // Agrupamos datos por rangos de interés y envío
        const loanInterestRanges = {
          '0-5%': 0,
          '5-10%': 0,
          '10-15%': 0,
          '15-20%': 0,
          '20+%': 0
        };
        
        const deliveryCostRanges = {
          '0-5000': 0,
          '5001-10000': 0,
          '10001-20000': 0,
          '20001+': 0
        };
        
        products.forEach(product => {
          // Interés de préstamo
          if (product.loanInterest && product.loanInterest > 0) {
            totalLoanInterest += product.loanInterest;
            productsWithLoan++;
            
            // Calcular el monto de interés en PYG
            const loanAmount = product.purchasePrice * (product.loanInterest / 100);
            totalLoanAmount += loanAmount;
            
            // Agrupar por rango
            if (product.loanInterest <= 5) loanInterestRanges['0-5%']++;
            else if (product.loanInterest <= 10) loanInterestRanges['5-10%']++;
            else if (product.loanInterest <= 15) loanInterestRanges['10-15%']++;
            else if (product.loanInterest <= 20) loanInterestRanges['15-20%']++;
            else loanInterestRanges['20+%']++;
          }
          
          // Costo de envío
          if (product.deliveryCost && product.deliveryCost > 0) {
            totalDeliveryCost += product.deliveryCost;
            productsWithDelivery++;
            
            // Agrupar por rango
            if (product.deliveryCost <= 5000) deliveryCostRanges['0-5000']++;
            else if (product.deliveryCost <= 10000) deliveryCostRanges['5001-10000']++;
            else if (product.deliveryCost <= 20000) deliveryCostRanges['10001-20000']++;
            else deliveryCostRanges['20001+']++;
          }
        });
        
        setCostAnalysisReport({
          loanInterestSummary: {
            averageInterestRate: productsWithLoan > 0 ? totalLoanInterest / productsWithLoan : 0,
            totalLoanAmount: totalLoanAmount,
            productsWithLoan: productsWithLoan,
            loanInterestRanges: loanInterestRanges
          },
          deliveryCostSummary: {
            averageDeliveryCost: productsWithDelivery > 0 ? totalDeliveryCost / productsWithDelivery : 0,
            totalDeliveryCost: totalDeliveryCost,
            productsWithDelivery: productsWithDelivery,
            deliveryCostRanges: deliveryCostRanges
          },
          products: products
        });
      } else {
        toast.error(result.message || "Error al cargar el análisis de costos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    if (activeTab === 'margins') {
      fetchMarginReport();
    } else if (activeTab === 'costAnalysis') {
      fetchCostAnalysisReport();
    }
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      brandName: '',
      minMargin: '',
      maxMargin: '',
      minLoanInterest: '',
      maxLoanInterest: '',
      minDeliveryCost: '',
      maxDeliveryCost: '',
      sortBy: 'profitMargin',
      sortOrder: 'desc'
    });
  };

  const updateProductPrices = async () => {
    // Confirmar con el usuario
    if (!window.confirm(`¿Estás seguro de actualizar todos los precios al tipo de cambio actual (${currentExchangeRate} Gs)? Esta acción actualizará todos los productos.`)) {
      return;
    }
    
    setIsLoading(true);
    toast.info("Actualizando precios de todos los productos...");
    
    try {
      // Enviar solicitud para actualizar todos los precios
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/actualizarprecios`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify({ exchangeRate: currentExchangeRate })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Se han actualizado ${result.data.updatedCount} productos correctamente.`);
        // Recargar el reporte
        if (activeTab === 'margins') {
          fetchMarginReport();
        } else if (activeTab === 'profitability') {
          fetchProfitabilityReport();
        } else if (activeTab === 'costAnalysis') {
          fetchCostAnalysisReport();
        }
      } else {
        toast.error(result.message || "Error al actualizar los precios");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión al actualizar precios");
    } finally {
      setIsLoading(false);
    }
  };

  // Generar PDF del reporte de márgenes
  const generateMarginReportPDF = () => {
    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.text('Reporte de Márgenes de Ganancia', 14, 22);
      
      // Añadir fecha
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Resumen general
      if (marginReport.summary) {
        doc.setFontSize(14);
        doc.text('Resumen General', 14, 40);
        
        doc.setFontSize(10);
        doc.text(`Total de productos: ${marginReport.summary.totalProducts}`, 14, 48);
        doc.text(`Inversión total en USD: $${marginReport.summary.totalUSDPurchase.toFixed(2)}`, 14, 54);
        doc.text(`Tipo de cambio promedio: ${marginReport.summary.avgExchangeRate.toLocaleString()} Gs`, 14, 60);
        doc.text(`Ingresos totales: ${displayPYGCurrency(marginReport.summary.totalRevenue)}`, 14, 66);
        doc.text(`Costos totales: ${displayPYGCurrency(marginReport.summary.totalCost)}`, 14, 72);
        doc.text(`Utilidad total: ${displayPYGCurrency(marginReport.summary.totalProfit)}`, 14, 78);
        doc.text(`Margen promedio: ${parseFloat(marginReport.summary.averageMargin).toFixed(2)}%`, 14, 84);
        
        if (marginReport.summary.highestMargin.product) {
          doc.text(`Producto con mayor margen: ${marginReport.summary.highestMargin.product.productName} (${marginReport.summary.highestMargin.value.toFixed(2)}%)`, 14, 90);
        }
        
        if (marginReport.summary.lowestMargin.product) {
          doc.text(`Producto con menor margen: ${marginReport.summary.lowestMargin.product.productName} (${marginReport.summary.lowestMargin.value.toFixed(2)}%)`, 14, 96);
        }
      }
      
      // Tabla de productos
      if (marginReport.products.length > 0) {
        doc.setFontSize(14);
        doc.text('Detalle de Productos', 14, 106);
        
        // Datos para tabla
        const tableData = marginReport.products.map(product => [
          product.productName.substring(0, 20) + (product.productName.length > 20 ? '...' : ''),
          product.brandName,
          `$${product.purchasePriceUSD?.toFixed(2) || '0.00'}`,
          product.exchangeRate?.toLocaleString() || '-',
          displayPYGCurrency(product.purchasePrice).replace('Gs. ', ''),
          displayPYGCurrency(product.sellingPrice).replace('Gs. ', ''),
          `${parseFloat(product.profitMargin).toFixed(2)}%`,
          displayPYGCurrency(product.profitAmount).replace('Gs. ', '')
        ]);
        
        // Crear tabla
        doc.autoTable({
          startY: 112,
          head: [['Producto', 'Marca', 'USD', 'T.Cambio', 'Compra', 'Venta', 'Margen', 'Utilidad']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 32, 96] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 20 },
            2: { cellWidth: 15, halign: 'right' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 23, halign: 'right' },
            5: { cellWidth: 23, halign: 'right' },
            6: { cellWidth: 15, halign: 'right' },
            7: { cellWidth: 23, halign: 'right' }
          },
          margin: { left: 10, right: 10 }
        });
      }
      
      // Guardar PDF
      doc.save('reporte-margenes.pdf');
      
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  // Generar PDF del reporte de rentabilidad
  const generateProfitabilityReportPDF = () => {
    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.text('Reporte de Rentabilidad por Categoría', 14, 22);
      
      // Añadir fecha
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Tipo de cambio: ${currentExchangeRate.toLocaleString()} Gs`, 14, 36);
      
      // Resumen general
      if (profitabilityReport.overall) {
        doc.setFontSize(14);
        doc.text('Resumen General', 14, 46);
        
        doc.setFontSize(10);
        doc.text(`Total de productos: ${profitabilityReport.overall.totalProducts}`, 14, 54);
        doc.text(`Inversión total en USD: $${profitabilityReport.overall.totalUSDPurchase?.toFixed(2) || '0.00'}`, 14, 60);
        doc.text(`Tipo de cambio promedio: ${profitabilityReport.overall.avgExchangeRate?.toLocaleString() || currentExchangeRate.toLocaleString()} Gs`, 14, 66);
        doc.text(`Ingresos totales: ${displayPYGCurrency(profitabilityReport.overall.totalRevenue)}`, 14, 72);
        doc.text(`Costos totales: ${displayPYGCurrency(profitabilityReport.overall.totalCost)}`, 14, 78);
        doc.text(`Utilidad total: ${displayPYGCurrency(profitabilityReport.overall.totalProfit)}`, 14, 84);
        doc.text(`Margen promedio: ${parseFloat(profitabilityReport.overall.avgMargin).toFixed(2)}%`, 14, 90);
      }
      
      // Tabla de categorías
      if (profitabilityReport.byCategory.length > 0) {
        doc.setFontSize(14);
        doc.text('Rentabilidad por Categoría', 14, 100);
        
        // Datos para tabla
        const tableData = profitabilityReport.byCategory.map(cat => [
          cat.category,
          cat.totalProducts,
          `$${cat.totalUSDPurchase?.toFixed(2) || '0.00'}`,
          displayPYGCurrency(cat.totalRevenue).replace('Gs. ', ''),
          displayPYGCurrency(cat.totalProfit).replace('Gs. ', ''),
          `${parseFloat(cat.avgMargin).toFixed(2)}%`,
          `${parseFloat(cat.profitPercentage).toFixed(2)}%`
        ]);
        
        // Crear tabla
        doc.autoTable({
          startY: 106,
          head: [['Categoría', 'Productos', 'USD', 'Ingresos', 'Utilidad', 'Margen', 'Rentabilidad']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 32, 96] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
      }
      
      // Tabla de marcas (las 10 mejores)
      if (profitabilityReport.byBrand.length > 0) {
        const top10Brands = [...profitabilityReport.byBrand]
          .sort((a, b) => b.avgMargin - a.avgMargin)
          .slice(0, 10);
          
        // Obtener la posición Y después de la tabla anterior
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 150;
        
        doc.setFontSize(14);
        doc.text('Top 10 Marcas por Rentabilidad', 14, finalY);
        
        // Datos para tabla
        const tableData = top10Brands.map(brand => [
          brand.brand,
          brand.totalProducts,
          `$${brand.totalUSDPurchase?.toFixed(2) || '0.00'}`,
          displayPYGCurrency(brand.totalRevenue).replace('Gs. ', ''),
          displayPYGCurrency(brand.totalProfit).replace('Gs. ', ''),
          `${parseFloat(brand.avgMargin).toFixed(2)}%`
        ]);
        
        // Crear tabla
        doc.autoTable({
          startY: finalY + 6,
          head: [['Marca', 'Productos', 'USD', 'Ingresos', 'Utilidad', 'Margen']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 32, 96] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
      }
      
      // Guardar PDF
      doc.save('reporte-rentabilidad.pdf');
      
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };
  
  // Generar PDF del análisis de costos
  const generateCostAnalysisReportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.text('Análisis de Costos Financieros', 14, 22);
      
      // Añadir fecha
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Tipo de cambio: ${currentExchangeRate.toLocaleString()} Gs`, 14, 36);
      
      // Resumen de intereses de préstamos
      if (costAnalysisReport.loanInterestSummary) {
        doc.setFontSize(14);
        doc.text('Resumen de Intereses de Préstamos', 14, 46);
        
        doc.setFontSize(10);
        doc.text(`Tasa de interés promedio: ${costAnalysisReport.loanInterestSummary.averageInterestRate.toFixed(2)}%`, 14, 54);
        doc.text(`Monto total de intereses: ${displayPYGCurrency(costAnalysisReport.loanInterestSummary.totalLoanAmount)}`, 14, 60);
        doc.text(`Productos con interés: ${costAnalysisReport.loanInterestSummary.productsWithLoan}`, 14, 66);
        
        // Distribución de tasas de interés
        doc.text('Distribución de tasas de interés:', 14, 74);
        let yPos = 80;
        Object.entries(costAnalysisReport.loanInterestSummary.loanInterestRanges).forEach(([range, count]) => {
          doc.text(`${range}: ${count} producto(s)`, 20, yPos);
          yPos += 6;
        });
      }
      
      // Resumen de costos de envío
      if (costAnalysisReport.deliveryCostSummary) {
        doc.setFontSize(14);
        doc.text('Resumen de Costos de Envío', 14, 110);
        
        doc.setFontSize(10);
        doc.text(`Costo de envío promedio: ${displayPYGCurrency(costAnalysisReport.deliveryCostSummary.averageDeliveryCost)}`, 14, 118);
        doc.text(`Costo total de envíos: ${displayPYGCurrency(costAnalysisReport.deliveryCostSummary.totalDeliveryCost)}`, 14, 124);
        doc.text(`Productos con costo de envío: ${costAnalysisReport.deliveryCostSummary.productsWithDelivery}`, 14, 130);
        
        // Distribución de costos de envío
        doc.text('Distribución de costos de envío:', 14, 138);
        let yPos = 144;
        Object.entries(costAnalysisReport.deliveryCostSummary.deliveryCostRanges).forEach(([range, count]) => {
          doc.text(`${range} Gs: ${count} producto(s)`, 20, yPos);
          yPos += 6;
        });
      }
      
      // Tabla de productos con detalles de costos financieros
      if (costAnalysisReport.products.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Detalle de Costos Financieros por Producto', 14, 20);
        
        // Datos para tabla
        const tableData = costAnalysisReport.products.map(product => [
          product.productName.substring(0, 20) + (product.productName.length > 20 ? '...' : ''),
          `$${product.purchasePriceUSD?.toFixed(2) || '0.00'}`,
          displayPYGCurrency(product.purchasePrice).replace('Gs. ', ''),
          `${product.loanInterest?.toFixed(2) || '0'}%`,
          displayPYGCurrency(product.purchasePrice * (product.loanInterest / 100) || 0).replace('Gs. ', ''),
          displayPYGCurrency(product.deliveryCost || 0).replace('Gs. ', ''),
          displayPYGCurrency(product.sellingPrice).replace('Gs. ', '')
        ]);
        
        // Crear tabla
        doc.autoTable({
          startY: 26,
          head: [['Producto', 'USD', 'P. Compra', 'Interés %', 'Monto Interés', 'Envío', 'P. Venta']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 32, 96] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 10, right: 10 }
        });
      }
      
      // Guardar PDF
      doc.save('analisis-costos-financieros.pdf');
      
    } catch (error) {
      console.error("Error al generar PDF de análisis de costos:", error);
      toast.error("Error al generar el PDF");
    }
  };
  
  // Función para exportar a Excel
  const exportToExcel = (reportType) => {
    try {
      let data = [];
      let filename = '';
      let sheetName = '';
      
      // Preparar datos según el tipo de reporte
      if (reportType === 'margins') {
        // Preparar datos para el reporte de márgenes
        data = marginReport.products.map(product => ({
          'Producto': product.productName,
          'Marca': product.brandName,
          'Categoría': product.category,
          'Subcategoría': product.subcategory,
          'Precio Compra USD': product.purchasePriceUSD,
          'Tipo de Cambio': product.exchangeRate,
          'Precio Compra PYG': product.purchasePrice,
          'Interés Préstamo (%)': product.loanInterest,
          'Monto Interés': product.purchasePrice * (product.loanInterest / 100),
          'Costo Envío': product.deliveryCost,
          'Costos Totales': product.purchasePrice + (product.purchasePrice * (product.loanInterest / 100)) + product.deliveryCost,
          'Precio Venta': product.sellingPrice,
          'Margen (%)': product.profitMargin,
          'Utilidad': product.profitAmount
        }));
        
        filename = 'reporte-margenes.xlsx';
        sheetName = 'Márgenes de Ganancia';
        
        // Añadir resumen al principio
        if (marginReport.summary) {
          data.unshift({
            'Producto': 'RESUMEN',
            'Marca': '',
            'Categoría': '',
            'Subcategoría': '',
            'Precio Compra USD': marginReport.summary.totalUSDPurchase,
            'Tipo de Cambio': marginReport.summary.avgExchangeRate,
            'Precio Compra PYG': '',
            'Interés Préstamo (%)': '',
            'Monto Interés': '',
            'Costo Envío': '',
            'Costos Totales': marginReport.summary.totalCost,
            'Precio Venta': marginReport.summary.totalRevenue,
            'Margen (%)': marginReport.summary.averageMargin,
            'Utilidad': marginReport.summary.totalProfit
          });
        }
      } 
      else if (reportType === 'profitability') {
        // Preparar datos para el reporte de rentabilidad por categoría
        data = profitabilityReport.byCategory.map(category => ({
          'Categoría': category.category,
          'Productos': category.totalProducts,
          'Inversión USD': category.totalUSDPurchase,
          'Ingresos': category.totalRevenue,
          'Costos': category.totalCost,
          'Utilidad': category.totalProfit,
          'Margen Promedio (%)': category.avgMargin,
          'Rentabilidad (%)': category.profitPercentage
        }));
        
        // Añadir datos por marca
        const brandData = profitabilityReport.byBrand.map(brand => ({
          'Marca': brand.brand,
          'Productos': brand.totalProducts,
          'Inversión USD': brand.totalUSDPurchase,
          'Ingresos': brand.totalRevenue,
          'Costos': brand.totalCost,
          'Utilidad': brand.totalProfit,
          'Margen Promedio (%)': brand.avgMargin
        }));
        
        filename = 'reporte-rentabilidad.xlsx';
        sheetName = 'Rentabilidad por Categoría';
        
        // Añadir resumen al principio
        if (profitabilityReport.overall) {
          data.unshift({
            'Categoría': 'RESUMEN GENERAL',
            'Productos': profitabilityReport.overall.totalProducts,
            'Inversión USD': profitabilityReport.overall.totalUSDPurchase,
            'Ingresos': profitabilityReport.overall.totalRevenue,
            'Costos': profitabilityReport.overall.totalCost,
            'Utilidad': profitabilityReport.overall.totalProfit,
            'Margen Promedio (%)': profitabilityReport.overall.avgMargin,
            'Rentabilidad (%)': ''
          });
        }
      }
      else if (reportType === 'costAnalysis') {
        // Preparar datos para el análisis de costos
        data = costAnalysisReport.products.map(product => ({
          'Producto': product.productName,
          'Marca': product.brandName,
          'Categoría': product.category,
          'Precio Compra USD': product.purchasePriceUSD,
          'Tipo de Cambio': product.exchangeRate,
          'Precio Compra PYG': product.purchasePrice,
          'Interés Préstamo (%)': product.loanInterest,
          'Monto Interés': product.purchasePrice * (product.loanInterest / 100),
          'Costo Envío': product.deliveryCost,
          'Costos Totales': product.purchasePrice + (product.purchasePrice * (product.loanInterest / 100)) + product.deliveryCost,
          'Precio Venta': product.sellingPrice,
          'Utilidad': product.profitAmount
        }));
        
        filename = 'analisis-costos-financieros.xlsx';
        sheetName = 'Análisis de Costos';
        
        // Añadir resúmenes al principio
        if (costAnalysisReport.loanInterestSummary) {
          data.unshift({
            'Producto': 'RESUMEN INTERESES',
            'Marca': '',
            'Categoría': '',
            'Precio Compra USD': '',
            'Tipo de Cambio': '',
            'Precio Compra PYG': '',
            'Interés Préstamo (%)': costAnalysisReport.loanInterestSummary.averageInterestRate,
            'Monto Interés': costAnalysisReport.loanInterestSummary.totalLoanAmount,
            'Costo Envío': '',
            'Costos Totales': '',
            'Precio Venta': '',
            'Utilidad': ''
          });
        }
        
        if (costAnalysisReport.deliveryCostSummary) {
          data.unshift({
            'Producto': 'RESUMEN ENVÍOS',
            'Marca': '',
            'Categoría': '',
            'Precio Compra USD': '',
            'Tipo de Cambio': '',
            'Precio Compra PYG': '',
            'Interés Préstamo (%)': '',
            'Monto Interés': '',
            'Costo Envío': costAnalysisReport.deliveryCostSummary.totalDeliveryCost,
            'Costos Totales': '',
            'Precio Venta': '',
            'Utilidad': ''
          });
        }
      }
      
      // Crear libro de Excel y hoja
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Añadir hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Guardar archivo
      XLSX.writeFile(wb, filename);
      
      toast.success(`Reporte exportado como ${filename}`);
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast.error("Error al exportar el reporte a Excel");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Reportes Financieros</h1>
      
      {/* Tabs de navegación */}
      <div className="mb-6 flex border-b">
        <button
          className={`py-2 px-4 font-medium flex items-center ${
            activeTab === 'margins'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-blue-500'
          }`}
          onClick={() => setActiveTab('margins')}
        >
          <FaChartLine className="mr-2" /> Márgenes de Ganancia
        </button>
        <button
          className={`py-2 px-4 font-medium flex items-center ${
            activeTab === 'profitability'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-blue-500'
          }`}
          onClick={() => setActiveTab('profitability')}
        >
          <FaChartBar className="mr-2" /> Rentabilidad por Categoría
        </button>
        <button
          className={`py-2 px-4 font-medium flex items-center ${
            activeTab === 'costAnalysis'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-blue-500'
          }`}
          onClick={() => setActiveTab('costAnalysis')}
        >
          <FaMoneyBillWave className="mr-2" /> Análisis de Costos
        </button>
      </div>

      {/* Tipo de cambio actual y actualización global */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="font-semibold mb-1">Tipo de Cambio Actual</h3>
            <p className="text-xl font-bold">{currentExchangeRate.toLocaleString()} Gs por USD</p>
          </div>
          <div className="mt-3 md:mt-0">
            <button
              onClick={updateProductPrices}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </>
              ) : (
                <>Actualizar Todos los Precios</>
              )}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Este botón actualizará todos los precios de compra en guaraníes usando el tipo de cambio actual.
          Puedes cambiar el tipo de cambio en la pantalla de "Todos los productos".
        </p>
      </div>
      
      {/* Contenido del tab activo */}
      {activeTab === 'margins' && (
        <div>
          {/* Barra de acciones */}
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Análisis de Márgenes de Ganancia</h2>
            
            <div className="flex flex-wrap gap-2">
              <button
                className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg flex items-center hover:bg-blue-100"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter className="mr-2" /> {showFilters ? 'Ocultar filtros' : 'Filtrar'}
              </button>
              
              <button
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg flex items-center hover:bg-green-100"
                onClick={generateMarginReportPDF}
              >
                <FaDownload className="mr-2" /> Exportar PDF
              </button>
              
              <button
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg flex items-center hover:bg-green-100"
                onClick={() => exportToExcel('margins')}
              >
                <FaFileExcel className="mr-2" /> Exportar Excel
              </button>
            </div>
          </div>
          
          {/* Filtros */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Filtro por categoría */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Todas las categorías</option>
                    {availableCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro por subcategoría */}
                {filters.category && (
                  <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategoría
                    </label>
                    <select
                      id="subcategory"
                      name="subcategory"
                      value={filters.subcategory}
                      onChange={handleFilterChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Todas las subcategorías</option>
                      {availableSubcategories.map(subcat => (
                        <option key={subcat.value} value={subcat.value}>{subcat.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Filtro por margen mínimo */}
                <div>
                  <label htmlFor="minMargin" className="block text-sm font-medium text-gray-700 mb-1">
                    Margen mínimo (%)
                  </label>
                  <input
                    type="number"
                    id="minMargin"
                    name="minMargin"
                    value={filters.minMargin}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 10"
                    min="0"
                    max="100"
                  />
                </div>
                
                {/* Filtro por margen máximo */}
                <div>
                  <label htmlFor="maxMargin" className="block text-sm font-medium text-gray-700 mb-1">
                    Margen máximo (%)
                  </label>
                  <input
                    type="number"
                    id="maxMargin"
                    name="maxMargin"
                    value={filters.maxMargin}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 50"
                    min="0"
                    max="100"
                  />
                </div>
                
                {/* Ordenar por */}
                <div>
                  <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                    Ordenar por
                  </label>
                  <select
                    id="sortBy"
                    name="sortBy"
                    value={filters.sortBy}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="profitMargin">Margen de ganancia</option>
                    <option value="profitAmount">Utilidad</option>
                    <option value="sellingPrice">Precio de venta</option>
                    <option value="purchasePriceUSD">Precio de compra USD</option>
                  </select>
                </div>
                
                {/* Dirección de ordenamiento */}
                <div>
                  <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <select
                    id="sortOrder"
                    name="sortOrder"
                    value={filters.sortOrder}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="desc">Mayor a menor</option>
                    <option value="asc">Menor a mayor</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center"
                >
                  <FaUndo className="mr-2" /> Restablecer
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
          
          {/* Resumen del reporte de márgenes con info en USD */}
          {marginReport.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-500">Total de productos</p>
                <p className="text-2xl font-bold">{marginReport.summary.totalProducts}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-500">Inversión total en USD</p>
                <p className="text-2xl font-bold">$ {marginReport.summary.totalUSDPurchase?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
                <p className="text-xs text-gray-500">Tipo de cambio promedio: {marginReport.summary.avgExchangeRate?.toLocaleString() || currentExchangeRate.toLocaleString()} Gs</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-500">Utilidad total</p>
                <p className="text-2xl font-bold">{displayPYGCurrency(marginReport.summary.totalProfit)}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-500">Margen promedio</p>
                <p className="text-2xl font-bold">{parseFloat(marginReport.summary.averageMargin).toFixed(2)}%</p>
              </div>
            </div>
          )}
          
         {/* Tabla de productos actualizada para incluir información en USD */}
         <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Compra USD</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">T. Cambio</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Compra PYG</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Venta</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margen</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Utilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                      Cargando...
                    </td>
                  </tr>
                ) : marginReport.products.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  marginReport.products.map((product, index) => (
                    <tr key={product._id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-800">{product.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.brandName}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">$ {product.purchasePriceUSD?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{product.exchangeRate?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(product.purchasePrice)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(product.sellingPrice)}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${
                        product.profitMargin < 0 ? 'text-red-600' : 
                        product.profitMargin < 10 ? 'text-yellow-600' : 
                        product.profitMargin < 20 ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {parseFloat(product.profitMargin).toFixed(2)}%
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${
                        product.profitAmount < 0 ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {displayPYGCurrency(product.profitAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'profitability' && (
        <div>
          {/* Barra de acciones */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Análisis de Rentabilidad por Categoría</h2>
            
            <div className="flex gap-2">
              <button
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg flex items-center hover:bg-green-100"
                onClick={generateProfitabilityReportPDF}
              >
                <FaDownload className="mr-2" /> Exportar PDF
              </button>
              
              <button
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg flex items-center hover:bg-green-100"
                onClick={() => exportToExcel('profitability')}
              >
                <FaFileExcel className="mr-2" /> Exportar Excel
              </button>
            </div>
          </div>
          
          {/* Resumen general */}
          {profitabilityReport.overall && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold mb-4">Resumen General</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total de productos</p>
                  <p className="text-2xl font-bold">{profitabilityReport.overall.totalProducts}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Inversión total USD</p>
                  <p className="text-xl font-bold">$ {profitabilityReport.overall.totalUSDPurchase?.toFixed(2) || '0.00'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Ingresos totales</p>
                  <p className="text-2xl font-bold">{displayPYGCurrency(profitabilityReport.overall.totalRevenue)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Utilidad total</p>
                  <p className="text-2xl font-bold">{displayPYGCurrency(profitabilityReport.overall.totalProfit)}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-500">Margen promedio</p>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-1">
                  <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{ width: `${Math.min(Math.max(profitabilityReport.overall.avgMargin, 0), 100)}%` }}
                  ></div>
                </div>
                <p className="text-right mt-1 text-sm font-medium">{profitabilityReport.overall.avgMargin.toFixed(2)}%</p>
              </div>
            </div>
          )}
          
          {/* Rentabilidad por categoría */}
          {profitabilityReport.byCategory.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold mb-4">Rentabilidad por Categoría</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">USD Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Utilidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-4 text-center text-gray-500">
                          Cargando...
                        </td>
                      </tr>
                    ) : profitabilityReport.byCategory.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-4 text-center text-gray-500">
                          No se encontraron categorías.
                        </td>
                      </tr>
                    ) : (
                      profitabilityReport.byCategory.map((category, index) => (
                        <tr key={category.category || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-800">{category.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{category.totalProducts}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-right">$ {category.totalUSDPurchase?.toFixed(2) || '0.00'}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(category.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(category.totalCost)}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(category.totalProfit)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-right text-blue-600">
                            {parseFloat(category.avgMargin).toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top 10 Marcas por Rentabilidad */}
          {profitabilityReport.byBrand.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Top 10 Marcas por Rentabilidad</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">USD Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Utilidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                          Cargando...
                        </td>
                      </tr>
                    ) : (
                      [...profitabilityReport.byBrand]
                        .sort((a, b) => b.avgMargin - a.avgMargin)
                        .slice(0, 10)
                        .map((brand, index) => (
                          <tr key={brand.brand || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-800">{brand.brand}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{brand.totalProducts}</td>
                            <td className="px-4 py-3 text-sm text-gray-800 text-right">$ {brand.totalUSDPurchase?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(brand.totalRevenue)}</td>
                            <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(brand.totalProfit)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-right text-blue-600">
                              {parseFloat(brand.avgMargin).toFixed(2)}%
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Tab de Análisis de Costos */}
      {activeTab === 'costAnalysis' && (
        <div>
          {/* Barra de acciones */}
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Análisis de Costos Financieros</h2>
            
            <div className="flex flex-wrap gap-2">
              <button
                className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg flex items-center hover:bg-blue-100"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter className="mr-2" /> {showFilters ? 'Ocultar filtros' : 'Filtrar'}
              </button>
              
              <button
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg flex items-center hover:bg-green-100"
                onClick={generateCostAnalysisReportPDF}
              >
                <FaDownload className="mr-2" /> Exportar PDF
              </button>
              
              <button
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg flex items-center hover:bg-green-100"
                onClick={() => exportToExcel('costAnalysis')}
              >
                <FaFileExcel className="mr-2" /> Exportar Excel
              </button>
            </div>
          </div>
          
          {/* Filtros específicos para análisis de costos */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Filtro por categoría */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Todas las categorías</option>
                    {availableCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro por subcategoría */}
                {filters.category && (
                  <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategoría
                    </label>
                    <select
                      id="subcategory"
                      name="subcategory"
                      value={filters.subcategory}
                      onChange={handleFilterChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Todas las subcategorías</option>
                      {availableSubcategories.map(subcat => (
                        <option key={subcat.value} value={subcat.value}>{subcat.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Filtro por interés de préstamo mínimo */}
                <div>
                  <label htmlFor="minLoanInterest" className="block text-sm font-medium text-gray-700 mb-1">
                    Interés mínimo (%)
                  </label>
                  <input
                    type="number"
                    id="minLoanInterest"
                    name="minLoanInterest"
                    value={filters.minLoanInterest}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 5"
                    min="0"
                    max="100"
                  />
                </div>
                
                {/* Filtro por interés de préstamo máximo */}
                <div>
                  <label htmlFor="maxLoanInterest" className="block text-sm font-medium text-gray-700 mb-1">
                    Interés máximo (%)
                  </label>
                  <input
                    type="number"
                    id="maxLoanInterest"
                    name="maxLoanInterest"
                    value={filters.maxLoanInterest}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 30"
                    min="0"
                    max="100"
                  />
                </div>
                
                {/* Filtro por costo de envío mínimo */}
                <div>
                  <label htmlFor="minDeliveryCost" className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de envío mínimo
                  </label>
                  <input
                    type="number"
                    id="minDeliveryCost"
                    name="minDeliveryCost"
                    value={filters.minDeliveryCost}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 5000"
                    min="0"
                  />
                </div>
                
                {/* Filtro por costo de envío máximo */}
                <div>
                  <label htmlFor="maxDeliveryCost" className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de envío máximo
                  </label>
                  <input
                    type="number"
                    id="maxDeliveryCost"
                    name="maxDeliveryCost"
                    value={filters.maxDeliveryCost}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 20000"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center"
                >
                  <FaUndo className="mr-2" /> Restablecer
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
          
          {/* Tarjetas de resumen de intereses y envíos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Resumen de intereses */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center mb-3">
                <FaPercentage className="text-blue-500 text-2xl mr-2" />
                <h3 className="text-lg font-semibold">Intereses de Préstamos</h3>
              </div>
              
              {costAnalysisReport.loanInterestSummary && (
                <div className="mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-gray-500">Tasa promedio</p>
                      <p className="text-xl font-bold">{costAnalysisReport.loanInterestSummary.averageInterestRate.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Productos con interés</p>
                      <p className="text-xl font-bold">{costAnalysisReport.loanInterestSummary.productsWithLoan}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-500">Monto total de intereses</p>
                    <p className="text-xl font-bold">{displayPYGCurrency(costAnalysisReport.loanInterestSummary.totalLoanAmount)}</p>
                  </div>
                  
                  <div className="mt-3 text-sm">
                    <p className="text-gray-500 mb-1">Distribución de tasas</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(costAnalysisReport.loanInterestSummary.loanInterestRanges).map(([range, count]) => (
                        <div key={range} className="flex justify-between">
                          <span>{range}:</span>
                          <span className="font-medium">{count} productos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Resumen de envíos */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center mb-3">
                <FaTruck className="text-green-500 text-2xl mr-2" />
                <h3 className="text-lg font-semibold">Costos de Envío</h3>
              </div>
              
              {costAnalysisReport.deliveryCostSummary && (
                <div className="mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-gray-500">Costo promedio</p>
                      <p className="text-xl font-bold">{displayPYGCurrency(costAnalysisReport.deliveryCostSummary.averageDeliveryCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Productos con envío</p>
                      <p className="text-xl font-bold">{costAnalysisReport.deliveryCostSummary.productsWithDelivery}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-500">Costo total de envíos</p>
                    <p className="text-xl font-bold">{displayPYGCurrency(costAnalysisReport.deliveryCostSummary.totalDeliveryCost)}</p>
                  </div>
                  
                  <div className="mt-3 text-sm">
                    <p className="text-gray-500 mb-1">Distribución de costos</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(costAnalysisReport.deliveryCostSummary.deliveryCostRanges).map(([range, count]) => (
                        <div key={range} className="flex justify-between">
                          <span>{range} Gs:</span>
                          <span className="font-medium">{count} productos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Tabla con detalles de costos financieros */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Compra USD</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">T. Cambio</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Compra PYG</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interés %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Interés</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Envío</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-4 text-center text-gray-500">
                      Cargando...
                    </td>
                  </tr>
                ) : costAnalysisReport.products.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-4 text-center text-gray-500">
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  costAnalysisReport.products.map((product, index) => (
                    <tr key={product._id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-800">{product.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.brandName}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">$ {product.purchasePriceUSD?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{product.exchangeRate?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(product.purchasePrice)}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 text-right font-medium">{product.loanInterest?.toFixed(1) || '0'}%</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">
                        {displayPYGCurrency(product.purchasePrice * (product.loanInterest / 100) || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(product.deliveryCost || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right">{displayPYGCurrency(product.sellingPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
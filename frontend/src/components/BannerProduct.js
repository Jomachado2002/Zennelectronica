import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  Cpu, 
  HardDrive, 
  Laptop, 
  Keyboard, 
  Smartphone,
  Clock,
  Truck,
  Shield,
  Download,
  CreditCard,
  Star
} from 'lucide-react';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import { trackWhatsAppContact } from '../components/MetaPixelTracker';

// Función para hacer scroll al inicio de la página
const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const BannerProduct = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Detectar si es móvil para ajustar altura
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const bannerData = [
    {
      title: "Notebooks de Alto Rendimiento",
      subtitle: "Trabajo y gaming en cualquier lugar",
      description: "Últimos modelos con procesadores Intel y AMD. Envío gratis y garantía extendida.",
      icon: <Laptop className="w-12 h-12 md:w-16 md:h-16" />,
      bgColor: "from-[#001440] to-[#002060]",
      action: "Ver Catálogo",
      category: "informatica",
      subcategory: "notebooks",
      badge: "ENVÍO GRATIS",
      features: [
        { icon: <Truck className="w-3 h-3 md:w-4 md:h-4" />, text: "Entrega en 48h" },
        { icon: <Shield className="w-3 h-3 md:w-4 md:h-4" />, text: "Garantía oficial" }
      ]
    },
    {
      title: "Componentes Premium",
      subtitle: "Construye el PC de tus sueños",
      description: "Amplio catálogo de componentes. Asesoramiento técnico personalizado.",
      icon: <Cpu className="w-12 h-12 md:w-16 md:h-16" />,
      bgColor: "from-[#0D47A1] to-[#1565C0]",
      action: "Explorar Componentes",
      category: "informatica",
      subcategory: "placas_madre",
      badge: "OFERTAS",
      features: [
        { icon: <Star className="w-3 h-3 md:w-4 md:h-4" />, text: "Marcas top" },
        { icon: <Shield className="w-3 h-3 md:w-4 md:h-4" />, text: "Garantía oficial" },
        { icon: <Truck className="w-3 h-3 md:w-4 md:h-4" />, text: "Envío seguro" }
      ]
    },
    {
      title: "Monitores Profesionales",
      subtitle: "Visualiza cada detalle con precisión",
      description: "Alta resolución y fidelidad de color para diseño, programación y gaming.",
      icon: <Monitor className="w-12 h-12 md:w-16 md:h-16" />,
      bgColor: "from-[#01579B] to-[#0277BD]",
      action: "Ver Monitores",
      category: "perifericos",
      subcategory: "monitores",
      badge: "TOP VENTAS",
      features: [
        { icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />, text: "Entrega en 48 horas" },
        { icon: <CreditCard className="w-3 h-3 md:w-4 md:h-4" />, text: "Múltiples pagos" },
        { icon: <Download className="w-3 h-3 md:w-4 md:h-4" />, text: "Ficha técnica" }
      ]
    },
    {
      title: "Almacenamiento Confiable",
      subtitle: "Tus datos siempre seguros",
      description: "SSDs y HDDs de las mejores marcas con servicio técnico local.",
      icon: <HardDrive className="w-12 h-12 md:w-16 md:h-16" />,
      bgColor: "from-[#1A237E] to-[#283593]",
      action: "Ver Opciones",
      category: "informatica",
      subcategory: "discos_duros",
      badge: "GARANTÍA EXTENDIDA",
      features: [
        { icon: <Shield className="w-3 h-3 md:w-4 md:h-4" />, text: "Protección de datos" },
        { icon: <Truck className="w-3 h-3 md:w-4 md:h-4" />, text: "Envío protegido" },
        { icon: <Star className="w-3 h-3 md:w-4 md:h-4" />, text: "5 estrellas" }
      ]
    },
    {
      title: "Periféricos Gaming",
      subtitle: "Mejora tu experiencia de juego",
      description: "Equipamiento profesional para gamers. RGB, precisión y durabilidad.",
      icon: <Keyboard className="w-12 h-12 md:w-16 md:h-16" />,
      bgColor: "from-[#2962FF] to-[#448AFF]",
      action: "Ver Periféricos",
      category: "perifericos",
      subcategory: "",
      badge: "GAMING PRO",
      features: [
        { icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />, text: "Respuesta inmediata" },
        { icon: <Shield className="w-3 h-3 md:w-4 md:h-4" />, text: "Resistentes" },
        { icon: <Star className="w-3 h-3 md:w-4 md:h-4" />, text: "Top marcas" }
      ]
    },
    {
      title: "Smartphones y Tablets",
      subtitle: "Tecnología móvil de vanguardia",
      description: "Dispositivos de última generación desbloqueados con garantía local.",
      icon: <Smartphone className="w-12 h-12 md:w-16 md:h-16" />,
      bgColor: "from-[#1976D2] to-[#42A5F5]",
      action: "Ver Dispositivos",
      category: "telefonia",
      subcategory: "",
      badge: "DESBLOQUEADOS",
      features: [
        { icon: <Shield className="w-3 h-3 md:w-4 md:h-4" />, text: "Garantía oficial" },
        { icon: <CreditCard className="w-3 h-3 md:w-4 md:h-4" />, text: "Financiación" },
        { icon: <Truck className="w-3 h-3 md:w-4 md:h-4" />, text: "Envío express" }
      ]
    },
{
  title: "",
  subtitle: "",
  description: "",
  icon: null,
  bgColor: "fondogabinete", 
  action: "",
  category: "",
  subcategory: "",
  badge: "",
  features: []
}
  ];

  const nextSlide = () => {
    if (animating) return;
    setAnimating(true);
    setActiveTab((prev) => (prev === bannerData.length - 1 ? 0 : prev + 1));
    setTimeout(() => setAnimating(false), 500);
  };

  const prevSlide = () => {
    if (animating) return;
    setAnimating(true);
    setActiveTab((prev) => (prev === 0 ? bannerData.length - 1 : prev - 1));
    setTimeout(() => setAnimating(false), 500);
  };

  const handleNavigate = (category, subcategory) => {
    scrollTop();
    navigate(`/categoria-producto?category=${category}${subcategory ? `&subcategory=${subcategory}` : ''}`);
  };

  const handleWhatsApp = () => {
    const currentBanner = bannerData[activeTab];
    
    // Tracking de WhatsApp
    trackWhatsAppContact({
      productName: currentBanner.title,
      category: currentBanner.category,
      subcategory: currentBanner.subcategory,
      sellingPrice: 0,
      _id: 'banner-' + currentBanner.category
    });

    const phoneNumber = "595981150393";
    const message = encodeURIComponent(
      `¡Hola! Me interesa obtener más información sobre:\n\n` +
      `📱 ${currentBanner.title}\n` +
      `📝 ${currentBanner.description}\n\n` +
      `¿Podrían ayudarme con más detalles y precios?\n\n` +
      `Gracias!`
    );
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePdf = async () => {
    try {
      setPdfLoading(true);
      const currentCategory = bannerData[activeTab].category;
      const currentSubcategory = bannerData[activeTab].subcategory;
      
      // Obtener productos de la categoría seleccionada
      const response = await fetch(SummaryApi.filterProduct.url, {
        method: SummaryApi.filterProduct.method,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          category: [currentCategory],
          subcategory: currentSubcategory ? [currentSubcategory] : [],
          brandName: [],
          specifications: {}
        })
      });
  
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data || responseData.data.length === 0) {
        alert("No hay productos disponibles para generar el catálogo");
        setPdfLoading(false);
        return;
      }
  
      let products = responseData.data;
      
      // Extraer todas las marcas disponibles
      const availableBrands = [...new Set(products.map(product => product.brandName))].filter(Boolean);
      
      // Organizar productos por marca y por precio
      const productsByBrand = {};
      availableBrands.forEach(brand => {
        // Filtrar productos por marca
        const brandProducts = products.filter(product => product.brandName === brand);
        
        // Ordenar productos por precio (de menor a mayor)
        const sortedProducts = [...brandProducts].sort((a, b) => {
          return (a.sellingPrice || 0) - (b.sellingPrice || 0);
        });
        
        productsByBrand[brand] = sortedProducts;
      });
      
      // Generar PDF con jsPDF
      const doc = new jsPDF();
      
      // Título y cabecera
      doc.setFontSize(22);
      doc.setTextColor(0, 32, 96); 
      doc.text(`Catálogo: ${bannerData[activeTab].title}`, 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Zenn - Soluciones Tecnológicas`, 14, 32);
      
      // Agregar fecha y contacto
      const today = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.setFontSize(10);
      doc.text(`Generado el: ${today}`, 14, 42);
      doc.text(`Tel: +595 984 133733`, 14, 48);
      doc.text(`Email: ventas@zenn.com.py`, 14, 54);
      
      // Descripción
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(bannerData[activeTab].description, 14, 64);
      
      // Variable para mantener la posición vertical actual
      let yPosition = 70;
      
      // Procesar cada marca y sus productos
      for (const brand of availableBrands) {
        // Verificar si necesitamos agregar una nueva página
        if (yPosition > doc.internal.pageSize.height - 30) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Encabezado de marca
        doc.setFontSize(14);
        doc.setTextColor(0, 32, 96); 
        doc.text(`Productos ${brand}`, 14, yPosition);
        yPosition += 10;
        
        // Si no hay productos para esta marca, pasar a la siguiente
        if (!productsByBrand[brand] || productsByBrand[brand].length === 0) {
          continue;
        }
        
        // Crear tabla con los productos de esta marca
        const tableColumn = ["Producto", "Características", "Precio"];
        const tableRows = [];
        
        productsByBrand[brand].forEach(product => {
          let specifications = '';
          
          // Extraer especificaciones principales si existen
          if (product.specifications && product.specifications.length > 0) {
            specifications = product.specifications
              .map(spec => `${spec.name}: ${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`)
              .join(', ');
          } else if (product.description) {
            specifications = product.description.length > 50 
              ? product.description.substring(0, 50) + '...' 
              : product.description;
          }
          
          const productData = [
            product.productName,
            specifications,
            displayPYGCurrency(product.sellingPrice)
          ];
          tableRows.push(productData);
        });
        
        // Generar tabla para esta marca
        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: yPosition,
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 80 },
            2: { cellWidth: 30 }
          },
          headStyles: {
            fillColor: [0, 32, 96], 
            textColor: 255
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
        
        // Actualizar la posición vertical para el siguiente contenido
        yPosition = doc.lastAutoTable.finalY + 15;
      }
      
      // Agregar información sobre la garantía y envío
      if (yPosition > doc.internal.pageSize.height - 50) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("Información adicional:", 14, yPosition);
      doc.setFontSize(8);
      doc.text("• Todos nuestros productos cuentan con garantía oficial.", 14, yPosition + 6);
      doc.text("• Ofrecemos envío gratuito en compras superiores a Gs. 1.000.000.", 14, yPosition + 12);
      doc.text("• Horario de atención: Lunes a Viernes de 8:00 a 17:00, Sábados de 8:30 a 11:00.", 14, yPosition + 18);
      doc.text("• Formas de pago: efectivo, transferencia bancaria, tarjetas de crédito y débito.", 14, yPosition + 24);
      
      // Agregar información de contacto para pedidos
      yPosition += 34;
      doc.setFontSize(10);
      doc.setTextColor(0, 32, 96); 
      doc.text("¿Interesado en algún producto?", 14, yPosition);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Contáctenos por WhatsApp: +595 984 133733", 14, yPosition + 6);
      
      
      // Agregar pie de página
      const pageCount = doc.internal.getNumberOfPages();
      const footerText = "Los precios pueden variar. Consulte disponibilidad. Válido hasta agotar stock.";
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(footerText, 14, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }
      
      // Guardar el PDF
      doc.save(`catalogo-${currentCategory}${currentSubcategory ? `-${currentSubcategory}` : ''}.pdf`);
      
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      alert("Hubo un error al generar el catálogo. Por favor, inténtelo de nuevo más tarde.");
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="w-full px-0 py-0 sm:py-4 mt-2 sm:mt-0">
      <div className="relative h-80 sm:h-80 md:h-96 lg:h-96 w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl">
        {/* Background with gradient */}
    <div 
  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
    bannerData[activeTab].bgColor === 'fondogabinete' 
      ? 'banner-image-background' 
      : ''
  }`}
  style={{
    backgroundImage: bannerData[activeTab].bgColor === 'fondogabinete' 
      ? 'url(/fondogabinete.png)' 
      : undefined
  }}
>
  {bannerData[activeTab].bgColor !== 'fondogabinete' && (
    <div className={`absolute inset-0 bg-gradient-to-r ${bannerData[activeTab].bgColor}`}></div>
  )}
</div>
        {/* Animated pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern animate-pulse"></div>
        </div>

        {/* Liquid effect overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-blue-400/10 wave-animation"></div>
        </div>

        {/* Decorative elements - hidden on small screens */}
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/5 rounded-full -translate-x-16 sm:-translate-x-32 -translate-y-16 sm:-translate-y-32 hidden sm:block"></div>
        <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-black/10 rounded-full translate-x-4 sm:translate-x-8 translate-y-8 sm:translate-y-16 hidden sm:block"></div>
        
        {/* Glowing accents */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl hidden sm:block"></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-blue-300/20 rounded-full blur-2xl hidden sm:block"></div>
        
        {/* Simple mobile background enhancements */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/20 rounded-full blur-xl sm:hidden"></div>
        <div className="absolute bottom-1/3 left-1/4 w-16 h-16 bg-blue-300/10 rounded-full blur-lg sm:hidden"></div>

        {/* Content */}
        <div className="relative h-full flex items-center z-10 p-3 sm:p-6 md:p-10">
          <div className="w-full sm:w-4/5 md:w-3/5">
            <div className={`transition-all duration-500 ease-in-out transform ${animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
              {/* Badge */}
              <div className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 mb-2 sm:mb-4 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold tracking-wider animate-pulse">
                {bannerData[activeTab].badge}
              </div>
              
              <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 sm:mb-2 tracking-tight leading-tight">
                {bannerData[activeTab].title}
              </h2>
              
              <div className="w-12 sm:w-20 h-0.5 sm:h-1 bg-[#42A5F5] rounded-full mb-2 sm:mb-4"></div>
              
              <p className="text-sm sm:text-lg md:text-xl text-white/90 font-medium mb-1 sm:mb-3">
                {bannerData[activeTab].subtitle}
              </p>
              
              <p className="text-xs sm:text-sm md:text-base text-white/80 mb-2 sm:mb-4 max-w-xs sm:max-w-sm md:max-w-lg line-clamp-2 sm:line-clamp-none">
                {bannerData[activeTab].description}
              </p>
              
              {/* Feature tags - responsive layout */}
              <div className="flex flex-wrap gap-1.5 sm:gap-3 mb-3 sm:mb-6">
                {bannerData[activeTab].features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                    {feature.icon}
                    <span className="text-white text-xs font-medium whitespace-nowrap">{feature.text}</span>
                  </div>
                ))}
              </div>
              
              {/* Action buttons - responsive layout */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button 
                  className="bg-white text-[#002060] hover:bg-blue-50 transition-all px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm md:text-base font-medium flex items-center gap-1 sm:gap-2 group shadow-md sm:shadow-lg hover:shadow-xl active:scale-95"
                  onClick={() => handleNavigate(bannerData[activeTab].category, bannerData[activeTab].subcategory)}
                >
                  {bannerData[activeTab].action}
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button 
                  className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm md:text-base font-medium flex items-center gap-1 sm:gap-2 border border-white/20"
                  onClick={handleWhatsApp}
                >
                  <span className="hidden xs:inline">Consultar por</span> WhatsApp
                </button>
                
                <button 
                  className={`${pdfLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white/10'} 
                              bg-transparent text-white transition-all px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full 
                              text-xs sm:text-sm md:text-base font-medium flex items-center gap-1 sm:gap-2 border border-white/20`}
                  onClick={handlePdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? (
                    <>
                      <span className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full mr-1 sm:mr-2"></span>
                      <span className="hidden xs:inline">Generando</span> PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Catálogo</span> PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Icon with 3D effect - visible only on large screens */}
          <div className="hidden lg:flex absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className={`text-white/95 transition-all duration-500 ease-in-out ${animating ? 'scale-75 opacity-0' : 'scale-100 opacity-100'} 
                            shadow-2xl bg-white/10 p-10 rounded-full backdrop-blur-md border border-white/20`}>
              {bannerData[activeTab].icon}
              
              {/* Concentric animated rings */}
              <div className="absolute inset-0 border-2 border-white/10 rounded-full animate-ping-slow"></div>
              <div className="absolute inset-[-10px] border border-white/5 rounded-full"></div>
            </div>
            <div className="absolute inset-0 bg-[#42A5F5]/10 rounded-full blur-2xl -z-10 scale-110"></div>
          </div>
        </div>

        {/* Dots indicator - responsive sizing */}
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-2">
          {bannerData.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`transition-all ${
                activeTab === index 
                  ? 'w-4 sm:w-8 h-1 sm:h-2 bg-[#42A5F5] rounded-full' 
                  : 'w-1 sm:w-2 h-1 sm:h-2 bg-white/50 hover:bg-white/70 rounded-full'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons - responsive sizing */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full p-1.5 sm:p-3 text-white transition-all z-20 hover:scale-110 active:scale-95 border border-white/20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full p-1.5 sm:p-3 text-white transition-all z-20 hover:scale-110 active:scale-95 border border-white/20"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 479px) {
          .xs\\:inline {
            display: none;
          }
        }
        @media (min-width: 480px) {
          .xs\\:inline {
            display: inline;
          }
        }
        .bg-grid-pattern {
          background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(-8px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(-5px); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }

        .wave-animation {
          background: linear-gradient(90deg, transparent, rgba(66, 165, 245, 0.2), transparent);
          background-size: 200% 100%;
          animation: wave 8s linear infinite;
        }

        @keyframes wave {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default BannerProduct;
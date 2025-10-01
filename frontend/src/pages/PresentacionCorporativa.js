import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, X, Building2, Target, Eye, Users, Award, Clock, Shield, Handshake, Cpu, Server, Wifi, Zap, Globe, MapPin } from 'lucide-react';

const PresentacionCorporativa = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const presentationRef = useRef(null);

  // Logo SVG Component
  const ZennLogo = ({ className = "w-20 h-8" }) => (
    <div className={`${className} flex items-center space-x-2`}>
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0L35 8V24L20 32L5 24V8L20 0Z" fill="url(#logo-gradient)"/>
        <defs>
          <linearGradient id="logo-gradient" x1="5" y1="0" x2="35" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00D4FF"/>
            <stop offset="1" stopColor="#3B82F6"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="text-white">
        <div className="text-sm font-bold leading-tight">Zenn</div>
        <div className="text-xs opacity-80 leading-tight">Electronicos</div>
      </div>
    </div>
  );

  const slides = [
    {
      id: 1,
      title: "Zenn",
      subtitle: "Soluciones Tecnológicas Empresariales",
      content: (
        <div className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
          {/* Fondo tecnológico animado */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20"></div>
            <div className="absolute top-0 left-0 w-full h-full">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bg-cyan-400/20 rounded-full animate-pulse"
                  style={{
                    width: Math.random() * 4 + 1 + 'px',
                    height: Math.random() * 4 + 1 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animationDelay: Math.random() * 2 + 's',
                    animationDuration: (Math.random() * 3 + 2) + 's'
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="relative z-10 text-center space-y-8 max-w-4xl mx-auto px-8">
            {/* Logo y título principal */}
            <div className="space-y-6">
              <div className="flex justify-center items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-2xl">
                  <Cpu className="w-12 h-12 text-white" />
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform -rotate-6 shadow-xl">
                  <Server className="w-10 h-10 text-white" />
                </div>
                <div className="w-18 h-18 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center transform rotate-3 shadow-2xl">
                  <Wifi className="w-11 h-11 text-white" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Zenn
              </h1>
              <div className="w-32 h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mx-auto rounded-full shadow-lg"></div>
              <p className="text-xl md:text-2xl lg:text-3xl font-light opacity-90 bg-gradient-to-r from-gray-100 to-blue-200 bg-clip-text text-transparent">
                Soluciones Tecnológicas Empresariales
              </p>
            </div>
            
            {/* Badges tecnológicos */}
            <div className="flex flex-wrap justify-center gap-4 text-base lg:text-lg opacity-90">
              <div className="bg-cyan-500/20 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-full border border-cyan-400/30">
                <span className="text-cyan-300 font-semibold">B2B</span>
              </div>
              <div className="bg-blue-500/20 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-full border border-blue-400/30">
                <span className="text-blue-300 font-semibold">B2C</span>
              </div>
              <div className="bg-purple-500/20 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-full border border-purple-400/30">
                <span className="text-purple-300 font-semibold">Distribución Tech</span>
              </div>
            </div>
            
            {/* Información corporativa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-8 lg:mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
                <div className="text-cyan-400 text-xl lg:text-2xl font-bold">2023</div>
                <div className="text-sm opacity-80">Año de Fundación</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
                <div className="flex items-center justify-center space-x-2 text-blue-400 text-lg lg:text-xl font-bold">
                  <MapPin className="w-4 lg:w-5 h-4 lg:h-5" />
                  <span>Asunción</span>
                </div>
                <div className="text-sm opacity-80">Paraguay</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20 sm:col-span-2 lg:col-span-1">
                <div className="text-purple-400 text-lg lg:text-xl font-bold">Tech Solutions</div>
                <div className="text-sm opacity-80">Especialización</div>
              </div>
            </div>
            
            <div className="pt-6 lg:pt-8">
              <p className="text-base lg:text-lg opacity-70 font-mono bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                www.zenn.com.py
              </p>
            </div>
          </div>
          
          {/* Elementos decorativos tech */}
          <div className="absolute top-10 right-10 w-32 h-32 border-2 border-cyan-400/30 rounded-full animate-spin-slow"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 border-2 border-purple-400/30 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 border border-blue-400/30 rounded-lg transform rotate-45"></div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-6 right-6 z-20">
            <ZennLogo className="w-32 h-10" />
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Acerca de Nosotros",
      content: (
        <div className="h-full bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 md:p-8 lg:p-12 overflow-auto relative">
          <div className="max-w-6xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8 lg:mb-12">
              <div className="flex justify-center mb-6">
                <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Building2 className="w-8 md:w-12 h-8 md:h-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-800 mb-4 bg-gradient-to-r from-blue-800 to-cyan-700 bg-clip-text text-transparent">
                Acerca de Nosotros
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
              <div className="space-y-6">
                <div className="bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-xl border-l-4 border-blue-600 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center mb-4">
                    <div className="w-10 md:w-12 h-10 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                      <Cpu className="w-5 md:w-7 h-5 md:h-7 text-blue-600" />
                    </div>
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">Especialización Técnica</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base lg:text-lg">
                    Somos especialistas en brindar soluciones tecnológicas confiables para empresas y consumidores finales. 
                    Nos dedicamos a la distribución de insumos informáticos de alta calidad, componentes de datacenter y 
                    sistemas de infraestructura tecnológica de vanguardia.
                  </p>
                </div>
                
                <div className="bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-xl border-l-4 border-green-600 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center mb-4">
                    <div className="w-10 md:w-12 h-10 md:h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                      <Shield className="w-5 md:w-7 h-5 md:h-7 text-green-600" />
                    </div>
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">Compromiso de Calidad</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base lg:text-lg">
                    Ofrecemos productos de las mejores marcas internacionales, asesoramiento técnico especializado 
                    y un servicio ágil para satisfacer las necesidades tanto de usuarios particulares como 
                    profesionales del sector empresarial.
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-4 md:p-6 lg:p-8 rounded-2xl text-center shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-black mb-2">2023</div>
                  <p className="opacity-90 text-base md:text-lg">Año de Fundación</p>
                  <div className="mt-4 flex justify-center">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <Globe className="w-6 md:w-8 h-6 md:h-8 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 md:p-4 lg:p-6 rounded-2xl shadow-xl text-center border-t-4 border-blue-500 hover:shadow-2xl transition-all duration-300">
                    <div className="w-8 md:w-12 h-8 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Building2 className="w-4 md:w-6 h-4 md:h-6 text-blue-600" />
                    </div>
                    <h4 className="text-base md:text-lg lg:text-xl font-bold text-gray-800">B2B</h4>
                    <p className="text-xs md:text-sm lg:text-base text-gray-600">Empresarial</p>
                  </div>
                  <div className="bg-white p-3 md:p-4 lg:p-6 rounded-2xl shadow-xl text-center border-t-4 border-green-500 hover:shadow-2xl transition-all duration-300">
                    <div className="w-8 md:w-12 h-8 md:h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-4 md:w-6 h-4 md:h-6 text-green-600" />
                    </div>
                    <h4 className="text-base md:text-lg lg:text-xl font-bold text-gray-800">B2C</h4>
                    <p className="text-xs md:text-sm lg:text-base text-gray-600">Consumidor Final</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-4 md:p-6 rounded-2xl text-center shadow-xl">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <MapPin className="w-4 md:w-6 h-4 md:h-6" />
                    <span className="text-lg md:text-xl font-bold">Asunción, Paraguay</span>
                  </div>
                  <p className="opacity-90 text-sm md:text-base">Centro de Operaciones</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-20">
            <ZennLogo className="w-24 md:w-32 h-8 md:h-10" />
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Misión y Visión",
      content: (
        <div className="h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8 lg:p-12 overflow-auto relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8 lg:mb-12">
              <div className="flex justify-center items-center space-x-4 md:space-x-6 mb-6 md:mb-8">
                <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Target className="w-6 md:w-10 h-6 md:h-10 text-white" />
                </div>
                <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Eye className="w-8 md:w-12 h-8 md:h-12 text-white" />
                </div>
                <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Zap className="w-6 md:w-10 h-6 md:h-10 text-white" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-800 mb-4 bg-gradient-to-r from-blue-800 to-purple-700 bg-clip-text text-transparent">
                Misión y Visión
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 lg:gap-12">
              <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border-t-8 border-blue-600 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                <div className="text-center mb-6 md:mb-8">
                  <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl">
                    <Target className="w-6 md:w-10 h-6 md:h-10 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-800 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    MISIÓN
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-center text-sm md:text-base lg:text-lg">
                  Brindar soluciones tecnológicas confiables y accesibles a través de la distribución 
                  de insumos informáticos de alta calidad, ofreciendo asesoramiento técnico personalizado 
                  y un servicio ágil, para satisfacer las necesidades tanto de usuarios particulares 
                  como profesionales y empresas del sector tecnológico en Paraguay y la región.
                </p>
                <div className="mt-4 md:mt-6 flex justify-center space-x-4">
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Cpu className="w-3 md:w-4 h-3 md:h-4 text-blue-600" />
                  </div>
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                    <Server className="w-3 md:w-4 h-3 md:h-4 text-cyan-600" />
                  </div>
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Wifi className="w-3 md:w-4 h-3 md:h-4 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border-t-8 border-indigo-600 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                <div className="text-center mb-6 md:mb-8">
                  <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl">
                    <Eye className="w-6 md:w-10 h-6 md:h-10 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-800 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                    VISIÓN
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-center text-sm md:text-base lg:text-lg">
                  Ser reconocidos como empresa líder en el suministro de soluciones tecnológicas 
                  empresariales en Paraguay, destacándonos por la calidad de nuestros productos, 
                  la excelencia en la atención técnica especializada y nuestro compromiso constante 
                  con la innovación y el desarrollo tecnológico continuo.
                </p>
                <div className="mt-4 md:mt-6 flex justify-center space-x-4">
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Award className="w-3 md:w-4 h-3 md:h-4 text-indigo-600" />
                  </div>
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Globe className="w-3 md:w-4 h-3 md:h-4 text-purple-600" />
                  </div>
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Zap className="w-3 md:w-4 h-3 md:h-4 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-20">
            <ZennLogo className="w-24 md:w-32 h-8 md:h-10" />
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Nuestros Productos y Servicios",
      content: (
        <div className="h-full bg-gradient-to-br from-slate-100 via-blue-100 to-cyan-100 p-4 md:p-6 lg:p-8 overflow-auto relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-4 md:mb-6 lg:mb-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-800 mb-4 bg-gradient-to-r from-blue-800 to-cyan-700 bg-clip-text text-transparent">
                Productos y Servicios
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-3 md:p-4 lg:p-6 border-t-4 border-blue-600 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-center mb-2 md:mb-3 lg:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-3 lg:mb-4">
                    <Server className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xs md:text-sm lg:text-xl font-bold text-gray-800">DATACENTER</h3>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• UPS y Sistemas de Energía</li>
                  <li>• Sistemas de Seguridad</li>
                  <li>• Aires de Precisión</li>
                  <li>• Control de Acceso</li>
                  <li>• Racks y Gabinetes</li>
                  <li>• Accesorios Técnicos</li>
                  <li>• Tableros Eléctricos</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-3 md:p-4 lg:p-6 border-t-4 border-green-600 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-center mb-2 md:mb-3 lg:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-3 lg:mb-4">
                    <Cpu className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-green-600" />
                  </div>
                  <h3 className="text-xs md:text-sm lg:text-xl font-bold text-gray-800">HARDWARE</h3>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Monitores Profesionales</li>
                  <li>• Storage y Servidores</li>
                  <li>• PCs y Workstations</li>
                  <li>• Notebooks Empresariales</li>
                  <li>• Teléfonos IP</li>
                  <li>• Tablets y Dispositivos</li>
                  <li>• Switches y Routers</li>
                  <li>• Plotters e Impresoras</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-3 md:p-4 lg:p-6 border-t-4 border-purple-600 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-center mb-2 md:mb-3 lg:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-3 lg:mb-4">
                    <Shield className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xs md:text-sm lg:text-xl font-bold text-gray-800">SOFTWARE</h3>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Soluciones en la Nube</li>
                  <li>• Herramientas de Colaboración</li>
                  <li>• Seguridad Informática</li>
                  <li>• Sistemas de Comunicación</li>
                  <li>• Soluciones de Backup</li>
                  <li>• Sistemas de Contingencia</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-3 md:p-4 lg:p-6 border-t-4 border-orange-600 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-center mb-2 md:mb-3 lg:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-3 lg:mb-4">
                    <Award className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-orange-600" />
                  </div>
                  <h3 className="text-xs md:text-sm lg:text-xl font-bold text-gray-800">INSUMOS</h3>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Toners Originales</li>
                  <li>• Tintas Originales</li>
                  <li>• Cartuchos Certificados</li>
                  <li>• Partes y Repuestos</li>
                  <li>• Accesorios Técnicos</li>
                  <li>• Consumibles IT</li>
                </ul>
              </div>
            </div>
            
            {/* Tech stats */}
            <div className="mt-4 md:mt-6 lg:mt-8 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-2xl p-3 md:p-4 lg:p-6 text-white">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold">500+</div>
                  <div className="text-xs lg:text-sm opacity-90">Productos</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold">50+</div>
                  <div className="text-xs lg:text-sm opacity-90">Marcas</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold">24/7</div>
                  <div className="text-xs lg:text-sm opacity-90">Soporte</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold">PY</div>
                  <div className="text-xs lg:text-sm opacity-90">Asunción</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-20">
            <ZennLogo className="w-24 md:w-32 h-8 md:h-10" />
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Garantías y Servicios",
      content: (
        <div className="h-full bg-gradient-to-br from-green-50 via-blue-50 to-cyan-50 p-4 md:p-8 lg:p-12 overflow-auto relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8 lg:mb-12">
              <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-green-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-2xl">
                <Shield className="w-8 md:w-12 h-8 md:h-12 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-800 mb-4 bg-gradient-to-r from-green-700 to-cyan-600 bg-clip-text text-transparent">
                Garantías y Servicios
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-green-600 to-cyan-600 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8">
              <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-6 lg:p-8 text-center border-t-8 border-green-500 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl">
                  <Clock className="w-6 md:w-10 h-6 md:h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-4">Garantía Extendida</h3>
                <div className="text-3xl md:text-4xl lg:text-5xl font-black text-green-600 mb-4">3 AÑOS</div>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed">
                  Cobertura completa en todos nuestros productos principales con soporte técnico especializado
                </p>
              </div>
              
              <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-6 lg:p-8 text-center border-t-8 border-blue-500 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl">
                  <Users className="w-6 md:w-10 h-6 md:h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-4">Soporte Técnico</h3>
                <div className="text-2xl md:text-3xl lg:text-4xl font-black text-blue-600 mb-4">24/7</div>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed">
                  Asistencia técnica especializada para empresas con SLA garantizado
                </p>
              </div>
              
              <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-6 lg:p-8 text-center border-t-8 border-purple-500 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl">
                  <Handshake className="w-6 md:w-10 h-6 md:h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-4">Partnerships</h3>
                <div className="text-xl md:text-2xl lg:text-3xl font-black text-purple-600 mb-4">OFICIAL</div>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed">
                  Distribuidores autorizados de las principales marcas tecnológicas
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-3xl p-4 md:p-6 lg:p-8 text-white text-center shadow-2xl">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">Servicios Adicionales</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm lg:text-base">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 md:p-4">
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-white/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Zap className="w-3 md:w-4 h-3 md:h-4 text-white" />
                  </div>
                  <div>Instalación On-Site</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 md:p-4">
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-white/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Cpu className="w-3 md:w-4 h-3 md:h-4 text-white" />
                  </div>
                  <div>Configuración Técnica</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 md:p-4">
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-white/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Server className="w-3 md:w-4 h-3 md:h-4 text-white" />
                  </div>
                  <div>Mantenimiento Preventivo</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 md:p-4">
                  <div className="w-6 md:w-8 h-6 md:h-8 bg-white/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Users className="w-3 md:w-4 h-3 md:h-4 text-white" />
                  </div>
                  <div>Capacitación de Usuario</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-20">
            <ZennLogo className="w-24 md:w-32 h-8 md:h-10" />
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Nuestras Marcas Partners",
      content: (
        <div className="h-full bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4 md:p-8 lg:p-12 overflow-auto relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8 lg:mb-12">
              <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-2xl">
                <Award className="w-8 md:w-12 h-8 md:h-12 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-800 mb-4 bg-gradient-to-r from-blue-800 to-purple-700 bg-clip-text text-transparent">
                Nuestras Marcas Partners
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
              <p className="text-gray-600 mt-4 text-base md:text-lg lg:text-xl">
                Distribuidores autorizados de las principales marcas tecnológicas
              </p>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((item) => (
                <div key={item} className="bg-white rounded-2xl shadow-xl p-3 md:p-4 lg:p-6 flex items-center justify-center h-16 md:h-20 lg:h-24 border-2 border-gray-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="text-gray-400 text-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-1">
                      <Globe className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="text-xs font-semibold">MARCA {item}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-6 lg:p-8 border-t-8 border-blue-600">
              <div className="text-center">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-6 md:mb-8">Certificaciones y Partnerships</h3>
                <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 text-center">
                  <div className="space-y-4">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                      <Award className="w-6 md:w-8 h-6 md:h-8 text-green-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-base md:text-lg">Distribuidor Autorizado</h4>
                    <p className="text-xs md:text-sm lg:text-base text-gray-600">Certificación oficial de fabricantes</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                      <Shield className="w-6 md:w-8 h-6 md:h-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-base md:text-lg">Soporte Técnico</h4>
                    <p className="text-xs md:text-sm lg:text-base text-gray-600">Capacitación continua especializada</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                      <Users className="w-6 md:w-8 h-6 md:h-8 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-base md:text-lg">Partner Estratégico</h4>
                    <p className="text-xs md:text-sm lg:text-base text-gray-600">Alianzas comerciales sólidas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-20">
            <ZennLogo className="w-24 md:w-32 h-8 md:h-10" />
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "Contacto",
      content: (
        <div className="h-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-4 md:p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20"></div>
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-cyan-400/20 rounded-full animate-pulse"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 2 + 's',
                  animationDuration: (Math.random() * 3 + 2) + 's'
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8 lg:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Contáctanos
              </h2>
              <div className="w-24 h-2 bg-gradient-to-r from-cyan-400 to-blue-400 mx-auto rounded-full mb-4 md:mb-6"></div>
              <p className="text-lg md:text-xl lg:text-2xl opacity-90">
                Estamos listos para brindar soluciones tecnológicas a tu empresa
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
              <div className="space-y-4 md:space-y-6 lg:space-y-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 md:p-6 lg:p-8 border border-white/20">
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">Información de Contacto</h3>
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                        <span className="text-base md:text-lg">📱</span>
                      </div>
                      <div>
                        <p className="font-semibold text-base md:text-lg">Teléfono</p>
                        <p className="opacity-90 text-cyan-300 text-sm md:text-base">+595 981 150393</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                        <span className="text-base md:text-lg">📧</span>
                      </div>
                      <div>
                        <p className="font-semibold text-base md:text-lg">Email</p>
                        <p className="opacity-90 text-purple-300 text-sm md:text-base">ventas@zenn.com.py</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <span className="text-base md:text-lg">🌐</span>
                      </div>
                      <div>
                        <p className="font-semibold text-base md:text-lg">Website</p>
                        <p className="opacity-90 text-blue-300 text-sm md:text-base">www.zenn.com.py</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                        <MapPin className="w-4 md:w-6 h-4 md:h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-base md:text-lg">Ubicación</p>
                        <p className="opacity-90 text-green-300 text-sm md:text-base">Asunción, Paraguay</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/20">
                  <h4 className="text-lg md:text-xl font-bold mb-4">Redes Sociales</h4>
                  <div className="space-y-3 text-sm md:text-base">
                    <p className="flex items-center space-x-2">
                      <span>📘</span>
                      <span>Zenn</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <span>📸</span>
                      <span>Zenn</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <span>💼</span>
                      <span>Zenn Electronicos</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 md:p-6 lg:p-8 border border-white/20">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">¿Listo para empezar?</h3>
                  <p className="mb-6 md:mb-8 opacity-90 text-sm md:text-base lg:text-lg leading-relaxed">
                    Contáctanos para una consulta técnica personalizada y descubre 
                    cómo podemos optimizar la infraestructura tecnológica de tu empresa.
                  </p>
                  <div className="space-y-4">
                    <button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 w-full text-base md:text-lg shadow-2xl transform hover:scale-105">
                      Solicitar Cotización
                    </button>
                    <button className="border-2 border-white text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-semibold hover:bg-white hover:text-blue-900 transition-all duration-300 w-full text-base md:text-lg shadow-xl transform hover:scale-105">
                      Agendar Reunión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute top-10 right-10 w-32 h-32 border-2 border-cyan-400/30 rounded-full animate-spin-slow"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 border-2 border-purple-400/30 rounded-full animate-pulse"></div>
          
          {/* Logo en la esquina */}
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-20">
            <ZennLogo className="w-24 md:w-32 h-8 md:h-10" />
          </div>
        </div>
      )
    }
  ];

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadPDF = async () => {
    setIsLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage();
        
        setCurrentSlide(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const slideElement = presentationRef.current?.querySelector('.relative.overflow-hidden');
        
        if (slideElement) {
          const canvas = await html2canvas(slideElement, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: slideElement.offsetWidth,
            height: slideElement.offsetHeight,
            scrollX: 0,
            scrollY: 0
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          // Calcular dimensiones manteniendo aspecto
          const canvasAspect = canvas.width / canvas.height;
          const pageAspect = pageWidth / pageHeight;
          
          let imgWidth = pageWidth - 20;
          let imgHeight = (pageWidth - 20) / canvasAspect;
          
          if (imgHeight > pageHeight - 20) {
            imgHeight = pageHeight - 20;
            imgWidth = (pageHeight - 20) * canvasAspect;
          }
          
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          
          pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        }
      }
      
      pdf.save('Zenn-Presentacion-Corporativa.pdf');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF. Instale: npm install jspdf html2canvas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'ArrowLeft') {
        prevSlide();
      } else if (event.key === 'ArrowRight') {
        nextSlide();
      } else if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFullscreen, nextSlide, prevSlide]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Header mejorado */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="flex justify-center items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Cpu className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-800 bg-gradient-to-r from-blue-800 to-cyan-700 bg-clip-text text-transparent">
                Zenn - Presentación Corporativa
              </h1>
              <p className="text-gray-600 text-base lg:text-lg">Soluciones Tecnológicas Empresariales B2B • B2C</p>
            </div>
          </div>
        </div>

        {/* Contenedor de la presentación mejorado */}
        <div 
          ref={presentationRef}
          className={`${
            isFullscreen 
              ? 'fixed inset-0 z-50 bg-black' 
              : 'relative bg-white rounded-3xl shadow-2xl border-4 border-blue-200'
          } transition-all duration-300`}
        >
          {/* Controles superiores mejorados */}
          <div className="absolute top-4 right-4 z-30 flex space-x-3">
            <button
              onClick={downloadPDF}
              disabled={isLoading}
              className={`${isLoading ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'} text-white p-3 rounded-2xl transition-colors shadow-xl border-2 border-white/20 backdrop-blur-sm`}
              title="Descargar PDF"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-2xl transition-colors shadow-xl border-2 border-white/20 backdrop-blur-sm"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <X className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>
          </div>

          {/* Área de contenido */}
          <div className={`${isFullscreen ? 'h-screen' : 'h-[500px] lg:h-[650px]'} relative overflow-hidden ${!isFullscreen && 'rounded-3xl'}`}>
            <div data-slide={currentSlide} className="w-full h-full">
              {slides[currentSlide].content}
            </div>
          </div>

          {/* Controles de navegación mejorados */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-30">
            <button
              onClick={prevSlide}
              className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-2xl transition-colors backdrop-blur-sm shadow-xl border border-white/20"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          </div>
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-30">
            <button
              onClick={nextSlide}
              className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-2xl transition-colors backdrop-blur-sm shadow-xl border border-white/20"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* Indicadores de diapositivas mejorados */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
            <div className="flex space-x-3 bg-black/60 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-cyan-400 shadow-lg scale-125' 
                      : 'bg-white/50 hover:bg-white/70 hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Contador de diapositivas mejorado */}
          <div className="absolute bottom-6 right-6 z-30">
            <div className="bg-black/60 text-white px-4 py-2 rounded-2xl text-sm backdrop-blur-sm border border-white/20 font-semibold">
              {currentSlide + 1} / {slides.length}
            </div>
          </div>
        </div>

        {/* Información adicional mejorada */}
        {!isFullscreen && (
          <div className="mt-6 lg:mt-8 grid md:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border-l-4 border-blue-500 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <ChevronLeft className="w-5 h-5 mr-2" />
                Navegación
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Usa las flechas o haz clic en los puntos para navegar entre diapositivas
              </p>
              <div className="flex space-x-2 text-xs text-gray-500">
                <span>← Anterior</span>
                <span>|</span>
                <span>Siguiente →</span>
                <span>|</span>
                <span>ESC para salir</span>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border-l-4 border-green-500 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <Maximize2 className="w-5 h-5 mr-2" />
                Pantalla Completa
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Haz clic en el ícono de expansión para ver en pantalla completa
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Expandir vista • Mejor experiencia</span>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border-l-4 border-purple-500 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Descargar PDF
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Descarga la presentación completa en formato PDF optimizado
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Exportar • Compartir • Offline</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer con logo */}
        {!isFullscreen && (
          <div className="mt-8 bg-gradient-to-r from-blue-900 via-purple-900 to-cyan-900 text-white p-6 rounded-2xl text-center shadow-2xl">
            <div className="flex justify-center items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">Zenn</h3>
                <p className="text-cyan-300 text-sm">Soluciones Tecnológicas Empresariales</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold">Asunción, Paraguay</span>
                </div>
                <p className="text-xs opacity-80">Centro de Operaciones</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <span>📱</span>
                  <span className="font-semibold">+595 981 150393</span>
                </div>
                <p className="text-xs opacity-80">Contacto Directo</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold">www.zenn.com.py</span>
                </div>
                <p className="text-xs opacity-80">Portal Web</p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-6 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <span className="text-xs">B2B</span>
                </div>
                <span>Empresarial</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <span className="text-xs">B2C</span>
                </div>
                <span>Consumidor</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span>3 Años Garantía</span>
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-4">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                <div className="text-xs opacity-80">
                  © 2023-2025 Zenn Alliance. Tu Socio Estratégico en Tecnología
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="flex items-center space-x-1">
                    <Server className="w-3 h-3" />
                    <span>Datacenter</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Wifi className="w-3 h-3" />
                    <span>Networking</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Award className="w-3 h-3" />
                    <span>Partners</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentacionCorporativa;
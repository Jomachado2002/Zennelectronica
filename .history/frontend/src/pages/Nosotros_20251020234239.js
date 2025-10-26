import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

const Nosotros = () => {
  // Estado para controlar efectos interactivos
  const [activeCard, setActiveCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Animaciones para el scroll
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9]);
  
  // Animaciones para elementos
  const fadeIn = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  
  // Animación para tarjetas de valores
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.3 }
    }
  };
  
  // Animación para logos flotantes
  const floatAnimation = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "mirror"
      }
    }
  };

  // Efecto para seguimiento del mouse
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Actualizar cursor personalizado
      const cursor = document.querySelector('.cursor-glow');
      if (cursor) {
        cursor.style.display = 'block';
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Efecto para la animación de partículas de código
  useEffect(() => {
    const createCodeParticle = () => {
      const particles = document.querySelector('.code-particles');
      if (!particles) return;
      
      const characters = ['0', '1', '{', '}', '<', '>', '/', '*', '#', '$'];
      const particle = document.createElement('div');
      particle.classList.add('code-particle');
      
      // Carácter aleatorio
      particle.textContent = characters[Math.floor(Math.random() * characters.length)];
      
      // Posición aleatoria
      const posX = Math.random() * window.innerWidth;
      
      // Estilo
      particle.style.left = posX + 'px';
      particle.style.top = '-20px';
      particle.style.opacity = Math.random() * 0.7 + 0.3;
      particle.style.fontSize = `${Math.random() * 14 + 8}px`;
      particle.style.color = Math.random() > 0.5 ? 'rgba(59, 130, 246, 0.7)' : 'rgba(37, 99, 235, 0.7)';
      
      // Añadir al DOM
      particles.appendChild(particle);
      
      // Eliminar después de la animación
      setTimeout(() => {
        particle.remove();
      }, 10000);
    };
    
    // Crear partículas periódicamente
    const particleInterval = setInterval(createCodeParticle, 200);
    
    return () => {
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Nosotros | Zenn | Paraguay</title>
        <meta
          name="description"
          content="Somos Zenn, la tienda e-commerce líder de insumos informáticos en Paraguay. Descubre nuestra misión, visión y los servicios que ofrecemos."
        />
        <style>
          {`
            /* Efectos de botones */
            .shine-button {
              position: relative;
              overflow: hidden;
            }
            .shine-button::after {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: linear-gradient(
                to right,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.3) 50%,
                rgba(255, 255, 255, 0) 100%
              );
              transform: rotate(30deg);
              opacity: 0;
              transition: opacity 0.3s;
            }
            .shine-button:hover::after {
              opacity: 1;
              animation: shine 1.5s ease-out;
            }
            @keyframes shine {
              0% {
                transform: translateX(-100%) rotate(30deg);
              }
              100% {
                transform: translateX(100%) rotate(30deg);
              }
            }
            
            /* Partículas de código */
            .code-particle {
              position: absolute;
              pointer-events: none;
              animation: fall 10s linear forwards;
              font-family: monospace;
              font-weight: bold;
              text-shadow: 0 0 5px rgba(37, 99, 235, 0.5);
            }
            @keyframes fall {
              0% {
                transform: translateY(0) rotate(0deg);
                opacity: 0;
              }
              10% {
                opacity: 0.8;
              }
              100% {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }
            
            /* Patrones y fondos */
            .bg-pattern-dot {
              background-image: radial-gradient(rgba(37, 99, 235, 0.1) 1px, transparent 1px);
              background-size: 20px 20px;
            }
            
            .bg-grid-pattern {
              background-image: 
                linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
              background-size: 20px 20px;
            }
            
            /* Cursor personalizado */
            .cursor-glow {
              position: fixed;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-color: rgba(37, 99, 235, 0.2);
              pointer-events: none;
              z-index: 9999;
              transform: translate(-50%, -50%);
              mix-blend-mode: screen;
              transition: width 0.2s, height 0.2s, background-color 0.3s;
            }
            .cursor-glow::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 5px;
              height: 5px;
              background-color: rgba(37, 99, 235, 0.8);
              border-radius: 50%;
            }
            
            /* Formas de fondo */
            .circuit-line {
              position: absolute;
              background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.5), transparent);
              height: 1px;
              width: 100%;
              opacity: 0.3;
            }
            
            .circuit-dot {
              position: absolute;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background-color: rgba(37, 99, 235, 0.5);
            }
            
            /* Efectos para el mapa */
            .map-container {
              position: relative;
              height: 100%;
              overflow: hidden;
              border-radius: 8px;
            }
            
            .map-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
              pointer-events: none;
              z-index: 10;
            }
            
            .map-frame {
              position: absolute;
              top: 15px;
              left: 15px;
              right: 15px;
              bottom: 15px;
              border: 2px solid rgba(37, 99, 235, 0.3);
              border-radius: 8px;
              pointer-events: none;
              z-index: 10;
            }
            
            .map-corner {
              position: absolute;
              width: 30px;
              height: 30px;
              border-color: rgba(37, 99, 235, 0.8);
              z-index: 11;
            }
            
            .map-corner-tl {
              top: 10px;
              left: 10px;
              border-top: 3px solid;
              border-left: 3px solid;
              border-top-left-radius: 8px;
            }
            
            .map-corner-tr {
              top: 10px;
              right: 10px;
              border-top: 3px solid;
              border-right: 3px solid;
              border-top-right-radius: 8px;
            }
            
            .map-corner-bl {
              bottom: 10px;
              left: 10px;
              border-bottom: 3px solid;
              border-left: 3px solid;
              border-bottom-left-radius: 8px;
            }
            
            .map-corner-br {
              bottom: 10px;
              right: 10px;
              border-bottom: 3px solid;
              border-right: 3px solid;
              border-bottom-right-radius: 8px;
            }
            
            .map-scan-line {
              position: absolute;
              left: 0;
              width: 100%;
              height: 2px;
              background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.8), transparent);
              opacity: 0.6;
              animation: scan 4s linear infinite;
              z-index: 10;
            }
            
            @keyframes scan {
              0% {
                top: 0;
                opacity: 0.8;
              }
              50% {
                top: 100%;
                opacity: 0.5;
              }
              100% {
                top: 0;
                opacity: 0.8;
              }
            }
            
            .map-coordinates {
              position: absolute;
              bottom: 20px;
              left: 20px;
              background-color: rgba(0, 0, 0, 0.7);
              color: #3b82f6;
              padding: 8px 16px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 12px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
              z-index: 12;
            }
            
            .map-pulse {
              position: absolute;
              top: 45%;
              left: 48%;
              width: 12px;
              height: 12px;
              background-color: rgba(37, 99, 235, 0.8);
              border-radius: 50%;
              z-index: 12;
            }
            
            .map-pulse::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(37, 99, 235, 0.4);
              border-radius: 50%;
              animation: pulse 2s infinite;
              z-index: 11;
            }
            
            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: 1;
              }
              100% {
                transform: scale(4);
                opacity: 0;
              }
            }
            
            /* Tarjetas con efecto neomórfico */
            .card-neomorphic {
              background: linear-gradient(145deg, #f3f4f6, #ffffff);
              box-shadow: 
                8px 8px 16px rgba(0, 0, 0, 0.06),
                -8px -8px 16px rgba(255, 255, 255, 0.8);
              transition: all 0.3s ease;
            }
            
            .card-neomorphic:hover {
              box-shadow: 
                12px 12px 20px rgba(0, 0, 0, 0.08),
                -12px -12px 20px rgba(255, 255, 255, 0.9);
              transform: translateY(-5px);
            }
            
            /* Barra de efecto para tarjetas */
            .glow-bar {
              width: 50px;
              height: 3px;
              margin-bottom: 20px;
              position: relative;
              overflow: hidden;
            }
            
            .glow-bar::after {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
              animation: glow 2s linear infinite;
            }
            
            @keyframes glow {
              0% {
                left: -100%;
              }
              100% {
                left: 100%;
              }
            }
            
            /* Efectos de terminal para las estadísticas */
            .terminal-text {
              font-family: 'Courier New', monospace;
              color: #3b82f6;
              position: relative;
              display: inline-block;
            }
            
            .terminal-text::after {
              content: '';
              position: absolute;
              right: -10px;
              top: 2px;
              width: 8px;
              height: 18px;
              background-color: #3b82f6;
              animation: blink 1s infinite;
            }
            
            @keyframes blink {
              0%, 100% {
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
            }
            
            /* Efectos de iluminación */
            .backlight {
              position: absolute;
              border-radius: 50%;
              filter: blur(60px);
              z-index: 0;
              opacity: 0.6;
            }

            /* Efectos de líneas de conexión */
            .connection-line {
              position: absolute;
              background: linear-gradient(90deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.4));
              height: 1px;
              transform-origin: left center;
              animation: pulse-line 3s infinite alternate;
            }

            @keyframes pulse-line {
              0% {
                opacity: 0.3;
              }
              100% {
                opacity: 0.8;
              }
            }

            /* Efecto de malla digital */
            .digital-mesh {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: 
                linear-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(37, 99, 235, 0.05) 1px, transparent 1px);
              background-size: 20px 20px;
              opacity: 0.4;
              z-index: 1;
              pointer-events: none;
            }

            /* Efectos de datos flotantes */
            .data-point {
              position: absolute;
              background-color: rgba(37, 99, 235, 0.8);
              border-radius: 50%;
              width: 4px;
              height: 4px;
              animation: float-data 8s infinite linear;
            }

            @keyframes float-data {
              0% {
                transform: translateY(0) translateX(0);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(-100px) translateX(50px);
                opacity: 0;
              }
            }
            
            /* Efecto de hologramas */
            .hologram {
              position: relative;
              overflow: hidden;
            }

            .hologram::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, transparent 0%, rgba(37, 99, 235, 0.1) 50%, transparent 100%);
              z-index: 2;
              animation: hologram-scan 3s linear infinite;
            }

            @keyframes hologram-scan {
              0% {
                transform: translateY(-100%);
              }
              100% {
                transform: translateY(100%);
              }
            }

            /* Efectos de proceso digital */
            .process-node {
              position: relative;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background-color: #3b82f6;
              box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
            }

            .process-line {
              height: 2px;
              background: linear-gradient(90deg, #3b82f6, #60a5fa);
              position: relative;
              overflow: hidden;
            }

            .process-line::after {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 50%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
              animation: process-flow 2s infinite linear;
            }

            @keyframes process-flow {
              0% {
                left: -50%;
              }
              100% {
                left: 100%;
              }
            }
          `}
        </style>
      </Helmet>
      
      {/* Cursor personalizado de estilo tech */}
      <div className="cursor-glow"></div>
      
      {/* Partículas de código */}
      <div className="code-particles fixed inset-0 overflow-hidden pointer-events-none z-10"></div>
      
      {/* Hero Section con Parallax */}
      <motion.div 
        style={{ opacity, scale }}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-blue-900 to-gray-800 z-0"></div>
        
        {/* Efecto de luz de fondo */}
        <div className="backlight w-96 h-96 bg-blue-600 top-1/4 right-1/4"></div>
        <div className="backlight w-96 h-96 bg-blue-400 bottom-1/4 left-1/4"></div>
        
        {/* Líneas de circuito */}
        {[...Array(10)].map((_, i) => (
          <div 
            key={`line-${i}`}
            className="circuit-line"
            style={{
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 50 + 50}%`,
              left: `${Math.random() * 50}%`,
              opacity: Math.random() * 0.2 + 0.1
            }}
          ></div>
        ))}
        
        {/* Puntos de circuito */}
        {[...Array(20)].map((_, i) => (
          <div 
            key={`dot-${i}`}
            className="circuit-dot"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2
            }}
          ></div>
        ))}
        
        {/* Malla digital */}
        <div className="digital-mesh"></div>
        
        {/* Puntos de datos flotantes */}
        {[...Array(15)].map((_, i) => (
          <div 
            key={`data-point-${i}`}
            className="data-point"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`
            }}
          ></div>
        ))}
        
        {/* Líneas de conexión */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={`connection-${i}`}
            className="connection-line"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: '10%',
              width: `${30 + Math.random() * 40}%`,
              transform: `rotate(${Math.random() * 40 - 20}deg)`,
              animationDelay: `${Math.random() * 3}s`
            }}
          ></div>
        ))}
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            className="mb-6 inline-block"
          >
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg hologram">
              <svg className="w-16 h-16 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg"
          >
            <span className="text-blue-400">Blue</span>Tec
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl text-blue-100 max-w-3xl mx-auto mb-8"
          >
            Tu aliado tecnológico en Paraguay, ofreciendo los mejores productos informáticos con la calidad y garantía que mereces desde 2023.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative"
          >
            <button 
              onClick={() => {
                window.scrollTo({
                  top: window.innerHeight,
                  behavior: 'smooth'
                });
              }}
              className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-lg transition duration-300 shadow-lg shine-button"
            >
              Descubre Nuestra Historia
            </button>
            
            {/* Efecto de onda al botón */}
            <div className="absolute -inset-4 rounded-xl border border-blue-400 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </motion.div>
          
          {/* Íconos de tecnología flotantes */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="absolute bottom-32 left-0 right-0 flex justify-center space-x-12 opacity-60"
          >
            {/* Iconos de tecnología */}
            <motion.div variants={floatAnimation} animate="animate" className="text-blue-400 text-4xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a2 2 0 0 0-2 2v4H3.5a1.5 1.5 0 0 0 0 3h2.5v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4h2.5a1.5 1.5 0 0 0 0-3H12V3a2 2 0 0 0-2-2H8z"/>
              </svg>
            </motion.div>
            <motion.div variants={floatAnimation} animate="animate" className="text-blue-300 text-4xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6 1H1v14h5V1zm9 0h-5v5h5V1zm0 9v5h-5v-5h5zM0 1a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1zm9 0a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V1zm1 8a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-5z"/>
              </svg>
            </motion.div>
            <motion.div variants={floatAnimation} animate="animate" className="text-blue-500 text-4xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/>
              </svg>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-8 h-14 border-2 border-blue-400 rounded-full flex justify-center">
            <motion.div 
              animate={{ 
                y: [0, 10, 0], 
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5 
              }}
              className="w-2 h-2 bg-blue-400 rounded-full mt-2"
            ></motion.div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Nuestra Historia */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
        className="py-20 bg-white relative overflow-hidden"
      >
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full opacity-20 blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full opacity-20 blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 relative inline-block">
              Nuestra Historia
              <div className="absolute -bottom-3 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
            </h2>
            <p className="text-lg text-gray-600">
              Nacimos con la misión de ofrecer soluciones tecnológicas de calidad a todos los paraguayos, brindando una experiencia de compra excepcional, sin necesidad de salir de casa.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div 
              variants={fadeIn}
              className="rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform duration-500"
            >
              <div className="bg-blue-50 p-8 h-full">
                <div className="h-1 w-20 bg-blue-500 rounded-full mb-6 glow-bar"></div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">De Idea a Realidad</h3>
                <p className="text-gray-600 mb-4">
                  Zenn comenzó como un sueño de llevar la mejor tecnología a cada rincón de Paraguay. Identificamos la necesidad de ofrecer productos informáticos de calidad con asesoramiento experto y precios competitivos.
                </p>
                <p className="text-gray-600">
                  Hoy en día, nos hemos convertido en una referencia en el mercado paraguayo, destacándonos por nuestra atención personalizada y envíos rápidos a todo el país.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="relative"
            >
              <div className="aspect-video bg-gradient-to-tr from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-xl transform hover:rotate-2 transition-transform duration-500 card-neomorphic">
                <div className="absolute inset-0 bg-pattern-dot opacity-10"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="text-6xl font-bold mb-4 terminal-text">2023</div>
                    <p className="text-xl text-gray-700">Año de fundación</p>
                    <div className="mt-4 flex justify-center space-x-2">
                      {/* Iconos de datos */}
                      <div className="flex items-center text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        <span>+1000 clientes</span>
                      </div>
                      <div className="flex items-center text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>Entrega 24 a 48 hs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Elementos decorativos */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
            </motion.div>
          </div>
        </div>
      </motion.section>
      
      {/* Nuestros Valores */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
        className="py-20 bg-gray-50 relative overflow-hidden"
      >
        {/* Elementos decorativos tech */}
        <div className="absolute inset-0 bg-pattern-dot opacity-10"></div>
        
        {/* Líneas de conexión */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={`value-line-${i}`}
            className="connection-line absolute"
            style={{
              top: `${30 + i * 10}%`,
              left: '20%',
              width: `${40 + Math.random() * 20}%`,
              transform: `rotate(${Math.random() * 20 - 10}deg)`,
              animationDelay: `${Math.random() * 2}s`
            }}
          ></div>
        ))}
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 relative inline-block">
              Nuestros Valores
              <div className="absolute -bottom-3 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
            </h2>
            <p className="text-lg text-gray-600">
              En Zenn, nos guiamos por principios fundamentales que definen nuestra identidad y la forma en que servimos a nuestros clientes.
            </p>
          </div>
          
          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Tarjeta de Innovación */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-xl shadow-lg overflow-hidden card-neomorphic"
              onMouseEnter={() => setActiveCard('innovation')}
              onMouseLeave={() => setActiveCard(null)}
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Innovación</h3>
                <p className="text-gray-600">
                  Buscamos constantemente las últimas tecnologías y soluciones para ofrecer productos de vanguardia que satisfagan las necesidades de nuestros clientes.
                </p>
                <div className="mt-6 h-1 w-12 bg-blue-500 rounded-full"></div>
              </div>
            </motion.div>
            
            {/* Tarjeta de Calidad */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-xl shadow-lg overflow-hidden card-neomorphic"
              onMouseEnter={() => setActiveCard('quality')}
              onMouseLeave={() => setActiveCard(null)}
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Calidad</h3>
                <p className="text-gray-600">
                  Seleccionamos minuciosamente cada producto que ofrecemos, garantizando los más altos estándares de calidad y durabilidad para su inversión tecnológica.
                </p>
                <div className="mt-6 h-1 w-12 bg-blue-500 rounded-full"></div>
              </div>
            </motion.div>
            
            {/* Tarjeta de Servicio */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-xl shadow-lg overflow-hidden card-neomorphic"
              onMouseEnter={() => setActiveCard('service')}
              onMouseLeave={() => setActiveCard(null)}
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Atención Personalizada</h3>
                <p className="text-gray-600">
                  Nos destacamos por ofrecer un servicio cercano y personalizado, asesorando a cada cliente según sus necesidades específicas para asegurar su satisfacción.
                </p>
                <div className="mt-6 h-1 w-12 bg-blue-500 rounded-full"></div>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Proceso digital */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-12">Nuestro Proceso</h3>
            <div className="flex items-center justify-between relative">
              {/* Línea de conexión principal */}
              <div className="absolute left-0 right-0 h-1 bg-blue-200">
                <div className="process-line absolute inset-0"></div>
              </div>
              
              {/* Nodos del proceso */}
              <div className="relative z-10 text-center">
                <div className="process-node mx-auto mb-4"></div>
                <p className="font-medium text-blue-700">Selección</p>
                <p className="text-sm text-gray-600 mt-1">Productos premium</p>
              </div>
              
              <div className="relative z-10 text-center">
                <div className="process-node mx-auto mb-4"></div>
                <p className="font-medium text-blue-700">Venta</p>
                <p className="text-sm text-gray-600 mt-1">Experiencia fluida</p>
              </div>
              
              <div className="relative z-10 text-center">
                <div className="process-node mx-auto mb-4"></div>
                <p className="font-medium text-blue-700">Entrega</p>
                <p className="text-sm text-gray-600 mt-1">Rápida y segura</p>
              </div>
              
              <div className="relative z-10 text-center">
                <div className="process-node mx-auto mb-4"></div>
                <p className="font-medium text-blue-700">Soporte</p>
                <p className="text-sm text-gray-600 mt-1">Continuo y efectivo</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      
      {/* Ubicación */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
        className="py-20 bg-white relative overflow-hidden"
      >
        {/* Elementos decorativos de tecnología */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500"></div>
        
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 relative inline-block">
                Nuestra Ubicación
                <div className="absolute -bottom-3 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
              </h2>
              <p className="text-lg text-gray-600">
                Aunque somos principalmente una tienda online, también contamos con un local físico donde puedes retirar tus productos.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-8 card-neomorphic m-4 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información de Contacto
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-800">Dirección</h4>
                        <p className="text-gray-600">Gaudioso Nuñez casi Celsa Speratti - Asuncion</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-800">Teléfono</h4>
                        <p className="text-gray-600">+595 981 150393</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-800">Email</h4>
                        <p className="text-gray-600">ventas@zenn.com.py</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-800">WhatsApp</h4>
                        <p className="text-gray-600">+595 981 150393</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Horario de Atención
                    </h3>
                    <div className="space-y-2 text-gray-600">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <p>Lunes a Viernes: 8:00 - 18:00</p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                        <p>Sábados: 8:00 - 13:00</p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-300 rounded-full mr-2"></div>
                        <p>Domingos: Cerrado</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="h-96 relative bg-gray-800">
                  {/* Contenedor del mapa con efectos tech */}
                  <div className="map-container h-full">
                    {/* Google Maps iframe */}
                   <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d67695.23063226297!2d-57.529639424448426!3d-25.314952781028982!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x945da9831c090b5b%3A0x448b0dc581658acb!2sZenn!5e0!3m2!1ses-419!2spy!4v1748808634875!5m2!1ses-419!2spy"
                    width="100%" 
                    height="100%" 
                    style={{border: 0, filter: 'contrast(1.1) saturate(1.2)'}} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0"
                    title="Ubicación de Zenn"
                  ></iframe>
                    
                    {/* Overlay de estilo tech */}
                    <div className="map-overlay"></div>
                    
                    {/* Marco de estilo tech */}
                    <div className="map-frame"></div>
                    
                    {/* Esquinas de marco tech */}
                    <div className="map-corner map-corner-tl"></div>
                    <div className="map-corner map-corner-tr"></div>
                    <div className="map-corner map-corner-bl"></div>
                    <div className="map-corner map-corner-br"></div>
                    
                    {/* Línea de escaneo */}
                    <div className="map-scan-line"></div>
                    
                    {/* Punto de ubicación con pulso */}
                    <div className="map-pulse"></div>
                    
                    {/* Coordenadas de estilo tech */}
                    <div className="map-coordinates">
                      LAT: -25.303494 | LONG: -57.601144
                    </div>
                    
                    {/* Etiqueta con el nombre de la empresa */}
                    <div className="absolute bottom-4 right-4 z-20">
                      <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <p className="font-bold text-blue-600">Zenn</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      
      {/* Nuestras Ventajas */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="py-20 bg-gray-50 relative overflow-hidden"
      >
        {/* Fondo digital */}
        <div className="absolute inset-0 digital-mesh"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 relative inline-block">
              Nuestras Ventajas
              <div className="absolute -bottom-3 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
            </h2>
            <p className="text-lg text-gray-600">
              Elegir Zenn significa optar por la excelencia tecnológica y un servicio que supera expectativas.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Ventajas columna izquierda */}
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-xl shadow-lg flex items-start card-neomorphic"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Envíos Rápidos</h3>
                  <p className="text-gray-600">
                    Entregamos en 24-48 horas en Asunción y Gran Asunción, con cobertura a todo el país.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white p-6 rounded-xl shadow-lg flex items-start card-neomorphic"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Garantía Asegurada</h3>
                  <p className="text-gray-600">
                    Todos nuestros productos cuentan con garantía oficial, respaldada por las mejores marcas del mercado.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white p-6 rounded-xl shadow-lg flex items-start card-neomorphic"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Múltiples Métodos de Pago</h3>
                  <p className="text-gray-600">
                    Aceptamos tarjetas de crédito, débito, transferencias bancarias y efectivo. Facilitamos tu compra.
                  </p>
                </div>
              </motion.div>
            </div>
            
            {/* Ventajas columna derecha */}
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-xl shadow-lg flex items-start card-neomorphic"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Asesoramiento Especializado</h3>
                  <p className="text-gray-600">
                    Nuestro equipo de expertos te guiará para encontrar la solución tecnológica ideal para tus necesidades.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white p-6 rounded-xl shadow-lg flex items-start card-neomorphic"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Productos Seleccionados</h3>
                  <p className="text-gray-600">
                    Curada selección de productos de las mejores marcas, asegurando rendimiento y durabilidad.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white p-6 rounded-xl shadow-lg flex items-start card-neomorphic"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Experiencia Tecnológica</h3>
                  <p className="text-gray-600">
                    Navegación intuitiva, proceso de compra simplificado y soporte técnico disponible para resolver tus dudas.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>
      
      {/* CTA Final */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="py-16 bg-white"
      >
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-12 sm:px-12 relative">
              {/* Elementos decorativos tech */}
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              
              {/* Efecto de luces de fondo */}
              <div className="backlight w-64 h-64 bg-blue-600 absolute top-0 left-1/4 opacity-40"></div>
              <div className="backlight w-64 h-64 bg-blue-400 absolute bottom-0 right-1/4 opacity-40"></div>
              
              {/* Circuito */}
              {[...Array(5)].map((_, i) => (
                <div 
                  key={`cta-line-${i}`}
                  className="circuit-line absolute"
                  style={{
                    top: `${20 * i}%`,
                    width: `${Math.random() * 30 + 70}%`,
                    left: `${Math.random() * 20}%`,
                    opacity: 0.2
                  }}
                ></div>
              ))}
              
              <div className="relative z-10 text-center">
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-3xl font-bold text-white mb-6"
                >
                  ¡Compra ahora y recibe tu pedido en tiempo récord!
                </motion.h2>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-blue-100 text-lg max-w-2xl mx-auto mb-8"
                >
                  Nuestro compromiso es brindarte la mejor experiencia de compra online con envíos rápidos a todo Paraguay.
                </motion.p>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <a href="/" className="inline-block px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 rounded-lg font-bold text-lg transition duration-300 shadow-lg shine-button">
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Explorar Productos
                    </span>
                  </a>
                  <a href="/categoria-producto?category=informatica" className="inline-block px-8 py-4 bg-blue-700 text-white hover:bg-blue-800 rounded-lg font-bold text-lg transition duration-300 shadow-lg border border-blue-500 shine-button">
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      Ver Categorías
                    </span>
                  </a>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </>
  );
};

export default Nosotros;

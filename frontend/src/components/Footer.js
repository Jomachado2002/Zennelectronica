import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp, faInstagram, faFacebook } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#001440] to-[#002060] text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Información de Contacto */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-6 text-white">Contáctanos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <FontAwesomeIcon icon={faPhone} className="text-blue-300" />
                <span>+595 984 133733</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <FontAwesomeIcon icon={faEnvelope} className="text-blue-300" />
                <span>ventas@zenn.com.py</span>
              </div>
            </div>
          </div>
          
          {/* Horarios */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6 text-white">Horarios</h3>
            <div className="space-y-2">
              <div>
                <p className="font-semibold">Lunes a Viernes</p>
                <p className="text-blue-300">08:00 a 17:00 hrs</p>
              </div>
              <div>
                <p className="font-semibold">Sábado</p>
                <p className="text-blue-300">08:30 a 11:00 hrs</p>
              </div>
            </div>
          </div>
          
          {/* Redes Sociales */}
          <div className="text-center md:text-right">
            <h3 className="text-2xl font-bold mb-6 text-white">Síguenos</h3>
            <div className="flex justify-center md:justify-end space-x-6">
              <a
                href="https://www.instagram.com/zenn.py"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-blue-300 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={faInstagram} size="2x" />
              </a>
              <a
                href="https://wa.me/+595981150393"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-blue-300 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={faWhatsapp} size="2x" />
              </a>
              <a
                href="https://www.facebook.com/people/zenn/100071147355980/#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-blue-300 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={faFacebook} size="2x" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Derechos de autor */}
        <div className="border-t border-blue-800 mt-8 pt-6 text-center">
          <p className="text-blue-200">
            ©{new Date().getFullYear()} Zenn. Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
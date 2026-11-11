import React from 'react';
import { Link } from 'react-router-dom';
import { HOME_SLOT_ROUTES, categoriaProductoHref } from '../config/homeSlotRoutes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp, faInstagram, faFacebook } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';

const Footer = () => {
  return (
    <footer 
      className="text-white py-12"
      style={{
        background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
      }}
    >
      <div className="w-full px-4 lg:px-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Información de Contacto */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-6 text-white">Contáctanos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <FontAwesomeIcon icon={faPhone} className="text-white/80" />
                <span>+595 973 345284</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <FontAwesomeIcon icon={faEnvelope} className="text-white/80" />
                <span>ventas@zenn.com.py</span>
              </div>
            </div>
            <p className="font-semibold mt-6 mb-2">En Paraguay</p>
            <div className="space-y-2 text-sm">
              {[
                ['Notebooks en Paraguay', HOME_SLOT_ROUTES.notebooks],
                ['Celulares en Paraguay', HOME_SLOT_ROUTES.celulares],
                ['Monitores en Paraguay', HOME_SLOT_ROUTES.monitores],
                ['SSD en Paraguay', HOME_SLOT_ROUTES.discos],
                ['Teclados en Paraguay', HOME_SLOT_ROUTES.teclados],
                ['Auriculares en Paraguay', { category: 'perifericos', subcategory: 'auriculares_y_accesorios__30_05' }],
                ['Adaptadores en Paraguay', { category: 'perifericos', subcategory: 'adaptadores__30_09_01' }]
              ].map(([label, route]) => (
                <Link
                  key={label}
                  to={categoriaProductoHref(route.category, route.subcategory)}
                  className="block text-white/90 hover:text-white underline-offset-2 hover:underline"
                >
                  {label}
                </Link>
              ))}
              <Link to="/nosotros" className="block text-white/90 hover:text-white underline-offset-2 hover:underline">
                Nosotros
              </Link>
              <Link to="/promociones" className="block text-white/90 hover:text-white underline-offset-2 hover:underline">
                Promociones
              </Link>
              <Link to="/devoluciones" className="block text-white/90 hover:text-white underline-offset-2 hover:underline">
                Devoluciones y garantía
              </Link>
            </div>
            <p className="font-semibold mt-6 mb-2">Envíos a todo el país</p>
            <div className="space-y-2 text-sm">
              {[
                ['Celulares Alto Paraná', HOME_SLOT_ROUTES.celulares, 'alto-parana'],
                ['Celulares Ciudad del Este', HOME_SLOT_ROUTES.celulares, 'ciudad-del-este'],
                ['Celulares Santaní', HOME_SLOT_ROUTES.celulares, 'santani'],
                ['Placas madre Concepción', { category: 'placas_madre', subcategory: '' }, 'concepcion'],
                ['Notebooks Encarnación', HOME_SLOT_ROUTES.notebooks, 'encarnacion'],
                ['Monitores Pedro Juan Caballero', HOME_SLOT_ROUTES.monitores, 'pedro-juan-caballero']
              ].map(([label, route, envio]) => (
                <Link
                  key={label}
                  to={categoriaProductoHref(route.category, route.subcategory, envio)}
                  className="block text-white/90 hover:text-white underline-offset-2 hover:underline"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Horarios */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6 text-white">Horarios</h3>
            <div className="space-y-2">
              <div>
                <p className="font-semibold">Lunes a Viernes</p>
                <p className="text-white/80">08:00 a 17:00 hrs</p>
              </div>
              <div>
                <p className="font-semibold">Sábado</p>
                <p className="text-white/80">08:30 a 11:00 hrs</p>
              </div>
            </div>
          </div>
          
          {/* Redes Sociales */}
          <div className="text-center md:text-right">
            <h3 className="text-2xl font-bold mb-6 text-white">Síguenos</h3>
            <div className="flex justify-center md:justify-end space-x-6">
              <a
                href="https://www.instagram.com/zennelectronicos/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/80 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={faInstagram} size="2x" />
              </a>
              <a
                href="https://wa.me/+595973345284"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/80 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={faWhatsapp} size="2x" />
              </a>
              <a
                href="https://www.facebook.com/Zennelectronicos/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/80 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={faFacebook} size="2x" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Derechos de autor */}
        <div className="border-t border-white/30 mt-8 pt-6 text-center space-y-3">
          <p className="text-white/80 text-sm">
            Gaudioso Nuñez casi Celsa Speratti, Asunción, Paraguay
          </p>
          <p className="text-white/80 text-sm">
            Envío a Asunción y todo Paraguay.
          </p>
          <p className="text-white/80">
            ©{new Date().getFullYear()} Zenn. Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
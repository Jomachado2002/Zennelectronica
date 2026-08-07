import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaAngleRight } from 'react-icons/fa';
import VerticalCardProductOptimized from '../VerticalCardProductOptimized';
import NotebookBanner from '../NotebookBanner';
import scrollTop from '../../helpers/scrollTop';
import { categoriaProductoHref } from '../../config/homeSlotRoutes';

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const gradientText = {
  background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const gradientBtn = {
  background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)'
};

function verMasHref(section) {
  const cat = section?.verMas?.category || section?.pairs?.[0]?.category;
  const sub = section?.verMas?.subcategory || section?.pairs?.[0]?.subcategory;
  return categoriaProductoHref(cat, sub);
}

function groupSections(sections) {
  const groups = [];
  let gridBuffer = [];

  const flushGrid = () => {
    if (!gridBuffer.length) return;
    groups.push({ type: 'grid', sections: gridBuffer });
    gridBuffer = [];
  };

  for (const section of sections) {
    if (section.layout === 'grid') {
      gridBuffer.push(section);
    } else {
      flushGrid();
      groups.push({ type: 'single', section });
    }
  }
  flushGrid();
  return groups;
}

function HeroSection({ section, products, loading }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={fadeIn}
      className="w-full"
    >
      <div className="flex flex-col lg:flex-row items-stretch gap-8">
        <motion.div variants={fadeIn} className="w-full lg:w-1/3">
          <div className="h-full relative overflow-hidden rounded-2xl shadow-2xl group">
            <NotebookBanner />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6 transform translate-y-2 group-hover:translate-y-0 transition duration-300 pointer-events-none">
              <Link
                to={verMasHref(section)}
                onClick={() => scrollTop()}
                className="pointer-events-auto text-white font-semibold text-sm hover:underline"
              >
                Ver catálogo →
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeIn} className="w-full lg:w-2/3">
          <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-bold mb-4 flex items-center bg-clip-text text-transparent"
                  style={gradientText}
                >
                  {section.title}
                </h2>
                {section.subtitle ? (
                  <p className="mt-2 text-sm text-gray-600 max-w-xl">{section.subtitle}</p>
                ) : null}
                <div className="h-1 w-32 mb-6 rounded-full" style={gradientBtn} />
              </div>
              <Link to={verMasHref(section)} onClick={() => scrollTop()}>
                <button
                  className="px-6 py-3 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center group/btn"
                  style={gradientBtn}
                >
                  Ver más{' '}
                  <FaAngleRight className="ml-1 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </button>
              </Link>
            </div>
            <VerticalCardProductOptimized
              category={section.verMas?.category || section.pairs?.[0]?.category}
              subcategory={section.verMas?.subcategory || section.pairs?.[0]?.subcategory}
              carouselKey={section.key}
              heading=""
              products={products}
              loading={loading}
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

function FullSection({ section, products, loading }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={fadeIn}
      className="w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent"
                style={gradientText}
              >
                {section.title}
              </h2>
              {section.subtitle ? (
                <p className="mt-2 text-sm text-gray-600 max-w-xl">{section.subtitle}</p>
              ) : null}
              <div className="h-1 w-24 mt-2 rounded-full" style={gradientBtn} />
            </div>
            <Link to={verMasHref(section)} onClick={() => scrollTop()}>
              <button
                className="mt-4 md:mt-0 px-6 py-3 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
                style={gradientBtn}
              >
                Ver más
              </button>
            </Link>
          </div>
          <div className="mt-6">
            <VerticalCardProductOptimized
              category={section.verMas?.category || section.pairs?.[0]?.category}
              subcategory={section.verMas?.subcategory || section.pairs?.[0]?.subcategory}
              carouselKey={section.key}
              heading=""
              products={products}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function GridCard({ section, products, loading }) {
  return (
    <motion.div variants={fadeIn} className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 text-white" style={gradientBtn}>
        <h2 className="text-2xl font-bold flex items-center text-white">{section.title}</h2>
        {section.subtitle ? (
          <p className="text-sm text-white/90 mt-1 max-w-xl">{section.subtitle}</p>
        ) : null}
        <div className="h-1 w-24 bg-white/30 mt-2 mb-4 rounded-full" />
      </div>
      <div className="p-4">
        <VerticalCardProductOptimized
          category={section.verMas?.category || section.pairs?.[0]?.category}
          subcategory={section.verMas?.subcategory || section.pairs?.[0]?.subcategory}
          carouselKey={section.key}
          heading=""
          products={products}
          loading={loading}
        />
      </div>
      <div className="p-4 pt-0 text-center">
        <Link to={verMasHref(section)} onClick={() => scrollTop()}>
          <button
            className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
            style={gradientBtn}
          >
            Ver más
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

/**
 * Renderiza vitrinas del home desde `sections` (Mongo / CMS).
 */
const HomeDynamicSections = ({ sections = [], slotProducts, loading }) => {
  if (!sections.length) return null;

  const groups = groupSections(sections);

  return (
    <>
      {groups.map((group, gi) => {
        if (group.type === 'single') {
          const { section } = group;
          const products = slotProducts(section.key);
          if (section.layout === 'hero') {
            return (
              <HeroSection
                key={section.key}
                section={section}
                products={products}
                loading={loading}
              />
            );
          }
          return (
            <FullSection
              key={section.key}
              section={section}
              products={products}
              loading={loading}
            />
          );
        }

        return (
          <motion.section
            key={`grid-${gi}`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            className="w-full"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {group.sections.map((section) => (
                <GridCard
                  key={section.key}
                  section={section}
                  products={slotProducts(section.key)}
                  loading={loading}
                />
              ))}
            </div>
          </motion.section>
        );
      })}
    </>
  );
};

export default HomeDynamicSections;

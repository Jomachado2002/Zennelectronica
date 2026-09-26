import React from 'react';
import { Link } from 'react-router-dom';
import { FaAngleRight } from 'react-icons/fa';
import VerticalCardProductOptimized from '../VerticalCardProductOptimized';
import LazyWhenVisible from '../LazyWhenVisible';
import scrollTop from '../../helpers/scrollTop';
import { categoriaProductoHref } from '../../config/homeSlotRoutes';

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

function FullSection({ section, products, loading, eager, prioritizeImages }) {
  return (
    <section className="w-full">
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
                type="button"
                className="mt-4 md:mt-0 px-6 py-3 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
                style={gradientBtn}
              >
                Ver más
              </button>
            </Link>
          </div>
          <div className="mt-6">
            <LazyWhenVisible eager={eager} minHeight={300}>
              <VerticalCardProductOptimized
                category={section.verMas?.category || section.pairs?.[0]?.category}
                subcategory={section.verMas?.subcategory || section.pairs?.[0]?.subcategory}
                carouselKey={section.key}
                heading=""
                products={products}
                loading={loading}
                prioritizeImages={prioritizeImages}
              />
            </LazyWhenVisible>
          </div>
        </div>
      </div>
    </section>
  );
}

function GridCard({ section, products, loading, eager, prioritizeImages }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 text-white" style={gradientBtn}>
        <h2 className="text-2xl font-bold flex items-center text-white">{section.title}</h2>
        {section.subtitle ? (
          <p className="text-sm text-white/90 mt-1 max-w-xl">{section.subtitle}</p>
        ) : null}
        <div className="h-1 w-24 bg-white/30 mt-2 mb-4 rounded-full" />
      </div>
      <div className="p-4">
        <LazyWhenVisible eager={eager} minHeight={280}>
          <VerticalCardProductOptimized
            category={section.verMas?.category || section.pairs?.[0]?.category}
            subcategory={section.verMas?.subcategory || section.pairs?.[0]?.subcategory}
            carouselKey={section.key}
            heading=""
            products={products}
            loading={loading}
            prioritizeImages={prioritizeImages}
          />
        </LazyWhenVisible>
      </div>
      <div className="p-4 pt-0 text-center">
        <Link to={verMasHref(section)} onClick={() => scrollTop()}>
          <button
            type="button"
            className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
            style={gradientBtn}
          >
            Ver más
          </button>
        </Link>
      </div>
    </div>
  );
}

function SectionsSkeleton() {
  return (
    <div className="w-full space-y-8" aria-hidden>
      <div className="h-8 w-2/3 max-w-md rounded bg-gray-200 animate-pulse" />
      <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
      <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
    </div>
  );
}

/**
 * Renderiza vitrinas del home desde `sections` (Mongo / CMS).
 */
const HomeDynamicSections = ({ sections = [], slotProducts, loading }) => {
  if (!sections.length) {
    return loading ? <SectionsSkeleton /> : null;
  }

  const groups = groupSections(sections);
  let sectionIndex = 0;

  return (
    <>
      {groups.map((group, gi) => {
        if (group.type === 'single') {
          const { section } = group;
          const products = slotProducts(section.key);
          const prioritizeImages = sectionIndex === 0;
          sectionIndex += 1;
          return (
            <FullSection
              key={section.key}
              section={section}
              products={products}
              loading={loading}
              eager
              prioritizeImages={prioritizeImages}
            />
          );
        }

        return (
          <section key={`grid-${gi}`} className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {group.sections.map((section) => {
                const prioritizeImages = sectionIndex === 0;
                sectionIndex += 1;
                return (
                  <GridCard
                    key={section.key}
                    section={section}
                    products={slotProducts(section.key)}
                    loading={loading}
                    eager
                    prioritizeImages={prioritizeImages}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
};

export default HomeDynamicSections;

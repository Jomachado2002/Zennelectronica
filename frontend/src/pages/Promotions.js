import React from 'react';
import { Helmet } from 'react-helmet';
import { FilterProvider } from '../context/FilterContext';
import { CategoryProductContent } from './CategoryProduct';
import { SITE_ORIGIN } from '../config/siteUrl';

/**
 * /promociones — mismos filtros que categoria-producto
 * (categoría, subcategoría, specs, marcas, precio),
 * pero solo productos con price > sellingPrice (badge de descuento).
 */
const Promotions = () => {
  return (
    <>
      <Helmet>
        <title>Promociones y Ofertas | Zenn</title>
        <meta
          name="description"
          content="Productos en promoción en Zenn Paraguay. Filtrá por categoría, subcategoría y especificaciones."
        />
        <link rel="canonical" href={`${SITE_ORIGIN}/promociones`} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16909859875" />
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-16909859875');
          `}
        </script>
      </Helmet>

      <div className="bg-gradient-to-r from-[#00B5D8]/10 via-white to-[#7B2CBF]/10 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 sm:py-5">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-[#7B2CBF]">
            Ofertas activas
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
            Promociones
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Solo productos con descuento real (precio anterior tachado). Filtrá por
            categoría, subcategoría y especificaciones, o tocá «Ver todo».
          </p>
        </div>
      </div>

      <FilterProvider mode="promotions" basePath="/promociones">
        <CategoryProductContent />
      </FilterProvider>
    </>
  );
};

export default Promotions;

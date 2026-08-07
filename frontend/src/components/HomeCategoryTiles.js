import React from 'react';
import { Link } from 'react-router-dom';
import scrollTop from '../helpers/scrollTop';
import { cdnThumbUrl } from '../helpers/cdnImageUrl';

const TILE_SKELETON_COUNT = 5;

/**
 * Tiles del home (Notebooks, Games, Informática…).
 * Imagen + label + href configurables desde el admin (CDN).
 */
const HomeCategoryTiles = ({ tiles = [], pending = false }) => {
  const list = Array.isArray(tiles) ? tiles.filter((t) => t && t.enabled !== false && t.label) : [];

  if (pending && !list.length) {
    return (
      <section className="w-full bg-white py-4 sm:py-6" aria-hidden>
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: TILE_SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                <div className="h-10 bg-gray-800/80 animate-pulse" />
                <div className="min-h-[120px] sm:min-h-[150px] bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!list.length) return null;

  return (
    <section className="w-full bg-white py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {list.map((tile, idx) => {
            const href = tile.href || '/categoria-producto';
            const imgSrc = tile.image
              ? cdnThumbUrl(tile.image, { width: 480, quality: 75, fit: 'cover' })
              : '';
            const inner = (
              <>
                <div className="bg-gray-900 text-white text-center text-sm sm:text-base font-bold py-2.5 px-2 rounded-t-xl tracking-wide">
                  {tile.label}
                </div>
                <div
                  className="rounded-b-xl overflow-hidden flex items-center justify-center min-h-[120px] sm:min-h-[150px]"
                  style={{
                    background: 'linear-gradient(145deg, #00B5D8 0%, #1E90FF 45%, #7B2CBF 100%)'
                  }}
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={tile.label}
                      className="w-full h-full object-cover max-h-[160px] sm:max-h-[180px]"
                      loading={idx < 5 ? 'eager' : 'lazy'}
                      fetchPriority={idx < 2 ? 'high' : 'auto'}
                      decoding="async"
                      data-full={tile.image || ''}
                      onError={(e) => {
                        const t = e.currentTarget;
                        if (t.dataset.full && t.src !== t.dataset.full) {
                          t.src = t.dataset.full;
                          return;
                        }
                        t.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-white/90 text-xs font-medium px-3 py-6 text-center">
                      Subí una imagen en Admin → Home Media
                    </span>
                  )}
                </div>
              </>
            );

            if (/^https?:\/\//i.test(href)) {
              return (
                <a
                  key={tile._id || tile.key || tile.label}
                  href={href}
                  className="block group rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-100"
                >
                  {inner}
                </a>
              );
            }

            return (
              <Link
                key={tile._id || tile.key || tile.label}
                to={href.startsWith('/') ? href : `/${href}`}
                onClick={() => scrollTop()}
                className="block group rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-100"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeCategoryTiles;

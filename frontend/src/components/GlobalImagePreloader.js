// frontend/src/components/GlobalImagePreloader.js
import React, { useEffect, useState } from 'react';

const GlobalImagePreloader = ({ homeData, onPreloadComplete }) => {
  const [preloadStatus, setPreloadStatus] = useState({
    isPreloading: false,
    progress: 0,
    totalImages: 0,
    loadedImages: 0
  });

  useEffect(() => {
    if (!homeData?.data) return;

    const preloadAllHomeImages = async () => {
      setPreloadStatus(prev => ({ ...prev, isPreloading: true, progress: 0 }));

      // Recopilar todas las imágenes de todas las categorías
      const allImageUrls = new Set();
      
      Object.values(homeData.data).forEach(category => {
        if (typeof category === 'object') {
          Object.values(category).forEach(subcategory => {
            if (Array.isArray(subcategory)) {
              subcategory.forEach(product => {
                if (product?.productImage?.[0]) {
                  allImageUrls.add(product.productImage[0]);
                }
                if (product?.productImage?.[1]) {
                  allImageUrls.add(product.productImage[1]);
                }
              });
            }
          });
        }
      });

      const imageUrls = Array.from(allImageUrls);
      const totalImages = imageUrls.length;
      
      setPreloadStatus(prev => ({ 
        ...prev, 
        totalImages,
        loadedImages: 0 
      }));

      if (totalImages === 0) {
        setPreloadStatus(prev => ({ ...prev, isPreloading: false, progress: 100 }));
        onPreloadComplete?.();
        return;
      }

      // Función para cargar una imagen con máxima prioridad
      const loadImage = (url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.fetchPriority = 'high';
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            setPreloadStatus(prev => {
              const newLoaded = prev.loadedImages + 1;
              const progress = Math.round((newLoaded / totalImages) * 100);
              return {
                ...prev,
                loadedImages: newLoaded,
                progress
              };
            });
            resolve();
          };
          
          img.onerror = () => {
            setPreloadStatus(prev => {
              const newLoaded = prev.loadedImages + 1;
              const progress = Math.round((newLoaded / totalImages) * 100);
              return {
                ...prev,
                loadedImages: newLoaded,
                progress
              };
            });
            resolve();
          };
          
          img.src = url;
        });
      };

      // Cargar todas las imágenes en paralelo con alta concurrencia
      const concurrencyLimit = 20; // Aumentar concurrencia para máxima velocidad
      const chunks = [];
      
      for (let i = 0; i < imageUrls.length; i += concurrencyLimit) {
        chunks.push(imageUrls.slice(i, i + concurrencyLimit));
      }

      // Procesar chunks secuencialmente pero imágenes en paralelo
      for (const chunk of chunks) {
        await Promise.all(chunk.map(loadImage));
      }

      setPreloadStatus(prev => ({ ...prev, isPreloading: false, progress: 100 }));
      onPreloadComplete?.();
    };

    preloadAllHomeImages();
  }, [homeData, onPreloadComplete]);

  // No renderizar nada, solo precargar en background
  return null;
};

export default GlobalImagePreloader;

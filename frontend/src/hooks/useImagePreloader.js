// frontend/src/hooks/useImagePreloader.js
import { useState, useEffect } from 'react';

const useImagePreloader = (products) => {
  const [preloadedImages, setPreloadedImages] = useState(new Set());
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    if (!products || products.length === 0) return;

    setIsPreloading(true);
    setPreloadProgress(0);

    const preloadAllImages = async () => {
      const imageUrls = [];
      
      // Recopilar todas las URLs de imágenes
      products.forEach(product => {
        if (product?.productImage?.[0]) {
          imageUrls.push(product.productImage[0]);
        }
        if (product?.productImage?.[1]) {
          imageUrls.push(product.productImage[1]);
        }
      });

      const totalImages = imageUrls.length;
      let loadedImages = 0;
      const loadedSet = new Set();

      // Función para cargar una imagen
      const loadImage = (url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.fetchPriority = 'high';
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            loadedImages++;
            loadedSet.add(url);
            setPreloadProgress(Math.round((loadedImages / totalImages) * 100));
            resolve();
          };
          
          img.onerror = () => {
            loadedImages++;
            setPreloadProgress(Math.round((loadedImages / totalImages) * 100));
            resolve();
          };
          
          img.src = url;
        });
      };

      // Cargar todas las imágenes en paralelo con límite de concurrencia
      const concurrencyLimit = 10;
      const chunks = [];
      
      for (let i = 0; i < imageUrls.length; i += concurrencyLimit) {
        chunks.push(imageUrls.slice(i, i + concurrencyLimit));
      }

      // Procesar chunks secuencialmente pero imágenes en paralelo dentro de cada chunk
      for (const chunk of chunks) {
        await Promise.all(chunk.map(loadImage));
      }

      setPreloadedImages(loadedSet);
      setIsPreloading(false);
    };

    preloadAllImages();
  }, [products]);

  return {
    preloadedImages,
    isPreloading,
    preloadProgress,
    allImagesLoaded: preloadProgress === 100
  };
};

export default useImagePreloader;

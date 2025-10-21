import React, { useState, useRef, useEffect } from 'react';
import './OptimizedImage.css';

const OptimizedImage = ({
  src,
  alt,
  className = '',
  placeholder = '/placeholder.jpg',
  lazy = true,
  quality = 80,
  width,
  height,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy]);

  // Generate optimized image URL (if using a service like Cloudinary)
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return placeholder;
    
    // If using Cloudinary or similar service, add optimization parameters
    if (originalSrc.includes('cloudinary.com')) {
      const params = [];
      if (width) params.push(`w_${width}`);
      if (height) params.push(`h_${height}`);
      if (quality) params.push(`q_${quality}`);
      params.push('f_auto'); // Auto format selection
      params.push('c_limit'); // Limit to original dimensions
      
      return originalSrc.replace('/upload/', `/upload/${params.join(',')}/`);
    }
    
    return originalSrc;
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  const imageSrc = hasError ? placeholder : getOptimizedSrc(src);

  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={{ width, height }}
      {...props}
    >
      {/* Placeholder/Skeleton */}
      {!isLoaded && (
        <div className="image-placeholder">
          <div className="loading-skeleton"></div>
        </div>
      )}
      
      {/* Actual Image */}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          className={`optimized-image ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}
      
      {/* Fallback for no JavaScript */}
      <noscript>
        <img
          src={imageSrc}
          alt={alt}
          className="optimized-image"
          style={{ width, height }}
        />
      </noscript>
    </div>
  );
};

export default OptimizedImage;

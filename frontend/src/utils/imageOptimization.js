// Image optimization utilities
export const imageOptimization = {
  // Generate optimized image URL
  generateOptimizedUrl: (originalUrl, options = {}) => {
    if (!originalUrl) return '/placeholder.jpg';

    const {
      width,
      height,
      quality = 80,
      format = 'auto',
      fit = 'cover',
    } = options;

    // If using Cloudinary
    if (originalUrl.includes('cloudinary.com')) {
      const params = [];
      
      if (width) params.push(`w_${width}`);
      if (height) params.push(`h_${height}`);
      if (quality) params.push(`q_${quality}`);
      if (format) params.push(`f_${format}`);
      if (fit) params.push(`c_${fit}`);
      
      params.push('c_limit'); // Don't upscale
      
      return originalUrl.replace('/upload/', `/upload/${params.join(',')}/`);
    }

    // If using other image services, add similar logic
    return originalUrl;
  },

  // Get responsive image URLs
  getResponsiveUrls: (originalUrl, sizes = [320, 640, 1024, 1920]) => {
    return sizes.map(size => ({
      url: imageOptimization.generateOptimizedUrl(originalUrl, { width: size }),
      width: size,
    }));
  },

  // Generate srcset string
  generateSrcset: (originalUrl, sizes = [320, 640, 1024, 1920]) => {
    return sizes
      .map(size => {
        const url = imageOptimization.generateOptimizedUrl(originalUrl, { width: size });
        return `${url} ${size}w`;
      })
      .join(', ');
  },

  // Check if image format is supported
  isFormatSupported: (format) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    } catch (e) {
      return false;
    }
  },

  // Get best image format
  getBestFormat: () => {
    if (imageOptimization.isFormatSupported('avif')) return 'avif';
    if (imageOptimization.isFormatSupported('webp')) return 'webp';
    return 'jpg';
  },

  // Lazy load image
  lazyLoadImage: (img, src, placeholder = '/placeholder.jpg') => {
    if (!img) return;

    // Set placeholder first
    img.src = placeholder;

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target;
            
            // Load the actual image
            const actualImg = new Image();
            actualImg.onload = () => {
              target.src = actualImg.src;
              target.classList.add('loaded');
            };
            actualImg.onerror = () => {
              target.src = placeholder;
              target.classList.add('error');
            };
            actualImg.src = src;
            
            observer.unobserve(target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(img);
  },

  // Preload critical images
  preloadImages: (urls) => {
    urls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  },

  // Generate blur placeholder
  generateBlurPlaceholder: (width = 20, height = 20) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create a simple gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(1, '#e0e0e0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL();
  },

  // Optimize image for web
  optimizeForWeb: (file, options = {}) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const {
          maxWidth = 1920,
          maxHeight = 1080,
          quality = 0.8,
          format = 'image/jpeg',
        } = options;
        
        // Calculate dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },
};

// Image loading states
export const IMAGE_STATES = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

// Default image configurations
export const DEFAULT_IMAGE_CONFIG = {
  quality: 80,
  format: 'auto',
  fit: 'cover',
  placeholder: '/placeholder.jpg',
  sizes: [320, 640, 1024, 1920],
};

export default imageOptimization;

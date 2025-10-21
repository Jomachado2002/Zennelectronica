import { useEffect, useCallback, useRef } from 'react';

const useScrollOptimization = (options = {}) => {
  const {
    throttleDelay = 16, // ~60fps
    debounceDelay = 100,
    enablePassive = true,
  } = options;

  const lastScrollTime = useRef(0);
  const ticking = useRef(false);
  const timeoutRef = useRef(null);

  // Throttled scroll handler
  const throttledScroll = useCallback((callback, event) => {
    const now = Date.now();
    
    if (now - lastScrollTime.current >= throttleDelay) {
      lastScrollTime.current = now;
      callback(event);
    } else if (!ticking.current) {
      ticking.current = true;
      requestAnimationFrame(() => {
        lastScrollTime.current = Date.now();
        ticking.current = false;
        callback(event);
      });
    }
  }, [throttleDelay]);

  // Debounced scroll handler
  const debouncedScroll = useCallback((callback, event) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(event);
    }, debounceDelay);
  }, [debounceDelay]);

  // Optimized scroll listener
  const addScrollListener = useCallback((callback, useThrottle = true) => {
    const handler = useThrottle 
      ? (event) => throttledScroll(callback, event)
      : (event) => debouncedScroll(callback, event);

    const options = enablePassive ? { passive: true } : false;
    
    window.addEventListener('scroll', handler, options);
    
    return () => {
      window.removeEventListener('scroll', handler, options);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [throttledScroll, debouncedScroll, enablePassive]);

  // Intersection Observer for scroll-based animations
  const useIntersectionObserver = useCallback((callback, options = {}) => {
    const {
      threshold = 0.1,
      rootMargin = '0px',
      root = null,
    } = options;

    const observerRef = useRef(null);
    const elementRef = useRef(null);

    useEffect(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            callback(entry);
          });
        },
        {
          threshold,
          rootMargin,
          root,
        }
      );

      if (elementRef.current) {
        observerRef.current.observe(elementRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [callback, threshold, rootMargin, root]);

    return elementRef;
  }, []);

  // Scroll to element with smooth behavior
  const scrollToElement = useCallback((elementOrSelector, options = {}) => {
    const {
      behavior = 'smooth',
      block = 'start',
      inline = 'nearest',
      offset = 0,
    } = options;

    const element = typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior,
        block,
        inline,
      });
    }
  }, []);

  // Get scroll position
  const getScrollPosition = useCallback(() => ({
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop,
  }), []);

  // Check if element is in viewport
  const isInViewport = useCallback((element) => {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    addScrollListener,
    useIntersectionObserver,
    scrollToElement,
    getScrollPosition,
    isInViewport,
  };
};

export default useScrollOptimization;

// Production configuration
export const PRODUCTION_CONFIG = {
  // API Configuration
  API: {
    BASE_URL: process.env.REACT_APP_API_URL || 'https://zennelectronica02.vercel.app/api',
    TIMEOUT: 10000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
  },

  // Performance Configuration
  PERFORMANCE: {
    ENABLE_SERVICE_WORKER: process.env.REACT_APP_ENABLE_SERVICE_WORKER !== 'false',
    ENABLE_PERFORMANCE_MONITORING: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING !== 'false',
    ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS !== 'false',
    ENABLE_OFFLINE_SUPPORT: process.env.REACT_APP_ENABLE_OFFLINE_SUPPORT !== 'false',
    CACHE_VERSION: process.env.REACT_APP_CACHE_VERSION || '1.0.0',
    MAX_CACHE_SIZE: parseInt(process.env.REACT_APP_MAX_CACHE_SIZE) || 100,
    CACHE_TTL: parseInt(process.env.REACT_APP_CACHE_TTL) || 300000,
  },

  // Feature Flags
  FEATURES: {
    ENABLE_COMPRESSION: process.env.REACT_APP_ENABLE_COMPRESSION !== 'false',
    ENABLE_LAZY_LOADING: process.env.REACT_APP_ENABLE_LAZY_LOADING !== 'false',
    ENABLE_IMAGE_OPTIMIZATION: process.env.REACT_APP_ENABLE_IMAGE_OPTIMIZATION !== 'false',
    ENABLE_VIRTUALIZATION: process.env.REACT_APP_ENABLE_VIRTUALIZATION !== 'false',
    ENABLE_PREFETCHING: process.env.REACT_APP_ENABLE_PREFETCHING !== 'false',
    ENABLE_PRELOADING: process.env.REACT_APP_ENABLE_PRELOADING !== 'false',
    ENABLE_DNS_PREFETCH: process.env.REACT_APP_ENABLE_DNS_PREFETCH !== 'false',
    ENABLE_PRECONNECT: process.env.REACT_APP_ENABLE_PRECONNECT !== 'false',
    ENABLE_RESOURCE_HINTS: process.env.REACT_APP_ENABLE_RESOURCE_HINTS !== 'false',
    ENABLE_CRITICAL_CSS: process.env.REACT_APP_ENABLE_CRITICAL_CSS !== 'false',
    ENABLE_CODE_SPLITTING: process.env.REACT_APP_ENABLE_CODE_SPLITTING !== 'false',
    ENABLE_TREE_SHAKING: process.env.REACT_APP_ENABLE_TREE_SHAKING !== 'false',
  },

  // Monitoring Configuration
  MONITORING: {
    ENABLE_BUNDLE_ANALYSIS: process.env.REACT_APP_ENABLE_BUNDLE_ANALYSIS === 'true',
    ENABLE_PERFORMANCE_ANALYSIS: process.env.REACT_APP_ENABLE_PERFORMANCE_ANALYSIS !== 'false',
    ENABLE_MEMORY_MONITORING: process.env.REACT_APP_ENABLE_MEMORY_MONITORING !== 'false',
    ENABLE_NETWORK_MONITORING: process.env.REACT_APP_ENABLE_NETWORK_MONITORING !== 'false',
    ENABLE_ERROR_TRACKING: process.env.REACT_APP_ENABLE_ERROR_TRACKING !== 'false',
    ENABLE_USER_ANALYTICS: process.env.REACT_APP_ENABLE_USER_ANALYTICS !== 'false',
  },

  // Core Web Vitals Configuration
  CORE_WEB_VITALS: {
    ENABLE_CORE_WEB_VITALS: process.env.REACT_APP_ENABLE_CORE_WEB_VITALS !== 'false',
    ENABLE_LAYOUT_SHIFT_MONITORING: process.env.REACT_APP_ENABLE_LAYOUT_SHIFT_MONITORING !== 'false',
    ENABLE_PAINT_TIMING: process.env.REACT_APP_ENABLE_PAINT_TIMING !== 'false',
    ENABLE_RESOURCE_TIMING: process.env.REACT_APP_ENABLE_RESOURCE_TIMING !== 'false',
    ENABLE_NAVIGATION_TIMING: process.env.REACT_APP_ENABLE_NAVIGATION_TIMING !== 'false',
    ENABLE_LONG_TASK_MONITORING: process.env.REACT_APP_ENABLE_LONG_TASK_MONITORING !== 'false',
    ENABLE_FIRST_INPUT_DELAY: process.env.REACT_APP_ENABLE_FIRST_INPUT_DELAY !== 'false',
    ENABLE_LARGEST_CONTENTFUL_PAINT: process.env.REACT_APP_ENABLE_LARGEST_CONTENTFUL_PAINT !== 'false',
    ENABLE_CUMULATIVE_LAYOUT_SHIFT: process.env.REACT_APP_ENABLE_CUMULATIVE_LAYOUT_SHIFT !== 'false',
    ENABLE_FIRST_CONTENTFUL_PAINT: process.env.REACT_APP_ENABLE_FIRST_CONTENTFUL_PAINT !== 'false',
  },

  // Environment
  ENV: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    IS_TEST: process.env.NODE_ENV === 'test',
  },

  // Build Configuration
  BUILD: {
    GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP !== 'false',
    INLINE_RUNTIME_CHUNK: process.env.INLINE_RUNTIME_CHUNK !== 'false',
    ANALYZE_BUNDLE: process.env.ANALYZE === 'true',
  },
};

export default PRODUCTION_CONFIG;

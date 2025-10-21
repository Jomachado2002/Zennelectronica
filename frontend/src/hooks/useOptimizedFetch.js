import { useState, useEffect, useCallback, useRef } from 'react';

// Cache global para evitar peticiones duplicadas
const requestCache = new Map();
const pendingRequests = new Map();

const useOptimizedFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const {
    cacheTime = 300000, // 5 minutes default
    staleTime = 60000,  // 1 minute default
    retryCount = 3,
    retryDelay = 1000,
    enabled = true,
    ...fetchOptions
  } = options;

  const generateCacheKey = useCallback((url, options) => {
    return JSON.stringify({ url, options: { ...options, cacheTime, staleTime } });
  }, [cacheTime, staleTime]);

  const makeRequest = useCallback(async (url, options, retryAttempt = 0) => {
    const cacheKey = generateCacheKey(url, options);
    
    // Check cache first
    if (requestCache.has(cacheKey)) {
      const cachedData = requestCache.get(cacheKey);
      const now = Date.now();
      
      if (now - cachedData.timestamp < staleTime) {
        return cachedData.data;
      }
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    
    const requestPromise = fetch(url, {
      ...options,
      signal: abortControllerRef.current.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Cache the response
      requestCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });
      
      // Clean up pending request
      pendingRequests.delete(cacheKey);
      
      return responseData;
    }).catch(async (err) => {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
      
      if (err.name === 'AbortError') {
        throw err;
      }
      
      // Retry logic
      if (retryAttempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryAttempt + 1)));
        return makeRequest(url, options, retryAttempt + 1);
      }
      
      throw err;
    });

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);
    
    return requestPromise;
  }, [generateCacheKey, staleTime, retryCount, retryDelay]);

  const execute = useCallback(async () => {
    if (!enabled || !url) return;

    setLoading(true);
    setError(null);

    try {
      const result = await makeRequest(url, fetchOptions);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, enabled, makeRequest, fetchOptions]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Execute on mount and when dependencies change
  useEffect(() => {
    execute();
    
    return cleanup;
  }, [execute, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Manual refetch function
  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  // Clear cache function
  const clearCache = useCallback(() => {
    requestCache.clear();
    pendingRequests.clear();
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
  };
};

export default useOptimizedFetch;

// frontend/src/index.js - VERSIÓN OPTIMIZADA
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { initPerformanceOptimizations } from './utils/performanceOptimizations';

// ✅ NUEVAS IMPORTACIONES PARA REACT QUERY
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// ✅ CONFIGURACIÓN DEL QUERY CLIENT OPTIMIZADA
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ CONFIGURACIÓN DE CACHÉ AGRESIVA
      staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados "frescos"
      cacheTime: 10 * 60 * 1000, // 10 minutos - tiempo en caché
      retry: 1, // Solo 1 reintento en caso de error
      refetchOnWindowFocus: false, // No refrescar al cambiar de ventana
      refetchOnMount: false, // No refrescar al montar componente
      refetchOnReconnect: false, // No refrescar al reconectar internet
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <Provider store={store}>
      {/* ✅ ENVOLVER CON QUERY CLIENT PROVIDER */}
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router}/>
        
      </QueryClientProvider>
    </Provider>
  // </React.StrictMode>
);

// Initialize performance optimizations
initPerformanceOptimizations();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
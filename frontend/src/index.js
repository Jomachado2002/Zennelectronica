// frontend/src/index.js - VERSIÓN OPTIMIZADA
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// import App from './App'; // Removed unused import
import reportWebVitals from './reportWebVitals';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { initPerformanceOptimizations } from './utils/performanceOptimizations';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

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

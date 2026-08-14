import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { installAuthFetchPatch } from './helpers/patchFetchAuth';

installAuthFetchPatch();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </Provider>
);

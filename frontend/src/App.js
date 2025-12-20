// import logo from './logo.svg'; // Removed unused import
import './App.css';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useState, useCallback } from 'react';
import SummaryApi from './common';
import Context from './context';
import { useDispatch } from 'react-redux';
import { setUserDetails } from './store/userSlice';
import { localCartHelper } from './helpers/addToCart'; // Importa el helper
import MetaPixelTracker from './components/MetaPixelTracker'; // Importa el tracker
import GoogleAnalytics from './components/GoogleAnalytics'; // Importa Google Analytics
import { Analytics } from '@vercel/analytics/react'; // Importa Vercel Analytics


function App() {
  const dispatch = useDispatch()
  const [cartProductCount, setCartProductCount] = useState(0)
  
  const fetchUserDetails = useCallback(async() => {
    try {
      // ✅ USAR authFetch QUE MANEJA AUTOMÁTICAMENTE EL TOKEN (O SU AUSENCIA)
      const { authFetch } = await import('./helpers/authFetch');
      
      const dataResponse = await authFetch(SummaryApi.current_user.url, {
        method: SummaryApi.current_user.method,
        credentials: 'include'
      });
      
      const dataApi = await dataResponse.json();
      
      console.log("🔍 App.js - Respuesta del backend:", {
        success: dataApi.success,
        data: dataApi.data,
        userRole: dataApi.data?.role,
        userEmail: dataApi.data?.email,
        isAuthenticated: !!dataApi.data
      });
      
      if (dataApi.success && dataApi.data) {
        dispatch(setUserDetails(dataApi.data));
      } else {
        // ✅ SI NO HAY USUARIO, LIMPIAR REDUX (USUARIO INVITADO)
        dispatch(setUserDetails(null));
      }
    } catch (error) {
      // ✅ EN CASO DE ERROR, NO ROMPER LA APP (PERMITIR USO COMO INVITADO)
      console.warn("⚠️ Error al obtener detalles del usuario:", error);
      dispatch(setUserDetails(null));
    }
  }, [dispatch])
  
  // Función modificada para usar localStorage en lugar del backend
  const fetchUserAddToCart = useCallback(() => {
    // Obtener el contador desde localStorage
    const count = localCartHelper.getItemCount();
    setCartProductCount(count);
    
    // Hacer disponible esta función globalmente
    window.fetchUserAddToCart = fetchUserAddToCart;
  }, [])
  
  useEffect(() => {
    /**user Details */
    fetchUserDetails()
    /**user Details cart product */
    fetchUserAddToCart()
  }, [fetchUserDetails, fetchUserAddToCart])

  return (
    <>
      <Context.Provider value={{
        fetchUserDetails, // user detail fetch
        cartProductCount, // current user add to cart product count,
        fetchUserAddToCart
      }}>
        {/* Analytics Trackers */}
        <MetaPixelTracker />
        <GoogleAnalytics />
        <Analytics />
        
        <ToastContainer 
          position='top-center'
        />
        
        <Header/>
        <main className='min-h-[calc(100vh-120px)] pt-30'>
          <Outlet/>
        </main>
        <Footer/>
      </Context.Provider>
    </>
  );
}

export default App;
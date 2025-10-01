import logo from './logo.svg';
import './App.css';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useState } from 'react';
import SummaryApi from './common';
import Context from './context';
import { useDispatch } from 'react-redux';
import { setUserDetails } from './store/userSlice';
import { localCartHelper } from './helpers/addToCart'; // Importa el helper
import MetaPixelTracker from './components/MetaPixelTracker'; // Importa el tracker


function App() {
  const dispatch = useDispatch()
  const [cartProductCount, setCartProductCount] = useState(0)
  
  const fetchUserDetails = async() => {
    const dataResponse = await fetch(SummaryApi.current_user.url, {
      method: SummaryApi.current_user.method,
      credentials: 'include'
    })
    
    const dataApi = await dataResponse.json()
    
    if (dataApi.success) {
      dispatch(setUserDetails(dataApi.data))
    }
  }
  
  // Función modificada para usar localStorage en lugar del backend
  const fetchUserAddToCart = () => {
    // Obtener el contador desde localStorage
    const count = localCartHelper.getItemCount();
    setCartProductCount(count);
    
    // Hacer disponible esta función globalmente
    window.fetchUserAddToCart = fetchUserAddToCart;
  }
  
  useEffect(() => {
    /**user Details */
    fetchUserDetails()
    /**user Details cart product */
    fetchUserAddToCart()
  }, [])

  return (
    <>
      <Context.Provider value={{
        fetchUserDetails, // user detail fetch
        cartProductCount, // current user add to cart product count,
        fetchUserAddToCart
      }}>
        {/* Meta Pixel Tracker */}
        <MetaPixelTracker />
        
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
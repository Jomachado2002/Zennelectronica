import './App.css';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import SummaryApi from './common';
import Context from './context';
import { useDispatch } from 'react-redux';
import { setUserDetails } from './store/userSlice';
import { localCartHelper } from './helpers/addToCart';
import { runWhenIdle } from './helpers/runWhenIdle';
import Header from './components/Header';

const Footer = lazy(() => import('./components/Footer'));
const MetaPixelTracker = lazy(() => import('./components/MetaPixelTracker'));
const GoogleAnalytics = lazy(() => import('./components/GoogleAnalytics'));
const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
);
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights }))
);

function DeferredTrackers() {
  const [ready, setReady] = useState(false);

  useEffect(() => runWhenIdle(() => setReady(true), 2800), []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <MetaPixelTracker />
      <GoogleAnalytics />
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAdminRoute = location.pathname.includes('/panel-admin');
  const [cartProductCount, setCartProductCount] = useState(() => {
    try {
      return localCartHelper.getItemCount();
    } catch {
      return 0;
    }
  });

  const fetchUserDetails = useCallback(async () => {
    try {
      const { authFetch } = await import('./helpers/authFetch');

      const dataResponse = await authFetch(SummaryApi.current_user.url, {
        method: SummaryApi.current_user.method,
        credentials: 'include'
      });

      const dataApi = await dataResponse.json();

      if (dataApi.success && dataApi.data) {
        dispatch(setUserDetails(dataApi.data));
      } else {
        dispatch(setUserDetails(null));
      }
    } catch (error) {
      dispatch(setUserDetails(null));
    }
  }, [dispatch]);

  const fetchUserAddToCart = useCallback(() => {
    const count = localCartHelper.getItemCount();
    setCartProductCount(count);
    window.fetchUserAddToCart = fetchUserAddToCart;
  }, []);

  useEffect(() => {
    fetchUserAddToCart();
    return runWhenIdle(() => {
      fetchUserDetails();
    }, 3000);
  }, [fetchUserDetails, fetchUserAddToCart]);

  return (
    <>
      <Context.Provider
        value={{
          fetchUserDetails,
          cartProductCount,
          fetchUserAddToCart
        }}
      >
        <DeferredTrackers />

        <ToastContainer position="top-center" limit={2} newestOnTop />

        {!isAdminRoute && <Header />}
        <main
          className={
            isAdminRoute
              ? 'h-screen overflow-hidden'
              : 'min-h-[calc(100vh-4rem)] pt-14 lg:pt-16'
          }
        >
          <Outlet />
        </main>
        {!isAdminRoute && (
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        )}
      </Context.Provider>
    </>
  );
}

export default App;

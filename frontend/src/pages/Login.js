import React, { useContext, useState } from 'react';
import { useDispatch } from 'react-redux'; // Agregar esta importación
import { setUserDetails } from '../store/userSlice'; // Agregar esta importación
import loginIcons from '../assest/signin.gif';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import Context from '../context';

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState({
        email: "",
        password: ""
    });
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { fetchUserDetails, fetchUserAddToCart } = useContext(Context);

    const handleOnChange = (e) => {
        const { name, value } = e.target;
        
        // Limpiar errores cuando el usuario empiece a escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        
        setData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función de validación
    const validateForm = () => {
        const newErrors = {};
        
        if (!data.email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(data.email)) {
            newErrors.email = 'El email no es válido';
        }
        
        if (!data.password) {
            newErrors.password = 'La contraseña es requerida';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async(e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Por favor, corrige los errores en el formulario');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(SummaryApi.signIn.url, {
                method: SummaryApi.signIn.method,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const dataApi = await response.json();

            if (dataApi.success) {
                // ✅ MANEJAR TOKEN COMO FALLBACK SI LAS COOKIES FALLAN
                if (dataApi.token) {
                    console.log('🔑 Token recibido como fallback, guardando en localStorage');
                    localStorage.setItem('authToken', dataApi.token);
                    
                    // ✅ CONFIGURAR HEADER PARA FUTURAS PETICIONES
                    window.authToken = dataApi.token;
                }

                dispatch(setUserDetails(dataApi.user));
                toast.success(dataApi.message);

                if (dataApi.user.role === "ADMIN") {
                    navigate('/panel-admin/todos-productos');
                } else {
                    navigate('/');
                }

                await fetchUserDetails();
                await fetchUserAddToCart();
            } else {
                toast.error(dataApi.message);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error("Error al iniciar sesión");
        } finally {
            setIsLoading(false);
        }
    };

    // ... resto del JSX sin cambios

  return (
    <section id='login' className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Card principal */}
        <div className='bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden'>
          {/* Header con gradiente */}
          <div className='bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center text-white relative overflow-hidden'>
            <div className='absolute inset-0 bg-black/10'></div>
            <div className='relative z-10'>
              <div className='w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center'>
                <img src={loginIcons} alt='login icons' className='w-12 h-12 object-contain' />
              </div>
              <h1 className='text-2xl font-bold mb-2'>¡Bienvenido de vuelta!</h1>
              <p className='text-blue-100 text-sm'>Inicia sesión en tu cuenta</p>
            </div>
            
            {/* Elementos decorativos */}
            <div className='absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl'></div>
            <div className='absolute bottom-4 left-4 w-16 h-16 bg-purple-300/20 rounded-full blur-lg'></div>
          </div>

          {/* Formulario */}
          <div className='p-8'>
            <form className='space-y-6' onSubmit={handleSubmit}>
              {/* Correo Electrónico */}
              <div className='space-y-2'>
                <label className='block text-sm font-semibold text-gray-700'>
                  Correo electrónico <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <input
                    type='email'
                    placeholder='tu@email.com'
                    name='email'
                    value={data.email}
                    onChange={handleOnChange}
                    required
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 ${
                        errors.email 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
                    <svg className={`h-5 w-5 ${errors.email ? 'text-red-400' : 'text-gray-400'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207' />
                    </svg>
                  </div>
                </div>
                {errors.email && (
                  <p className='text-red-500 text-sm flex items-center'>
                    <svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div className='space-y-2'>
                <label className='block text-sm font-semibold text-gray-700'>
                  Contraseña <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Tu contraseña'
                    name='password'
                    value={data.password}
                    onChange={handleOnChange}
                    required
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 ${
                        errors.password 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors'
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash className='h-5 w-5' /> : <FaEye className='h-5 w-5' />}
                  </button>
                </div>
                {errors.password && (
                  <p className='text-red-500 text-sm flex items-center'>
                    <svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Olvidó su contraseña */}
              <div className='flex justify-end'>
                <Link
                  to='/recuperar-contrasena'
                  className='text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors'
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Botón de inicio de sesión */}
              <button 
                type='submit'
                disabled={isLoading}
                className={`w-full py-3 px-6 rounded-xl font-semibold focus:outline-none focus:ring-4 transition-all duration-200 shadow-lg ${
                    isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-blue-200 transform hover:scale-[1.02]'
                }`}
              >
                {isLoading ? (
                  <div className='flex items-center justify-center'>
                    <svg className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Iniciando sesión...
                  </div>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className='my-6 flex items-center'>
              <div className='flex-1 border-t border-gray-200'></div>
              <span className='px-4 text-sm text-gray-500 bg-white'>o</span>
              <div className='flex-1 border-t border-gray-200'></div>
            </div>

            {/* Crear una cuenta */}
            <div className='text-center'>
              <p className='text-gray-600 text-sm'>
                ¿No tienes una cuenta?{' '}
                <Link
                  to='/registro'
                  className='text-blue-600 hover:text-blue-800 font-semibold transition-colors'
                >
                  Crear cuenta
                </Link>
              </p>
            </div>

            {/* Política de privacidad */}
            <div className='mt-6 text-center'>
              <p className='text-xs text-gray-500'>
                Al continuar, aceptas nuestra{' '}
                <Link
                  to='/privacy-policy'
                  className='text-blue-600 hover:text-blue-800 underline'
                >
                  Política de privacidad
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;

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
    const [data, setData] = useState({
        email: "",
        password: ""
    });
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { fetchUserDetails, fetchUserAddToCart } = useContext(Context);

    const handleOnChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async(e) => {
        e.preventDefault();

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
        }
    };

    // ... resto del JSX sin cambios

  return (
    <section id='login'>
      <div className='mx-auto container p-4'>
        <div className='bg-white p-5 w-full max-w-sm mx-auto shadow-md rounded-lg'>
          {/* Imagen del ícono */}
          <div className='w-20 h-20 mx-auto'>
            <img src={loginIcons} alt='login icons' />
          </div>

          {/* Formulario */}
          <form className='pt-6' onSubmit={handleSubmit}>
            {/* Correo Electrónico */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700'>
                Correo electrónico <span className='text-red-600'>*</span>
              </label>
              <div className='mt-1'>
                <input
                  type='email'
                  placeholder='Ingresa tu correo'
                  name='email'
                  value={data.email}
                  onChange={handleOnChange}
                  className='w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600'
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700'>
                Contraseña <span className='text-red-600'>*</span>
              </label>
              <div className='mt-1 flex items-center border border-gray-300 rounded-md'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Ingresa tu contraseña'
                  name='password'
                  value={data.password}
                  onChange={handleOnChange}
                  className='w-full p-2 focus:outline-none focus:ring-2 focus:ring-green-600 rounded-md'
                />
                <div
                  className='p-2 cursor-pointer text-gray-500'
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>

            {/* Olvidó su contraseña */}
            <div className='flex justify-end mb-4'>
              <Link
                to='/recuperar-contrasena'
                className='text-sm text-blue-600 hover:text-red-600'
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>

            {/* Botón de inicio de sesión */}
            <button className='w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition'>
              Iniciar sesión
            </button>
          </form>

          {/* Crear una cuenta */}
          <p className='text-center mt-4'>
            ¿No tienes un registro?
            <Link
              to='/registro'
              className='text-blue-600 hover:text-blue-700 ml-1'
            >
              Crear una cuenta
            </Link>
          </p>

          {/* Política de privacidad */}
          <p className='text-center text-xs text-gray-500 mt-4'>
            Al continuar accediendo, usted acepta nuestra{' '}
            <Link
              to='/privacy-policy'
              className='text-blue-600 hover:text-blue-700'
            >
              Política de privacidad
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Login;

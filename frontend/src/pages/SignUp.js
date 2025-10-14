import React, { useState } from 'react';
import loginIcons from '../assest/signin.gif';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import imageTobase64 from '../helpers/imageTobase64';
import SummaryApi from '../common';
import { toast } from 'react-toastify';

const SignUp = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState({
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
      profilePic: ""
    });
    const navigate = useNavigate()

    const handleOnChange = (e) => {
        const { name, value } = e.target;
        
        // Limpiar errores cuando el usuario empiece a escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        
        setData((preve) => {
            return {
                ...preve,
                [name]: value
            };
        });
    };

    // Función de validación
    const validateForm = () => {
        const newErrors = {};
        
        if (!data.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        } else if (data.name.trim().length < 2) {
            newErrors.name = 'El nombre debe tener al menos 2 caracteres';
        }
        
        if (!data.email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(data.email)) {
            newErrors.email = 'El email no es válido';
        }
        
        if (!data.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (data.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        if (!data.confirmPassword) {
            newErrors.confirmPassword = 'Confirma tu contraseña';
        } else if (data.password !== data.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUploadPic = async(e) =>{
        const file = e.target.files[0]
        
        const imagePic = await imageTobase64(file)
        
        setData((preve)=>{
            return{
              ...preve,
              profilePic : imagePic
            }
          })
    
      }

    const handleSubmit = async(e) =>{
        e.preventDefault()
        
        if (!validateForm()) {
            toast.error('Por favor, corrige los errores en el formulario');
            return;
        }

        setIsLoading(true);
        
        try {
            const dataResponse = await fetch(SummaryApi.SignUP.url,{
                method: SummaryApi.SignUP.method,
                headers : {
                    "content-type" : "application/json"
                },
                body: JSON.stringify(data)
            })
    
            const dataApi = await dataResponse.json()
            
            if(dataApi.success){
                toast.success(dataApi.message)
                navigate("/iniciar-sesion")
            } else {
                toast.error(dataApi.message)
            }
        } catch (error) {
            toast.error('Error al crear la cuenta. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

   

    return (
        <section id='sign-up' className='min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4'>
            <div className='w-full max-w-md'>
                {/* Card principal */}
                <div className='bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden'>
                    {/* Header con gradiente */}
                    <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center text-white relative overflow-hidden'>
                        <div className='absolute inset-0 bg-black/10'></div>
                        <div className='relative z-10'>
                            <h1 className='text-2xl font-bold mb-2'>¡Únete a nosotros!</h1>
                            <p className='text-purple-100 text-sm'>Crea tu cuenta y comienza</p>
                        </div>
                        
                        {/* Elementos decorativos */}
                        <div className='absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl'></div>
                        <div className='absolute bottom-4 left-4 w-16 h-16 bg-blue-300/20 rounded-full blur-lg'></div>
                    </div>

                    {/* Formulario */}
                    <div className='p-8'>
                        {/* Foto de perfil */}
                        <div className='flex justify-center mb-6'>
                            <div className='relative group'>
                                <div className='w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg'>
                                    <img 
                                        src={data.profilePic || loginIcons} 
                                        alt='Profile' 
                                        className='w-full h-full object-cover'
                                    />
                                </div>
                                <label className='absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'>
                                    <div className='text-center text-white'>
                                        <svg className='w-6 h-6 mx-auto mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' />
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 13a3 3 0 11-6 0 3 3 0 016 0z' />
                                        </svg>
                                        <span className='text-xs font-medium'>Cambiar foto</span>
                                    </div>
                                    <input type='file' className='hidden' onChange={handleUploadPic} accept='image/*' />
                                </label>
                            </div>
                        </div>

                        <form className='space-y-6' onSubmit={handleSubmit}>
                            {/* Nombre completo */}
                            <div className='space-y-2'>
                                <label className='block text-sm font-semibold text-gray-700'>
                                    Nombre completo <span className='text-red-500'>*</span>
                                </label>
                                <div className='relative'>
                                    <input
                                        type='text'
                                        placeholder='Tu nombre completo'
                                        name='name'
                                        value={data.name}
                                        onChange={handleOnChange}
                                        required
                                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 ${
                                            errors.name 
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                                                : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
                                        }`}
                                    />
                                    <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
                                        <svg className={`h-5 w-5 ${errors.name ? 'text-red-400' : 'text-gray-400'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                                        </svg>
                                    </div>
                                </div>
                                {errors.name && (
                                    <p className='text-red-500 text-sm flex items-center'>
                                        <svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                            <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                                        </svg>
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Correo electrónico */}
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
                                                : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
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
                                        placeholder='Mínimo 6 caracteres'
                                        name='password'
                                        value={data.password}
                                        onChange={handleOnChange}
                                        required
                                        minLength={6}
                                        className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 ${
                                            errors.password 
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                                                : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
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

                            {/* Confirmar contraseña */}
                            <div className='space-y-2'>
                                <label className='block text-sm font-semibold text-gray-700'>
                                    Confirmar contraseña <span className='text-red-500'>*</span>
                                </label>
                                <div className='relative'>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder='Repite tu contraseña'
                                        name='confirmPassword'
                                        value={data.confirmPassword}
                                        onChange={handleOnChange}
                                        required
                                        minLength={6}
                                        className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 ${
                                            errors.confirmPassword 
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                                                : 'border-gray-200 focus:border-purple-500 focus:ring-purple-100'
                                        }`}
                                    />
                                    <button
                                        type='button'
                                        className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors'
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    >
                                        {showConfirmPassword ? <FaEyeSlash className='h-5 w-5' /> : <FaEye className='h-5 w-5' />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className='text-red-500 text-sm flex items-center'>
                                        <svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                            <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                                        </svg>
                                        {errors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            {/* Botón de crear cuenta */}
                            <button 
                                type='submit'
                                disabled={isLoading}
                                className={`w-full py-3 px-6 rounded-xl font-semibold focus:outline-none focus:ring-4 transition-all duration-200 shadow-lg ${
                                    isLoading 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:ring-purple-200 transform hover:scale-[1.02]'
                                }`}
                            >
                                {isLoading ? (
                                    <div className='flex items-center justify-center'>
                                        <svg className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                                        </svg>
                                        Creando cuenta...
                                    </div>
                                ) : (
                                    'Crear cuenta'
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className='my-6 flex items-center'>
                            <div className='flex-1 border-t border-gray-200'></div>
                            <span className='px-4 text-sm text-gray-500 bg-white'>o</span>
                            <div className='flex-1 border-t border-gray-200'></div>
                        </div>

                        {/* Ya tienes cuenta */}
                        <div className='text-center'>
                            <p className='text-gray-600 text-sm'>
                                ¿Ya tienes una cuenta?{' '}
                                <Link
                                    to='/iniciar-sesion'
                                    className='text-purple-600 hover:text-purple-800 font-semibold transition-colors'
                                >
                                    Inicia sesión
                                </Link>
                            </p>
                        </div>

                        {/* Política de privacidad */}
                        <div className='mt-6 text-center'>
                            <p className='text-xs text-gray-500'>
                                Al crear una cuenta, aceptas nuestra{' '}
                                <Link
                                    to='/privacy-policy'
                                    className='text-purple-600 hover:text-purple-800 underline'
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
}

export default SignUp;

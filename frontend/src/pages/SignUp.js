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
        setData((preve) => {
            return {
                ...preve,
                [name]: value
            };
        });
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

        if(data.password === data.confirmPassword){
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
            }
            if(dataApi.error){
                toast.error(dataApi.message)
            }

           
            console.log("data",dataApi)
        } else{
            console.log("La contraseña no coincide. Por favor, inténtalo de nuevo.")
        }

      
    };

   

    return (
        <section id='sign-up'>
            <div className='mx-auto container p-4'>
                <div className='bg-white p-5 w-full max-w-sm mx-auto shadow-md rounded-lg'>
                    {/* Imagen del ícono */}
                    <div className='w-20 h-20 mx-auto relative overflow-hidden rounded-full'>
                         <div>
                            <img src={data.profilePic || loginIcons} alt='login icons'/>
                        </div>
                        <form>
                            <label>
                                <div className='text-xs bg-opacity-80 bg-slate-200 pb-4 pt-2 cursor-pointer text-center absolute bottom-0 w-full'>
                                    Upload Photo
                                </div>
                                <input type='file' className='hidden' onChange={handleUploadPic} />
                            </label>
                        </form>
                    </div>

                    {/* Formulario */}
                    <form className='pt-6' onSubmit={handleSubmit}>
                        {/* Nombre completo */}
                        <div className='mb-4'>
                            <label className='block text-sm font-medium text-gray-700'>
                                Nombre completo <span className='text-red-600'>*</span>
                            </label>
                            <div className='mt-1'>
                                <input
                                    type='text'
                                    placeholder='Ingresa tu nombre'
                                    name='name'
                                    value={data.name}
                                    onChange={handleOnChange}
                                    required
                                    className='w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600'
                                />
                            </div>
                        </div>

                        {/* Correo electrónico */}
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
                                    required
                                    className='w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600'
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div className='mb-4'>
                            <label className='block text-sm font-medium text-gray-700'>
                                Ingrese una Contraseña <span className='text-red-600'>*</span>
                            </label>
                            <div className='mt-1 flex items-center border border-gray-300 rounded-md'>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder='Ingresa una contraseña'
                                    name='password'
                                    value={data.password}
                                    onChange={handleOnChange}
                                    required
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

                        {/* Confirmar contraseña */}
                        <div className='mb-4'>
                            <label className='block text-sm font-medium text-gray-700'>
                                Confirme su contraseña <span className='text-red-600'>*</span>
                            </label>
                            <div className='mt-1 flex items-center border border-gray-300 rounded-md'>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder='Confirme su contraseña'
                                    name='confirmPassword'
                                    value={data.confirmPassword}
                                    onChange={handleOnChange}
                                    required
                                    className='w-full p-2 focus:outline-none focus:ring-2 focus:ring-green-600 rounded-md'
                                />
                                <div
                                    className='p-2 cursor-pointer text-gray-500'
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </div>
                            </div>
                        </div>

                        {/* Botón de crear cuenta */}
                        <button className='w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition'>
                            Crear una cuenta
                        </button>

                        <p className='text-center mt-4'>
                            ¿Ya tienes una cuenta?
                            <Link
                                to='/iniciar-sesion'
                                className='text-blue-600 hover:text-blue-700 ml-1'
                            >
                                Inicia sesión
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
}

export default SignUp;

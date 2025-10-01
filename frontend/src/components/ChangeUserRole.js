import React, { useState } from 'react';
import ROLE from '../common/role';
import { IoIosClose } from "react-icons/io";
import SummaryApi from '../common';
import { toast } from 'react-toastify';

const ChangeUserRole = ({
    name,
    email,
    role,
    userId,
    onClose,
    callFunc,
}) => {
    const [userRole, setUserRole] = useState(role);

    const handleOnChangeSelect = (e) => {
        setUserRole(e.target.value);
        console.log(e.target.value);
    };

    const updateUserRole = async () => {
        const fetchResponse = await fetch(SummaryApi.updateUser.url, {
            method: SummaryApi.updateUser.method,
            credentials: 'include',
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                userId: userId,
                role: userRole
            })
        });
        const responseData = await fetchResponse.json();

        if (responseData.success) {
            toast.success(responseData.message);
            onClose();
            callFunc();
        }
        console.log("Role Update", responseData);
    };

    return (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10'>
            <div className='relative bg-white rounded-xl p-8 w-full max-w-md shadow-lg transform transition-all duration-300 ease-in-out'>
                
                <button className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors' onClick={onClose}>
                    <IoIosClose size={30} />
                </button>

                <h1 className='text-2xl font-bold text-gray-800 text-center mb-6'>Cambiar Rol del Usuario</h1>
                
                <div className='space-y-2 text-center mb-6'>
                    <p className='text-gray-600'><strong>Nombre:</strong> {name}</p>
                    <p className='text-gray-600'><strong>Correo:</strong> {email}</p>
                </div>

                <div className='mb-8'>
                    <label className='block text-gray-600 text-sm font-medium mb-2 text-center'>Rol:</label>
                    <select
                        className='w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition ease-in duration-200'
                        value={userRole}
                        onChange={handleOnChangeSelect}
                    >
                        {Object.values(ROLE).map(el => (
                            <option value={el} key={el}>{el}</option>
                        ))}
                    </select>
                </div>

                <button
                    className='w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg'
                    onClick={updateUserRole}
                >
                    Cambiar Rol
                </button>
            </div>
        </div>
    );
};

export default ChangeUserRole;

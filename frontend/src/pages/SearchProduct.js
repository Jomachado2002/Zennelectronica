import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SummaryApi from '../common'
import VerticalCard from '../components/VerticalCard'

const SearchProduct = () => {
    const query = useLocation()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [sortBy, setSortBy] = useState('') // Estado para ordenamiento

    const fetchProduct = async () => {
        setLoading(true)
        try {
            const response = await fetch(SummaryApi.searchProduct.url + query.search)
            const dataResponse = await response.json()
            
            // Verificación segura de datos
            const productsData = dataResponse?.data || []
            
            // Aplicar ordenamiento si está seleccionado
            let processedData = productsData
            if (sortBy === 'asc') {
                processedData = processedData.sort((a, b) => 
                    Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0)
                )
            } else if (sortBy === 'desc') {
                processedData = processedData.sort((a, b) => 
                    Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0)
                )
            }

            setData(processedData)
        } catch (error) {
            console.error('Error fetching products:', error)
            setData([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProduct()
    }, [query.search, sortBy])

    const handleSortChange = (value) => {
        setSortBy(value)
    }

    // Determinar si hay búsqueda móvil activa
    const showMobileSearch = document.querySelector('.lg\\:hidden.fixed.top-16') !== null;

    return (
        <div className={`container mx-auto p-4 content-wrapper ${showMobileSearch ? 'mt-16' : ''}`}>
            {/* Filtro de ordenamiento */}
            <div className='mb-4 flex justify-end items-center'>
                <label htmlFor='sort-select' className='mr-2'>Ordenar por:</label>
                <select 
                    id='sort-select'
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className='border rounded p-2'
                >
                    <option value=''>Defecto</option>
                    <option value='asc'>Precio - Bajo a Alto</option>
                    <option value='desc'>Precio - Alto a Bajo</option>
                </select>
            </div>

            {loading && (
                <p className='text-lg text-center'>Cargando ...</p>
            )}

            <p className='text-lg font-semibold my-3'>
                Resultados de la búsqueda: {data.length}
            </p>

            {data.length === 0 && !loading && (
                <p className='bg-white text-lg text-center p-4'>No se encontró información...</p>
            )}

            {data.length !== 0 && !loading && (
                <VerticalCard loading={loading} data={data} />
            )}
        </div>
    )
}

export default SearchProduct
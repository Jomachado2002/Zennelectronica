import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import SummaryApi from '../common'
import VerticalCardGrid from '../components/VerticalCardGrid'

const SearchProduct = () => {
    const { search } = useLocation()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState('')

    const queryText = useMemo(() => {
        try {
            return new URLSearchParams(search).get('q') || ''
        } catch {
            return ''
        }
    }, [search])

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()

        const fetchProduct = async () => {
            const q = String(queryText || '').trim()
            if (q.length < 2) {
                setData([])
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const response = await fetch(
                    `${SummaryApi.searchProduct.url}?q=${encodeURIComponent(q)}&limit=48`,
                    { signal: controller.signal }
                )
                const dataResponse = await response.json()
                if (cancelled) return

                const productsData = dataResponse?.data || []
                let processedData = productsData.filter((product) =>
                    product?.stock === undefined || product?.stock === null || product?.stock > 0
                )

                if (sortBy === 'asc') {
                    processedData = [...processedData].sort(
                        (a, b) => Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0)
                    )
                } else if (sortBy === 'desc') {
                    processedData = [...processedData].sort(
                        (a, b) => Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0)
                    )
                }

                setData(processedData)
            } catch (error) {
                if (!cancelled && error.name !== 'AbortError') {
                    setData([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchProduct()
        return () => {
            cancelled = true
            controller.abort()
        }
    }, [queryText, sortBy])

    const handleSortChange = (value) => {
        setSortBy(value)
    }

    return (
        <div className="container mx-auto p-4 min-h-[60vh]">
            <Helmet>
              <title>{queryText ? `${queryText} | Búsqueda Zenn` : 'Búsqueda | Zenn'}</title>
              <meta name="robots" content="noindex, follow" />
              <meta name="googlebot" content="noindex, follow" />
            </Helmet>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 min-h-[50vh]" aria-hidden>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-[280px] rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            )}

            <p className='text-lg font-semibold my-3'>
                Resultados de la búsqueda: {loading ? '…' : data.length}
            </p>

            {data.length === 0 && !loading && (
                <p className='bg-white text-lg text-center p-4'>
                    {queryText.trim().length < 2
                        ? 'Escribí al menos 2 letras para buscar.'
                        : 'No se encontró información...'}
                </p>
            )}

            {data.length !== 0 && !loading && (
                <VerticalCardGrid 
                    data={data} 
                    loading={loading} 
                />
            )}
        </div>
    )
}

export default SearchProduct

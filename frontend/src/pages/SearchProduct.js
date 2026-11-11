import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import SummaryApi from '../common'
import VerticalCardGrid from '../components/VerticalCardGrid'
import { rememberQuery } from '../helpers/searchMemory'
import { siteUrl } from '../config/siteUrl'

const SearchProduct = () => {
    const query = useLocation()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [sortBy, setSortBy] = useState('')
    const [brandHub, setBrandHub] = useState(null)

    const searchQ = useMemo(() => {
        const params = new URLSearchParams(query.search || '')
        return String(params.get('q') || '').trim()
    }, [query.search])

    const fetchProduct = async () => {
        setLoading(true)
        try {
            const response = await fetch(SummaryApi.searchProduct.url + query.search)
            const dataResponse = await response.json()
            const productsData = dataResponse?.data || []
            const productsWithStock = productsData.filter(product =>
                product?.stock === undefined || product?.stock === null || product?.stock > 0
            )

            let processedData = productsWithStock
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
        if (searchQ) rememberQuery(searchQ)
        fetchProduct()
    }, [query.search, sortBy])

    useEffect(() => {
        let cancelled = false
        if (!searchQ) {
            setBrandHub(null)
            return undefined
        }
        const params = new URLSearchParams({ q: searchQ })
        fetch(`${SummaryApi.baseURL}/api/seo/marca?${params}`)
            .then((res) => res.json())
            .then((body) => {
                if (!cancelled) setBrandHub(body?.data || null)
            })
            .catch(() => {
                if (!cancelled) setBrandHub(null)
            })
        return () => {
            cancelled = true
        }
    }, [searchQ])

    const isBrandLanding = Boolean(brandHub?.indexable && brandHub?.seoTitle)
    const pageTitle = isBrandLanding ? brandHub.seoTitle : (searchQ ? `${searchQ} | Búsqueda Zenn` : 'Búsqueda | Zenn')
    const pageDescription = isBrandLanding
        ? brandHub.seoDescription
        : 'Resultados de búsqueda en Zenn Paraguay.'
    const canonical = isBrandLanding
        ? (brandHub.canonicalUrl || siteUrl(`/buscar?q=${encodeURIComponent(brandHub.brandName || searchQ)}`))
        : null
    const heading = isBrandLanding ? (brandHub.h1 || brandHub.brandName) : null

    const showMobileSearch = document.querySelector('.lg\\:hidden.fixed.top-16') !== null;

    return (
        <div className={`container mx-auto p-4 content-wrapper ${showMobileSearch ? 'mt-16' : ''}`}>
            <Helmet>
              <title>{pageTitle}</title>
              <meta name="description" content={pageDescription} />
              {isBrandLanding ? (
                <link rel="canonical" href={canonical} />
              ) : (
                <>
                  <meta name="robots" content="noindex, follow" />
                  <meta name="googlebot" content="noindex, follow" />
                </>
              )}
            </Helmet>

            {heading ? (
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{heading}</h1>
            ) : null}
            {isBrandLanding && brandHub.seoDescription ? (
              <p className="text-sm text-gray-600 mb-4 max-w-3xl">{brandHub.seoDescription}</p>
            ) : null}

            <div className='mb-4 flex justify-end items-center'>
                <label htmlFor='sort-select' className='mr-2'>Ordenar por:</label>
                <select
                    id='sort-select'
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
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
                <VerticalCardGrid
                    data={data}
                    loading={loading}
                />
            )}
        </div>
    )
}

export default SearchProduct

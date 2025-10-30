import React, { useEffect, useMemo, useState } from 'react'
import SummaryApi from '../common'

function ProductSearchModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    async function search() {
      if (!query) { setResults([]); return }
      setLoading(true)
      try {
        const headers = {}
        const token = localStorage.getItem('authToken')
        if (token) headers['Authorization'] = `Bearer ${token}`
        // Intentar pedir solo en stock desde el backend si está soportado
        const baseUrl = `${SummaryApi.baseURL}/api/finanzas/ventas/productos/buscar?query=${encodeURIComponent(query)}`
        let res = await fetch(`${baseUrl}&inStock=true`, { credentials: 'include', headers })
        let items = []
        if (res.ok) {
          const j1 = await res.json(); items = (j1.data || j1.products || [])
        }
        if (!items.length) {
          res = await fetch(baseUrl, { credentials: 'include', headers })
          if (res.ok) {
            const j2 = await res.json(); items = (j2.data || j2.products || [])
          }
        }
        const filtered = items.filter(p => {
          const stock = (
            p.availableStock ?? p.stockAvailable ?? p.currentStock ?? p.onHand ?? p.stock ?? p.quantityAvailable ?? p.quantity ?? 0
          )
          return Number(stock) > 0
        })
        if (active) setResults(filtered)
      } catch {
        if (active) setResults([])
      } finally { if (active) setLoading(false) }
    }
    const t = setTimeout(search, 300)
    return () => { active = false; clearTimeout(t) }
  }, [isOpen, query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="font-semibold">Buscar producto</div>
          <button className="text-xl" onClick={onClose}>×</button>
        </div>
        <div className="p-4">
          <input className="w-full border rounded p-2 mb-3" placeholder="Nombre, código, categoría..." value={query} onChange={e=> setQuery(e.target.value)} />
          {loading ? (
            <div className="p-4 text-gray-600">Buscando...</div>
          ) : (
            <div className="max-h-[55vh] overflow-auto divide-y">
              {results.map(p => (
                <button key={p._id} className="w-full text-left p-3 hover:bg-gray-50" onClick={()=> { onSelect && onSelect(p); onClose && onClose() }}>
                  <div className="font-medium">{p.productName || p.name}</div>
                  <div className="text-xs text-gray-500">
                    Código: {p.productCode || p.sku || p.code || 'N/D'} • {p.category || p.mainCategory || ''}{p.subCategory ? ` / ${p.subCategory}` : ''}
                  </div>
                </button>
              ))}
              {!results.length && query && (
                <div className="p-3 text-sm text-gray-500">Sin resultados para “{query}”.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductSearchModal



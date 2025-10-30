import React, { useEffect, useState } from 'react'
import SummaryApi from '../common'

function PurchaseTypesManagement() {
  const [types, setTypes] = useState([])
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [loading, setLoading] = useState(false)

  async function fetchTypes() {
    setLoading(true)
    try {
      const res = await fetch(`${SummaryApi.baseURL}/api/finanzas/tipos-compra`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setTypes(json.data)
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchTypes() }, [])

  async function handleCreate(e){
    e.preventDefault()
    if (!form.name || !form.code) return
    await fetch(`${SummaryApi.baseURL}/api/finanzas/tipos-compra`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    setForm({ name:'', code:'', description:'' })
    fetchTypes()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tipos de Compras</h1>
      <form onSubmit={handleCreate} className="bg-white border rounded p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-3">
          <input className="border rounded p-2" placeholder="Nombre" value={form.name} onChange={e=> setForm(prev=>({...prev,name:e.target.value}))} />
          <input className="border rounded p-2" placeholder="Código" value={form.code} onChange={e=> setForm(prev=>({...prev,code:e.target.value}))} />
          <input className="border rounded p-2" placeholder="Descripción" value={form.description} onChange={e=> setForm(prev=>({...prev,description:e.target.value}))} />
        </div>
        <button className="mt-3 px-3 py-2 bg-blue-600 text-white rounded">Crear</button>
      </form>
      <div className="bg-white border rounded">
        <div className="p-3 border-b font-medium">Listado</div>
        {loading ? (<div className="p-3 text-gray-600">Cargando...</div>): (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Código</th>
                  <th className="p-2 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {types.map(t=> (
                  <tr key={t._id}>
                    <td className="p-2">{t.name}</td>
                    <td className="p-2">{t.code}</td>
                    <td className="p-2">{t.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PurchaseTypesManagement



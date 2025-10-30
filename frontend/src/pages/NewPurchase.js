import React, { useEffect, useMemo, useState } from 'react'
import { FaShoppingCart, FaSearch } from 'react-icons/fa'
import ProductSearchModal from '../components/ProductSearchModal'
import { useNavigate } from 'react-router-dom'
import SummaryApi from '../common'
import { toast } from 'react-toastify'

function NewPurchase() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchaseTypes, setPurchaseTypes] = useState([])
  const [exchangeRates, setExchangeRates] = useState({ USD: 0, EUR: 0 })

  const [form, setForm] = useState({
    purchaseType: 'inventario',
    branchId: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'efectivo',
    paymentTerms: 'efectivo',
    dueDate: '',
    supplierMode: 'registered',
    supplierId: '',
    supplierInfo: { name: '', contact: '', ruc: '', address: '' },
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        currency: 'PYG',
        exchangeRate: '',
        taxType: 'iva_10',
        category: 'producto',
        productCode: ''
      }
    ],
    notes: '',
    invoiceFile: null,
    receiptFile: null
  })

  useEffect(() => {
    async function loadFormData() {
      try {
        const headers = {}
        const token = localStorage.getItem('authToken')
        if (token) headers['Authorization'] = `Bearer ${token}`
        // 1) Intento con endpoint consolidado
        const res = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/formulario-datos`, { credentials: 'include', headers })
        if (res.ok) {
          const json = await res.json()
          if (json?.data) {
            setBranches(json.data.branches || [])
            setSuppliers(json.data.suppliers || [])
            setPurchaseTypes(json.data.purchaseTypes || [])
            setExchangeRates(json.data.exchangeRates || { USD: 0, EUR: 0 })
            return
          }
        }
        // 2) Fallback: pedir cada recurso por separado para no bloquear el form
        const [tRes, bRes, sRes, usdRes, eurRes] = await Promise.all([
          fetch(`${SummaryApi.baseURL}/api/finanzas/tipos-compra/activos`, { credentials: 'include', headers }).catch(()=>null),
          fetch(`${SummaryApi.baseURL}/api/finanzas/sucursales/activas`, { credentials: 'include', headers }).catch(()=>null),
          fetch(`${SummaryApi.baseURL}/api/finanzas/proveedores`, { credentials: 'include', headers }).catch(()=>null),
          fetch(`${SummaryApi.baseURL}/api/finanzas/tipo-cambio?currency=USD`, { credentials: 'include', headers }).catch(()=>null),
          fetch(`${SummaryApi.baseURL}/api/finanzas/tipo-cambio?currency=EUR`, { credentials: 'include', headers }).catch(()=>null)
        ])
        if (tRes && tRes.ok) {
          const jt = await tRes.json(); setPurchaseTypes((jt.data || jt).map(t=> ({ code: t.code || t._id || '', name: t.name || t.code || '' })))
        }
        if (bRes && bRes.ok) {
          const jb = await bRes.json(); setBranches(jb.data || jb)
        }
        if (sRes && sRes.ok) {
          const js = await sRes.json(); setSuppliers(js.data?.suppliers || js.data || js)
        }
        const nextRates = { USD: 0, EUR: 0 }
        if (usdRes && usdRes.ok) { const ju = await usdRes.json(); nextRates.USD = ju.data?.toPYG || ju.toPYG || 0 }
        if (eurRes && eurRes.ok) { const je = await eurRes.json(); nextRates.EUR = je.data?.toPYG || je.toPYG || 0 }
        setExchangeRates(nextRates)
      } catch {}
    }
    loadFormData()
  }, [])

  useEffect(() => {
    if (form.paymentTerms === 'efectivo') {
      setForm(prev => ({ ...prev, dueDate: prev.purchaseDate }))
    } else if (form.paymentTerms === '15_dias') {
      setForm(prev => ({ ...prev, dueDate: addDays(prev.purchaseDate, 15) }))
    } else if (form.paymentTerms === '30_dias') {
      setForm(prev => ({ ...prev, dueDate: addDays(prev.purchaseDate, 30) }))
    } else if (form.paymentTerms === '60_dias') {
      setForm(prev => ({ ...prev, dueDate: addDays(prev.purchaseDate, 60) }))
    }
  }, [form.paymentTerms, form.purchaseDate])

  function addDays(dateStr, days) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  function handleItemChange(index, key, value) {
    const next = [...form.items]
    next[index] = { ...next[index], [key]: value }
    if (key === 'currency' && value === 'PYG') next[index].exchangeRate = ''
    setForm(prev => ({ ...prev, items: next }))
  }

  function addItem() {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '', quantity: 1, unitPrice: 0, currency: 'PYG', exchangeRate: '', taxType: 'iva_10', category: 'producto'
      }]
    }))
  }

  // Proveedores - modal buscador
  const [showSuppliersModal, setShowSuppliersModal] = useState(false)
  const [supplierQuery, setSupplierQuery] = useState('')
  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.toLowerCase()
    return suppliers.filter(s => `${s.name||''} ${s.company||''} ${s.ruc||''}`.toLowerCase().includes(q)).slice(0, 50)
  }, [supplierQuery, suppliers])

  // Modal de productos
  const [showProductsModalFor, setShowProductsModalFor] = useState(null) // index del item o null
  function handleSelectProduct(p) {
    if (showProductsModalFor === null) return
    const i = showProductsModalFor
    const code = p.productCode || p.sku || p.code || ''
    const name = p.productName || p.name || ''
    const price = Number(p.price || p.sellingPrice || 0)
    const category = p.category || p.mainCategory || 'producto'
    handleItemChange(i, 'productCode', code)
    handleItemChange(i, 'description', name)
    if (price > 0) handleItemChange(i, 'unitPrice', price)
    handleItemChange(i, 'category', category)
  }

  function removeItem(idx) {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  function calculateItemTotals(item) {
    let unitPriceInPYG = Number(item.unitPrice || 0)
    // Conversión basada en tipos de cambio actuales
    if (item.currency === 'USD') unitPriceInPYG = unitPriceInPYG * (Number(item.exchangeRate) || exchangeRates.USD || 0)
    if (item.currency === 'EUR') unitPriceInPYG = unitPriceInPYG * (Number(item.exchangeRate) || exchangeRates.EUR || 0)

    let baseAmount, taxAmount
    if (item.taxType === 'iva_10') {
      baseAmount = unitPriceInPYG / 1.10
      taxAmount = unitPriceInPYG - baseAmount
    } else if (item.taxType === 'iva_5') {
      baseAmount = unitPriceInPYG / 1.05
      taxAmount = unitPriceInPYG - baseAmount
    } else {
      baseAmount = unitPriceInPYG
      taxAmount = 0
    }

    return {
      baseAmount,
      taxAmount,
      subtotal: Number(item.quantity || 0) * baseAmount,
      totalTaxForItem: Number(item.quantity || 0) * taxAmount,
      totalForItem: Number(item.quantity || 0) * unitPriceInPYG
    }
  }

  const totals = useMemo(() => {
    let subtotal = 0, iva10 = 0, iva5 = 0, exentas = 0, total = 0
    form.items.forEach(it => {
      const r = calculateItemTotals(it)
      subtotal += r.subtotal
      total += r.totalForItem
      if (it.taxType === 'iva_10') iva10 += r.totalTaxForItem
      else if (it.taxType === 'iva_5') iva5 += r.totalTaxForItem
      else exentas += r.subtotal
    })
    return { subtotal, iva10, iva5, exentas, totalTax: iva10 + iva5, total }
  }, [form.items])

  async function handleSubmit(createAnother = false) {
    try {
      // Validaciones mínimas
      if (!form.branchId) return toast.error('Seleccione la sucursal destino')
      if (!form.items.length) return toast.error('Agregue al menos un item')
      for (const it of form.items) {
        if (!it.description || Number(it.quantity) <= 0 || Number(it.unitPrice) <= 0) {
          return toast.error('Cada item debe tener descripción, cantidad > 0 y precio > 0')
        }
        if (it.currency !== 'PYG' && !it.exchangeRate) return toast.error('Ingrese tipo de cambio')
      }

      const payload = {
        purchaseType: form.purchaseType,
        branchId: form.branchId,
        purchaseDate: form.purchaseDate,
        paymentMethod: form.paymentMethod,
        dueDate: form.dueDate,
        supplierId: form.supplierMode === 'registered' ? form.supplierId : undefined,
        supplierInfo: form.supplierMode === 'manual' ? form.supplierInfo : undefined,
        items: form.items
      }

      const headers = { 'Content-Type': 'application/json' }
      const token = localStorage.getItem('authToken')
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Error al crear compra')

      // Subir documentos si hay
      if (form.invoiceFile || form.receiptFile) {
        const fd = new FormData()
        if (form.invoiceFile) fd.append('invoice', form.invoiceFile)
        if (form.receiptFile) fd.append('receipt', form.receiptFile)
        const uploadHeaders = {}
        if (token) uploadHeaders['Authorization'] = `Bearer ${token}`
        await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${json.data._id}/documentos`, { method: 'POST', credentials: 'include', headers: uploadHeaders, body: fd })
      }
      toast.success('Compra guardada')
      if (createAnother) {
        setForm(prev => ({ ...prev, items: [prev.items[0]] }))
      } else {
        navigate(`/panel-admin/compras/${json.data._id}`)
      }
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-bold flex items-center text-gray-900">
          <FaShoppingCart className="mr-3 text-orange-600" /> Nueva Compra
        </h1>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded" onClick={() => navigate('/panel-admin/configuracion')}>
            Configuración
          </button>
        </div>
      </div>
      <p className="text-gray-600 -mt-4 mb-4">Formulario limpio y rápido, con IVA desglosado y tipos de cambio actuales.</p>

      {/* Paso 1: Información General */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Tipo de Compra</label>
            <select className="w-full border rounded p-2" value={form.purchaseType} onChange={e => setForm(prev => ({ ...prev, purchaseType: e.target.value }))}>
              <option value="">Seleccione</option>
              {purchaseTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">Sucursal Destino</label>
            <select className="w-full border rounded p-2" value={form.branchId} onChange={e => setForm(prev => ({ ...prev, branchId: e.target.value }))}>
              <option value="">Seleccione</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">Fecha de Compra</label>
            <input type="date" className="w-full border rounded p-2" value={form.purchaseDate} onChange={e => setForm(prev => ({ ...prev, purchaseDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">Método de Pago</label>
            <select className="w-full border rounded p-2" value={form.paymentMethod} onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="credito">Crédito</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">Términos de Pago</label>
            <select className="w-full border rounded p-2" value={form.paymentTerms} onChange={e => setForm(prev => ({ ...prev, paymentTerms: e.target.value }))}>
              <option value="efectivo">Efectivo</option>
              <option value="15_dias">15 días</option>
              <option value="30_dias">30 días</option>
              <option value="60_dias">60 días</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">Fecha de Vencimiento</label>
            <input type="date" className="w-full border rounded p-2" value={form.dueDate} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} />
          </div>
        </div>
      </section>

      {/* Paso 2: Proveedor */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2">
            <input type="radio" checked={form.supplierMode === 'registered'} onChange={() => setForm(prev => ({ ...prev, supplierMode: 'registered' }))} />
            Registrado
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={form.supplierMode === 'manual'} onChange={() => setForm(prev => ({ ...prev, supplierMode: 'manual' }))} />
            Manual
          </label>
        </div>

        {form.supplierMode === 'registered' ? (
          <div>
            <label className="block text-sm mb-1 text-gray-700">Proveedor</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded p-2"
                value={supplierQuery}
                onChange={(e) => setSupplierQuery(e.target.value)}
                placeholder="Buscar proveedor..."
              />
              <button type="button" className="px-3 py-2 bg-gray-100 border border-gray-200 rounded" onClick={() => setShowSuppliersModal(true)}>
                <FaSearch />
              </button>
            </div>
            {form.supplierId && (
              <div className="text-xs text-gray-600 mt-1">Proveedor seleccionado: {suppliers.find(s=>s._id===form.supplierId)?.name || 'N/D'}</div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">Nombre</label>
              <input className="w-full border rounded p-2" value={form.supplierInfo.name} onChange={e => setForm(prev => ({ ...prev, supplierInfo: { ...prev.supplierInfo, name: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">Contacto</label>
              <input className="w-full border rounded p-2" value={form.supplierInfo.contact} onChange={e => setForm(prev => ({ ...prev, supplierInfo: { ...prev.supplierInfo, contact: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">RUC</label>
              <input className="w-full border rounded p-2" value={form.supplierInfo.ruc} onChange={e => setForm(prev => ({ ...prev, supplierInfo: { ...prev.supplierInfo, ruc: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">Dirección</label>
              <input className="w-full border rounded p-2" value={form.supplierInfo.address} onChange={e => setForm(prev => ({ ...prev, supplierInfo: { ...prev.supplierInfo, address: e.target.value } }))} />
            </div>
          </div>
        )}
      </section>

      {/* Paso 3: Items */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium">Items</div>
          <button className="px-3 py-1 bg-orange-600 text-white rounded" onClick={addItem}>Agregar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Descripción</th>
                <th className="p-2">Código</th>
                <th className="p-2">Cant.</th>
                <th className="p-2">Precio (con IVA)</th>
                <th className="p-2">Moneda</th>
                <th className="p-2">TC</th>
                <th className="p-2">IVA</th>
                <th className="p-2">Base</th>
                <th className="p-2">IVA</th>
                <th className="p-2">Subtotal</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, idx) => {
                const r = calculateItemTotals(it)
                return (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <div className="flex gap-1">
                        <input className="flex-1 border rounded p-1" value={it.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                        <button type="button" className="px-2 border rounded" title="Buscar producto" onClick={()=> setShowProductsModalFor(idx)}>
                          <FaSearch />
                        </button>
                      </div>
                    </td>
                    <td className="p-2 w-40"><input className="w-full border rounded p-1" value={it.productCode} onChange={e => handleItemChange(idx, 'productCode', e.target.value)} placeholder="Código" /></td>
                    <td className="p-2 w-20"><input type="number" className="w-full border rounded p-1" value={it.quantity} min={1} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} /></td>
                    <td className="p-2 w-32"><input type="number" className="w-full border rounded p-1" value={it.unitPrice} min={0} onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))} /></td>
                    <td className="p-2 w-28">
                      <select className="w-full border rounded p-1" value={it.currency} onChange={e => handleItemChange(idx, 'currency', e.target.value)}>
                        <option>PYG</option>
                        <option>USD</option>
                        <option>EUR</option>
                      </select>
                    </td>
                    <td className="p-2 w-24">
                      <input type="number" className="w-full border rounded p-1" value={it.currency==='USD'? (it.exchangeRate || exchangeRates.USD) : it.currency==='EUR' ? (it.exchangeRate || exchangeRates.EUR) : ''} disabled={it.currency==='PYG'} onChange={e => handleItemChange(idx, 'exchangeRate', e.target.value)} />
                    </td>
                    <td className="p-2 w-28">
                      <select className="w-full border rounded p-1" value={it.taxType} onChange={e => handleItemChange(idx, 'taxType', e.target.value)} title="El precio incluye IVA; se descompone automáticamente">
                        <option value="iva_10">IVA 10%</option>
                        <option value="iva_5">IVA 5%</option>
                        <option value="exento">Exento</option>
                      </select>
                    </td>
                    <td className="p-2">₲ {r.baseAmount.toFixed(0)}</td>
                    <td className="p-2">₲ {r.taxAmount.toFixed(0)}</td>
                    <td className="p-2">₲ {r.subtotal.toFixed(0)}</td>
                    <td className="p-2 text-right">
                      <button className="text-red-600" onClick={() => removeItem(idx)}>Eliminar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Paso 4 y 5: Documentos y Notas */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Factura (PDF/IMG)</label>
            <input type="file" accept="application/pdf,image/*" onChange={e => setForm(prev => ({ ...prev, invoiceFile: e.target.files?.[0] || null }))} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">Recibo/Comprobante (PDF/IMG)</label>
            <input type="file" accept="application/pdf,image/*" onChange={e => setForm(prev => ({ ...prev, receiptFile: e.target.files?.[0] || null }))} />
          </div>
          <div className="mt-4">
          <label className="block text-sm mb-1 text-gray-700">Notas</label>
          <textarea className="w-full border rounded p-2" rows={3} value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
        </div>
        </div>
      </section>

      {/* Resumen */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid md:grid-cols-5 gap-4 text-sm">
          <div className="col-span-2">
            <div className="font-medium mb-2">Resumen</div>
            <div>Subtotal (sin IVA): ₲ {totals.subtotal.toFixed(0)}</div>
            <div>IVA 10%: ₲ {totals.iva10.toFixed(0)}</div>
            <div>IVA 5%: ₲ {totals.iva5.toFixed(0)}</div>
            <div>Exentas: ₲ {totals.exentas.toFixed(0)}</div>
            <div className="mt-2">Total IVA: ₲ {(totals.totalTax).toFixed(0)}</div>
          </div>
          <div className="col-span-3 flex items-end justify-end">
            <div className="text-right">
              <div className="text-lg font-semibold">TOTAL A PAGAR: ₲ {totals.total.toFixed(0)}</div>
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => navigate(-1)}>Cancelar</button>
                <button className="px-3 py-2 bg-orange-600 text-white rounded" onClick={() => handleSubmit(false)}>Guardar Compra</button>
                <button className="px-3 py-2 bg-orange-500 text-white rounded" onClick={() => handleSubmit(true)}>Guardar y Crear Nueva</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    {/* Modal de Proveedores */}
    {showSuppliersModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="font-semibold">Seleccionar Proveedor</div>
            <button className="text-xl" onClick={()=> setShowSuppliersModal(false)}>×</button>
          </div>
          <div className="p-4">
            <input className="w-full border rounded p-2 mb-3" placeholder="Buscar..." value={supplierQuery} onChange={e=> setSupplierQuery(e.target.value)} />
            <div className="max-h-[50vh] overflow-auto divide-y">
              {filteredSuppliers.map(s => (
                <button key={s._id} className="w-full text-left p-2 hover:bg-gray-50" onClick={()=> { setForm(prev=> ({...prev, supplierId: s._id })); setShowSuppliersModal(false) }}>
                  <div className="font-medium">{s.name || s.company}</div>
                  <div className="text-xs text-gray-500">RUC: {s.ruc || 'N/D'} • {s.email || ''}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Modal de Productos */}
    {showProductsModalFor !== null && (
      <ProductSearchModal
        isOpen={showProductsModalFor !== null}
        onClose={()=> setShowProductsModalFor(null)}
        onSelect={handleSelectProduct}
      />
    )}
    </>
  )
}

export default NewPurchase



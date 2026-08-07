import React from 'react'
import { Link } from 'react-router-dom'

function AdminSettings() {
  const cards = [
    { title: 'Sucursales', desc: 'Gestiona sucursales y datos de ubicación', to: '/panel-admin/sucursales' },
    { title: 'Tipos de Venta', desc: 'Configura tipos de venta', to: '/panel-admin/tipos-venta' },
    { title: 'Vendedores', desc: 'Gestiona vendedores', to: '/panel-admin/vendedores' },
    { title: 'Proveedores', desc: 'Gestiona proveedores', to: '/panel-admin/proveedores' },
    { title: 'Usuarios', desc: 'Gestiona usuarios y permisos', to: '/panel-admin/gestion-usuarios' },
    { title: 'Tipo de Cambio', desc: 'Actualiza tipos de cambio', to: '/panel-admin/tipo-cambio' },
    { title: 'Home / Vitrinas', desc: 'Títulos, categorías y límites del home', to: '/panel-admin/home-vitrinas' },
    // Placeholder para futuro
    { title: 'Tipos de Compras', desc: 'Configura categorías de compras (pronto)', to: '/panel-admin/tipos-compra' }
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Centraliza la configuración para simplificar los formularios.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.title} to={c.to} className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow">
            <div className="text-lg font-semibold text-gray-900">{c.title}</div>
            <div className="text-sm text-gray-600 mt-1">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default AdminSettings



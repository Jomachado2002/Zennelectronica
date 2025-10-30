import React from 'react'
import { useRouteError, Link } from 'react-router-dom'

function ErrorPage() {
  const error = useRouteError()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Ocurrió un error</h1>
      <p className="text-gray-600 mb-4">{error?.status || ''} {error?.statusText || 'Error inesperado'}</p>
      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs whitespace-pre-wrap max-w-2xl">{error?.data || error?.message || ''}</pre>
      <Link to="/panel-admin/dashboard" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Ir al Dashboard</Link>
    </div>
  )
}

export default ErrorPage



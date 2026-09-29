import React, { useCallback, useEffect, useState } from 'react';
import SummaryApi from '../../common';
import { authFetch } from '../../helpers/authFetch';
import displayPYGCurrency from '../../helpers/displayCurrency';

function formatWhen(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('es-PY', {
        timeZone: 'America/Asuncion',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    });
}

function seconds(ms) {
    const value = Math.round((ms || 0) / 1000);
    if (value < 60) return `${value} s`;
    return `${Math.floor(value / 60)} min ${value % 60} s`;
}

export default function VisitantesPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState('');

    const load = useCallback(async () => {
        setError('');
        const response = await authFetch(`${SummaryApi.baseURL}/api/analitica/panel`);
        const body = await response.json();
        if (!response.ok || !body.success) {
            throw new Error(body.message || 'No se pudo cargar');
        }
        setData(body.data);
    }, []);

    useEffect(() => {
        load().catch((err) => setError(err.message));
    }, [load]);

    const sendPending = async () => {
        setSending(true);
        setSendResult('');
        try {
            const response = await authFetch(`${SummaryApi.baseURL}/api/analitica/enviar-pendientes`, { method: 'POST' });
            const body = await response.json();
            if (!response.ok || !body.success) throw new Error(body.message || 'No se envió');
            setSendResult(`Carrito: ${body.data.cart}. Sugerencias: ${body.data.suggestions}. Fallidos: ${body.data.failed}.`);
        } catch (err) {
            setSendResult(err.message);
        } finally {
            setSending(false);
        }
    };

    const totals = data?.totals || {};

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[#2A3190]">Visitantes de hoy</h1>
                    <p className="text-sm text-gray-500">Día {data?.day || '…'} · hora de Paraguay. Los clics crudos se borran a los 14 días.</p>
                </div>
                <button
                    type="button"
                    onClick={sendPending}
                    disabled={sending}
                    className="bg-[#373592] text-white px-4 py-2 text-sm disabled:opacity-60"
                >
                    {sending ? 'Enviando…' : 'Enviar correos pendientes'}
                </button>
            </div>
            {sendResult && <p className="text-sm mb-4 text-gray-700">{sendResult}</p>}
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                {[
                    ['Visitantes', totals.visitors || 0],
                    ['Vistas de producto', totals.productViews || 0],
                    ['Agregados al carrito', totals.addToCarts || 0],
                    ['Con carrito ahora', totals.withCart || 0],
                    ['Correos nuevos', totals.emails || 0],
                    ['Con intención', totals.intent || 0]
                ].map(([label, value]) => (
                    <div key={label} className="bg-white border border-gray-200 p-3">
                        <p className="text-2xl font-semibold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            <section className="bg-white border border-gray-200 mb-6">
                <h2 className="px-4 py-3 border-b text-sm font-medium">Carritos con correo</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr>
                                <th className="px-4 py-2 font-medium">Correo</th>
                                <th className="px-4 py-2 font-medium">Origen</th>
                                <th className="px-4 py-2 font-medium">Productos</th>
                                <th className="px-4 py-2 font-medium">Avisos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.carts || []).map((cart) => (
                                <tr key={`${cart.email}-${cart.updatedAt}`} className="border-t align-top">
                                    <td className="px-4 py-3">
                                        <p>{cart.email}</p>
                                        <p className="text-xs text-gray-500">{formatWhen(cart.updatedAt)}</p>
                                    </td>
                                    <td className="px-4 py-3">{cart.source === 'cuenta' ? 'Sesión' : 'Lo escribió'}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {(cart.items || []).map((item) => (
                                            <div key={`${cart.email}-${item.name}`}>
                                                {item.quantity}× {item.name} · {displayPYGCurrency(item.price)}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {cart.reminders >= 3 ? 'En pausa' : `${cart.reminders || 0} de 3`}
                                    </td>
                                </tr>
                            ))}
                            {data && !data.carts?.length && (
                                <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>Nadie dejó correo con productos en el carrito.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <section className="xl:col-span-2 bg-white border border-gray-200">
                    <h2 className="px-4 py-3 border-b text-sm font-medium">Quién entró</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Hora</th>
                                    <th className="px-4 py-2 font-medium">Correo</th>
                                    <th className="px-4 py-2 font-medium">Intención</th>
                                    <th className="px-4 py-2 font-medium">Recorrió</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.visitors || []).map((visitor) => (
                                    <tr key={visitor.visitorId} className="border-t align-top">
                                        <td className="px-4 py-3 whitespace-nowrap">{formatWhen(visitor.lastSeenAt)}</td>
                                        <td className="px-4 py-3">{visitor.email || 'Sin correo'}</td>
                                        <td className="px-4 py-3">{visitor.intent}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {(visitor.products || []).map((product) => (
                                                <div key={`${visitor.visitorId}-${product.name}`}>
                                                    {product.name || 'Producto'} · {seconds(product.durationMs)}
                                                </div>
                                            ))}
                                            {(visitor.cart || []).length > 0 && (
                                                <div className="text-[#373592] mt-1">
                                                    Carrito: {visitor.cart.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {data && !data.visitors?.length && (
                                    <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>Todavía no hay visitas registradas hoy.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="space-y-4">
                    <section className="bg-white border border-gray-200">
                        <h2 className="px-4 py-3 border-b text-sm font-medium">Productos más recorridos</h2>
                        <ul>
                            {(data?.topProducts || []).map((product) => (
                                <li key={String(product.productId)} className="px-4 py-3 border-t text-sm">
                                    <p className="text-gray-800">{product.name || 'Producto'}</p>
                                    <p className="text-gray-500 text-xs mt-1">{product.views || 0} vistas · {product.addToCarts || 0} al carrito · {seconds(product.dwellMs)}</p>
                                </li>
                            ))}
                            {data && !data.topProducts?.length && <li className="px-4 py-4 text-sm text-gray-500">Sin productos todavía.</li>}
                        </ul>
                    </section>
                    <section className="bg-white border border-gray-200">
                        <h2 className="px-4 py-3 border-b text-sm font-medium">Búsquedas</h2>
                        <ul>
                            {(data?.topSearches || []).map((search) => (
                                <li key={search.query} className="px-4 py-2 border-t text-sm flex justify-between">
                                    <span>{search.query}</span>
                                    <span className="text-gray-500">{search.count}</span>
                                </li>
                            ))}
                            {data && !data.topSearches?.length && <li className="px-4 py-4 text-sm text-gray-500">Sin búsquedas todavía.</li>}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}

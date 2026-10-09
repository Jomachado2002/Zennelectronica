import React, { useCallback, useEffect, useState } from 'react';
import SummaryApi from '../../common';
import { authFetch } from '../../helpers/authFetch';
import displayPYGCurrency from '../../helpers/displayCurrency';

const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'never', label: 'Sin enviar' },
    { id: 'pending', label: 'Sin envío hoy' },
    { id: 'sent', label: 'Enviados hoy' },
    { id: 'unsubscribed', label: 'Dados de baja' }
];

async function readJson(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) {
        throw new Error(body.message || 'No se pudo completar la acción.');
    }
    return body;
}

function sourceLabel(source) {
    if (source === 'cliente') return 'Cliente';
    if (source === 'registro') return 'Registro';
    if (source === 'bancard') return 'Bancard';
    if (source === 'manual') return 'Manual';
    return 'Archivo';
}

function formatWhen(value) {
    if (!value) return 'Nunca';
    return new Date(value).toLocaleString('es-PY', {
        timeZone: 'America/Asuncion',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export default function NewsletterPage() {
    const [summary, setSummary] = useState(null);
    const [contacts, setContacts] = useState({ items: [], total: 0, page: 1 });
    const [batch, setBatch] = useState(null);
    const [sends, setSends] = useState({ items: [], total: 0 });
    const [brevo, setBrevo] = useState([]);
    const [preview, setPreview] = useState('');
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [email, setEmail] = useState('');
    const [testEmail, setTestEmail] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState('');

    const api = SummaryApi.baseURL;

    const loadContacts = useCallback(async (page = 1, nextFilter = 'all', nextQuery = '') => {
        const params = new URLSearchParams({
            page: String(page),
            filter: nextFilter,
            q: nextQuery
        });
        const response = await authFetch(`${api}/api/newsletter/contactos?${params}`);
        const body = await readJson(response);
        setContacts(body.data);
    }, [api]);

    const load = useCallback(async () => {
        const [summaryRes, batchRes, sendsRes, brevoRes] = await Promise.all([
            authFetch(`${api}/api/newsletter/resumen`),
            authFetch(`${api}/api/newsletter/lote`),
            authFetch(`${api}/api/newsletter/envios`),
            authFetch(`${api}/api/newsletter/brevo`)
        ]);
        const summaryBody = await readJson(summaryRes);
        const batchBody = await readJson(batchRes);
        const sendsBody = await readJson(sendsRes);
        const brevoBody = await readJson(brevoRes);
        setSummary(summaryBody.data);
        setBatch(batchBody.data);
        setSends(sendsBody.data);
        setBrevo(brevoBody.data || []);
        if (summaryBody.data?.template?.subject) {
            const htmlRes = await authFetch(`${api}/api/newsletter/plantilla/html`);
            if (htmlRes.ok) setPreview(await htmlRes.text());
        }
    }, [api]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                await authFetch(`${api}/api/newsletter/sincronizar`, { method: 'POST' });
            } catch {
                // La lista del archivo igual se puede ver si la sincronización falla.
            }
            if (!alive) return;
            try {
                await load();
                await loadContacts(1);
            } catch (err) {
                if (alive) setError(err.message);
            }
        })();
        return () => {
            alive = false;
        };
    }, [api, load, loadContacts]);

    const run = async (label, action) => {
        setBusy(label);
        setError('');
        setNotice('');
        try {
            const message = await action();
            if (message) setNotice(message);
            await load();
            await loadContacts(contacts.page || 1, filter, query);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy('');
        }
    };

    const importFile = (file) => {
        if (!file) return;
        const form = new FormData();
        form.append('archivo', file);
        run('importar', async () => {
            const response = await authFetch(`${api}/api/newsletter/importar`, { method: 'POST', body: form });
            const body = await readJson(response);
            const data = body.data;
            return `Se guardaron ${data.inserted} correos nuevos. ${data.alreadyStored} ya estaban. ${data.duplicatesInFile} repetidos en el archivo.`;
        });
    };

    const addOne = (event) => {
        event.preventDefault();
        const value = email.trim();
        if (!value) return;
        run('agregar', async () => {
            const response = await authFetch(`${api}/api/newsletter/contactos`, {
                method: 'POST',
                body: JSON.stringify({ email: value })
            });
            await readJson(response);
            setEmail('');
            return `Se agregó ${value}.`;
        });
    };

    const removeOne = (row) => {
        if (!window.confirm(`Quitar ${row.email} de la lista?`)) return;
        run('quitar', async () => {
            const response = await authFetch(`${api}/api/newsletter/contactos/${row.id}`, { method: 'DELETE' });
            await readJson(response);
            return `Se quitó ${row.email}.`;
        });
    };

    const generate = () => run('plantilla', async () => {
        const response = await authFetch(`${api}/api/newsletter/plantilla`, { method: 'POST' });
        const body = await readJson(response);
        const ai = body.data?.ai || {};
        return `Plantilla lista. Google: ${ai.gemini || 'sin dato'}. Claude: ${ai.claude || 'sin dato'}.`;
    });

    const assign = (reroll) => run('lote', async () => {
        const response = await authFetch(`${api}/api/newsletter/lote`, {
            method: 'POST',
            body: JSON.stringify({ reroll })
        });
        const body = await readJson(response);
        return `Quedaron ${body.data.items.length} correos asignados para hoy.`;
    });

    const send = () => {
        const remaining = summary?.remainingToday ?? 0;
        if (!window.confirm(`Se van a enviar hasta ${remaining} correos del cupo de hoy. Cada persona recibe el enlace para darse de baja.`)) return;
        run('enviar', async () => {
            const response = await authFetch(`${api}/api/newsletter/enviar`, { method: 'POST' });
            const body = await readJson(response);
            return `Enviados: ${body.data.sent}. Fallidos: ${body.data.failed}. Quedan ${body.data.remainingToday} del cupo.`;
        });
    };

    const test = (event) => {
        event.preventDefault();
        run('prueba', async () => {
            const response = await authFetch(`${api}/api/newsletter/prueba`, {
                method: 'POST',
                body: JSON.stringify({ email: testEmail.trim() })
            });
            const body = await readJson(response);
            return `Prueba enviada a ${body.data.email}. No descuenta el cupo de 250.`;
        });
    };

    const template = summary?.template;
    const ours = brevo.find((item) => item.id === template?.brevoTemplateId);

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2A3190]">Marketing</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Newsletter</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Cada noche a las 22:00 se envían hasta 250 correos, solo a quienes todavía no recibieron ninguno.
                    La lista junta el archivo, los clientes, las cuentas registradas y las compras aprobadas por Bancard.
                </p>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {notice && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    ['En la lista', summary?.total ?? '—'],
                    ['Sin enviar', summary?.neverSent ?? '—'],
                    ['Enviados hoy', `${summary?.sentToday ?? 0} / ${summary?.dailyLimit ?? 250}`],
                    ['Cupo libre', summary?.remainingToday ?? '—']
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                    </div>
                ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                <h2 className="text-lg font-semibold text-slate-900">Correos</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        La primera columna puede venir así: ,correo@dominio.com, — se quitan las comas y se salta el título Email.
                        Al abrir esta pantalla también se suman clientes, registros y compras de Bancard. Quien pidió la baja no vuelve a entrar.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                        <button
                            type="button"
                            onClick={() => run('sincronizar', async () => {
                                const response = await authFetch(`${api}/api/newsletter/sincronizar`, { method: 'POST' });
                                const body = await readJson(response);
                                const data = body.data;
                                return `Nuevos: ${data.clientes} clientes, ${data.registros} registros, ${data.bancard} de Bancard.`;
                            })}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                            {busy === 'sincronizar' ? 'Sumando…' : 'Sumar clientes, registros y Bancard'}
                        </button>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#2A3190] px-4 py-2 text-sm font-semibold text-white">
                        {busy === 'importar' ? 'Cargando…' : 'Cargar Excel o CSV'}
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv,.txt"
                            className="hidden"
                            onChange={(event) => {
                                importFile(event.target.files?.[0]);
                                event.target.value = '';
                            }}
                        />
                    </label>
                    <form onSubmit={addOne} className="flex flex-1 gap-2">
                        <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="Agregar un correo"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                            Agregar
                        </button>
                    </form>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setFilter(item.id);
                                    loadContacts(1, item.id, query).catch((err) => setError(err.message));
                                }}
                                className={`rounded-full px-3 py-1 text-sm ${filter === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') loadContacts(1, filter, event.currentTarget.value).catch((err) => setError(err.message));
                        }}
                        placeholder="Buscar y pulsar Enter"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-64"
                    />
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="py-2 pr-3">Correo</th>
                                <th className="py-2 pr-3">Origen</th>
                                <th className="py-2 pr-3">Hoy</th>
                                <th className="py-2 pr-3">Envíos</th>
                                <th className="py-2 pr-3">Último</th>
                                <th className="py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.items.map((row) => (
                                <tr key={row.id} className="border-t border-slate-100">
                                    <td className="py-2 pr-3 font-medium text-slate-800">{row.email}</td>
                                    <td className="py-2 pr-3 text-slate-600">{sourceLabel(row.source)}</td>
                                    <td className="py-2 pr-3 text-slate-600">
                                        {row.status === 'unsubscribed' ? 'Baja' : row.sentToday ? 'Enviado' : 'Pendiente'}
                                    </td>
                                    <td className="py-2 pr-3 text-slate-600">{row.sendCount}</td>
                                    <td className="py-2 pr-3 text-slate-500">{formatWhen(row.lastSentAt)}</td>
                                    <td className="py-2 text-right">
                                        <button type="button" onClick={() => removeOne(row)} className="text-xs font-semibold text-red-600">
                                            Quitar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!contacts.items.length && (
                                <tr>
                                    <td colSpan="6" className="py-6 text-slate-500">Todavía no hay correos en este filtro.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{contacts.total} correos</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={(contacts.page || 1) <= 1}
                            onClick={() => loadContacts((contacts.page || 1) - 1).catch((err) => setError(err.message))}
                            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            disabled={(contacts.page || 1) * (contacts.limit || 40) >= contacts.total}
                            onClick={() => loadContacts((contacts.page || 1) + 1).catch((err) => setError(err.message))}
                            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                    <h2 className="text-lg font-semibold text-slate-900">Plantilla de captación</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Google busca el ángulo de la semana y Claude escribe el texto. Los productos salen de las promos con mayor porcentaje.
                        La misma pieza se guarda en Brevo.
                    </p>
                    <button
                        type="button"
                        onClick={generate}
                        disabled={Boolean(busy)}
                        className="mt-4 rounded-lg bg-[#7B2CBF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {busy === 'plantilla' ? 'Generando…' : 'Generar plantilla'}
                    </button>
                    {template?.subject && (
                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                            <p><span className="font-semibold">Asunto:</span> {template.subject}</p>
                            <p><span className="font-semibold">Titular:</span> {template.headline}</p>
                            {template.brevoUrl && (
                                <a href={template.brevoUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#2A3190]">
                                    Abrir en Brevo{template.brevoTemplateId ? ` (#${template.brevoTemplateId})` : ''}
                                </a>
                            )}
                            {template.brevoError && <p className="text-red-600">Brevo: {template.brevoError}</p>}
                            <ul className="mt-2 space-y-1">
                                {(template.products || []).map((product) => (
                                    <li key={product.id}>
                                        -{product.discountPercent}% {product.name} · {displayPYGCurrency(product.sellingPrice)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!!brevo.length && (
                        <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plantillas en Brevo</p>
                            <ul className="mt-2 space-y-1 text-sm">
                                {brevo.slice(0, 8).map((item) => (
                                    <li key={item.id}>
                                        <a href={item.url} target="_blank" rel="noreferrer" className="text-[#2A3190]">
                                            #{item.id} {item.name || item.subject}
                                            {ours?.id === item.id ? ' · esta campaña' : ''}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <form onSubmit={test} className="mt-4 flex gap-2">
                        <input
                            value={testEmail}
                            onChange={(event) => setTestEmail(event.target.value)}
                            placeholder="Correo de prueba"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
                            Probar
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                    <h2 className="text-lg font-semibold text-slate-900">Envío de hoy</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        A las 22:00, hora de Asunción, salen solos hasta 250 correos de quienes todavía no recibieron ninguno.
                        Al día siguiente sigue con los que faltan. Este botón hace el mismo envío si hace falta lanzarlo antes.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => assign(false)} disabled={Boolean(busy)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
                            {busy === 'lote' ? 'Asignando…' : 'Asignar 250'}
                        </button>
                        <button type="button" onClick={() => assign(true)} disabled={Boolean(busy)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
                            Volver a sortear
                        </button>
                        <button type="button" onClick={send} disabled={Boolean(busy) || summary?.remainingToday === 0} className="rounded-lg bg-[#2A3190] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            {busy === 'enviar' ? 'Enviando…' : 'Enviar cupo de hoy'}
                        </button>
                    </div>
                    <div className="mt-4 max-h-80 overflow-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="py-2 pr-3">Asignado</th>
                                    <th className="py-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(batch?.items || []).map((row) => (
                                    <tr key={row.id} className="border-t border-slate-100">
                                        <td className="py-2 pr-3">{row.email}</td>
                                        <td className="py-2">{row.sentToday ? 'Enviado' : 'Pendiente'}</td>
                                    </tr>
                                ))}
                                {!batch?.items?.length && (
                                    <tr>
                                        <td colSpan="2" className="py-6 text-slate-500">Todavía no hay un lote para hoy.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {!!sends.items.length && (
                        <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registro de hoy · {sends.total}</p>
                            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm text-slate-600">
                                {sends.items.map((item) => (
                                    <li key={item.id}>{item.email} · {item.status === 'sent' ? 'enviado' : item.error || 'falló'}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            </div>

            {preview && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                        <h2 className="text-lg font-semibold text-slate-900">Vista previa</h2>
                    </div>
                    <iframe title="Vista previa del newsletter" className="h-[720px] w-full bg-slate-50" srcDoc={preview} />
                </section>
            )}
        </div>
    );
}

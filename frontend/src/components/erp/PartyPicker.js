import React, { useEffect, useState } from 'react';
import { FaPlus, FaSearch, FaTimes, FaUser, FaTruck, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../../common';
import { authGet, authPost } from '../../helpers/authFetch';

const emptyForm = {
  name: '',
  phone: '',
  taxId: '',
  email: '',
  company: ''
};

const partyTaxId = (party) => party?.taxId || party?.ruc || '';

const PartyPicker = ({ type = 'client', value = null, onChange }) => {
  const isClient = type === 'client';
  const label = isClient ? 'Cliente' : 'Proveedor';
  const Icon = isClient ? FaUser : FaTruck;
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!modalOpen || creating) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = isClient
          ? `${SummaryApi.baseURL}/api/finanzas/ventas/clientes/buscar?query=${encodeURIComponent(query)}&limit=50`
          : `${SummaryApi.baseURL}/api/finanzas/proveedores?search=${encodeURIComponent(query)}&limit=50&sortBy=createdAt&sortOrder=desc`;
        const response = await authGet(url);
        const result = await response.json();
        if (cancelled) return;
        const items = isClient
          ? (result.data || [])
          : (result.data?.suppliers || result.data || []);
        setResults(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 200 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, modalOpen, creating, isClient]);

  const openModal = (create = false) => {
    setQuery(value?.name || '');
    setCreating(create);
    setForm({ ...emptyForm, name: create ? (value?.name || '') : '' });
    setModalOpen(true);
  };

  const selectParty = (party) => {
    if (!party?._id) return;
    onChange?.(party);
    setModalOpen(false);
    setCreating(false);
    setQuery('');
  };

  const createParty = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!form.name.trim()) {
      toast.error(`El nombre del ${label.toLowerCase()} es obligatorio`);
      return;
    }
    setSaving(true);
    try {
      const endpoint = isClient
        ? `${SummaryApi.baseURL}/api/finanzas/clientes`
        : `${SummaryApi.baseURL}/api/finanzas/proveedores`;
      const response = await authPost(endpoint, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        email: form.email.trim() || undefined,
        company: form.company.trim() || undefined
      });
      const result = await response.json();
      if (!result.success || !result.data?._id) {
        throw new Error(result.message || `No se pudo crear el ${label.toLowerCase()}`);
      }
      toast.success(`${label} creado y seleccionado`);
      setResults((prev) => [result.data, ...prev.filter((item) => item._id !== result.data._id)]);
      setForm(emptyForm);
      selectParty(result.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const stopParentSubmit = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (creating) createParty(event);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label} *
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => openModal(false)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:border-[#2A3190]"
        >
          <FaSearch className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {value ? (
            <span className="min-w-0 truncate">
              <span className="font-medium text-slate-900">{value.name}</span>
              <span className="ml-2 text-xs text-slate-500">
                {[partyTaxId(value) && `RUC ${partyTaxId(value)}`, value.phone].filter(Boolean).join(' · ')}
              </span>
            </span>
          ) : (
            <span className="text-slate-400">Buscar {label.toLowerCase()} por nombre, RUC o teléfono</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => openModal(true)}
          className="inline-flex items-center rounded-lg bg-[#2A3190] px-3 text-sm font-medium text-white hover:bg-[#1e236b]"
        >
          <FaPlus className="mr-1 h-3.5 w-3.5" />
          Nuevo
        </button>
      </div>

      {value && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <Icon className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{value.name}</p>
            <p className="truncate text-xs text-emerald-700">
              {[partyTaxId(value) && `RUC ${partyTaxId(value)}`, value.phone, value.email].filter(Boolean).join(' · ') || 'Seleccionado'}
            </p>
          </div>
          <button type="button" className="text-emerald-700" onClick={() => onChange?.(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={stopParentSubmit}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                {creating && (
                  <button type="button" onClick={() => setCreating(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                    <FaArrowLeft />
                  </button>
                )}
                <h3 className="text-base font-semibold text-slate-900">
                  {creating ? `Nuevo ${label.toLowerCase()}` : `Buscar ${label.toLowerCase()}`}
                </h3>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-600">
                <FaTimes />
              </button>
            </div>

            {!creating && (
              <>
                <div className="border-b border-slate-100 p-3">
                  <div className="relative">
                    <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Nombre, RUC, teléfono o email`}
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2A3190] focus:ring-2 focus:ring-[#2A3190]/20"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading && <div className="p-4 text-sm text-slate-500">Buscando...</div>}
                  {!loading && results.map((party) => (
                    <button
                      type="button"
                      key={party._id}
                      onClick={() => selectParty(party)}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{party.name}</p>
                      <p className="text-xs text-slate-500">
                        {[party.company, partyTaxId(party) && `RUC ${partyTaxId(party)}`, party.phone, party.email].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                  {!loading && results.length === 0 && (
                    <div className="p-6 text-center text-sm text-slate-500">
                      {query ? `No hay ${label.toLowerCase()}s con “${query}”.` : `No hay ${label.toLowerCase()}s cargados.`}
                      <div className="mt-3">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-lg bg-[#2A3190] px-3 py-2 text-sm font-medium text-white"
                          onClick={() => {
                            setForm({ ...emptyForm, name: query });
                            setCreating(true);
                          }}
                        >
                          <FaPlus className="mr-2" /> Crear {label.toLowerCase()}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!loading && results.length > 0 && (
                  <div className="border-t border-slate-200 p-3">
                    <button
                      type="button"
                      className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        setForm({ ...emptyForm, name: query });
                        setCreating(true);
                      }}
                    >
                      <FaPlus className="mr-2 inline" />
                      No está en la lista — crear {label.toLowerCase()}
                    </button>
                  </div>
                )}
              </>
            )}

            {creating && (
              <div className="overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm sm:col-span-2">
                    Nombre *
                    <input
                      autoFocus
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </label>
                  <label className="text-sm">
                    RUC / CI
                    <input
                      value={form.taxId}
                      onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </label>
                  <label className="text-sm">
                    Teléfono
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </label>
                  <label className="text-sm">
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </label>
                  <label className="text-sm">
                    Empresa
                    <input
                      value={form.company}
                      onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                    Volver a la lista
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={createParty}
                    className="rounded-lg bg-[#2A3190] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e236b] disabled:opacity-60"
                  >
                    {saving ? 'Guardando...' : `Crear ${label.toLowerCase()}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyPicker;

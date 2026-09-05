import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaSave, FaTrash, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../../common';
import { authGet, authPost } from '../../helpers/authFetch';
import {
  computeDocumentTotals,
  computeLine,
  dueDateFromTerms,
  formatUsd,
  todayLocal,
  toBackendTaxType
} from '../../helpers/tradeTax';
import displayPYGCurrency from '../../helpers/displayCurrency';
import PartyPicker from './PartyPicker';
import ProductPicker, { getProductDisplayName, getProductUnitPrice } from './ProductPicker';

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-[#2A3190] focus:ring-2 focus:ring-[#2A3190]/20';
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

const emptyItem = (currency, exchangeRate, taxType, priceIncludesTax) => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: null,
  productCode: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  currency,
  exchangeRate: currency === 'PYG' ? 1 : exchangeRate,
  taxType,
  category: 'producto',
  productCategory: '',
  priceIncludesTax
});

const DEFAULT_PURCHASE_TYPES = [
  { code: 'inventario', name: 'Inventario' },
  { code: 'servicios', name: 'Servicios' },
  { code: 'gastos', name: 'Gastos' },
  { code: 'equipos', name: 'Equipos' }
];

const typeValue = (type, saleMode) => {
  if (saleMode) return String(type?._id || '');
  const code = String(type?.code || '').trim();
  if (code && !/^\d+$/.test(code)) return code.toLowerCase();
  const name = String(type?.name || '').trim().toLowerCase().replace(/\s+/g, '_');
  return name || 'inventario';
};

const pickDefaultPurchaseType = (types = []) => {
  const ranked = types.find((type) => typeValue(type, false) === 'inventario')
    || types.find((type) => !/^\d+$/.test(String(type?.code || '')))
    || types[0];
  return typeValue(ranked, false);
};
const branchValue = (branch) => String(branch?._id || '');

const readJsonList = async (url) => {
  const response = await authGet(url);
  const result = await response.json();
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.data?.suppliers)) return result.data.suppliers;
  return [];
};

const TradeDocumentForm = ({ mode = 'sale' }) => {
  const navigate = useNavigate();
  const isSale = mode === 'sale';
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [party, setParty] = useState(null);
  const [meta, setMeta] = useState({
    branches: [],
    types: [],
    salespersons: [],
    exchangeRate: 7300
  });
  const [form, setForm] = useState({
    typeId: '',
    branchId: '',
    salespersonId: '',
    date: todayLocal(),
    invoiceNumber: '',
    paymentMethod: isSale ? 'efectivo' : 'transferencia',
    paymentTerms: 'efectivo',
    dueDate: todayLocal(),
    currency: isSale ? 'PYG' : 'USD',
    exchangeRate: 7300,
    taxType: 'iva_10',
    priceIncludesTax: true,
    notes: '',
    customerNotes: '',
    items: [emptyItem(isSale ? 'PYG' : 'USD', 7300, 'iva_10', true)]
  });

  useEffect(() => {
    const load = async () => {
      setLoadingMeta(true);
      try {
        const url = isSale
          ? `${SummaryApi.baseURL}/api/finanzas/ventas/formulario-datos`
          : `${SummaryApi.baseURL}/api/finanzas/compras/formulario-datos`;
        const response = await authGet(url);
        const result = await response.json();
        const data = result.data || {};
        let types = isSale ? (data.salesTypes || []) : (data.purchaseTypes || []);
        let branches = data.branches || [];
        const salespersons = data.salespersons || [];
        const exchangeRate = Number(data.exchangeRates?.USD) > 0 ? Number(data.exchangeRates.USD) : 7300;

        if (!isSale && types.length === 0) {
          try {
            types = await readJsonList(`${SummaryApi.baseURL}/api/finanzas/tipos-compra/activos`);
          } catch {
            types = [];
          }
        }
        if (!isSale && types.length === 0) types = DEFAULT_PURCHASE_TYPES;

        if (branches.length === 0) {
          try {
            branches = await readJsonList(`${SummaryApi.baseURL}/api/finanzas/sucursales/activas`);
          } catch {
            branches = [];
          }
        }

        const defaultCurrency = isSale ? 'PYG' : 'USD';
        const defaultType = isSale ? typeValue(types[0], true) : pickDefaultPurchaseType(types);
        const defaultBranch = branchValue(branches.find((branch) => branch.isMainBranch) || branches[0]);
        setMeta({ branches, types, salespersons, exchangeRate });
        setForm((prev) => {
          const keptRate = Number(prev.exchangeRate) > 0 && Number(prev.exchangeRate) !== 7300
            ? Number(prev.exchangeRate)
            : exchangeRate;
          return {
            ...prev,
            typeId: prev.typeId || defaultType,
            branchId: prev.branchId || defaultBranch,
            salespersonId: prev.salespersonId || salespersons[0]?._id || '',
            exchangeRate: keptRate,
            currency: prev.currency || defaultCurrency,
            priceIncludesTax: prev.priceIncludesTax !== false,
            items: prev.items.map((item) => ({
              ...item,
              currency: item.currency || defaultCurrency,
              priceIncludesTax: item.priceIncludesTax !== false,
              exchangeRate: (item.currency || defaultCurrency) === 'PYG' ? 1 : keptRate
            }))
          };
        });
      } catch {
        if (!isSale) {
          setMeta((prev) => ({ ...prev, types: DEFAULT_PURCHASE_TYPES }));
          setForm((prev) => ({ ...prev, typeId: prev.typeId || 'inventario' }));
        }
        toast.error('No se pudieron cargar los datos del formulario');
      } finally {
        setLoadingMeta(false);
      }
    };
    load();
  }, [isSale]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      dueDate: dueDateFromTerms(prev.date, prev.paymentTerms)
    }));
  }, [form.paymentTerms, form.date]);

  const totals = useMemo(
    () => computeDocumentTotals(form.items, form.exchangeRate),
    [form.items, form.exchangeRate]
  );

  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const updateItem = (index, patch) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const changeDocumentCurrency = (currency) => {
    setForm((prev) => ({
      ...prev,
      currency,
      items: prev.items.map((item) => ({
        ...item,
        currency,
        exchangeRate: currency === 'PYG' ? 1 : prev.exchangeRate
      }))
    }));
  };

  const changeDocumentRate = (exchangeRate) => {
    const rate = Number(exchangeRate) || 0;
    setForm((prev) => ({
      ...prev,
      exchangeRate: rate,
      items: prev.items.map((item) => ({
        ...item,
        exchangeRate: item.currency === 'PYG' ? 1 : rate
      }))
    }));
  };

  const applyTaxDefaults = (patch) => {
    setForm((prev) => ({
      ...prev,
      ...patch,
      items: prev.items.map((item) => ({
        ...item,
        taxType: patch.taxType ?? item.taxType,
        priceIncludesTax: patch.priceIncludesTax ?? item.priceIncludesTax
      }))
    }));
  };

  const selectProduct = (index, product) => {
    const item = form.items[index];
    const currency = item.currency || form.currency;
    const unitPrice = getProductUnitPrice(product, mode, currency, form.exchangeRate);
    updateItem(index, {
      productId: product._id,
      productCode: product.codigo || product.code || '',
      description: getProductDisplayName(product),
      unitPrice,
      category: 'producto',
      productCategory: product.category || '',
      currency: item.currency || form.currency,
      exchangeRate: (item.currency || form.currency) === 'PYG' ? 1 : form.exchangeRate,
      priceIncludesTax: form.priceIncludesTax !== false
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem(prev.currency, prev.exchangeRate, prev.taxType, prev.priceIncludesTax)]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validItems = form.items.filter((item) => item.description?.trim() && Number(item.quantity) > 0 && Number(item.unitPrice) > 0);
    if (!party?._id) {
      toast.error(isSale ? 'Selecciona o crea un cliente' : 'Selecciona o crea un proveedor');
      return;
    }
    if (!form.branchId) {
      toast.error('Selecciona la sucursal');
      return;
    }
    if (validItems.length === 0) {
      toast.error('Agrega al menos un producto con precio');
      return;
    }
    if (isSale && (!form.typeId || !form.salespersonId)) {
      toast.error('Completa tipo de venta y vendedor');
      return;
    }

    setSaving(true);
    try {
      if (isSale) {
        const payload = {
          saleTypeId: form.typeId,
          clientId: party._id,
          branchId: form.branchId,
          salespersonId: form.salespersonId,
          currency: form.currency,
          exchangeRate: form.exchangeRate,
          paymentMethod: form.paymentMethod,
          paymentTerms: form.paymentTerms,
          saleDate: form.date,
          dueDate: form.dueDate,
          invoiceNumber: form.invoiceNumber,
          invoiceDate: form.date,
          internalNotes: form.notes,
          customerNotes: form.customerNotes,
          items: validItems.map((item) => ({
            productId: item.productId,
            productSnapshot: {
              _id: item.productId,
              name: item.description,
              code: item.productCode,
              salesPrice: item.unitPrice
            },
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            currency: item.currency,
            exchangeRate: Number(item.exchangeRate || form.exchangeRate),
            taxType: toBackendTaxType(item.taxType, 'sale'),
            priceIncludesTax: item.priceIncludesTax !== false
          }))
        };
        const response = await authPost(`${SummaryApi.baseURL}/api/finanzas/ventas-mejoradas`, payload);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'No se pudo guardar la venta');
        toast.success('Venta guardada');
        navigate('/panel-admin/ventas');
      } else {
        const payload = {
          purchaseType: form.typeId,
          branchId: form.branchId,
          purchaseDate: form.date,
          invoiceNumber: form.invoiceNumber,
          paymentMethod: form.paymentMethod,
          paymentTerms: form.paymentTerms,
          dueDate: form.dueDate,
          supplierId: party._id,
          notes: form.notes,
          currency: form.currency,
          exchangeRate: form.exchangeRate,
          items: validItems.map((item) => ({
            productId: item.productId,
            productCode: item.productCode,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            currency: item.currency || form.currency,
            exchangeRate: Number((item.currency || form.currency) === 'PYG' ? 1 : (form.exchangeRate || item.exchangeRate)),
            taxType: toBackendTaxType(item.taxType, 'purchase'),
            priceIncludesTax: form.priceIncludesTax !== false && item.priceIncludesTax !== false,
            category: ['producto', 'servicio', 'gasto_fijo', 'gasto_variable', 'inversion'].includes(item.category)
              ? item.category
              : 'producto',
            productCategory: item.productCategory || ''
          }))
        };
        const response = await authPost(`${SummaryApi.baseURL}/api/finanzas/compras`, payload);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'No se pudo guardar la compra');
        toast.success('Compra guardada');
        navigate(`/panel-admin/compras/${result.data._id}`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to={isSale ? '/panel-admin/ventas' : '/panel-admin/compras'} className="mb-1 inline-flex items-center text-xs text-slate-500 hover:text-slate-800">
            <FaArrowLeft className="mr-2 h-3 w-3" /> Volver al listado
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{isSale ? 'Nueva venta' : 'Nueva compra'}</h1>
          <p className="text-xs text-slate-500">
            IVA Paraguay (incluido o por declarar), Gs / USD y tipo de cambio del documento.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving || loadingMeta}
          className="inline-flex items-center justify-center rounded-lg bg-[#2A3190] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e236b] disabled:opacity-60"
        >
          <FaSave className="mr-2" />
          {saving ? 'Guardando...' : isSale ? 'Guardar venta' : 'Guardar compra'}
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <label className={labelClass}>
            {isSale ? 'Tipo de venta' : 'Tipo de compra'}
            <select value={form.typeId} onChange={(e) => patchForm({ typeId: e.target.value })} className={fieldClass}>
              <option value="">Seleccionar</option>
              {meta.types.map((type) => (
                <option key={type._id || type.code} value={typeValue(type, isSale)}>
                  {type.name || type.code}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Sucursal
            <select value={form.branchId} onChange={(e) => patchForm({ branchId: e.target.value })} className={fieldClass}>
              <option value="">Seleccionar</option>
              {meta.branches.map((branch) => (
                <option key={branch._id} value={branchValue(branch)}>{branch.name}{branch.code ? ` (${branch.code})` : ''}</option>
              ))}
            </select>
          </label>
          {isSale && (
            <label className={labelClass}>
              Vendedor
              <select value={form.salespersonId} onChange={(e) => patchForm({ salespersonId: e.target.value })} className={fieldClass}>
                <option value="">Seleccionar</option>
                {meta.salespersons.map((person) => (
                  <option key={person._id} value={person._id}>{person.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className={labelClass}>
            N° factura
            <input value={form.invoiceNumber} onChange={(e) => patchForm({ invoiceNumber: e.target.value })} className={fieldClass} placeholder="001-001-0001234" />
          </label>
          <label className={labelClass}>
            Fecha
            <input type="date" value={form.date} onChange={(e) => patchForm({ date: e.target.value })} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Vencimiento
            <input type="date" value={form.dueDate} onChange={(e) => patchForm({ dueDate: e.target.value })} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Pago
            <select value={form.paymentMethod} onChange={(e) => patchForm({ paymentMethod: e.target.value })} className={fieldClass}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="credito">Crédito</option>
            </select>
          </label>
          <label className={labelClass}>
            Condición
            <select value={form.paymentTerms} onChange={(e) => patchForm({ paymentTerms: e.target.value })} className={fieldClass}>
              <option value="efectivo">Contado</option>
              <option value="net_15">15 días</option>
              <option value="net_30">30 días</option>
              <option value="net_60">60 días</option>
              <option value="net_90">90 días</option>
            </select>
          </label>
          <label className={labelClass}>
            Moneda del documento
            <select value={form.currency} onChange={(e) => changeDocumentCurrency(e.target.value)} className={fieldClass}>
              <option value="PYG">Guaraníes (Gs)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          <label className={labelClass}>
            Cotización USD
            <input
              type="number"
              min="1"
              value={form.exchangeRate}
              onChange={(e) => changeDocumentRate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            IVA %
            <select value={form.taxType} onChange={(e) => applyTaxDefaults({ taxType: e.target.value })} className={fieldClass}>
              <option value="iva_10">10%</option>
              <option value="iva_5">5%</option>
              <option value="exempt">Exento 0%</option>
            </select>
          </label>
          <label className={labelClass}>
            Modo IVA
            <select
              value={form.priceIncludesTax ? 'incluido' : 'declarar'}
              onChange={(e) => applyTaxDefaults({ priceIncludesTax: e.target.value === 'incluido' })}
              className={fieldClass}
            >
              <option value="incluido">IVA incluido</option>
              <option value="declarar">IVA por declarar</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {form.priceIncludesTax
            ? 'IVA incluido: 110.000 → neto 100.000 + IVA 10.000.'
            : 'IVA por declarar: 100.000 + 10% → total 110.000.'}
          {' '}Cotización actual: 1 USD = {Number(form.exchangeRate || 0).toLocaleString('es-PY')} Gs.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <PartyPicker type={isSale ? 'client' : 'supplier'} value={party} onChange={setParty} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ítems</h2>
            <p className="text-[11px] text-slate-500">Cada línea puede ir en Gs o USD, con su IVA y su modo.</p>
          </div>
          <button type="button" onClick={addLine} className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <FaPlus className="mr-2" /> Agregar línea
          </button>
        </div>

        <div className="space-y-2">
          {form.items.map((item, index) => {
            const line = computeLine(item, form.exchangeRate);
            return (
              <div key={item.key} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-12 md:items-end">
                  <div className="col-span-2 md:col-span-4">
                    <span className={labelClass}>Producto</span>
                    <ProductPicker
                      mode={mode}
                      query={item.description}
                      onQueryChange={(value) => updateItem(index, { description: value, productId: null })}
                      onSelect={(product) => selectProduct(index, product)}
                    />
                  </div>
                  <label className={`${labelClass} md:col-span-1`}>
                    Cant.
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className={fieldClass} />
                  </label>
                  <label className={`${labelClass} md:col-span-1`}>
                    Moneda
                    <select
                      value={item.currency}
                      onChange={(e) => updateItem(index, {
                        currency: e.target.value,
                        exchangeRate: e.target.value === 'PYG' ? 1 : form.exchangeRate
                      })}
                      className={fieldClass}
                    >
                      <option value="PYG">Gs</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    Precio {item.currency === 'USD' ? 'USD' : 'Gs'}
                    <input
                      type="number"
                      min="0"
                      step={item.currency === 'USD' ? '0.01' : '1'}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                      className={fieldClass}
                    />
                  </label>
                  <label className={`${labelClass} md:col-span-1`}>
                    IVA
                    <select value={item.taxType} onChange={(e) => updateItem(index, { taxType: e.target.value })} className={fieldClass}>
                      <option value="iva_10">10%</option>
                      <option value="iva_5">5%</option>
                      <option value="exempt">0%</option>
                    </select>
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    Modo IVA
                    <select
                      value={item.priceIncludesTax ? 'incluido' : 'declarar'}
                      onChange={(e) => updateItem(index, { priceIncludesTax: e.target.value === 'incluido' })}
                      className={fieldClass}
                    >
                      <option value="incluido">Incluido</option>
                      <option value="declarar">Por declarar</option>
                    </select>
                  </label>
                  <div className="col-span-2 flex items-center justify-between md:col-span-1 md:justify-end">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      disabled={form.items.length === 1}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                {item.currency === 'USD' && (
                  <label className={`${labelClass} mt-2 block max-w-[180px]`}>
                    TC de la línea
                    <input
                      type="number"
                      min="1"
                      value={item.exchangeRate}
                      onChange={(e) => updateItem(index, { exchangeRate: Number(e.target.value) })}
                      className={fieldClass}
                    />
                  </label>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
                  <span>Neto: <strong>{displayPYGCurrency(line.baseAmount)}</strong></span>
                  <span>IVA: <strong>{displayPYGCurrency(line.taxAmount)}</strong></span>
                  <span>Total Gs: <strong>{displayPYGCurrency(line.totalAmount)}</strong></span>
                  <span>USD: <strong>{formatUsd(form.exchangeRate ? line.totalAmount / form.exchangeRate : 0)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <label className={`${labelClass} rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-2`}>
          Notas
          <textarea
            value={form.notes}
            onChange={(e) => patchForm({ notes: e.target.value })}
            className={`${fieldClass} min-h-[84px]`}
            placeholder="Observaciones internas"
          />
        </label>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Resumen fiscal</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Gravado 10%</dt><dd>{displayPYGCurrency(totals.gravado10)}</dd></div>
            <div className="flex justify-between"><dt>IVA 10%</dt><dd>{displayPYGCurrency(totals.iva10)}</dd></div>
            <div className="flex justify-between"><dt>Gravado 5%</dt><dd>{displayPYGCurrency(totals.gravado5)}</dd></div>
            <div className="flex justify-between"><dt>IVA 5%</dt><dd>{displayPYGCurrency(totals.iva5)}</dd></div>
            <div className="flex justify-between"><dt>Exento</dt><dd>{displayPYGCurrency(totals.exento)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-1"><dt>Subtotal neto</dt><dd>{displayPYGCurrency(totals.subtotal)}</dd></div>
            <div className="flex justify-between font-semibold text-slate-900"><dt>Total Gs</dt><dd>{displayPYGCurrency(totals.totalAmountPYG)}</dd></div>
            <div className="flex justify-between text-[#2A3190]"><dt>Total USD</dt><dd>{formatUsd(totals.totalAmountUSD)}</dd></div>
          </dl>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-slate-200 bg-white px-3 py-2 md:-mx-4 md:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{totals.count} ítem(s) · cotización {Number(form.exchangeRate).toLocaleString('es-PY')}</p>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] uppercase text-slate-400">Total</p>
              <p className="text-lg font-bold text-slate-900">{displayPYGCurrency(totals.totalAmountPYG)}</p>
              <p className="text-xs text-slate-500">{formatUsd(totals.totalAmountUSD)}</p>
            </div>
            <button
              type="submit"
              disabled={saving || loadingMeta}
              className="inline-flex items-center rounded-lg bg-[#2A3190] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <FaSave className="mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default TradeDocumentForm;

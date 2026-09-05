const TAX_RATES = {
  exempt: 0,
  exento: 0,
  iva_5: 5,
  iva_10: 10
};

export function normalizeTaxType(taxType) {
  if (taxType === 'exento' || taxType === 'exempt') return 'exempt';
  if (taxType === 'iva_5' || taxType === 'iva_10') return taxType;
  return 'iva_10';
}

export function toBackendTaxType(taxType, mode) {
  const normalized = normalizeTaxType(taxType);
  if (mode === 'purchase') {
    return normalized === 'exempt' ? 'exento' : normalized;
  }
  return normalized === 'exento' ? 'exempt' : normalized;
}

export function calculateTax(amount, taxType = 'iva_10', priceIncludesTax = true) {
  const numericAmount = Number(amount) || 0;
  const taxRate = TAX_RATES[taxType] !== undefined ? TAX_RATES[taxType] : 10;

  if (taxRate === 0) {
    return {
      baseAmount: numericAmount,
      taxAmount: 0,
      totalAmount: numericAmount,
      taxRate: 0
    };
  }

  if (priceIncludesTax) {
    let taxAmount;
    if (taxRate === 10) {
      taxAmount = Math.round(numericAmount / 11);
    } else if (taxRate === 5) {
      taxAmount = Math.round(numericAmount / 21);
    } else {
      taxAmount = numericAmount - numericAmount / (1 + taxRate / 100);
    }
    const baseAmount = numericAmount - taxAmount;
    return {
      baseAmount: Math.round(baseAmount),
      taxAmount: Math.round(taxAmount),
      totalAmount: numericAmount,
      taxRate
    };
  }

  const taxAmount = numericAmount * (taxRate / 100);
  return {
    baseAmount: numericAmount,
    taxAmount: Math.round(taxAmount),
    totalAmount: Math.round(numericAmount + taxAmount),
    taxRate
  };
}

export function toPyg(amount, currency, exchangeRate) {
  const value = Number(amount) || 0;
  if (!currency || currency === 'PYG') return value;
  return value * (Number(exchangeRate) || 0);
}

export function fromPyg(amount, currency, exchangeRate) {
  const value = Number(amount) || 0;
  if (!currency || currency === 'PYG') return value;
  const rate = Number(exchangeRate) || 0;
  if (rate <= 0) return 0;
  return Math.round((value / rate) * 100) / 100;
}

export function computeLine(item, fallbackRate = 7300) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const exchangeRate = Number(item.exchangeRate || fallbackRate || 1);
  const unitPricePYG = toPyg(unitPrice, item.currency, exchangeRate);
  const lineAmountPYG = quantity * unitPricePYG;
  const tax = calculateTax(
    lineAmountPYG,
    normalizeTaxType(item.taxType),
    item.priceIncludesTax !== false
  );

  return {
    quantity,
    unitPrice,
    unitPricePYG,
    exchangeRate,
    ...tax
  };
}

export function computeDocumentTotals(items = [], fallbackRate = 7300) {
  const totals = {
    count: 0,
    gravado10: 0,
    gravado5: 0,
    exento: 0,
    iva10: 0,
    iva5: 0,
    subtotal: 0,
    taxAmount: 0,
    totalAmountPYG: 0,
    totalAmountUSD: 0
  };

  items.forEach((item) => {
    if (!item?.description?.trim() || !Number(item.quantity) || !Number(item.unitPrice)) return;
    const line = computeLine(item, fallbackRate);
    const type = normalizeTaxType(item.taxType);
    totals.count += 1;
    totals.subtotal += line.baseAmount;
    totals.taxAmount += line.taxAmount;
    totals.totalAmountPYG += line.totalAmount;
    if (type === 'iva_10') {
      totals.gravado10 += line.baseAmount;
      totals.iva10 += line.taxAmount;
    } else if (type === 'iva_5') {
      totals.gravado5 += line.baseAmount;
      totals.iva5 += line.taxAmount;
    } else {
      totals.exento += line.baseAmount;
    }
  });

  const rate = Number(fallbackRate) || 7300;
  totals.totalAmountUSD = rate > 0 ? totals.totalAmountPYG / rate : 0;
  return totals;
}

export function addDays(dateValue, days) {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, (day || 1) + Number(days || 0));
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function todayLocal() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function dueDateFromTerms(dateValue, paymentTerms) {
  const map = {
    efectivo: 0,
    net_15: 15,
    net_30: 30,
    net_60: 60,
    net_90: 90,
    '15_dias': 15,
    '30_dias': 30,
    '60_dias': 60
  };
  return addDays(dateValue, map[paymentTerms] ?? 0);
}

export function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

export function formatAmount(value, currency = 'PYG') {
  if (currency === 'USD') return formatUsd(value);
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0
  }).format(Math.round(Number(value || 0)));
}

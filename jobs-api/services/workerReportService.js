'use strict';

const { fromBackend } = require('../backendLib');

const productModel = fromBackend('models/productModel');
const Category = fromBackend('models/categoryModel');
const { sendSimpleEmail } = fromBackend('services/brevoService');

function labelMap(categories) {
  const cats = new Map();
  const subs = new Map();
  for (const c of categories) {
    cats.set(c.value, c.label || c.name || c.value);
    for (const s of c.subcategories || []) {
      subs.set(s.value, s.label || s.name || s.value);
    }
  }
  return { cats, subs };
}

async function buildTaxonomyBreakdown(persistResults = []) {
  const created = persistResults.filter((r) => r.action === 'created' && r.codigo);
  const updated = persistResults.filter((r) => r.action === 'updated' && r.codigo);
  const errors = persistResults.filter((r) => r.action === 'error');
  const codes = [...new Set([...created, ...updated].map((r) => String(r.codigo)))];

  const products = codes.length
    ? await productModel
        .find({ codigo: { $in: codes } })
        .select('codigo category subcategory')
        .lean()
    : [];
  const byCode = new Map(products.map((p) => [String(p.codigo), p]));
  const categories = await Category.find({}).select('name label value subcategories').lean();
  const { cats, subs } = labelMap(categories);

  const tree = new Map();
  const bump = (codigo, kind) => {
    const p = byCode.get(String(codigo));
    const cv = p?.category || 'sin-categoria';
    const sv = p?.subcategory || 'sin-subcategoria';
    if (!tree.has(cv)) {
      tree.set(cv, {
        value: cv,
        label: cats.get(cv) || cv,
        created: 0,
        updated: 0,
        subcategories: new Map(),
      });
    }
    const cat = tree.get(cv);
    if (!cat.subcategories.has(sv)) {
      cat.subcategories.set(sv, {
        value: sv,
        label: subs.get(sv) || sv,
        created: 0,
        updated: 0,
      });
    }
    cat[kind] += 1;
    cat.subcategories.get(sv)[kind] += 1;
  };

  for (const r of created) bump(r.codigo, 'created');
  for (const r of updated) bump(r.codigo, 'updated');

  const taxonomy = [...tree.values()]
    .map((c) => ({
      ...c,
      subcategories: [...c.subcategories.values()].sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    productsCreated: created.length,
    productsUpdated: updated.length,
    productsErrors: errors.length,
    errorSamples: errors.slice(0, 15).map((e) => ({
      codigo: e.codigo,
      error: e.error,
    })),
    taxonomy,
  };
}

function htmlReport({ ok, label, durationMs, summary, taxonomy, errorMessage, stockCleanupCount }) {
  const mins = durationMs != null ? Math.round(durationMs / 60000) : null;
  const taxRows = (taxonomy || [])
    .map((c) => {
      const subs = (c.subcategories || [])
        .map(
          (s) =>
            `<li>${escapeHtml(s.label)}: <b>${s.updated}</b> actualizados, <b>${s.created}</b> nuevos</li>`
        )
        .join('');
      return `<h3 style="margin:16px 0 6px">${escapeHtml(c.label)} — ${c.updated} actualizados, ${c.created} nuevos</h3><ul>${subs}</ul>`;
    })
    .join('');

  return `
    <div style="font-family:system-ui,sans-serif;max-width:680px">
      <h1 style="font-size:20px">Worker Visão — ${ok ? 'OK' : 'ERROR'}</h1>
      <p>Corrida: <b>${escapeHtml(label || 'daily')}</b>${mins != null ? ` · ~${mins} min` : ''}</p>
      ${
        errorMessage
          ? `<p style="color:#b91c1c"><b>Error:</b> ${escapeHtml(errorMessage)}</p>`
          : ''
      }
      <p>Nuevos: <b>${summary?.productsCreated ?? 0}</b><br/>
         Actualizados: <b>${summary?.productsUpdated ?? 0}</b><br/>
         Errores persistencia: <b>${summary?.productsErrors ?? 0}</b><br/>
         Stock 0 (ausentes): <b>${stockCleanupCount ?? 0}</b></p>
      <h2 style="font-size:16px">Por categoría / subcategoría</h2>
      ${taxRows || '<p>Sin desglose.</p>'}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendWorkerReportEmail(payload) {
  const toEmail = process.env.WORKER_REPORT_EMAIL || 'josiasmachado02002@gmail.com';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@zenn.com.py';
  const senderName = process.env.BREVO_SENDER_NAME || 'Zenn Worker';
  const ok = payload.ok !== false;
  const subject = ok
    ? `[Zenn] Visão OK — ${payload.summary?.productsCreated || 0} nuevos, ${payload.summary?.productsUpdated || 0} actualizados`
    : `[Zenn] Visão ERROR — ${payload.errorMessage || 'falló el worker'}`;

  const result = await sendSimpleEmail({
    to: [{ email: toEmail }],
    sender: { email: senderEmail, name: senderName },
    subject,
    htmlContent: htmlReport(payload),
  });
  if (!result.success) {
    console.error('[jobs-api] email falló:', result.error);
  }
  return result;
}

module.exports = {
  buildTaxonomyBreakdown,
  sendWorkerReportEmail,
};

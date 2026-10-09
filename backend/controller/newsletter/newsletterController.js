'use strict';

const newsletter = require('../../services/newsletterService');

function fail(res, error) {
    const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return res.status(status).json({
        success: false,
        message: error.message || 'No se pudo completar la acción.'
    });
}

async function syncStoreController(req, res) {
    try {
        const data = await newsletter.syncStoreContacts();
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function summaryController(req, res) {
    try {
        const data = await newsletter.getSummary();
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function listContactsController(req, res) {
    try {
        const data = await newsletter.listContacts({
            q: req.query.q,
            filter: req.query.filter,
            page: req.query.page,
            limit: req.query.limit
        });
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function importContactsController(req, res) {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'Subí un Excel o CSV.' });
        }
        const data = await newsletter.importContacts(req.file.buffer);
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function addContactController(req, res) {
    try {
        const data = await newsletter.addContact(req.body?.email);
        return res.json({ success: true, data: { email: data.contact.email, created: data.created } });
    } catch (error) {
        return fail(res, error);
    }
}

async function removeContactController(req, res) {
    try {
        const data = await newsletter.removeContact(req.params.id);
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function generateTemplateController(req, res) {
    try {
        const { template, products } = await newsletter.ensureTemplate(true);
        const summary = await newsletter.getSummary();
        return res.json({
            success: true,
            data: {
                ...summary.template,
                ai: template.ai,
                brevoTemplateId: template.brevoTemplateId,
                products: summary.template?.products || products.map((product) => ({
                    id: product._id,
                    name: product.productName,
                    discountPercent: Math.round(Number(product.discountPercent) || 0)
                }))
            }
        });
    } catch (error) {
        return fail(res, error);
    }
}

async function previewController(req, res) {
    try {
        const html = await newsletter.previewHtml();
        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    } catch (error) {
        return fail(res, error);
    }
}

async function brevoTemplatesController(req, res) {
    try {
        const data = await newsletter.listBrevoTemplates();
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function assignController(req, res) {
    try {
        const data = await newsletter.assignBatch({ reroll: Boolean(req.body?.reroll) });
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function batchController(req, res) {
    try {
        const data = await newsletter.getBatch();
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function sendController(req, res) {
    try {
        const data = await newsletter.sendDaily();
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function testController(req, res) {
    try {
        const data = await newsletter.sendTest(req.body?.email);
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function sendsController(req, res) {
    try {
        const data = await newsletter.listSends({ page: req.query.page });
        return res.json({ success: true, data });
    } catch (error) {
        return fail(res, error);
    }
}

async function unsubscribeController(req, res) {
    const result = await newsletter.unsubscribe(req.params.token);
    const title = result.ok ? 'Listo, no le vamos a escribir más' : 'No encontramos ese enlace';
    const text = result.ok
        ? 'Su correo quedó dado de baja de la lista comercial de Zenn Electrónicos.'
        : 'El enlace de baja no es válido o ya venció.';
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f5fb;color:#111827;"><main style="max-width:520px;margin:12vh auto;padding:28px;background:#fff;border-radius:16px;"><p style="letter-spacing:.12em;font-size:12px;color:#2A3190;font-weight:700;">ZENN ELECTRÓNICOS</p><h1 style="font-size:28px;line-height:1.2;">${title}</h1><p style="font-size:16px;line-height:1.5;color:#4b5563;">${text}</p><p><a href="https://www.zenn.com.py" style="color:#2A3190;font-weight:700;">Volver a la tienda</a></p></main></body></html>`);
}

module.exports = {
    summaryController,
    listContactsController,
    importContactsController,
    addContactController,
    removeContactController,
    generateTemplateController,
    previewController,
    brevoTemplatesController,
    assignController,
    batchController,
    sendController,
    testController,
    sendsController,
    syncStoreController,
    unsubscribeController
};

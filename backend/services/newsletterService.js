'use strict';

const crypto = require('crypto');
const XLSX = require('xlsx');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const NewsletterContact = require('../models/newsletterContactModel');
const NewsletterSend = require('../models/newsletterSendModel');
const NewsletterTemplate = require('../models/newsletterTemplateModel');
const NewsletterDay = require('../models/newsletterDayModel');
const { sendSimpleEmail } = require('./brevoService');
const { buildNewsletterHtml, storeUrl } = require('./newsletterHtml');
const { marketAngle, writeCopy } = require('./newsletterCopy');

const DAILY_LIMIT = 250;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const TEMPLATE_KEY = 'captacion';
const TEMPLATE_NAME = 'Newsletter captación Zenn';

function dateKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Asuncion',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function dateLabel(key) {
    const [year, month, day] = String(key).split('-');
    return `${day}/${month}/${year}`;
}

function httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function extractEmailsFromCell(value) {
    const cleaned = String(value || '')
        .replace(/^\uFEFF/, '')
        .replace(/,/g, ' ');
    const found = cleaned.match(EMAIL_RE) || [];
    return [...new Set(found.map((email) => email.toLowerCase()))];
}

function rememberEmail(email, seen, emails) {
    if (seen.has(email)) return false;
    seen.add(email);
    emails.push(email);
    return true;
}

function rowsOf(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
    const rows = [];
    workbook.SheetNames.forEach((name) => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return;
        const parsed = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        parsed.forEach((row) => rows.push(Array.isArray(row) ? row : [row]));
    });
    return rows;
}

function parseContactFile(buffer) {
    const emails = [];
    const seen = new Set();
    let duplicatesInFile = 0;
    const rows = rowsOf(buffer);
    const take = (list) => {
        list.forEach((email) => {
            if (!rememberEmail(email, seen, emails)) duplicatesInFile += 1;
        });
    };

    const firstColumn = [];
    rows.forEach((row) => {
        firstColumn.push(...extractEmailsFromCell(row[0]));
    });
    if (firstColumn.length) {
        take(firstColumn);
    } else {
        rows.forEach((row) => {
            row.forEach((cell) => take(extractEmailsFromCell(cell)));
        });
    }

    if (!emails.length) {
        take(extractEmailsFromCell(buffer.toString('utf8')));
    }
    if (!emails.length) {
        take(extractEmailsFromCell(buffer.toString('latin1')));
    }

    return { emails, duplicatesInFile, invalidRows: 0, rows: rows.length };
}

async function storeEmails(rawEmails, source) {
    const seen = new Set();
    const emails = [];
    rawEmails.forEach((value) => {
        extractEmailsFromCell(value).forEach((email) => {
            if (seen.has(email)) return;
            seen.add(email);
            emails.push(email);
        });
    });
    let inserted = 0;
    let alreadyStored = 0;
    const chunkSize = 500;
    for (let offset = 0; offset < emails.length; offset += chunkSize) {
        const chunk = emails.slice(offset, offset + chunkSize);
        const operations = chunk.map((email) => ({
            updateOne: {
                filter: { email },
                update: {
                    $setOnInsert: {
                        email,
                        status: 'active',
                        source,
                        unsubscribeToken: crypto.randomBytes(24).toString('hex'),
                        importedAt: new Date(),
                        sendCount: 0
                    }
                },
                upsert: true
            }
        }));
        const result = await NewsletterContact.bulkWrite(operations, { ordered: false });
        inserted += result.upsertedCount || 0;
        alreadyStored += result.matchedCount || 0;
    }
    return { inserted, alreadyStored, read: emails.length };
}

async function importContacts(buffer) {
    const parsed = parseContactFile(buffer);
    if (!parsed.emails.length) {
        throw httpError('No encontré correos en la primera columna. El archivo puede traerlos como ,correo@dominio.com,', 400);
    }
    const stored = await storeEmails(parsed.emails, 'import');
    return {
        ...stored,
        duplicatesInFile: parsed.duplicatesInFile,
        invalidRows: parsed.invalidRows,
        total: await NewsletterContact.countDocuments()
    };
}

async function syncStoreContacts() {
    const Client = require('../models/clientModel');
    const User = require('../models/userModel');
    const Bancard = require('../models/bancardTransactionModel');
    const Sale = require('../models/saleModel');
    const [clientEmails, saleEmails, userEmails, bancardEmails] = await Promise.all([
        Client.distinct('email', { email: { $nin: [null, ''] } }),
        Sale.distinct('clientSnapshot.email', { 'clientSnapshot.email': { $nin: [null, ''] } }),
        User.distinct('email', { role: 'GENERAL', email: { $nin: [null, ''] } }),
        Bancard.distinct('customer_info.email', { status: 'approved', 'customer_info.email': { $nin: [null, ''] } })
    ]);
    const clientes = await storeEmails([...clientEmails, ...saleEmails], 'cliente');
    const registros = await storeEmails(userEmails, 'registro');
    const bancard = await storeEmails(bancardEmails, 'bancard');
    return {
        clientes: clientes.inserted,
        registros: registros.inserted,
        bancard: bancard.inserted,
        alreadyStored: clientes.alreadyStored + registros.alreadyStored + bancard.alreadyStored,
        total: await NewsletterContact.countDocuments()
    };
}

async function addContact(rawEmail) {
    const [email] = extractEmailsFromCell(rawEmail);
    if (!email) throw httpError('Ese correo no es válido.', 400);
    const existing = await NewsletterContact.findOne({ email });
    if (existing) {
        if (existing.status === 'unsubscribed') {
            throw httpError('Ese correo pidió la baja. No se vuelve a activar solo.', 409);
        }
        return { contact: existing, created: false };
    }
    const contact = await NewsletterContact.create({
        email,
        status: 'active',
        source: 'manual',
        unsubscribeToken: crypto.randomBytes(24).toString('hex')
    });
    return { contact, created: true };
}

async function listContacts({ q = '', filter = 'all', page = 1, limit = 40 } = {}) {
    const key = dateKey();
    const query = {};
    if (q) query.email = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (filter === 'unsubscribed') query.status = 'unsubscribed';
    if (filter === 'active') query.status = 'active';

    const sentIds = await NewsletterSend.find({ dateKey: key, status: 'sent' }).distinct('contactId');
    if (filter === 'sent') query._id = { $in: sentIds };
    if (filter === 'pending') {
        query.status = 'active';
        query._id = { $nin: sentIds };
    }
    if (filter === 'never') {
        query.status = 'active';
        query.lastSentAt = null;
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
        NewsletterContact.find(query)
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit)
            .lean(),
        NewsletterContact.countDocuments(query)
    ]);
    const sentSet = new Set(sentIds.map(String));
    return {
        page: safePage,
        limit: safeLimit,
        total,
        items: items.map((item) => ({
            id: item._id,
            email: item.email,
            status: item.status,
            source: item.source,
            lastSentAt: item.lastSentAt,
            sendCount: item.sendCount || 0,
            sentToday: sentSet.has(String(item._id))
        }))
    };
}

async function removeContact(id) {
    const contact = await NewsletterContact.findByIdAndDelete(id);
    if (!contact) throw httpError('Ese correo no está en la lista.', 404);
    return { email: contact.email };
}

async function unsubscribe(token) {
    const contact = await NewsletterContact.findOne({ unsubscribeToken: String(token || '') });
    if (!contact) return { ok: false };
    if (contact.status !== 'unsubscribed') {
        contact.status = 'unsubscribed';
        contact.unsubscribedAt = new Date();
        await contact.save();
    }
    return { ok: true, email: contact.email };
}

async function loadPromoProducts() {
    const products = await Product.aggregate([
        {
            $match: {
                stock: { $gt: 0 },
                sellingPrice: { $gt: 0 },
                price: { $gt: 0 }
            }
        },
        {
            $addFields: {
                discountPercent: {
                    $cond: [
                        { $gt: ['$price', '$sellingPrice'] },
                        { $multiply: [{ $divide: [{ $subtract: ['$price', '$sellingPrice'] }, '$price'] }, 100] },
                        0
                    ]
                }
            }
        },
        { $match: { discountPercent: { $gte: 1 } } },
        { $sort: { discountPercent: -1, stock: -1 } },
        { $limit: 6 },
        {
            $project: {
                productName: 1,
                brandName: 1,
                productImage: { $slice: ['$productImage', 1] },
                price: 1,
                sellingPrice: 1,
                category: 1,
                slug: 1,
                discountPercent: 1
            }
        }
    ]);
    return products;
}

async function loadCategories() {
    return Category.find({ isActive: { $ne: false } })
        .select('label name value order')
        .sort({ order: 1, name: 1 })
        .limit(8)
        .lean();
}

function sender() {
    return {
        email: process.env.BREVO_SENDER_EMAIL || 'hola@zenn.com.py',
        name: process.env.BREVO_SENDER_NAME || 'ZENN ELECTRÓNICOS'
    };
}

async function brevoRequest(method, path, body) {
    const key = process.env.BREVO_API_KEY || '';
    if (!key) throw httpError('Falta BREVO_API_KEY.', 400);
    const response = await fetch(`https://api.brevo.com/v3${path}`, {
        method,
        headers: {
            'api-key': key,
            'content-type': 'application/json',
            accept: 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw httpError(data?.message || `Brevo respondió ${response.status}`, response.status);
    }
    return data;
}

async function listBrevoTemplates() {
    if (!process.env.BREVO_API_KEY) return [];
    try {
        const data = await brevoRequest('GET', '/smtp/templates?limit=50&offset=0&sort=desc');
        return (data.templates || []).map((template) => ({
            id: template.id,
            name: template.name || template.templateName || '',
            subject: template.subject || '',
            active: template.isActive !== false,
            updatedAt: template.modifiedAt || template.createdAt || null,
            url: `https://app.brevo.com/templates/${template.id}/edit`
        }));
    } catch (error) {
        return [];
    }
}

async function syncBrevoTemplate(template, html) {
    if (!process.env.BREVO_API_KEY) return template.brevoTemplateId || null;
    const payload = {
        templateName: TEMPLATE_NAME,
        subject: template.subject,
        htmlContent: html,
        sender: sender(),
        replyTo: process.env.BREVO_REPLY_TO || 'ventas@zenn.com.py',
        isActive: true
    };
    if (template.brevoTemplateId) {
        await brevoRequest('PUT', `/smtp/templates/${template.brevoTemplateId}`, payload);
        return template.brevoTemplateId;
    }
    const created = await brevoRequest('POST', '/smtp/templates', payload);
    return created.id || null;
}

async function ensureTemplate(refreshCopy) {
    let template = await NewsletterTemplate.findOne({ key: TEMPLATE_KEY });
    if (!template) template = new NewsletterTemplate({ key: TEMPLATE_KEY, brevoTemplateName: TEMPLATE_NAME });
    const [products, categories] = await Promise.all([loadPromoProducts(), loadCategories()]);
    const key = dateKey();
    let geminiNote = template.ai?.gemini || '';
    let claudeNote = template.ai?.claude || '';
    if (refreshCopy || !template.subject) {
        const market = await marketAngle(dateLabel(key));
        const written = await writeCopy({
            dateLabel: dateLabel(key),
            angle: market.angle || market.hook,
            products,
            categories
        });
        Object.assign(template, written.copy);
        geminiNote = market.note;
        claudeNote = written.note;
    }
    const html = buildNewsletterHtml({
        copy: template,
        products,
        categories,
        preview: false
    });
    template.html = html;
    template.productIds = products.map((product) => product._id);
    template.ai = { gemini: geminiNote, claude: claudeNote };
    template.generatedAt = new Date();
    try {
        template.brevoTemplateId = await syncBrevoTemplate(template, html);
        template.brevoError = '';
    } catch (error) {
        template.brevoError = error.message;
    }
    await template.save();
    return { template, products, categories };
}

function publicTemplate(template, products) {
    if (!template) return null;
    return {
        subject: template.subject,
        preheader: template.preheader,
        headline: template.headline,
        intro: template.intro,
        generatedAt: template.generatedAt,
        brevoTemplateId: template.brevoTemplateId,
        brevoUrl: template.brevoTemplateId
            ? `https://app.brevo.com/templates/${template.brevoTemplateId}/edit`
            : '',
        ai: template.ai || {},
        brevoError: template.brevoError || '',
        products: (products || []).map((product) => ({
            id: product._id,
            name: product.productName,
            brand: product.brandName || '',
            discountPercent: Math.round(Number(product.discountPercent) || 0),
            price: product.price,
            sellingPrice: product.sellingPrice
        }))
    };
}

async function getSummary() {
    const key = dateKey();
    const [total, active, unsubscribed, neverSent, sentToday, day, template] = await Promise.all([
        NewsletterContact.countDocuments(),
        NewsletterContact.countDocuments({ status: 'active' }),
        NewsletterContact.countDocuments({ status: 'unsubscribed' }),
        NewsletterContact.countDocuments({ status: 'active', lastSentAt: null }),
        NewsletterSend.countDocuments({ dateKey: key, status: 'sent' }),
        NewsletterDay.findOne({ dateKey: key }).lean(),
        NewsletterTemplate.findOne({ key: TEMPLATE_KEY }).lean()
    ]);
    const products = template?.html ? await loadPromoProducts() : [];
    return {
        dateKey: key,
        dailyLimit: DAILY_LIMIT,
        total,
        active,
        unsubscribed,
        neverSent,
        sentToday,
        remainingToday: Math.max(DAILY_LIMIT - sentToday, 0),
        assigned: day?.assigned?.length || 0,
        status: day?.status || 'idle',
        template: publicTemplate(template, products)
    };
}

async function previewHtml() {
    const template = await NewsletterTemplate.findOne({ key: TEMPLATE_KEY });
    if (!template?.subject) {
        const fresh = await ensureTemplate(true);
        return fresh.template.html.replaceAll('{{ params.unsubscribeUrl }}', `${storeUrl()}/promociones`);
    }
    const [products, categories] = await Promise.all([loadPromoProducts(), loadCategories()]);
    return buildNewsletterHtml({ copy: template, products, categories, preview: true });
}

async function clearStaleLock(day) {
    if (!day || day.status !== 'running') return day;
    const age = Date.now() - new Date(day.updatedAt).getTime();
    if (age < 15 * 60 * 1000) return day;
    day.status = 'idle';
    await day.save();
    return day;
}

async function getOrCreateDay(key) {
    let day = await NewsletterDay.findOne({ dateKey: key });
    if (day) return day;
    try {
        return await NewsletterDay.create({ dateKey: key, assigned: [], sentCount: 0, status: 'idle' });
    } catch (error) {
        if (error?.code === 11000) return NewsletterDay.findOne({ dateKey: key });
        throw error;
    }
}

async function pickContacts(count, excludeIds) {
    if (count <= 0) return [];
    const docs = await NewsletterContact.find({
        status: 'active',
        lastSentAt: null,
        _id: { $nin: excludeIds }
    })
        .select('email unsubscribeToken lastSentAt')
        .sort({ createdAt: 1 })
        .limit(Math.max(count * 4, count))
        .lean();
    for (let index = docs.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [docs[index], docs[swap]] = [docs[swap], docs[index]];
    }
    return docs.slice(0, count);
}

async function assignBatch({ reroll = false, ignoreLock = false } = {}) {
    const key = dateKey();
    let day = await getOrCreateDay(key);
    day = await clearStaleLock(day);
    if (!ignoreLock && day.status === 'running') throw httpError('Hay un envío en curso. Esperá a que termine.', 409);
    const sentIds = await NewsletterSend.find({ dateKey: key, status: 'sent' }).distinct('contactId');
    const sentSet = new Set(sentIds.map(String));
    let assigned = [...new Set((day.assigned || []).map((id) => String(id)))];
    const pendingDocs = await NewsletterContact.find({
        _id: { $in: assigned },
        status: 'active',
        lastSentAt: null
    }).select('_id').lean();
    const pendingSet = new Set(pendingDocs.map((doc) => String(doc._id)));
    const keptSent = assigned.filter((id) => sentSet.has(id));
    const keptPending = reroll ? [] : assigned.filter((id) => pendingSet.has(id) && !sentSet.has(id));
    const room = DAILY_LIMIT - keptSent.length - keptPending.length;
    const extra = room > 0 ? await pickContacts(room, [...sentIds, ...keptSent, ...keptPending]) : [];
    day.assigned = [...keptSent, ...keptPending, ...extra.map((contact) => String(contact._id))].slice(0, DAILY_LIMIT);
    day.sentCount = sentIds.length;
    await day.save();
    return batchView(day, sentSet);
}

async function batchView(day, sentSet) {
    const ids = day.assigned || [];
    const contacts = await NewsletterContact.find({ _id: { $in: ids } }).select('email status lastSentAt').lean();
    const byId = new Map(contacts.map((contact) => [String(contact._id), contact]));
    return {
        dateKey: day.dateKey,
        dailyLimit: DAILY_LIMIT,
        sentCount: sentSet.size,
        remainingToday: Math.max(DAILY_LIMIT - sentSet.size, 0),
        items: ids.map((id) => {
            const contact = byId.get(String(id));
            return {
                id,
                email: contact?.email || '',
                status: contact?.status || 'active',
                sentToday: sentSet.has(String(id))
            };
        })
    };
}

async function getBatch() {
    const key = dateKey();
    const day = await NewsletterDay.findOne({ dateKey: key }).lean();
    const sentIds = await NewsletterSend.find({ dateKey: key, status: 'sent' }).distinct('contactId');
    const sentSet = new Set(sentIds.map(String));
    if (!day) {
        return { dateKey: key, dailyLimit: DAILY_LIMIT, sentCount: sentSet.size, remainingToday: DAILY_LIMIT - sentSet.size, items: [] };
    }
    return batchView(day, sentSet);
}

async function acquireLock(key) {
    let day = await getOrCreateDay(key);
    day = await clearStaleLock(day);
    const sentCount = await NewsletterSend.countDocuments({ dateKey: key, status: 'sent' });
    if (sentCount >= DAILY_LIMIT) throw httpError('El cupo de 250 correos de hoy ya se usó.', 409);
    if (day.status === 'running') throw httpError('Hay un envío en curso.', 409);
    const locked = await NewsletterDay.findOneAndUpdate(
        { dateKey: key, status: { $ne: 'running' } },
        { $set: { status: 'running', sentCount } },
        { new: true }
    );
    if (!locked) throw httpError('No se pudo iniciar el envío.', 409);
    return locked;
}

async function releaseLock(key, sentCount) {
    await NewsletterDay.updateOne(
        { dateKey: key },
        { $set: { status: sentCount >= DAILY_LIMIT ? 'done' : 'idle', sentCount } }
    );
}

async function sendVersions(subject, html, versions) {
    const payload = {
        sender: sender(),
        replyTo: { email: process.env.BREVO_REPLY_TO || 'ventas@zenn.com.py', name: 'Zenn Ventas' },
        subject,
        htmlContent: html,
        messageVersions: versions
    };
    return brevoRequest('POST', '/smtp/email', payload);
}

async function sendDaily() {
    const key = dateKey();
    await acquireLock(key);
    try {
        const { template } = await ensureTemplate(false);
        let day = await NewsletterDay.findOne({ dateKey: key });
        const sentIds = await NewsletterSend.find({ dateKey: key, status: 'sent' }).distinct('contactId');
        const sentSet = new Set(sentIds.map(String));
        const room = DAILY_LIMIT - sentSet.size;
        const view = await assignBatch({ reroll: false, ignoreLock: true });
        day = await NewsletterDay.findOne({ dateKey: key });
        const assigned = view.items.filter((item) => !item.sentToday).map((item) => String(item.id));
        const pendingIds = assigned.slice(0, room);
        const contacts = await NewsletterContact.find({
            _id: { $in: pendingIds },
            status: 'active',
            lastSentAt: null
        }).select('email unsubscribeToken').lean();
        const order = new Map(pendingIds.map((id, index) => [id, index]));
        contacts.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
        if (!contacts.length) {
            throw httpError('No quedan correos sin enviar. Los que ya recibieron uno no vuelven a entrar.', 400);
        }

        let sent = 0;
        let failed = 0;
        const chunkSize = 50;
        for (let offset = 0; offset < contacts.length; offset += chunkSize) {
            const chunk = contacts.slice(offset, offset + chunkSize);
            const versions = chunk.map((contact) => ({
                to: [{ email: contact.email }],
                params: {
                    unsubscribeUrl: `${storeUrl()}/api/newsletter/baja/${contact.unsubscribeToken}`
                }
            }));
            try {
                const result = await sendVersions(template.subject, template.html, versions);
                const messageId = result.messageId || result.messageIds?.[0] || '';
                await NewsletterSend.insertMany(chunk.map((contact) => ({
                    contactId: contact._id,
                    email: contact.email,
                    dateKey: key,
                    status: 'sent',
                    brevoMessageId: messageId
                })), { ordered: false });
                await NewsletterContact.updateMany(
                    { _id: { $in: chunk.map((contact) => contact._id) } },
                    { $set: { lastSentAt: new Date() }, $inc: { sendCount: 1 } }
                );
                sent += chunk.length;
            } catch (error) {
                failed += chunk.length;
                await NewsletterSend.insertMany(chunk.map((contact) => ({
                    contactId: contact._id,
                    email: contact.email,
                    dateKey: key,
                    status: 'failed',
                    error: error.message || 'Brevo rechazó el lote'
                })), { ordered: false }).catch(() => {});
            }
        }
        const sentToday = await NewsletterSend.countDocuments({ dateKey: key, status: 'sent' });
        if (day) {
            day.sentCount = sentToday;
            await day.save();
        }
        await releaseLock(key, sentToday);
        return {
            dateKey: key,
            sent,
            failed,
            sentToday,
            remainingToday: Math.max(DAILY_LIMIT - sentToday, 0),
            brevoTemplateId: template.brevoTemplateId
        };
    } catch (error) {
        const sentToday = await NewsletterSend.countDocuments({ dateKey: key, status: 'sent' });
        await releaseLock(key, sentToday);
        throw error;
    }
}

async function sendTest(rawEmail) {
    const [email] = extractEmailsFromCell(rawEmail);
    if (!email) throw httpError('Indicá un correo para la prueba.', 400);
    const { template } = await ensureTemplate(false);
    const html = template.html.replaceAll(
        '{{ params.unsubscribeUrl }}',
        `${storeUrl()}/promociones`
    );
    const result = await sendSimpleEmail({
        to: [{ email }],
        sender: sender(),
        replyTo: { email: process.env.BREVO_REPLY_TO || 'ventas@zenn.com.py', name: 'Zenn Ventas' },
        subject: `[Prueba] ${template.subject}`,
        htmlContent: html
    });
    if (!result.success) throw httpError(result.error || 'Brevo no envió la prueba.', 502);
    return { email, messageId: result.messageId || '' };
}

async function listSends({ page = 1 } = {}) {
    const key = dateKey();
    const safePage = Math.max(Number(page) || 1, 1);
    const limit = 50;
    const [items, total] = await Promise.all([
        NewsletterSend.find({ dateKey: key }).sort({ createdAt: -1 }).skip((safePage - 1) * limit).limit(limit).lean(),
        NewsletterSend.countDocuments({ dateKey: key })
    ]);
    return {
        dateKey: key,
        total,
        items: items.map((item) => ({
            id: item._id,
            email: item.email,
            status: item.status,
            error: item.error || '',
            at: item.createdAt
        }))
    };
}

async function asuncionClock(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Asuncion',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
    return { hour: read('hour'), minute: read('minute') };
}

async function markAutoSent(key) {
    await NewsletterDay.updateOne({ dateKey: key }, { $set: { autoSentAt: new Date() } });
}

async function runScheduledSend() {
    const clock = await asuncionClock();
    if (clock.hour < 22) return { skipped: true, reason: 'antes de las 22:00' };
    const key = dateKey();
    const day = await getOrCreateDay(key);
    if (day.autoSentAt) return { skipped: true, reason: 'ya corrió hoy' };
    if ((day.sentCount || 0) >= DAILY_LIMIT) {
        await markAutoSent(key);
        return { skipped: true, reason: 'cupo de hoy completo' };
    }
    await syncStoreContacts();
    try {
        const data = await sendDaily();
        if ((data.sent || 0) === 0 && (data.failed || 0) > 0) {
            return { skipped: false, retry: true, data };
        }
        await markAutoSent(key);
        return { skipped: false, data };
    } catch (error) {
        const message = error.message || '';
        if (error.statusCode === 409 && /curso/i.test(message)) {
            return { skipped: true, reason: message };
        }
        if (error.statusCode === 400 || error.statusCode === 409) {
            await markAutoSent(key);
            return { skipped: true, reason: message };
        }
        throw error;
    }
}

module.exports = {
    DAILY_LIMIT,
    parseContactFile,
    importContacts,
    addContact,
    listContacts,
    removeContact,
    unsubscribe,
    getSummary,
    ensureTemplate,
    previewHtml,
    assignBatch,
    getBatch,
    sendDaily,
    runScheduledSend,
    syncStoreContacts,
    sendTest,
    listSends,
    listBrevoTemplates,
    dateKey
};

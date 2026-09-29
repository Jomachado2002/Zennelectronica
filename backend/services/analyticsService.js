const crypto = require('crypto');
const BehaviorEvent = require('../models/behaviorEvent');
const VisitorProfile = require('../models/visitorProfile');
const ProductDailyStat = require('../models/productDailyStat');
const SearchDailyStat = require('../models/searchDailyStat');
const Product = require('../models/productModel');

const ALLOWED_TYPES = new Set(['page_view', 'product_view', 'search', 'add_to_cart', 'cart_sync', 'email_capture']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECENT_LIMIT = 20;
const CART_LIMIT = 15;

function asuncionDay(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Asuncion',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function startOfAsuncionDay(day) {
    return new Date(`${day}T03:00:00.000Z`);
}

function cleanText(value, max) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanProduct(raw) {
    const id = String(raw?.productId || raw?._id || '');
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    return {
        productId: id,
        name: cleanText(raw.name || raw.productName, 180),
        category: cleanText(raw.category, 120),
        brand: cleanText(raw.brand || raw.brandName, 120),
        price: Number(raw.price || raw.sellingPrice || 0) || 0,
        quantity: Math.min(99, Math.max(1, parseInt(raw.quantity, 10) || 1))
    };
}

function normalizeEvent(raw, visitorId) {
    const type = String(raw?.type || '');
    if (!ALLOWED_TYPES.has(type)) return null;
    const product = cleanProduct(raw);
    return {
        visitorId,
        type,
        productId: product?.productId,
        productName: product?.name || '',
        category: product?.category || cleanText(raw.category, 120),
        brand: product?.brand || '',
        searchQuery: cleanText(raw.searchQuery || raw.query, 120).toLowerCase(),
        durationMs: Math.min(30 * 60 * 1000, Math.max(0, parseInt(raw.durationMs, 10) || 0)),
        path: cleanText(raw.path, 300),
        product,
        items: Array.isArray(raw.items) ? raw.items.map(cleanProduct).filter(Boolean).slice(0, CART_LIMIT) : []
    };
}

async function touchProfile(visitorId, events, ip) {
    const now = new Date();
    let profile = await VisitorProfile.findOne({ visitorId });
    if (!profile) {
        profile = new VisitorProfile({ visitorId, firstSeenAt: now, lastSeenAt: now });
    }
    profile.lastSeenAt = now;
    if (ip) profile.lastIp = ip;

    const recent = Array.isArray(profile.recentProducts) ? [...profile.recentProducts] : [];
    for (const event of events) {
        if (!event.product || (event.type !== 'product_view' && event.type !== 'add_to_cart')) continue;
        const idx = recent.findIndex((item) => String(item.productId) === event.product.productId);
        const entry = {
            productId: event.product.productId,
            name: event.product.name,
            category: event.product.category,
            brand: event.product.brand,
            price: event.product.price,
            action: event.type,
            durationMs: Math.max(event.durationMs, idx >= 0 ? recent[idx].durationMs || 0 : 0),
            at: now
        };
        if (idx >= 0) recent.splice(idx, 1);
        recent.unshift(entry);
    }
    profile.recentProducts = recent.slice(0, RECENT_LIMIT);

    const cartSync = [...events].reverse().find((event) => event.type === 'cart_sync');
    if (cartSync) {
        const fingerprint = cartSync.items
            .map((item) => `${item.productId}:${item.quantity || 1}`)
            .sort()
            .join(',')
            .slice(0, 400);
        profile.cartItems = cartSync.items.map((item) => ({ ...item, at: profile.cartUpdatedAt || now }));
        if (fingerprint !== (profile.cartFingerprint || '')) {
            profile.cartFingerprint = fingerprint;
            profile.cartEmailCount = 0;
            profile.lastCartEmailAt = undefined;
            profile.cartUpdatedAt = now;
            profile.cartItems = cartSync.items.map((item) => ({ ...item, at: now }));
        }
        if ((profile.cartItems || []).length && !profile.cartRestoreToken) {
            profile.cartRestoreToken = crypto.randomBytes(18).toString('hex');
        }
    }

    const viewKey = [...new Set((profile.recentProducts || []).map((item) => String(item.productId || '')).filter(Boolean))]
        .sort()
        .join(',')
        .slice(0, 400);
    if (!(profile.cartItems || []).length && viewKey && viewKey !== (profile.suggestionFingerprint || '')) {
        profile.suggestionFingerprint = viewKey;
        profile.suggestionAnchorAt = now;
        profile.suggestionEmailCount = 0;
        profile.lastSuggestionEmailAt = undefined;
    }

    await profile.save();
    return profile;
}

async function bumpDailyStats(events) {
    const day = asuncionDay();
    const products = new Map();
    const searches = new Map();

    for (const event of events) {
        if (event.searchQuery && event.type === 'search') {
            searches.set(event.searchQuery, (searches.get(event.searchQuery) || 0) + 1);
        }
        if (!event.productId) continue;
        const current = products.get(event.productId) || {
            name: event.productName,
            category: event.category,
            views: 0,
            clicks: 0,
            addToCarts: 0,
            dwellMs: 0
        };
        if (event.type === 'product_view') {
            current.views += 1;
            current.dwellMs += event.durationMs;
        }
        if (event.type === 'add_to_cart') current.addToCarts += 1;
        if (event.productName) current.name = event.productName;
        if (event.category) current.category = event.category;
        products.set(event.productId, current);
    }

    if (products.size) {
        await ProductDailyStat.bulkWrite([...products.entries()].map(([productId, stat]) => ({
            updateOne: {
                filter: { day, productId },
                update: {
                    $inc: {
                        views: stat.views,
                        clicks: stat.clicks,
                        addToCarts: stat.addToCarts,
                        dwellMs: stat.dwellMs
                    },
                    $set: { name: stat.name, category: stat.category }
                },
                upsert: true
            }
        })), { ordered: false });
    }

    if (searches.size) {
        await SearchDailyStat.bulkWrite([...searches.entries()].map(([query, count]) => ({
            updateOne: {
                filter: { day, query },
                update: { $inc: { count } },
                upsert: true
            }
        })), { ordered: false });
    }
}

async function recordEvents(visitorId, rawEvents, ip = '') {
    const id = cleanText(visitorId, 80);
    if (!id || id.length < 8) {
        return { accepted: 0 };
    }
    const events = (Array.isArray(rawEvents) ? rawEvents : [])
        .slice(0, 25)
        .map((event) => normalizeEvent(event, id))
        .filter(Boolean);
    if (!events.length) return { accepted: 0 };

    await BehaviorEvent.insertMany(events.map((event) => ({
        visitorId: event.visitorId,
        type: event.type,
        productId: event.productId,
        productName: event.productName,
        category: event.category,
        brand: event.brand,
        searchQuery: event.searchQuery,
        durationMs: event.durationMs,
        path: event.path,
        ip: cleanText(ip, 64)
    })), { ordered: false });

    await touchProfile(id, events, cleanText(ip, 64));
    await bumpDailyStats(events);
    return { accepted: events.length };
}

async function captureEmail({ visitorId, email, source }) {
    const id = cleanText(visitorId, 80);
    const normalized = cleanText(email, 180).toLowerCase();
    if (!id || !EMAIL_RE.test(normalized)) {
        return { success: false, error: 'Correo no válido' };
    }
    const now = new Date();
    await VisitorProfile.findOneAndUpdate(
        { visitorId: id },
        {
            $set: {
                email: normalized,
                emailSource: cleanText(source, 40) || 'modal',
                emailCapturedAt: now,
                lastSeenAt: now
            },
            $setOnInsert: { visitorId: id, firstSeenAt: now }
        },
        { upsert: true, new: true }
    );
    await BehaviorEvent.create({
        visitorId: id,
        type: 'email_capture',
        path: cleanText(source, 40)
    });
    return { success: true };
}

async function emailAlreadyCaptured(visitorId) {
    const id = cleanText(visitorId, 80);
    if (!id) return false;
    const profile = await VisitorProfile.findOne({
        visitorId: id,
        email: { $nin: ['', null] }
    }).select('_id').lean();
    return Boolean(profile);
}

function intentOf(profile) {
    const cartCount = profile.cartItems?.length || 0;
    const longest = (profile.recentProducts || []).reduce((max, item) => Math.max(max, item.durationMs || 0), 0);
    if (cartCount > 0) return 'Agregó al carrito';
    if (longest >= 60000) return 'Miró más de 1 minuto';
    if ((profile.recentProducts || []).length > 0) return 'Recorrió productos';
    return 'Entró';
}

async function adminOverview() {
    const day = asuncionDay();
    const start = startOfAsuncionDay(day);
    const [visitorCount, intentCount, visitors, topProducts, topSearches, emailsToday, viewsToday, cartsToday, openCarts] = await Promise.all([
        VisitorProfile.countDocuments({ lastSeenAt: { $gte: start } }),
        VisitorProfile.countDocuments({
            lastSeenAt: { $gte: start },
            $or: [
                { 'cartItems.0': { $exists: true } },
                { recentProducts: { $elemMatch: { durationMs: { $gte: 60000 } } } }
            ]
        }),
        VisitorProfile.find({ lastSeenAt: { $gte: start } }).sort({ lastSeenAt: -1 }).limit(150).lean(),
        ProductDailyStat.find({ day }).sort({ views: -1, addToCarts: -1 }).limit(20).lean(),
        SearchDailyStat.find({ day }).sort({ count: -1 }).limit(12).lean(),
        VisitorProfile.countDocuments({ emailCapturedAt: { $gte: start }, email: { $ne: '' } }),
        ProductDailyStat.aggregate([
            { $match: { day } },
            { $group: { _id: null, views: { $sum: '$views' }, carts: { $sum: '$addToCarts' } } }
        ]),
        VisitorProfile.countDocuments({ lastSeenAt: { $gte: start }, 'cartItems.0': { $exists: true } }),
        VisitorProfile.find({
            email: { $nin: ['', null] },
            'cartItems.0': { $exists: true }
        }).sort({ cartUpdatedAt: -1 }).limit(80).select('email emailSource cartItems cartUpdatedAt cartEmailCount lastCartEmailAt').lean()
    ]);

    const totals = viewsToday[0] || { views: 0, carts: 0 };
    return {
        day,
        totals: {
            visitors: visitorCount,
            productViews: totals.views || 0,
            addToCarts: totals.carts || 0,
            emails: emailsToday,
            withCart: cartsToday,
            intent: intentCount
        },
        visitors: visitors.map((profile) => ({
            visitorId: profile.visitorId,
            email: profile.email || '',
            lastSeenAt: profile.lastSeenAt,
            emailSource: profile.emailSource || '',
            intent: intentOf(profile),
            products: (profile.recentProducts || []).slice(0, 5).map((item) => ({
                name: item.name,
                category: item.category,
                durationMs: item.durationMs || 0,
                action: item.action
            })),
            cart: (profile.cartItems || []).map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }))
        })),
        topProducts,
        topSearches,
        carts: openCarts.map((profile) => ({
            email: profile.email,
            source: profile.emailSource || '',
            updatedAt: profile.cartUpdatedAt,
            reminders: profile.cartEmailCount || 0,
            lastEmailAt: profile.lastCartEmailAt || null,
            items: (profile.cartItems || []).map((item) => ({
                name: item.name,
                quantity: item.quantity || 1,
                price: item.price || 0
            }))
        }))
    };
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicProduct(product) {
    return {
        _id: product._id,
        productName: product.productName,
        productImage: product.productImage || [],
        sellingPrice: product.sellingPrice,
        price: product.price,
        category: product.category,
        subcategory: product.subcategory || '',
        codigo: product.codigo || '',
        brandName: product.brandName,
        slug: product.slug || ''
    };
}

function median(values) {
    const nums = values.filter((value) => value > 0).sort((a, b) => a - b);
    if (!nums.length) return 0;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

function topBrand(brands) {
    let name = '';
    let best = 0;
    brands.forEach((score, brand) => {
        if (score > best) {
            best = score;
            name = brand;
        }
    });
    return name;
}

const SIMILAR_FIELDS = 'productName productImage sellingPrice price category subcategory codigo brandName slug';
const similarCache = new Map();

function readSimilarCache(key) {
    const hit = similarCache.get(key);
    if (!hit || Date.now() - hit.at > 45 * 1000) return null;
    return hit.value;
}

function writeSimilarCache(key, value) {
    if (similarCache.size > 80) similarCache.clear();
    similarCache.set(key, { at: Date.now(), value });
}

async function similarFromCartIds(cartIds) {
    const ids = [...new Set(cartIds.map((value) => String(value || '').trim()))]
        .filter((value) => /^[a-f\d]{24}$/i.test(value))
        .slice(0, 8);
    if (!ids.length) return [];
    const cacheKey = ids.join(',');
    const cached = readSimilarCache(cacheKey);
    if (cached) return cached;

    const seeds = await Product.find({ _id: { $in: ids } })
        .select('category subcategory brandName sellingPrice')
        .lean();
    const byId = new Map(seeds.map((product) => [String(product._id), product]));
    const focus = byId.get(ids[0]) || seeds[0];
    if (!focus) return [];

    const brand = String(focus.brandName || '').toLowerCase();
    const price = Number(focus.sellingPrice) || 0;
    const base = {
        stock: { $gt: 0 },
        _id: { $nin: ids }
    };
    if (focus.category) base.category = focus.category;
    if (focus.subcategory) base.subcategory = focus.subcategory;
    else if (!focus.category) return [];

    const near = price > 0
        ? { ...base, sellingPrice: { $gte: Math.round(price * 0.55), $lte: Math.round(price * 1.7) } }
        : base;
    let rows = await Product.find(near).select(SIMILAR_FIELDS).limit(24).lean();
    if (rows.length < 8) {
        const extra = await Product.find(base).select(SIMILAR_FIELDS).limit(24).lean();
        const seen = new Set(rows.map((product) => String(product._id)));
        extra.forEach((product) => {
            if (!seen.has(String(product._id))) rows.push(product);
        });
    }

    rows.sort((a, b) => {
        const brandA = brand && String(a.brandName || '').toLowerCase() === brand ? 0 : 1;
        const brandB = brand && String(b.brandName || '').toLowerCase() === brand ? 0 : 1;
        if (brandA !== brandB) return brandA - brandB;
        if (!price) return 0;
        return Math.abs((a.sellingPrice || 0) - price) - Math.abs((b.sellingPrice || 0) - price);
    });
    const picked = rows.slice(0, 10).map(publicProduct);
    writeSimilarCache(cacheKey, picked);
    return picked;
}

async function suggestionsForVisitor(visitorId, ip = '', cartIds = []) {
    const id = cleanText(visitorId, 80);
    const cleanIp = cleanText(ip, 64);
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const match = [];
    if (id) match.push({ visitorId: id });
    if (cleanIp) match.push({ ip: cleanIp });

    const liveCartIds = [...new Set(
        (Array.isArray(cartIds) ? cartIds : [])
            .map((value) => String(value || '').trim())
            .filter((value) => /^[a-f\d]{24}$/i.test(value))
    )].slice(0, 15);
    if (liveCartIds.length) return similarFromCartIds(liveCartIds);
    if (!match.length) return [];

    const [events, profile] = await Promise.all([
        BehaviorEvent.find({
            createdAt: { $gte: since },
            type: { $in: ['product_view', 'add_to_cart', 'search'] },
            $or: match
        }).select('type productId searchQuery').sort({ createdAt: -1 }).limit(400).lean(),
        id ? VisitorProfile.findOne({ visitorId: id }).select('cartItems').lean() : null
    ]);

    const cartIdList = liveCartIds.length
        ? liveCartIds
        : (profile?.cartItems || []).map((item) => String(item.productId || '')).filter((value) => /^[a-f\d]{24}$/i.test(value));
    const seenIds = [...new Set([
        ...cartIdList,
        ...events.map((event) => String(event.productId || '')).filter((value) => /^[a-f\d]{24}$/i.test(value))
    ])].slice(0, 40);

    const known = seenIds.length
        ? await Product.find({ _id: { $in: seenIds } }).select('category subcategory brandName sellingPrice').lean()
        : [];
    const knownById = new Map(known.map((product) => [String(product._id), product]));

    const interests = new Map();
    const note = (subcategory, category, points, price, brand) => {
        const key = cleanText(subcategory, 120) || cleanText(category, 120);
        if (!key || points <= 0) return;
        const row = interests.get(key) || {
            subcategory: cleanText(subcategory, 120),
            category: cleanText(category, 120),
            score: 0,
            prices: [],
            brands: new Map()
        };
        row.score += points;
        if (price > 0) row.prices.push(price);
        const brandName = cleanText(brand, 120);
        if (brandName) row.brands.set(brandName, (row.brands.get(brandName) || 0) + points);
        interests.set(key, row);
    };

    const fromProduct = (product, points) => {
        if (!product) return;
        note(product.subcategory, product.category, points, product.sellingPrice, product.brandName);
    };

    events.forEach((event) => {
        if (event.type === 'product_view') fromProduct(knownById.get(String(event.productId)), 1);
        if (event.type === 'add_to_cart') fromProduct(knownById.get(String(event.productId)), 4);
    });
    cartIdList.forEach((productId) => fromProduct(knownById.get(productId), 5));

    const searches = new Map();
    events.forEach((event) => {
        const query = cleanText(event.searchQuery, 80).toLowerCase();
        if (event.type === 'search' && query.length >= 2) searches.set(query, (searches.get(query) || 0) + 1);
    });
    const topSearches = [...searches.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    for (const [query, count] of topSearches) {
        const hits = await Product.find({
            stock: { $gt: 0 },
            $or: [
                { productName: new RegExp(escapeRegex(query), 'i') },
                { brandName: new RegExp(escapeRegex(query), 'i') }
            ]
        }).select('category subcategory brandName sellingPrice').limit(24).lean();
        const groups = new Map();
        hits.forEach((product) => {
            const key = product.subcategory || product.category;
            if (!key) return;
            const group = groups.get(key) || { product, prices: [], n: 0 };
            group.n += 1;
            if (product.sellingPrice > 0) group.prices.push(product.sellingPrice);
            groups.set(key, group);
        });
        const ranked = [...groups.values()].sort((a, b) => b.n - a.n);
        if (ranked[0]) {
            note(ranked[0].product.subcategory, ranked[0].product.category, count * 3, median(ranked[0].prices), '');
        }
        if (ranked[1] && ranked[1].n >= ranked[0].n * 0.4) {
            note(ranked[1].product.subcategory, ranked[1].product.category, count, median(ranked[1].prices), '');
        }
    }

    const buckets = [...interests.values()].sort((a, b) => b.score - a.score).slice(0, 4);
    if (!buckets.length) return [];

    const scoreSum = buckets.reduce((sum, bucket) => sum + bucket.score, 0) || 1;
    let room = 10;
    const plan = buckets.map((bucket) => {
        const slots = Math.min(room, Math.max(1, Math.round((bucket.score / scoreSum) * 10)));
        room -= slots;
        return { bucket, slots };
    }).filter((item) => item.slots > 0);
    if (room > 0 && plan[0]) plan[0].slots += room;

    const fields = SIMILAR_FIELDS;
    const blocked = new Set(cartIdList);
    const picked = [];

    for (const item of plan) {
        if (picked.length >= 10) break;
        const bucket = item.bucket;
        const filter = bucket.subcategory ? { subcategory: bucket.subcategory } : { category: bucket.category };
        const rows = await Product.find({
            ...filter,
            stock: { $gt: 0 },
            _id: { $nin: [...blocked] }
        }).select(fields).limit(40).lean();
        const ref = median(bucket.prices);
        const brand = topBrand(bucket.brands).toLowerCase();
        rows.sort((a, b) => {
            const brandA = brand && String(a.brandName || '').toLowerCase() === brand ? 0 : 1;
            const brandB = brand && String(b.brandName || '').toLowerCase() === brand ? 0 : 1;
            if (brandA !== brandB) return brandA - brandB;
            if (!ref) return 0;
            return Math.abs((a.sellingPrice || 0) - ref) - Math.abs((b.sellingPrice || 0) - ref);
        });
        rows.slice(0, item.slots).forEach((product) => {
            const key = String(product._id);
            if (blocked.has(key) || picked.length >= 10) return;
            blocked.add(key);
            picked.push(publicProduct(product));
        });
    }

    return picked.slice(0, 10);
}

async function homeRowForVisitor(visitorId, ip = '') {
    const id = cleanText(visitorId, 80);
    const cleanIp = cleanText(ip, 64);
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const match = [];
    if (id) match.push({ visitorId: id });
    if (cleanIp) match.push({ ip: cleanIp });
    if (!match.length) return [];

    const views = await BehaviorEvent.find({
        createdAt: { $gte: since },
        type: 'product_view',
        productId: { $exists: true, $ne: null },
        $or: match
    }).select('productId').sort({ createdAt: -1 }).limit(80).lean();

    const ordered = [];
    const seen = new Set();
    views.forEach((event) => {
        const key = String(event.productId || '');
        if (!/^[a-f\d]{24}$/i.test(key) || seen.has(key)) return;
        seen.add(key);
        ordered.push(key);
    });
    if (!ordered.length) return [];

    const docs = await Product.find({
        _id: { $in: ordered.slice(0, 12) },
        stock: { $gt: 0 }
    }).select('productName productImage sellingPrice price category subcategory codigo brandName slug').lean();
    const byId = new Map(docs.map((product) => [String(product._id), product]));
    const viewed = ordered.map((key) => byId.get(key)).filter(Boolean).slice(0, 6).map(publicProduct);
    if (!viewed.length) return [];

    const similar = await suggestionsForVisitor(visitorId, ip, viewed.map((product) => String(product._id)));
    const viewedIds = new Set(viewed.map((product) => String(product._id)));
    const rest = similar.filter((product) => !viewedIds.has(String(product._id)));
    return [...viewed, ...rest].slice(0, 12);
}

async function ensureCartRestoreToken(profile) {
    if (!profile) return '';
    if (profile.cartRestoreToken) return profile.cartRestoreToken;
    profile.cartRestoreToken = crypto.randomBytes(18).toString('hex');
    await profile.save();
    return profile.cartRestoreToken;
}

async function cartRestorePayload(token) {
    const key = String(token || '').trim().toLowerCase();
    if (!/^[a-f0-9]{24,64}$/.test(key)) return null;
    const profile = await VisitorProfile.findOne({ cartRestoreToken: key }).select('cartItems').lean();
    if (!profile) return null;

    const rows = (profile.cartItems || []).slice(0, CART_LIMIT);
    const ids = rows
        .map((item) => String(item.productId || ''))
        .filter((id) => /^[a-f\d]{24}$/i.test(id));
    if (!ids.length) return [];

    const docs = await Product.find({ _id: { $in: ids } })
        .select('productName productImage sellingPrice price category subcategory codigo brandName slug')
        .lean();
    const byId = new Map(docs.map((product) => [String(product._id), product]));
    const placeholder = 'https://www.zenn.com.py/logozenn.png';

    return rows.map((item) => {
        const product = byId.get(String(item.productId));
        if (!product) return null;
        const pub = publicProduct(product);
        if (!Array.isArray(pub.productImage) || !pub.productImage.filter(Boolean).length) {
            pub.productImage = [placeholder];
        }
        return {
            _id: `mail-${pub._id}`,
            productId: pub,
            quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
            addedAt: new Date().toISOString()
        };
    }).filter(Boolean);
}

async function productCartPayload(productId) {
    const id = String(productId || '').trim();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const product = await Product.findOne({ _id: id, stock: { $gt: 0 } }).select(SIMILAR_FIELDS).lean();
    if (!product) return [];
    const pub = publicProduct(product);
    if (!Array.isArray(pub.productImage) || !pub.productImage.filter(Boolean).length) {
        pub.productImage = ['https://www.zenn.com.py/logozenn.png'];
    }
    return [{
        _id: `mail-${pub._id}`,
        productId: pub,
        quantity: 1,
        addedAt: new Date().toISOString()
    }];
}

async function preferredCategoryForVisitor(visitorId, ip = '') {
    const id = cleanText(visitorId, 80);
    const cleanIp = cleanText(ip, 64);
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const match = [];
    if (id) match.push({ visitorId: id });
    else if (cleanIp) match.push({ ip: cleanIp });
    if (!match.length) return '';

    const views = await BehaviorEvent.find({
        createdAt: { $gte: since },
        type: 'product_view',
        productId: { $exists: true, $ne: null },
        $or: match
    }).select('productId createdAt').sort({ createdAt: -1 }).limit(200).lean();
    if (!views.length) return '';

    const ids = [...new Set(views.map((event) => String(event.productId || '')))]
        .filter((value) => /^[a-f\d]{24}$/i.test(value))
        .slice(0, 40);
    const docs = await Product.find({ _id: { $in: ids } }).select('category subcategory').lean();
    const byId = new Map(docs.map((product) => [String(product._id), product]));
    const buckets = new Map();

    views.forEach((event) => {
        const product = byId.get(String(event.productId));
        if (!product?.category) return;
        const key = product.subcategory || product.category;
        const row = buckets.get(key) || { category: product.category, score: 0, latest: 0 };
        row.score += 1;
        row.latest = Math.max(row.latest, new Date(event.createdAt).getTime() || 0);
        buckets.set(key, row);
    });

    const winner = [...buckets.values()].sort((a, b) => b.score - a.score || b.latest - a.latest)[0];
    return winner?.category || '';
}

module.exports = {
    asuncionDay,
    recordEvents,
    captureEmail,
    emailAlreadyCaptured,
    adminOverview,
    suggestionsForVisitor,
    homeRowForVisitor,
    preferredCategoryForVisitor,
    ensureCartRestoreToken,
    cartRestorePayload,
    productCartPayload,
    similarFromCartIds,
    intentOf
};

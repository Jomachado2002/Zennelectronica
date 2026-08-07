'use strict';

const HomeSection = require('../../models/homeSectionModel');
const {
    listAllHomeSections,
    ensureHomeSectionsSeeded,
    normalizeSection
} = require('../../services/homeSectionService');
const { invalidateHomePayloadCache } = require('../../services/homePayloadCache');

function sanitizePairs(pairs) {
    if (!Array.isArray(pairs)) return [];
    return pairs
        .map((p) => ({
            category: String(p.category || '').trim(),
            subcategory: String(p.subcategory || '').trim()
        }))
        .filter((p) => p.category && p.subcategory);
}

function sanitizePayload(body = {}) {
    const pairs = sanitizePairs(body.pairs);
    const first = pairs[0];
    const verMasCat = String(body.verMas?.category || first?.category || '').trim();
    const verMasSub = String(body.verMas?.subcategory || first?.subcategory || '').trim();

    const filters = body.filters || {};
    const brandNames = Array.isArray(filters.brandNames)
        ? filters.brandNames.map((b) => String(b).trim()).filter(Boolean)
        : String(filters.brandNames || '')
              .split(',')
              .map((b) => b.trim())
              .filter(Boolean);

    const rawSpecs =
        filters.specifications && typeof filters.specifications === 'object'
            ? filters.specifications
            : {};
    const specifications = {};
    for (const [key, values] of Object.entries(rawSpecs)) {
        if (!key) continue;
        const arr = Array.isArray(values)
            ? values.map((v) => String(v).trim()).filter(Boolean)
            : [];
        if (arr.length) specifications[key] = arr;
    }

    const layout = ['hero', 'full', 'grid'].includes(body.layout) ? body.layout : 'grid';
    // Pool fijo para el carrusel (UI: 5 móvil / 10 desktop). No se edita en admin.
    const limit = Math.min(48, Math.max(1, Number(body.limit) || (layout === 'grid' ? 12 : 20)));

    const payload = {
        title: String(body.title || '').trim(),
        subtitle: String(body.subtitle || '').trim(),
        layout,
        enabled: body.enabled !== false && body.enabled !== 'false',
        order: Number.isFinite(Number(body.order)) ? Number(body.order) : 100,
        limit,
        pairs,
        verMas: {
            category: verMasCat,
            subcategory: verMasSub
        },
        filters: {
            brandNames,
            specifications,
            priceMin:
                filters.priceMin === null || filters.priceMin === '' || filters.priceMin === undefined
                    ? null
                    : Number(filters.priceMin),
            priceMax:
                filters.priceMax === null || filters.priceMax === '' || filters.priceMax === undefined
                    ? null
                    : Number(filters.priceMax),
            minStock: Math.max(0, Number(filters.minStock ?? 1) || 0)
        }
    };

    if (body.key !== undefined) {
        payload.key = String(body.key || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');
    }

    return payload;
}

const listHomeSectionsController = async (req, res) => {
    try {
        const sections = await listAllHomeSections();
        res.json({
            message: 'Secciones del home obtenidas',
            success: true,
            error: false,
            data: sections
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            success: false,
            error: true
        });
    }
};

const getHomeSectionController = async (req, res) => {
    try {
        const section = await HomeSection.findById(req.params.id);
        if (!section) {
            return res.status(404).json({
                message: 'Sección no encontrada',
                success: false,
                error: true
            });
        }
        res.json({
            message: 'OK',
            success: true,
            error: false,
            data: normalizeSection(section)
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            success: false,
            error: true
        });
    }
};

const createHomeSectionController = async (req, res) => {
    try {
        const payload = sanitizePayload(req.body);
        if (!payload.key) {
            return res.status(400).json({
                message: 'La clave (key) es obligatoria',
                success: false,
                error: true
            });
        }
        if (!payload.title) {
            return res.status(400).json({
                message: 'El título es obligatorio',
                success: false,
                error: true
            });
        }
        if (!payload.pairs.length) {
            return res.status(400).json({
                message: 'Agregá al menos un par categoría/subcategoría',
                success: false,
                error: true
            });
        }

        const created = await HomeSection.create(payload);
        invalidateHomePayloadCache();
        res.status(201).json({
            message: 'Sección creada',
            success: true,
            error: false,
            data: normalizeSection(created)
        });
    } catch (err) {
        const message =
            err.code === 11000 ? 'Ya existe una sección con esa clave (key)' : err.message || err;
        res.status(400).json({ message, success: false, error: true });
    }
};

const updateHomeSectionController = async (req, res) => {
    try {
        const payload = sanitizePayload(req.body);
        delete payload.key; // key inmutable

        if (!payload.title) {
            return res.status(400).json({
                message: 'El título es obligatorio',
                success: false,
                error: true
            });
        }
        if (!payload.pairs.length) {
            return res.status(400).json({
                message: 'Agregá al menos un par categoría/subcategoría',
                success: false,
                error: true
            });
        }

        const updated = await HomeSection.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true
        });
        if (!updated) {
            return res.status(404).json({
                message: 'Sección no encontrada',
                success: false,
                error: true
            });
        }
        invalidateHomePayloadCache();
        res.json({
            message: 'Sección actualizada',
            success: true,
            error: false,
            data: normalizeSection(updated)
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            success: false,
            error: true
        });
    }
};

const deleteHomeSectionController = async (req, res) => {
    try {
        const deleted = await HomeSection.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                message: 'Sección no encontrada',
                success: false,
                error: true
            });
        }
        invalidateHomePayloadCache();
        res.json({
            message: 'Sección eliminada',
            success: true,
            error: false,
            data: { id: req.params.id }
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            success: false,
            error: true
        });
    }
};

const reorderHomeSectionsController = async (req, res) => {
    try {
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!items.length) {
            return res.status(400).json({
                message: 'Enviá items: [{ id, order }]',
                success: false,
                error: true
            });
        }
        await Promise.all(
            items.map((item) =>
                HomeSection.findByIdAndUpdate(item.id, {
                    order: Number(item.order) || 0
                })
            )
        );
        const sections = await listAllHomeSections();
        invalidateHomePayloadCache();
        res.json({
            message: 'Orden actualizado',
            success: true,
            error: false,
            data: sections
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            success: false,
            error: true
        });
    }
};

const seedHomeSectionsController = async (req, res) => {
    try {
        const force = req.body?.force === true;
        if (force) {
            await HomeSection.deleteMany({});
        }
        const result = await ensureHomeSectionsSeeded();
        const sections = await listAllHomeSections();
        invalidateHomePayloadCache();
        res.json({
            message: result.seeded
                ? 'Secciones sembradas desde defaults'
                : force
                  ? 'Re-sembradas'
                  : 'Ya existían secciones (sin cambios)',
            success: true,
            error: false,
            data: { ...result, sections }
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            success: false,
            error: true
        });
    }
};

module.exports = {
    listHomeSectionsController,
    getHomeSectionController,
    createHomeSectionController,
    updateHomeSectionController,
    deleteHomeSectionController,
    reorderHomeSectionsController,
    seedHomeSectionsController
};

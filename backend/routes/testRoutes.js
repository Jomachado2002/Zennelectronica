// Rutas temporarias de prueba (scraper, etc.)

const express = require('express');
const router = express.Router();
const {
    visionVipScraperTest,
    visionVipSyncQuickTest,
    visionVipMirrorQuickTest
} = require('../controller/scraper/visionVipTestController');

router.get('/ping', (_req, res) => {
    res.json({
        ok: true,
        service: 'test-routes',
        hintVisaovipPreview:
            'Mirror Visão espejo: /visaovip-catalog?persist=1&mirrorSync=1&full=1 (cleanup SKU ausentes ON por defecto; mirrorStrict=OFF con mirrorStrict=false). Legado: /visaovip-sync. Respuesta incluye timing.wallClockMs y logs [Visão API][mirror]. Sync automático al levantar backend: VISAO_MIRROR_SCHEDULE_ENABLED=1 en .env.'
    });
});

/**
 * GET /api/test-routes/visaovip-catalog
 * Query (opcional): maxCategories, maxProductDetails, full=1, urlsPerCategoryCap
 */
router.get('/visaovip-catalog', visionVipScraperTest);

/**
 * GET /api/test-routes/visaovip-sync
 * Legado scrape: persistencia corta por defecto. cleanup sólo si cleanupMissingStock=1.
 */
router.get('/visaovip-sync', visionVipSyncQuickTest);

/**
 * GET /api/test-routes/visaovip-mirror-quick
 * Espejo Visão (menú + categorías Mongo) con tope pequeño (validación).
 */
router.get('/visaovip-mirror-quick', visionVipMirrorQuickTest);

module.exports = router;

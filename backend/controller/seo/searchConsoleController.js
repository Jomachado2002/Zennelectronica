'use strict';

const client = require('../../services/searchConsoleClient');
const insights = require('../../services/searchConsoleInsights');

const cache = new Map();
const CACHE_MS = 4 * 60 * 60 * 1000;

function emptySummary() {
  return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

function summaryFromRows(rows) {
  const row = insights.normalizeRow(rows?.[0] || {});
  if (!rows?.length) return emptySummary();
  return {
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position
  };
}

function mapKeyed(rows, labeler) {
  return (rows || []).map((raw) => {
    const row = insights.normalizeRow(raw);
    const key = row.keys[0] || '';
    return {
      key,
      label: labeler ? labeler(key) : key,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    };
  });
}

async function estadoController(req, res) {
  try {
    const status = client.configStatus();
    if (!status.configured) {
      return res.json({
        success: true,
        data: { ...status, sites: [], siteAccess: false }
      });
    }

    const sites = await client.listSites();
    return res.json({
      success: true,
      data: {
        ...status,
        sites,
        siteAccess: sites.some((site) => client.sameSite(site.siteUrl, status.siteUrl))
      }
    });
  } catch (error) {
    const status = client.configStatus();
    return res.status(error.response?.status === 401 ? 401 : 200).json({
      success: false,
      message: client.explainError(error),
      data: { ...status, sites: [], siteAccess: false }
    });
  }
}

async function informeController(req, res) {
  try {
    const status = client.configStatus();
    if (!status.configured) {
      return res.json({
        success: true,
        data: { configured: false, steps: status.steps, siteUrl: status.siteUrl }
      });
    }

    const range = client.dateRange(req.query.days);
    const searchType = ['web', 'image', 'video'].includes(req.query.type) ? req.query.type : 'web';
    const cacheKey = `${status.siteUrl}:${searchType}:${range.days}`;
    const cached = cache.get(cacheKey);
    if (req.query.refresh !== '1' && cached && Date.now() - cached.at < CACHE_MS) {
      return res.json({ success: true, data: { ...cached.data, cached: true } });
    }

    const property = status.siteUrl;
    const base = {
      type: searchType,
      dataState: 'all',
      aggregationType: 'auto'
    };

    const [currentRows, previousRows, byDate, queries, pages, devices, countries, queryPages, sitemaps] = await Promise.all([
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate }),
      client.searchAnalytics(property, { ...base, startDate: range.previousStart, endDate: range.previousEnd }),
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate, dimensions: ['date'], rowLimit: 100 }),
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate, dimensions: ['query'], rowLimit: 250 }),
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate, dimensions: ['page'], rowLimit: 100 }),
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate, dimensions: ['device'], rowLimit: 10 }),
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate, dimensions: ['country'], rowLimit: 12 }),
      client.searchAnalytics(property, { ...base, startDate: range.startDate, endDate: range.endDate, dimensions: ['query', 'page'], rowLimit: 200 }),
      client.listSitemaps(property).catch(() => [])
    ]);

    const summary = summaryFromRows(currentRows);
    const previous = summaryFromRows(previousRows);
    const opportunities = insights.buildOpportunities({ queries, pages, queryPages, sitemaps });

    const data = {
      configured: true,
      cached: false,
      fetchedAt: new Date().toISOString(),
      siteUrl: property,
      searchType,
      range: { startDate: range.startDate, endDate: range.endDate, days: range.days },
      previousRange: { startDate: range.previousStart, endDate: range.previousEnd },
      summary,
      previous,
      reading: insights.buildReading(summary, previous, range.days),
      byDate: mapKeyed(byDate),
      queries: mapKeyed(queries),
      pages: mapKeyed(pages).map((row) => ({ ...row, label: insights.shortUrl(row.key) })),
      devices: mapKeyed(devices, insights.labelDevice),
      countries: mapKeyed(countries, insights.labelCountry),
      sitemaps,
      opportunities
    };

    cache.set(cacheKey, { at: Date.now(), data });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: client.explainError(error),
      error: true
    });
  }
}

module.exports = {
  estadoController,
  informeController
};

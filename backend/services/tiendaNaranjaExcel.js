'use strict';

/**
 * Facade: la descarga admin ahora rellena la plantilla oficial de TN.
 * Scripts viejos que usaban rowOf/workbookOf siguen pudiendo importar helpers básicos.
 */
const fill = require('./tiendaNaranjaPlantillaFill');
const { tnDisplayPrices, tnListPrice, tnStockQty, visaoGs, TN_MARKUP } = require('./tiendaNaranjaPricing');
const { shortDescriptionOf } = require('./tiendaNaranjaCatalog');

module.exports = {
  ...fill,
  tnDisplayPrices,
  tnListPrice,
  tnStockQty,
  shortDescriptionOf,
  visaoGs,
  TN_MARKUP,
  // Compat mínima para scripts legacy
  rowOf: async () => {
    throw new Error('rowOf legacy fue reemplazado por fillOfficialPlantilla (plantilla oficial TN)');
  },
  workbookOf: async () => {
    throw new Error('workbookOf legacy fue reemplazado por fillOfficialPlantilla (plantilla oficial TN)');
  }
};

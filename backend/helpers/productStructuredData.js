'use strict';

const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.zenn.com.py').replace(/\/$/, '');

function isMongoObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ''));
}

function humanizeTaxonomy(value) {
  if (!value) return '';
  return String(value)
    .replace(/__[\d_]+$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function offerShippingAndReturns(pageUrl) {
  const validFrom = new Date().toISOString().slice(0, 10);
  return {
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: '30000',
        currency: 'PYG'
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'PY'
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 1,
          unitCode: 'DAY'
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 4,
          unitCode: 'DAY'
        }
      }
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'PY',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnMethod: 'https://schema.org/ReturnInStore',
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      merchantReturnLink: `${SITE}/devoluciones`
    },
    validFrom
  };
}

module.exports = {
  SITE,
  isMongoObjectId,
  humanizeTaxonomy,
  offerShippingAndReturns
};

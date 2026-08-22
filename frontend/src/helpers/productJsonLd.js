import { SITE_ORIGIN, siteUrl } from '../config/siteUrl';

function humanizeTaxonomy(value) {
  if (!value) return '';
  return String(value)
    .replace(/__[\d_]+$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max).trim() : s;
}

function oneYearFromNow() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildProductJsonLd({
  name,
  images,
  description,
  sku,
  brandName,
  category,
  subcategory,
  pageUrl,
  price,
  inStock,
  extraProperties = []
}) {
  const schemaName = clip(name, 150);
  const schemaBrand = clip(brandName, 70) || 'Zenn';
  const schemaDesc = clip(description, 5000);
  const categoryLabel = humanizeTaxonomy(subcategory || category);
  const validFrom = new Date().toISOString().slice(0, 10);

  const json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: schemaName,
    image: images,
    description: schemaDesc,
    brand: { '@type': 'Brand', name: schemaBrand },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'PYG',
      price: Number(price) || 0,
      priceValidUntil: oneYearFromNow(),
      validFrom,
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Zenn' },
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
        merchantReturnLink: `${SITE_ORIGIN}/devoluciones`
      }
    }
  };

  if (sku) {
    json.sku = String(sku);
    json.mpn = String(sku);
  }
  if (categoryLabel) json.category = categoryLabel;
  if (extraProperties.length) json.additionalProperty = extraProperties;

  return json;
}

export { siteUrl };

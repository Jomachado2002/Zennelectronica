import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Search,
  Shield,
  Store,
  Wallet,
  XCircle
} from 'lucide-react';
import { SITE_ORIGIN, siteUrl } from '../config/siteUrl';

const PAGE_PATH = '/devoluciones';
const PAGE_URL = siteUrl(PAGE_PATH);
const LAST_UPDATED = '18 de agosto de 2026';

const WARRANTY_ROWS = [
  { product: 'Adsl / Wireless / Print Server', brand: 'Todos', period: '3 meses de asistencia técnica' },
  { product: 'Presentador láser', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Aire acondicionado', brand: 'Todos', period: '6 meses de asistencia técnica' },
  { product: 'Caja de sonido', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Captura de video', brand: 'Todos', period: '2 meses' },
  { product: 'Cargador de batería portátil', brand: 'Todos', period: '2 meses de asistencia técnica' },
  { product: 'Cargador de batería portátil', brand: 'Adata', period: '1 año' },
  { product: 'Chromecast', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Desktop', brand: 'Todos', period: '3 meses de asistencia técnica' },
  { product: 'Estabilizador', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Fuente de gabinete', brand: 'Mtek / Satellite', period: '3 meses de asistencia técnica' },
  { product: 'Fuente de gabinete', brand: 'Otros', period: '1 mes de asistencia técnica' },
  { product: 'Fuente de gabinete', brand: 'Adata', period: '1 año' },
  { product: 'Fuente universal de notebook', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Grabador CD / DVD / Blu-Ray', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'HD 3,5"', brand: 'Otros', period: '6 meses' },
  { product: 'HD 3,5"', brand: 'Seagate / WD', period: '9 meses' },
  { product: 'HD externo', brand: 'Adata', period: '1 año' },
  { product: 'HD externo', brand: 'Todos', period: '3 meses' },
  { product: 'HD notebook', brand: 'Todos', period: '6 meses' },
  { product: 'HUB', brand: 'Todos', period: '3 meses de asistencia técnica' },
  { product: 'Lavadora de alta presión', brand: 'Todas', period: '6 meses de asistencia técnica' },
  { product: 'Lector biométrico', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Lector de código de barras', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Lector de tarjeta de memoria', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Memoria RAM PC / Notebook', brand: 'Adata / Macrovip / Kingston', period: '1 año' },
  { product: 'Memoria RAM PC / Notebook', brand: 'Todos', period: '6 meses' },
  { product: 'Mesa digital', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Monitor / TV', brand: 'Mtek / AOC / Etech / Hyundai / Hye', period: '3 meses de asistencia técnica' },
  { product: 'Mouse', brand: 'Todos', period: '2 meses de asistencia técnica' },
  { product: 'Mouse', brand: 'Adata', period: '1 año' },
  { product: 'Nobreak', brand: 'Todos', period: '2 meses de asistencia técnica' },
  { product: 'Notebook', brand: 'Adata', period: '1 año' },
  { product: 'Notebook', brand: 'Otras', period: '3 meses de asistencia técnica' },
  { product: 'NUC', brand: 'Todos', period: '3 meses de asistencia técnica' },
  { product: 'Placa de red', brand: 'Todos', period: '3 meses' },
  { product: 'Placa de sonido', brand: 'Todos', period: '3 meses' },
  { product: 'Placa de video', brand: 'Afox', period: '3 meses (placa usada para minería no tiene garantía)' },
  { product: 'Placa de video', brand: 'Otras', period: '6 meses (placa usada para minería no tiene garantía)' },
  { product: 'Placa madre', brand: 'Macrovip', period: '1 año' },
  { product: 'Placa madre', brand: 'Duex', period: '1 año' },
  { product: 'Placa madre', brand: 'Afox', period: '3 meses' },
  { product: 'Placa madre', brand: 'Otras', period: '6 meses' },
  { product: 'Procesador box', brand: 'Con caja', period: '9 meses' },
  { product: 'Proyector', brand: 'ViewSonic', period: '6 meses (lámpara sin garantía)' },
  { product: 'Proyector', brand: 'Otros', period: '1 mes de asistencia técnica (lámpara sin garantía)' },
  { product: 'Receptor', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Servidor', brand: 'Todos', period: '3 meses de asistencia técnica' },
  { product: 'SSD', brand: 'Adata / Macrovip / Kingston', period: '1 año' },
  { product: 'SSD', brand: 'Otros', period: '3 meses' },
  { product: 'Tablet', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Teclado', brand: 'Todos', period: '2 meses de asistencia técnica' },
  { product: 'Teclado', brand: 'Adata', period: '1 año' },
  { product: 'Todos los productos', brand: 'Corsair', period: '1 año' },
  { product: 'Water cooler', brand: 'Todos', period: '1 mes de asistencia técnica' },
  { product: 'Webcam', brand: 'Todos', period: '1 mes de asistencia técnica' }
];

const NAV_ITEMS = [
  { href: '#devoluciones', label: 'Devoluciones' },
  { href: '#como-devolver', label: 'Cómo devolver' },
  { href: '#garantia', label: 'Tabla de garantías' },
  { href: '#terminos', label: 'Términos' },
  { href: '#pedido', label: 'Pedido de garantía' },
  { href: '#procedimientos', label: 'Procedimientos' },
  { href: '#no-cubre', label: 'No cubre' },
  { href: '#faq', label: 'Preguntas frecuentes' }
];

const FAQ_ITEMS = [
  {
    q: '¿Cuántos días tengo para devolver un producto?',
    a: 'Tenés 7 días corridos desde la fecha de compra (fecha de la factura). Pasado ese plazo no se aceptan devoluciones por arrepentimiento o cambio de opinión; sí puede corresponder garantía según la tabla de plazos de cada producto.'
  },
  {
    q: '¿Me devuelven el dinero?',
    a: 'No. Zenn no realiza devolución de dinero. El valor de la devolución se acredita como crédito interno para la compra de otro producto, calculado al coste del día.'
  },
  {
    q: '¿Puedo devolver un producto sellado si ya lo abrí?',
    a: 'No. Los productos sellados de fábrica no se devuelven si están abiertos. Tampoco se aceptan devoluciones de accesorios.'
  },
  {
    q: '¿En qué estado debe estar el producto para devolverlo?',
    a: 'Debe estar en perfectas condiciones, con su caja o envoltorio original, todos los accesorios, cables, manuales y sin uso aparente, suciedad, rayones ni caja aplastada, tal como se retiró de la tienda.'
  },
  {
    q: '¿Dónde se entrega el producto para devolverlo o reclamar garantía?',
    a: 'En el local de Zenn: Gaudioso Nuñez casi Celsa Speratti, Asunción, Paraguay. Debés presentar la factura de compra. El retiro del producto reparado o evaluado lo realiza el mismo cliente en ese local, dentro del horario de atención.'
  },
  {
    q: '¿Quién paga el envío de la devolución?',
    a: 'La devolución se realiza de forma presencial en nuestro local. Si el producto fue enviado al interior del país, el costo de envío de retorno hasta Asunción corre por cuenta del cliente.'
  },
  {
    q: 'Compré online. ¿Igual aplica la política?',
    a: 'Sí. El plazo de 7 días se cuenta desde la fecha de la factura. El producto debe presentarse en el local de Zenn con factura, caja, accesorios y en las mismas condiciones en las que se entregó.'
  },
  {
    q: '¿Hay costo de reposición o restocking?',
    a: 'No cobramos un cargo fijo de restocking. El crédito se otorga al coste del día. Si el producto presenta suciedad, rayas o caja aplastada, no entra como devolución ni como cambio por garantía: se trata como asistencia técnica.'
  },
  {
    q: '¿La garantía cubre software o daños después de la entrega?',
    a: 'No. En ningún caso podrán reclamarse defectos por fallas producidas por el software, ni por el hardware, posteriormente a ser recibidos. La garantía cubre únicamente defectos de fábrica.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: 'Política de Devoluciones y Garantía | Zenn',
      description:
        'Política de devoluciones de Zenn Paraguay: 7 días para devolver, crédito en tienda, sin reembolso en efectivo. Consultá también la tabla de garantías por producto y marca.',
      inLanguage: 'es-PY',
      dateModified: '2026-08-18',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@id': `${SITE_ORIGIN}/#organization` },
      mainEntity: { '@id': `${PAGE_URL}#return-policy` }
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: 'Zenn',
      inLanguage: 'es-PY'
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Zenn',
      url: SITE_ORIGIN,
      telephone: '+595973345284',
      email: 'ventas@zenn.com.py',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Gaudioso Nuñez casi Celsa Speratti',
        addressLocality: 'Asunción',
        addressCountry: 'PY'
      }
    },
    {
      '@type': 'MerchantReturnPolicy',
      '@id': `${PAGE_URL}#return-policy`,
      name: 'Política de Devoluciones de Zenn',
      applicableCountry: 'PY',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnMethod: 'https://schema.org/ReturnInStore',
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      refundType: 'https://schema.org/StoreCreditRefund',
      merchantReturnLink: PAGE_URL,
      itemCondition: 'https://schema.org/NewCondition',
      returnPolicyCountry: { '@type': 'Country', name: 'Paraguay' }
    }
  ]
};

function SectionTitle({ id, eyebrow, title, icon: Icon }) {
  return (
    <div id={id} className="scroll-mt-28 mb-6">
      {eyebrow && (
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-[#7B2CBF] mb-1">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
        {Icon && (
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
          >
            <Icon className="w-5 h-5" />
          </span>
        )}
        {title}
      </h2>
    </div>
  );
}

const Devoluciones = () => {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(0);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WARRANTY_ROWS;
    return WARRANTY_ROWS.filter(
      (row) =>
        row.product.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q) ||
        row.period.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    const hash = location.hash;
    const path = location.pathname.replace(/\/$/, '');
    const target = hash || (path === '/garantia' ? '#garantia' : '');
    if (target) {
      const timer = setTimeout(() => {
        document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [location.hash, location.pathname]);

  return (
    <>
      <Helmet>
        <title>Política de Devoluciones y Garantía | Zenn Paraguay</title>
        <meta
          name="description"
          content="Devolvé en Zenn hasta 7 días después de la compra. Sin reembolso en efectivo: el valor se usa como crédito para otro producto. Consultá plazos de garantía por categoría y marca."
        />
        <meta
          name="keywords"
          content="devoluciones Zenn, política de devoluciones, garantía Zenn, Paraguay, Merchant Center, asistencia técnica"
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="Política de Devoluciones y Garantía | Zenn" />
        <meta
          property="og:description"
          content="7 días para devolver, crédito en tienda y tabla de garantías por producto. Política oficial de Zenn Paraguay."
        />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Zenn" />
        <meta property="og:locale" content="es_PY" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 font-inter text-gray-800">
        <header
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
        >
          <div className="container mx-auto px-4 py-10 sm:py-14">
            <p className="text-white/80 text-sm font-medium mb-2">Zenn · Paraguay</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl">
              Política de Devoluciones y Garantía
            </h1>
            <p className="mt-4 text-white/90 max-w-2xl text-base sm:text-lg">
              Consultá las condiciones para devolver un producto y los plazos de garantía de
              cada categoría. Esta página es la política oficial de Zenn para compras en
              www.zenn.com.py y en nuestro local de Asunción.
            </p>
            <p className="mt-3 text-sm text-white/70">Última actualización: {LAST_UPDATED}</p>
          </div>
        </header>

        <div className="container mx-auto px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Clock, title: '7 días', text: 'Plazo para devolver desde la fecha de factura' },
              { icon: Wallet, title: 'Crédito en tienda', text: 'No devolvemos dinero en efectivo' },
              { icon: Store, title: 'En el local', text: 'Devolución presencial en Asunción' },
              { icon: Shield, title: 'Garantía de fábrica', text: 'Plazos según producto y marca' }
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex gap-3">
                <span
                  className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
                >
                  <item.icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-bold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 mt-8">
          <div className="container mx-auto px-4 overflow-x-auto">
            <ul className="flex gap-1 py-2 min-w-max">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-block px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2CBF] rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-10 sm:py-14 max-w-5xl space-y-14">
          <section>
            <SectionTitle
              id="devoluciones"
              eyebrow="Merchant Center · Google Shopping"
              title="Política de devoluciones"
              icon={RotateCcw}
            />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-5 text-gray-700 leading-relaxed">
              <p>
                Zenn acepta la <strong>devolución</strong> de productos comprados en nuestra tienda
                online o en el local físico cuando se cumplen <strong>todas</strong> las condiciones
                siguientes:
              </p>
              <ul className="space-y-3">
                {[
                  'La fecha de compra no supera los 7 días corridos desde la emisión de la factura.',
                  'Se presenta la factura de compra original.',
                  'La mercadería se encuentra en perfectas condiciones, con su caja o envoltorio original y con todos los accesorios, cables, CDs, manuales e instalación, de la misma manera en la que fue retirada o entregada.',
                  'Los productos sellados de fábrica no se devolverán si están abiertos.',
                  'No aceptamos devolución de accesorios.',
                  'No hacemos devolución de dinero. El valor de la devolución debe utilizarse para la compra de otro producto en Zenn (crédito interno).',
                  'El producto se devolverá con el coste del día.'
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00B5D8] shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4">
                  <p className="font-semibold text-gray-900 mb-1">País y cobertura</p>
                  <p className="text-sm">
                    Política aplicable a compras en Paraguay (PY), tanto online en{' '}
                    <a href={SITE_ORIGIN} className="text-[#7B2CBF] underline">
                      www.zenn.com.py
                    </a>{' '}
                    como en el local de Asunción.
                  </p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
                  <p className="font-semibold text-gray-900 mb-1">Tipo de reembolso</p>
                  <p className="text-sm">
                    Crédito para comprar otro producto. No hay reembolso en efectivo, transferencia
                    ni reversión de tarjeta por devolución voluntaria.
                  </p>
                </div>
                <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4">
                  <p className="font-semibold text-gray-900 mb-1">Costo de envío de retorno</p>
                  <p className="text-sm">
                    A cargo del cliente. La recepción se hace en nuestro local. Si el pedido fue
                    enviado al interior, el flete de vuelta hasta Asunción lo paga el comprador.
                  </p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
                  <p className="font-semibold text-gray-900 mb-1">Cargo de restocking</p>
                  <p className="text-sm">
                    No hay cargo fijo de reposición. El crédito se calcula al coste del día. Productos
                    sucios, rayados o con caja aplastada no califican como devolución.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle id="como-devolver" title="Cómo solicitar una devolución" icon={Package} />
            <ol className="space-y-4">
              {[
                {
                  n: '1',
                  t: 'Verificá el plazo y el estado',
                  d: 'Confirmá que no pasaron 7 días desde la factura y que el producto está completo, sin uso, con caja y accesorios originales. Si está abierto el sello de fábrica, no se acepta devolución.'
                },
                {
                  n: '2',
                  t: 'Contactanos',
                  d: 'Escribinos por WhatsApp al +595 973 345284 o a ventas@zenn.com.py indicando número de factura, producto y motivo. Así coordinamos el ingreso en el local.'
                },
                {
                  n: '3',
                  t: 'Presentá el producto en Zenn',
                  d: 'Llevalo a Gaudioso Nuñez casi Celsa Speratti, Asunción, con la factura. Horario: lunes a viernes de 08:00 a 17:00 hs y sábados de 08:30 a 11:00 hs.'
                },
                {
                  n: '4',
                  t: 'Inspección y crédito',
                  d: 'Verificamos el estado. Si corresponde, emitimos un crédito al coste del día para que lo uses en la compra de otro producto. No se entrega efectivo.'
                }
              ].map((step) => (
                <li key={step.n} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                  <span
                    className="h-10 w-10 rounded-full text-white font-bold flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-bold text-gray-900">{step.t}</h3>
                    <p className="text-gray-600 mt-1">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-gray-900">Condiciones generales de reclamo</h2>
            <p>
              En ningún caso podrán ser reclamados defectos por fallas producidas por el software,
              así como el hardware de los productos posteriormente a ser recibidos.
            </p>
            <p>
              En todos los casos, los bienes objeto de reclamo deberán pasar por el proceso de
              revisión técnica y pruebas del equipo por un máximo de <strong>30 días</strong>, de
              forma a descartar daños o defectos de funcionamiento producidos a partir de la
              entrega. La reparación o alteración está sujeta a los resultados obtenidos en ese
              plazo.
            </p>
            <p>
              En ningún caso se podrán tramitar reclamaciones de garantía sin someter el producto a
              la inspección técnica indicada. No se aceptarán solicitudes de cambio o devolución de
              productos dañados por un uso incorrecto.
            </p>
            <p>
              La duración de la garantía es conforme a la tabla que se establece a continuación, a
              partir de la fecha de compra del producto adquirido por el cliente.
            </p>
            <p>
              Si se descubre que el producto está fuera del período de garantía, si está roto, con
              defectos relacionados con la pantalla o funciones táctiles, cortocircuito y otros que
              denoten la naturaleza de no ser fallas de software o hardware de fábrica, se evaluará
              y se preparará un presupuesto de costo que incluya los accesorios a reemplazar y la
              mano de obra técnica, a consideración del cliente. Puede retirar el producto en el
              estado en que se encuentra o, previa autorización y cancelación de gastos, se
              procederá a la reparación.
            </p>
            <p>
              Si el producto no está en condiciones de ser reparado y está fuera del período de
              garantía, será devuelto al cliente en ese estado, con la posibilidad de retirarlo en
              un plazo máximo de <strong>90 días</strong> en las instalaciones de Zenn, luego de lo
              cual será eliminado, sin posibilidad de reclamación alguna por parte del cliente.
            </p>
          </section>

          <section>
            <SectionTitle
              id="garantia"
              eyebrow="Plazos por categoría y marca"
              title="Tabla de garantías"
              icon={Shield}
            />
            <p className="text-gray-600 mb-4">
              Los plazos corren desde la fecha de emisión de la factura. Cuando una marca tiene un
              plazo específico, ese plazo prevalece sobre “Todos / Otras”.
            </p>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto o marca (notebook, SSD, Adata…)"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B5D8]/40"
              />
            </div>

            <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
                >
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Producto</th>
                    <th className="text-left font-semibold px-4 py-3">Marca</th>
                    <th className="text-left font-semibold px-4 py-3">Plazo de garantía</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={`${row.product}-${row.brand}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.product}</td>
                      <td className="px-4 py-3 text-gray-700">{row.brand}</td>
                      <td className="px-4 py-3 text-gray-700">{row.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {filteredRows.map((row) => (
                <article key={`${row.product}-${row.brand}`} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900">{row.product}</h3>
                  <p className="text-sm text-gray-500 mt-1">Marca: {row.brand}</p>
                  <p className="text-sm text-[#7B2CBF] font-medium mt-2">{row.period}</p>
                </article>
              ))}
            </div>

            {filteredRows.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay coincidencias para esa búsqueda.</p>
            )}
          </section>

          <section>
            <SectionTitle id="terminos" title="Términos de garantía" icon={FileText} />
            <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
              {[
                'La garantía cubre solamente problemas por defectos de fábrica.',
                'Cuando se viola la etiqueta o el sello de seguridad, la garantía se anula automáticamente.',
                'La garantía no cubre daños accidentales causados por el usuario, caídas, deterioro por agua o un golpe, problemas de la placa con un sistema modificado, instalación incorrecta o uso de software no recomendado o autorizado, o que haya sido manipulado (desmontado) por un tercero.',
                'Zenn no se responsabiliza por daños o pérdidas de datos almacenados en los productos.',
                'El cliente deberá evaluar el estado de la mercancía en el momento de la entrega. No se aceptan reclamaciones posteriores por daños visibles no informados al recibir.',
                'La garantía no cubre el artículo si el transformador, la fuente de alimentación o el cargador están quemados.'
              ].map((text) => (
                <li key={text} className="px-5 py-4 text-gray-700 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle id="pedido" title="Pedido de garantía" icon={MapPin} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4 text-gray-700 leading-relaxed">
              <p>
                La garantía comienza a correr a partir de la fecha de emisión de la factura. Para
                utilizarla es necesario presentar la factura y los productos en nuestra asistencia
                técnica:
              </p>
              <address className="not-italic rounded-xl bg-gray-50 p-4 space-y-1">
                <p className="font-bold text-gray-900">Zenn — Asistencia técnica</p>
                <p>Gaudioso Nuñez casi Celsa Speratti</p>
                <p>Asunción, Paraguay</p>
                <p>Lunes a viernes: 08:00 a 17:00 hs</p>
                <p>Sábado: 08:30 a 11:00 hs</p>
                <p>WhatsApp / teléfono: +595 973 345284</p>
                <p>Email: ventas@zenn.com.py</p>
              </address>
              <p>
                La retirada de los productos deberá ser efectuada por el mismo cliente, en el mismo
                local de la asistencia técnica y dentro de los horarios establecidos, respetando el
                plazo máximo informado para cada caso.
              </p>
              <h3 className="font-bold text-gray-900 pt-2">Responsabilidad del cliente</h3>
              <p>
                Al recibir el producto, el cliente debe realizar las pruebas necesarias para
                identificar cualquier problema. Recomendamos comunicar de inmediato cualquier
                inconveniente por WhatsApp o email.
              </p>
            </div>
          </section>

          <section>
            <SectionTitle id="procedimientos" title="Procedimiento para garantía" icon={FileText} />
            <div className="space-y-4">
              {[
                {
                  title: 'Cambio',
                  body: 'Los productos que presenten defectos en un plazo de 7 días serán sometidos a pruebas y podrán ser cambiados por uno nuevo. Deben estar en perfecto estado, con todos los accesorios y la caja nueva. Si el producto presenta suciedad, rayas o la caja aplastada, se aceptará como asistencia técnica y no como garantía de cambio.'
                },
                {
                  title: 'Vale de asistencia técnica',
                  body: 'Consiste en recibir productos con garantía de asistencia técnica. Se someten a evaluación y, según el resultado, podrán ser cambiados o reparados. El plazo de reparación y devolución al cliente es de 7 a 30 días.'
                },
                {
                  title: 'Vale normal',
                  body: 'Consiste en recibir el producto (en condición de cambio) cuando no se encuentre en stock, con o sin accesorios. Los cambios se realizarán una vez que el artículo vuelva a estar en stock.'
                },
                {
                  title: 'Vale condicional',
                  body: 'Consiste en recibir un producto con el plazo de garantía vencido o con daños físicos menores, para probar la garantía directamente con el proveedor, pero sin compromiso de cambio. Según la respuesta del proveedor, el producto se devolverá sin reparar, reparado o cambiado.'
                },
                {
                  title: 'Crédito',
                  body: 'Habrá un crédito en caso de que el producto no esté disponible en stock, pero debe estar completo y con todos los accesorios (caja, cables, CD, instalación, manual) y sin daño físico. No devolvemos el dinero: el crédito debe utilizarse para la compra de otro producto en Zenn.'
                }
              ].map((item) => (
                <article key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 mt-2">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle id="no-cubre" title="Nuestra garantía no cubre" icon={Ban} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4 text-gray-700">
              <ul className="space-y-3">
                {[
                  'Daños por uso incorrecto; golpes; cualquier problema con la pantalla (display roto, touch); daños por agua; equipos corrompidos o manipulados; quemados; lacres manipulados; instalación incorrecta o uso de software no original del producto.',
                  'Placas de video o fuentes de alimentación usadas para minería de criptomonedas; daños por sobrecarga eléctrica; plazo de garantía vencido.',
                  'Placa madre (MB), tarjeta de video (VGA) y fuente de alimentación utilizadas en minería no están garantizadas. Toda la información se almacena en la BIOS; el fabricante detecta esa función con su propio sistema. De ser detectada, el producto pierde automáticamente la garantía, ya que no fueron fabricados para ese fin.',
                  'Todos y cada uno de los accesorios no están incluidos en la garantía.',
                  'La etiqueta con el código de serie o de barras tachado o alterado.',
                  'Notebooks y netbooks con defectos en la pantalla, como líneas, manchas y rayones, no tienen garantía.'
                ].map((text) => (
                  <li key={text} className="flex gap-3">
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-3 text-gray-700">
            <h2 className="text-xl font-bold text-gray-900">Observaciones</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Los vales de asistencia técnica y condicional tienen una validez de 6 meses.</li>
              <li>
                La garantía de batería y fuente de alimentación adquirida con notebooks y netbooks
                sólo se realizará junto con los mismos.
              </li>
              <li>No somos responsables de la información contenida en el equipo.</li>
              <li>
                Algunas notebooks y netbooks solo funcionan perfectamente con su sistema operativo
                original, ya que el fabricante no proporciona todos los controladores.
              </li>
              <li>
                Se evaluarán notebooks y netbooks con sistema operativo manipulado de fábrica. Si se
                encuentra que el problema está en el sistema operativo, se cobrará una tarifa de{' '}
                <strong>25 U$</strong> por su reinstalación.
              </li>
            </ul>
          </section>

          <section>
            <SectionTitle id="faq" title="Preguntas frecuentes" icon={HelpCircle} />
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, index) => {
                const open = openFaq === index;
                return (
                  <div key={item.q} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-medium text-gray-900"
                      onClick={() => setOpenFaq(open ? -1 : index)}
                      aria-expanded={open}
                    >
                      {item.q}
                      <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && <p className="px-5 pb-4 text-gray-600">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section id="contacto" className="scroll-mt-28">
            <div
              className="rounded-2xl p-6 sm:p-8 text-white"
              style={{ background: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)' }}
            >
              <h2 className="text-2xl font-bold mb-2">¿Necesitás ayuda con una devolución?</h2>
              <p className="text-white/90 mb-6 max-w-2xl">
                Escribinos con tu factura y el motivo. Te orientamos si corresponde devolución,
                cambio o asistencia técnica.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="https://wa.me/595973345284?text=Hola%2C%20quiero%20consultar%20por%20una%20devoluci%C3%B3n%20o%20garant%C3%ADa."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/15 hover:bg-white/25 rounded-xl p-4 flex items-center gap-3 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span>
                    <span className="block text-sm text-white/80">WhatsApp</span>
                    +595 973 345284
                  </span>
                </a>
                <a
                  href="mailto:ventas@zenn.com.py?subject=Consulta%20de%20devoluci%C3%B3n%20o%20garant%C3%ADa"
                  className="bg-white/15 hover:bg-white/25 rounded-xl p-4 flex items-center gap-3 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span>
                    <span className="block text-sm text-white/80">Email</span>
                    ventas@zenn.com.py
                  </span>
                </a>
              </div>
              <p className="mt-6 text-sm text-white/80">
                Local: Gaudioso Nuñez casi Celsa Speratti, Asunción.{' '}
                <Link to="/nosotros" className="underline text-white">
                  Ver ubicación
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Devoluciones;

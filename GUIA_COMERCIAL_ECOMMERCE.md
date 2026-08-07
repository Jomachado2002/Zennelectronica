# Guía Comercial — Sistema E-commerce Zenn

> Documento de presentación comercial. Describe **qué hace el sistema** y **qué beneficios aporta**, en lenguaje simple para que cualquier persona del área comercial o administrativa pueda explicarlo y venderlo.

---

## ¿Qué es?

Es una **plataforma de comercio electrónico completa** para vender productos de tecnología (y cualquier rubro similar), pensada para el mercado paraguayo. No es "solo una página de productos": es una **tienda online + sistema de gestión comercial (ERP) + automatización de carga de productos**, todo integrado.

En pocas palabras, con un solo sistema el cliente puede:

- **Vender online** con cobro real por tarjeta (Bancard).
- **Administrar todo el negocio**: ventas, compras, clientes, proveedores, stock y finanzas.
- **Cargar productos automáticamente** desde el proveedor mayorista (Visão Vip), sin cargarlos a mano.

---

## 1. La tienda online (lo que ve el cliente final)

### 1.1 Página principal y navegación
- Página de inicio moderna con **banners promocionales**, **carruseles de marcas** y **secciones de productos destacados** configurables.
- **Menú de categorías, subcategorías y sub-subcategorías** con navegación fácil, tanto en computadora como en celular.
- Versión **optimizada para celular** (la mayoría de los clientes compran desde el teléfono).
- Botón directo de **WhatsApp** para asesoría y ventas.
- Página institucional ("Nosotros").

### 1.2 Catálogo de productos
- Productos organizados por **categorías y subcategorías** (notebooks, celulares, componentes, CCTV, etc.).
- **Ficha de producto completa**: galería de imágenes con zoom, precio, disponibilidad de stock, especificaciones técnicas detalladas y productos relacionados.
- **URLs amigables y optimizadas para Google (SEO)**, para que los productos aparezcan en búsquedas.

### 1.3 Buscador y filtros
- **Buscador con vista previa** (autocompletado) mientras el cliente escribe.
- **Búsqueda avanzada** por texto, categoría, marca, especificaciones técnicas y **rango de precios**.
- **Filtros para el usuario**: por marca, por características técnicas, por precio, etc.
- Los productos sin stock se ocultan o se muestran según convenga.

### 1.4 Carrito de compras
- Carrito que **funciona sin necesidad de iniciar sesión** (recuerda los productos aunque el cliente aún no esté registrado).
- Contador de productos siempre visible.
- Ajuste de cantidades y visualización de totales.

### 1.5 Cobro / Pago (integración con Bancard)
- **Cobro real online con tarjeta** a través de **Bancard** (la pasarela de pagos oficial de Paraguay).
- Opciones de pago:
  - **Tarjeta nueva** en cada compra.
  - **Tarjetas guardadas** (el cliente registra su tarjeta una vez y paga más rápido las siguientes veces).
  - **Pago con saldo** (billetera interna / wallet del cliente).
- Manejo de **facturación, RUC e IVA**.
- Pantallas de **pago exitoso** y **pago cancelado**, con confirmación automática.
- **Reversión de pagos (rollback)** desde el panel de administración cuando se necesita anular.

### 1.6 Ubicación / dirección de entrega
- El cliente puede **agregar su ubicación / dirección** en su perfil y durante la compra.
- **Selector de ubicación** integrado y geolocalización (guardado de dirección para entregas).

### 1.7 Perfil del cliente
Cada cliente tiene su propia cuenta con:
- **Datos personales** y foto de perfil.
- **Dirección de entrega**.
- **Gestión de tarjetas** (registrar/eliminar tarjetas de forma segura).
- **Saldo / billetera** (cargar saldo vía Bancard y pagar con él).
- **Historial de compras**.
- **Favoritos** (lista de deseos).
- **Configuración** (cambio de contraseña y preferencias).

Incluye **registro de usuarios, inicio de sesión, y recuperación de contraseña** por email.

### 1.8 Post-venta y seguimiento
- **Detalle de cada pedido** con su estado.
- **Seguimiento de la entrega** (preparando, en camino, entregado).
- **Emails automáticos** de confirmación de compra y de actualización de la entrega.
- **Calificación del pedido** por parte del cliente.

---

## 2. Panel de administración (gestión del negocio / ERP)

El sistema no solo vende: también **administra todo el negocio** desde un panel privado.

### 2.1 Tablero financiero y reportes
- **Dashboard financiero** con métricas del negocio.
- **Reportes de rentabilidad y márgenes** (cuánto se gana por producto/venta).
- **Estado de cuenta** y **métricas anuales**.
- **Análisis financiero por producto** (costos, márgenes, precio de venta).

### 2.2 Ventas
- **Registro y listado de ventas** (funciona como punto de venta interno).
- **Carga de nuevas ventas** con búsqueda de clientes y productos, **multi-moneda (Guaraníes y Dólares)**, IVA, RUC y adjuntos.
- Gestión de **tipos de venta**, **sucursales** y **vendedores**.

### 2.3 Compras (a proveedores)
- **Registro y listado de compras** a proveedores.
- **Carga de nuevas compras** con detalle completo.
- Gestión de **tipos de compra** y **proveedores**.

### 2.4 Clientes y presupuestos (CRM)
- **Base de datos de clientes** (alta, edición, detalle).
- **Presupuestos** profesionales: con productos del catálogo o ítems personalizados, IVA, descuentos, validez, **generación de PDF** y **envío por email**.

### 2.5 Gestión de productos
- **Alta, edición y listado** de productos desde el panel.
- Carga de imágenes **arrastrando, pegando o desde el portapapeles**, con **optimización automática (WebP)** para que la página cargue rápido.
- **Especificaciones técnicas dinámicas** según el tipo de producto.
- Gestión de **categorías y subcategorías**.
- **Tipo de cambio** (USD/PYG) con recálculo de precios.
- **Gestión de stock**.

### 2.6 Transacciones y entregas (Bancard)
- **Listado de todas las transacciones** de pago online.
- **Gestión de entregas / delivery** con estados y emails automáticos.
- **Reversión de pagos (rollback)**.
- **Exportación a Excel** de las transacciones.

### 2.7 Usuarios y permisos
- **Administración de usuarios** del sistema.
- **Roles**: ROOT, ADMIN y GENERAL.
- **Permisos granulares por módulo** (se define quién puede ver/editar productos, finanzas, ventas, compras, clientes, etc.). Ideal para dar acceso limitado a cada empleado.

### 2.8 Configuración centralizada
- Un solo lugar para configurar sucursales, tipos de venta, vendedores, proveedores, usuarios y tipo de cambio.

---

## 3. Automatización y carga inteligente de productos ⭐

Esta es una de las **ventajas más fuertes para vender el sistema**: no hay que cargar productos a mano.

### 3.1 Lectura automática de Visão Vip (proveedor mayorista)
- El sistema **lee automáticamente los productos de la página de Visão Vip** (mayorista) y los **carga en la tienda**.
- Extrae: **categorías, subcategorías, especificaciones técnicas, imágenes y precios**.
- **Calcula automáticamente el precio de venta** aplicando el tipo de cambio, el costo de envío y el **margen de ganancia** deseado.
- **Sincronización programada** (puede correr sola, por ejemplo, todas las noches).
- Actualiza stock y **da de baja los productos que el proveedor ya no tiene**.

> En criollo: **el proveedor sube un producto → el sistema lo detecta, lo trae con fotos y datos, le pone precio con tu margen, y queda publicado para vender**. Todo automático.

### 3.2 Sincronización de inventario por archivo (CSV)
- Permite subir un **archivo del proveedor (CSV)** y **comparar automáticamente** con lo que hay en el sistema:
  - Productos nuevos (para importar).
  - Productos que ya no están (para marcar sin stock).
  - Diferencias de precios.
  - **Actualización masiva de precios**.
  - **Control de visibilidad** de productos.
- Ahorra horas de trabajo manual y evita errores.

### 3.3 Carga y exportación masiva
- **Exportación de productos a Excel** (con imágenes en ZIP).
- Scripts de mantenimiento para migraciones y actualizaciones masivas de precios.

---

## 4. Herramientas comerciales y de marketing

- **Catálogo PDF**: genera un catálogo comercial en PDF filtrando por categoría (ideal para enviar a clientes por WhatsApp o email).
- **Generación de PDF** para presupuestos y reportes financieros.
- **Editor de imágenes de productos** integrado (agregar textos, marcas, formatos para redes).
- **Feed de productos para Meta/Facebook** (para publicar el catálogo en Facebook e Instagram automáticamente).
- **Analytics y seguimiento**: Meta Pixel, Google Analytics y métricas de rendimiento (para medir campañas y ventas).
- **Emails automáticos** transaccionales (confirmaciones, entregas).

---

## 5. Puntos fuertes para la venta (resumen ejecutivo)

| Beneficio | Por qué importa al cliente |
|-----------|----------------------------|
| **Tienda + ERP + automatización, todo en uno** | No necesita 3 sistemas distintos. Un solo lugar para vender y administrar. |
| **Cobro real con Bancard** | Recibe pagos con tarjeta de forma segura y certificada en Paraguay. |
| **Carga automática desde Visão Vip** | Ahorra horas: los productos se cargan solos, con precio y margen ya aplicados. |
| **Sincronización de stock y precios** | Nunca vende algo que no hay; los precios se mantienen actualizados. |
| **Wallet / saldo y tarjetas guardadas** | Mejora la experiencia y acelera las recompras. |
| **Gestión de ventas, compras y finanzas** | El dueño ve la rentabilidad real de su negocio. |
| **Presupuestos y catálogo en PDF** | Herramientas comerciales listas para cerrar ventas. |
| **Permisos por usuario** | Cada empleado accede solo a lo que le corresponde. |
| **Optimizado para celular y para Google (SEO)** | Más visitas y más ventas. |
| **Integración con Facebook/Instagram y analytics** | Marketing y medición incluidos. |

---

## 6. Cómo presentarlo según a quién le vendas

- **Al dueño del negocio:** "Vendé online con cobro por tarjeta y controlá toda tu empresa (ventas, compras, stock y ganancias) desde un solo sistema, con los productos cargándose solos desde tu proveedor."
- **Al encargado de ventas:** "Buscador y filtros potentes, carrito rápido, presupuestos y catálogos en PDF, y seguimiento de cada pedido."
- **Al administrador/contable:** "Reportes financieros, márgenes por producto, multi-moneda, IVA, RUC y exportación a Excel."
- **Al encargado de sistemas/marketing:** "Automatización con Visão Vip, sincronización por CSV, feed para Meta y analytics integrados."

---

*Documento comercial — Sistema E-commerce Zenn.*

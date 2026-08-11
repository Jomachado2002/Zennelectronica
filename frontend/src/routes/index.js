// frontend/src/routes/index.js - ACTUALIZADO CON PERFIL DE USUARIO Y RATING PAGE
import { createBrowserRouter } from "react-router-dom"
import { lazy, Suspense } from "react"
import App from "../App"
import Home from "../pages/Home"
import ErrorPage from "../pages/ErrorPage"

const Lazy = ({ children }) => (
  <Suspense fallback={<div className="min-h-[40vh] animate-pulse bg-gray-50" />}>{children}</Suspense>
);

const Login = lazy(() => import('../pages/Login'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const SignUp = lazy(() => import('../pages/SignUp'));
const AdminPanel = lazy(() => import('../pages/AdminPanel'));
const AllUsers = lazy(() => import('../pages/AllUsers'));
const UserManagement = lazy(() => import('../pages/UserManagement'));
const AllProducts = lazy(() => import('../pages/AllProducts'));
const NewProductPage = lazy(() => import('../pages/NewProductPage'));
const CategoryProduct = lazy(() => import('../pages/CategoryProduct'));
const ProductDetails = lazy(() => import('../pages/ProductDetails'));
const Cart = lazy(() => import('../pages/Cart'));
const SearchProduct = lazy(() => import('../pages/SearchProduct'));
const AdvancedSearchResults = lazy(() => import('../pages/AdvancedSearchResults'));
const Promotions = lazy(() => import('../pages/Promotions'));
const MobileCategoriesPage = lazy(() => import('../pages/MobileCategoriesPage'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Nosotros = lazy(() => import('../pages/Nosotros'));

// ✅ NUEVA PÁGINA DE PERFIL DE USUARIO
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'));

// ✅ NUEVA PÁGINA DE CALIFICACIÓN
const RatingPage = lazy(() => import('../pages/RatingPage'));
const OrderDetailsPage = lazy(() => import('../pages/OrderDetailsPage'));

// ✅ PÁGINAS DE BANCARD
const PaymentSuccess = lazy(() => import('../pages/PaymentSuccess'));
const PaymentCancelled = lazy(() => import('../pages/PaymentCancelled'));
const BancardConfirmProxy = lazy(() => import('../pages/BancardConfirmProxy'));
const BancardTransactions = lazy(() => import('../pages/BancardTransactions'));

// Importar el nuevo componente de dashboard
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminSettings = lazy(() => import('../pages/AdminSettings'));
const PurchaseTypesManagement = lazy(() => import('../pages/PurchaseTypesManagement'));

// Importar componente de gestión de categorías
const CategoriesManagement = lazy(() => import('../components/admin/CategoriesManagement'));

// Importar página de gestión de tipo de cambio
const ExchangeRateManagement = lazy(() => import('../pages/ExchangeRateManagement'));
const HomeVitrinasManagement = lazy(() => import('../pages/HomeVitrinasManagement'));
const HomeMediaManagement = lazy(() => import('../pages/HomeMediaManagement'));

// Importar páginas financieras
const FinancialReports = lazy(() => import('../pages/FinancialReports'));
const ClientsList = lazy(() => import('../pages/ClientsList'));
const ClientDetails = lazy(() => import('../pages/ClientDetails'));
const BudgetsList = lazy(() => import('../pages/BudgetsList'));
const BudgetDetails = lazy(() => import('../pages/BudgetDetails'));
const NewBudget = lazy(() => import('../pages/NewBudget'));
const NewClient = lazy(() => import('../pages/NewClient'));
const SuppliersManagement = lazy(() => import('../pages/SuppliersManagement'));
const SalesManagement = lazy(() => import('../pages/SalesManagement'));
const PurchaseManagement = lazy(() => import('../pages/PurchaseManagement'));
const SaleDetails = lazy(() => import('../pages/SaleDetails'));
const PurchaseDetails = lazy(() => import('../pages/PurchaseDetails'));
const NewPurchase = lazy(() => import('../pages/NewPurchase'));
const FinancialDashboard = lazy(() => import('../pages/FinancialDashboard'));
const CatastroResult = lazy(() => import('../pages/CatastroResult'));
const TestBalance = lazy(() => import('../pages/TestBalance'));

// Importar componentes de configuración de ventas
const SalesTypesManagement = lazy(() => import('../pages/SalesTypesManagement'));
const BranchesManagement = lazy(() => import('../pages/BranchesManagement'));
const SalespersonsManagement = lazy(() => import('../pages/SalespersonsManagement'));
const EnhancedSalesForm = lazy(() => import('../pages/EnhancedSalesForm'));

// Importar página de sincronización de inventario
const InventorySyncPage = lazy(() => import('../pages/admin/InventorySyncPage'));

// Importar página de exportación de productos
const ExportProductsPage = lazy(() => import('../pages/admin/ExportProductsPage'));

// Importar página de catálogo PDF
const AdminCatalogoPDF = lazy(() => import('../pages/admin/AdminCatalogoPDF'));

// Importar página de editor de imágenes
const ImageEditorPage = lazy(() => import('../pages/ImageEditorPage'));

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "",
                element: <Home />
            },
            {
                path: "iniciar-sesion",
                element: <Lazy><Login /></Lazy>
            },
            {
                path: "recuperar-contrasena",
                element: <Lazy><ForgotPassword /></Lazy>
            },
            {
                path: "restablecer-contrasena/:token",
                element: <Lazy><ResetPassword /></Lazy>
            },
            {
                path: "registro",
                element: <Lazy><SignUp /></Lazy>
            },
            {
                path: "nosotros",
                element: <Lazy><Nosotros /></Lazy>
            },
            {
                path: "categorias-movil",
                element: <Lazy><MobileCategoriesPage /></Lazy>
            },
            {
                 path: "catastro-resultado",
                 element: <Lazy><CatastroResult /></Lazy>
            },
            {
                path: "test-saldo",
                element: <Lazy><TestBalance /></Lazy>
            },
            {
                path: "categoria-producto",
                element: <Lazy><CategoryProduct /></Lazy>
            },
            {
                path: "promociones",
                element: <Lazy><Promotions /></Lazy>
            },
            {
                path: "producto/:id",
                element: <Lazy><ProductDetails /></Lazy>
            },
            {
                path: "carrito",
                element: <Lazy><Cart /></Lazy>
            },
            {
                path: "finalizar-compra",
                element: <Lazy><Checkout /></Lazy>
            },
            {
                path: "buscar",
                element: <Lazy><SearchProduct /></Lazy>
            },
            {
                path: "search",
                element: <Lazy><AdvancedSearchResults /></Lazy>
            },
            
            // ✅ NUEVA RUTA PARA PERFIL DE USUARIO
            {
                path: "mi-perfil",
                element: <Lazy><UserProfilePage /></Lazy>
            },
            
            // ✅ NUEVA RUTA PARA CALIFICAR PEDIDO
            {
                path: "calificar-pedido/:shop_process_id",
                element: <Lazy><RatingPage /></Lazy>
            },
            {
                path: "pedido/:shop_process_id",
                element: <Lazy><OrderDetailsPage /></Lazy>
            },
            
            // ✅ RUTAS PARA BANCARD
            {
                path: "pago-exitoso",
                element: <Lazy><PaymentSuccess /></Lazy>
            },
            {
                path: "pago-cancelado",
                element: <Lazy><PaymentCancelled /></Lazy>
            },
            
            // ✅ RUTAS PROXY PARA BANCARD - CRÍTICAS
            {
                path: "api/bancard/confirm",
                element: <Lazy><BancardConfirmProxy /></Lazy>
            },
            {
                path: "api/bancard/confirm-payment",
                element: <Lazy><BancardConfirmProxy /></Lazy>
            },
            
            // Editor de Imágenes - Página completa (fuera del layout del admin)
            {
                path: "panel-admin/editar-imagenes",
                element: <Lazy><ImageEditorPage /></Lazy>
            },
            
            // Panel de admin separado
            {
                path: "panel-admin",
                element: <Lazy><AdminPanel /></Lazy>,
                children: [
                    {
                        path: "",
                        element: <Lazy><AdminDashboard /></Lazy>
                    },
                    {
                        path: "todos-usuarios",
                        element: <Lazy><AllUsers /></Lazy>
                    },
                    {
                        path: "gestion-usuarios",
                        element: <Lazy><UserManagement /></Lazy>
                    },
                    {
                        path: "productos",
                        element: <Lazy><AllProducts /></Lazy>
                    },
                    {
                        path: "productos/nuevo",
                        element: <Lazy><NewProductPage /></Lazy>
                    },
                    {
                        path: "categorias",
                        element: <Lazy><CategoriesManagement /></Lazy>
                    },
                    {
                        path: "tipo-cambio",
                        element: <Lazy><ExchangeRateManagement /></Lazy>
                    },
                    {
                        path: "home-vitrinas",
                        element: <Lazy><HomeVitrinasManagement /></Lazy>
                    },
                    {
                        path: "home-media",
                        element: <Lazy><HomeMediaManagement /></Lazy>
                    },
                    
                    
                    // ✅ RUTA PARA TRANSACCIONES BANCARD
                    {
                        path: "transacciones-bancard",
                        element: <Lazy><BancardTransactions /></Lazy>
                    },
                    
                    // Rutas financieras
                    {
                        path: "dashboard",
                        element: <Lazy><FinancialDashboard /></Lazy>
                    },
                    {
                        path: "configuracion",
                        element: <Lazy><AdminSettings /></Lazy>
                    },
                    {
                        path: "tipos-compra",
                        element: <Lazy><PurchaseTypesManagement /></Lazy>
                    },
                    {
                        path: "ventas",
                        element: <Lazy><SalesManagement /></Lazy>
                    },
                    {
                        path: "ventas/:saleId",
                        element: <Lazy><SaleDetails /></Lazy>
                    },
                    {
                        path: "nueva-venta",
                        element: <Lazy><EnhancedSalesForm /></Lazy>
                    },
                    {
                        path: "compras",
                        element: <Lazy><PurchaseManagement /></Lazy>
                    },
                    {
                        path: "nueva-compra",
                        element: <Lazy><NewPurchase /></Lazy>
                    },
                    {
                        path: "compras/:purchaseId",
                        element: <Lazy><PurchaseDetails /></Lazy>
                    },
                    
                    // Rutas financieras adicionales
                    {
                        path: "reportes",
                        element: <Lazy><FinancialReports /></Lazy>
                    },
                    
                    // Gestión de clientes
                    {
                        path: "clientes",
                        element: <Lazy><ClientsList /></Lazy>
                    },
                    {
                        path: "clientes/nuevo",
                        element: <Lazy><NewClient /></Lazy>
                    },
                    {
                        path: "clientes/:clientId",
                        element: <Lazy><ClientDetails /></Lazy>
                    },
                    
                    // Gestión de presupuestos
                    {
                        path: "presupuestos",
                        element: <Lazy><BudgetsList /></Lazy>
                    },
                    {
                        path: "presupuestos/nuevo",
                        element: <Lazy><NewBudget /></Lazy>
                    },
                    {
                        path: "presupuestos/:budgetId",
                        element: <Lazy><BudgetDetails /></Lazy>
                    },
                    {
                        path: "proveedores",
                        element: <Lazy><SuppliersManagement /></Lazy>
                    },
                    {
                        path: "proveedores/:supplierId", 
                        element: <Lazy><SuppliersManagement /></Lazy>
                    },
                    
                    // Configuración de Ventas
                    {
                        path: "tipos-venta",
                        element: <Lazy><SalesTypesManagement /></Lazy>
                    },
                    {
                        path: "sucursales",
                        element: <Lazy><BranchesManagement /></Lazy>
                    },
                    {
                        path: "vendedores",
                        element: <Lazy><SalespersonsManagement /></Lazy>
                    },
                    
                    // Sincronización de Inventario
                    {
                        path: "sincronizacion-inventario",
                        element: <Lazy><InventorySyncPage /></Lazy>
                    },
                    
                    // Exportar Productos
                    {
                        path: "exportar-productos",
                        element: <Lazy><ExportProductsPage /></Lazy>
                    },
                    
                    // Catálogo PDF
                    {
                        path: "catalogo-pdf",
                        element: <Lazy><AdminCatalogoPDF /></Lazy>
                    },
                
                ]
            }
            
        ]
    }
], {
    future: {
        v7_startTransition: true,
    }
})

export default router

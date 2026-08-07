// frontend/src/routes/index.js - ACTUALIZADO CON PERFIL DE USUARIO Y RATING PAGE
import { createBrowserRouter } from "react-router-dom"
import App from "../App"
import Home from "../pages/Home"
import Login from "../pages/Login"
import ForgotPassword from "../pages/ForgotPassword"
import SignUp from "../pages/SignUp"
import AdminPanel from "../pages/AdminPanel"
import AllUsers from "../pages/AllUsers"
import UserManagement from "../pages/UserManagement"
import AllProducts from "../pages/AllProducts"
import NewProductPage from "../pages/NewProductPage"
import CategoryProduct from "../pages/CategoryProduct"
import ProductDetails from "../pages/ProductDetails"
import Cart from '../pages/Cart'
import SearchProduct from "../pages/SearchProduct"
import AdvancedSearchResults from "../pages/AdvancedSearchResults"
import MobileCategoriesPage from "../pages/MobileCategoriesPage"
import ResetPassword from "../pages/ResetPassword"
import Checkout from "../pages/Checkout"
import Nosotros from "../pages/Nosotros"

// ✅ NUEVA PÁGINA DE PERFIL DE USUARIO
import UserProfilePage from "../pages/UserProfilePage"

// ✅ NUEVA PÁGINA DE CALIFICACIÓN
import RatingPage from "../pages/RatingPage"
import OrderDetailsPage from "../pages/OrderDetailsPage"


// ✅ PÁGINAS DE BANCARD
import PaymentSuccess from "../pages/PaymentSuccess"
import PaymentCancelled from "../pages/PaymentCancelled"
import BancardConfirmProxy from "../pages/BancardConfirmProxy"
import BancardTransactions from "../pages/BancardTransactions"

// Importar el nuevo componente de dashboard
import AdminDashboard from "../pages/AdminDashboard"
import AdminSettings from "../pages/AdminSettings"
import ErrorPage from "../pages/ErrorPage"
import PurchaseTypesManagement from "../pages/PurchaseTypesManagement"

// Importar componente de gestión de categorías
import CategoriesManagement from "../components/admin/CategoriesManagement"

// Importar página de gestión de tipo de cambio
import ExchangeRateManagement from "../pages/ExchangeRateManagement"
import HomeVitrinasManagement from "../pages/HomeVitrinasManagement"

// Importar páginas financieras
import FinancialReports from "../pages/FinancialReports"
import ClientsList from "../pages/ClientsList"
import ClientDetails from "../pages/ClientDetails"
import BudgetsList from "../pages/BudgetsList"
import BudgetDetails from "../pages/BudgetDetails"
import NewBudget from "../pages/NewBudget"
import NewClient from "../pages/NewClient"
import SuppliersManagement from "../pages/SuppliersManagement"
import SalesManagement from "../pages/SalesManagement"
import PurchaseManagement from "../pages/PurchaseManagement"
import SaleDetails from "../pages/SaleDetails"
import PurchaseDetails from "../pages/PurchaseDetails"
import NewPurchase from "../pages/NewPurchase"
import FinancialDashboard from "../pages/FinancialDashboard"
import CatastroResult from "../pages/CatastroResult"
import TestBalance from "../pages/TestBalance"

// Importar componentes de configuración de ventas
import SalesTypesManagement from "../pages/SalesTypesManagement"
import BranchesManagement from "../pages/BranchesManagement"
import SalespersonsManagement from "../pages/SalespersonsManagement"
import EnhancedSalesForm from "../pages/EnhancedSalesForm"

// Importar página de sincronización de inventario
import InventorySyncPage from "../pages/admin/InventorySyncPage"

// Importar página de exportación de productos
import ExportProductsPage from "../pages/admin/ExportProductsPage"

// Importar página de catálogo PDF
import AdminCatalogoPDF from "../pages/admin/AdminCatalogoPDF"

// Importar página de editor de imágenes
import ImageEditorPage from "../pages/ImageEditorPage"

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
                element: <Login />
            },
            {
                path: "recuperar-contrasena",
                element: <ForgotPassword />
            },
            {
                path: "restablecer-contrasena/:token",
                element: <ResetPassword />
            },
            {
                path: "registro",
                element: <SignUp />
            },
            {
                path: "nosotros",
                element: <Nosotros />
            },
            {
                path: "categorias-movil",
                element: <MobileCategoriesPage />
            },
            {
                 path: "catastro-resultado",
                 element: <CatastroResult />
            },
            {
                path: "test-saldo",
                element: <TestBalance />
            },
            {
                path: "categoria-producto",
                element: <CategoryProduct />
            },
            {
                path: "producto/:id",
                element: <ProductDetails />
            },
            {
                path: "carrito",
                element: <Cart />
            },
            {
                path: "finalizar-compra",
                element: <Checkout />
            },
            {
                path: "buscar",
                element: <SearchProduct />
            },
            {
                path: "search",
                element: <AdvancedSearchResults />
            },
            
            // ✅ NUEVA RUTA PARA PERFIL DE USUARIO
            {
                path: "mi-perfil",
                element: <UserProfilePage />
            },
            
            // ✅ NUEVA RUTA PARA CALIFICAR PEDIDO
            {
                path: "calificar-pedido/:shop_process_id",
                element: <RatingPage />
            },
            {
                path: "pedido/:shop_process_id",
                element: <OrderDetailsPage />
            },
            
            // ✅ RUTAS PARA BANCARD
            {
                path: "pago-exitoso",
                element: <PaymentSuccess />
            },
            {
                path: "pago-cancelado",
                element: <PaymentCancelled />
            },
            
            // ✅ RUTAS PROXY PARA BANCARD - CRÍTICAS
            {
                path: "api/bancard/confirm",
                element: <BancardConfirmProxy />
            },
            {
                path: "api/bancard/confirm-payment",
                element: <BancardConfirmProxy />
            },
            
            // Editor de Imágenes - Página completa (fuera del layout del admin)
            {
                path: "panel-admin/editar-imagenes",
                element: <ImageEditorPage />
            },
            
            // Panel de admin separado
            {
                path: "panel-admin",
                element: <AdminPanel />,
                children: [
                    {
                        path: "",
                        element: <AdminDashboard />
                    },
                    {
                        path: "todos-usuarios",
                        element: <AllUsers />
                    },
                    {
                        path: "gestion-usuarios",
                        element: <UserManagement />
                    },
                    {
                        path: "productos",
                        element: <AllProducts />
                    },
                    {
                        path: "productos/nuevo",
                        element: <NewProductPage />
                    },
                    {
                        path: "categorias",
                        element: <CategoriesManagement />
                    },
                    {
                        path: "tipo-cambio",
                        element: <ExchangeRateManagement />
                    },
                    {
                        path: "home-vitrinas",
                        element: <HomeVitrinasManagement />
                    },
                    
                    
                    // ✅ RUTA PARA TRANSACCIONES BANCARD
                    {
                        path: "transacciones-bancard",
                        element: <BancardTransactions />
                    },
                    
                    // Rutas financieras
                    {
                        path: "dashboard",
                        element: <FinancialDashboard />
                    },
                    {
                        path: "configuracion",
                        element: <AdminSettings />
                    },
                    {
                        path: "tipos-compra",
                        element: <PurchaseTypesManagement />
                    },
                    {
                        path: "ventas",
                        element: <SalesManagement />
                    },
                    {
                        path: "ventas/:saleId",
                        element: <SaleDetails />
                    },
                    {
                        path: "nueva-venta",
                        element: <EnhancedSalesForm />
                    },
                    {
                        path: "compras",
                        element: <PurchaseManagement />
                    },
                    {
                        path: "nueva-compra",
                        element: <NewPurchase />
                    },
                    {
                        path: "compras/:purchaseId",
                        element: <PurchaseDetails />
                    },
                    
                    // Rutas financieras adicionales
                    {
                        path: "reportes",
                        element: <FinancialReports />
                    },
                    
                    // Gestión de clientes
                    {
                        path: "clientes",
                        element: <ClientsList />
                    },
                    {
                        path: "clientes/nuevo",
                        element: <NewClient />
                    },
                    {
                        path: "clientes/:clientId",
                        element: <ClientDetails />
                    },
                    
                    // Gestión de presupuestos
                    {
                        path: "presupuestos",
                        element: <BudgetsList />
                    },
                    {
                        path: "presupuestos/nuevo",
                        element: <NewBudget />
                    },
                    {
                        path: "presupuestos/:budgetId",
                        element: <BudgetDetails />
                    },
                    {
                        path: "proveedores",
                        element: <SuppliersManagement />
                    },
                    {
                        path: "proveedores/:supplierId", 
                        element: <SuppliersManagement />
                    },
                    
                    // Configuración de Ventas
                    {
                        path: "tipos-venta",
                        element: <SalesTypesManagement />
                    },
                    {
                        path: "sucursales",
                        element: <BranchesManagement />
                    },
                    {
                        path: "vendedores",
                        element: <SalespersonsManagement />
                    },
                    
                    // Sincronización de Inventario
                    {
                        path: "sincronizacion-inventario",
                        element: <InventorySyncPage />
                    },
                    
                    // Exportar Productos
                    {
                        path: "exportar-productos",
                        element: <ExportProductsPage />
                    },
                    
                    // Catálogo PDF
                    {
                        path: "catalogo-pdf",
                        element: <AdminCatalogoPDF />
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
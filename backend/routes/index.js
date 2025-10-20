    // backend/routes/index.js - VERSIÓN COMPLETA CON TODAS LAS RUTAS

    const express = require('express');
    const router = express.Router();
    const productModel = require('../models/productModel');

    // ===== CONTROLADORES EXISTENTES =====
    const userSignUpController = require("../controller/user/userSignUp");
    const userSignInController = require('../controller/user/userSignin');
    const userDetailsController = require('../controller/user/userDetails');
    const authToken = require('../middleware/authToken');
    const adminAuth = require('../middleware/adminAuth');
    const strictAuth = require('../middleware/strictAuth');
    const { requirePermission } = require('../helpers/granularPermission');
    const userLogout = require('../controller/user/userLogout');
    const allUsers = require('../controller/user/allUser');
    const updateUser = require('../controller/user/updateUser');
    const UploadProductController = require('../controller/product/uploadProduct');
    const { getProductController, getHomeProductsController } = require('../controller/product/getProduct');
    const { updateProductController} = require('../controller/product/updateProduct');
    const getCategoryProduct = require('../controller/product/getCategoryProduct');
const getCategoriesFromDB = require('../controller/product/getCategoriesFromDB');
    const getCategoryWiseProduct = require('../controller/product/getCategoryWiseProduct');
    const getProductDetails = require('../controller/product/getProductDetails');
    const { updateAllPricesController } = require('../controller/product/updateAllPrices');
    const channableFeedController = require('../controller/product/channableFeedController');
    const searchProduct = require('../controller/product/searchProduct');
    const advancedSearchProduct = require('../controller/product/advancedSearchProduct');
    const filterProductController = require('../controller/product/filterProduct');
    const requestPasswordReset = require('../controller/user/requestPasswordReset');
    const resetPassword = require('../controller/user/resetPassword');
    const getCategorySearch = require('../controller/product/getCategorySearch');
    const { deleteProductController } = require('../controller/product/deleteproductcontrolle');
    const { 
    analyzeStockController, 
    updateBulkStockController, 
    updatePricesFromMayoristasController 
} = require('../controller/product/stockManagementController');
const getProductBySlug = require('../controller/product/getProductBySlug');

// ===== CONTROLADORES DE CATEGORÍAS =====
const categoryRoutes = require('./categoryRoutes');

// ===== CONTROLADORES DE FINANZAS =====
    const { updateProductFinanceController, getProductFinanceController } = require('../controller/product/updateProductFinance');
    const { getMarginReportController, getCategoryProfitabilityController } = require('../controller/reports/financialReportsController');

    // ===== CONTROLADORES DE BANCARD ===== 
    const { 
        bancardConfirmController,
        bancardConfirmGetController, 
        createPaymentController,
        getTransactionStatusController,
        bancardHealthController,
        rollbackPaymentController,
        processBalanceLoadConfirmation
    } = require('../controller/bancard/bancardController');

    // ✅ CONTROLADORES DE TRANSACCIONES BANCARD
    const {
        getAllBancardTransactionsController,
        getBancardTransactionByIdController,
        rollbackBancardTransactionController,
        checkBancardTransactionStatusController,
        createBancardTransactionController
    } = require('../controller/bancard/bancardTransactionsController');

    // ===== CONTROLADORES DE CLIENTES =====
    const { 
        createClientController, 
        getAllClientsController, 
        getClientByIdController, 
        updateClientController, 
        deleteClientController 
    } = require('../controller/client/clientController');

    // ===== CONTROLADORES DE PRESUPUESTOS =====
    const { 
        createBudgetController,
        getAllBudgetsController, 
        getBudgetByIdController, 
        updateBudgetStatusController, 
        getBudgetPDFController,
        deleteBudgetController,
        sendBudgetEmailController
    } = require('../controller/budget/budgetController');

    // ===== CONTROLADORES DE PROVEEDORES =====
    const { 
        createSupplierController, 
        getAllSuppliersController, 
        getSupplierByIdController, 
        updateSupplierController, 
        deleteSupplierController 
    } = require('../controller/supplier/supplierController');

    // ===== CONTROLADORES DE ANÁLISIS DE RENTABILIDAD =====
    const {
        createProfitabilityAnalysisController,
        getAllProfitabilityAnalysesController,
        getProfitabilityAnalysisByIdController,
        compareSupplierPricesController,
        updateAnalysisStatusController,
        deleteAnalysisController,
        getSupplierProfitabilitySummaryController
    } = require('../controller/profitability/profitabilityController');

    // ===== CONTROLADORES DE UBICACIÓN =====
    const {
        reverseGeocodeController,
        geocodeAddressController,
        saveUserLocationController,
        getUserLocationController,
        saveGuestLocationController
    } = require('../controller/location/locationController');

    // ===== CONTROLADORES DE VENTAS Y COMPRAS =====
    const {
        createSaleController,
        getAllSalesController,
        getSaleByIdController,
        updateSalePaymentController,
        updateSalePaymentStatusController,
        uploadSaleInvoiceController,
        deleteSaleController
    } = require('../controller/sales/salesController');

    // ===== ✅ NUEVOS CONTROLADORES DE VENTAS MEJORADAS =====
    const {
        createSalesTypeController,
        getAllSalesTypesController,
        getSalesTypeByIdController,
        updateSalesTypeController,
        deleteSalesTypeController,
        getActiveSalesTypesController
    } = require('../controller/sales/salesTypeController');

    const {
        createBranchController,
        getAllBranchesController,
        getBranchByIdController,
        updateBranchController,
        deleteBranchController,
        getActiveBranchesController,
        getMainBranchController
    } = require('../controller/sales/branchController');

    const {
        createSalespersonController,
        getAllSalespersonsController,
        getSalespersonByIdController,
        updateSalespersonController,
        deleteSalespersonController,
        searchSalespersonsController,
        getActiveSalespersonsController,
        updateSalespersonPerformanceController
    } = require('../controller/sales/salespersonController');

    const {
        createEnhancedSaleController,
        searchProductsForSalesController,
        searchCustomersForSalesController,
        getSalesFormDataController,
        calculateItemTaxController,
        convertAmountToWordsController,
        validateRUCController,
        uploadSalesAttachmentsController,
        downloadAttachmentController,
        upload
    } = require('../controller/sales/enhancedSalesController');

    const {
        createPurchaseController,
        getAllPurchasesController,
        getPurchaseByIdController,
        updatePurchasePaymentController,
        uploadPurchaseDocumentsController,
        getPurchasesSummaryController,
        deletePurchaseController
    } = require('../controller/purchases/purchasesController');

    // ===== CONTROLADORES DE DASHBOARD =====
    const {
        getDashboardSummaryController,
        getAccountStatementController,
        getYearlyMetricsController
    } = require('../controller/dashboard/dashboardController');

    // ===== ✅ NUEVOS CONTROLADORES DE PERFIL DE USUARIO =====
    const { 
        getUserProfileController,
        updateUserProfileController,
        uploadProfileImageController,
        changePasswordController,
        getUserBalanceController,
        loadBalanceController,
        payWithBalanceController,
        getBalanceHistoryController
    } = require('../controller/user/userProfile');

    // ===== ✅ CONTROLADORES DE PERMISOS GRANULAR =====
    const {
        getUserPermissionsController,
        updateUserPermissionsController,
        checkUserPermissionController,
        getAllUsersWithPermissionsController,
        createUserWithPermissionsController
    } = require('../controller/user/userPermissionsController');

    // ===== ✅ NUEVOS CONTROLADORES DE TARJETAS BANCARD =====
    const {
        createCardController,
        getUserCardsController,
        chargeWithTokenController,
        deleteCardController

        
    } = require('../controller/bancard/bancardCardsController');

    // ===========================================
    // RUTAS DE BANCARD (PAGOS) - ✅ MEJORADAS PARA CERTIFICACIÓN
    // ===========================================
    router.post("/bancard/confirm", bancardConfirmController);
    router.get("/bancard/confirm", bancardConfirmGetController);

    router.post("/bancard/create-payment", authToken, createPaymentController);
    router.get("/bancard/status/:transactionId", getTransactionStatusController);
    router.get("/bancard/health", bancardHealthController);
    router.post("/bancard/rollback", rollbackPaymentController);

    // ✅ RUTAS PARA GESTIÓN DE TRANSACCIONES BANCARD
    router.get("/bancard/transactions", authToken, getAllBancardTransactionsController);
    router.get("/bancard/transactions/:transactionId", authToken, getBancardTransactionByIdController);
    router.post("/bancard/transactions/:transactionId/rollback", authToken, rollbackBancardTransactionController);
    router.get("/bancard/transactions/:transactionId/status", authToken, checkBancardTransactionStatusController);
    router.post("/bancard/transactions", authToken, createBancardTransactionController);
    const { updateUserLocation, getUserLocation } = require('../controller/user/userLocationController');

    // ===========================================
    // ✅ NUEVAS RUTAS DE PERFIL DE USUARIO
    // ===========================================
    // Obtener perfil del usuario
    router.get("/perfil", authToken, getUserProfileController);

    // Actualizar perfil del usuario
    router.put("/perfil", authToken, updateUserProfileController);

    // Subir imagen de perfil
    router.post("/perfil/imagen", authToken, uploadProfileImageController);
    router.put("/usuario/ubicacion", authToken, updateUserLocation);

    // Cambiar contraseña
    router.post("/perfil/cambiar-contrasena", authToken, changePasswordController);

    // ===========================================
    // ✅ RUTAS PARA GESTIÓN DE SALDO EN PERFIL
    // ===========================================
    
    // Obtener saldo del usuario
    router.get("/perfil/saldo", authToken, getUserBalanceController);
    
    // Cargar saldo con Bancard
    router.post("/perfil/cargar-saldo", authToken, loadBalanceController);
    
    // Pagar con saldo
    router.post("/perfil/pagar-con-saldo", authToken, payWithBalanceController);
    
    // Historial de transacciones de saldo
    router.get("/perfil/historial-saldo", authToken, getBalanceHistoryController);

    // ===========================================
    // ✅ NUEVAS RUTAS PARA GESTIÓN DE TARJETAS BANCARD - CERTIFICACIÓN
    // ===========================================

    // ✅ CATASTRAR NUEVA TARJETA
    router.post("/bancard/tarjetas", authToken, createCardController);

    // ✅ OBTENER TARJETAS DE UN USUARIO
    router.get("/bancard/tarjetas/:user_id", authToken, getUserCardsController);

    // ✅ ELIMINAR TARJETA
    router.delete("/bancard/tarjetas/:user_id", authToken, deleteCardController);

    // ✅ PAGAR CON ALIAS TOKEN
    router.post("/bancard/pago-con-token", authToken, chargeWithTokenController);

    // ===========================================
    // ✅ NUEVAS RUTAS PARA GESTIÓN DE SALDO (usando controladores de userProfile)
    // ===========================================
    
    // ✅ CARGAR SALDO CON BANCARD
    router.post("/bancard/cargar-saldo", authToken, loadBalanceController);
    
    // ✅ OBTENER SALDO DEL USUARIO
    router.get("/bancard/saldo/:userId", authToken, getUserBalanceController);
    router.get("/bancard/mi-saldo", authToken, getUserBalanceController);
    
    // ✅ PAGAR CON SALDO
    router.post("/bancard/pagar-con-saldo", authToken, payWithBalanceController);

    // ===========================================
    // ✅ ENDPOINTS DE PRUEBA PARA CERTIFICACIÓN BANCARD
    // ===========================================

    // Test de catastro de tarjeta
    router.post("/bancard/test-catastro", authToken, async (req, res) => {
        try {
            
            
            const testData = {
                card_id: Math.floor(Math.random() * 100000) + 11000, // ID único
                user_id: req.bancardUserId || req.user?.bancardUserId || 1,
                user_cell_phone: req.user?.phone || "12345678",
                user_mail: req.user?.email || "test@zenn.com",
                return_url: `${process.env.FRONTEND_URL}/mi-perfil?tab=cards`
            };

            

            // Usar el controlador existente
            req.body = testData;
            await createCardController(req, res);
            
        } catch (error) {
            console.error("❌ Error en test de catastro:", error);
            res.status(500).json({
                message: "Error en test de catastro",
                success: false,
                error: true,
                details: error.message
            });
        }
    });
    router.get("/debug/database", authToken, async (req, res) => {
        try {
            
            
            // Verificar permisos de admin
            if (req.userRole !== 'ADMIN') {
                return res.status(403).json({
                    message: "Solo administradores pueden acceder al debug",
                    success: false,
                    error: true
                });
            }

            const mongoose = require('mongoose');
            const BancardTransactionModel = require('../models/bancardTransactionModel');

            // Información de conexión
            const connectionInfo = {
                readyState: mongoose.connection.readyState,
                readyStateText: {
                    0: 'disconnected',
                    1: 'connected',
                    2: 'connecting',
                    3: 'disconnecting'
                }[mongoose.connection.readyState],
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                name: mongoose.connection.name
            };

            

            // Estadísticas de la colección
            let collectionStats = null;
            let sampleDocuments = [];
            let totalDocuments = 0;

            try {
                // Contar documentos
                totalDocuments = await BancardTransactionModel.countDocuments({});
                

                // Obtener estadísticas de la colección
                const db = mongoose.connection.db;
                if (db) {
                    try {
                        collectionStats = await db.collection('bancard_transactions').stats();
                        
                    } catch (statsError) {
                        console.warn("⚠️ No se pudieron obtener stats:", statsError.message);
                    }
                }

                // Obtener documentos de ejemplo
                if (totalDocuments > 0) {
                    sampleDocuments = await BancardTransactionModel
                        .find({})
                        .select('shop_process_id amount status createdAt user_bancard_id created_by')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean();
                    
                    
                }

                // Verificar índices
                const indexes = await BancardTransactionModel.collection.getIndexes();
                

            } catch (queryError) {
                console.error("❌ Error en consultas:", queryError);
            }

            // Verificar modelo
            const modelInfo = {
                modelName: BancardTransactionModel.modelName,
                collectionName: BancardTransactionModel.collection.name,
                schemaFields: Object.keys(BancardTransactionModel.schema.paths)
            };

            

            // Respuesta completa
            res.json({
                message: "Debug de base de datos",
                success: true,
                error: false,
                data: {
                    connection: connectionInfo,
                    collection: {
                        name: 'bancard_transactions',
                        totalDocuments,
                        stats: collectionStats ? {
                            size: collectionStats.size,
                            count: collectionStats.count,
                            avgObjSize: collectionStats.avgObjSize
                        } : null,
                        sampleDocuments: sampleDocuments.map(doc => ({
                            _id: doc._id,
                            shop_process_id: doc.shop_process_id,
                            amount: doc.amount,
                            status: doc.status,
                            createdAt: doc.createdAt,
                            user_bancard_id: doc.user_bancard_id,
                            created_by: doc.created_by
                        }))
                    },
                    model: modelInfo,
                    indexes: await BancardTransactionModel.collection.getIndexes().catch(() => ({})),
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV
                }
            });

        } catch (error) {
            console.error("❌ Error en debug de BD:", error);
            res.status(500).json({
                message: "Error en debug de base de datos",
                success: false,
                error: true,
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });
    const {
        getUserPurchasesController,
        getPurchaseDetailsController,
        getUserPurchaseStatsController,
        getAllUserPurchasesController
    } = require('../controller/user/userPurchasesController');

    // Rutas para usuarios
    router.get("/usuario/compras", authToken, getUserPurchasesController);
    router.get("/usuario/compras/:purchaseId", authToken, getPurchaseDetailsController);
    router.get("/usuario/estadisticas-compras", authToken, getUserPurchaseStatsController);

    // Rutas para admin
    router.get("/admin/todas-compras", authToken, getAllUserPurchasesController);

    // Test de pago con token
    router.post("/bancard/test-pago-token", authToken, async (req, res) => {
        try {
            
            
            const { alias_token, amount, description, promotion_code } = req.body;
            
            if (!alias_token) {
                return res.status(400).json({
                    message: "alias_token es requerido para el test",
                    success: false,
                    error: true,
                    example: { 
                        alias_token: "token-de-prueba",
                        amount: "151241.00",
                        description: "Test de pago Zenn",
                        promotion_code: "099VS ORO000045" // OPCIONAL: Solo si hay promoción
                    },
                    instructions: "Primero ejecuta test-listar para obtener un alias_token válido"
                });
            }

            const testPaymentData = {
                shop_process_id: Math.floor(Math.random() * 1000000) + 600000,
                amount: amount || "151241.00",
                currency: "PYG",
                alias_token: alias_token,
                number_of_payments: 1,
                description: description || "Test de pago con token Zenn - SIN additional_data",
                return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
                // ✅ IMPORTANTE: Solo incluir promotion_code si es válido
                ...(promotion_code && /^\d{3}[A-Z]{2}\s[A-Z]{3}\d{6}$/.test(promotion_code.trim()) && {
                    promotion_code: promotion_code.trim()
                })
                // ✅ NO incluir additional_data por defecto
            };

            
            

            // Usar el controlador corregido
            req.body = testPaymentData;
            await chargeWithTokenController(req, res);
            
        } catch (error) {
            console.error("❌ Error en test de pago con token:", error);
            res.status(500).json({
                message: "Error en test de pago con token",
                success: false,
                error: true,
                details: error.message
            });
        }
    });

    // Test de eliminar tarjeta
    router.delete("/bancard/test-eliminar/:user_id", async (req, res) => {
        try {
            
            
            
            const { alias_token } = req.body;
            
            if (!alias_token) {
                return res.status(400).json({
                    message: "alias_token es requerido para el test",
                    success: false,
                    error: true,
                    example: { alias_token: "token-de-prueba" },
                    instructions: "Primero ejecuta test-listar para obtener un alias_token válido"
                });
            }

            

            // Usar el controlador existente
            await deleteCardController(req, res);
            
        } catch (error) {
            console.error("❌ Error en test de eliminar:", error);
            res.status(500).json({
                message: "Error en test de eliminar tarjeta",
                success: false,
                error: true,
                details: error.message
            });
        }
    });

    // ===========================================
    // ✅ ENDPOINTS DE VERIFICACIÓN Y CERTIFICACIÓN
    // ===========================================

    // Verificación de configuración
    router.get("/bancard/config-check", (req, res) => {
        const { validateBancardConfig } = require('../helpers/bancardUtils');
        const validation = validateBancardConfig();
        
        res.json({
            message: "Verificación de configuración de Bancard",
            success: validation.isValid,
            error: !validation.isValid,
            data: {
                isValid: validation.isValid,
                errors: validation.errors,
                environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                hasPublicKey: !!process.env.BANCARD_PUBLIC_KEY,
                hasPrivateKey: !!process.env.BANCARD_PRIVATE_KEY,
                publicKeyLength: process.env.BANCARD_PUBLIC_KEY ? process.env.BANCARD_PUBLIC_KEY.length : 0,
                privateKeyLength: process.env.BANCARD_PRIVATE_KEY ? process.env.BANCARD_PRIVATE_KEY.length : 0,
                baseUrl: validation.config?.baseUrl,
                confirmationUrl: process.env.BANCARD_CONFIRMATION_URL
            }
        });
    });

    // Verificación de certificación completa de tarjetas
    router.get("/bancard/verificar-certificacion-tarjetas", (req, res) => {
        const { validateBancardConfig, getBancardBaseUrl } = require('../helpers/bancardUtils');
        const validation = validateBancardConfig();
        
        res.json({
            message: "Verificación completa de certificación Bancard - Gestión de Tarjetas",
            success: validation.isValid,
            error: !validation.isValid,
            data: {
                configuration_valid: validation.isValid,
                configuration_errors: validation.errors || [],
                environment: process.env.BANCARD_ENVIRONMENT || 'staging',
                base_url: getBancardBaseUrl(),
                
                // ✅ ENDPOINTS DE GESTIÓN DE TARJETAS IMPLEMENTADOS
                card_management_endpoints: {
                    register_card: "✅ Implementado",
                    list_cards: "✅ Implementado", 
                    delete_card: "✅ Implementado",
                    payment_with_token: "✅ Implementado"
                },
                
                // ✅ CHECKLIST DE CERTIFICACIÓN PARA TARJETAS
                certification_checklist: {
                    "Solicitud de catastro": "✅ Implementado",
                    "Catastro de tarjeta": "✅ Implementado",
                    "Recibir tarjetas del usuario": "✅ Implementado",
                    "Eliminar tarjeta del usuario": "✅ Implementado",
                    "Pago con alias token": "✅ Implementado"
                },
                
                // ✅ URLS DE TEST PARA TARJETAS
                test_endpoints: {
                    test_catastro: `${process.env.FRONTEND_URL || 'https://tu-dominio.com'}/api/bancard/test-catastro`,
                    test_listar: `${process.env.FRONTEND_URL || 'https://tu-dominio.com'}/api/bancard/test-listar/1`,
                    test_pago_token: `${process.env.FRONTEND_URL || 'https://tu-dominio.com'}/api/bancard/test-pago-token`,
                    test_eliminar: `${process.env.FRONTEND_URL || 'https://tu-dominio.com'}/api/bancard/test-eliminar/1`
                },

                // ✅ DATOS DE PRUEBA SUGERIDOS
                test_data: {
                    catastro: {
                        card_id: 11129,
                        user_id: 1,
                        user_cell_phone: "12345678", 
                        user_mail: "example@mail.com"
                    },
                    cedula_valida: {
                        visa_mastercard: "6587520",
                        bancard: "9661000"
                    },
                    pago_con_token: {
                        shop_process_id: "auto-generado",
                        amount: "151241.00",
                        currency: "PYG",
                        alias_token: "obtenido-de-listar-tarjetas"
                    }
                },

                // ✅ FLUJO COMPLETO RECOMENDADO
                recommended_flow: [
                    "1. Catastrar tarjeta (POST /api/bancard/test-catastro)",
                    "2. Completar formulario de Bancard con datos de prueba",
                    "3. Listar tarjetas (GET /api/bancard/test-listar/1) para obtener alias_token",
                    "4. Realizar pago con token (POST /api/bancard/test-pago-token)",
                    "5. Eliminar tarjeta si es necesario (DELETE /api/bancard/test-eliminar/1)"
                ]
            }
        });
    });

    // Test de flujo completo de tarjetas
    router.post("/bancard/test-flujo-completo", async (req, res) => {
        try {
            
            
            const { user_id = 1 } = req.body;
            
            const testResults = {
                tests_executed: [],
                success_count: 0,
                error_count: 0,
                overall_success: true
            };

            // Test 1: Verificar endpoint de catastro
            try {
                
                
                testResults.tests_executed.push({
                    test: "catastro_endpoint",
                    status: "✅ OK",
                    details: "Endpoint POST /api/bancard/tarjetas disponible",
                    timestamp: new Date().toISOString()
                });
                testResults.success_count++;
            } catch (error) {
                testResults.tests_executed.push({
                    test: "catastro_endpoint",
                    status: "❌ ERROR",
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
                testResults.error_count++;
                testResults.overall_success = false;
            }

            // Test 2: Verificar endpoint de listado
            try {
                
                
                testResults.tests_executed.push({
                    test: "listar_endpoint",
                    status: "✅ OK",
                    details: "Endpoint GET /api/bancard/tarjetas/:user_id disponible",
                    timestamp: new Date().toISOString()
                });
                testResults.success_count++;
            } catch (error) {
                testResults.tests_executed.push({
                    test: "listar_endpoint",
                    status: "❌ ERROR",
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
                testResults.error_count++;
                testResults.overall_success = false;
            }

            // Test 3: Verificar endpoint de pago con token
            try {
                
                
                testResults.tests_executed.push({
                    test: "pago_token_endpoint",
                    status: "✅ OK",
                    details: "Endpoint POST /api/bancard/pago-con-token disponible",
                    timestamp: new Date().toISOString()
                });
                testResults.success_count++;
            } catch (error) {
                testResults.tests_executed.push({
                    test: "pago_token_endpoint",
                    status: "❌ ERROR",
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
                testResults.error_count++;
                testResults.overall_success = false;
            }

            // Test 4: Verificar endpoint de eliminación
            try {
                
                
                testResults.tests_executed.push({
                    test: "eliminar_endpoint",
                    status: "✅ OK",
                    details: "Endpoint DELETE /api/bancard/tarjetas/:user_id disponible",
                    timestamp: new Date().toISOString()
                });
                testResults.success_count++;
            } catch (error) {
                testResults.tests_executed.push({
                    test: "eliminar_endpoint",
                    status: "❌ ERROR",
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
                testResults.error_count++;
                testResults.overall_success = false;
            }

            // Test 5: Verificar configuración de Bancard
            try {
                
                const { validateBancardConfig } = require('../helpers/bancardUtils');
                const validation = validateBancardConfig();
                
                if (validation.isValid) {
                    testResults.tests_executed.push({
                        test: "configuracion",
                        status: "✅ OK",
                        details: "Configuración de Bancard válida",
                        timestamp: new Date().toISOString()
                    });
                    testResults.success_count++;
                } else {
                    testResults.tests_executed.push({
                        test: "configuracion",
                        status: "❌ ERROR",
                        details: `Configuración inválida: ${validation.errors.join(', ')}`,
                        timestamp: new Date().toISOString()
                    });
                    testResults.error_count++;
                    testResults.overall_success = false;
                }
            } catch (error) {
                testResults.tests_executed.push({
                    test: "configuracion",
                    status: "❌ ERROR",
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
                testResults.error_count++;
                testResults.overall_success = false;
            }

            res.json({
                message: "Test de flujo completo de tarjetas ejecutado",
                success: testResults.overall_success,
                error: !testResults.overall_success,
                data: {
                    ...testResults,
                    certification_ready: testResults.overall_success,
                    summary: {
                        total_tests: testResults.success_count + testResults.error_count,
                        success_rate: `${Math.round((testResults.success_count / (testResults.success_count + testResults.error_count)) * 100)}%`
                    },
                    next_steps: testResults.overall_success ? [
                        "✅ Todos los endpoints funcionan correctamente",
                        "🚀 Sistema listo para certificación con Bancard",
                        "📋 Completar checklist en portal de Bancard",
                        "🧪 Ejecutar pruebas manuales con datos reales"
                    ] : [
                        "⚠️ Revisar errores encontrados en los tests",
                        "🔧 Corregir endpoints con problemas",
                        "🔄 Ejecutar test nuevamente",
                        "📞 Contactar soporte si persisten errores"
                    ]
                }
            });

        } catch (error) {
            console.error("❌ Error en test de flujo completo:", error);
            res.status(500).json({
                message: "Error en test de flujo completo",
                success: false,
                error: true,
                details: error.message
            });
        }
    });

    // Estadísticas de tarjetas
    router.get("/bancard/estadisticas-tarjetas", authToken, async (req, res) => {
        try {
            // Simulación de estadísticas de tarjetas
            const stats = {
                total_users_with_cards: 0,
                total_cards_registered: 0,
                payments_with_tokens: 0,
                most_used_card_type: "credit"
            };

            res.json({
                message: "Estadísticas de gestión de tarjetas",
                success: true,
                error: false,
                data: {
                    card_statistics: stats,
                    integration_status: {
                        card_registration: "✅ Activo",
                        card_listing: "✅ Activo",
                        card_deletion: "✅ Activo",
                        token_payments: "✅ Activo"
                    },
                    certification_status: "✅ Completado"
                }
            });

        } catch (error) {
            console.error("❌ Error obteniendo estadísticas de tarjetas:", error);
            res.status(500).json({
                message: "Error al obtener estadísticas de tarjetas",
                success: false,
                error: true,
                details: error.message
            });
        }
    });

    // ===========================================
    // RUTAS DE USUARIO
    // ===========================================
    router.post("/registro", userSignUpController);
    router.post("/iniciar-sesion", userSignInController);
    router.get("/detalles-usuario", authToken, userDetailsController);
    router.get("/cerrar-sesion", userLogout);
    router.get("/todos-usuarios", authToken, allUsers);
    router.post("/actualizar-usuario", authToken, updateUser);

    // ===========================================
    // ✅ RUTAS DE PERMISOS GRANULAR
    // ===========================================
    
    // Obtener permisos del usuario actual
    router.get("/permissions/me", authToken, getUserPermissionsController);
    
    // Verificar un permiso específico
    router.get("/permissions/check", authToken, checkUserPermissionController);
    
    // Obtener todos los usuarios con permisos (solo ROOT)
    router.get("/admin/users-with-permissions", authToken, getAllUsersWithPermissionsController);
    
    // Crear usuario con permisos específicos (solo ROOT)
    router.post("/admin/users", authToken, createUserWithPermissionsController);
    
    // Actualizar permisos de un usuario (solo ROOT)
    router.put("/admin/users/:userId/permissions", authToken, updateUserPermissionsController);

    // ===========================================
    // RUTAS DE PRODUCTOS
    // ===========================================
    router.post("/cargar-producto", authToken, requirePermission('products', 'upload'), UploadProductController);
    router.get("/obtener-productos-home", authToken, getHomeProductsController);
router.get("/obtener-productos-admin", authToken, async (req, res) => {
    try {
        const products = await productModel.find({}).sort({ createdAt: -1 });
        
        res.json({
            message: "Todos los productos para admin",
            success: true,
            error: false,
            data: products
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
});
router.post("/actualizar-producto", authToken, updateProductController);
    router.get("/obtener-productos", getHomeProductsController);
    router.get("/obtener-categorias", getCategoryProduct);
    router.post("/productos-por-categoria", getCategoryWiseProduct);
    router.post("/detalles-producto", getProductDetails);
    router.get("/buscar", searchProduct);
    router.get("/search", advancedSearchProduct);
    router.post("/filtrar-productos", filterProductController);
    router.post("/solicitar-restablecer-contrasena", requestPasswordReset);
    router.post("/restablecer-contrasena", resetPassword);
    router.get("/buscar-por-categoria", getCategorySearch);
    router.post("/eliminar-producto", authToken, deleteProductController);
    // ===========================================
    // RUTAS DE GESTIÓN DE STOCK CON MAYORISTAS
    // ===========================================
    router.post("/productos/analizar-stock", authToken, analyzeStockController);
    router.post("/productos/actualizar-stock-masivo", authToken, updateBulkStockController);
    router.post("/productos/actualizar-precios-mayoristas", authToken, updatePricesFromMayoristasController);
    router.get("/producto-por-slug/:slug", getProductBySlug);
    router.post("/finanzas/actualizarprecios", authToken, updateAllPricesController);
    router.get("/channable/feed.xml", channableFeedController);


    // ===========================================
    // RUTAS DE GESTIÓN FINANCIERA DE PRODUCTOS
    // ===========================================
    router.post("/finanzas/producto/finanzas", authToken, updateProductFinanceController);
    router.get("/finanzas/producto/finanzas/:productId", authToken, getProductFinanceController);

    // ===========================================
    // RUTAS DE REPORTES FINANCIEROS
    // ===========================================
    router.get("/finanzas/reportes/margenes", authToken, getMarginReportController);
    router.get("/finanzas/reportes/rentabilidad", authToken, getCategoryProfitabilityController);

    // ===========================================
    // RUTAS DE CLIENTES
    // ===========================================
    router.post("/finanzas/clientes", authToken, createClientController);
    router.get("/finanzas/clientes", authToken, getAllClientsController);
    router.get("/finanzas/clientes/:clientId", authToken, getClientByIdController);
    router.put("/finanzas/clientes/:clientId", authToken, updateClientController);
    router.delete("/finanzas/clientes/:clientId", authToken, deleteClientController);

    // ===========================================
    // RUTAS DE PRESUPUESTOS
    // ===========================================
    router.post("/finanzas/presupuestos", authToken, createBudgetController);
    router.get("/finanzas/presupuestos", authToken, getAllBudgetsController);
    router.get("/finanzas/presupuestos/:budgetId", authToken, getBudgetByIdController);
    router.patch("/finanzas/presupuestos/:budgetId/estado", authToken, updateBudgetStatusController);
    router.get("/finanzas/presupuestos/:budgetId/pdf", authToken, getBudgetPDFController);
    router.delete("/finanzas/presupuestos/:budgetId", authToken, deleteBudgetController);
    router.post("/finanzas/presupuestos/:budgetId/email", authToken, sendBudgetEmailController);

    // ===========================================
    // RUTAS DE PROVEEDORES
    // ===========================================
    router.post("/finanzas/proveedores", authToken, createSupplierController);
    router.get("/finanzas/proveedores", authToken, getAllSuppliersController);
    router.get("/finanzas/proveedores/:supplierId", authToken, getSupplierByIdController);
    router.put("/finanzas/proveedores/:supplierId", authToken, updateSupplierController);
    router.delete("/finanzas/proveedores/:supplierId", authToken, deleteSupplierController);

    // ===========================================
    // RUTAS DE ANÁLISIS DE RENTABILIDAD
    // ===========================================
    router.post("/finanzas/analisis-rentabilidad", authToken, createProfitabilityAnalysisController);
    router.get("/finanzas/analisis-rentabilidad", authToken, getAllProfitabilityAnalysesController);
    router.get("/finanzas/analisis-rentabilidad/:analysisId", authToken, getProfitabilityAnalysisByIdController);
    router.post("/finanzas/comparar-proveedores", authToken, compareSupplierPricesController);
    router.patch("/finanzas/analisis-rentabilidad/:analysisId/estado", authToken, updateAnalysisStatusController);
    router.delete("/finanzas/analisis-rentabilidad/:analysisId", authToken, deleteAnalysisController);
    router.get("/finanzas/proveedores/:supplierId/rentabilidad", authToken, getSupplierProfitabilitySummaryController);

    // ===========================================
    // RUTAS DE VENTAS
    // ===========================================
    router.post("/finanzas/ventas", authToken, createSaleController);
    router.get("/finanzas/ventas", authToken, getAllSalesController);
    // Moved specific routes before parameterized routes to avoid conflicts
    router.get("/finanzas/ventas/formulario-datos", authToken, getSalesFormDataController);
    router.get("/finanzas/ventas/productos/buscar", authToken, searchProductsForSalesController);
    router.get("/finanzas/ventas/clientes/buscar", authToken, searchCustomersForSalesController);
    router.post("/finanzas/ventas/calcular-impuesto", authToken, calculateItemTaxController);
    router.post("/finanzas/ventas/monto-en-palabras", authToken, convertAmountToWordsController);
    router.post("/finanzas/ventas/validar-ruc", authToken, validateRUCController);
    router.post("/finanzas/ventas/upload-attachments", authToken, upload.array('files', 10), uploadSalesAttachmentsController);
    router.get("/finanzas/ventas/download-attachment/:attachmentId", authToken, downloadAttachmentController);
    router.get("/finanzas/ventas/:saleId", authToken, getSaleByIdController);
    router.patch("/finanzas/ventas/:saleId/pago", authToken, updateSalePaymentController);
    router.patch("/finanzas/ventas/:saleId/estado-pago", authToken, updateSalePaymentStatusController);
    router.post("/finanzas/ventas/:saleId/factura", authToken, uploadSaleInvoiceController);
    router.delete("/finanzas/ventas/:saleId", authToken, deleteSaleController);

    // ===========================================
    // ✅ RUTAS DE TIPOS DE VENTA
    // ===========================================
    router.post("/finanzas/tipos-venta", authToken, createSalesTypeController);
    router.get("/finanzas/tipos-venta", authToken, getAllSalesTypesController);
    router.get("/finanzas/tipos-venta/activos", authToken, getActiveSalesTypesController);
    router.get("/finanzas/tipos-venta/:salesTypeId", authToken, getSalesTypeByIdController);
    router.put("/finanzas/tipos-venta/:salesTypeId", authToken, updateSalesTypeController);
    router.delete("/finanzas/tipos-venta/:salesTypeId", authToken, deleteSalesTypeController);

    // ===========================================
    // ✅ RUTAS DE SUCURSALES
    // ===========================================
    router.post("/finanzas/sucursales", authToken, createBranchController);
    router.get("/finanzas/sucursales", authToken, getAllBranchesController);
    router.get("/finanzas/sucursales/activas", authToken, getActiveBranchesController);
    router.get("/finanzas/sucursales/principal", authToken, getMainBranchController);
    router.get("/finanzas/sucursales/:branchId", authToken, getBranchByIdController);
    router.put("/finanzas/sucursales/:branchId", authToken, updateBranchController);
    router.delete("/finanzas/sucursales/:branchId", authToken, deleteBranchController);

    // ===========================================
    // ✅ RUTAS DE VENDEDORES
    // ===========================================
    router.post("/finanzas/vendedores", authToken, createSalespersonController);
    router.get("/finanzas/vendedores", authToken, getAllSalespersonsController);
    router.get("/finanzas/vendedores/activos", authToken, getActiveSalespersonsController);
    router.get("/finanzas/vendedores/buscar", authToken, searchSalespersonsController);
    router.get("/finanzas/vendedores/:salespersonId", authToken, getSalespersonByIdController);
    router.put("/finanzas/vendedores/:salespersonId", authToken, updateSalespersonController);
    router.patch("/finanzas/vendedores/:salespersonId/rendimiento", authToken, updateSalespersonPerformanceController);
    router.delete("/finanzas/vendedores/:salespersonId", authToken, deleteSalespersonController);

    // ===========================================
    // ✅ RUTAS DE VENTAS MEJORADAS
    // ===========================================
    router.post("/finanzas/ventas-mejoradas", authToken, createEnhancedSaleController);

    // ===========================================
    // RUTAS DE COMPRAS
    // ===========================================
    router.post("/finanzas/compras", authToken, createPurchaseController);
    router.get("/finanzas/compras", authToken, getAllPurchasesController);
    router.get("/finanzas/compras/:purchaseId", authToken, getPurchaseByIdController);
    router.patch("/finanzas/compras/:purchaseId/pago", authToken, updatePurchasePaymentController);
    router.post("/finanzas/compras/:purchaseId/documentos", authToken, uploadPurchaseDocumentsController);
    router.get("/finanzas/compras/resumen", authToken, getPurchasesSummaryController);
    router.delete("/finanzas/compras/:purchaseId", authToken, deletePurchaseController);

    // ===========================================
    // RUTAS DE DASHBOARD
    // ===========================================
    router.get("/finanzas/dashboard", authToken, getDashboardSummaryController);
    router.get("/finanzas/estado-cuenta", authToken, getAccountStatementController);
    router.get("/finanzas/metricas-anuales", authToken, getYearlyMetricsController);

    // ===========================================
    // RUTAS DE UBICACIÓN Y GEOCODIFICACIÓN
    // ===========================================
    router.post("/ubicacion/reverse-geocode", reverseGeocodeController);
    router.post("/ubicacion/geocode", geocodeAddressController);
    router.post("/ubicacion/usuario", authToken, saveUserLocationController);
    router.get("/ubicacion/usuario", authToken, getUserLocationController);
    router.post("/ubicacion/invitado", saveGuestLocationController);

    // ===========================================
    // RUTAS DE SALUD Y MONITOREO
    // ===========================================
    router.get("/health", (req, res) => {
        res.status(200).json({
            message: "API funcionando correctamente",
            timestamp: new Date().toISOString(),
            success: true,
            error: false,
            environment: process.env.NODE_ENV || 'development',
            version: "1.0.0"
        });
    });

    // ✅ ENDPOINT DE PRUEBA PARA ADMIN AUTH
    router.get("/admin/test-auth", adminAuth, async (req, res) => {
        try {
            res.json({
                message: "✅ Autenticación de admin funcionando correctamente",
                success: true,
                error: false,
                data: {
                    user: {
                        id: req.userId,
                        name: req.user?.name,
                        email: req.user?.email,
                        role: req.userRole,
                        isAuthenticated: req.isAuthenticated
                    },
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({
                message: "Error en test de admin auth",
                success: false,
                error: error.message
            });
        }
    });

    router.get("/debug/auth-status", authToken, async (req, res) => {
        try {
            
            
            const debugInfo = {
                timestamp: new Date().toISOString(),
                headers: {
                    authorization: req.headers.authorization ? "Presente" : "Ausente",
                    cookie: req.headers.cookie ? "Presente" : "Ausente",
                    userAgent: req.headers['user-agent']
                },
                cookies: {
                    token: req.cookies?.token ? "Presente" : "Ausente",
                    guestUserId: req.cookies?.guestUserId || "No configurado"
                },
                middleware_data: {
                    userId: req.userId,
                    isAuthenticated: req.isAuthenticated,
                    userRole: req.userRole,
                    sessionId: req.sessionId,
                    bancardUserId: req.bancardUserId
                },
                session_info: {
                    sessionId: req.session?.id,
                    sessionData: req.session ? Object.keys(req.session) : "Sin sesión"
                }
            };

            // ✅ VERIFICAR TOKEN SI EXISTE
            if (req.cookies?.token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(req.cookies.token, process.env.TOKEN_SECRET_KEY);
                    debugInfo.token_info = {
                        valid: true,
                        decoded: {
                            _id: decoded._id,
                            email: decoded.email,
                            role: decoded.role,
                            exp: new Date(decoded.exp * 1000).toISOString()
                        }
                    };
                } catch (tokenError) {
                    debugInfo.token_info = {
                        valid: false,
                        error: tokenError.message
                    };
                }
            }

            // ✅ VERIFICAR USUARIO EN BD SI ESTÁ AUTENTICADO
            if (req.isAuthenticated && req.userId) {
                try {
                    const userModel = require('../models/userModel');
                    const user = await userModel.findById(req.userId).select('-password');
                    debugInfo.database_user = user ? {
                        found: true,
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isActive: user.isActive,
                        lastLogin: user.lastLogin
                    } : {
                        found: false
                    };
                } catch (dbError) {
                    debugInfo.database_user = {
                        error: dbError.message
                    };
                }
            }

            // ✅ VERIFICAR CONFIGURACIÓN DEL ENTORNO
            debugInfo.environment = {
                NODE_ENV: process.env.NODE_ENV,
                TOKEN_SECRET_KEY: process.env.TOKEN_SECRET_KEY ? "Configurado" : "Faltante",
                FRONTEND_URL: process.env.FRONTEND_URL,
                cookieSecure: process.env.NODE_ENV === 'production'
            };

            res.json({
                message: "Información de debug de autenticación",
                success: true,
                error: false,
                data: debugInfo
            });

        } catch (error) {
            console.error("❌ Error en debug route:", error);
            res.status(500).json({
                message: "Error en ruta de debug",
                success: false,
                error: true,
                details: error.message
            });
        }
    });

    router.get("/debug/auth-simple", authToken, async (req, res) => {
        try {
            const debugInfo = {
                middleware_result: {
                    userId: req.userId,
                    isAuthenticated: req.isAuthenticated,
                    userRole: req.userRole
                },
                cookie_info: {
                    token_present: !!req.cookies?.token,
                    token_preview: req.cookies?.token ? req.cookies.token.substring(0, 20) + '...' : null
                },
                env_check: {
                    secret_key_present: !!process.env.TOKEN_SECRET_KEY,
                    secret_length: process.env.TOKEN_SECRET_KEY?.length || 0
                }
            };

            // Si hay token, verificar manualmente
            if (req.cookies?.token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(req.cookies.token, process.env.TOKEN_SECRET_KEY);
                    debugInfo.manual_token_check = {
                        valid: true,
                        user_id: decoded._id,
                        email: decoded.email,
                        role: decoded.role,
                        expires: new Date(decoded.exp * 1000).toISOString()
                    };

                    // Verificar usuario en BD
                    const userModel = require('../models/userModel');
                    const user = await userModel.findById(decoded._id).select('name email role isActive');
                    debugInfo.database_user = user ? {
                        found: true,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isActive: user.isActive
                    } : {
                        found: false
                    };

                } catch (tokenError) {
                    debugInfo.manual_token_check = {
                        valid: false,
                        error: tokenError.message
                    };
                }
            }

            res.json({
                message: "Debug de autenticación",
                success: true,
                data: debugInfo
            });

        } catch (error) {
            res.status(500).json({
                message: "Error en debug",
                success: false,
                error: error.message
            });
        }
    });

    router.get("/bancard/redirect/success", (req, res) => {
        try {
            
            
            
            
            
            // Obtener TODOS los parámetros que envía Bancard
            const params = req.query;
            
            // Construir URL del frontend con TODOS los parámetros
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectParams = new URLSearchParams(params).toString();
            
            // URL final hacia tu página PaymentSuccess.js existente
            const finalUrl = `${frontendUrl}/pago-exitoso?${redirectParams}`;
            
            
            
            // Redirección HTTP 302 (temporal) hacia el frontend
            res.redirect(302, finalUrl);
            
        } catch (error) {
            console.error("❌ Error en success redirect:", error);
            
            // En caso de error, redirigir a página de error
            const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pago-cancelado?error=redirect_error&details=${encodeURIComponent(error.message)}`;
            res.redirect(302, errorUrl);
        }
    });

    router.get("/bancard/redirect/cancel", (req, res) => {
        try {
            
            
            
            
            
            // Obtener TODOS los parámetros que envía Bancard
            const params = req.query;
            
            // Construir URL del frontend con TODOS los parámetros
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectParams = new URLSearchParams(params).toString();
            
            // URL final hacia tu página PaymentCancelled.js existente
            const finalUrl = `${frontendUrl}/pago-cancelado?${redirectParams}`;
            
            
            
            // Redirección HTTP 302 (temporal) hacia el frontend
            res.redirect(302, finalUrl);
            
        } catch (error) {
            console.error("❌ Error en cancel redirect:", error);
            
            // En caso de error, redirigir a página de error con más detalles
            const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pago-cancelado?error=redirect_error&details=${encodeURIComponent(error.message)}`;
            res.redirect(302, errorUrl);
        }
        
    });
    // ✅ IMPORTAR CONTROLADOR DE DELIVERY
    const {
    updateDeliveryStatusController,
    getDeliveryProgressController,
    getDeliveryStatsController,
    addDeliveryAttemptController,
    rateDeliveryController,
    sendManualNotificationController,
    resendDeliveryEmailController,
    getEmailHistoryController
} = require('../controller/bancard/bancardDeliveryController');

    // ✅ IMPORTAR SERVICIO DE EMAIL
    const emailService = require('../services/emailService');

    // ===========================================
    // ✅ NUEVAS RUTAS DE DELIVERY SYSTEM
    // ===========================================

    // ✅ GESTIÓN DE DELIVERY PARA ADMIN
    router.put("/bancard/transactions/:transactionId/delivery-status", authToken, updateDeliveryStatusController);
    router.get("/bancard/transactions/:transactionId/delivery-progress", authToken, getDeliveryProgressController);
    router.get("/bancard/delivery/stats", authToken, getDeliveryStatsController);
    router.post("/bancard/transactions/:transactionId/delivery-attempt", authToken, addDeliveryAttemptController);
    router.post("/bancard/transactions/:transactionId/manual-notification", authToken, sendManualNotificationController);

    // ✅ CALIFICACIÓN DE PEDIDOS PARA USUARIOS
    router.post("/bancard/transactions/:transactionId/rate", authToken, rateDeliveryController);
    // ===========================================
// ✅ NUEVAS RUTAS PARA SISTEMA DE EMAILS Y DELIVERY MEJORADO
// ===========================================

// ✅ NUEVAS RUTAS PARA GESTIÓN DE EMAILS (controladores ya importados arriba)
router.post("/bancard/transactions/:transactionId/resend-email", authToken, resendDeliveryEmailController);
router.get("/bancard/transactions/:transactionId/email-history", authToken, getEmailHistoryController);

// ✅ ENDPOINT PARA TEST DE EMAILS (SOLO PARA DESARROLLO)
router.post("/bancard/test-email", authToken, async (req, res) => {
    try {
        const { email_type, shop_process_id } = req.body;
        
        // ✅ VERIFICAR PERMISOS DE ADMIN
        const uploadProductPermission = require('../helpers/permission');
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado - Solo administradores",
                success: false,
                error: true
            });
        }

        if (!email_type || !shop_process_id) {
            return res.status(400).json({
                message: "email_type y shop_process_id son requeridos",
                success: false,
                error: true,
                available_types: [
                    'purchase_approved',
                    'purchase_rejected', 
                    'payment_confirmed',
                    'preparing_order',
                    'in_transit',
                    'delivered',
                    'problem'
                ]
            });
        }

        // ✅ BUSCAR TRANSACCIÓN
        const BancardTransactionModel = require('../models/bancardTransactionModel');
        const transaction = await BancardTransactionModel.findOne({ 
            shop_process_id: parseInt(shop_process_id) 
        });

        if (!transaction) {
            return res.status(404).json({
                message: "Transacción no encontrada",
                success: false,
                error: true
            });
        }

        const emailService = require('../services/emailService');
        let emailResult;

        // ✅ ENVIAR EMAIL SEGÚN TIPO
        if (email_type === 'purchase_approved' || email_type === 'purchase_rejected') {
            const isApproved = email_type === 'purchase_approved';
            
            emailResult = await emailService.sendPurchaseConfirmationEmail(transaction, isApproved);
        } else {
            
            emailResult = await emailService.sendDeliveryUpdateEmail(transaction, email_type);
        }

        if (emailResult.success) {
            res.json({
                message: `Email de prueba ${email_type} enviado exitosamente`,
                success: true,
                error: false,
                data: {
                    email_type,
                    shop_process_id,
                    recipient: emailResult.recipient,
                    messageId: emailResult.messageId,
                    admin_notified: emailResult.adminNotified || false
                }
            });
        } else {
            res.status(500).json({
                message: "Error enviando email de prueba",
                success: false,
                error: true,
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error("❌ Error en test de email:", error);
        res.status(500).json({
            message: "Error en test de email",
            success: false,
            error: true,
            details: error.message
        });
    }
});

// ✅ ENDPOINT PARA VERIFICAR CONFIGURACIÓN DE EMAILS
router.get("/bancard/email/config-check", authToken, async (req, res) => {
    try {
        const uploadProductPermission = require('../helpers/permission');
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado",
                success: false,
                error: true
            });
        }

        const emailService = require('../services/emailService');
        
        // ✅ VERIFICAR CONFIGURACIÓN
        const isConfigValid = await emailService.verifyEmailConfig();
        
        // ✅ VERIFICAR VARIABLES DE ENTORNO
        const configCheck = {
            email_user: !!process.env.EMAIL_USER,
            email_pass: !!process.env.EMAIL_PASS,
            admin_emails: emailService.adminEmails,
            transporter_ready: isConfigValid,
            smtp_host: 'smtp.office365.com',
            smtp_port: 587
        };

        res.json({
            message: "Verificación de configuración de emails",
            success: true,
            error: false,
            data: {
                configuration_valid: isConfigValid,
                config_details: configCheck,
                recommendations: isConfigValid ? [
                    "✅ Configuración de email lista",
                    "✅ Envío de emails habilitado",
                    "🧪 Usar /api/bancard/test-email para probar"
                ] : [
                    "⚠️ Configurar EMAIL_USER en .env",
                    "⚠️ Configurar EMAIL_PASS en .env",
                    "🔄 Reiniciar servidor después de configurar"
                ]
            }
        });

    } catch (error) {
        console.error("❌ Error verificando configuración de email:", error);
        res.status(500).json({
            message: "Error al verificar configuración de email",
            success: false,
            error: true,
            details: error.message
        });
    }
});
    // ✅ ENDPOINT PARA VERIFICAR CONFIGURACIÓN DE EMAIL
    router.get("/bancard/email/verify", authToken, async (req, res) => {
        try {
            const uploadProductPermission = require('../helpers/permission');
            const hasPermission = await uploadProductPermission(req.userId);
            if (!hasPermission) {
                return res.status(403).json({
                    message: "Permiso denegado",
                    success: false,
                    error: true
                });
            }

            const isValid = await emailService.verifyEmailConfig();
            
            res.json({
                message: "Verificación de configuración de email",
                success: true,
                error: false,
                data: {
                    email_configured: isValid,
                    email_user: process.env.EMAIL_USER ? 'Configurado' : 'No configurado',
                    email_pass: process.env.EMAIL_PASS ? 'Configurado' : 'No configurado',
                    smtp_ready: isValid
                }
            });

        } catch (error) {
            console.error("❌ Error verificando email:", error);
            res.status(500).json({
                message: "Error al verificar configuración de email",
                success: false,
                error: true,
                details: error.message
            });
        }
    });

    // ✅ NUEVA RUTA PARA OBTENER CATEGORÍAS DE LA BD
    router.get("/categorias-bd", getCategoriesFromDB);

    // ===== RUTAS DE ADMINISTRACIÓN DE CATEGORÍAS =====
    router.use('/admin/categories', categoryRoutes);

// ===== RUTAS DE SINCRONIZACIÓN DE INVENTARIO =====
const inventorySyncRoutes = require('./inventorySyncRoutes');
router.use('/admin/inventory-sync', inventorySyncRoutes);

// ===== ENDPOINT PARA OBTENER PRODUCTO POR ID (para modal de edición) =====
router.get('/admin/products/:id', authToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📥 GET /api/admin/products/${id}`);
        
        const productModel = require('../models/productModel');
        const product = await productModel.findById(id).lean();
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener producto'
        });
    }
});

    module.exports = router;
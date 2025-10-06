import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Context from '../context';
import displayINRCurrency from '../helpers/displayCurrency';
import { MdDelete, MdShoppingCart, MdDownload, MdWhatsapp } from "react-icons/md";
import { FaArrowLeft, FaTrash, FaCreditCard, FaUser, FaLock, FaShieldAlt, FaPlus, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logo from '../helpers/logo.png';
import { toast } from 'react-toastify';
import { localCartHelper } from '../helpers/addToCart';
import BancardPayButton from '../components/BancardPayButton';
import SummaryApi from '../common';
import { trackWhatsAppContact, trackPDFDownload, trackInitiateCheckout } from '../components/MetaPixelTracker';


const Cart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [customerData, setCustomerData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [paymentMode, setPaymentMode] = useState(''); // 'guest', 'register', 'saved_cards'
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [registeredCards, setRegisteredCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loadingCards, setLoadingCards] = useState(false);
    
    const context = useContext(Context);
    const navigate = useNavigate();
   
    // ✅ OBTENER USUARIO DEL STORE
    const user = useSelector(state => state?.user?.user);
    const isLoggedIn = !!user;

    // ✅ FUNCIÓN PARA VERIFICAR PRODUCTOS VÁLIDOS (MOVIDA AL INICIO)
    const isValidProduct = (product) => {
        return product && product.productId && 
               typeof product.productId === 'object' &&
               product.productId.productImage &&
               Array.isArray(product.productId.productImage) &&
               product.productId.productImage.length > 0;
    };

    // Función simplificada para cargar datos directamente desde localStorage
    const fetchData = () => {
        try {
            setLoading(true);
            const cartItems = localCartHelper.getCart();
            
            setData(cartItems);
        } catch (error) {
            console.error('Error al cargar productos del carrito:', error);
            toast.error('Error al cargar el carrito');
        } finally {
            setLoading(false);
        }
    };

    // ✅ CARGAR TARJETAS GUARDADAS SI EL USUARIO ESTÁ LOGUEADO
    const fetchUserCards = useCallback(async () => {
       if (!isLoggedIn || !user?.bancardUserId) return;

       
       
       
       setLoadingCards(true);
       try {
           // ✅ VERIFICAR LA URL COMPLETA
           const url = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/api/bancard/tarjetas/${user.bancardUserId}`;
           
           
           const response = await fetch(url, {
               method: 'GET',
               credentials: 'include',
               headers: {
                   'Content-Type': 'application/json'
               }
           });

           
           
           if (!response.ok) {
               throw new Error(`HTTP error! status: ${response.status}`);
           }

           const result = await response.json();
           
           
           if (result.success && result.data?.cards) {
               
               setRegisteredCards(result.data.cards);
           } else {
               
               setRegisteredCards([]);
           }
       } catch (error) {
           console.error('❌ Error cargando tarjetas:', error);
           setRegisteredCards([]);
       } finally {
           setLoadingCards(false);
       }
    }, [isLoggedIn, user?.bancardUserId]); // ✅ REMOVER loadingCards de dependencias

    // Calcular cantidad total de productos
    const totalQty = data.reduce((previousValue, currentValue) => 
        previousValue + currentValue.quantity, 0);

    // Calcular precio total
    const totalPrice = data.reduce((prev, curr) => {
        if (curr?.productId?.sellingPrice) {
            return prev + (curr.quantity * curr.productId.sellingPrice);
        }
        return prev;
    }, 0);

    // Definir validProducts (AHORA DESPUÉS DE isValidProduct)
    const validProducts = data.filter(isValidProduct);

    // ✅ FUNCIÓN PARA CAPTURAR DATOS DE TRACKING
    const captureTrackingData = useCallback(() => {
        // ✅ CONVERTIR ADDRESS A STRING SI ES OBJETO
        const getAddressString = (address) => {
            if (!address) return '';
            
            if (typeof address === 'string') {
                return address;
            }
            
            if (typeof address === 'object') {
                // Si es un objeto, convertirlo a string legible
                const parts = [];
                if (address.street) parts.push(address.street);
                if (address.city) parts.push(address.city);
                if (address.state && address.state !== address.city) parts.push(address.state);
                if (address.zipCode) parts.push(address.zipCode);
                if (address.country) parts.push(address.country);
                return parts.join(', ');
            }
            
            return String(address);
        };

        return {
            user_agent: navigator.userAgent,
            device_type: window.innerWidth < 768 ? 'mobile' : 
                         window.innerWidth < 1024 ? 'tablet' : 'desktop',
            referrer_url: document.referrer || 'direct',
            payment_session_id: sessionStorage.getItem('payment_session') || 
                                `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cart_total_items: totalQty,
            order_notes: String(getAddressString(customerData.address) || ''),// ✅ CONVERTIR A STRING
            delivery_method: 'pickup',
            invoice_number: `INV-${Date.now()}`,
            tax_amount: (totalPrice * 0.1).toFixed(2),
            utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
            utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
            utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || ''
        };
    }, [totalQty, totalPrice, customerData.address]);

    // Cargar datos al montar el componente
    // ✅ FUNCIÓN PARA CARGAR UBICACIÓN GUARDADA DEL USUARIO
    const loadUserSavedLocation = async () => {
        if (!isLoggedIn) return;
        
        try {
            const response = await fetch(SummaryApi.location.getUserLocation.url, {
                method: 'GET',
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success && result.data) {
                // ✅ GUARDAR EN EL ESTADO DEL USUARIO PARA FÁCIL ACCESO
                user.savedLocation = result.data;
                
            }
        } catch (error) {
            console.warn('Error cargando ubicación del usuario:', error);
        }
    };

    useEffect(() => {
        
        fetchData();
        
        if (isLoggedIn && user?.bancardUserId) {
            
            fetchUserCards();
            loadUserSavedLocation(); // ✅ CARGAR UBICACIÓN GUARDADA
            // Pre-llenar datos del usuario si está logueado
            setCustomerData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || ''
            });
        } else {
            
        }
    }, [isLoggedIn, user?.bancardUserId, fetchUserCards]);

    // Aumentar cantidad de producto
    const increaseQty = (id, qty) => {
        try {
            if (localCartHelper.updateQuantity(id, qty + 1)) {
                fetchData();
                toast.success('Cantidad actualizada');
            }
        } catch (error) {
            console.error('Error al aumentar cantidad:', error);
            toast.error('Error al actualizar cantidad');
        }
    };

    // Disminuir cantidad de producto
    const decreaseQty = (id, qty) => {
        if (qty < 2) return;
        
        try {
            if (localCartHelper.updateQuantity(id, qty - 1)) {
                fetchData();
                toast.success('Cantidad actualizada');
            }
        } catch (error) {
            console.error('Error al disminuir cantidad:', error);
            toast.error('Error al actualizar cantidad');
        }
    };

    // Eliminar producto del carrito
    const deleteCartProduct = (id) => {
        try {
            localCartHelper.removeItem(id);
            fetchData();
            
            if (context.fetchUserAddToCart) {
                context.fetchUserAddToCart();
            }
            
            toast.success('Producto eliminado del carrito');
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            toast.error('Error al eliminar producto');
        }
    };

    // Limpiar todo el carrito
    const clearCart = () => {
        try {
            localCartHelper.clearCart();
            fetchData();
            
            if (context.fetchUserAddToCart) {
                context.fetchUserAddToCart();
            }
            
            toast.success('Carrito limpiado correctamente');
        } catch (error) {
            console.error('Error al limpiar el carrito:', error);
            toast.error('Error al limpiar el carrito');
        }
    };

    // ✅ FUNCIONES PARA BANCARD
    const handlePaymentStart = () => {
        
        toast.info('Iniciando proceso de pago...');
    };

    const handlePaymentSuccess = (paymentData) => {
        
        toast.success('Redirigiendo a Bancard...');
        
        sessionStorage.setItem('payment_in_progress', JSON.stringify({
            ...paymentData,
            customer: customerData,
            timestamp: Date.now()
        }));
    };

    const handlePaymentError = (error) => {
        console.error('Error en el pago:', error);
        toast.error('Error al procesar el pago. Intenta nuevamente.');
    };

    const handlePayWithSavedCard = async () => {
        if (!selectedCard || !isLoggedIn) {
            toast.error('Selecciona una tarjeta para continuar');
            return;
        }

        if (!hasValidCustomerDataForPayment()) {
            toast.error('Por favor completa todos los datos requeridos');
            return;
        }

        try {
            
            
            const trackingData = captureTrackingData();
            
            const paymentData = {
                amount: totalPrice.toFixed(2),
                currency: 'PYG',
                alias_token: selectedCard.alias_token,
                number_of_payments: 1,
                description: `Compra Zenn - ${validProducts.length} productos`,
                
                customer_info: {
                    name: customerData.name,
                    email: customerData.email,
                    phone: customerData.phone,
                    address: customerData.address
                },
                
                items: validProducts.map(product => ({
                    product_id: product.productId._id,
                    name: product.productId.productName,
                    quantity: product.quantity,
                    unitPrice: product.productId.sellingPrice,
                    unit_price: product.productId.sellingPrice,
                    total: product.quantity * product.productId.sellingPrice,
                    category: product.productId.category,
                    brand: product.productId.brandName
                })),
                
                user_type: 'REGISTERED',
                payment_method: 'saved_card',
                user_bancard_id: user.bancardUserId,
                ip_address: '',
                user_agent: trackingData.user_agent,
                payment_session_id: trackingData.payment_session_id,
                device_type: trackingData.device_type,
                cart_total_items: trackingData.cart_total_items,
                referrer_url: trackingData.referrer_url,
                order_notes: trackingData.order_notes,
                delivery_method: trackingData.delivery_method,
                invoice_number: trackingData.invoice_number,
                tax_amount: trackingData.tax_amount,
                utm_source: trackingData.utm_source,
                utm_medium: trackingData.utm_medium,
                utm_campaign: trackingData.utm_campaign,
                
                additional_data: JSON.stringify({
                    user_id: user._id,
                    bancard_user_id: user.bancardUserId,
                    card_brand: selectedCard.card_brand,
                    card_masked: selectedCard.card_masked_number,
                    source: 'saved_card_payment',
                    total_amount_formatted: displayINRCurrency(totalPrice)
                })
            };

            console.log('📤 Enviando datos de pago con tarjeta guardada:', {
                ...paymentData,
                alias_token: `${paymentData.alias_token.substring(0, 20)}...`,
                items: paymentData.items.length
            });

            toast.info('Procesando pago con tarjeta guardada...');

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/pago-con-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(paymentData)
            });

            
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`Error HTTP ${response.status}`);
            }

            const result = await response.json();
            
            
            if (result.success) {
                if (result.requires3DS) {
                    
                    toast.info('🔐 Verificación 3DS requerida');
                    
                    if (result.data?.iframe_url) {
                        
                        
                        sessionStorage.setItem('bancard_payment', JSON.stringify({
                            shop_process_id: result.data.shop_process_id,
                            process_id: result.data.process_id || result.data.bancard_process_id,
                            amount: totalPrice,
                            customer: customerData,
                            requires3DS: true,
                            timestamp: Date.now()
                        }));
                        
                        window.open(result.data.iframe_url, '_blank', 'width=800,height=600');
                        
                        toast.success('Ventana de verificación 3DS abierta');
                    } else {
                        toast.warning('Verificación 3DS requerida pero no se recibió URL');
                    }
               } else {
                // ✅ VERIFICAR SI EL PAGO FUE REALMENTE EXITOSO - CORREGIDO
                const responseData = result.data?.operation || result.data?.confirmation || result.data;
                const isApproved = (responseData?.response === 'S' && responseData?.response_code === '00') || 
                                result.data?.transaction_approved === true;

                console.log('🔍 Verificando estado del pago:', {
                    responseData: responseData ? {
                        response: responseData.response,
                        response_code: responseData.response_code,
                        authorization_number: responseData.authorization_number
                    } : null,
                    transaction_approved: result.data?.transaction_approved,
                    isApproved
                });

                if (isApproved) {
                    
                    toast.success('✅ Pago procesado exitosamente');
                    
                    setTimeout(() => {
                        localCartHelper.clearCart();
                        navigate('/pago-exitoso?shop_process_id=' + (result.data.shop_process_id || Date.now()));
                    }, 1500);
                } else {
                    
                    toast.error(`Pago rechazado: ${responseData?.response_description || 'Error desconocido'}`);
                }
            }
            } else {
                console.error('❌ Error en el pago:', result);
                toast.error(result.message || 'Error en el pago');
            }
        } catch (error) {
            console.error('❌ Error crítico:', error);
            toast.error('Error de conexión al procesar el pago');
        }
    };

    // Función para verificar si hay datos de cliente válidos para el pago
    // Función para verificar si hay datos de cliente válidos para el pago
    const hasValidCustomerDataForPayment = () => {
        const hasBasicData = customerData.name.trim() && customerData.email.trim() && customerData.phone.trim();
        const hasLocation = !!user?.savedLocation; // ✅ VERIFICAR SI TIENE UBICACIÓN GUARDADA
        
        console.log('🔍 Validación de datos para pago:', {
            hasBasicData,
            hasLocation,
            user: user?._id,
            savedLocation: user?.savedLocation
        });
        
        return hasBasicData && (hasLocation || !isLoggedIn); // ✅ Solo requerir ubicación para usuarios logueados
    };

    // Función para verificar si hay datos mínimos para presupuesto
    const hasValidCustomerDataForBudget = () => {
        return customerData.name.trim();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomerData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Preparar datos del carrito para Bancard
    const prepareBancardItems = () => {
        return validProducts.map(product => ({
            _id: product._id,
            name: product.productId.productName,
            productId: product.productId,
            quantity: product.quantity,
            unitPrice: product.productId.sellingPrice,
            unit_price: product.productId.sellingPrice,
            total: product.quantity * product.productId.sellingPrice
        }));
    };

    // ✅ MANEJAR SELECCIÓN DE MODO DE PAGO
    const handlePaymentModeSelection = (mode) => {
        setPaymentMode(mode);
        
        if (mode === 'register') {
            setShowRegisterPrompt(true);
        } else if (mode === 'guest') {
            setShowCustomerForm(true);
        } else if (mode === 'saved_cards') {
            setShowCustomerForm(true);
        }
    };

    // Generar PDF
    const generatePDF = () => {
        if (!hasValidCustomerDataForBudget()) {
            toast.error("Por favor ingrese al menos el nombre del cliente");
            return;
        }
    
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Colores corporativos de 
        const primaryColor = [42, 49, 144]; // Azul 
        const secondaryColor = [0, 0, 0]; // Negro
        
        // Agregar logo
        const imgWidth = 30;
        const imgHeight = 15;
        doc.addImage(logo, 'PNG', 10, 10, imgWidth, imgHeight);
        
        // Agregar encabezado
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text("PRESUPUESTO", pageWidth - 10, 20, { align: "right" });
        
        // Línea divisoria
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(10, 30, pageWidth - 10, 30);
        
        // Agregar información de la empresa
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont("helvetica", "normal");
        doc.text([
            "Zenn",
            "Tel: +595 981 150393",
            "Email: ventas@zenn.com.py",
            "Web: www.zenn.com.py"
        ], pageWidth - 10, 40, { align: "right" });
        
        // Número de presupuesto y fecha
        const presupuestoNo = `PRE-${Math.floor(100000 + Math.random() * 900000)}`;
        const currentDate = new Date().toLocaleDateString('es-PY', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("N° PRESUPUESTO:", 10, 45);
        doc.text("FECHA:", 10, 52);
        doc.text("VALIDEZ:", 10, 59);
        
        doc.setFont("helvetica", "normal");
        doc.text(presupuestoNo, 50, 45);
        doc.text(currentDate, 50, 52);
        doc.text("5 días hábiles", 50, 59);
        
        // Información del cliente
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("DATOS DEL CLIENTE", 10, 70);
        
        doc.setFontSize(11);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text("NOMBRE:", 10, 80);
        
        if (customerData.phone) {
            doc.text("TELÉFONO:", 10, 87);
        }
        
        if (customerData.email) {
            doc.text("EMAIL:", 10, customerData.phone ? 94 : 87);
        }
        
        doc.setFont("helvetica", "normal");
        doc.text(customerData.name, 50, 80);
        
        if (customerData.phone) {
            doc.text(customerData.phone, 50, 87);
        }
        
        if (customerData.email) {
            doc.text(customerData.email, 50, customerData.phone ? 94 : 87);
        }
        
        // Encabezado de productos
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("DETALLE DE PRODUCTOS", 10, customerData.email ? 105 : (customerData.phone ? 98 : 91));
        
        // Tabla de productos
        const tableColumn = ["#", "Descripción", "Cant.", "Precio Unitario", "Subtotal"];
        const tableRows = [];
        
        validProducts.forEach((product, index) => {
            const subtotal = product.quantity * product.productId.sellingPrice;
            tableRows.push([
                (index + 1).toString(),
                product.productId.productName,
                product.quantity.toString(),
                displayINRCurrency(product.productId.sellingPrice),
                displayINRCurrency(subtotal),
            ]);
        });
        
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: customerData.email ? 110 : (customerData.phone ? 103 : 96),
            theme: 'grid',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 35, halign: 'right' },
                4: { cellWidth: 35, halign: 'right' }
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            }
        });
        
        // Resumen del presupuesto
        const finalY = doc.lastAutoTable.finalY + 15;
        
        // Recuadro para totales
        doc.setFillColor(248, 248, 248);
        doc.rect(pageWidth - 90, finalY - 5, 80, 30, 'F');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL GUARANÍES:", pageWidth - 85, finalY + 5);
        doc.text("TOTAL USD (referencial):", pageWidth - 85, finalY + 15);
        
        const totalInUSD = totalPrice / 7850;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(displayINRCurrency(totalPrice), pageWidth - 10, finalY + 5, { align: "right" });
        doc.text(`$${totalInUSD.toFixed(2)}`, pageWidth - 10, finalY + 15, { align: "right" });
        
        // Información adicional
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(10, finalY + 30, pageWidth - 10, finalY + 30);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        
        const infoText = [
            "• Forma de Pago: A convenir",
            "• Tiempo de entrega: 48 horas hábiles",
            "• Garantía según políticas del fabricante",
            "• Precios válidos por 5 días hábiles"
        ];
        
        infoText.forEach((text, index) => {
            doc.text(text, 10, finalY + 40 + (index * 7));
        });
        
        // Pie de página
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Este presupuesto no constituye una factura. Para realizar el pedido, contáctenos al WhatsApp +595 981 150393.", pageWidth/2, pageHeight - 15, { align: "center" });
        doc.text("Zenn - Tecnología Profesional", pageWidth/2, pageHeight - 10, { align: "center" });
        
        // Numeración de páginas
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 10);
        }
    
        // Guardar el PDF
        doc.save(`Presupuesto-Zenn-${presupuestoNo}.pdf`);
        toast.success("Presupuesto generado exitosamente");

        // Tracking del PDF
        trackPDFDownload(customerData, totalPrice, validProducts);
    };

    // Función para enviar presupuesto por WhatsApp
    const sendToWhatsApp = () => {
        if (!hasValidCustomerDataForBudget()) {
            toast.error("Por favor ingrese al menos el nombre del cliente");
            return;
        }

        if (validProducts.length === 0) {
            toast.error("No hay productos válidos en el carrito");
            return;
        }

        let message = `*SOLICITUD DE PRESUPUESTO - Zenn*\n\n`;
        message += `*Cliente:* ${customerData.name}\n`;
        
        if (customerData.phone) {
            message += `*Teléfono:* ${customerData.phone}\n`;
        }
        
        if (customerData.email) {
            message += `*Email:* ${customerData.email}\n`;
        }
        
        message += `\n*Productos solicitados:*\n`;
        
        validProducts.forEach((product, index) => {
            message += `${index + 1}. ${product.productId.productName} (${product.quantity} unid.) - ${displayINRCurrency(product.productId.sellingPrice * product.quantity)}\n`;
        });
        
        message += `\n*Total:* ${displayINRCurrency(totalPrice)}\n`;
        message += `\nSolicito confirmación de disponibilidad y coordinación para el pago. Gracias.`;
        
        const encodedMessage = encodeURIComponent(message);
        
        trackWhatsAppContact({
            _id: 'cart-budget',
            productName: `Presupuesto de carrito (${validProducts.length} productos)`,
            category: 'presupuesto',
            sellingPrice: totalPrice
        });
        
        window.open(`https://wa.me/+595981150393?text=${encodedMessage}`, '_blank');
        toast.success("Redirigiendo a WhatsApp...");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Encabezado del carrito */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#2A3190] flex items-center gap-3 mb-4 sm:mb-0">
                        <div className="w-2 h-8 bg-[#2A3190] rounded-full"></div>
                        Mi Carrito
                    </h1>
                    
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-[#2A3190] transition-colors">
                            <FaArrowLeft className="text-sm" />
                            <span>Seguir comprando</span>
                        </Link>
                        
                        <div className="text-sm bg-[#2A3190] text-white px-4 py-1.5 rounded-full shadow-md">
                            {totalQty} {totalQty === 1 ? 'producto' : 'productos'}
                        </div>

                        {/* ✅ MOSTRAR ESTADO DE USUARIO */}
                        {isLoggedIn ? (
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm">
                                <FaUser className="text-xs" />
                                <span>Logueado</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">
                                <span>Invitado</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Carrito vacío */}
                {validProducts.length === 0 && !loading && (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-2xl mx-auto border border-gray-100">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MdShoppingCart className="text-5xl text-[#2A3190]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#2A3190] mb-3">Tu carrito está vacío</h2>
                        <p className="text-gray-600 mb-8">Parece que no has agregado productos a tu carrito todavía.</p>
                        <Link 
                            to="/"
                            className="inline-block bg-[#2A3190] text-white px-8 py-3 rounded-lg hover:bg-[#1e236b] transition duration-300 shadow-md"
                        >
                            Explorar Productos
                        </Link>
                    </div>
                )}

                {/* Contenido del carrito */}
                {validProducts.length > 0 && (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Lista de productos */}
                        <div className="flex-grow">
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-[#2A3190]">Productos seleccionados</h2>
                                    
                                    {validProducts.length > 1 && (
                                        <button 
                                            onClick={clearCart}
                                            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors text-sm bg-red-50 px-3 py-1 rounded-full"
                                        >
                                            <FaTrash className="text-xs" />
                                            <span>Vaciar carrito</span>
                                        </button>
                                    )}
                                </div>
                                
                                {loading ? (
                                    <div className="animate-pulse space-y-6">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="bg-gray-200 w-24 h-24 rounded-lg"></div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {validProducts.map((product) => (
                                            <div key={product._id} className="py-4 first:pt-0 last:pb-0">
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    {/* Imagen */}
                                                    <div className="w-full sm:w-36 h-36 bg-blue-50 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-gray-100">
                                                        <img 
                                                            src={product.productId.productImage[0]} 
                                                            alt={product.productId.productName} 
                                                            className="w-full h-full object-contain" 
                                                        />
                                                    </div>

                                                    {/* Información */}
                                                    <div className="flex-1 flex flex-col">
                                                        <div className="flex-grow">
                                                            <Link 
                                                                to={`/producto/${product.productId.slug || product.productId._id}`} 
                                                                className="text-lg font-semibold text-gray-900 hover:text-[#2A3190] transition-colors line-clamp-2"
                                                            >
                                                                {product.productId.productName}
                                                            </Link>
                                                            <p className="text-sm text-gray-500 mt-1">{product.productId.category}</p>
                                                        </div>
                                                        
                                                        <div className="mt-auto flex flex-wrap justify-between items-end gap-4">
                                                            <div>
                                                                <p className="text-sm text-gray-500">Precio unitario</p>
                                                                <p className="text-lg font-medium text-[#2A3190]">
                                                                    {displayINRCurrency(product.productId.sellingPrice)}
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                                                    <button 
                                                                        onClick={() => decreaseQty(product._id, product.quantity)} 
                                                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="w-10 h-8 flex items-center justify-center text-gray-800 font-medium">
                                                                        {product.quantity}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => increaseQty(product._id, product.quantity)}
                                                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                                
                                                                <button 
                                                                    onClick={() => deleteCartProduct(product._id)}
                                                                    className="text-red-500 hover:text-red-600 transition-colors p-2"
                                                                    title="Eliminar"
                                                                >
                                                                    <MdDelete className="text-xl" />
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="ml-auto text-right">
                                                                <p className="text-sm text-gray-500">Subtotal</p>
                                                                <p className="text-lg font-bold text-[#2A3190]">
                                                                    {displayINRCurrency(product.productId.sellingPrice * product.quantity)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                
                        {/* ✅ PANEL LATERAL MEJORADO */}
                        <div className="w-full lg:w-96">
                            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4 border-l-4 border-[#2A3190] border-t border-r border-b border-gray-100">
                                <h2 className="text-xl font-bold text-[#2A3190] mb-6">
                                    Resumen del Pedido
                                </h2>
                
                                <div className="space-y-4">
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Cantidad de productos</span>
                                        <span className="font-medium text-gray-900">{totalQty}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium text-gray-900">{displayINRCurrency(totalPrice)}</span>
                                    </div>
                                    <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg">
                                    <span className="text-lg font-medium text-[#2A3190]">Total</span>
                                    <span className="text-xl font-bold text-[#2A3190]">{displayINRCurrency(totalPrice)}</span>
                                </div>
                            </div>

                            {/* ✅ MOSTRAR ESTADO DE UBICACIÓN PARA USUARIOS LOGUEADOS */}
                            {isLoggedIn && (
                                <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-200">
                                    {user?.savedLocation ? (
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                                                <FaCheckCircle />
                                                <span className="font-medium">Ubicación confirmada</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">
                                                {user.savedLocation.address}
                                            </p>
                                            <Link
                                                to="/mi-perfil?tab=profile"
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Ver/cambiar ubicación
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
                                                <FaMapMarkerAlt />
                                                <span className="font-medium">Ubicación requerida</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Agrega tu ubicación para continuar
                                            </p>
                                            <Link
                                                to="/mi-perfil?tab=profile"
                                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                                            >
                                                Agregar ubicación
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                                
                              <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">¿Qué deseas hacer?</h3>
                                    
                                    {/* Botón Finalizar Compra - Principal */}
                                    <button
                                        onClick={() => {
                                                trackInitiateCheckout(validProducts, totalPrice);
                                                navigate('/finalizar-compra');
                                            }}
                                        disabled={validProducts.length === 0}
                                        className="w-full bg-[#2A3190] text-white py-4 px-4 rounded-lg hover:bg-[#1e236b] transition-all duration-300 flex items-center justify-between group shadow-md disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-[#1e236b] p-2 rounded-full">
                                                <FaCreditCard className="text-white" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold">Finalizar Compra</p>
                                                <p className="text-sm text-blue-100">Pago seguro con Bancard</p>
                                            </div>
                                        </div>
                                        <div className="bg-[#1e236b] px-3 py-1 rounded-full text-xs font-medium">
                                            SEGURO
                                        </div>
                                    </button>

                                    {/* Formulario de datos mínimos para presupuestos */}
                                    {!showCustomerForm && (
                                        <button
                                            onClick={() => setShowCustomerForm(true)}
                                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                        >
                                            Solicitar presupuesto (PDF/WhatsApp)
                                        </button>
                                    )}

                                    {/* Formulario para presupuestos */}
                                    {showCustomerForm && (
                                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-medium text-[#2A3190]">Datos para presupuesto</h4>
                                                <button
                                                    onClick={() => setShowCustomerForm(false)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={customerData.name}
                                                        onChange={handleInputChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2A3190] focus:border-transparent text-sm"
                                                        placeholder="Nombre completo *"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={customerData.email}
                                                        onChange={handleInputChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2A3190] focus:border-transparent text-sm"
                                                        placeholder="Email (opcional)"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={customerData.phone}
                                                        onChange={handleInputChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2A3190] focus:border-transparent text-sm"
                                                        placeholder="Teléfono (opcional)"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Botones de presupuesto */}
                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                                <button
                                                    onClick={generatePDF}
                                                    disabled={!hasValidCustomerDataForBudget()}
                                                    className="bg-[#2A3190] text-white py-2.5 rounded-lg hover:bg-[#1e236b] transition-all duration-300 flex items-center justify-center gap-1.5 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <MdDownload className="text-lg" />
                                                    <span>PDF</span>
                                                </button>
                                                
                                                <button
                                                    onClick={sendToWhatsApp}
                                                    disabled={!hasValidCustomerDataForBudget()}
                                                    className="bg-[#25D366] text-white py-2.5 rounded-lg hover:bg-[#128C7E] transition-all duration-300 flex items-center justify-center gap-1.5 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <MdWhatsapp className="text-lg" />
                                                    <span>WhatsApp</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                
                                <Link
                                    to="/"
                                    className="mt-6 block text-center py-2.5 text-gray-600 hover:text-[#2A3190] transition-colors border border-gray-200 rounded-lg hover:border-[#2A3190]"
                                >
                                    Continuar comprando
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
import { toast } from 'react-toastify';

// Función auxiliar para manejar el carrito en localStorage
const localCartHelper = {
    // Obtener el carrito del localStorage
    getCart: () => {
        try {
            const cartItems = localStorage.getItem('cartItems');
            return cartItems ? JSON.parse(cartItems) : [];
        } catch (error) {
            console.error("Error al obtener carrito:", error);
            return [];
        }
    },
    
    // Guardar el carrito en localStorage
    saveCart: (items) => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(items));
        } catch (error) {
            console.error("Error al guardar carrito:", error);
        }
    },
    
    // ✅ AGREGAR FUNCIÓN updateCart QUE FALTABA
    updateCart: (updatedItems) => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(updatedItems));
            return true;
        } catch (error) {
            console.error("Error al actualizar carrito:", error);
            return false;
        }
    },
    
    // Añadir producto al carrito - VERSIÓN OFFLINE
    addItem: (product, quantity = 1) => {
        try {
            const cartItems = localCartHelper.getCart();
            
            // Para identificar el producto
            const productId = product._id;
            
            // Buscar si el producto ya existe en el carrito
            const existingItemIndex = cartItems.findIndex(item => 
                (item.productId && item.productId._id === productId) || 
                (item.productId === productId)
            );
            
            if (existingItemIndex !== -1) {
                // Actualizar cantidad si ya existe
                cartItems[existingItemIndex].quantity += quantity;
            } else {
                // Agregar nuevo item
                cartItems.push({ 
                    _id: `local-${Date.now()}`,
                    productId: product, // Guardamos todo el producto directamente
                    quantity,
                    addedAt: new Date().toISOString()
                });
            }
            
            // Guardar el carrito actualizado
            localCartHelper.saveCart(cartItems);
            
            return true;
        } catch (error) {
            console.error("Error al añadir al carrito:", error);
            return false;
        }
    },
    
    // Obtener la cantidad de items en el carrito
    getItemCount: () => {
        return localCartHelper.getCart().length;
    },
    
    // Actualizar cantidad de un producto
    updateQuantity: (itemId, newQuantity) => {
        if (newQuantity < 1) return false;
        
        try {
            const cartItems = localCartHelper.getCart();
            const index = cartItems.findIndex(item => item._id === itemId);
            
            if (index !== -1) {
                cartItems[index].quantity = newQuantity;
                localCartHelper.saveCart(cartItems);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error al actualizar cantidad:", error);
            return false;
        }
    },
    
    // Eliminar un producto del carrito
    removeItem: (itemId) => {
        try {
            const cartItems = localCartHelper.getCart();
            const updatedCart = cartItems.filter(item => item._id !== itemId);
            localCartHelper.saveCart(updatedCart);
            return updatedCart.length;
        } catch (error) {
            console.error("Error al eliminar item:", error);
            return -1;
        }
    },
    
    // Limpiar el carrito completo
    clearCart: () => {
        localStorage.removeItem('cartItems');
    }
};

// Función principal para añadir al carrito - VERSIÓN OFFLINE
const addToCart = (e, product) => {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }

    try {
        // Mostrar toast inmediatamente
        toast.info("Agregando al carrito...");

        if (!product || !product._id) {
            console.error("Producto inválido:", product);
            toast.error("No se pudo agregar el producto al carrito");
            return { error: true, success: false };
        }

        // Añadir al carrito local directamente con el producto completo
        const success = localCartHelper.addItem(product);
        
        if (success) {
            // Mostrar mensaje de éxito
            toast.success("Producto agregado al carrito");
            
            // Actualizar contador del carrito
            if (window.fetchUserAddToCart) {
                window.fetchUserAddToCart();
            }
            
            return { 
                success: true, 
                message: "Producto agregado al carrito", 
                error: false 
            };
        } else {
            toast.error("No se pudo agregar el producto al carrito");
            return { error: true, success: false };
        }
    } catch (err) {
        console.error("Error al agregar al carrito:", err);
        toast.error("Error al agregar al carrito. Intenta de nuevo.");
        return { error: true, success: false };
    }
};

export { localCartHelper };
export default addToCart;
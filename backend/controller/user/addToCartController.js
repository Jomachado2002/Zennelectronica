const addToCartModel = require("../../models/cartProduct");

const addToCartController = async (req, res) => {
    try {
        const { productId } = req?.body;
        if (!productId) {
            return res.json({
                message: "Product ID is required",
                success: false,
                error: true,
            });
        }

        // Use the guest user ID from the request
        const currentUser = req.userId; // This should now be the guest ID from authToken middleware
        const sessionId = req.sessionId || req.sessionID || `session-${Date.now()}`;

        // Check if the product is already in the cart for this user
        const existingCartItem = await addToCartModel.findOne({
            productId,
            $or: [
                { userId: currentUser },
                { sessionId: sessionId }
            ]
        });

        if (existingCartItem) {
            existingCartItem.quantity += 1;
            await existingCartItem.save();
            return res.json({
                data: existingCartItem,
                message: "Product quantity updated in cart",
                success: true,
                error: false,
            });
        }

        // Create new cart item
        const payload = {
            productId,
            quantity: 1,
            userId: currentUser,
            sessionId,
            isGuest: true
        };

        const newAddToCart = new addToCartModel(payload);
        const savedProduct = await newAddToCart.save();

        return res.json({
            data: savedProduct,
            message: "Product added to cart",
            success: true,
            error: false,
        });

    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({
            message: err?.message || String(err),
            error: true,
            success: false,
        });
    }
};

module.exports = addToCartController;
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Lấy giỏ hàng của user
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        let cart = await Cart.findOne({ user_id: userId })
            .populate('items.product_id', 'name image price variations');

        if (!cart) {
            // Tạo giỏ hàng mới nếu chưa có
            cart = new Cart({ user_id: userId, items: [] });
            await cart.save();
        }

        res.status(200).json(cart);
    } catch (error) {
        console.error('Lỗi khi lấy giỏ hàng:', error);
        res.status(500).json({ message: 'Không thể lấy giỏ hàng.' });
    }
};

// Thêm sản phẩm vào giỏ hàng
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { product_id, name, image, size, color, quantity, price } = req.body;

        // Validate input
        if (!product_id || !name || !size || !color || !quantity || !price) {
            return res.status(400).json({
                message: 'Thiếu thông tin sản phẩm: product_id, name, size, color, quantity, price.'
            });
        }

        // Kiểm tra sản phẩm có tồn tại không
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        // Kiểm tra biến thể có đủ hàng không
        const variant = product.variations.find(
            (v) => v.color === color && v.size === size
        );

        if (!variant || variant.quantity < quantity) {
            return res.status(400).json({
                message: `Sản phẩm ${name} (${color} - ${size}) không đủ hàng trong kho.`
            });
        }

        // Tìm hoặc tạo giỏ hàng
        let cart = await Cart.findOne({ user_id: userId });
        if (!cart) {
            cart = new Cart({ user_id: userId, items: [] });
        }

        // Kiểm tra sản phẩm đã có trong giỏ chưa (cùng product_id, size, color)
        const existingItemIndex = cart.items.findIndex(
            (item) =>
                item.product_id.toString() === product_id &&
                item.size === size &&
                item.color === color
        );

        if (existingItemIndex > -1) {
            // Cập nhật số lượng nếu đã có
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Thêm mới nếu chưa có
            cart.items.push({
                product_id,
                name,
                image,
                size,
                color,
                quantity,
                price
            });
        }

        await cart.save();

        res.status(200).json({
            message: 'Đã thêm sản phẩm vào giỏ hàng.',
            cart
        });
    } catch (error) {
        console.error('Lỗi khi thêm vào giỏ hàng:', error);
        res.status(500).json({ message: 'Không thể thêm sản phẩm vào giỏ hàng.' });
    }
};

// Cập nhật số lượng sản phẩm trong giỏ
exports.updateCartItem = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Số lượng phải lớn hơn 0.' });
        }

        const cart = await Cart.findOne({ user_id: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Không tìm thấy giỏ hàng.' });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ hàng.' });
        }

        // Kiểm tra kho
        const product = await Product.findById(item.product_id);
        if (product) {
            const variant = product.variations.find(
                (v) => v.color === item.color && v.size === item.size
            );

            if (!variant || variant.quantity < quantity) {
                return res.status(400).json({
                    message: `Sản phẩm ${item.name} không đủ hàng. Còn lại: ${variant?.quantity || 0}`
                });
            }
        }

        item.quantity = quantity;
        await cart.save();

        res.status(200).json({
            message: 'Đã cập nhật số lượng sản phẩm.',
            cart
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật giỏ hàng:', error);
        res.status(500).json({ message: 'Không thể cập nhật giỏ hàng.' });
    }
};

// Xóa sản phẩm khỏi giỏ hàng
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user_id: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Không tìm thấy giỏ hàng.' });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ hàng.' });
        }

        item.deleteOne();
        await cart.save();

        res.status(200).json({
            message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
            cart
        });
    } catch (error) {
        console.error('Lỗi khi xóa sản phẩm khỏi giỏ hàng:', error);
        res.status(500).json({ message: 'Không thể xóa sản phẩm.' });
    }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        const cart = await Cart.findOne({ user_id: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Không tìm thấy giỏ hàng.' });
        }

        cart.items = [];
        await cart.save();

        res.status(200).json({
            message: 'Đã xóa toàn bộ giỏ hàng.',
            cart
        });
    } catch (error) {
        console.error('Lỗi khi xóa giỏ hàng:', error);
        res.status(500).json({ message: 'Không thể xóa giỏ hàng.' });
    }
};

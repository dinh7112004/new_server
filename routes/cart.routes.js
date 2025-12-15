const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const cartController = require('../controllers/cart.controller');

// Lấy giỏ hàng
router.get('/', auth, cartController.getCart);

// Thêm sản phẩm vào giỏ
router.post('/', auth, cartController.addToCart);

// Cập nhật số lượng sản phẩm
router.put('/:itemId', auth, cartController.updateCartItem);

// Xóa sản phẩm khỏi giỏ
router.delete('/:itemId', auth, cartController.removeFromCart);

// Xóa toàn bộ giỏ hàng
router.delete('/', auth, cartController.clearCart);

module.exports = router;

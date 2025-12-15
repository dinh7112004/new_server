const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const wishlistController = require('../controllers/wishlist.controller');

// Lấy danh sách yêu thích của tôi
// Endpoint: GET /api/wishlists/me (Khớp với Client)
router.get('/me', auth, wishlistController.getMyWishlist);

// Thêm sản phẩm vào yêu thích
// Endpoint: POST /api/wishlists/ (Khớp với Client)
router.post('/', auth, wishlistController.addToWishlist);

// Xoá sản phẩm khỏi yêu thích
// Endpoint: DELETE /api/wishlists/:productId (Khớp với Client)
router.delete('/:productId', auth, wishlistController.removeFromWishlist);

// Kiểm tra 1 sản phẩm có trong wishlist không
router.get('/check/:productId', auth, wishlistController.check);
router.get('/check', auth, wishlistController.check);

module.exports = router;
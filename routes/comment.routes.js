const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comment.controller');
const auth = require('../middlewares/authMiddleware'); // <-- dùng file của bạn

// Lấy bình luận + tổng quan theo sản phẩm
router.get('/product/:productId', ctrl.listByProduct);

// Tạo bình luận (cần đăng nhập)
router.post('/', auth, ctrl.create);

// Cập nhật bình luận (cần là chủ comment)
router.put('/:commentId', auth, ctrl.update);

// Xoá bình luận (cần là chủ comment)
router.delete('/:commentId', auth, ctrl.remove);

module.exports = router;

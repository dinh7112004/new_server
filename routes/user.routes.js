const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const adminOnly = require('../middlewares/adminOnly');

// Lấy thông tin cá nhân
router.get('/me', authMiddleware, userController.getMe);

// Cập nhật thông tin cá nhân
router.put('/update-profile', authMiddleware, userController.updateProfile);

//đổi mk
router.put('/change-password', authMiddleware, userController.changePassword);

// Cập nhật trạng thái online/offline
router.post('/online-status', authMiddleware, userController.updateOnlineStatus);

// Lấy trạng thái online của người dùng (chỉ admin)
router.get('/online-status', authMiddleware, adminOnly, userController.getOnlineStatus);

module.exports = router;

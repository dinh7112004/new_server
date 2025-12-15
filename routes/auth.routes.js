const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);

// ⭐ DÒNG CẦN SỬA ĐỂ KHỚP VỚI CONTROLLER (requestPasswordOtp) ⭐
router.post("/forgot-password/request-otp", authController.requestPasswordOtp); 

// Dòng này có thể đã đúng
router.post("/forgot-password/reset", authController.resetPassword);

module.exports = router;
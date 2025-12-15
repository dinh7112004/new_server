const express = require("express");
const router = express.Router();
const authMiddleware  = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notification.controller");

router.get("/my-notifications", authMiddleware,notificationController.getMyNotifications);
router.put("/mark-all-read", authMiddleware, notificationController.markAllRead);

module.exports = router;

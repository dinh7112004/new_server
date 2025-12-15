const Notification = require("../models/Notification");

// Lấy danh sách notification của user
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.userId; // từ middleware auth
    const notifications = await Notification.find({ user_id: userId })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Lỗi lấy thông báo:", err);
    res.status(500).json({ message: "Không thể lấy thông báo." });
  }
};

// Đánh dấu đã đọc tất cả
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany({ user_id: userId, read: false }, { read: true });
    res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (err) {
    res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
};

module.exports = {
  getMyNotifications,
  markAllRead,
 
};

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Loại thông báo: đơn hàng, khuyến mãi, hệ thống...
    type: { type: String, enum: ["order", "promotion", "system"], default: "system" },

    // Nội dung ngắn gọn hiển thị
    title: { type: String, required: true },

    // Nội dung chi tiết hơn
    message: { type: String, required: true },

    // Liên kết đến đối tượng cụ thể (ví dụ đơn hàng)
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

    // Ảnh minh họa (ví dụ ảnh sản phẩm hoặc banner khuyến mãi)
    image: { type: String },
    productName: { type: String },

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Notification", notificationSchema);

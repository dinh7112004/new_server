const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload"); // đã sửa để phân biệt Cloudinary & Local
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");

const isProduction = process.env.NODE_ENV === "production";
const useCloudinary = process.env.USE_CLOUDINARY === "true"; // thêm flag
const serverURL = process.env.SERVER_URL || "http://localhost:5001";

// Helper lấy URL phù hợp
const getFileUrl = (file) => {
  if (isProduction || useCloudinary) {
    return file.path; // Cloudinary luôn trả về URL đầy đủ
  } else {
    return `${serverURL}/uploads/${file.filename}`; // Local
  }
};

// Upload 1 ảnh hoặc nhiều ảnh
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  (req, res) => {
    const image = req.files?.image?.[0];
    const images = req.files?.images || [];

    if (!image && images.length === 0) {
      return res.status(400).json({ message: "Không có file nào được tải lên." });
    }

    res.status(200).json({
      image: image ? getFileUrl(image) : null,
      images: images.map(getFileUrl),
    });
  }
);

// Route upload avatar và tự động lưu vào DB
router.post("/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được tải lên" });
    }

    const avatarUrl = getFileUrl(req.file);

    await User.findByIdAndUpdate(req.user.userId, { avatar_url: avatarUrl });

    res.status(200).json({ message: "Cập nhật avatar thành công", url: avatarUrl });
  } catch (error) {
    console.error("Lỗi upload avatar:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật avatar" });
  }
});

module.exports = router;

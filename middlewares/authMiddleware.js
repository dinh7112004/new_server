const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // 💡 THÊM LOG LỖI 401: Không có token
    console.error(`❌ AUTH FAILED (401): Missing or malformed token for route: ${req.originalUrl}`);
    return res.status(401).json({ message: "Không có token hoặc sai định dạng" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Set consistent user object structure
    req.user = {
      id: decoded.userId,        // Use 'id' for consistency with chat controller
      userId: decoded.userId,    // Keep 'userId' for backward compatibility
      role: decoded.role,
    };
    
    // 💡 THÊM LOG THÀNH CÔNG: Log thành công cho các request quan trọng (như wishlist)
    if (req.originalUrl.includes('wishlists')) {
         console.log(`✅ AUTH SUCCESS (200) for Wishlist: User ${req.user.userId}`);
    }

    next();
  } catch (err) {
    // 💡 THÊM LOG LỖI 403: Token không hợp lệ/hết hạn
    console.error(`❌ AUTH FAILED (403): Invalid token for route: ${req.originalUrl}. Error: ${err.message}`);
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
};
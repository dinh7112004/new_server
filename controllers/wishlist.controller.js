const wishlistService = require('../services/wishlist.service');

exports.getMyWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wishlist = await wishlistService.getWishlist(userId);
    // Lưu ý: Đảm bảo format JSON trả về đúng như Client mong đợi (ví dụ: {wishlist: [...]} )
    res.status(200).json({ wishlist: wishlist }); 
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Không thể lấy danh sách yêu thích' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'Thiếu productId' });

    await wishlistService.addProduct(userId, productId); // Chỉ cần gọi service, không cần trả về wishlist đầy đủ
    res.status(200).json({ message: 'Đã thêm vào yêu thích', isAdded: true }); 
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Không thể thêm vào yêu thích' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.productId; // Lấy từ URL params
    if (!productId) return res.status(400).json({ message: 'Thiếu productId' });

    await wishlistService.removeProduct(userId, productId); // Chỉ cần gọi service
    res.status(200).json({ message: 'Đã xoá khỏi yêu thích', isAdded: false }); 
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Không thể xoá khỏi yêu thích' });
  }
};

exports.check = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.productId || req.query.productId;
    if (!productId) return res.status(400).json({ message: 'Thiếu productId' });

    const inWishlist = await wishlistService.isInWishlist(userId, productId);
    return res.status(200).json({ inWishlist });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Không thể kiểm tra wishlist' });
  }
};
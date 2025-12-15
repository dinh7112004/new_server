// services/wishlist.service.js
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product  = require('../models/Product');
const Comment  = require('../models/Comment'); // dùng product_id, rating

class WishlistService {
  async getOrCreateWishlist(userId) {
    let wl = await Wishlist.findOne({ user_id: userId });
    if (!wl) wl = await Wishlist.create({ user_id: userId, products: [] });
    return wl;
  }

  // Lấy info sản phẩm + thống kê sao từ Comment (product_id/rating)
  async enrichProducts(ids) {
    if (!ids?.length) return [];

    // 1) Thông tin sản phẩm
    const products = await Product.find(
      { _id: { $in: ids } },
      // thêm ratingAvg/ratingCount ở đây nếu Product đã lưu sẵn 2 field này
      'name image price brand status createdAt'
    ).lean();

    // 2) Thống kê sao theo product_id
    const objIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const stats = await Comment.aggregate([
      { $match: { product_id: { $in: objIds }, rating: { $gt: 0 } } },
      {
        $group: {
          _id: '$product_id',
          ratingAvg: { $avg: '$rating' },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    const ratingByProduct = Object.fromEntries(
      stats.map(s => [
        String(s._id),
        {
          ratingAvg: Number((s.ratingAvg ?? 0).toFixed(1)),
          ratingCount: s.ratingCount || 0
        }
      ])
    );

    // 3) Trả về theo đúng thứ tự lưu trong wishlist
    const pMap = new Map(products.map(p => [String(p._id), p]));
    return ids
      .map(id => {
        const p = pMap.get(String(id));
        if (!p) return null;
        const r = ratingByProduct[String(id)] || { ratingAvg: 0, ratingCount: 0 };
        return { ...p, ...r };
      })
      .filter(Boolean);
  }

  async getWishlist(userId) {
    const wl  = await this.getOrCreateWishlist(userId);
    const ids = (wl.products || []).map(id => id.toString());
    const enriched = await this.enrichProducts(ids);
    return { _id: wl._id, user_id: wl.user_id, products: enriched };
  }

  async addProduct(userId, productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('ID sản phẩm không hợp lệ'); err.status = 400; throw err;
    }
    const product = await Product.findById(productId);
    if (!product) { const err = new Error('Không tìm thấy sản phẩm'); err.status = 404; throw err; }

    const updated = await Wishlist.findOneAndUpdate(
      { user_id: userId },
      { $addToSet: { products: product._id } },
      { new: true, upsert: true }
    );
    const ids = (updated.products || []).map(id => id.toString());
    const enriched = await this.enrichProducts(ids);
    return { _id: updated._id, user_id: updated.user_id, products: enriched };
  }

  async removeProduct(userId, productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('ID sản phẩm không hợp lệ'); err.status = 400; throw err;
    }
    const updated = await Wishlist.findOneAndUpdate(
      { user_id: userId },
      { $pull: { products: new mongoose.Types.ObjectId(productId) } },
      { new: true }
    ) || await this.getOrCreateWishlist(userId);

    const ids = (updated.products || []).map(id => id.toString());
    const enriched = await this.enrichProducts(ids);
    return { _id: updated._id, user_id: updated.user_id, products: enriched };
  }

  async isInWishlist(userId, productId) {
    const exists = await Wishlist.exists({ user_id: userId, products: productId });
    return !!exists;
  }
}

module.exports = new WishlistService();

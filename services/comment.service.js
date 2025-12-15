// services/comment.service.js
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Product = require('../models/Product');

function assertObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`${name} không hợp lệ`);
    err.status = 400;
    throw err;
  }
}

module.exports = {
  async listByProduct(productId, { page = 1, limit = 10 } = {}) {
    assertObjectId(productId, 'productId');
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(50, Number(limit) || 10));
    const q = { product_id: productId };

    const [items, total] = await Promise.all([
      Comment.find(q)
        .populate('user_id', 'full_name avatar_url')
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Comment.countDocuments(q),
    ]);

    const agg = await Comment.aggregate([
      { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingAvg = agg[0]?.avg || 0;
    const ratingCount = agg[0]?.count || 0;

    return {
      items,
      pagination: {
        page: p,
        limit: l,
        totalItems: total,
        totalPages: Math.ceil(total / l) || 1,
      },
      summary: {
        ratingAvg: Number(ratingAvg.toFixed(1)),
        ratingCount,
      },
    };
  },

  async create(userId, { productId, product_id, content, rating }) {
    if (!userId) {
      const err = new Error('Thiếu userId');
      err.status = 401;
      throw err;
    }
    const pid = productId || product_id; // chấp nhận cả 2 key
    assertObjectId(pid, 'productId');

    const r = Number(rating);
    if (!(r >= 1 && r <= 5)) {
      const err = new Error('rating phải từ 1 đến 5');
      err.status = 400;
      throw err;
    }

    const product = await Product.findById(pid).select('_id');
    if (!product) {
      const err = new Error('Sản phẩm không tồn tại');
      err.status = 404;
      throw err;
    }

    const existed = await Comment.findOne({ product_id: pid, user_id: userId }).select('_id');
    if (existed) {
      const e = new Error('Bạn đã đánh giá sản phẩm này');
      e.status = 409;
      e.code = 11000; // để controller có thể map 409
      throw e;
    }

    const doc = await Comment.create({
      product_id: pid,
      user_id: userId,
      rating: r,
      content: (content || '').trim(),
    });
    await doc.populate('user_id', 'full_name avatar_url');
    return doc;
  },

  async update(userId, commentId, { content, rating }) {
    if (!userId) {
      const err = new Error('Thiếu userId');
      err.status = 401;
      throw err;
    }
    assertObjectId(commentId, 'commentId');

    const set = {};
    if (typeof content === 'string') set.content = content.trim();
    if (rating !== undefined) {
      const r = Number(rating);
      if (!(r >= 1 && r <= 5)) {
        const err = new Error('rating phải từ 1 đến 5');
        err.status = 400;
        throw err;
      }
      set.rating = r;
    }

    const doc = await Comment.findOneAndUpdate(
      { _id: commentId, user_id: userId },
      { $set: set },
      { new: true }
    ).populate('user_id', 'full_name avatar_url');

    if (!doc) {
      const err = new Error('Không tìm thấy comment hoặc bạn không có quyền');
      err.status = 404;
      throw err;
    }
    return doc;
  },

  async remove(userId, commentId) {
    if (!userId) {
      const err = new Error('Thiếu userId');
      err.status = 401;
      throw err;
    }
    assertObjectId(commentId, 'commentId');

    const doc = await Comment.findOneAndDelete({ _id: commentId, user_id: userId });
    if (!doc) {
      const err = new Error('Không tìm thấy comment hoặc bạn không có quyền');
      err.status = 404;
      throw err;
    }
    return { success: true };
  },
};

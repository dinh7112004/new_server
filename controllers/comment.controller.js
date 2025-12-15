const svc = require('../services/comment.service');

exports.listByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const data = await svc.listByProduct(productId, { page, limit });
    res.status(200).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Không thể lấy bình luận' });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { product_id, rating, content } = req.body;
    const doc = await svc.create(userId, { productId: product_id, content, rating });
    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Bạn đã đánh giá sản phẩm này' });
    res.status(err.status || 500).json({ message: err.message || 'Không thể tạo bình luận' });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { commentId } = req.params;
    const { rating, content } = req.body;
    const doc = await svc.update(userId, commentId, { content, rating });
    res.status(200).json(doc);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Không thể cập nhật bình luận' });
  }
};

exports.remove = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { commentId } = req.params;
    const out = await svc.remove(userId, commentId);
    res.status(200).json(out);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Không thể xoá bình luận' });
  }
};

const Product = require("../models/Product");
const cloudinary = require("../utils/cloudinary");
const fs = require('fs');
const path = require("path");
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const wishlistService = require('../services/wishlist.service');
const Comment = require("../models/Comment");
const Order = require("../models/Order");


// Kiểm tra có dùng Cloudinary không
const useCloudinary = process.env.USE_CLOUDINARY === "true";

// Lấy đường dẫn URL đúng cho ảnh (local hoặc cloud)
function getImageUrl(file) {
  if (useCloudinary) return file.path; 
  return `/uploads/${file.filename}`;   
}

function deleteTempFiles(files) {
    if (!useCloudinary) return; 

    const fileList = Array.isArray(files) ? files : [files]; 
    
    fileList.forEach(file => {
        if (file && file.path) {
            fs.unlink(file.path, (err) => {
                if (err) console.error("Lỗi khi xoá tệp tạm thời (Cloudinary mode):", err);
            });
        }
    });
}

// Lấy public_id từ link Cloudinary để xoá
function extractPublicId(url) {
  const parts = url.split("/");
  const filename = parts.pop().split(".")[0];
  const folder = "firestore";
  return `${folder}/${filename}`;
}

// =======================================================
// ⭐ HÀM ĐÃ SỬA LỖI TÌM KIẾM THEO 'q' ⭐
// =======================================================
exports.searchProducts = async (req, res) => {
  try {
    // Đã sửa: LẤY CẢ 'q' (từ khóa tìm kiếm từ client)
    const { q, name, category, sort } = req.query; 
    const filter = {};

    // 1. LỌC THEO TỪ KHÓA CHÍNH (q)
    if (q) {
        // Tìm kiếm không phân biệt chữ hoa/thường trong tên sản phẩm
        filter.name = { $regex: q, $options: 'i' };
    } 
    // Nếu có cả 'name' và 'q', chúng ta ưu tiên 'q' cho tìm kiếm chung.
    else if (name) {
        filter.name = { $regex: name, $options: 'i' };
    }
    
    // 2. LỌC THEO DANH MỤC (NẾU CÓ)
    if (category) filter.category = { $regex: `^${category}$`, $options: 'i' };

    // 3. SẮP XẾP
    let sortOption = { createdAt: -1 };
    if (sort === "name_asc") sortOption = { name: 1 };
    if (sort === "name_desc") sortOption = { name: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };

    // 4. THỰC HIỆN TRUY VẤN
    const products = await Product.find(filter)
      .collation({ locale: 'vi', strength: 1 })
      .sort(sortOption);

    res.json(products);
  } catch (err) {
    console.error('Lỗi khi tìm kiếm:', err);
    res.status(500).json({ message: 'Lỗi server khi tìm kiếm' });
  }
};
// =======================================================
// PHẦN CÒN LẠI CỦA CONTROLLER (Được giữ nguyên)
// =======================================================

// Lấy tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const filter = {};

    // Lọc theo 'featured'
    if (req.query.featured === 'true') {
      filter.is_featured = true;
    }

    // Lọc theo 'category'
    if (req.query.category) {
      filter.category = { $regex: `^${req.query.category}$`, $options: 'i' }; 
    }

    // Lọc theo 'name' (tìm kiếm theo tên sản phẩm)
    if (req.query.name) {
      filter.name = { $regex: req.query.name, $options: 'i' }; 
    }

    const products = await Product.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'comments',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$product_id', '$$pid'] } } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
          ],
          as: 'ratingDoc'
        }
      },
      { $addFields: { _r: { $first: '$ratingDoc' } } },
      {
        $addFields: {
          ratingAvg: { $round: [{ $ifNull: ['$_r.avg', 0] }, 1] },
          ratingCount: { $ifNull: ['$_r.count', 0] },
        }
      },
      { $project: { ratingDoc: 0, _r: 0 } },
    ]).collation({ locale: 'vi', strength: 1 });

    if (products.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm phù hợp với yêu cầu tìm kiếm." });
    }

    res.json(products); 
  } catch (err) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", err);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm" });
  }
};


// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // Tính rating cho sản phẩm
    const agg = await Comment.aggregate([
      { $match: { product_id: new mongoose.Types.ObjectId(product._id) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingAvg = Number((agg[0]?.avg || 0).toFixed(1));
    const ratingCount = agg[0]?.count || 0;

    // Kiểm tra isFavorite (như cũ)
    let isFavorite = false;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.userId) {
          isFavorite = await wishlistService.isInWishlist(decoded.userId, product._id);
        }
      }
    } catch (_) {
      isFavorite = false;
    }

    //  Kiểm tra sản phẩm có đơn hàng nào chưa
    const hasOrder = await Order.exists({ "items.product_id": product._id });

    // Trả về kèm rating, isFavorite và hasOrders
    return res.json({
      ...product.toObject(),
      ratingAvg,
      ratingCount,
      isFavorite,
      hasOrders: !!hasOrder, 
    });
  } catch (err) {
    console.error("Lỗi khi lấy sản phẩm:", err);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm" });
  }
};

// Thêm sản phẩm mới
exports.createProduct = async (req, res) => {
  const {
    name,
    price,
    import_price,
    category,
    brand,
    status = "Đang bán",
    description,
    variations: variationsRaw,
  } = req.body;

  let imageFile = req.files?.image?.[0];
  let extraImgFiles = req.files?.images || [];
  
  try {

    if (!name || !category || !brand)
      return res.status(400).json({ message: "Tên, danh mục và thương hiệu là bắt buộc." });

    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0)
      return res.status(400).json({ message: "Giá phải là số dương." });

    const importPriceNum = Number(import_price);
    if (!import_price || isNaN(importPriceNum) || importPriceNum <= 0)
      return res.status(400).json({ message: "Giá nhập phải là số dương." });

    let parsedDescription = [];
    if (description) {
      try {
        parsedDescription = JSON.parse(description);
        const ok = Array.isArray(parsedDescription) && parsedDescription.every(d => d.field && d.value);
        if (!ok) throw new Error();
      } catch {
        return res.status(400).json({ message: "Trường description không hợp lệ." });
      }
    }

    let variations = [];
    if (variationsRaw) {
      try {
        variations = JSON.parse(variationsRaw);
        const ok = Array.isArray(variations) && variations.every(v => v.color && v.size && !isNaN(v.quantity));
        if (!ok) throw new Error();
      } catch {
        return res.status(400).json({ message: "Trường variations không hợp lệ." });
      }
    }

    const totalQuantity = variations.reduce((sum, v) => sum + Number(v.quantity), 0);
    let statusValue = req.body.status || "Đang bán"; 

    if (statusValue !== "Ngừng bán") {
      if (totalQuantity <= 0) {
        statusValue = "Hết hàng";
      } else {
        statusValue = "Đang bán";
      }
    }


    if (!imageFile)
      return res.status(400).json({ message: "Phải có ảnh đại diện (image)." });

    const imageURL = getImageUrl(imageFile);

    if (extraImgFiles.length > 6)
      return res.status(400).json({ message: "Tối đa 6 ảnh bổ sung." });

    const images = extraImgFiles.map(file => getImageUrl(file));

    const product = await Product.create({
      name: name.trim(),
      image: imageURL,
      images,
      description: parsedDescription,
      price: priceNum,
      import_price: importPriceNum,
      quantity: totalQuantity,
      category: category.trim(),
      brand: brand.trim(),
      variations,
      status: statusValue.trim(), 
      is_featured: req.body.is_featured === 'true' || req.body.is_featured === true,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Lỗi khi tạo sản phẩm:", err); 
    res.status(500).json({ message: `Không thể tạo sản phẩm: ${err.message}` }); 
  } finally {
    deleteTempFiles(imageFile);
    deleteTempFiles(extraImgFiles);
  }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
  const files = {
    image: req.files?.image?.[0],
    images: req.files?.images || [],
  };
  let product = null;

  try {
    const updateData = { ...req.body };

    if (typeof req.body.is_featured !== "undefined") {
      updateData.is_featured =
        req.body.is_featured === "true" || req.body.is_featured === true;
    }

    if (req.body.import_price) {
      const importPriceNum = Number(req.body.import_price);
      if (!importPriceNum || isNaN(importPriceNum) || importPriceNum <= 0) {
        return res.status(400).json({ message: "Giá nhập phải là số dương." });
      }
      updateData.import_price = importPriceNum;
    }

    if (typeof updateData.description === "string") {
      try {
        updateData.description = JSON.parse(updateData.description);
      } catch {
        return res.status(400).json({ message: "Mô tả không hợp lệ." });
      }
    }

    if (req.body.variations) {
      try {
        const parsedVariations = JSON.parse(req.body.variations);
        if (!Array.isArray(parsedVariations)) {
          return res.status(400).json({ message: "Variations phải là mảng." });
        }
        for (const v of parsedVariations) {
          if (!v.color || !v.size || isNaN(v.quantity)) {
            return res.status(400).json({ message: "Variation thiếu thông tin." });
          }
        }
        updateData.variations = parsedVariations;
        updateData.quantity = parsedVariations.reduce(
          (sum, v) => sum + Number(v.quantity || 0),
          0
        );
      } catch {
        return res.status(400).json({ message: "Variations không hợp lệ." });
      }
    }

    if (typeof updateData.quantity !== "undefined") {
      if (updateData.status !== "Ngừng bán") {
        if (updateData.quantity <= 0) {
          updateData.status = "Hết hàng";
        } else {
          updateData.status = "Đang bán";
        }
      }
    }

    product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại." });

    const hasOrder = await Order.exists({ "items.product_id": product._id });
    if (hasOrder) {
      return res
        .status(400)
        .json({ message: "Sản phẩm này đã có đơn hàng, không thể chỉnh sửa!" });
    }

    if (files.image) {
      const newImage = getImageUrl(files.image);
      updateData.image = newImage;

      if (useCloudinary && product.image?.includes("res.cloudinary.com")) {
        try {
          const publicId = extractPublicId(product.image);
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Không thể xoá ảnh đại diện cũ:", err.message);
        }
      }
    } else if (req.body.imageMode === "keep") {
      updateData.image = product.image;
    } else {
      updateData.image = "";
    }

    let updatedImages = product.images || [];

    if (req.body.imagesToRemove) {
      let imagesToRemove = [];
      try {
        imagesToRemove = JSON.parse(req.body.imagesToRemove);
      } catch {
        return res.status(400).json({ message: "imagesToRemove không hợp lệ." });
      }

      updatedImages = updatedImages.filter(
        (img) => !imagesToRemove.includes(img)
      );

      if (useCloudinary) {
        for (const imgUrl of imagesToRemove) {
          try {
            const publicId = extractPublicId(imgUrl);
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error("Không thể xoá ảnh:", err.message);
          }
        }
      }
    }

    if (files.images.length > 0) {
      const newImages = files.images.map((file) => getImageUrl(file));
      if (req.body.imagesMode === "append") {
        updatedImages = [...updatedImages, ...newImages];
      } else {
        updatedImages = newImages;
      }
    }
    updateData.images = updatedImages;

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("Lỗi cập nhật sản phẩm:", err);
    res.status(500).json({ message: "Không thể cập nhật sản phẩm." });
  } finally {
    deleteTempFiles(files.image);
    deleteTempFiles(files.images);
  }
};

// Xoá sản phẩm
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại." });
    
    // Xoá ảnh trên Cloudinary
    if (useCloudinary) {
      if (product.image) {
        try {
          const publicId = extractPublicId(product.image);
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Không thể xoá ảnh đại diện cũ:", err.message);
        }
      }
      for (const imgUrl of product.images) {
          try {
            const publicId = extractPublicId(imgUrl);
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error("Không thể xoá ảnh bổ sung:", err.message);
          }
      }
    }
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá sản phẩm" });
  } catch (err) {
    console.error("Lỗi khi xoá sản phẩm:", err);
    res.status(400).json({ message: "Không thể xoá sản phẩm" });
  }
};

exports.toggleFeatured = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
  }

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });

    product.is_featured = !product.is_featured;
    await product.save();

    res.json({ message: "Cập nhật trạng thái nổi bật thành công.", is_featured: product.is_featured });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
};
// Lấy sản phẩm liên quan theo category (loại trừ sản phẩm hiện tại)
exports.getRelatedProductsByCategory = async (req, res) => {
  const { category, exclude } = req.query;

  try {
    const products = await Product.find({
      category,
      _id: { $ne: exclude },
    }).limit(8);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy sản phẩm liên quan" });
  }
};

// Nhập hàng
exports.restockProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { items, quantity, allowNew = false, import_price } = req.body;  

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại." });

    if (import_price !== undefined) { 
      const newImportPrice = Number(import_price);
      if (!isNaN(newImportPrice) && newImportPrice > 0) {
        product.import_price = newImportPrice;
      } else {
        return res.status(400).json({ message: "Giá nhập phải là số dương." });
      }
    }

    const hasVariations = Array.isArray(product.variations) && product.variations.length > 0;

    if (hasVariations) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Sản phẩm có biến thể. Hãy gửi 'items: [{color,size,quantity}]' để nhập hàng."
        });
      }

      for (const it of items) {
        const addQty = Number(it.quantity);
        if (!it.color || !it.size || !Number.isFinite(addQty) || addQty <= 0) {
          return res.status(400).json({ message: "Mỗi item cần color, size và quantity > 0." });
        }

        const idx = product.variations.findIndex(
          v => v.color === it.color && v.size === it.size
        );

        if (idx >= 0) {
          product.variations[idx].quantity += addQty;
        } else if (allowNew) {
          product.variations.push({
            color: it.color,
            size: it.size,
            quantity: addQty
          });
        } else {
          return res.status(400).json({
            message: `Biến thể ${it.color}-${it.size} chưa tồn tại. Bật 'allowNew' để tự thêm.`
          });
        }
      }

      product.quantity = product.variations.reduce((s, v) => s + Number(v.quantity || 0), 0);
    } else {
      const addQty = Number(quantity);
      if (!Number.isFinite(addQty) || addQty <= 0) {
        return res.status(400).json({
          message: "Truyền 'quantity' là số dương để nhập hàng cho sản phẩm không có biến thể."
        });
      }
      product.quantity = Number(product.quantity || 0) + addQty;
    }

    if (product.status !== "Ngừng bán") {
      product.status = product.quantity > 0 ? "Đang bán" : "Hết hàng";
    }

    await product.save();
    return res.json(product);
  } catch (err) {
    console.error("Lỗi nhập hàng:", err);
    return res.status(500).json({ message: "Không thể nhập hàng." });
  }
};

// Lấy sản phẩm mới nhất
exports.getNewestProducts = async (req, res) => {
  try {
    const { limit = 5, category } = req.query;
    
    const filter = {};
    
    if (category) {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }
    
    filter.status = "Đang bán";
    
    const products = await Product.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'comments',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$product_id', '$$pid'] } } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
          ],
          as: 'ratingDoc'
        }
      },
      { $addFields: { _r: { $first: '$ratingDoc' } } },
      {
        $addFields: {
          ratingAvg: { $round: [{ $ifNull: ['$_r.avg', 0] }, 1] },
          ratingCount: { $ifNull: ['$_r.count', 0] },
        }
      },
      { $project: { ratingDoc: 0, _r: 0 } },
    ]).collation({ locale: 'vi', strength: 1 });

    res.json(products);
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm mới nhất:', error);
    res.status(500).json({ message: "Lỗi khi lấy sản phẩm mới nhất" });
  }
};
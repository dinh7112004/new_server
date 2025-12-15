// controllers/statistics.controller.js
const mongoose = require("mongoose");
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require("../models/Category");

exports.getProductStatistics = async (req, res) => {
  try {
    const {
      sortBy = 'sold',
      order = 'desc',
      status,
      from,
      to,
      limit = 10,
      lowStockThreshold = 10
    } = req.query;

    // ===== 1. Lấy số liệu tổng =====
    const totalProducts = await Product.countDocuments();

    // 2. Tổng tồn kho (cộng tất cả quantity trong variations)
    const stockData = await Product.aggregate([
      { $unwind: "$variations" },
      { $group: { _id: null, totalStock: { $sum: "$variations.quantity" } } }
    ]);
    const totalStock = stockData.length > 0 ? stockData[0].totalStock : 0;

    // 3. Số sản phẩm sắp hết hàng (ít nhất một biến thể có số lượng < threshold)
    const lowStockCount = await Product.countDocuments({
      "variations.quantity": { $lt: parseInt(lowStockThreshold) }
    });
    // 4. Số sản phẩm đã hết hàng
    const outOfStockCount = await Product.countDocuments({
      status: "Hết hàng"
    });
    // ===== 2. Thống kê sản phẩm bán chạy =====
    const validStatuses = ['delivered'];
    const matchOrder = { status: { $in: validStatuses } };

    if (from || to) {
      matchOrder.createdAt = {};
      if (from) matchOrder.createdAt.$gte = new Date(from);
      if (to) matchOrder.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: matchOrder },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product_id',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ];

    if (status) {
      pipeline.push({
        $match: { 'product.status': status }
      });
    }

    pipeline.push({
      $addFields: {
        stock: '$product.quantity',
        name: '$product.name',
        image: '$product.image',
        category: '$product.category',
        status: '$product.status'
      }
    });

    let sortField = {};
    switch (sortBy) {
      case 'sold':
        sortField = { totalSold: order === 'asc' ? 1 : -1 };
        break;
      case 'revenue':
        sortField = { totalRevenue: order === 'asc' ? 1 : -1 };
        break;
      case 'stock':
        sortField = { stock: order === 'asc' ? 1 : -1 };
        break;
      case 'name':
        sortField = { name: order === 'asc' ? 1 : -1 };
        break;
      default:
        sortField = { totalSold: -1 };
    }
    pipeline.push({ $sort: sortField });
    pipeline.push({ $limit: parseInt(limit) });

    const topProducts = await Order.aggregate(pipeline);

    // ===== 3. Trả kết quả =====
    res.json({
      summary: {
        totalProducts,
        totalStock,
        lowStockCount,
        outOfStockCount,
      },
      topProducts
    });

  } catch (err) {
    console.error('Lỗi khi thống kê sản phẩm:', err);
    res.status(500).json({ message: 'Không thể thống kê sản phẩm.' });
  }
};

// ====================== Thống kê đơn hàng ======================
exports.getOrderStatistics = async (req, res) => {
  try {
    const { from, to, limit = 5, groupBy = "day" } = req.query;

    // Điều kiện lọc thời gian
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    // ===== 1. Summary =====
    const totalOrders = await Order.countDocuments(match);
    const pendingOrders = await Order.countDocuments({ ...match, status: "pending" });
    const processingOrders = await Order.countDocuments({ ...match, status: "processing" });
    const shippingOrders = await Order.countDocuments({ ...match, status: "shipping" });
    const deliveredOrders = await Order.countDocuments({ ...match, status: "delivered" });
    const cancelledOrders = await Order.countDocuments({ ...match, status: "cancelled" });

    // Tính doanh thu & lợi nhuận (chỉ đơn đã giao)
    const deliveredOrdersData = await Order.find({ ...match, status: "delivered" })
      .populate("items.product_id", "import_price");

    let totalRevenue = 0;
    let totalCost = 0;

    deliveredOrdersData.forEach(order => {
      totalRevenue += order.total_amount;
      order.items.forEach(item => {
        const importPrice = item.product_id?.import_price || 0;
        totalCost += importPrice * item.quantity;
      });
    });

    const totalProfit = totalRevenue - totalCost;

    // Doanh thu hôm nay
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await Order.find({
      status: "delivered",
      createdAt: { $gte: todayStart }
    }).populate("items.product_id", "import_price");

    let todayRevenue = 0;
    let todayCost = 0;
    todayOrders.forEach(order => {
      todayRevenue += order.total_amount;
      order.items.forEach(item => {
        todayCost += (item.product_id?.import_price || 0) * item.quantity;
      });
    });
    const todayProfit = todayRevenue - todayCost;

    // ===== 2. Top khách hàng =====
    const topCustomers = await Order.aggregate([
      { $match: { ...match, status: "delivered" } },
      {
        $group: {
          _id: "$user_id",
          totalSpent: { $sum: "$total_amount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          totalOrders: "$orderCount",
          name: "$user.full_name",
          email: "$user.email"
        }
      }
    ]);

    // ===== 3. Biểu đồ theo ngày / tháng =====
    const dateFormat =
      groupBy === "month"
        ? { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
        : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

    const ordersByDate = await Order.aggregate([
      { $match: { ...match, status: "delivered" } },
      {
        $group: {
          _id: dateFormat,
          orderCount: { $sum: 1 },
          revenue: { $sum: "$total_amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const trend = await Promise.all(
      ordersByDate.map(async (item) => {
        // Xác định khoảng thời gian bắt đầu và kết thúc
        let startDate = new Date(item._id);
        let endDate;

        if (groupBy === "month") {
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
        } else {
          endDate = new Date(startDate); // clone
          endDate.setDate(endDate.getDate() + 1);
        }

        // Lấy danh sách đơn đã giao trong khoảng thời gian
        const orders = await Order.find({
          status: "delivered",
          createdAt: { $gte: startDate, $lt: endDate },
        }).populate("items.product_id", "import_price");

        // Tính tổng giá vốn
        let cost = 0;
        orders.forEach((o) => {
          o.items.forEach((it) => {
            cost += (it.product_id?.import_price || 0) * it.quantity;
          });
        });

        return {
          date: item._id,
          orders: item.orderCount,
          revenue: item.revenue,
          profit: item.revenue - cost,
        };
      })
    );


    // ===== Trả kết quả =====
    res.json({
      summary: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        totalCost,
        totalProfit,
        todayRevenue,
        todayProfit
      },
      topCustomers,
      trend
    });

  } catch (err) {
    console.error("Lỗi thống kê đơn hàng:", err);
    res.status(500).json({ message: "Không thể thống kê đơn hàng." });
  }
};


// Thống kê tồn kho
exports.getInventoryStatistics = async (req, res) => {
  try {
    const { category, brand } = req.query;
    let { minStock, maxStock, minPrice, maxPrice } = req.query;

    // Convert sang số
    minStock = parseInt(minStock);
    maxStock = parseInt(maxStock);
    minPrice = parseInt(minPrice);
    maxPrice = parseInt(maxPrice);

    const match = {};
    if (category) match.category = category;
    if (brand) match.brand = brand;

    // ================= Tổng quan tồn kho =================
    const overall = await Product.aggregate([
      { $match: match },
      { $unwind: "$variations" },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$variations.quantity" },
          totalValueSell: { $sum: { $multiply: ["$variations.quantity", "$price"] } },
          totalValueImport: { $sum: { $multiply: ["$variations.quantity", "$import_price"] } }
        }
      }
    ]);
    const overview = overall[0] || { totalStock: 0, totalValueSell: 0, totalValueImport: 0 };

    // ================= Danh sách sản phẩm theo category =================
    let products = [];
    if (category) {
      products = await Product.aggregate([
        { $match: match }, // lọc category, brand trước
        { $unwind: "$variations" },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            price: { $first: "$price" },
            import_price: { $first: "$import_price" },
            brand: { $first: "$brand" },
            image: { $first: { $arrayElemAt: ["$images", 0] } },
            totalStock: { $sum: "$variations.quantity" }
          }
        },
        {
          $addFields: {
            inventoryValueSell: { $multiply: ["$totalStock", "$price"] },
            inventoryValueImport: { $multiply: ["$totalStock", "$import_price"] }
          }
        },
        {
          $match: {
            ...(isNaN(minStock) ? {} : { totalStock: { $gte: minStock } }),
            ...(isNaN(maxStock) ? {} : { totalStock: { $lte: maxStock } }),
            ...(isNaN(minPrice) ? {} : { price: { $gte: minPrice } }),
            ...(isNaN(maxPrice) ? {} : { price: { $lte: maxPrice } })
          }
        },
        { $sort: { inventoryValueSell: -1 } }
      ]);
    }

    // ================= Nếu không có category thì gom theo danh mục =================
    let stockByCategory = [];
    if (!category) {
      stockByCategory = await Product.aggregate([
        { $unwind: "$variations" },
        { $match: match },
        {
          $group: {
            _id: "$category",
            totalStock: { $sum: "$variations.quantity" },
            totalValueSell: { $sum: { $multiply: ["$variations.quantity", "$price"] } },
            totalValueImport: { $sum: { $multiply: ["$variations.quantity", "$import_price"] } }
          }
        },
        {
          $project: {
            category: "$_id",
            totalStock: 1,
            totalValueSell: 1,
            totalValueImport: 1
          }
        }
      ]);
    }

    res.json({ overview, products, stockByCategory });
  } catch (err) {
    console.error("Lỗi khi thống kê tồn kho:", err);
    res.status(500).json({ message: "Lỗi server khi thống kê tồn kho" });
  }
};






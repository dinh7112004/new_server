// require("dotenv").config();
// const express = require("express");
// const path = require("path");
// const cookieParser = require("cookie-parser");
// const logger = require("morgan");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const addressRoutes = require('./routes/address.routes');
// const orderRoutes = require("./routes/order.routes");
// const statisticsRoutes = require('./routes/statistics.routes');
// const cartRoutes = require('./routes/cart.routes');
// const notificationRoutes = require("./routes/notification.routes");

// // Kết nối MongoDB
// connectDB();

// const app = express();

// // Biến môi trường
// const isProduction = process.env.NODE_ENV === "production";


// // Log origin để kiểm tra request từ đâu
// app.use((req, res, next) => {
//   console.log("=> Origin:", req.headers.origin);
//   next();
// });

// // CORS cấu hình chuẩn cho cả localhost và vercel
// const corsOptions = {
//   origin: [
//     "http://localhost:3000",
//     "http://192.168.1.9:5002",
//     "http://192.168.1.2:5002",
//     "http://localhost:5002",
//     "http://10.158.14.189",
//     "http://localhost:5003",
//     "https://md-08-firestore-admin.vercel.app/"
    
//   ],
//   credentials: true,
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   allowedHeaders: ["Content-Type", "Authorization"],
// };
// app.use(cors(corsOptions));

// // Các middleware cần thiết
// app.use(logger("dev"));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());

// // Static folder cho ảnh upload (chỉ dùng ở local)
// if (!isProduction) {
//   const uploadsPath = path.join(__dirname, "tmp", "uploads"); //dùng __dirname
//   app.use("/uploads", express.static(uploadsPath));
//   console.log("=> Đang dùng ảnh local từ", uploadsPath);
// }else {
//   console.log("=> Đang dùng Cloudinary - không cần /uploads");
// }

// // Các routes
// app.use("/", require("./routes/index"));
// app.use("/api/admin", require("./routes/admin.routes"));
// app.use("/api/products", require("./routes/product.routes"));
// app.use("/api/categories", require("./routes/category.routes"));
// app.use("/api/brands", require("./routes/brand.routes"));
// app.use("/api/sizes", require("./routes/size.routes"));
// app.use("/api/description-fields", require("./routes/descriptionField.routes"));
// app.use("/api/upload", require("./routes/upload.routes"));
// app.use("/api/auth", require("./routes/auth.routes"));
// app.use("/api/users", require("./routes/user.routes"));
// app.use("/api/wishlists", require("./routes/wishlist.routes"));
// app.use("/api/comments", require("./routes/comment.routes")); //commen
// // Nhóm route quản lý user bởi admin
// app.use("/api/admin", require("./routes/adminUser.routes"));
// app.use('/api/addresses', require("./routes/address.routes"));
// app.use("/api/orders", orderRoutes);
// app.use("/api/payments", require("./routes/payment.routes"));
// app.use("/api/cart", cartRoutes);
// app.use('/api/admin/statistics', statisticsRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/chat", require("./routes/chat.routes"));
// app.use("/api/chat-new", require("./routes/chatNew.routes"));
// // Nhóm route quản lý bởi staff (dưới admin)




// module.exports = app;
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const connectDB = require("./config/db");
const addressRoutes = require('./routes/address.routes');
const orderRoutes = require("./routes/order.routes");
const statisticsRoutes = require('./routes/statistics.routes');
const cartRoutes = require('./routes/cart.routes');
const notificationRoutes = require("./routes/notification.routes");

// Kết nối MongoDB
connectDB();

const app = express();

// Biến môi trường
const isProduction = process.env.NODE_ENV === "production";


// Log origin để kiểm tra request từ đâu
app.use((req, res, next) => {
  console.log("=> Origin:", req.headers.origin);
  next();
});

// CORS cấu hình chuẩn cho cả localhost và vercel
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://192.168.1.9:5002",
    "http://192.168.1.2:5002",
    "http://localhost:5002",
    "http://10.158.14.189",
    "http://localhost:5003",
    "https://md-08-firestore-admin.vercel.app/"
    
  ],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Các middleware cần thiết
app.use(logger("dev"));
// ⭐ ĐÃ SỬA: Thêm middleware đọc JSON body (Khắc phục lỗi 500: req.body is undefined)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static folder cho ảnh upload (chỉ dùng ở local)
if (!isProduction) {
  const uploadsPath = path.join(__dirname, "tmp", "uploads"); //dùng __dirname
  app.use("/uploads", express.static(uploadsPath));
  console.log("=> Đang dùng ảnh local từ", uploadsPath);
}else {
  console.log("=> Đang dùng Cloudinary - không cần /uploads");
}

// Các routes
app.use("/", require("./routes/index"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/brands", require("./routes/brand.routes"));
app.use("/api/sizes", require("./routes/size.routes"));
app.use("/api/description-fields", require("./routes/descriptionField.routes"));
app.use("/api/upload", require("./routes/upload.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/wishlists", require("./routes/wishlist.routes"));
app.use("/api/comments", require("./routes/comment.routes")); //commen
// Nhóm route quản lý user bởi admin
app.use("/api/admin", require("./routes/adminUser.routes"));
app.use('/api/addresses', require("./routes/address.routes"));
app.use("/api/orders", orderRoutes);
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/cart", cartRoutes);
app.use('/api/admin/statistics', statisticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/chat-new", require("./routes/chatNew.routes"));
// Nhóm route quản lý bởi staff (dưới admin)


module.exports = app;
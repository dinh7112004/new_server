const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendMail = require("../utils/sendMail"); // Đảm bảo sendMail đã được cấu hình nếu bạn muốn gửi mail thật
const OtpCode = require("../models/otp.model");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 1. Đăng ký & tạo OTP (không gửi mail)
exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được đăng ký" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    await OtpCode.findOneAndUpdate(
      { email },
      { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, new: true }
    );

    console.log(`OTP cho ${email} là: ${otp}`);

    res.json({
      message: "Đã tạo OTP (không gửi mail). Kiểm tra console để lấy mã",
      email,
      otp,
    });
  } catch (err) {
    console.error("Lỗi register:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 2. Xác minh OTP & tạo tài khoản
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, full_name, password } = req.body;

    const otpDoc = await OtpCode.findOne({ email });
    if (!otpDoc) {
      console.log(`OTP không tồn tại cho email: ${email}`);
      return res.status(400).json({ success: false, message: "OTP không tồn tại" });
    }

    // So sánh string, loại bỏ khoảng trắng
    if (otpDoc.code.trim() !== otp.trim()) {
      console.log(`OTP không đúng: gửi ${otp}, DB ${otpDoc.code}`);
      return res.status(400).json({ success: false, message: "OTP không đúng" });
    }

    // Kiểm tra hết hạn
    if (otpDoc.expiresAt < Date.now()) {
      console.log(`OTP đã hết hạn cho email: ${email}`);
      return res.status(400).json({ success: false, message: "OTP đã hết hạn" });
    }

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Tài khoản đã tồn tại, vui lòng đăng nhập" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      full_name,
      password: hashedPassword,
      is_phone_verified: false,
    });

    await newUser.save();
    await OtpCode.deleteMany({ email });

    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Đăng ký và xác minh thành công",
      token,
      user: {
        id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Lỗi verifyOtp:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 3. Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Email hoặc mật khẩu không đúng" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Email hoặc mật khẩu không đúng" });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Lỗi login:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};


// -------------------------------------------------------------------
// ⭐ 4. YÊU CẦU GỬI OTP CHO CHỨC NĂNG QUÊN MẬT KHẨU (Bước 1 Android) ⭐
// Endpoint: POST /api/auth/forgot-password/request-otp
// -------------------------------------------------------------------
exports.requestPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Kiểm tra Email tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      // Trả về lỗi chung để tránh tiết lộ tài khoản nào tồn tại
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại hoặc lỗi gửi OTP.",
      });
    }

    // 2. Tạo mã OTP ngẫu nhiên
    const otp = crypto.randomInt(100000, 999999).toString();

    // 3. Lưu/Cập nhật mã OTP vào DB (Thời gian hết hạn 10 phút)
    await OtpCode.findOneAndUpdate(
      { email },
      {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), 
      },
      { upsert: true, new: true }
    );

    // 4. Gửi email (Bạn có thể bỏ comment khối gửi mail dưới nếu đã cấu hình sendMail)
    
    // --- CHỈ IN RA CONSOLE (Nếu chưa cấu hình sendMail) ---
    console.log(`[QUÊN MẬT KHẨU] OTP cho ${email} là: ${otp}`);
    res.json({
      success: true,
      message: "Đã gửi mã OTP (Xem console server để lấy mã).",
    });


  } catch (error) {
    console.error("Lỗi yêu cầu OTP đặt lại mật khẩu:", error);
    res.status(500).json({ success: false, message: "Lỗi server: Không thể gửi mã OTP" });
  }
};


// -------------------------------------------------------------------
// ⭐ 5. XÁC MINH OTP VÀ ĐẶT MẬT KHẨU MỚI (Bước 3 Android) ⭐
// Endpoint: POST /api/auth/forgot-password/reset
// -------------------------------------------------------------------
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. Tìm mã OTP và kiểm tra hết hạn
    const otpDoc = await OtpCode.findOne({ email, code: otp });

    if (!otpDoc || otpDoc.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
      });
    }

    // 2. Tìm User
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
    }

    // 3. Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Cập nhật mật khẩu và xoá OTP
    user.password = hashedPassword;
    await user.save();
    await OtpCode.deleteOne({ email }); 

    res.json({ success: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
    
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi đặt lại mật khẩu." });
  }
};
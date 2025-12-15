const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpCode = require("../models/otp.model");
const sendMail = require("../utils/sendMail");

// ĐĂNG KÝ
exports.register = async (req, res) => {
  const { username, password, name, email, phone } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ phone });
    if (existingAdmin) {
      return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
    }
    const existingEmail = await Admin.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }
    const existingUsername = await Admin.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username đã tồn tại" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      username,
      password: hashedPassword,
      name,
      email,
      phone,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// // ĐĂNG NHẬP
exports.login = async (req, res) => {
  const { phone, password } = req.body;

  try {
    const admin = await Admin.findOne({ phone });
    if (!admin) return res.status(400).json({ message: "Tài khoản không tồn tại" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );


    res.json({
      token,
      admin: {
        username: admin.username,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// ĐỔI MẬT KHẨU
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const adminId = req.user.userId; // Lấy từ middleware xác thực

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Không tìm thấy admin" });

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.sendAdminOtp = async (req, res) => {
  const normEmail = String(req.body.email || '').trim().toLowerCase();
  if (!normEmail) return res.status(400).json({ message: "Email là bắt buộc" });

  // 🔍 Cho phép tìm ở Admin hoặc User
  let account = await Admin.findOne({ email: normEmail });
  if (!account && User) {
    account = await User.findOne({ email: normEmail });
  }
  if (!account) {
    return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    // ⚠️ Dùng $set + $setOnInsert để không làm mất email
    await OtpCode.findOneAndUpdate(
      { email: normEmail },
      {
        $set: { code, expiresAt },
        $setOnInsert: { email: normEmail },
      },
      { upsert: true, new: true }
    );

    const html = `
      <h2>Mã xác thực đặt lại mật khẩu:</h2>
      <h3>${code}</h3>
      <p>Mã có hiệu lực trong 5 phút. Không chia sẻ với bất kỳ ai.</p>
    `;

    await sendMail(normEmail, "Mã OTP xác minh đặt lại mật khẩu", html);
    return res.json({ message: "✅ Mã OTP đã được gửi qua email" });
  } catch (error) {
    console.error("sendAdminOtp error:", error);
    return res.status(500).json({ message: "Lỗi khi gửi OTP" });
  }
};

// === XÁC NHẬN OTP & ĐẶT LẠI MẬT KHẨU ===
exports.resetAdminPassword = async (req, res) => {
  const normEmail = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const newPassword = req.body.newPassword;

  if (!normEmail || !code || !newPassword) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
  }

  try {
    const otpRecord = await OtpCode.findOne({ email: normEmail });
    if (!otpRecord || otpRecord.code !== code) {
      return res.status(400).json({ message: "OTP không hợp lệ" });
    }
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP đã hết hạn" });
    }

    // 🔍 Tìm tài khoản ở Admin hoặc User
    let target = await Admin.findOne({ email: normEmail });
    let isAdmin = true;
    if (!target && User) {
      target = await User.findOne({ email: normEmail });
      isAdmin = false;
    }
    if (!target) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    const hashed = await bcrypt.hash(newPassword, 10);
    target.password = hashed;
    await target.save();

    await OtpCode.deleteOne({ email: normEmail });

    // Tuỳ ý trả khác nhau nếu cần
    return res.json({ message: "✅ Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error("resetAdminPassword error:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

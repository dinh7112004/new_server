const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Danh sách các trường cần SELECT
const USER_FIELDS = 'full_name email phone_number avatar_url date_of_birth gender street ward district province';

// Lấy thông tin người dùng dựa vào token (ĐÃ SỬA: Dùng hằng số để chọn đầy đủ trường)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      USER_FIELDS // Sử dụng hằng số để đảm bảo đầy đủ các trường
    );

    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Cập nhật thông tin cá nhân (ĐÃ SỬA: Xử lý tên trường 'phone' và 'phone_number', và select đầy đủ)
exports.updateProfile = async (req, res) => {
  try {
    // ⭐ SỬA: Lấy giá trị phone_number từ body, chấp nhận cả 'phone' (từ Android) hoặc 'phone_number' (tên DB) ⭐
    const phone_number_from_request = req.body.phone_number || req.body.phone;
    
    const { 
      full_name, 
      date_of_birth, 
      gender, 
      avatar_url,
      street,
      ward,
      district,
      province
    } = req.body;

    const userId = req.user.userId;

    // Kiểm tra trùng số điện thoại
    if (phone_number_from_request) {
      const existing = await User.findOne({ phone_number: phone_number_from_request });
      if (existing && existing._id.toString() !== userId) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi người khác.' });
      }
    }
    
    // TẠO OBJECT CẬP NHẬT ĐẦY ĐỦ
    const updateObject = {
        full_name,
        phone_number: phone_number_from_request, // Đã chuẩn hóa giá trị
        date_of_birth,
        gender,
        avatar_url,
        street,
        ward,
        district,
        province
    };
    
    // Lưu ý: Mongoose sẽ bỏ qua các trường 'undefined' nếu chúng ta không tự lọc

    const updated = await User.findByIdAndUpdate(
      userId,
      updateObject, 
      { new: true, runValidators: true }
    )
    // ⭐ SỬA: Đảm bảo select đầy đủ các trường, bao gồm phone_number ⭐
    .select(USER_FIELDS);

    if (!updated) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng để cập nhật' });
    }

    // Tạo lại token mới
    const token = jwt.sign(
      { userId: updated._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Cập nhật thông tin thành công',
      user: updated, // TRẢ VỀ USER OBJECT ĐÃ CẬP NHẬT (có đủ các trường vừa select)
      token 
    });
  } catch (err) {
    console.error('Lỗi khi cập nhật thông tin:', err);
    res.status(500).json({ message: 'Không thể cập nhật thông tin' });
  }
};
// Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    user.password = hashed;
    await user.save();

    // Tạo lại JWT token mới
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Đổi mật khẩu thành công',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Cập nhật trạng thái online/offline của người dùng
exports.updateOnlineStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { is_online } = req.body;

    if (typeof is_online !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'Trạng thái online phải là boolean' 
      });
    }

    // Cập nhật trạng thái online và thời gian cuối cùng
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        is_online: is_online,
        last_seen: new Date(),
        socket_id: is_online ? req.user.socketId || null : null
      },
      { new: true }
    ).select('_id full_name email is_online last_seen');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    console.log(`👤 User ${userId} ${is_online ? 'online' : 'offline'}`);

    res.json({
      success: true,
      message: `Người dùng đã ${is_online ? 'online' : 'offline'}`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating online status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ' 
    });
  }
};

// Lấy danh sách người dùng online cho admin
exports.getOnlineStatus = async (req, res) => {
  try {
    // Role check is now handled by adminOnly middleware
    console.log('🔐 Admin accessing online status:', {
      userId: req.user?.userId,
      role: req.user?.role,
      roleType: typeof req.user?.role
    });
    
    // Lấy danh sách người dùng online
    const onlineUsers = await User.find({ 
      is_online: true,
      role: 1 // Chỉ lấy user, không lấy admin
    }).select('_id full_name email last_seen');

    console.log('👥 Found online users:', onlineUsers.length);

    res.json({
      success: true,
      data: {
        onlineUsers: onlineUsers.map(user => user._id.toString()),
        userDetails: onlineUsers
      }
    });
  } catch (error) {
    console.error('Error getting online status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ' 
    });
  }
};
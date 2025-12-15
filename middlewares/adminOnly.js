// middleware/adminOnly.js
module.exports = (req, res, next) => {
  console.log('🔐 Admin middleware check:', {
    userId: req.user?.id,
    role: req.user?.role,
    roleType: typeof req.user?.role,
    path: req.path,
    method: req.method
  });
  
  // Check if user is admin - support both number (0) and string ("admin") roles
  const isAdmin = req.user?.role === 0 || req.user?.role === "admin";
  
  if (!isAdmin) {
    console.log('🚫 Admin access denied:', { 
      userId: req.user?.id, 
      role: req.user?.role,
      roleType: typeof req.user?.role,
      path: req.path 
    });
    return res.status(403).json({ 
      message: 'Chỉ admin mới được truy cập',
      debug: {
        userId: req.user?.id,
        role: req.user?.role,
        roleType: typeof req.user?.role
      }
    });
  }
  
  console.log('✅ Admin access granted:', { 
    userId: req.user?.id, 
    role: req.user?.role,
    roleType: typeof req.user?.role,
    path: req.path 
  });
  next();
};

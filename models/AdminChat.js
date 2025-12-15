const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AdminChatSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  session_id: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  
  // Admin assigned to this chat
  assigned_admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // Chat priority: low, medium, high, urgent
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Chat category for better organization
  category: {
    type: String,
    enum: ['general', 'product', 'order', 'payment', 'shipping', 'technical', 'complaint'],
    default: 'general'
  },
  
  messages: [{
    message_id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    
    text: {
      type: String,
      required: true,
      maxLength: 2000
    },
    
    is_user: {
      type: Boolean,
      required: true
    },
    
    timestamp: {
      type: Date,
      default: Date.now
    },
    
    // Message type
    message_type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    },
    
    // For admin responses
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    
    // Read status
    is_read: {
      type: Boolean,
      default: false
    }
  }],
  
  // Chat session metadata
  status: {
    type: String,
    enum: ['waiting', 'active', 'resolved', 'closed'],
    default: 'waiting'
  },
  
  // Resolution info
  resolution: {
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolved_at: Date,
    resolution_note: String
  },
  
  last_activity: {
    type: Date,
    default: Date.now
  },
  
  // For analytics
  total_messages: {
    type: Number,
    default: 0
  },
  
  user_messages_count: {
    type: Number,
    default: 0
  },
  
  admin_messages_count: {
    type: Number,
    default: 0
  },
  
  // Response time tracking
  first_response_time: {
    type: Number, // in minutes
    default: null
  },
  
  avg_response_time: {
    type: Number, // in minutes
    default: null
  }
  
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for better performance
AdminChatSchema.index({ user_id: 1, session_id: 1 });
AdminChatSchema.index({ assigned_admin: 1, status: 1 });
AdminChatSchema.index({ priority: 1, status: 1 });
AdminChatSchema.index({ category: 1, status: 1 });
AdminChatSchema.index({ last_activity: -1 });
AdminChatSchema.index({ 'messages.timestamp': -1 });

// Update counters before saving
AdminChatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.total_messages = this.messages.length;
    this.user_messages_count = this.messages.filter(msg => msg.is_user).length;
    this.admin_messages_count = this.messages.filter(msg => !msg.is_user).length;
    this.last_activity = new Date();
    
    // Calculate first response time
    if (this.admin_messages_count === 1 && this.user_messages_count > 0) {
      const firstUserMessage = this.messages.find(msg => msg.is_user);
      const firstAdminMessage = this.messages.find(msg => !msg.is_user);
      if (firstUserMessage && firstAdminMessage) {
        const responseTime = (firstAdminMessage.timestamp - firstUserMessage.timestamp) / (1000 * 60); // in minutes
        this.first_response_time = responseTime;
      }
    }
  }
  next();
});

// Method to add a new message
AdminChatSchema.methods.addMessage = function(text, isUser, messageType = 'text', adminId = null) {
  const newMessage = {
    message_id: new mongoose.Types.ObjectId().toString(),
    text: text,
    is_user: isUser,
    timestamp: new Date(),
    message_type: messageType,
    admin_id: adminId,
    is_read: !isUser // Admin messages are read by default
  };
  
  this.messages.push(newMessage);
  
  // Update status
  if (isUser && this.status === 'waiting') {
    this.status = 'active';
  }
  
  return newMessage;
};

// Method to get recent messages
AdminChatSchema.methods.getRecentMessages = function(limit = 50) {
  return this.messages
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .reverse();
};

// Method to assign admin
AdminChatSchema.methods.assignAdmin = function(adminId) {
  this.assigned_admin = adminId;
  this.status = 'active';
  return this.save();
};

// Method to resolve chat
AdminChatSchema.methods.resolveChat = function(adminId, note = '') {
  this.status = 'resolved';
  this.resolution = {
    resolved_by: adminId,
    resolved_at: new Date(),
    resolution_note: note
  };
  return this.save();
};

// Method to close chat
AdminChatSchema.methods.closeChat = function() {
  this.status = 'closed';
  return this.save();
};

// Static method to find or create admin chat session
AdminChatSchema.statics.findOrCreateSession = async function(userId, sessionId) {
  let chat = await this.findOne({ user_id: userId, session_id: sessionId });
  
  if (!chat) {
    chat = new this({
      user_id: userId,
      session_id: sessionId,
      last_activity: new Date(),
      messages: [{
        message_id: new mongoose.Types.ObjectId().toString(),
        text: '👋 Chào mừng bạn đến với Manzone Support! Tôi là nhân viên hỗ trợ, rất vui được gặp bạn. Bạn có thể hỏi tôi bất kỳ điều gì về sản phẩm, đơn hàng, hoặc bất kỳ vấn đề gì. Hãy cho tôi biết bạn cần hỗ trợ gì nhé! 😊',
        is_user: false,
        message_type: 'text',
        timestamp: new Date()
      }]
    });
    await chat.save();
  }
  
  return chat;
};

// Static method to find waiting chats
AdminChatSchema.statics.findWaitingChats = function() {
  return this.find({ status: 'waiting' })
    .populate('user_id', 'name email')
    .sort({ created_at: 1 });
};

// Static method to find active chats by admin
AdminChatSchema.statics.findActiveChatsByAdmin = function(adminId) {
  return this.find({ 
    assigned_admin: adminId, 
    status: 'active' 
  })
    .populate('user_id', 'name email')
    .sort({ last_activity: -1 });
};

// Static method to find unassigned chats
AdminChatSchema.statics.findUnassignedChats = function() {
  return this.find({ 
    assigned_admin: null, 
    status: { $in: ['waiting', 'active'] } 
  })
    .populate('user_id', 'name email')
    .sort({ priority: -1, created_at: 1 });
};

module.exports = mongoose.model('AdminChat', AdminChatSchema, 'admin_chats');

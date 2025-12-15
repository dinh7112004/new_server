const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
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
  
  // Chat type: 'bot' for AI chat, 'admin' for admin chat
  type: {
    type: String,
    enum: ['bot', 'admin'],
    default: 'bot'
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
    
    // Metadata for bot responses
    response_type: {
      type: String,
      enum: [
        'greeting', 
        'product_info', 
        'product_list',
        'pricing', 
        'shipping', 
        'support', 
        'help',
        'info',
        'admin_response', 
        'welcome',
        'default'
      ],
      default: 'default'
    },
    
    // For admin responses
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    
    // For future AI integration
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    }
  }],
  
  // Chat session metadata
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
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
  
  bot_messages_count: {
    type: Number,
    default: 0
  },
  
  admin_messages_count: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for better performance
ChatSchema.index({ user_id: 1, session_id: 1 });
ChatSchema.index({ last_activity: -1 });
ChatSchema.index({ 'messages.timestamp': -1 });
ChatSchema.index({ type: 1, status: 1 });

// Update counters before saving
ChatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.total_messages = this.messages.length;
    this.user_messages_count = this.messages.filter(msg => msg.is_user).length;
    this.bot_messages_count = this.messages.filter(msg => !msg.is_user && !msg.admin_id).length;
    this.admin_messages_count = this.messages.filter(msg => msg.admin_id).length;
    this.last_activity = new Date();
  }
  next();
});

// Method to add a new message
ChatSchema.methods.addMessage = function(text, isUser, responseType = 'default', adminId = null) {
  const newMessage = {
    message_id: new mongoose.Types.ObjectId().toString(),
    text: text,
    is_user: isUser,
    timestamp: new Date(),
    response_type: isUser ? undefined : responseType,
    admin_id: adminId
  };
  
  this.messages.push(newMessage);
  return newMessage;
};

// Method to get recent messages
ChatSchema.methods.getRecentMessages = function(limit = 50) {
  return this.messages
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .reverse();
};

// Static method to find or create chat session
ChatSchema.statics.findOrCreateSession = async function(userId, sessionId, type = 'bot') {
  let chat = await this.findOne({ user_id: userId, session_id: sessionId });
  
  if (!chat) {
    // For admin chats, don't create welcome message - start clean
    if (type === 'admin') {
      chat = new this({
        user_id: userId,
        session_id: sessionId,
        type: type,
        last_activity: new Date(),
        messages: [] // No welcome message for admin chats
      });
    } else {
      const welcomeMessage = 'Chào bạn! Tôi là trợ lý ảo của Manzone. Tôi có thể giúp bạn tìm sản phẩm, hỗ trợ đặt hàng, và trả lời các câu hỏi về thời trang nam. Bạn cần hỗ trợ gì?';
      
      chat = new this({
        user_id: userId,
        session_id: sessionId,
        type: type,
        last_activity: new Date(),
        messages: [{
          message_id: new mongoose.Types.ObjectId().toString(),
          text: welcomeMessage,
          is_user: false,
          response_type: 'greeting',
          timestamp: new Date()
        }]
      });
    }
    await chat.save();
  }
  
  return chat;
};

// Static method to find admin chat sessions
ChatSchema.statics.findAdminChatSessions = function(userId) {
  return this.find({ 
    user_id: userId, 
    type: 'admin',
    status: 'active' 
  }).sort({ last_activity: -1 });
};

// Static method to find bot chat sessions
ChatSchema.statics.findBotChatSessions = function(userId) {
  return this.find({ 
    user_id: userId, 
    type: 'bot',
    status: 'active' 
  }).sort({ last_activity: -1 });
};

module.exports = mongoose.model('Chat', ChatSchema, 'chats');

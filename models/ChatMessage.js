const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatMessageSchema = new Schema({
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  message_id: {
    type: String,
    required: true,
    unique: true,
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
    enum: ['text', 'image', 'file', 'system', 'suggestion'],
    default: 'text'
  },
  
  // For bot responses
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
  
  // For user messages
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Read status
  is_read: {
    type: Boolean,
    default: false
  },
  
  // For future AI integration
  confidence_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
  
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for better performance
ChatMessageSchema.index({ chat_id: 1, timestamp: -1 });
// message_id index is automatically created by unique: true in schema
ChatMessageSchema.index({ user_id: 1, timestamp: -1 });
ChatMessageSchema.index({ admin_id: 1, timestamp: -1 });
ChatMessageSchema.index({ is_read: 1 });

// Virtual for formatted timestamp
ChatMessageSchema.virtual('formatted_timestamp').get(function() {
  return this.timestamp.toLocaleString('vi-VN');
});

// Method to mark as read
ChatMessageSchema.methods.markAsRead = function() {
  this.is_read = true;
  return this.save();
};

// Method to update metadata
ChatMessageSchema.methods.updateMetadata = function(key, value) {
  this.metadata.set(key, value);
  return this.save();
};

// Static method to find unread messages for user
ChatMessageSchema.statics.findUnreadForUser = function(userId) {
  return this.find({ 
    user_id: userId, 
    is_user: false,
    is_read: false 
  }).sort({ timestamp: -1 });
};

// Static method to find unread messages for admin
ChatMessageSchema.statics.findUnreadForAdmin = function(adminId) {
  return this.find({ 
    admin_id: adminId, 
    is_user: true,
    is_read: false 
  }).sort({ timestamp: -1 });
};

// Static method to get message statistics
ChatMessageSchema.statics.getMessageStats = async function(chatId) {
  const stats = await this.aggregate([
    { $match: { chat_id: new mongoose.Types.ObjectId(chatId) } },
    {
      $group: {
        _id: null,
        total_messages: { $sum: 1 },
        user_messages: { $sum: { $cond: ['$is_user', 1, 0] } },
        bot_messages: { $sum: { $cond: [{ $and: ['$is_user', { $ne: ['$admin_id', null] }] }, 0, 1] } },
        admin_messages: { $sum: { $cond: [{ $and: [{ $ne: ['$is_user', true] }, { $ne: ['$admin_id', null] }] }, 1, 0] } },
        unread_messages: { $sum: { $cond: ['$is_read', 0, 1] } }
      }
    }
  ]);
  
  return stats[0] || {
    total_messages: 0,
    user_messages: 0,
    bot_messages: 0,
    admin_messages: 0,
    unread_messages: 0
  };
};

module.exports = mongoose.model('ChatMessage', ChatMessageSchema, 'chat_messages');

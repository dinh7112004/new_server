const Chat = require('../models/Chat');
const AdminChat = require('../models/AdminChat');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Chat Service - Handles all chat-related business logic
 */
class ChatService {
  
  /**
   * Create a new bot chat session
   */
  static async createBotChatSession(userId, sessionId) {
    try {
      const chat = await Chat.findOrCreateSession(userId, sessionId, 'bot');
      return {
        success: true,
        data: {
          sessionId: chat.session_id,
          messages: chat.getRecentMessages(50),
          created_at: chat.created_at,
          isExisting: false
        }
      };
    } catch (error) {
      throw new Error(`Failed to create bot chat session: ${error.message}`);
    }
  }

  /**
   * Create a new admin chat session
   */
  static async createAdminChatSession(userId, sessionId) {
    try {
      console.log('Creating admin chat session:', { userId, sessionId });
      
      const chat = await AdminChat.findOrCreateSession(userId, sessionId);
      console.log('Admin chat session created/found:', chat);
      
      return {
        success: true,
        data: {
          sessionId: chat.session_id,
          messages: chat.getRecentMessages(50),
          created_at: chat.created_at,
          isExisting: false
        }
      };
    } catch (error) {
      console.error('Error in createAdminChatSession:', error);
      throw new Error(`Failed to create admin chat session: ${error.message}`);
    }
  }

  /**
   * Send a message to bot chat
   */
  static async sendBotMessage(sessionId, userId, messageText) {
    try {
      const chat = await Chat.findOne({ session_id: sessionId, user_id: userId });
      if (!chat) {
        throw new Error('Chat session not found');
      }

      // Add user message
      const userMessage = chat.addMessage(messageText, true);
      await chat.save();

      // Generate bot response (placeholder - replace with actual AI logic)
      const botResponse = await this.generateBotResponse(messageText);
      
      // Add bot response
      const botMessage = chat.addMessage(botResponse.text, false, botResponse.type);
      await chat.save();

      return {
        success: true,
        data: {
          userMessage: userMessage,
          botMessage: botMessage
        }
      };
    } catch (error) {
      throw new Error(`Failed to send bot message: ${error.message}`);
    }
  }

  /**
   * Send a message to admin chat
   */
  static async sendAdminMessage(sessionId, userId, messageText) {
    try {
      const chat = await AdminChat.findOne({ session_id: sessionId, user_id: userId });
      if (!chat) {
        throw new Error('Admin chat session not found');
      }

      // Add user message
      const userMessage = chat.addMessage(messageText, true);
      await chat.save();

      return {
        success: true,
        data: {
          message: userMessage
        }
      };
    } catch (error) {
      throw new Error(`Failed to send admin message: ${error.message}`);
    }
  }

  /**
   * Send admin response to user
   */
  static async sendAdminResponse(sessionId, adminId, messageText) {
    try {
      const chat = await AdminChat.findOne({ session_id: sessionId });
      if (!chat) {
        throw new Error('Admin chat session not found');
      }

      // Add admin message
      const adminMessage = chat.addMessage(messageText, false, 'text', adminId);
      await chat.save();

      return {
        success: true,
        data: {
          message: adminMessage
        }
      };
    } catch (error) {
      throw new Error(`Failed to send admin response: ${error.message}`);
    }
  }

  /**
   * Get chat history
   */
  static async getChatHistory(sessionId, userId, chatType = 'bot') {
    try {
      let chat;
      if (chatType === 'admin') {
        chat = await AdminChat.findOne({ session_id: sessionId, user_id: userId });
      } else {
        chat = await Chat.findOne({ session_id: sessionId, user_id: userId });
      }

      if (!chat) {
        throw new Error('Chat session not found');
      }

      return {
        success: true,
        data: {
          sessionId: chat.session_id,
          messages: chat.getRecentMessages(50),
          status: chat.status,
          last_activity: chat.last_activity
        }
      };
    } catch (error) {
      throw new Error(`Failed to get chat history: ${error.message}`);
    }
  }

  /**
   * Get user's chat sessions
   */
  static async getUserChatSessions(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      // Get bot chats
      const botChats = await Chat.findBotChatSessions(userId)
        .skip(skip)
        .limit(limit);
      
      // Get admin chats
      const adminChats = await AdminChat.find({ user_id: userId, status: { $in: ['waiting', 'active'] } })
        .sort({ last_activity: -1 })
        .skip(skip)
        .limit(limit);

      const totalBot = await Chat.countDocuments({ user_id: userId, type: 'bot' });
      const totalAdmin = await AdminChat.countDocuments({ user_id: userId });

      return {
        success: true,
        data: {
          botChats: botChats,
          adminChats: adminChats,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(Math.max(totalBot, totalAdmin) / limit),
            total_bot_chats: totalBot,
            total_admin_chats: totalAdmin
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user chat sessions: ${error.message}`);
    }
  }

  /**
   * Get admin chat sessions (for admin dashboard)
   */
  static async getAdminChatSessions(adminId = null, page = 1, limit = 20, status = 'active') {
    try {
      const skip = (page - 1) * limit;
      
      let query = { status: status };
      if (adminId) {
        query.assigned_admin = adminId;
      }

      const chats = await AdminChat.find(query)
        .populate('user_id', 'name email')
        .populate('assigned_admin', 'username')
        .sort({ last_activity: -1 })
        .skip(skip)
        .limit(limit);

      const total = await AdminChat.countDocuments(query);

      return {
        success: true,
        data: {
          sessions: chats,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_sessions: total,
            has_next: page * limit < total,
            has_prev: page > 1
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to get admin chat sessions: ${error.message}`);
    }
  }

  /**
   * Assign admin to chat
   */
  static async assignAdminToChat(sessionId, adminId) {
    try {
      const chat = await AdminChat.findOne({ session_id: sessionId });
      if (!chat) {
        throw new Error('Admin chat session not found');
      }

      await chat.assignAdmin(adminId);
      return {
        success: true,
        data: {
          message: 'Admin assigned successfully'
        }
      };
    } catch (error) {
      throw new Error(`Failed to assign admin: ${error.message}`);
    }
  }

  /**
   * Resolve admin chat
   */
  static async resolveAdminChat(sessionId, adminId, note = '') {
    try {
      const chat = await AdminChat.findOne({ session_id: sessionId });
      if (!chat) {
        throw new Error('Admin chat session not found');
      }

      await chat.resolveChat(adminId, note);
      return {
        success: true,
        data: {
          message: 'Chat resolved successfully'
        }
      };
    } catch (error) {
      throw new Error(`Failed to resolve admin chat: ${error.message}`);
    }
  }

  /**
   * Close chat session
   */
  static async closeChatSession(sessionId, userId, chatType = 'bot') {
    try {
      let chat;
      if (chatType === 'admin') {
        chat = await AdminChat.findOne({ session_id: sessionId, user_id: userId });
      } else {
        chat = await Chat.findOne({ session_id: sessionId, user_id: userId });
      }

      if (!chat) {
        throw new Error('Chat session not found');
      }

      chat.status = 'closed';
      await chat.save();

      return {
        success: true,
        data: {
          message: 'Chat session closed successfully'
        }
      };
    } catch (error) {
      throw new Error(`Failed to close chat session: ${error.message}`);
    }
  }

  /**
   * Generate bot response (placeholder - replace with actual AI logic)
   */
  static async generateBotResponse(message) {
    // This is a placeholder - replace with actual AI integration
    const responses = {
      greeting: {
        text: 'Chào bạn! Tôi có thể giúp gì cho bạn?',
        type: 'greeting'
      },
      product: {
        text: 'Bạn đang tìm sản phẩm gì? Tôi có thể giúp bạn tìm kiếm.',
        type: 'product_info'
      },
      shipping: {
        text: 'Thông tin về phí ship và thời gian giao hàng sẽ được cập nhật sớm nhất.',
        type: 'shipping'
      },
      default: {
        text: 'Cảm ơn bạn đã liên hệ. Tôi sẽ chuyển tin nhắn của bạn đến nhân viên hỗ trợ.',
        type: 'info'
      }
    };

    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('chào') || lowerMessage.includes('hello')) {
      return responses.greeting;
    } else if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('áo')) {
      return responses.product;
    } else if (lowerMessage.includes('ship') || lowerMessage.includes('giao hàng')) {
      return responses.shipping;
    } else {
      return responses.default;
    }
  }

  /**
   * Get chat statistics
   */
  static async getChatStatistics(userId = null, adminId = null) {
    try {
      let stats = {};

      if (userId) {
        // User-specific stats
        const botChats = await Chat.find({ user_id: userId, type: 'bot' });
        const adminChats = await AdminChat.find({ user_id: userId });
        
        stats = {
          total_bot_chats: botChats.length,
          total_admin_chats: adminChats.length,
          active_chats: adminChats.filter(chat => chat.status === 'active').length,
          resolved_chats: adminChats.filter(chat => chat.status === 'resolved').length
        };
      } else if (adminId) {
        // Admin-specific stats
        const assignedChats = await AdminChat.find({ assigned_admin: adminId });
        
        stats = {
          total_assigned_chats: assignedChats.length,
          active_chats: assignedChats.filter(chat => chat.status === 'active').length,
          resolved_chats: assignedChats.filter(chat => chat.status === 'resolved').length,
          avg_response_time: assignedChats.reduce((sum, chat) => sum + (chat.avg_response_time || 0), 0) / assignedChats.length
        };
      } else {
        // Global stats
        const totalBotChats = await Chat.countDocuments();
        const totalAdminChats = await AdminChat.countDocuments();
        const waitingChats = await AdminChat.countDocuments({ status: 'waiting' });
        const activeChats = await AdminChat.countDocuments({ status: 'active' });
        
        stats = {
          total_bot_chats: totalBotChats,
          total_admin_chats: totalAdminChats,
          waiting_chats: waitingChats,
          active_chats: activeChats
        };
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      throw new Error(`Failed to get chat statistics: ${error.message}`);
    }
  }
}

module.exports = ChatService;

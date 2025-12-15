const ChatService = require('../services/chatService');
const ChatAPI = require('../api/ChatAPI');

/**
 * New Chat Controller - Uses ChatService for business logic
 */
class ChatController {
  
  /**
   * Create a new bot chat session
   */
  static async createBotChatSession(req, res) {
    try {
      const userId = req.user.id;
      const sessionId = ChatAPI.generateSessionId('bot', userId);
      
      const result = await ChatService.createBotChatSession(userId, sessionId);
      
      res.json(result);
    } catch (error) {
      console.error('Error creating bot chat session:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Create a new admin chat session
   */
  static async createAdminChatSession(req, res) {
    try {
      const userId = req.user.id;
      const sessionId = ChatAPI.generateSessionId('admin', userId);
      
      const result = await ChatService.createAdminChatSession(userId, sessionId);
      
      // Emit WebSocket event to notify admin about new chat session
      const io = req.app.get('io');
      if (io) {
        io.to('admin_room').emit('newAdminChatSession', {
          sessionId: sessionId,
          userId: userId,
          userName: req.user.name || req.user.email,
          lastMessage: 'New admin chat session created',
          timestamp: new Date()
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error creating admin chat session:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Send a message to bot chat
   */
  static async sendBotMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      const userId = req.user.id;
      
      // Validate input using ChatAPI
      ChatAPI.validateChatSession(sessionId, userId);
      const validatedMessage = ChatAPI.validateMessage(message);
      
      const result = await ChatService.sendBotMessage(sessionId, userId, validatedMessage);
      
      // Emit WebSocket events
      const io = req.app.get('io');
      if (io) {
        // Emit user message
        io.to(`user_${userId}`).emit('newMessage', {
          sessionId,
          message: ChatAPI.formatChatMessage(result.data.userMessage)
        });
        
        // Emit bot response to specific bot chat room
        setTimeout(() => {
          // Emit to bot chat room first
          const botRoomName = `bot_${sessionId.split('_').pop()}`;
          io.to(botRoomName).emit('newMessage', {
            sessionId,
            message: ChatAPI.formatChatMessage(result.data.botMessage)
          });
          
          // Also emit to user room for fallback compatibility
          io.to(`user_${userId}`).emit('newMessage', {
            sessionId,
            message: ChatAPI.formatChatMessage(result.data.botMessage)
          });
        }, 1000 + Math.random() * 2000);
      }
      
      res.json(
        ChatAPI.formatSuccessResponse({
          message: ChatAPI.formatChatMessage(result.data.userMessage)
        })
      );
    } catch (error) {
      console.error('Error sending bot message:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Send a message to admin chat
   */
  static async sendAdminMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      const userId = req.user.id;
      
      // Validate input using ChatAPI
      ChatAPI.validateChatSession(sessionId, userId);
      const validatedMessage = ChatAPI.validateMessage(message);
      
      const result = await ChatService.sendAdminMessage(sessionId, userId, validatedMessage);
      
      // Emit WebSocket events
      const io = req.app.get('io');
      if (io) {
              // Emit user message to admin
      const adminRoomName = `admin_${sessionId.split('_').pop()}`;
      io.to(adminRoomName).emit('newUserMessage', {
        sessionId,
        userId,
        text: validatedMessage,
        timestamp: new Date()
      });
      }
      
      res.json(
        ChatAPI.formatSuccessResponse({
          message: ChatAPI.formatChatMessage(result.data.message)
        })
      );
    } catch (error) {
      console.error('Error sending admin message:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Send admin response to user
   */
  static async sendAdminResponse(req, res) {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      const adminId = req.user.id;
      
      // Validate input using ChatAPI
      const validatedMessage = ChatAPI.validateMessage(message);
      
      const result = await ChatService.sendAdminResponse(sessionId, adminId, validatedMessage);
      
      // Emit WebSocket events
      const io = req.app.get('io');
      if (io) {
        // Emit admin response to user
        const chat = await ChatService.getChatHistory(sessionId, null, 'admin');
        if (chat.success) {
          io.to(`user_${chat.data.userId}`).emit('newAdminMessage', {
            sessionId,
            message: ChatAPI.formatChatMessage(result.data.message)
          });
        }
        
        // Emit to admin chat room
        io.to(`admin_chat_${sessionId}`).emit('newAdminMessage', {
          sessionId,
          text: validatedMessage,
          timestamp: new Date(),
          adminId
        });
      }
      
      res.json(
        ChatAPI.formatSuccessResponse({
          message: ChatAPI.formatChatMessage(result.data.message)
        })
      );
    } catch (error) {
      console.error('Error sending admin response:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Get chat history
   */
  static async getChatHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { type = 'bot' } = req.query;
      
      const result = await ChatService.getChatHistory(sessionId, userId, type);
      
      res.json(result);
    } catch (error) {
      console.error('Error getting chat history:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Get user's chat sessions
   */
  static async getUserChatSessions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await ChatService.getUserChatSessions(userId, parseInt(page), parseInt(limit));
      
      res.json(result);
    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Get admin chat sessions (for admin dashboard)
   */
  static async getAdminChatSessions(req, res) {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 20, status = 'active' } = req.query;
      
      const result = await ChatService.getAdminChatSessions(adminId, parseInt(page), parseInt(limit), status);
      
      res.json(result);
    } catch (error) {
      console.error('Error getting admin chat sessions:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Assign admin to chat
   */
  static async assignAdminToChat(req, res) {
    try {
      const { sessionId } = req.params;
      const { adminId } = req.body;
      
      const result = await ChatService.assignAdminToChat(sessionId, adminId);
      
      res.json(result);
    } catch (error) {
      console.error('Error assigning admin to chat:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Resolve admin chat
   */
  static async resolveAdminChat(req, res) {
    try {
      const { sessionId } = req.params;
      const { note = '' } = req.body;
      const adminId = req.user.id;
      
      const result = await ChatService.resolveAdminChat(sessionId, adminId, note);
      
      res.json(result);
    } catch (error) {
      console.error('Error resolving admin chat:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Close chat session
   */
  static async closeChatSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { type = 'bot' } = req.body;
      
      const result = await ChatService.closeChatSession(sessionId, userId, type);
      
      res.json(result);
    } catch (error) {
      console.error('Error closing chat session:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Get chat statistics
   */
  static async getChatStatistics(req, res) {
    try {
      const { userId, adminId } = req.query;
      
      const result = await ChatService.getChatStatistics(userId, adminId);
      
      res.json(result);
    } catch (error) {
      console.error('Error getting chat statistics:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Get waiting chats (for admin dashboard)
   */
  static async getWaitingChats(req, res) {
    try {
      const result = await ChatService.getAdminChatSessions(null, 1, 100, 'waiting');
      
      res.json(result);
    } catch (error) {
      console.error('Error getting waiting chats:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }

  /**
   * Get unassigned chats (for admin dashboard)
   */
  static async getUnassignedChats(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const result = await ChatService.getAdminChatSessions(null, parseInt(page), parseInt(limit), 'active');
      
      // Filter unassigned chats
      const unassignedChats = result.data.sessions.filter(chat => !chat.assigned_admin);
      
      res.json({
        success: true,
        data: {
          sessions: unassignedChats,
          pagination: result.data.pagination
        }
      });
    } catch (error) {
      console.error('Error getting unassigned chats:', error);
      res.status(500).json(
        ChatAPI.formatErrorResponse(error)
      );
    }
  }
}

module.exports = ChatController;

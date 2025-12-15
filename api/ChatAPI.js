const axios = require('axios');

/**
 * Server-side ChatAPI class for handling chat operations
 * This class provides methods for chat functionality that can be used by controllers
 */
class ChatAPI {
  constructor() {
    // Server-side doesn't need baseURL as it's running locally
  }

  // Helper method to validate chat session
  static validateChatSession(sessionId, userId) {
    if (!sessionId || !userId) {
      throw new Error('Session ID and User ID are required');
    }
    return true;
  }

  // Helper method to format chat message for response
  static formatChatMessage(message) {
    return {
      message_id: message.message_id || message._id,
      text: message.text,
      is_user: message.is_user,
      timestamp: message.timestamp,
      response_type: message.response_type,
      sub_answers: message.sub_answers || [],
      follow_up_questions: message.follow_up_questions || [],
      admin_id: message.admin_id,
      user_id: message.user_id
    };
  }

  // Helper method to format chat session for response
  static formatChatSession(session) {
    return {
      session_id: session.session_id,
      last_activity: session.last_activity,
      total_messages: session.total_messages,
      status: session.status,
      last_message: session.last_message ? {
        text: session.last_message.text,
        is_user: session.last_message.is_user,
        timestamp: session.last_message.timestamp
      } : null
    };
  }

  // Helper method to create pagination response
  static createPaginationResponse(items, page, limit, total) {
    return {
      items,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    };
  }

  // Helper method to validate message content
  static validateMessage(message) {
    if (!message || !message.trim()) {
      throw new Error('Message content is required');
    }
    
    if (message.length > 2000) {
      throw new Error('Message too long (max 2000 characters)');
    }
    
    return message.trim();
  }

  // Helper method to check if user has permission for admin chat
  static checkAdminChatPermission(user, sessionId) {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (sessionId && sessionId.includes('admin_')) {
      // Check if user owns this admin chat session
      const sessionUserId = sessionId.split('_')[1]; // Extract user ID from session ID (admin_${userId})
      if (sessionUserId !== user.id.toString()) {
        throw new Error('Access denied to this admin chat session');
      }
    }
    
    return true;
  }

  // Helper method to generate session ID
  static generateSessionId(type = 'chat', userId = null) {
    if (type === 'admin' && userId) {
      return `admin_${userId}`;
    }
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 15);
    return `${type}_session_${timestamp}_${random}`;
  }

  // Helper method to format error response
  static formatErrorResponse(error, defaultMessage = 'Server error') {
    return {
      success: false,
      message: error.message || defaultMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  // Helper method to format success response
  static formatSuccessResponse(data, message = 'Success') {
    return {
      success: true,
      message,
      data
    };
  }
}

module.exports = ChatAPI;

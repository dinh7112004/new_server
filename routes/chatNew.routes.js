const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminOnly = require('../middlewares/adminOnly');
const ChatController = require('../controllers/chatNew.controller');

// All chat routes require authentication
router.use(authMiddleware);

// ========================================
// BOT CHAT ROUTES
// ========================================

// Create a new bot chat session
router.post('/bot/sessions', ChatController.createBotChatSession);

// Get bot chat history
router.get('/bot/sessions/:sessionId', ChatController.getChatHistory);

// Send a message to bot chat
router.post('/bot/sessions/:sessionId/messages', ChatController.sendBotMessage);

// Close bot chat session
router.patch('/bot/sessions/:sessionId/close', ChatController.closeChatSession);

// ========================================
// ADMIN CHAT ROUTES (for users)
// ========================================

// Create a new admin chat session
router.post('/admin/sessions', ChatController.createAdminChatSession);

// Get admin chat history
router.get('/admin/sessions/:sessionId', ChatController.getChatHistory);

// Send a message to admin chat
router.post('/admin/sessions/:sessionId/messages', ChatController.sendAdminMessage);

// Close admin chat session
router.patch('/admin/sessions/:sessionId/close', ChatController.closeChatSession);

// ========================================
// ADMIN DASHBOARD ROUTES (admin only)
// ========================================

// Get all admin chat sessions
router.get('/admin/dashboard/sessions', adminOnly, ChatController.getAdminChatSessions);

// Get waiting chats
router.get('/admin/dashboard/waiting', adminOnly, ChatController.getWaitingChats);

// Get unassigned chats
router.get('/admin/dashboard/unassigned', adminOnly, ChatController.getUnassignedChats);

// Assign admin to chat
router.post('/admin/dashboard/assign', adminOnly, ChatController.assignAdminToChat);

// Send admin response to user
router.post('/admin/dashboard/respond/:sessionId', adminOnly, ChatController.sendAdminResponse);

// Resolve admin chat
router.patch('/admin/dashboard/resolve/:sessionId', adminOnly, ChatController.resolveAdminChat);

// ========================================
// USER DASHBOARD ROUTES
// ========================================

// Get user's chat sessions (both bot and admin)
router.get('/user/sessions', ChatController.getUserChatSessions);

// ========================================
// STATISTICS ROUTES
// ========================================

// Get chat statistics
router.get('/statistics', ChatController.getChatStatistics);

// ========================================
// LEGACY ROUTES (for backward compatibility)
// ========================================

// These routes maintain compatibility with existing code
router.post('/sessions', ChatController.createBotChatSession);
router.get('/sessions/:sessionId', ChatController.getChatHistory);
router.post('/sessions/:sessionId/messages', ChatController.sendBotMessage);
router.patch('/sessions/:sessionId/close', ChatController.closeChatSession);

// Legacy admin routes
router.post('/user-admin-sessions', ChatController.createAdminChatSession);
router.get('/admin/sessions/:sessionId', adminOnly, ChatController.getChatHistory);
router.post('/admin/sessions/:sessionId/respond', adminOnly, ChatController.sendAdminResponse);

module.exports = router;

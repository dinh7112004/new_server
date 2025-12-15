const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

// Tắt cache cho toàn bộ response (fix 304)
app.use((req, res, next) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:19006",     
      "*",
      "http://192.168.1.9:5002",
      "http://192.168.1.2:5002",
      "http://localhost:5002",
      "http://10.158.14.189",
      "exp://192.168.1.9:8081", // Expo development server
      "exp://localhost:8081"  
      ,   // Expo local development
      "https://md-08-firestore-admin.vercel.app/", // Expo local development
      "https://md-08-firestore-admin.vercel.app/" // Expo local development
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// 🟢 Map: userId -> Set(socketIds)
const connectedUsers = new Map();
app.set("io", io);
app.set("connectedUsers", connectedUsers);

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("register", (userId) => {
    if (!userId) return;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);

    socket.data.userId = userId;
    socket.join(userId); // cho phép emit theo userId
    console.log(`👤 Registered user ${userId} with socket ${socket.id}`);
  });

  // Join user to their personal room for chat notifications
  socket.on("joinUser", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined room user_${userId}`);
    
    // Debug: Check room status
    const room = io.sockets.adapter.rooms.get(`user_${userId}`);
    console.log(`👤 Room user_${userId} now has ${room ? room.size : 0} users`);
    
    // Debug: List all rooms
    console.log('🔍 All active rooms:', Array.from(io.sockets.adapter.rooms.keys()));
  });

  // Handle chat typing indicators
  socket.on("typing", (data) => {
    socket.to(`user_${data.userId}`).emit("userTyping", {
      sessionId: data.sessionId,
      isTyping: true
    });
  });

  socket.on("stopTyping", (data) => {
    socket.to(`user_${data.userId}`).emit("userTyping", {
      sessionId: data.sessionId,
      isTyping: false
    });
  });

  // Handle joining specific chat sessions with separate rooms for bot and admin
  socket.on("joinChatSession", (data) => {
    const { sessionId, chatType = 'bot' } = data;
    
    if (chatType === 'admin') {
      // Join admin chat room - use shorter room name
      const adminRoomName = `admin_${sessionId.split('_').pop()}`;
      socket.join(adminRoomName);
      console.log(`💬 Socket ${socket.id} joined admin chat session ${sessionId} in room ${adminRoomName}`);
      
      // Debug: List all rooms this socket is in
      const userRooms = Array.from(socket.rooms);
      console.log(`🔍 Socket ${socket.id} is now in rooms:`, userRooms);
    } else {
      // Join bot chat room - use shorter room name
      const botRoomName = `bot_${sessionId.split('_').pop()}`;
      socket.join(botRoomName);
      console.log(`💬 Socket ${socket.id} joined bot chat session ${sessionId} in room ${botRoomName}`);
      
      // Debug: List all rooms this socket is in
      const userRooms = Array.from(socket.rooms);
      console.log(`🔍 Socket ${socket.id} is now in rooms:`, userRooms);
    }
    
    // Debug: Show room sizes
    const allRooms = Array.from(io.sockets.adapter.rooms.keys());
    console.log('🔍 All active rooms:', allRooms.map(room => ({
      room,
      size: io.sockets.adapter.rooms.get(room)?.size || 0
    })));
  });

  socket.on("leaveChatSession", (data) => {
    const { sessionId, chatType = 'bot' } = data;
    
    if (chatType === 'admin') {
      const adminRoomName = `admin_${sessionId.split('_').pop()}`;
      socket.leave(adminRoomName);
      console.log(`💬 Socket ${socket.id} left admin chat session ${sessionId} from room ${adminRoomName}`);
    } else {
      const botRoomName = `bot_${sessionId.split('_').pop()}`;
      socket.leave(botRoomName);
      console.log(`💬 Socket ${socket.id} left bot chat session ${sessionId} from room ${botRoomName}`);
    }
  });

  // Admin chat events
  socket.on("joinAdminChat", (data) => {
    const roomName = `admin_${data.sessionId.split('_').pop()}`;
    socket.join(roomName);
    console.log(`👨‍💼 Admin joined admin chat room: ${roomName}`);
    console.log(`👥 Users in room ${roomName}:`, io.sockets.adapter.rooms.get(roomName)?.size || 0);
  });

  socket.on("leaveAdminChat", (data) => {
    const roomName = `admin_${data.sessionId.split('_').pop()}`;
    socket.leave(roomName);
    console.log(`👨‍💼 Admin left admin chat session ${data.sessionId}`);
  });

  // Admin connect event
  socket.on("adminConnect", (data) => {
    console.log(`👨‍💼 Admin ${data.adminId} connected`);
    socket.join('admin_room');
    console.log(`👥 Users in admin_room:`, io.sockets.adapter.rooms.get('admin_room')?.size || 0);
  });

  // User typing in admin chat
  socket.on("adminChatTyping", (data) => {
    const roomName = `admin_${data.sessionId.split('_').pop()}`;
    socket.to(roomName).emit("userTypingInAdminChat", {
      sessionId: data.sessionId,
      userId: data.userId,
      isTyping: true
    });
  });

  socket.on("adminChatStopTyping", (data) => {
    const roomName = `admin_${data.sessionId.split('_').pop()}`;
    socket.to(roomName).emit("userTypingInAdminChat", {
      sessionId: data.sessionId,
      userId: data.userId,
      isTyping: false
    });
  });

  // New user message in admin chat
  socket.on("newUserMessage", (data) => {
    const roomName = `admin_${data.sessionId.split('_').pop()}`;
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`📱 Emitting newUserMessage to room: ${roomName}, users in room: ${roomSize}`);
    
    // Emit to admin
    socket.to(roomName).emit("newUserMessage", {
      sessionId: data.sessionId,
      userId: data.userId,
      text: data.text,
      timestamp: data.timestamp,
      messageId: data.messageId
    });
    
    // Emit for user to confirm
    socket.to(`user_${data.userId}`).emit("messageSent", {
      sessionId: data.sessionId,
      messageId: data.messageId || Date.now().toString()
    });
  });

  // Admin response event
  socket.on("adminResponse", (data) => {
    const roomName = `admin_${data.sessionId.split('_').pop()}`;
    console.log(`👨‍💼 Admin response to session: ${data.sessionId}`);
    
    // Emit to user
    socket.to(`user_${data.userId}`).emit("newAdminMessage", {
      sessionId: data.sessionId,
      message: {
        message_id: data.messageId,
        text: data.text,
        is_user: false,
        timestamp: data.timestamp,
        admin_id: data.adminId
      }
    });
    
    // Also emit to admin chat room for real-time updates
    socket.to(roomName).emit("newAdminMessage", {
      sessionId: data.sessionId,
      message: {
        message_id: data.messageId,
        text: data.text,
        is_user: false,
        timestamp: data.timestamp,
        admin_id: data.adminId
      }
    });
  });

  // Bot message event - now uses specific bot chat rooms
  socket.on("newBotMessage", (data) => {
    console.log(`🤖 Bot message to session: ${data.sessionId}`);
    
    // Emit to specific bot chat room
    const botRoomName = `bot_${data.sessionId.split('_').pop()}`;
    socket.to(botRoomName).emit("newMessage", {
      sessionId: data.sessionId,
      message: {
        message_id: data.messageId,
        text: data.text,
        is_user: false,
        timestamp: data.timestamp,
        response_type: data.responseType,
        sub_answers: data.subAnswers || [],
        follow_up_questions: data.followUpQuestions || []
      }
    });
    
    // Also emit to user's personal room for fallback
    socket.to(`user_${data.userId}`).emit("newMessage", {
      sessionId: data.sessionId,
      message: {
        message_id: data.messageId,
        text: data.text,
        is_user: false,
        timestamp: data.timestamp,
        response_type: data.responseType,
        sub_answers: data.subAnswers || [],
        follow_up_questions: data.followUpQuestions || []
      }
    });
  });

  socket.on("disconnect", () => {
    const userId = socket.data?.userId;
    if (userId && connectedUsers.has(userId)) {
      const sockets = connectedUsers.get(userId);
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        connectedUsers.delete(userId);
      }
    }
    console.log("🔴 Socket disconnected:", socket.id);
    
    // Debug: Check which rooms this socket was in
    const rooms = Array.from(socket.rooms);
    console.log("🔴 Socket was in rooms:", rooms);
    
    // Debug: List remaining rooms
    console.log("🔍 Remaining active rooms:", Array.from(io.sockets.adapter.rooms.keys()));
  });
});

// Gắn `io` vào app để dùng được trong controller
app.set("io", io);

// Lắng nghe port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`🔌 Socket.io đang chạy tại http://localhost:${PORT}`);
});
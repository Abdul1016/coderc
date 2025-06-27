// socket.handlers.js - Extracted socket handlers for better organization
const { ACTIONS } = require('./action');

// Room data structure with enhanced fields
const rooms = new Map(); // Map<roomId, RoomData>
const roomTimers = new Map(); // Track room cleanup timers
const userSocketMap = {}; // socketId --> user data mapping

// Stores additional room data beyond just participants
class RoomData {
  constructor() {
    this.participants = new Map(); // Map<socketId, userData>
    this.code = "";
    this.language = "javascript";
    this.comments = [];
    this.lastActive = Date.now();
    this.createdAt = Date.now();
  }
}

// Get room data or create if allowed
function getOrCreateRoom(roomId, isHost = false) {
  if (!rooms.has(roomId)) {
    if (!isHost) {
      return { exists: false, room: null };
    }
    console.log(`Creating new room: ${roomId}`);
    rooms.set(roomId, new RoomData());
    
    // Clear any existing timer for this room
    if (roomTimers.has(roomId)) {
      clearTimeout(roomTimers.get(roomId));
      roomTimers.delete(roomId);
    }
  }
  
  // Update last active timestamp
  rooms.get(roomId).lastActive = Date.now();
  return { exists: true, room: rooms.get(roomId) };
}

// Handle user leaving a room
function handleUserLeaving(socket, io, roomId) {
  if (!roomId || !rooms.has(roomId)) return;

  const roomData = rooms.get(roomId);
  const userData = roomData.participants.get(socket.id);
  roomData.participants.delete(socket.id);

  // Clear any existing timer for this room
  if (roomTimers.has(roomId)) {
    clearTimeout(roomTimers.get(roomId));
    roomTimers.delete(roomId);
  }

  if (roomData.participants.size === 0) {
    // Instead of deleting room immediately, set a grace period
    console.log(`Last user left room ${roomId}, setting deletion timer`);
    const timer = setTimeout(() => {
      if (rooms.has(roomId) && rooms.get(roomId).participants.size === 0) {
        console.log(`Room ${roomId} deletion timer expired, removing room`);
        rooms.delete(roomId);
        roomTimers.delete(roomId);
      }
    }, 300000); // 5 minutes grace period
    
    roomTimers.set(roomId, timer);
  } else {
    const updatedParticipants = Array.from(roomData.participants.entries()).map(([id, info]) => ({
      socketId: id,
      ...info,
    }));
    
    // Notify users that someone left
    if (userData) {
      io.to(roomId).emit("user-left", {
        socketId: socket.id,
        name: userData.name || userSocketMap[socket.id]?.username
      });
    }
    
    // Update participant list for everyone
    io.to(roomId).emit("room-participants", updatedParticipants);
  }

  socket.leave(roomId);
  console.log(`User left room: ${roomId}`);
}

// Setup socket connection handlers
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);
    socket.data = {};

    // Initialize userSocketMap for this socket
    userSocketMap[socket.id] = { connected: true };

    // Handle joining room
    socket.on("join-room", ({ roomId, user }) => {
      console.log(`Attempting to join room: ${roomId}`, user);
      
      if (!roomId || !user) {
        console.log("Invalid room or user data");
        return socket.emit("error", { message: "Invalid room or user data" });
      }

      // Use unified function to get or create room
      const { exists, room } = getOrCreateRoom(roomId, user.isHost);
      
      if (!exists) {
        console.log(`Room ${roomId} not found and user is not host`);
        return socket.emit("room-not-found");
      }

      // Add user to room
      room.participants.set(socket.id, {
        name: user.name,
        isHost: user.isHost || false,
        video: user.video || false,
        audio: user.audio || false,
        userColor: user.userColor || getRandomColor(),
      });

      // Update the userSocketMap for code editor
      userSocketMap[socket.id] = { 
        username: user.name,
        userColor: user.userColor || getRandomColor(),
        roomId
      };

      socket.join(roomId);
      socket.data.roomId = roomId;

      // Emit participant list
      const participants = Array.from(room.participants.entries()).map(([id, info]) => ({
        socketId: id,
        ...info,
      }));
      
      console.log(`User ${user.name} joined room ${roomId}. Current participants:`, participants);
      
      // Confirm to the user that they've joined and send current room state
      socket.emit("room-joined", { 
        roomId,
        success: true,
        participants,
        code: room.code,
        language: room.language,
        comments: room.comments
      });
      
      // Send current room state to the new user
      socket.emit(ACTIONS.ROOM_STATE, {
        code: room.code,
        language: room.language,
        comments: room.comments
      });
      
      // Notify everyone about the new user
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        name: user.name,
        isHost: user.isHost,
        userColor: user.userColor || getRandomColor()
      });
      
      // Update participant list for everyone
      io.to(roomId).emit("room-participants", participants);
    });

    // --- Code editor events ---
    socket.on(ACTIONS.JOIN, ({ roomId, username, userColor }) => {
      userSocketMap[socket.id] = { 
        username,
        userColor: userColor || getRandomColor(),
        roomId
      };
      
      // Use unified function to get or create room
      const { exists, room } = getOrCreateRoom(roomId, true); // Allow creation
      
      socket.join(roomId);
      socket.data.roomId = roomId;

      // Add user to room if not already present
      if (!room.participants.has(socket.id)) {
        room.participants.set(socket.id, {
          name: username,
          isHost: room.participants.size === 0, // First user is host
          userColor: userColor || getRandomColor()
        });
      }

      const clients = Array.from(room.participants.entries()).map(([socketId, info]) => ({
        socketId,
        username: info.name,
        userColor: info.userColor
      }));
      
      // Send the current room state to the new user
      socket.emit(ACTIONS.ROOM_STATE, {
        code: room.code,
        language: room.language,
        comments: room.comments
      });
      
      // Notify all clients about the new user
      io.to(roomId).emit(ACTIONS.JOINED, { 
        clients, 
        username, 
        socketId: socket.id,
        userColor: userColor || getRandomColor()
      });
    });

    // Handle code changes
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, userId }) => {
      const roomData = rooms.get(roomId);
      if (roomData) {
        // Update stored code
        roomData.code = code;
        // Broadcast to others in the room
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code, userId });
      }
    });

    // Handle language changes
    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
      const roomData = rooms.get(roomId);
      if (roomData) {
        // Update stored language
        roomData.language = language;
        // Broadcast to others in the room
        socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
      }
    });

    // Handle code sync requests
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, language }) => {
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
      io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    // Handle cursor position updates
    socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, position, username, userColor }) => {
      const userId = socket.id;
      socket.to(roomId).emit(ACTIONS.CURSOR_POSITION, { 
        userId, 
        position,
        username: username || userSocketMap[socket.id]?.username,
        userColor: userColor || userSocketMap[socket.id]?.userColor
      });
    });

    // Handle user typing indicators
    socket.on(ACTIONS.USER_TYPING, ({ roomId, userId, username, isTyping }) => {
      socket.to(roomId).emit(ACTIONS.USER_TYPING, { 
        userId: userId || socket.id, 
        username: username || userSocketMap[socket.id]?.username,
        isTyping 
      });
    });

    // Handle comments
    socket.on(ACTIONS.COMMENT, ({ roomId, comment }) => {
      const roomData = rooms.get(roomId);
      if (roomData) {
        // Store the comment
        roomData.comments.push(comment);
        // Broadcast to all users in the room
        io.to(roomId).emit(ACTIONS.COMMENT, { comment });
      }
    });

    // Handle comments synchronization
    socket.on(ACTIONS.COMMENTS_SYNC, ({ roomId, comments }) => {
      const roomData = rooms.get(roomId);
      if (roomData) {
        // Update stored comments
        roomData.comments = comments;
        // Broadcast to all users in the room
        io.to(roomId).emit(ACTIONS.COMMENTS_SYNC, { comments });
      }
    });

    // Handle code selection by users
    socket.on(ACTIONS.CODE_SELECTION, ({ roomId, selection, username, userColor }) => {
      const userId = socket.id;
      socket.to(roomId).emit(ACTIONS.CODE_SELECTION, { 
        userId, 
        selection,
        username: username || userSocketMap[socket.id]?.username,
        userColor: userColor || userSocketMap[socket.id]?.userColor
      });
    });

    // Handle code saving (could implement server-side persistence)
    socket.on(ACTIONS.SAVE_CODE, ({ roomId, code, language }) => {
      const roomData = rooms.get(roomId);
      if (roomData) {
        roomData.code = code;
        roomData.language = language;
        // Acknowledge the save
        socket.emit("code-saved", { success: true });
      }
    });

    // --- WebRTC signaling ---
    socket.on('send-signal', ({ userToSignal, from, signal }) => {
      io.to(userToSignal).emit('receive-signal', { from, signal });
    });

    // --- Leave room ---
    socket.on("leave-room", ({ roomId }) => {
      handleUserLeaving(socket, io, roomId);
    });

    // --- Handle disconnection ---
    socket.on('disconnecting', () => {
      const roomsJoined = [...socket.rooms];
      roomsJoined.forEach((roomId) => {
        if (roomId !== socket.id) { // Skip the default room (socket.id)
          socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
            socketId: socket.id,
            username: userSocketMap[socket.id]?.username,
          });
          
          // Also handle user leaving from rooms map
          handleUserLeaving(socket, io, roomId);
        }
      });
    });

    socket.on("disconnect", () => {
      const { roomId } = socket.data || {};
      if (roomId) {
        handleUserLeaving(socket, io, roomId);
      }
      
      delete userSocketMap[socket.id];
      console.log(`❌ Disconnected: ${socket.id}`);
    });

    socket.on("error", (err) => {
      console.error(`⚠️ Socket error: ${err.message}`);
    });
  });
}

// Generate random color for users
function getRandomColor() {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33F5', 
    '#F5FF33', '#33FFF5', '#F533FF', '#FF5733'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Room cleanup job - remove rooms inactive for more than 24 hours
function startRoomCleanupJob() {
  const CLEANUP_INTERVAL = 3600000; // 1 hour
  const ROOM_TTL = 86400000; // 24 hours

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, roomData] of rooms.entries()) {
      if (now - roomData.lastActive > ROOM_TTL) {
        console.log(`Cleaning up inactive room: ${roomId}`);
        rooms.delete(roomId);
        if (roomTimers.has(roomId)) {
          clearTimeout(roomTimers.get(roomId));
          roomTimers.delete(roomId);
        }
      }
    }
  }, CLEANUP_INTERVAL);
}

// API Endpoints for rooms
function setupRoomAPI(app) {
  // Room validation endpoint
  app.get("/api/check-room/:roomId", (req, res) => {
    const { roomId } = req.params;
    
    if (rooms.has(roomId)) {
      const roomData = rooms.get(roomId);
      const participants = Array.from(roomData.participants.entries()).map(([id, info]) => ({
        socketId: id,
        ...info,
      }));
      
      res.status(200).json({ 
        exists: true,
        participants: participants,
        count: participants.length,
        language: roomData.language,
        hasCode: roomData.code.length > 0,
        commentCount: roomData.comments.length
      });
    } else {
      res.status(404).json({ 
        exists: false,
        message: "Room not found" 
      });
    }
  });

  // Save room state endpoint (could implement persistence to database)
  app.post("/api/save-room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const { code, language } = req.body;
    
    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }
    
    if (rooms.has(roomId)) {
      const roomData = rooms.get(roomId);
      if (code !== undefined) roomData.code = code;
      if (language !== undefined) roomData.language = language;
      
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  });
}

module.exports = {
  setupSocketHandlers,
  setupRoomAPI,
  startRoomCleanupJob,
  getRandomColor,
  rooms,
  userSocketMap
};
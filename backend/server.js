require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { spawn } = require("child_process");
const ACTIONS = require('./action'); // Fixed typo: action -> actions

// === Setup Express & HTTP Server ===
const app = express();
const server = http.createServer(app); // For WebSocket and Express

// === MongoDB Setup ===
mongoose.connect(process.env.MONGO_URI_USERS || "mongodb://localhost:27017/codeauth", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => console.log("✅ MongoDB connected successfully"));
mongoose.connection.on("error", (err) => console.error("❌ MongoDB connection error:", err));

// === Middleware ===
// Remove duplicate cors configuration
app.use(cors({
  origin:process.env.FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// === Routes ===
const roomModel = require("./src/models/Room");
const authRoutes = require("./src/routes/auth");
const protectedRoutes = require("./src/routes/protected.routes"); // Fixed path

app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);

// === Socket.IO Setup ===
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const userSocketMap = {};

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId]
        };
    });
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, user }) => {
    socket.join(roomId);
    console.log(`🟢 ${user.name} joined room ${roomId}`);
  
    // Emit back to the client to confirm join
    socket.emit("room-joined", {
      roomId,
      user,
    });
  
    // Optionally notify others in the room
    socket.to(roomId).emit("user-joined", { // Fixed: userJoined -> user-joined
      message: `${user.name} joined the room.`,
      user,
    });
  });
  
  // for joining room
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);

    // Always check if clients is an array before proceeding
    if (Array.isArray(clients)) {
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    } else {
        console.log('Clients data is not an array:', clients);
    }
  });

  // for sync
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Language change handler
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  // disconnecting from socket
  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: userSocketMap[socket.id]
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });

  socket.on(ACTIONS.LEAVE_ROOM, ({ roomId, username }) => {
    const leavingSocketId = Object.keys(userSocketMap).find(key => userSocketMap[key] === username);

    if (leavingSocketId) {
      // Emit a custom event to notify other clients that the user left
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: leavingSocketId,
          username: userSocketMap[leavingSocketId],
      });

      // Remove the user from the userSocketMap
      delete userSocketMap[leavingSocketId];
    }
  });
  
  // Handle socket disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    delete userSocketMap[socket.id];
  });
});

// === Room API Routes ===
app.get("/api/check-room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomModel.findOne({ roomId });
    if (room) {
      return res.status(200).json({ 
        exists: true,
        roomname: room.roomname || "" // Include roomname if exists
      });
    } else {
      return res.status(404).json({ exists: false, error: "Room not found" });
    }
  } catch (err) {
    console.error("Error checking room:", err);
    return res.status(500).json({ error: "Failed to check room" });
  }
});

// === Room Save/Load APIs ===
app.post("/api/room/save", async (req, res) => {
  try {
    const { roomId, code, language, owner, roomname } = req.body;
    if (!roomId) return res.status(400).json({ error: "Room ID is required" });

    let room = await roomModel.findOne({ roomId });
    if (room) {
      room.code = code || room.code;
      room.language = language || room.language;
      room.roomname = roomname || room.roomname;
      room.lastUpdated = new Date();
    } else {
      room = new roomModel({
        roomId,
        code: code || "",
        language: language || "javascript",
        owner: owner || "anonymous",
        roomname: roomname || "",
        created: new Date(),
        lastUpdated: new Date(),
      });
    }

    await room.save();
    res.status(200).json({ success: true, roomId: room.roomId });
  } catch (err) {
    console.error("Error saving room:", err);
    res.status(500).json({ error: "Failed to save room state" });
  }
});

app.get("/api/room/load/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomModel.findOne({ roomId });
    if (!room) return res.status(404).json({ error: `Room with ID ${roomId} not found` });

    res.status(200).json({
      roomId: room.roomId,
      code: room.code,
      language: room.language,
      roomname: room.roomname || "",
      lastUpdated: room.lastUpdated,
    });
  } catch (err) {
    console.error("Error loading room:", err);
    res.status(500).json({ error: "Failed to load room state" });
  }
});

// === AI Chatbot Route ===
app.post("/api/chatbot", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const ollama = spawn("ollama", ["run", "phi"]);
    const prompt = `You are a helpful assistant. Give a short and working code snippet in JavaScript for: ${message}`;
    let response = "", responded = false;

    const safeSend = (data) => {
      if (!responded) {
        res.status(200).json({ response: data });
        responded = true;
      }
    };

    ollama.stdout.on("data", data => response += data.toString());
    ollama.on("close", () => safeSend(response));
    ollama.on("error", err => {
      console.error("Ollama error:", err);
      if (!responded) res.status(500).json({ error: "AI service unavailable" });
    });

    // Timeout in case the AI takes too long
    setTimeout(() => {
      if (!responded) {
        ollama.kill();
        res.status(504).json({ error: "AI request timed out" });
      }
    }, 15000); // 15 seconds timeout

    ollama.stdin.write(prompt);
    ollama.stdin.end();
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: "Something went wrong with the AI request" });
  }
});

// === Health Check ===
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    mongoConnection: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// === Start the Server ===
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

// === Graceful Shutdown ===
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});
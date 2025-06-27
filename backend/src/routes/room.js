const express = require("express");
const { createRoom, joinRoom, leaveRoom } = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authMiddleware, createRoom);
router.post("/join", authMiddleware, joinRoom);
router.post("/leave", authMiddleware, leaveRoom);

module.exports = router;

const express = require("express");
const { updateNotepad } = require("../controllers/notepadController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.post("/update", authMiddleware, updateNotepad);

module.exports = router;

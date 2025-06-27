const express = require("express");
const { runCode } = require("../controllers/codeController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/execute", authMiddleware, runCode);

module.exports = router;

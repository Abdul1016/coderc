const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log("📥 Signup request received:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, "secret_key", { expiresIn: "1h" });

    res.status(201).json({ token, user: { name: user.name, email: user.email } });

  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("📥 Login request received for:", email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare provided password with hashed password in database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log("❌ Invalid password for user:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      "secret_key",
      { expiresIn: "1h" }
    );

    console.log("✅ Login successful for:", email);
    
    // Return token and user info (excluding password)
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
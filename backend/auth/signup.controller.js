const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./User.model'); // Make sure this matches your model filename/path

const signupController = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ✅ Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ✅ Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // ✅ Optional: create a token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      }
    });

  } catch (err) {
    console.error('❌ Signup error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = signupController;

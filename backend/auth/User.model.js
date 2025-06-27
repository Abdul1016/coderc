const mongoose = require('mongoose');

// Define the schema for User
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true // Keep track of created and updated times
});

// Check if the model already exists in mongoose.models before defining it
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;

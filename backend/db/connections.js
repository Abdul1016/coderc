const mongoose = require('mongoose');
require('dotenv').config();

const userDB = mongoose.createConnection(process.env.MONGO_URI_USERS);

userDB.on('connected', () => console.log('✅ Auth DB connected'));

module.exports = { userDB };

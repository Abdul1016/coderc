const mongoose = require("mongoose");

const NotepadSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    content: { type: String, default: "" }
});

module.exports = mongoose.model("Notepad", NotepadSchema);

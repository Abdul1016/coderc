const Notepad = require("../models/Notepad");

exports.updateNotepad = async (req, res) => {
    try {
        let notepad = await Notepad.findOne({ roomId: req.body.roomId });

        if (!notepad) {
            notepad = await Notepad.create({ roomId: req.body.roomId, content: req.body.content });
        } else {
            notepad.content = req.body.content;
            await notepad.save();
        }

        res.json(notepad);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const Room = require("../models/Room");

exports.createRoom = async (req, res) => {
  try {
    const room = await Room.create({
      roomId: req.body.roomId,
      participants: [req.user.id],
    });
    res.status(201).json(room);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server Error while creating room" });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.body.roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const alreadyInRoom = room.participants.includes(req.user.id);

    // ✅ Enforce 6 participant limit
    if (!alreadyInRoom && room.participants.length >= 6) {
      return res.status(403).json({ message: "Room is full (maximum 6 participants allowed)" });
    }

    if (!alreadyInRoom) {
      room.participants.push(req.user.id);
      await room.save();
    }

    res.json(room);
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Server Error while joining room" });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.body.roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    room.participants = room.participants.filter(
      (id) => id.toString() !== req.user.id
    );
    await room.save();

    res.json({ message: "Left room" });
  } catch (error) {
    console.error("Error leaving room:", error);
    res.status(500).json({ message: "Server Error while leaving room" });
  }
};
app.get("/api/check-room/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ exists: false });
    }
    return res.status(200).json({ exists: true, roomname: room.roomname });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

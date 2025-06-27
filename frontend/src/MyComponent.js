import { useEffect } from "react";
import socket from "./socket"; // Ensure correct import

const RoomComponent = () => {
  useEffect(() => {
    if (!socket) {
      console.error("❌ Socket is null");
      return;
    }

    socket.emit("joinRoom", "1234");

    socket.on("roomJoined", (data) => {
      console.log("✅ Successfully joined room:", data.roomID);
    });

    socket.on("codeUpdate", (updatedCode) => {
      console.log("🔄 Code updated:", updatedCode);
    });

    return () => {
      socket.off("roomJoined");
      socket.off("codeUpdate");
    };
  }, []);

  return <p>Socket Connected!</p>;
};

export default RoomComponent;

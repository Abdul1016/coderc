import React, { useEffect } from "react";
import { useSocket } from "./useSocket";

const Room = ({ roomId }) => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit("joinRoom", roomId);
    console.log(`🔗 Joined room: ${roomId}`);

    return () => {
      socket.disconnect();
    };
  }, [socket, roomId]);

  return <div>Welcome to Room {roomId}</div>;
};

export default Room;

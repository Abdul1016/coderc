import React, { createContext, useContext } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

const socket = io(process.env.REACT_APP_API_URL || "http://localhost:5000");

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

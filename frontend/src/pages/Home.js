import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const Home = () => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const navigate = useNavigate();
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('');

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || '', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      reconnection: true
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', () => setSocketConnected(false));
    newSocket.on('connect_error', (err) => {
      setConnectionError(err.message);
      toast.error('Failed to connect to server');
    });

    newSocket.on('reconnect_error', (err) => {
      setConnectionError(`Reconnection failed: ${err.message}`);
    });

    newSocket.on('error', (err) => {
      setConnectionError(`Socket error: ${err?.message || 'Unknown error'}`);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) setUsername(savedUsername);
  }, []);

  useEffect(() => {
    if (popupMessage) {
      const timer = setTimeout(() => setPopupMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [popupMessage]);

  const saveUsername = (name) => localStorage.setItem('username', name);

  const validateRoomId = (roomId) => /^[a-zA-Z0-9-_]{6,50}$/.test(roomId);

  const joinRoom = async (roomIdToJoin, isHost = false) => {
    return new Promise((resolve, reject) => {
      if (!socket || !socketConnected) {
        return reject(new Error('Socket not connected'));
      }

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timeout'));
      }, 10000);

      const onRoomJoined = (data) => {
        cleanup();
        resolve({ success: true, data });
      };

      const onRoomNotFound = () => {
        cleanup();
        resolve({ status: 'not_found' });
      };

      const onError = (err) => {
        cleanup();
        reject(new Error(err?.message || 'Socket error'));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off('room-joined', onRoomJoined);
        socket.off('room-not-found', onRoomNotFound);
        socket.off('error', onError);
      };

      socket.once('room-joined', onRoomJoined);
      socket.once('room-not-found', onRoomNotFound);
      socket.once('error', onError);

      socket.emit('join-room', {
        roomId: roomIdToJoin,
        user: { name: username, isHost },
      });
    });
  };

  const handleCreateRoom = async () => {
    if (!username || !roomName) {
      setError('Name and room name required');
      return;
    }

    if (!socketConnected) {
      setError('Not connected to server. Please try again.');
      toast.error('Server connection failed');
      return;
    }

    setError('');
    setIsCreating(true);
    saveUsername(username);

    try {
      const newRoomId = uuidv4();
      const result = await joinRoom(newRoomId, true);

      if (result.success) {
        toast.success('Room created!');
        navigate(`/room/${newRoomId}?username=${encodeURIComponent(username)}&roomName=${encodeURIComponent(roomName)}`);
      } else {
        toast.error('Failed to create room');
        setError('Unexpected error creating room');
      }
    } catch (err) {
      toast.error('Failed to create room');
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!username || !roomId) {
      setError('Name and room ID required');
      return;
    }

    if (!validateRoomId(roomId)) {
      setError('Invalid Room ID format');
      return;
    }

    if (!socketConnected) {
      setError('Not connected to server. Please try again.');
      toast.error('Server connection failed');
      return;
    }

    setError('');
    setIsJoining(true);
    saveUsername(username);

    try {
      const directJoinResult = await joinRoom(roomId, false);

      if (directJoinResult.success) {
        toast.success('Joined room!');
        setPopupMessage('Joined successfully!');
        setPopupType('success');
        navigate(`/room/${roomId}?username=${encodeURIComponent(username)}`);
        return;
      }

      if (directJoinResult.status === 'not_found') {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/check-room/${roomId}`);
        const data = await response.json();

        if (!response.ok || !data.exists) {
          toast.error('Room not found');
          setError('Room does not exist');
          return;
        }

        const retryJoinResult = await joinRoom(roomId, false);

        if (retryJoinResult.success) {
          toast.success('Joined room!');
          setPopupMessage('Joined successfully!');
          setPopupType('success');
          navigate(`/room/${roomId}?username=${encodeURIComponent(username)}`);
        } else {
          toast.error('Room not found or no longer active');
          setError('Room exists but is no longer active');
        }
      } else {
        toast.error('Failed to join room');
        setError('Unexpected error joining room');
      }
    } catch (err) {
      toast.error('Error joining room');
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <>
      <div className="animated-grainy-bg" />
      <button
        onClick={handleLogout}
        className="z-20 absolute top-6 right-6 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold"
      >
        Logout
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-white">
        <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-yellow-400 text-center">
          Realtime Code Collaboration
        </h1>
        <p className="mb-6 text-lg opacity-80 text-center max-w-xl">
          Collaborate, code, and build together in real-time.
        </p>

        <div className="w-full max-w-md mx-auto text-center rounded-2xl p-8 border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl shadow-white/10">
          {!socketConnected && (
            <div className="mb-4 p-2 bg-amber-500/30 border border-amber-500/50 rounded-lg text-amber-200">
              Connecting to server...
            </div>
          )}

          <input
            type="text"
            placeholder="Enter Your Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="w-full p-3 rounded-lg mb-4 text-white border border-white/20 bg-white/10 backdrop-blur-md placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="border-t border-white/10 my-4 pt-4">
            <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
              Create New Room
            </h3>
            <input
              type="text"
              placeholder="Enter Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              className="w-full p-3 rounded-lg mb-4 text-white border border-white/20 bg-white/10 backdrop-blur-md placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !socketConnected}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg mb-4 font-bold transition-all disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : '+ Create Room'}
            </button>
          </div>

          <div className="border-t border-white/10 my-4 pt-4">
            <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-400">
              Join Existing Room
            </h3>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="w-full p-3 rounded-lg mb-4 text-white border border-white/20 bg-white/10 backdrop-blur-md placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isJoining || !socketConnected}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : '→ Join Room'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-2 bg-red-500/30 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </div>

        {connectionError && (
          <div className="mt-4 text-red-400 text-sm bg-red-900/20 p-2 rounded-lg">
            {`Connection Error: ${connectionError}`}
          </div>
        )}

        {popupMessage && (
          <div
            className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white backdrop-blur-md transition-all ${
              popupType === 'success' ? 'bg-green-500/80' : 'bg-red-500/80'
            }`}
          >
            {popupMessage}
          </div>
        )}
      </div>
    </>
  );
};

export default Home;

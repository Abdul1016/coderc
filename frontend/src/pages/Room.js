import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaShareAlt, FaSignOutAlt, FaFileAlt, FaEdit, FaEye, FaCog, FaTerminal } from "react-icons/fa";
import Editor from "../components/Editor";
import Terminal from "../components/Terminal";
import VideoChat from "../components/VideoChat";
import Chatbot from "../components/Chatbot";
import UserList from '../components/UserList';
import CodeRunner from'../components/CodeRunner';
import { useSocket } from '../socketContext';
import ACTIONS from '../action';
import toast from 'react-hot-toast';
import { v4 as uuidV4 } from 'uuid';
import { initSocket } from '../socket';
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Room = () => {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const [userId] = useState(uuidV4());
  
  // Get query parameters from URL
  const queryParams = new URLSearchParams(location.search);
  const usernameFromUrl = queryParams.get('username');
  
  const socket = useSocket();  // Use socket from context
  const codeRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const socketRef = useRef(null);

  const stateData = useMemo(() => location.state || {}, [location.state]);
  const [showVideoChat, setShowVideoChat] = useState(true);

  const toggleVideoChat = () => {
    setShowVideoChat(prev => !prev);
  };
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isRoomValid, setIsRoomValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [userData, setUserData] = useState({
    name: usernameFromUrl || stateData.name || localStorage.getItem("username") || "",
    isHost: stateData.isHost || false,
    roomname: stateData.roomname || localStorage.getItem(`room_${roomId}_name`) || ""
  });

  const theme = {
    bg: darkMode ? "bg-gray-900" : "bg-gray-50",
    text: darkMode ? "text-white" : "text-gray-800",
    sidebar: darkMode ? "bg-gray-800" : "bg-gray-100",
    navbar: darkMode ? "bg-gray-800" : "bg-white",
    card: darkMode ? "bg-gray-800" : "bg-white",
    border: darkMode ? "border-gray-700" : "border-gray-200",
    buttonPrimary: darkMode ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-500 hover:bg-blue-400",
    buttonDanger: darkMode ? "bg-red-600 hover:bg-red-500" : "bg-red-500 hover:bg-red-400",
    buttonSuccess: darkMode ? "bg-green-600 hover:bg-green-500" : "bg-green-500 hover:bg-green-400",
    dropdownBg: darkMode ? "bg-gray-800" : "bg-white",
    dropdownHover: darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100",
  };

  // Initialize socket connection
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      if (!roomId || !userData.name) {
        setIsLoading(false);
        navigate("/");
        return;
      }

      try {
        // Clear any existing socket reference
        if (socketRef.current) {
          socketRef.current.disconnect();
        }

        const newSocket = await initSocket();
        socketRef.current = newSocket;

        // Error handling
        newSocket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed');
          setIsLoading(false);
        });
        
        newSocket.on('connect_failed', (err) => {
          console.error('Socket connection failed:', err);
          toast.error('Socket connection failed');
          setIsLoading(false);
        });

        // Connection handling
        newSocket.on('connect', () => {
          console.log('Socket connected successfully');
          
          newSocket.emit(ACTIONS.JOIN, {
            roomId,
            username: userData.name,
          });
        });

        // User joined event
        newSocket.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
          console.log(`${username} joined, clients:`, clients);
          if (username !== userData.name) {
            toast.success(`${username} joined the room`);
          }
          
          // Create a unique list of clients
          const uniqueClients = Array.isArray(clients) ? 
            clients.filter((client, index, self) => 
              index === self.findIndex(c => c.socketId === client.socketId)) 
            : [];
            
          setClients(uniqueClients);
          setIsLoading(false);
          
          // Sync code for new joiner
          if (username !== userData.name && codeRef.current) {
            newSocket.emit(ACTIONS.SYNC_CODE, {
              code: codeRef.current,
              socketId,
            });
          }
        });

        // User disconnected event
        newSocket.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          if (username) {
            toast.success(`${username} left the room`);
            setClients((prev) => prev.filter((client) => client.socketId !== socketId));
          }
        });

        // Language change event
        newSocket.on(ACTIONS.LANGUAGE_CHANGE, ({ language: newLang }) => {
          setLanguage(newLang);
        });
        
        // Code change event to sync code between clients
        newSocket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          if (code !== null) {
            setCode(code);
            codeRef.current = code;
          }
        });
        
        // Sync code event handler
        newSocket.on(ACTIONS.SYNC_CODE, ({ code }) => {
          if (code !== null) {
            setCode(code);
            codeRef.current = code;
          }
        });
        
        // Room joined confirmation
        newSocket.on('room-joined', () => {
          setIsRoomValid(true);
          setIsLoading(false);
          toast.success(`Joined room: ${userData.roomname || roomId}`);
        });

        // Room error handling
        newSocket.on('room-not-found', () => {
          console.error('Room not found');
          toast.error('Room not found');
          setIsLoading(false);
          navigate('/');
        });

        newSocket.on('error', (error) => {
          console.error('Socket error:', error);
          toast.error(error?.message || 'Socket error');
          setIsLoading(false);
        });

        // Manually emit the join event to ensure it happens
        if (newSocket.connected) {
          newSocket.emit(ACTIONS.JOIN, {
            roomId,
            username: userData.name,
          });
        }
      } catch (error) {
        console.error('Socket initialization error:', error);
        toast.error('Failed to initialize socket connection');
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket');
        // Clean up event listeners
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
        socketRef.current.off(ACTIONS.SYNC_CODE);
        socketRef.current.off('room-joined');
        socketRef.current.off('room-not-found');
        socketRef.current.off('error');
        
        // Emit leave room event
        socketRef.current.emit(ACTIONS.LEAVE_ROOM, {
          roomId,
          username: userData.name
        });
        
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userData.name, navigate]);

  // Initial authentication and room validation
  useEffect(() => {
    const verifyRoomAndUser = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate("/login");
        return;
      }

      const userName = usernameFromUrl || stateData.name || localStorage.getItem("username");
      if (!userName) {
        console.log('No username found, redirecting to home');
        navigate("/");
        return;
      }

      if (!roomId) {
        console.log('No room ID found, redirecting to home');
        navigate("/");
        return;
      }

      setUserData((prev) => ({
        ...prev,
        name: userName,
        isHost: stateData.isHost || false,
        roomname: stateData.roomname || localStorage.getItem(`room_${roomId}_name`) || ""
      }));

      localStorage.setItem("currentRoomId", roomId);
      localStorage.setItem("username", userName); // Ensure username is stored

      // If user is the host, we don't need to check if room exists
      if (stateData.isHost) {
        console.log('User is host, skipping room validation');
        setIsRoomValid(true);
        setIsLoading(false);
        return;
      }

      try {
        console.log(`Checking if room ${roomId} exists`);
        const response = await fetch(`${API_BASE_URL}/api/check-room/${roomId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.exists) {
          console.log('Room exists:', data);
          setIsRoomValid(true);
          if (data.roomname) {
            localStorage.setItem(`room_${roomId}_name`, data.roomname);
            setUserData((prev) => ({ ...prev, roomname: data.roomname }));
          }
        } else {
          console.error('Room does not exist');
          toast.error("Invalid Room ID");
          navigate("/");
        }
      } catch (error) {
        console.error('Room validation error:', error);
        toast.error("Room validation failed");
      } finally {
        setIsLoading(false);
      }
    };

    verifyRoomAndUser();
  }, [roomId, navigate, stateData, usernameFromUrl]);

  // Code change handler
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    codeRef.current = newCode;
  };

  // Handle participants updates with socket
  useEffect(() => {
    if (!socket || !isRoomValid) return;

    const handleParticipants = (list) => {
      console.log('Received participants:', list);
      setParticipants(list);
    };
    
    const handleUserJoined = (user) => {
      console.log('User joined:', user);
      toast.success(`${user.name} joined`);
    };
    
    const handleUserLeft = (user) => {
      console.log('User left:', user);
      toast.success(`${user.name} left`);
    };

    socket.on("room-participants", handleParticipants);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("room-participants", handleParticipants);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      
      if (socket.connected) {
        socket.emit("leave-room", { roomId });
      }
    };
  }, [socket, isRoomValid, roomId]);

  const [toastMessages, setToasts] = useState([]);
  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleFileOpen = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCode(content);
      codeRef.current = content;
      // Broadcast the code change
      if (socketRef.current?.connected) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: content,
        });
      }
      showToast(`Loaded "${file.name}"`, "success");
    };
    reader.readAsText(file);
  };

  const handleMenuAction = (action) => {
    setActiveMenu(null);
    if (action === "save" && codeRef.current) {
      const content = codeRef.current;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `code.${language === 'javascript' ? 'js' : language}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Saved", "success");
    }
    if (action === "toggleTheme") {
      setDarkMode((prev) => !prev);
    }
  };

  const toggleTerminal = () => setShowTerminal((prev) => !prev);
  
  const leaveRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(ACTIONS.LEAVE_ROOM, {
        roomId,
        username: userData.name
      });
    }
    localStorage.removeItem("currentRoomId");
    navigate("/");
  };
  
  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    if (socketRef.current?.connected) {
      socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
        roomId,
        language: newLanguage,
      });
    }
  };
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => showToast("Room ID copied!", "success"))
      .catch(() => showToast("Copy failed", "error"));
  };
  
  const shareRoomId = (platform) => {
    const roomURL = `${window.location.origin}/room/${roomId}`;
    let url = '';
  
    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=Join%20my%20room%20at%20${roomURL}`;
        break;
      case 'email':
        url = `mailto:?subject=Join%20Room&body=Join%20my%20room%20at%20${roomURL}`;
        break;
      default:
        url = roomURL;
    }
  
    window.open(url, '_blank');
  };
        
  return (
    <div className={`flex flex-col h-screen w-full ${theme.bg} ${theme.text} font-sans transition-colors duration-300`}>
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileOpen} />

      {/* Navbar */}
      <div className={`flex items-center justify-between p-3 ${theme.navbar} shadow-md border-b ${theme.border} transition-colors duration-300`}>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {[
              { name: "File", icon: <FaFileAlt className="mr-1" /> },
              { name: "Edit", icon: <FaEdit className="mr-1" /> },
              { name: "View", icon: <FaEye className="mr-1" /> }
            ].map((menu) => (
              <div key={menu.name} className="relative dropdown">
                <button
                  className={`px-3 py-2 ${activeMenu === menu.name ? 'bg-blue-600' : theme.dropdownBg} rounded-md transition flex items-center text-sm hover:bg-opacity-80`}
                  onClick={() => setActiveMenu(activeMenu === menu.name ? null : menu.name)}
                >
                  {menu.icon} {menu.name}
                </button>
                {activeMenu === menu.name && (
                  <div className={`absolute left-0 mt-1 w-56 ${theme.dropdownBg} border ${theme.border} rounded-lg shadow-xl z-50 animate-fadeIn`}>
                    <ul className="text-sm py-1">
                      {menu.name === "File" && (
                        <>
                          <li className={`px-4 py-2 ${theme.dropdownHover} cursor-pointer flex items-center`} onClick={() => fileInputRef.current.click()}>
                            <span className="mr-2">📂</span> Open File
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} cursor-pointer flex items-center`} onClick={() => handleMenuAction("save")}>
                            <span className="mr-2">💾</span> Save File
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} cursor-pointer flex items-center`} onClick={() => handleMenuAction("settings")}>
                            <span className="mr-2">⚙️</span> Settings
                          </li>
                          <li className="border-t border-gray-600 my-1"></li>
                          <li className={`px-4 py-2 hover:bg-red-500 hover:text-white cursor-pointer flex items-center`} onClick={leaveRoom}>
                            <span className="mr-2">🚪</span> Leave Room
                          </li>
                        </>
                      )}
                      {menu.name === "Edit" && (
                        <>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("copy")}>
                            <span className="mr-2">📋</span> Copy <span className="ml-auto opacity-60 text-xs">Ctrl+C</span>
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("paste")}>
                            <span className="mr-2">📄</span> Paste <span className="ml-auto opacity-60 text-xs">Ctrl+V</span>
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("undo")}>
                            <span className="mr-2">↩️</span> Undo <span className="ml-auto opacity-60 text-xs">Ctrl+Z</span>
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("redo")}>
                            <span className="mr-2">↪️</span> Redo <span className="ml-auto opacity-60 text-xs">Ctrl+Y</span>
                          </li>
                          <li className="border-t border-gray-600 my-1"></li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("find")}>
                            <span className="mr-2">🔍</span> Find <span className="ml-auto opacity-60 text-xs">Ctrl+F</span>
                          </li>
                        </>
                      )}
                      {menu.name === "View" && (
                        <>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={toggleTerminal}>
                            <span className="mr-2">💻</span> Toggle Terminal <span className="ml-auto opacity-60 text-xs">Ctrl+`</span>
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("zoomin")}>
                            <span className="mr-2">🔍</span> Zoom In <span className="ml-auto opacity-60 text-xs">Ctrl++</span>
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("zoomout")}>
                            <span className="mr-2">🔍</span> Zoom Out <span className="ml-auto opacity-60 text-xs">Ctrl+-</span>
                          </li>
                          <li className="border-t border-gray-600 my-1"></li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => handleMenuAction("toggleTheme")}>
                            <span className="mr-2">{darkMode ? '☀️' : '🌙'}</span> Toggle Theme <span className="ml-auto opacity-60 text-xs">Ctrl+D</span>
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => setSidebarCollapsed(prev => !prev)}>
                            <span className="mr-2">🔄</span> Toggle Left Sidebar
                          </li>
                          <li className={`px-4 py-2 ${theme.dropdownHover} flex items-center`} onClick={() => setChatCollapsed(prev => !prev)}>
                            <span className="mr-2">🔄</span> Toggle Right Sidebar
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Language selector */}
          <div className="ml-4">
            <select 
              value={language} 
              onChange={handleLanguageChange}
              className={`px-2 py-1 rounded-md ${theme.dropdownBg} ${theme.border} border outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>
          
          {userData.roomname && (
            <div className="ml-4 text-lg font-semibold text-blue-400 flex items-center">
              <span className="bg-blue-500 bg-opacity-20 px-3 py-1 rounded-md">
                {userData.roomname}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-gray-900 text-white p-2 rounded-lg shadow-md text-sm">
            Participants: {clients.length || 0}
          </div>

          <button 
            className={`px-3 py-2 ${theme.buttonPrimary} rounded-md flex items-center gap-2 text-sm transition-colors duration-200`} 
            onClick={() => setShowSharePopup(true)}
          >
            <FaShareAlt /> <span>Share</span>
          </button>
          <button 
            className={`px-3 py-2 ${theme.buttonDanger} rounded-md flex items-center gap-2 text-sm transition-colors duration-200`} 
            onClick={leaveRoom}
          >
            <FaSignOutAlt /> <span>Leave</span>
          </button>
          <button 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-blue-100 text-blue-800'}`}
            onClick={() => setDarkMode(prev => !prev)}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Main content area - 3-column layout */}
      <div className="flex flex-grow h-full overflow-hidden">
        {/* Left sidebar - User list */}
        {!sidebarCollapsed && (
          <div className={`flex flex-col w-1/6 ${theme.sidebar} border-r ${theme.border} transition-all duration-300`}>
            <div className="p-3 border-b border-gray-700 font-semibold">
            </div>
            <div className="flex-grow top-0 overflow-y-auto p-2">
              <UserList clients={clients} />
            </div>
            <div className="flex-grow overflow-hidden">
                <Chatbot darkMode={darkMode} />
              </div>
            {/* Collapse sidebar button */}
            <button 
              className="absolute left-[16.66%] top-1/2 w-6 h-10 bg-gray-700 rounded-r-md flex items-center justify-center"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
            >
              <span>←</span>
            </button>
          </div>
        )}
        
        {/* Collapsed sidebar button */}
        {sidebarCollapsed && (
          <div className="relative">
            <button 
              className="absolute left-0 top-1/2 w-6 h-10 bg-gray-700 rounded-r-md flex items-center justify-center"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
            >
              <span>→</span>
            </button>
          </div>
        )}

        {/* Center - Editor */}
        <div className={`flex flex-col ${sidebarCollapsed ? 'w-3/4' : 'w-7/12'} ${chatCollapsed ? 'w-11/12' : ''} transition-all duration-300`}>          
          {/* Editor component */}
          <div className="flex-grow overflow-hidden">
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              onCodeChange={handleCodeChange}
              language={language}
            />
          </div>
        </div>

        {/* Right sidebar - Video chat + text chat */}
        {!chatCollapsed && (
          <div className={`fixed right-0 top-10px bottom-2px w-57 h-full ${theme.sidebar} border-l ${theme.border} transition-all duration-300 flex flex-col`}>
            {/* Video chat section */}
            <div className="flex flex-col border-b border-gray-700 overflow-hidden">
              <div className={`p-3 border-b ${theme.border} flex justify-between items-center`}>
                <h3 className="font-semibold">Video Chat</h3>
                <button 
                  className={`px-3 py-1 ${showVideoChat ? theme.buttonPrimary : 'bg-gray-600'} rounded-md text-sm`}
                  onClick={toggleVideoChat}
                >
                  {showVideoChat ? 'Hide Video' : 'Show Video'}
                </button>
              </div>
              {showVideoChat && (
                <div className="flex-grow p-2 overflow-y-auto">
                  <VideoChat darkMode={darkMode} />
                </div>
              )}
            </div>
            {/* Collapse chat button */}
            <button 
              className="absolute right-[24%] top-1/2 w-6 h-10 bg-gray-700 rounded-l-md flex items-center justify-center"
              onClick={() => setChatCollapsed(true)}
              title="Collapse chat"
            >
              
            </button>
          </div>
        )}
        
        {/* Collapsed chat button */}
        {chatCollapsed && (
          <div className="relative">
            <button 
              className="absolute right-0 top-1/2 w-6 h-10 bg-gray-700 rounded-l-md flex items-center justify-center"
              onClick={() => setChatCollapsed(false)}
              title="Expand chat"
            >
              <span>←</span>
            </button>
          </div>
        )}
      </div>

      {/* Terminal - collapsible bottom panel */}
      {showTerminal && (
        <div className={`relative h-1/4 ${theme.sidebar} p-2 border-t ${theme.border} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-2">
            <div className="font-mono text-sm flex items-center">
              <FaTerminal className="mr-2" /> Terminal
            </div>
            <button 
              className="p-1 hover:bg-gray-700 rounded-md"
              onClick={toggleTerminal}
              title="Close terminal"
            >
              ✕
            </button>
          </div>
          <Terminal socket={socket} darkMode={darkMode} />
        </div>
      )}

      {/* Share popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 w-96">
            <h2 className="text-lg font-bold mb-4 text-center">🔗 Share Room ID</h2>
            <p className="text-green-400 font-mono break-all text-center mb-4">{roomId}</p>
            <div className="flex justify-between">
              <button onClick={copyRoomId} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md">Copy</button>
              <button onClick={() => shareRoomId("whatsapp")} className="bg-green-500 hover:bg-green-400 px-4 py-2 rounded-md">WhatsApp</button>
              <button onClick={() => setShowSharePopup(false)} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast messages */}
      <div className="fixed bottom-4 right-4 z-50">
        {toastMessages.map((toast) => (
          <div 
            key={toast.id}
            className={`mb-2 px-4 py-2 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-500' : 
              toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xl font-semibold">Connecting to room...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
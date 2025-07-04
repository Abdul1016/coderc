import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Camera, Mic, MicOff, Monitor, Phone, Video, VideoOff } from 'lucide-react';

// Move credentials to environment variables in production
const APP_ID = '712f72b0c5ed413299df9bab345526f3';
const TOKEN = '007eJxTYMg032i0LsdwgbJdSIuJZ8up4tX7TR5IfHCRsOP5Y6EnMEGBwdzQKM3cKMkg2TQ1xcTQ2MjSMiXNMikxydjE1NTILM1YZHd6RkMgI0PRR15GRgYIBPE5GHIyy1KL8vNzGRgA41QeEg==';
const CHANNEL = 'liveroom';

const AgoraVideoChat = ({ roomId = CHANNEL, onError }) => {
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [layout, setLayout] = useState('grid'); // grid, sidebar

  const clientRef = useRef(null);
  const localVideoContainerRef = useRef(null);
  const localTrackRef = useRef({});

  // Initialize Agora client
  useEffect(() => {
    try {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setupEventListeners();
    } catch (err) {
      handleError('Failed to initialize video client', err);
    }

    return () => {
      leaveChannel();
    };
  }, []);

  const setupEventListeners = () => {
    if (!clientRef.current) return;

    // Remote user joined
    clientRef.current.on('user-published', async (user, mediaType) => {
      try {
        await clientRef.current.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            // Check if user already exists
            if (prev.find(u => u.uid === user.uid)) {
              return prev.map(u => u.uid === user.uid ? { ...u, hasVideo: true, videoTrack: user.videoTrack } : u);
            } else {
              return [...prev, { uid: user.uid, hasVideo: true, hasAudio: false, videoTrack: user.videoTrack }];
            }
          });
        }
        
        if (mediaType === 'audio') {
          user.audioTrack.play();
          setRemoteUsers(prev => {
            if (prev.find(u => u.uid === user.uid)) {
              return prev.map(u => u.uid === user.uid ? { ...u, hasAudio: true } : u);
            } else {
              return [...prev, { uid: user.uid, hasVideo: false, hasAudio: true }];
            }
          });
        }
      } catch (err) {
        handleError('Failed to subscribe to remote user', err);
      }
    });

    // Remote user left
    clientRef.current.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        setRemoteUsers(prev => prev.map(u => 
          u.uid === user.uid ? { ...u, hasVideo: false, videoTrack: null } : u
        ));
      }
      if (mediaType === 'audio') {
        setRemoteUsers(prev => prev.map(u => 
          u.uid === user.uid ? { ...u, hasAudio: false } : u
        ));
      }
    });

    // Remote user left the channel completely
    clientRef.current.on('user-left', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    // Connection state changes
    clientRef.current.on('connection-state-change', (curState, prevState) => {
      setConnectionState(curState);
      if (curState === 'DISCONNECTED') {
        setRemoteUsers([]);
      }
    });
  };

  // Join the video channel
  const joinChannel = async () => {
    if (connectionState === 'connecting') return;
    
    setConnectionState('connecting');
    setError(null);
    
    try {
      await clientRef.current.join(APP_ID, roomId || CHANNEL, TOKEN, null);
      
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: 'standard' },
        { encoderConfig: 'standard', facingMode: 'user' }
      );
      
      localTrackRef.current = { audioTrack, videoTrack };
      
      if (localVideoContainerRef.current && videoTrack) {
        videoTrack.play(localVideoContainerRef.current);
      }
      
      await clientRef.current.publish([audioTrack, videoTrack]);
      setConnectionState('connected');
    } catch (err) {
      setConnectionState('disconnected');
      handleError('Failed to join video channel', err);
    }
  };

  // Leave the video channel
  const leaveChannel = async () => {
    if (connectionState === 'disconnected') return;
    
    try {
      const { audioTrack, videoTrack } = localTrackRef.current;
      
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
      }
      
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.close();
      }
      
      if (clientRef.current) {
        await clientRef.current.leave();
      }
    } catch (err) {
      handleError('Error while leaving channel', err);
    } finally {
      localTrackRef.current = {};
      setRemoteUsers([]);
      setConnectionState('disconnected');
      setIsScreenSharing(false);
    }
  };

  // Toggle local video
  const toggleVideo = () => {
    const { videoTrack } = localTrackRef.current;
    if (videoTrack) {
      videoTrack.setEnabled(!videoEnabled);
      setVideoEnabled(!videoEnabled);
    }
  };

  // Toggle local audio
  const toggleAudio = () => {
    const { audioTrack } = localTrackRef.current;
    if (audioTrack) {
      audioTrack.setEnabled(!audioEnabled);
      setAudioEnabled(!audioEnabled);
    }
  };

  // Share screen
  const shareScreen = async () => {
    if (isScreenSharing) return;
    
    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack();
      
      await clientRef.current.unpublish(localTrackRef.current.videoTrack);
      
      localTrackRef.current.videoTrack.stop();
      localTrackRef.current.videoTrack.close();
      
      localTrackRef.current.videoTrack = screenTrack;
      await clientRef.current.publish(screenTrack);
      
      if (localVideoContainerRef.current) {
        screenTrack.play(localVideoContainerRef.current);
      }
      
      setIsScreenSharing(true);
      
      screenTrack.on('track-ended', async () => {
        await stopScreenSharing();
      });
    } catch (err) {
      handleError('Failed to share screen', err);
    }
  };

  // Stop screen sharing
  const stopScreenSharing = async () => {
    if (!isScreenSharing) return;
    
    try {
      const screenTrack = localTrackRef.current.videoTrack;
      
      if (screenTrack) {
        await clientRef.current.unpublish(screenTrack);
        screenTrack.stop();
        screenTrack.close();
      }
      
      const camTrack = await AgoraRTC.createCameraVideoTrack();
      localTrackRef.current.videoTrack = camTrack;
      
      await clientRef.current.publish(camTrack);
      
      if (localVideoContainerRef.current) {
        camTrack.play(localVideoContainerRef.current);
      }
      
      setIsScreenSharing(false);
    } catch (err) {
      handleError('Failed to stop screen sharing', err);
    }
  };

  // Error handling
  const handleError = (message, err) => {
    console.error(message, err);
    setError(`${message}: ${err?.message || 'Unknown error'}`);
    if (onError) onError(message, err);
  };

  // Toggle layout between grid and sidebar
  const toggleLayout = () => {
    setLayout(layout === 'grid' ? 'sidebar' : 'grid');
  };

  // Render remote user videos with the new sketch-like style
  const renderRemoteUsers = () => {
    return remoteUsers.map(user => (
      <div 
        key={user.uid} 
        className="bg-gray-800 rounded-lg overflow-hidden relative border-2 border-white"
        style={{
          aspectRatio: '16/9',
        }}
      >
        <div 
          id={`remote-video-${user.uid}`} 
          className="w-full h-full"
          ref={el => {
            if (el && user.hasVideo && user.videoTrack && !el.hasChildNodes()) {
              user.videoTrack.play(`remote-video-${user.uid}`);
            }
          }}
        />
        {!user.hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-gray-700 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center space-x-1">
          <div className={`h-2 w-2 rounded-full ${user.hasAudio ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-white bg-black bg-opacity-50 px-1 rounded">User {user.uid.toString().substr(-4)}</span>
        </div>
      </div>
    ));
  };

  // Different layout rendering with updated styles
  const renderVideoGrid = () => {
    let gridCols = "grid-cols-1";
    if (remoteUsers.length === 1) {
      gridCols = "grid-cols-2";
    } else if (remoteUsers.length >= 2) {
      gridCols = "grid-cols-2 md:grid-cols-3";
    }

    return (
      <div className={`grid gap-2 ${gridCols} h-full`}>
        {/* Local video - with blue border highlight */}
        <div className="bg-gray-800 rounded-lg overflow-hidden relative border-4 border-blue-500">
          <div 
            ref={localVideoContainerRef} 
            className="w-full h-full"
            style={{ aspectRatio: '16/9' }}
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-gray-700 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          )}
          <div className="absolute  bg-blue-500 py-1 px-2 ">
          </div>
          <div className="absolute bottom-2 left-2 flex items-center space-x-1">
            <div className={`h-2 w-2 rounded-full ${audioEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
        </div>
        
        {/* Remote videos */}
        {renderRemoteUsers()}
      </div>
    );
  };

  const renderSidebarLayout = () => {
    return (
      <div className="flex h-full gap-2">
        {/* Main video - either first remote user or local */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden relative border-4 border-blue-500">
          {remoteUsers.length > 0 ? (
            <>
              <div 
                id={`main-remote-video`} 
                className="w-full h-full"
                ref={el => {
                  const mainUser = remoteUsers[0];
                  if (el && mainUser.hasVideo && mainUser.videoTrack && !el.hasChildNodes()) {
                    mainUser.videoTrack.play(`main-remote-video`);
                  }
                }}
              />
              {!remoteUsers[0].hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-700 p-6 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              )}
              <div className="absolute top-0 left-0 right-0 bg-white text-gray-900 py-1 px-2 text-center">
                <span className="text-xs font-medium">User {remoteUsers[0].uid.toString().substr(-4)}</span>
              </div>
            </>
          ) : (
            <>
              <div 
                ref={localVideoContainerRef} 
                className="w-full h-full"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-700 p-6 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              )}
              <div className="absolute top-0 left-0 right-0 bg-blue-500 py-1 px-2 ">
              </div>
            </>
          )}
        </div>
        
        {/* Sidebar with other videos */}
        <div className="w-57 h-full  space-y-2 overflow-y-auto">
          {/* Local video thumbnail */}
          {remoteUsers.length > 0 && (
            <div className="bg-gray-800 rounded-lg overflow-hidden relative h-48 border-4 border-blue-500">
              <div 
                ref={localVideoContainerRef} 
                className="w-full h-full"
              />
              <div className="absolute bg-blue-500 py-1 px-2">
              </div>
            </div>
          )}
          
          {/* Additional remote users (skip the first one) */}
          {remoteUsers.slice(1).map(user => (
            <div key={user.uid} className="bg-gray-800 rounded-lg overflow-hidden relative h-48 border-2 border-white">
              <div 
                id={`sidebar-remote-${user.uid}`} 
                className="w-full h-full"
                ref={el => {
                  if (el && user.hasVideo && user.videoTrack && !el.hasChildNodes()) {
                    user.videoTrack.play(`sidebar-remote-${user.uid}`);
                  }
                }}
              />
              <div className="absolute top-0 left-0 right-0 bg-white text-gray-900 py-1 px-2 text-center">
                <span className="text-xs font-medium">User {user.uid.toString().substr(-4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Video chat controls component with blue styling
  const renderVideoControls = () => {
    return (
      <div className="flex justify-center space-x-3">
        {connectionState === 'disconnected' ? (
          <button
            onClick={joinChannel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center"
            disabled={connectionState === 'connecting'}
          >
            <Camera className="w-5 h-5 mr-1" />
            Join Video
          </button>
        ) : (
          <>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${videoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              title={videoEnabled ? 'Turn Off Video' : 'Turn On Video'}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${audioEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              title={audioEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={isScreenSharing ? stopScreenSharing : shareScreen}
              className={`p-3 rounded-full ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>
            
            <button
              onClick={leaveChannel}
              className="p-3 bg-red-600 hover:bg-red-700 rounded-full"
              title="Leave Call"
            >
              <Phone className="w-5 h-5 transform rotate-135" />
            </button>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-gray-900 text-white rounded-lg overflow-hidden flex flex-col h-full">
      <div className="p-3 bg-gray-800 flex justify-between items-center border-b border-gray-700">
        <h2 className="text-lg font-medium">Video Chat: {roomId}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleLayout}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-300"
            title="Toggle Layout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className={`h-2 w-2 rounded-full mr-1 flex-shrink-0 
            ${connectionState === 'connected' ? 'bg-green-500' : 
              connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}
          ></div>
          <span className="text-sm">
            {connectionState === 'connected' ? 'Connected' : 
             connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-600 p-2 text-sm">
          {error}
          <button 
            className="ml-2 bg-white text-red-600 px-2 py-0.5 rounded text-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 p-2 overflow-hidden">
        {layout === 'grid' ? renderVideoGrid() : renderSidebarLayout()}
      </div>

      <div className="p-3 bg-gray-800 border-t border-gray-700">
        {renderVideoControls()}
      </div>
    </div>
  );
};

export default AgoraVideoChat;
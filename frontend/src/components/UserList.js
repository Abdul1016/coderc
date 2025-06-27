import React from 'react';
import Avatar from 'react-avatar';

const UserList = ({ clients }) => {
  if (!clients || clients.length === 0) {
    return (
      <div className="user-list-container p-4 bg-gray-800 rounded-md">
        <h3 className="text-white text-lg font-medium mb-2">Connected Users</h3>
        <p className="text-gray-400 text-sm">No users connected</p>
      </div>
    );
  }

  return (
    <div className="user-list-container p-4 bg-gray-800 rounded-md">
      <h3 className="text-white text-lg font-medium mb-3">Connected Users</h3>
      <div className="users-list space-y-3">
        {clients.map((client) => (
          <div 
            key={client.socketId} 
            className="user-item flex items-center p-2 bg-gray-700 rounded-md"
          >
            <div className="user-avatar mr-3">
              <Avatar
                name={client.username || 'Anonymous'}
                size={32}
                round="14px"
                textSizeRatio={2}
              />
            </div>
            <span className="user-name text-white truncate">
              {client.username || 'Anonymous'}
              {client.isCurrentUser && ' (You)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;
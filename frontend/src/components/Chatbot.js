import React, { useState } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newUserMessage = { sender: 'user', text: message };
    setChat([...chat, newUserMessage]);
    setMessage('');
    setLoading(true);

    try {
      const res = await axios.post('https://realtime-code-collab.onrender.com/api/chatbot', { message });
      const botMessage = { sender: 'bot', text: res.data.reply };
      setChat(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMsg = { sender: 'bot', text: '⚠️ Error: Failed to get response from local AI.' };
      setChat(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Floating Chat Button */}
      <button
        onClick={toggleChat}
        className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700"
      >
        💬
      </button>

      {isOpen && (
        <div className="w-80 h-96 mt-2 bg-white dark:bg-gray-900 text-black dark:text-white rounded-xl shadow-xl p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-2 text-center"> ⚡JARVIS</h2>
          <div className="flex-1 overflow-y-auto space-y-2 bg-gray-100 dark:bg-gray-800 p-2 rounded">
            {chat.map((msg, index) => (
              <div
                key={index}
                className={`p-2 rounded-md text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-200 dark:bg-blue-700 text-right ml-auto'
                    : 'bg-gray-300 dark:bg-gray-600 text-left mr-auto'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && <div className="text-sm text-gray-500">Typing...</div>}
          </div>

          <div className="mt-2 flex">
            <input
              type="text"
              className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:text-white"
              placeholder="Ask something..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;

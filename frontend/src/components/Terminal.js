import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const Terminal = () => {
    const [socket, setSocket] = useState(null);
    const [command, setCommand] = useState("");
    const [output, setOutput] = useState([]);

    useEffect(() => {
        const newSocket = io("https://realtime-collaboration-backend.onrender.com");
        setSocket(newSocket);

        newSocket.on("terminal-output", (data) => {
            setOutput((prev) => [...prev, data]);
        });

        return () => newSocket.disconnect();
    }, []);

    const handleRunCommand = () => {
        if (socket && command.trim()) {
            setOutput((prev) => [...prev, `> ${command}`]);
            socket.emit("run-command", command);
            setCommand("");
        }
    };

    return (
        <div className="bg-black text-green-400 p-4 h-48 overflow-auto border-t border-gray-700">
            <div className="h-32 overflow-y-auto">
                {output.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap">{line}</div>
                ))}
            </div>
            <div className="flex mt-2">
                <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    className="bg-gray-800 text-white p-2 w-full outline-none"
                    placeholder="Type command..."
                />
                <button onClick={handleRunCommand} className="bg-blue-600 px-4 py-2">
                    Run
                </button>
            </div>
        </div>
    );
};

export default Terminal;

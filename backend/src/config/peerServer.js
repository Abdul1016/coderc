const { PeerServer } = require("peer");

const peerServer = PeerServer({ port: 9000, path: "/peer" });

peerServer.on("connection", (client) => {
    console.log("Peer connected:", client.id);
});

peerServer.on("disconnect", (client) => {
    console.log("Peer disconnected:", client.id);
});

module.exports = peerServer;

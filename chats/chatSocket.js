// ChatSocket.js
const { Server } = require("socket.io");
const SocketHandler = require("./SocketHandler");

class ChatSocket {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // Replace with your frontend's URL for production
      },
    });

    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Pass the socket instance to the SocketHandler
      SocketHandler.initSocket(socket, this.io);

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }
}

module.exports = ChatSocket;

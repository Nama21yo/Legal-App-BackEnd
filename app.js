// Required dependencies
require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const { PubSub } = require("@google-cloud/pubsub");
const http = require("http");
const WebSocket = require("ws");

const Message = require("./chats/chatModel");
const Notification = require("./notifications/notificationModel");
const cloudinary = require("./config/cloudinary");

// Routes
const authRoute = require("./routes/userRoute");
const chatRoute = require("./chats/chatRoute");
const notificationRoute = require("./notifications/notificationRoute");
const businessRoute = require("./routes/businessRoute");
const partnerRoute = require("./routes/partnerRoute");
const adminRoute = require("./routes/adminRoute");

// Initialize express
const app = express();
const port = process.env.PORT || 3000;

// Database connection
require("./config/db");

// Passport configuration
require("./services/passport");

// Middleware
app.use(logger("dev"));
app.use(
  cors({
    origin: "*", // Update with actual frontend URL
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "Victoria", // Use environment variable for security
    resave: false,
    saveUninitialized: false,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/user", authRoute);
app.use("/api/chats", chatRoute);
app.use("/api/businesses", businessRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/partner", partnerRoute);
app.use("/api/admin", adminRoute);

// Initialize Pub/Sub client
const pubSubClient = new PubSub({

});

const connectedUsers = new Map(); // Map to store connected users by userId

// WebSocket Server setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  console.log(`A user connected: ${ws._socket.remoteAddress}`);

  ws.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.type === "registerUser") {
        const { userId } = parsedMessage;
        connectedUsers.set(userId, ws);
        console.log(`User registered: ${userId}`);
      }

      if (parsedMessage.type === "sendMessage") {
        const { senderId, receiverId, content, image } = parsedMessage;

        let imagePath = null;

        if (image) {
          // Upload image to Cloudinary
          const uploadResponse = await cloudinary.uploader.upload( `data:image/png;base64,${image}`, {
            folder: "chat_images",
            public_id: `${Date.now()}_${senderId}`, 
            resource_type: "image", // Specify the resource type
          });
  
          imagePath = uploadResponse.secure_url; // Cloudinary's secure URL
        }

        // Save the message to the Chat model
        const newChatMessage = new Message({
          sender: senderId,
          receiver: receiverId,
          content,
          image: imagePath,
          timestamp: new Date(),
        });
        await newChatMessage.save();

        // Save the notification to the Notification model
        const notificationContent = imagePath ? "sent a photo" : "sent a message";
        const newNotification = new Notification({
          sender: senderId,
          receiver: receiverId,
          content: notificationContent,
          image: imagePath,
          timestamp: new Date(),
          read: false,
        });
        await newNotification.save();

        const receiverSocket = connectedUsers.get(receiverId);
        if (receiverSocket) {
          receiverSocket.send(
            JSON.stringify({
              type: "receiveMessage",
              senderId,
              content,
              image: imagePath,
              timestamp: new Date(),
            })
          );
        } else {
          console.log(`User ${receiverId} is offline. Publishing to Pub/Sub...`);
          await publishNotification("notifications-topic", {
            receiverId,
            content: notificationContent,
            image: imagePath,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    connectedUsers.forEach((value, key) => {
      if (value === ws) {
        connectedUsers.delete(key);
        console.log(`User disconnected: ${key}`);
      }
    });
  });
});

// Publishing a message to Pub/Sub
async function publishNotification(topicName, message) {
  const dataBuffer = Buffer.from(JSON.stringify(message));
  try {
    const messageId = await pubSubClient.topic(topicName).publishMessage({ data: dataBuffer });
    console.log(`Message ${messageId} published to topic ${topicName}.`);
  } catch (error) {
    console.error("Error publishing message:", error);
  }
}

// Pub/Sub listener
async function listenForNotifications(subscriptionName) {
  const subscription = pubSubClient.subscription(subscriptionName);

  subscription.on("message", async (message) => {
    try {
      const data = JSON.parse(message.data);
      const { receiverId, content, image, timestamp } = data;

      console.log(`Processing notification for ${receiverId}: ${content}`);

      const newNotification = new Notification({
        receiver: receiverId,
        content,
        image,
        timestamp,
        read: false,
      });
      await newNotification.save();

      const wsClient = connectedUsers.get(receiverId);
      if (wsClient) {
        wsClient.send(
          JSON.stringify({ type: "receiveMessage", content, image, timestamp })
        );
      }

      message.ack();
    } catch (error) {
      console.error("Error processing notification:", error);
    }
  });

  subscription.on("error", (error) => {
    console.error("Error with Pub/Sub subscription:", error);
  });
}

// Start Pub/Sub listener
listenForNotifications("chat-notifications-sub");

// Upgrade HTTP server for WebSocket handling
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

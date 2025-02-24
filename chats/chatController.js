const chatService = require("./chatService");
const mongoose = require("mongoose");
const Message = require("./chatModel");
const User = require("../models/userModel");
const { sendChatNotification } = require("./chatService");

class ChatController {
  async fetchChatHistory(req, res) {
    try {
      const { senderId, receiverId } = req.params;
      const { limit = 10, page = 1 } = req.query;
      const skip = (page - 1) * limit;

      // Fetch messages from the Message Model
      const messages = await Message.find({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      })
        .sort({ timestamp: -1 }) // Sort by most recent
        .skip(Number(skip))
        .limit(Number(limit));

      const totalMessages = await Message.countDocuments({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      return res.status(200).json({
        success: true,
        messages,
        pagination: {
          total: totalMessages,
          limit: Number(limit),
          page: Number(page),
          totalPages: Math.ceil(totalMessages / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching chat:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  async upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.status(200).json({
      message: "File uploaded successfully",
      filePath: `/uploads/${req.file.filename}`,
    });
  }

  async getuserId(req, res) {
    try {
      const { identifier } = req.query; // Accept identifier via query params
      const user = await User.findOne({ fullName: identifier });

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Find the chat messages for the user using their ObjectId
      const messages = await Message.find({ receiver: user._id });

      if (!messages) {
        return res.status(404).send("No messages found");
      }

      res.json({ success: true, messages });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Error fetching chat history",
        error: error.message,
      });
    }
  }

  // Save a message via REST API (optional, primarily for testing)
  async saveMessage({ sender, receiver, content }) {
    try {
      const newMessage = new Message({ sender, receiver, content });
      const savedMessage = await newMessage.save();
      return savedMessage;
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  }

  async fetchAllChats(req, res) {
    const { userId } = req.params; // Extract userId from URL params
    const { limit = 10, page = 1 } = req.query; // Extract pagination parameters

    try {
      const fetchAllChatIds = async (userId, limit, page) => {
        const skip = (page - 1) * limit;

        // Use new mongoose.Types.ObjectId to ensure it's a valid ObjectId
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const chatIds = await Message.aggregate([
          {
            $match: {
              $or: [{ sender: userObjectId }, { receiver: userObjectId }],
            },
          },
          {
            $group: {
              _id: {
                senderReceiverPair: {
                  $cond: [
                    {
                      $lte: [
                        { $toString: "$sender" },
                        { $toString: "$receiver" },
                      ],
                    },
                    { sender: "$sender", receiver: "$receiver" },
                    { sender: "$receiver", receiver: "$sender" },
                  ],
                },
              },
              lastMessageTimestamp: { $max: "$timestamp" },
            },
          },
          { $sort: { lastMessageTimestamp: -1 } },
          { $skip: skip },
          { $limit: limit },
        ]);

        console.log("Chat IDs aggregation:", chatIds);

        const populatedChatIds = await Promise.all(
          chatIds.map(async (chat) => {
            const otherUserId =
              chat._id.senderReceiverPair.sender.toString() ===
              userObjectId.toString()
                ? chat._id.senderReceiverPair.receiver
                : chat._id.senderReceiverPair.sender;

            const otherUser = await User.findById(otherUserId).select("name");
            console.log("Other user:", otherUser);

            return {
              chatId: chat._id,
              lastMessageTimestamp: chat.lastMessageTimestamp,
              otherUserDetails: otherUser,
            };
          })
        );

        const totalChats = await Message.countDocuments({
          $or: [{ sender: userObjectId }, { receiver: userObjectId }],
        });

        return {
          chatIds: populatedChatIds,
          pagination: {
            total: totalChats,
            limit,
            page,
            totalPages: Math.ceil(totalChats / limit),
          },
        };
      };

      const result = await fetchAllChatIds(
        userId,
        parseInt(limit),
        parseInt(page)
      );

      console.log("Fetched chat data:", result.chatIds);

      res.status(200).json({
        success: true,
        data: result.chatIds,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error fetching chat IDs:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch chat IDs",
      });
    }
  }
}

module.exports = ChatController;

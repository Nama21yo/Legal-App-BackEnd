const Message = require("./chatModel");
const UserModel = require("../models/userModel");

class ChatService {
  async saveMessage({ sender, receiver, content }) {
    try {
      // Save the message to the database
      const newMessage = new Message({ sender, receiver, content });
      const savedMessage = await newMessage.save();

      return savedMessage;
    } catch (error) {
      console.error("Error saving message:", error);
      throw new Error("Failed to save message");
    }
  }

  // Service Method: getChatHistory
  async getChatHistory(senderId, receiverId, limit = 20, page = 1) {
    const skip = (page - 1) * limit;

    try {
      // Query for messages where either sender is senderId and receiver is receiverId, or vice versa
      const totalMessages = await ChatMessage.countDocuments({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      const chatMessages = await ChatMessage.find({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      })
        .sort({ timestamp: -1 }) // Sort by timestamp descending to get latest messages first
        .skip(skip)
        .limit(limit)
        .populate("sender", "fullname email") // Populate sender details
        .lean(); // Return plain JavaScript object (no Mongoose wrappers)

      const totalPages = Math.ceil(totalMessages / limit);

      return {
        messages: chatMessages,
        pagination: {
          currentPage: page,
          totalPages,
          totalMessages,
          limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllChats(userId) {
    try {
      // Fetch all unique chat partners for the user
      const messages = await ChatMessage.find({
        $or: [{ sender: userId }, { receiver: userId }],
      }).sort({ timestamp: -1 });

      // Group by unique chat partners
      const chatPartners = {};
      messages.forEach((message) => {
        const partnerId =
          message.sender.toString() === userId.toString()
            ? message.receiver
            : message.sender;
        if (!chatPartners[partnerId]) {
          chatPartners[partnerId] = {
            partnerId,
            lastMessage: message.content,
            timestamp: message.timestamp,
          };
        }
      });

      // Fetch user details for the chat partners
      const partnerDetails = await Promise.all(
        Object.keys(chatPartners).map(async (partnerId) => {
          const user = await UserModel.findById(partnerId).select(
            "fullname email"
          );
          return { ...chatPartners[partnerId], partner: user };
        })
      );

      return partnerDetails;
    } catch (error) {
      console.log("Error fetching all chats", error);
      throw error;
    }
  }
}

module.exports = new ChatService();

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
      const totalMessages = await Message.countDocuments({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      const chatMessages = await Message.find({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      })
        .sort({ createdAt: -1 }) // Ensure correct sorting field exists
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
      console.error("Error fetching chat history:", error);
      throw error;
    }
  }

  async getAllChats(userId) {
    try {
      // Fetch all unique chat partners for the user
      const messages = await Message.find({
        $or: [{ sender: userId }, { receiver: userId }],
      }).sort({ createdAt: -1 });

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
            timestamp: message.createdAt, // Ensure the correct timestamp field is used
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
      console.error("Error fetching all chats:", error);
      throw error;
    }
  }
}

module.exports = new ChatService();

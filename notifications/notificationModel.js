const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: false }, // Receiver's ID
    sender: { type: String, required: true, ref:"User" }, // Sender's ID
    receiver: { type: String, required: true, ref:"User" }, 
    content: { type: String, required: true }, // Message content
    timestamp: { type: Date, default: Date.now }, // Timestamp
    status: { type: String, enum: ['unread', 'read'], default: 'unread' }, // Notification status
});

module.exports = mongoose.model('Notification', NotificationSchema);

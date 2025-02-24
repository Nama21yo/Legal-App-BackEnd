const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true }, // Reference to the business
  timestamp: { type: Date, default: Date.now }, // Time when the contact happened
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;

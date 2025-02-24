const mongoose = require('mongoose');

const SurveyResponseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // assuming userId is an ObjectId
    required: true,
    ref: 'User'
  },
  responses: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true }
    }
  ]
});

module.exports = mongoose.model('SurveyResponse', SurveyResponseSchema);

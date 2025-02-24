const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  
    
  category: {
    type: String,
    enum: [
      'Funeral Homes',
      'Cemeteries',
      'Headstones',
      'Attorneys',
      'Memorial Consulting',
      'Life Insurance',
    ],
    required: true,
  },
  businessName: { type: String, required: true },
  businessImages: [String], // Array for multiple images
  address: { type: String, required: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  description: { type: String },
  phoneNumber: { type: Number, required: true },
  fees: { type: Number, required: false }, // New field for fees
  years: { type: Number, required: false }, // New field for years
  clients: { type: Number, required: false }, // New field for clients
  headstoneNames: [String], 
  reviews:{ type: String, required: false }, 
  priceStartsFrom: [Number],
  headstoneImage: [String],

},
{ timestamps: true },
);

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;

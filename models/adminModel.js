const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        validate: {
            validator: function (value) {
                const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/
                return passwordRegex.test(value)
            },
            message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
        }
    },
    confirmationCode:{
        type: String,
        unique: true,
    },
    profileImage: {
        type: String,
      },
    googleId: {
        type: String,
        sparse: true,
        required: false // Store Google ID for OAuth users
    },
    status: {
        type: String,
        default: "Pending", // Set an initial status value
      },
   
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);

            },
            message: 'Invalid email address',
        }
    },

    displayName: {
        type: String
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
})

module.exports = mongoose.model('adminModel', adminSchema)
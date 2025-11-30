const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'user' // e.g., 'user', 'admin', 'superadmin'
    },
    resetToken: {
        type: String,
        default: null
    },
    resetTokenExpiration: {
        type: Date,
        default: null
    },
    // Profile information nested in a 'profile' object
    profile: {
        age: Number,
        college: String,
        course: String, // Corresponds to 'branch' in some frontend files
        year: String,
        state: String,
        city: String,
        phone: String, // Corresponds to 'mobile'
        avatar: {
            type: String,
            default: 'https://i.ibb.co/jP9JWBBy/diljj.png'
        }
    }
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

module.exports = mongoose.model('User', UserSchema);
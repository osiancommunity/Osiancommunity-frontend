const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Assuming you have auth middleware
const User = require('../models/User'); // Assuming you have a User model

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        // req.user.id should be set by your authMiddleware after verifying the token
        // The .select('-password') excludes the password hash from the query result.
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // The frontend code expects the user data to be nested under a 'user' key
        res.json({ user });

    } catch (err) {
        console.error('Error fetching profile:', err.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user's profile
 * @access  Private
 */
router.put('/profile', authMiddleware, async (req, res) => {
    const { name, profilePicture, profile } = req.body;

    // Build the fields to update
    const profileFields = {};
    if (name) profileFields.name = name;

    // The 'profile' object contains nested fields
    profileFields.profile = {};
    if (profile) {
        if (profile.age) profileFields.profile.age = profile.age;
        if (profile.college) profileFields.profile.college = profile.college;
        if (profile.course) profileFields.profile.course = profile.course;
        if (profile.year) profileFields.profile.year = profile.year;
        if (profile.state) profileFields.profile.state = profile.state;
        if (profile.city) profileFields.profile.city = profile.city;
        if (profile.phone) profileFields.profile.phone = profile.phone;
    }

    // Handle profile picture upload (this is a simplified example)
    // In a real app, you would upload the base64 image to a cloud storage (like Cloudinary or S3)
    // and save the URL in the database.
    if (profilePicture) {
        // Example: Upload to a service and get a URL
        // const imageUrl = await uploadToCloudStorage(profilePicture);
        // profileFields.profile.avatar = imageUrl;

        // For now, we'll just save the base64 string for demonstration, though this is not recommended for production.
        profileFields.profile.avatar = profilePicture;
    }

    try {
        // Find the user by the ID from the token
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Using findByIdAndUpdate with { new: true } returns the updated document.
        // The $set operator replaces the value of a field with the specified value.
        // We use dot notation to update nested fields inside the 'profile' object.
        const updateQuery = {
            $set: {
                'name': profileFields.name,
                'profile.age': profileFields.profile.age,
                'profile.college': profileFields.profile.college,
                'profile.course': profileFields.profile.course,
                'profile.year': profileFields.profile.year,
                'profile.state': profileFields.profile.state,
                'profile.city': profileFields.profile.city,
                'profile.phone': profileFields.profile.phone,
            }
        };

        // Only set avatar if it's being updated
        if (profileFields.profile.avatar) {
            updateQuery.$set['profile.avatar'] = profileFields.profile.avatar;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateQuery,
            { new: true, omitUndefined: true, runValidators: true }
        ).select('-password');

        // The frontend expects the updated user data back
        res.json({ user: updatedUser, message: 'Profile updated successfully!' });

    } catch (err) {
        console.error('Error updating profile:', err.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;

/*
NOTE on authMiddleware:
Your authentication middleware should look something like this:

const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Assuming your JWT payload has a 'user' object with an 'id'
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};
*/
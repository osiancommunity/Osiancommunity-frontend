const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- Core Node Modules & Libraries ---
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // For creating tokens
const bcrypt = require('bcryptjs'); // For hashing passwords
const mongoose = require('mongoose'); // Import Mongoose

// --- Import User Model ---
const User = require('./models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-for-jwt';
const RESET_SECRET = process.env.RESET_SECRET || 'another-super-secret-key-for-resets'; // A different secret for resets

const app = express();
const port = process.env.PORT || 5000;

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected Successfully!');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1); // Exit process with failure
    }
};

// Enable CORS for all routes
app.use(cors());

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (like your index.html and css)
app.use(express.static(__dirname));

// 1. Registration Endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, passwo
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
s
        const hashedPassword = await bcrypt.hash(password, 10);

        eeer = new User({
            name, // Use name
            email,
            password: hashedPassword,
        });

        await user.save();

        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});
htge:  Create a JWT token with user's ID and role
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// This route is now handled by routes/users.js, but keeping a simple one here for demonstration
app.get('/api/profile', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (!

        const user = await User.findById(decoded.user.id).select('-password'); // Exclude password
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ user });
    } catch (err) {
        
});

// 4. Forgot Password Endpoint
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Security: Always send a generic success message to prevent email enumeration attacks.
    if (!user) return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

    // Create a special, short-lived token for password reset
    cons.resetToken = resetToken;
    await user.save();

    const resetLink = `http://localhost:5500/reset-password.html?token=${resetToken}`;

    // Setup nodemailer transporter (reuse from your /send-email endpoint)
 n      host: process.env.EMAIL_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    ;    const mailOptions = {
        from: word Reset Request for OSIAN', // Corrected typo
        html: `
            <p>Hello ${user.fullname},</p>         <p>If you did not request this, please ignore this email.</p>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
    to the user
        }
        console.log('Reset email sent: %s', info.messageId);
    });
    res.status(200).json({ mes

// 5. Reset Password Endpoint
app.post('/api/reset-password', async (req, res) => {
    const { to
ry {
  i     const user = await User.findById(decoded.id)
            return res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Invalidate the token
        user.resetToken = null;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully!' });

    } catch (error) {
        // This catches expired tokens or other JWT errors
        res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
    }
});

app.post('/send-email'

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // Loaded from .env file
            pass: process.env.EMAIL_PASS, // Loaded from .env file
        },
    });

    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: user.email,
        subject: 'Password Reset Request for OSIAN',
        html: `
            <p>Hello ${user.name},</p>
            <p>You requested a password reset. Click the link below to create a new password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending reset email:', error);
            // Don't reveal server error to client, but acknowledge request
            return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
        }
        console.log('Reset email sent: %s', info.messageId);
        res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    });
});

// 5. Reset Password Endpoint
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, RESET_SECRET); // Throws error if invalid/expired
        const user = await User.findById(decoded.id);

        if (!user || user.resetToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Invalidate the token
        user.resetToken = null;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully!' });

    } catch (error) {
        res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
    }
});

app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // Loaded from .env file
            pass: process.env.EMAIL_PASS, // Loaded from .env file
        },
    });

    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: 'contact@osian.com', // Your receiving email address
        subject: 'New Contact Form Submission from OSIAN',
        text: `You have a new message from ${name} (${email}):\n\n${message}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending message.');
        }
        console.log('Message sent: %s', info.messageId);
        res.status(200).send('Message sent successfully!');
    });
});

// Connect to Database and then start the server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
});
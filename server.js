const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- New Imports ---
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // For creating tokens
const bcrypt = require('bcryptjs'); // For hashing passwords

// --- Simple In-Memory Database (for demonstration) ---
// In a real app, use a proper database like MongoDB or PostgreSQL.
const users = [];
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-for-jwt'; // Use an environment variable for this!
const RESET_SECRET = process.env.RESET_SECRET || 'another-super-secret-key-for-resets'; // A different secret for resets

const app = express();
const port = 5000; // Changed to 5000 to match frontend

// Enable CORS for all routes
app.use(cors());

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (like your index.html and css)
app.use(express.static(__dirname));

// --- New API Endpoints for User Management ---

// 1. Registration Endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        // Check if user already exists
        if (users.find(user => user.email === email)) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user object (with additional fields for the profile)
        const newUser = {
            id: users.length + 1,
            fullname,
            email,
            password: hashedPassword,
            role: 'user', // Default role
            // Add other fields from your profile form
            mobile: '',
            city: '',
            college: '',
            branch: '',
            state: '',
            organization: '',
            resetToken: null, // Field for password reset
            avatar: 'https://i.ibb.co/jP9JWBBy/diljj.png',
            stats: { quizzes: 0, winPercentage: 0, points: 0 }
        };

        users.push(newUser);
        console.log('User registered:', newUser);
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 2. Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);

        // Check if user exists and password is correct
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Create a JWT token
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, role: user.role });

    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// 3. Profile Data Endpoint
app.get('/api/profile', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403); // Forbidden (invalid token)

        const user = users.find(u => u.id === decoded.userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const { password, ...userProfile } = user; // Exclude password from response
        res.json(userProfile);
    });
});

// --- New Endpoints for Password Reset ---

// 4. Forgot Password Endpoint
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);

    // Security: Always send a generic success message to prevent email enumeration attacks.
    if (!user) {
        return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // Create a special, short-lived token for password reset
    const resetToken = jwt.sign({ userId: user.id }, RESET_SECRET, { expiresIn: '15m' });

    // Save the token to the user object (in a real DB, you'd save it to the user's record)
    user.resetToken = resetToken;

    const resetLink = `http://localhost:5500/reset-password.html?token=${resetToken}`;

    // Setup nodemailer transporter (reuse from your /send-email endpoint)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Password Reset Request for OSIAN',
        html: `
            <p>Hello ${user.fullname},</p>
            <p>You requested a password reset. Click the link below to create a new password:</p>
            <a href="${resetLink}" style="background-color: #4a00e0; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending reset email:', error);
            // Still send a generic success to the user
        }
        console.log('Reset email sent: %s', info.messageId);
    });

    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
});

// 5. Reset Password Endpoint
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Verify the token using the RESET_SECRET
        const decoded = jwt.verify(token, RESET_SECRET);
        const user = users.find(u => u.id === decoded.userId);

        // Check if user exists and if the token matches the one we stored
        if (!user || user.resetToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Invalidate the token by clearing it
        user.resetToken = null;

        res.status(200).json({ message: 'Password has been reset successfully!' });

    } catch (error) {
        // This catches expired tokens or other JWT errors
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

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
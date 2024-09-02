const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../configs/nodemailer');

// Generate a 5-digit code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register a new user
exports.register = async (request, response) => {
    const { username, email, password, phoneNumber } = request.body;

    try {
        const verificationCode = generateVerificationCode();

        // Create new user with the verification code
        const newUser = new User({
            username,
            email,
            password,  // Password will be hashed by the pre-save hook
            phoneNumber,
            verificationCode,
        });

        await newUser.save();

        await sendEmail(email, 'Verify your email and start to byte!', `Ofc, not literally, haha.\nHere you go: ${verificationCode}.`);

        response.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error(error.message);

        if (error.code === 11000) {  // MongoDB duplicate key error code
            const field = Object.keys(error.keyValue)[0]; // Get the field that caused the error (e.g., 'email' or 'username')
            response.status(400).json({ message: `${field} already exists` });
        } else {
            response.status(500).json({ message: 'Internal server error' });
        }
    }
};

// Login user
exports.login = async (request, response) => {
    const { username, password } = request.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return response.status(401).json({ message: 'Invalid username, you sure you won’t have to signup?' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return response.status(401).json({ message: 'Invalid password, chief!' });
        }

        // Check if email is verified
        if (!user.isVerified) {
            // Generate new verification code
            const newVerificationCode = generateVerificationCode();

            // Update user record with the new verification code
            user.verificationCode = newVerificationCode;
            await user.save();

            // Send verification email with the new 5-digit code
            await sendEmail(user.email, 'Verify your email and start to byte!', `Here's your new code: ${newVerificationCode}.`);

            return response.status(200).json({
                message: 'Login successful, but email verification is pending. A new verification code has been sent to your email.',
                isVerified: false,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                }
            });
        }

        // Generate JWT token for verified users
        const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '48h' });

        response.status(202).json({
            message: 'Login successful!',
            token,
            isVerified: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                byteBalance: user.byteBalance,
                bio: user.bio,
                imageUrl: user.imageUrl,
                orderHistory: user.orderHistory,
            },
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Verify email using verification code
exports.verifyEmail = async (request, response) => {
    const { code } = request.query;

    try {
        // Find user by verification code
        const user = await User.findOne({ verificationCode: code });
        if (!user) {
            return response.status(404).json({ message: 'Invalid or expired verification code' });
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationCode = null;  // Clear the verification code
        await user.save();

        response.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error(error);
        response.status(400).json({ message: 'Invalid or expired verification code' });
    }
};

// Forgot password
exports.forgotPassword = async (request, response) => {
    const { email } = request.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: 'No account with that email found' });
        }

        const resetCode = generateVerificationCode();

        // Save the reset code with the user
        user.resetCode = resetCode;
        user.resetCodeExpires = Date.now() + 3600000;  // Code expires in 1 hour
        await user.save();

        // Send email with reset code
        await sendEmail(email, 'Password Reset Code', `Here is your password reset code: ${resetCode}`);

        response.status(200).json({ message: 'Password reset code sent to your email' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Reset password
exports.resetPassword = async (request, response) => {
    const { email, resetCode, newPassword } = request.body;

    try {
        const user = await User.findOne({ email, resetCode });

        if (!user) {
            return response.status(404).json({ message: 'Invalid email or reset code' });
        }

        // Check if reset code is expired
        if (Date.now() > user.resetCodeExpires) {
            return response.status(400).json({ message: 'Reset code has expired' });
        }

        // Hash the new password
        user.password = newPassword; // Password will be hashed by the pre-save hook
        user.resetCode = null;
        user.resetCodeExpires = null;
        await user.save();

        response.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


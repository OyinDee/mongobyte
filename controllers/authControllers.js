const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../configs/nodemailer');
const Restaurant = require('../models/Restaurants');
const Notification = require('../models/Notifications');
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (request, response) => {
    const { username, email, password, phoneNumber } = request.body;
    try {
        const verificationCode = generateVerificationCode();
        const newUser = new User({
            username,
            email,
            password,
            phoneNumber,
            verificationCode
        });

        await newUser.save();

        const emailHtml = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #000000; }
            .container { width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; background-color: #ffffff; }
            .header { text-align: center; border-bottom: 1px solid #dddddd; padding-bottom: 10px; margin-bottom: 20px; }
            .content { font-size: 16px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Welcome!</h1></div>
            <div class="content">
              <p>Thank you for joining us. Please verify your email using the following code:</p>
              <p><strong>${verificationCode}</strong></p>
            </div>
          </div>
        </body>
        </html>
        `;

        await sendEmail(email, 'Verify your email and start to byte!', null, emailHtml);

        response.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });

        const userNotification = new Notification({
            userId: newUser._id,
            message: 'Your registration was successful. Please check your email to verify your account.'
        });
        await userNotification.save();
        newUser.notifications.push(userNotification._id);
        await newUser.save();
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            response.status(400).json({ message: `${field} already exists` });
        } else {
            response.status(500).json({ message: 'Internal server error' });
        }
    }
};

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

        if (!user.isVerified) {
            const newVerificationCode = generateVerificationCode();
            user.verificationCode = newVerificationCode;
            await user.save();

            const emailHtml = `
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; color: #000000; }
                .container { width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; background-color: #ffffff; }
                .header { text-align: center; border-bottom: 1px solid #dddddd; padding-bottom: 10px; margin-bottom: 20px; }
                .content { font-size: 16px; line-height: 1.5; }
                .code { font-weight: bold; font-size: 24px; margin-top: 20px; text-align: center; color: #333; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header"><h1>Verify Your Email</h1></div>
                <div class="content">
                  <p>Hello,</p>
                  <p>Please use the following code to verify your email address:</p>
                  <p class="code">${newVerificationCode}</p>
                  <p>If you did not request this, please ignore this message.</p>
                </div>
              </div>
            </body>
            </html>
            `;

            await sendEmail(user.email, 'Verify your email and start to byte!', `Here's your new code: ${newVerificationCode}.`, emailHtml);

            response.status(200).json({
                message: 'Login successful, but email verification is pending. A new verification code has been sent to your email.',
                isVerified: false,
            });

            const userNotification = new Notification({
                userId: user._id,
                message: 'Login successful, but your email is not verified. A new verification code has been sent to your email.'
            });
            await userNotification.save();
            user.notifications.push(userNotification._id);
            await user.save();
            return;
        }

        const token = jwt.sign({ user }, process.env.JWT_SECRET);

        response.status(202).json({
            message: 'Login successful!',
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
            token,
        });

        const userNotification = new Notification({
            userId: user._id,
            message: 'Login successful!'
        });
        await userNotification.save();
        user.notifications.push(userNotification._id);
        await user.save();
    } catch (error) {
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.verifyEmail = async (request, response) => {
    const { code } = request.query;
    try {
        const user = await User.findOne({ verificationCode: code });
        if (!user) {
            return response.status(404).json({ message: 'Invalid or expired verification code' });
        }

        user.isVerified = true;
        user.verificationCode = null;
        await user.save();

        response.json({ message: 'Email verified successfully' });

        const userNotification = new Notification({
            userId: user._id,
            message: 'Email verified successfully.'
        });
        await userNotification.save();
        user.notifications.push(userNotification._id);
        await user.save();
    } catch (error) {
        response.status(400).json({ message: 'Invalid or expired verification code' });
    }
};

exports.forgotPassword = async (request, response) => {
    const { email } = request.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: 'No account with that email found' });
        }

        const resetCode = generateVerificationCode();
        user.resetCode = resetCode;
        user.resetCodeExpires = Date.now() + 3600000;
        await user.save();

        const passwordResetEmailHtml = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #000000; }
            .container { width: 85%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; background-color: #ffffff; }
            .header { text-align: center; border-bottom: 1px solid #dddddd; padding-bottom: 10px; margin-bottom: 20px; }
            .content { font-size: 16px; line-height: 1.5; }
            .reset-code { font-weight: bold; font-size: 24px; color: #333; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Password Reset Request</h1></div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password. Use the code below to proceed with resetting your password:</p>
              <p class="reset-code">${resetCode}</p>
              <p>If you did not request a password reset, please ignore this email or contact support immediately.</p>
              <p>Thank you!</p>
            </div>
          </div>
        </body>
        </html>
        `;

        await sendEmail(email, 'Password Reset Code', `Here is your password reset code: ${resetCode}`, passwordResetEmailHtml);

        response.status(200).json({ message: 'Password reset code sent to your email' });

        const userNotification = new Notification({
            userId: user._id,
            message: 'Password reset code sent to your email.'
        });
        await userNotification.save();
        user.notifications.push(userNotification._id);
        await user.save();
    } catch (error) {
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.resetPassword = async (request, response) => {
    const { email, resetCode, newPassword } = request.body;
    try {
        const user = await User.findOne({ email, resetCode, resetCodeExpires: { $gt: Date.now() } });
        if (!user) {
            return response.status(400).json({ message: 'Invalid or expired reset code' });
        }

        user.password = newPassword;
        user.resetCode = null;
        user.resetCodeExpires = null;
        await user.save();

        response.status(200).json({ message: 'Password reset successfully' });

        const userNotification = new Notification({
            userId: user._id,
            message: 'Your password has been reset successfully.'
        });
        await userNotification.save();
        user.notifications.push(userNotification._id);
        await user.save();
    } catch (error) {
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateUser = async (request, response) => {
    const userId = request.user.id;
    const { bio, imageUrl } = request.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        if (bio) user.bio = bio;
        if (imageUrl) user.imageUrl = imageUrl;

        await user.save();

        response.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.addRestaurant = async (request, response) => {
    const userId = request.user.id;
    const { name, address, phoneNumber } = request.body;

    try {
        const user = await User.findById(userId);
        if (!user || !user.isAdmin) {
            return response.status(403).json({ message: 'Access denied' });
        }

        const newRestaurant = new Restaurant({ name, address, phoneNumber });
        await newRestaurant.save();

        response.status(201).json({ message: 'Restaurant added successfully', restaurant: newRestaurant });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.loginRestaurant = async (request, response) => {
    const { email, password } = request.body;

    try {
        var restaurant = await Restaurant.findOne({ email });
        if (!restaurant) {
            return response.status(401).json({ message: 'Invalid email.' });
        }

        const isMatch = await restaurant.comparePassword(password);
        if (!isMatch) {
            return response.status(401).json({ message: 'Invalid password.' });
        }

        const token = jwt.sign({ restaurant }, process.env.JWT_SECRET);


        response.status(200).json({
            message: 'Login successful!',
            restaurant: {
                id: restaurant.customId,
                name: restaurant.name,
                email: restaurant.email,
                location: restaurant.location,
                meals: restaurant.meals,
                contactNumber: restaurant.contactNumber,
                walletBalance: restaurant.walletBalance
            },
            token: token
        });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ message: 'Server error. Please try again later.' });
    }
};



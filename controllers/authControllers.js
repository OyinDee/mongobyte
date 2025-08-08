const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../configs/nodemailer');
const Restaurant = require('../models/Restaurants');
const Notification = require('../models/Notifications');
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (request, response) => {
    const { username, email, password, phoneNumber, university} = request.body;
    try {
        // Validate required fields
        if (!username || !email || !password || !phoneNumber || !university) {
            return response.status(400).json({ 
                message: 'All fields are required: username, email, password, phoneNumber, university' 
            });
        }

        const verificationCode = generateVerificationCode();
        const newUser = new User({
            username,
            email,
            password,
            phoneNumber,
            university,
            verificationCode
        });

        await newUser.save();

        const emailHtml = `
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
            .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .brand-text, .brand { color: #E6B805; font-weight: bold; }
            .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
            .content p { margin: 15px 0; }
            .highlight, .success-box, .alert-box, .fee-info, .bonus-info, .reward-info, .update-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to <span class="brand-text">Byte!</span></h1>
            </div>
            <div class="content">
              <p>🎉 <strong>Congratulations!</strong> You've successfully joined the Byte community!</p>
              <p>We're excited to have you on board. To complete your registration and start enjoying delicious meals, please verify your email using the code below:</p>
              <div class="highlight">${verificationCode}</div>
              <p>Simply enter this code in the app to activate your account and start your food journey with us!</p>
              <p>Can't wait to serve you! 🍽️</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
              <p>Ready to take a bite? 😋</p>
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
        const user = await User.findOne({ username }).populate('university', 'name _id');
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
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
                .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
                .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                .brand-text, .brand { color: #E6B805; font-weight: bold; }
                .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
                .content p { margin: 15px 0; }
                .highlight, .success-box, .alert-box, .fee-info, .bonus-info, .reward-info, .update-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
                .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Verify Your <span class="brand-text">Byte</span> Account</h1>
                </div>
                <div class="content">
                  <p>Hello there! 👋</p>
                  <p>We noticed you tried to log in, but your email isn't verified yet. No worries! We've sent you a fresh verification code:</p>
                  <div class="highlight">${newVerificationCode}</div>
                  <p>Enter this code in the app to unlock your account and start exploring amazing food options!</p>
                  <p>If you didn't request this, you can safely ignore this message. 🛡️</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
                  <p>Almost ready to bite! 🍕</p>
                </div>
              </div>
            </body>
            </html>
            `;

            await sendEmail(user.email, 'Verify your email and start to byte!', `Here's your new code: ${newVerificationCode}.`, emailHtml);

            // Send response first
            response.status(200).json({
                message: 'Login successful, but email verification is pending. A new verification code has been sent to your email.',
                isVerified: false,
            });

            // Handle notification creation in background (don't await to prevent blocking)
            try {
                const userNotification = new Notification({
                    userId: user._id,
                    message: 'Login successful, but your email is not verified. A new verification code has been sent to your email.'
                });
                await userNotification.save();
                user.notifications.push(userNotification._id);
                await user.save();
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Don't send response here since we already sent one above
            }
            return;
        }

        // Sign only the user ID and username for security
        const token = jwt.sign({ 
            userId: user._id,
            username: user.username,
            superAdmin: user.superAdmin,
            university: user.university,
            type: 'user'
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Send response first
        response.status(202).json({
            message: 'Login successful!',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                university: user.university,
                superAdmin: user.superAdmin
            },
            token,
        });

        // Handle notification creation in background (don't await to prevent blocking)
        try {
            const userNotification = new Notification({
                userId: user._id,
                message: 'Login successful!'
            });
            await userNotification.save();
            user.notifications.push(userNotification._id);
            await user.save();
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Don't send response here since we already sent one above
        }
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
        console.log('Forgot password request for email:', email);
        
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found for email:', email);
            return response.status(404).json({ message: 'No account with that email found' });
        }

        console.log('User found, generating reset code...');
        const resetCode = generateVerificationCode();
        
        // Use findOneAndUpdate to avoid validation issues with existing users
        await User.findOneAndUpdate(
            { email },
            { 
                resetCode: resetCode,
                resetCodeExpires: Date.now() + 3600000
            },
            { runValidators: false } // Skip validation to avoid issues with existing users
        );
        
        console.log('Reset code saved to user');

        const passwordResetEmailHtml = `
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
            .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .brand-text, .brand { color: #E6B805; font-weight: bold; }
            .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
            .content p { margin: 15px 0; }
            .highlight, .success-box, .alert-box, .fee-info, .bonus-info, .reward-info, .update-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 <span class="brand-text">Byte</span> Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello! 👋</p>
              <p>We received a request to reset your password. Use the secure code below to create a new password:</p>
              <div class="highlight">${resetCode}</div>
              <div class="alert-box">
                <p><strong>🛡️ Security Notice:</strong></p>
                <p>This code will expire in 1 hour for your security. If you didn't request this reset, please contact our support team immediately.</p>
              </div>
              <p>Ready to get back to enjoying great food? Let's get you back on track! 🍽️</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
              <p>Securing your food journey! 🔐</p>
            </div>
          </div>
        </body>
        </html>
        `;

        console.log('Attempting to send email...');
        await sendEmail(email, 'Password Reset Code', `Here is your password reset code: ${resetCode}`, passwordResetEmailHtml);
        console.log('Email sent successfully');

        response.status(200).json({ message: 'Password reset code sent to your email' });

        console.log('Creating notification...');
        const userNotification = new Notification({
            userId: user._id,
            message: 'Password reset code sent to your email.'
        });
        await userNotification.save();
        
        // Update user notifications without triggering validation
        await User.findOneAndUpdate(
            { _id: user._id },
            { $push: { notifications: userNotification._id } },
            { runValidators: false }
        );
        
        console.log('Notification created and saved');
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        response.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


exports.resetPassword = async (request, response) => {
    const { email, resetCode, newPassword } = request.body;
    try {
        const user = await User.findOne({ email, resetCode, resetCodeExpires: { $gt: Date.now() } });
        if (!user) {
            return response.status(400).json({ message: 'Invalid or expired reset code' });
        }

        // Hash the new password manually since we're using findOneAndUpdate
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset codes without triggering validation
        await User.findOneAndUpdate(
            { _id: user._id },
            { 
                password: hashedPassword,
                resetCode: null,
                resetCodeExpires: null
            },
            { runValidators: false }
        );

        response.status(200).json({ message: 'Password reset successfully' });

        const userNotification = new Notification({
            userId: user._id,
            message: 'Your password has been reset successfully.'
        });
        await userNotification.save();
        
        // Add notification without triggering validation
        await User.findOneAndUpdate(
            { _id: user._id },
            { $push: { notifications: userNotification._id } },
            { runValidators: false }
        );
    } catch (error) {
        console.error('Error in resetPassword:', error);
        response.status(500).json({ message: 'Internal server error', error: error.message });
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

        // Sign only the restaurant ID and essential info for security
        const token = jwt.sign({ 
            restaurantId: restaurant._id,
            customId: restaurant.customId,
            type: 'restaurant'
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

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

exports.resendVerification = async (request, response) => {
    const { email } = request.body;

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return response.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new verification code
        const newVerificationCode = generateVerificationCode();
        user.verificationCode = newVerificationCode;
        await user.save();

        const emailHtml = `
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
            .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .brand-text, .brand { color: #E6B805; font-weight: bold; }
            .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
            .content p { margin: 15px 0; }
            .highlight, .success-box, .alert-box, .fee-info, .bonus-info, .reward-info, .update-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 <span class="brand-text">Byte</span> Verification</h1>
            </div>
            <div class="content">
              <p>Hey there! 🎉</p>
              <p>Thanks for requesting a new verification code. We've got you covered! Here's your fresh verification code:</p>
              <div class="highlight">${newVerificationCode}</div>
              <div class="alert-box">
                <p><strong>⏰ Quick reminder:</strong> This code will expire in 24 hours for security reasons.</p>
              </div>
              <p>If you didn't request this code, no worries – just ignore this email and your account stays secure! 🛡️</p>
              <p>Ready to start your food adventure? Let's go! ��</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
              <p>One step closer to deliciousness! 😋</p>
            </div>
          </div>
        </body>
        </html>
        `;

        await sendEmail(
            email,
            'New Verification Code - Byte',
            'Please verify your email with the new verification code.',
            emailHtml
        );

        response.status(200).json({
            message: 'New verification code sent successfully. Please check your email.'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        response.status(500).json({ message: 'Error sending verification code. Please try again later.' });
    }
};




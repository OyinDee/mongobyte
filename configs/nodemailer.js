const nodemailer = require('nodemailer');

// Configure the SMTP transport
const transporter = nodemailer.createTransport({
    service: 'Gmail', // or any other email service provider
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password
    }
});

// Function to send email
const sendEmail = (to, subject, text) => {
    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    });
};

module.exports = sendEmail;
